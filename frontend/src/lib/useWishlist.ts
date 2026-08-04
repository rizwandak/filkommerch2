import { useState, useEffect } from "react";
import { toast } from "sonner";

export function useWishlist() {
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("wishlist");
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const toggleWishlist = (productId: string, productName?: string) => {
    setWishlist((prev) => {
      let updated;
      if (prev.includes(productId)) {
        updated = prev.filter((id) => id !== productId);
        if (productName) toast.success(`Dihapus dari wishlist: ${productName}`);
      } else {
        updated = [...prev, productId];
        if (productName) toast.success(`Ditambahkan ke wishlist: ${productName}`);
      }
      localStorage.setItem("wishlist", JSON.stringify(updated));
      return updated;
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return { wishlist, toggleWishlist, isInWishlist };
}
