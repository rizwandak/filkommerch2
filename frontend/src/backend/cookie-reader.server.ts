import { createServerOnlyFn } from "@tanstack/react-start";
import { getCookies } from "@tanstack/react-start/server";

export const getServerCookies = createServerOnlyFn(() => {
  try {
    return getCookies() as Record<string, string | undefined>;
  } catch (e) {
    console.warn("getServerCookies failed:", e);
    return {} as Record<string, string | undefined>;
  }
});
