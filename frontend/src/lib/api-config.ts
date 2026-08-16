/**
 * Single Source of Truth Configuration for Backend Target URL.
 * 
 * BACKEND_TARGET OPTIONS:
 * - "AUTO"  : Smart automatic detection. Uses local backend (http://127.0.0.1:8080) when developing locally
 *             on localhost/127.0.0.1, and switches automatically to production backend (https://filkommerch.com)
 *             when deployed to cPanel / production environment.
 * - "LOCAL" : Forces application to target local backend (http://127.0.0.1:8080).
 * - "LIVE"  : Forces application to target production backend (https://filkommerch.com).
 */
export type BackendTargetMode = "AUTO" | "LOCAL" | "LIVE";

export const BACKEND_TARGET: BackendTargetMode = "AUTO";
// export const BACKEND_TARGET: BackendTargetMode = "LOCAL";

export const LOCAL_BACKEND_URL = "http://127.0.0.1:8080";
export const LIVE_BACKEND_URL = "https://filkommerch.com";

export const getApiBaseUrl = (): string => {
  const mode = BACKEND_TARGET as string;

  if (mode === "LOCAL") {
    return LOCAL_BACKEND_URL;
  }

  if (mode === "LIVE") {
    return LIVE_BACKEND_URL;
  }

  // 1. If explicit env variable is set (VITE_API_URL or API_URL or BACKEND_URL)
  if (typeof process !== "undefined") {
    const envApi = process.env.VITE_API_URL || process.env.API_URL || process.env.BACKEND_URL;
    if (envApi) {
      return envApi.replace(/\/api\/?$/, "").replace(/\/$/, "");
    }
  }

  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }

  // 2. In Browser: Detect localhost/127.0.0.1
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local")
    ) {
      return LOCAL_BACKEND_URL;
    }
    return LIVE_BACKEND_URL;
  }

  // 3. In Server (SSR): Only treat as local if explicitly running in development mode
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    return LOCAL_BACKEND_URL;
  }

  // Production SSR fallback (cPanel Node.js server)
  return LIVE_BACKEND_URL;
};

/**
 * Resolves full uploads directory base URL.
 */
export const getUploadsBaseUrl = (): string => {
  return `${getApiBaseUrl()}/uploads`;
};
