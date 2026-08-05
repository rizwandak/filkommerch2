import { useState, useEffect } from "react";

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("recentlyViewed");
    if (saved) {
      try {
        setRecentlyViewed(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const addViewedProduct = (productId: string) => {
    setRecentlyViewed((prev) => {
      // Remove if it exists to push to front
      const filtered = prev.filter((id) => id !== productId);
      // Add to front, keep max 10
      const updated = [productId, ...filtered].slice(0, 10);
      localStorage.setItem("recentlyViewed", JSON.stringify(updated));
      return updated;
    });
  };

  return { recentlyViewed, addViewedProduct };
}
