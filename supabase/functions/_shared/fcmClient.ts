import {getServiceClient} from "./verifyAdmin.ts";
import {pushAllowed,queuedBroadcastAllowed} from "./pushEligibility.ts";
// supabase/functions/_shared/fcmClient.ts
// FCM HTTP v1 client. Service account JSON lives ONLY in the
// FIREBASE_SERVICE_ACCOUNT secret (set via `supabase secrets set`), read
// here via Deno.env.get — never present in any client-side code.

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

async function signJwt(serviceAccount: ServiceAccount): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${base64url(signature)}`;
}

function getServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is not set");
  return JSON.parse(raw);
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60_000 > now) {
    return cachedAccessToken.token;
  }
  const serviceAccount = getServiceAccount();
  const assertion = await signJwt(serviceAccount);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal:AbortSignal.timeout(10000),
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM OAuth2 token exchange failed: ${res.status} ${text}`);
  }
  const json = await res.json();
  cachedAccessToken = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return cachedAccessToken.token;
}

export interface FcmMessagePayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  notificationId: string;
  priority?: "normal" | "high";
  ttlSeconds?: number;
  collapseKey?: string;
  ownerUserId?: string;
  category?: string;
  queuedBroadcast?: boolean;
}

export type FcmResult =
  | { ok: true; messageId: string }
  | { ok: false; errorCode: string; retryable: boolean };

function buildMessageBody(target: { token: string } | { topic: string }, payload: FcmMessagePayload) {
  return {
    message: {
      ...target,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
      },
      data: {
        notification_id: payload.notificationId,
        ...(payload.ownerUserId?{owner_delivery_id:payload.notificationId,owner_user_id:payload.ownerUserId}:{}),
        ...(payload.deepLink ? { deep_link: payload.deepLink } : {}),
      },
      android: {
        priority: payload.priority === "high" ? "high" : "normal",
        ...(payload.ttlSeconds != null ? { ttl: `${payload.ttlSeconds}s` } : {}),
        ...(payload.collapseKey ? { collapse_key: payload.collapseKey } : {}),
      },
    },
  };
}

async function send(target: { token: string } | { topic: string }, payload: FcmMessagePayload): Promise<FcmResult> {
  const serviceAccount = getServiceAccount();
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

  if ('token' in target && !await pushAllowed(getServiceClient(),target.token,payload.category||"announcement"))return {ok:false,errorCode:"PREFERENCE_DISABLED",retryable:false};
  if(payload.queuedBroadcast && !await queuedBroadcastAllowed(getServiceClient(),payload.notificationId))return {ok:false,errorCode:"NOTIFICATION_CANCELED",retryable:false};

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    signal:AbortSignal.timeout(10000),
    body: JSON.stringify(buildMessageBody(target, payload)),
  });

  if (res.ok) {
    const json = await res.json();
    return { ok: true, messageId: json.name ?? "" };
  }

  const errJson = await res.json().catch(() => ({}));
  const errorCode: string = errJson?.error?.details?.[0]?.errorCode ?? errJson?.error?.status ?? String(res.status);

  const permanentCodes = ["UNREGISTERED", "INVALID_ARGUMENT", "SENDER_ID_MISMATCH"];
  const retryable = !permanentCodes.includes(errorCode);

  return { ok: false, errorCode, retryable };
}

export async function sendToDeviceToken(token: string, payload: FcmMessagePayload): Promise<FcmResult> {
  if(!await pushAllowed(getServiceClient(),token,payload.category||"announcement"))return {ok:false,errorCode:"PREFERENCE_DISABLED",retryable:false};
  return send({ token }, payload);
}

export function sendToTopic(topic: string, payload: FcmMessagePayload): Promise<FcmResult> {
  // Topics cannot enforce per-account opt-outs. Route the built-in broadcast
  // through active owned tokens and recheck preferences at each provider call.
  // Custom topic membership has no authenticated per-account source yet.
  if(topic!=="all_users")return Promise.resolve({ok:false,errorCode:"TOPIC_PREFERENCES_UNSUPPORTED",retryable:false});
  return broadcastToAccounts(payload);
}

async function broadcastToAccounts(payload:FcmMessagePayload):Promise<FcmResult>{
 const db=getServiceClient();let cursor:string|null=null,accepted=0;
 while(true){
  let query=db.from('push_tokens').select('id,token').eq('is_active',true).order('id').limit(500);
  if(cursor)query=query.gt('id',cursor);
  const {data,error}=await query;if(error)throw Error('broadcast_device_read_failed');
  for(const row of data||[]){const result=await sendToDeviceToken(row.token,{...payload,category:payload.category||'announcement'});if(result.ok)accepted++;else if(result.errorCode!=='PREFERENCE_DISABLED')throw Error('broadcast_partially_accepted_do_not_retry');}
  if(!data||data.length<500)break;
  cursor=data.at(-1)!.id;
 }
 return {ok:true,messageId:`accepted:${accepted}`};
}
