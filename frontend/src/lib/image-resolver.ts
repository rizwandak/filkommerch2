import { getApiBaseUrl } from "./api-config";

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

  // If URL contains an /uploads/ resource, always resolve against current active backend base URL
  if (url.includes("/uploads/")) {
    const uploadPath = url.substring(url.indexOf("/uploads/"));
    return `${apiBase}${uploadPath}`;
  }

  // Intercept stored localhost / 127.0.0.1 / filkommerch.com domain URLs
  if (url.startsWith("http://127.0.0.1:8080") || url.startsWith("http://localhost:8080")) {
    const cleanPath = url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8080/, "");
    return `${apiBase}${cleanPath}`;
  }

  if (url.startsWith("https://filkommerch.com")) {
    // If local dev base url is active, keep production URL as-is so images load from production site
    if (apiBase.startsWith("http://127.0.0.1") || apiBase.startsWith("http://localhost")) {
      return url;
    }
    const cleanPath = url.replace(/^https:\/\/filkommerch\.com/, "");
    return `${apiBase}${cleanPath}`;
  }

  // If it is any other external full http/https URL (e.g. Unsplash)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Relative /uploads paths or relative paths
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${apiBase}${cleanPath}`;
}
