const API_URL =
  (typeof process !== "undefined" ? process.env.VITE_API_URL : undefined) ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8080";

export function resolveImageUrl(url: string | undefined): string {
  if (!url) return "";

  // If it is a local asset import or browser-generated URL (blob/data URL)
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("/src/") ||
    url.startsWith("/@fs/") ||
    url.startsWith("/assets/") ||
    url.startsWith("http") === false
  ) {
    // If it starts with /uploads, it's a relative path from the backend
    if (url.startsWith("/uploads")) {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      return `${baseUrl}${url}`;
    }
    return url;
  }

  // If the url is an absolute URL containing localhost or 127.0.0.1 on port 8080,
  // AND the current configured API_URL is NOT localhost/127.0.0.1
  if (url.includes("localhost:8080") || url.includes("127.0.0.1:8080")) {
    const isApiLocal =
      API_URL.includes("localhost:8080") ||
      API_URL.includes("127.0.0.1:8080") ||
      API_URL.includes("localhost:") ||
      API_URL.includes("127.0.0.1:");
    if (!isApiLocal) {
      const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
      return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8080/, baseUrl);
    }
  }

  return url;
}
