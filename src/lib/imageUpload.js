import { supabase } from "./supabaseClient";

/** Accepted image MIME types for avatar/cover uploads. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Max size for the *compressed* blob being uploaded (not the original file
    the user picked — that's checked separately, earlier, against
    MAX_UPLOAD_MB in imageCompress.js, before compression even runs). A
    compressed avatar/cover should never realistically exceed this; if it
    does, something's wrong and we'd rather fail fast than upload garbage. */
const MAX_BLOB_MB = 5;

/**
 * Uploads a compressed profile image (avatar or cover) to the user's own
 * folder in the `avatars` Storage bucket, overwriting any previous file at
 * that same deterministic path — so re-uploading never accumulates orphaned
 * files, and no separate cleanup step is ever needed.
 *
 * This is the ONLY file in the project that talks to Supabase Storage.
 * Callers (Profile.jsx) never touch `supabase.storage` directly — they
 * just call this function and catch failures.
 *
 * @param {string} userId - auth.uid(), used as the folder name (matches the
 *   storage.objects RLS policies in 0003_avatar_storage.sql).
 * @param {Blob} blob - the already-compressed image (see compressImageToBlob
 *   in imageCompress.js). This function does not compress anything itself.
 * @param {"avatar"|"cover"} kind - which deterministic filename to use.
 * @returns {Promise<string>} the public URL of the uploaded file.
 * @throws if supabase isn't configured, the blob fails validation, or the
 *   upload itself fails — callers are expected to catch this and fall back
 *   to the local base64 workflow (see Profile.jsx).
 */
export async function uploadProfileImage(userId, blob, kind) {
  if (!supabase) throw new Error("Supabase غير مُهيّأ");
  if (!userId) throw new Error("لازم تكون مسجّل دخول عشان ترفع صورة على السحابة");
  if (kind !== "avatar" && kind !== "cover") throw new Error("kind غير صحيح");
  if (!blob || !ALLOWED_TYPES.includes(blob.type)) {
    throw new Error("صيغة الصورة غير مدعومة");
  }
  if (blob.size > MAX_BLOB_MB * 1024 * 1024) {
    throw new Error("الصورة بعد الضغط لسه كبيرة قوي");
  }

  const path = `${userId}/${kind}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("تعذر الحصول على رابط الصورة بعد الرفع");
  // Cache-busting: the path is deterministic (always {userId}/{kind}.jpg), so
  // browsers/CDNs would otherwise keep serving a stale cached copy after a
  // re-upload. Appending a changing query param forces a fresh fetch without
  // any database schema change — the versioned URL IS the string stored in
  // profiles.avatar/cover.
  return `${data.publicUrl}?v=${Date.now()}`;
}
