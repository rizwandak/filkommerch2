import { getCookies } from "@tanstack/react-start/server";

export function getServerCookies(): Record<string, string | undefined> {
  try {
    return getCookies();
  } catch (e) {
    console.warn("getServerCookies failed:", e);
    return {};
  }
}
