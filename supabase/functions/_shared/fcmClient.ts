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
        ...(payload.deepLink ? { deep_link: payload.deepLink } : {}),
      },
      android: {
        priority: payload.priority === "high" ? "high" : "normal",
      },
    },
  };
}

async function send(target: { token: string } | { topic: string }, payload: FcmMessagePayload): Promise<FcmResult> {
  const serviceAccount = getServiceAccount();
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
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

export function sendToDeviceToken(token: string, payload: FcmMessagePayload): Promise<FcmResult> {
  return send({ token }, payload);
}

export function sendToTopic(topic: string, payload: FcmMessagePayload): Promise<FcmResult> {
  return send({ topic }, payload);
}
