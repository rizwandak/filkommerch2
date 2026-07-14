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

  // If it is already a full http/https URL (keep localhost / 127.0.0.1 as is so local uploads load)
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
