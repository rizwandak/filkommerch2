const getLiveApiUrl = () => {
  let url =
    (typeof process !== "undefined" ? process.env.VITE_API_URL : undefined) ||
    (typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : undefined) ||
    "https://filkommerch.com";
  url = url.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return url;
};

export function resolveImageUrl(url: string | undefined): string {
  if (!url) return "";

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

  // Intercept stored localhost / 127.0.0.1 URLs and map to live backend on production / mobile devices
  if (url.startsWith("http://127.0.0.1:8080") || url.startsWith("http://localhost:8080")) {
    const cleanPath = url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8080/, "");
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      return `http://127.0.0.1:8080${cleanPath}`;
    }
    const liveApiUrl = getLiveApiUrl();
    return `${liveApiUrl}${cleanPath}`;
  }

  // If it is already a full http/https URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Relative /uploads paths
  if (url.startsWith("/uploads") || url.startsWith("uploads/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    if (
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ) {
      return `http://127.0.0.1:8080${cleanPath}`;
    }
    const liveApiUrl = getLiveApiUrl();
    return `${liveApiUrl}${cleanPath}`;
  }

  return url;
}
