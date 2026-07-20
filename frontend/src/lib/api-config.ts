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

  // AUTO Mode: Detect local development vs server environment
  const isLocalEnv =
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.endsWith(".local"))) ||
    (typeof process !== "undefined" &&
      (process.env.NODE_ENV === "development" || !process.env.NODE_ENV));

  if (isLocalEnv) {
    return LOCAL_BACKEND_URL;
  }

  return LIVE_BACKEND_URL;
};

/**
 * Resolves full uploads directory base URL.
 */
export const getUploadsBaseUrl = (): string => {
  return `${getApiBaseUrl()}/uploads`;
};
