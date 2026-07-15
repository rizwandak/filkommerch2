import { getApiBaseUrl, LIVE_BACKEND_URL } from "./api-config";

export function resolveImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // If it is a local asset import or browser-generated URL (blob/data URL)
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("/src/") ||
    url.startsWith("/@fs/") ||
    url.startsWith("/assets/")
  ) {
    return url;
  }

  const apiBase = getApiBaseUrl();

  // Intercept stored localhost / 127.0.0.1 URLs and resolve to current active backend
  if (url.startsWith("http://127.0.0.1:8080") || url.startsWith("http://localhost:8080")) {
    const cleanPath = url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8080/, "");
    return `${apiBase}${cleanPath}`;
  }

  // If stored URL is from filkommerch.com:
  // - When backend points to live server → remap to current apiBase (handles proxy/domain changes)
  // - When backend points to local dev → keep original live URL so production-uploaded images still load
  if (url.startsWith("https://filkommerch.com")) {
    if (apiBase === LIVE_BACKEND_URL) {
      const cleanPath = url.replace(/^https:\/\/filkommerch\.com/, "");
      return `${apiBase}${cleanPath}`;
    }
    // In local dev, just return the live URL directly so it loads from production
    return url;
  }

  // If it is any other full http/https URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Relative /uploads paths
  if (url.startsWith("/uploads") || url.startsWith("uploads/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${apiBase}${cleanPath}`;
  }

  return url;
}

