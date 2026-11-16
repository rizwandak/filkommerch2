export function isInStoreOnlyMode(settings: any): boolean {
  if (!settings || !settings.homepage_layout) return true;
  try {
    const parsed =
      typeof settings.homepage_layout === "object"
        ? settings.homepage_layout
        : JSON.parse(settings.homepage_layout);
    if (Array.isArray(parsed)) {
      const seg = parsed.find((s: any) => s.id === "seg-in-store-only");
      if (seg !== undefined) {
        return Boolean(seg.enabled);
      }
    }
  } catch {
    // fallback to true if layout cannot be parsed
  }
  return true;
}

export function setInStoreOnlyInLayout(rawLayout: any, enabled: boolean): string {
  let segments: any[] = [];
  try {
    if (rawLayout) {
      const parsed = typeof rawLayout === "object" ? rawLayout : JSON.parse(rawLayout);
      if (Array.isArray(parsed)) {
        segments = parsed;
      }
    }
  } catch {
    segments = [];
  }

  const idx = segments.findIndex((s: any) => s.id === "seg-in-store-only");
  const flagSeg = {
    id: "seg-in-store-only",
    title: "Mode Promo In-Store Only (Year-End Sale)",
    enabled,
    elements: [],
  };

  if (idx >= 0) {
    segments[idx] = flagSeg;
  } else {
    segments.unshift(flagSeg);
  }

  return JSON.stringify(segments);
}
