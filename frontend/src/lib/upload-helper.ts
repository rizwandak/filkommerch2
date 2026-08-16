import { getApiBaseUrl } from "./api-config";
import { uploadSingleImageServerAction } from "@/backend/server-actions";

/**
 * Compresses an image file client-side before upload to reduce bandwidth,
 * prevent timeouts, and guarantee fast uploads on mobile/slow networks.
 */
export const compressImage = (
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.85
): Promise<{ file: File; dataUrl: string }> => {
  return new Promise((resolve) => {
    // If not an image or is SVG / GIF, don't compress through canvas to preserve animation/vector
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e.target?.result as string) || "";
        resolve({ file, dataUrl });
      };
      reader.onerror = () => {
        resolve({ file, dataUrl: "" });
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrlRaw = event.target?.result as string;
      if (!dataUrlRaw) {
        resolve({ file, dataUrl: "" });
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ file, dataUrl: dataUrlRaw });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed JPEG
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^/.]+$/, ".jpg"),
                  { type: "image/jpeg", lastModified: Date.now() }
                );
                resolve({ file: compressedFile, dataUrl: compressedDataUrl });
              } else {
                resolve({ file, dataUrl: compressedDataUrl });
              }
            },
            "image/jpeg",
            quality
          );
        } catch (e) {
          console.warn("Image compression canvas failed, using original:", e);
          resolve({ file, dataUrl: dataUrlRaw });
        }
      };

      img.onerror = () => {
        resolve({ file, dataUrl: dataUrlRaw });
      };

      img.src = dataUrlRaw;
    };

    reader.onerror = () => {
      resolve({ file, dataUrl: "" });
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Robust image upload helper:
 * 1. Client-side compression to avoid large payload errors.
 * 2. Attempts direct multipart upload to active backend URL.
 * 3. Falls back to Server Action base64 upload if direct upload fails.
 * 4. Falls back to Data URL if network/server is totally unreachable, ensuring zero user blockage.
 */
export async function uploadImageHelper(
  file: File
): Promise<{ success: boolean; url?: string; error?: string; isFallback?: boolean }> {
  if (!file) {
    return { success: false, error: "File tidak ditemukan" };
  }

  // 1. Client-side compression
  const { file: processedFile, dataUrl } = await compressImage(file);

  const apiBase = getApiBaseUrl();

  // 2. Primary attempt: Direct multipart upload to configured backend
  try {
    const formData = new FormData();
    formData.append("file", processedFile);

    const res = await fetch(`${apiBase}/api/upload`, {
      method: "POST",
      body: formData,
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Bypass-Tunnel-Reminder": "true",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return { success: true, url: data.url };
      }
    }
  } catch (directErr) {
    console.warn("Direct upload failed, attempting server-action fallback...", directErr);
  }

  // 3. Secondary attempt: Server Action base64 upload (bypasses browser CORS/cross-origin limits)
  if (dataUrl) {
    try {
      const actionRes = await uploadSingleImageServerAction({
        data: {
          dataUrl,
          name: file.name,
        },
      });

      if (actionRes.success && actionRes.url) {
        return { success: true, url: actionRes.url, isFallback: actionRes.isFallback };
      }
    } catch (actionErr) {
      console.warn("Server action upload failed:", actionErr);
    }

    // 4. Ultimate fallback: Return compressed Data URL so the transaction / pelunasan can still proceed
    return { success: true, url: dataUrl, isFallback: true };
  }

  return { success: false, error: "Gagal mengunggah gambar. Silakan coba kembali." };
}
