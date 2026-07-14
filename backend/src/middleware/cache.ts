import { Request, Response, NextFunction } from "express";

interface CacheEntry {
  data: any;
  expiry: number;
}

const cacheStore = new Map<string, CacheEntry>();

/**
 * Express Middleware to cache GET API responses in memory for high performance.
 * @param ttlSeconds Time-to-live in seconds (default 60s)
 */
export function cacheMiddleware(ttlSeconds: number = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const key = req.originalUrl || req.url;
    const now = Date.now();
    const cached = cacheStore.get(key);

    if (cached && cached.expiry > now) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds * 5}`);
      return res.json(cached.data);
    }

    // Intercept res.json to save the response into cache
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Only cache successful 200 responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(key, {
          data: body,
          expiry: Date.now() + ttlSeconds * 1000,
        });
      }
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds * 5}`);
      return originalJson(body);
    };

    next();
  };
}

/**
 * Clear cached entries.
 * If prefix is provided, clears entries matching that path prefix (e.g. "/api/products").
 * If no prefix is provided, clears the entire cache.
 */
export function clearCache(prefix?: string) {
  if (!prefix) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
