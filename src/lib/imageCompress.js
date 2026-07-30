export function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) { reject(new Error("ملف مش صورة")); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("تعذر فتح الصورة"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

export const MAX_UPLOAD_MB = 20;

/**
 * Same resize logic as compressImage(), but resolves a compressed Blob
 * (via canvas.toBlob) instead of a base64 data URL — for uploading to
 * Supabase Storage. compressImage() itself is untouched and still used
 * for the offline / not-signed-in fallback path in Profile.jsx.
 *
 * @param {File} file - the original picked file.
 * @param {number} maxDim - max width/height in px, same meaning as compressImage.
 * @param {number} quality - JPEG quality 0-1, same meaning as compressImage.
 * @returns {Promise<Blob>} a JPEG blob, resized the same way as compressImage().
 */
export function compressImageToBlob(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) { reject(new Error("ملف مش صورة")); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("تعذر ضغط الصورة"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("تعذر فتح الصورة"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}
