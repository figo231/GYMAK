import { tx } from "./i18n/tx";
function loadAndDraw(file, maxDim) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) { reject(new Error(tx("ملف مش صورة"))); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          // JPEG has no alpha: paint white first so transparent PNGs do not turn black.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas);
        } catch (error) { reject(error); }
      };
      img.onerror = () => reject(new Error(tx("تعذر فتح الصورة")));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error(tx("تعذر قراءة الملف")));
    reader.readAsDataURL(file);
  });
}

export async function compressImage(file, maxDim, quality) {
  const canvas = await loadAndDraw(file, maxDim);
  return canvas.toDataURL("image/jpeg", quality);
}

export const MAX_UPLOAD_MB = 20;

// Same resize as compressImage(), resolved as a JPEG Blob for storage uploads.
export async function compressImageToBlob(file, maxDim, quality) {
  const canvas = await loadAndDraw(file, maxDim);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error(tx("تعذر ضغط الصورة")))), "image/jpeg", quality);
  });
}
