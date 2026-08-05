import React from "react";
import { Link } from "@tanstack/react-router";
import { X, Heart, ShoppingBag } from "lucide-react";
import { resolveImageUrl } from "@/lib/image-resolver";

interface QuickViewModalProps {
  product: any;
  onClose: () => void;
  user?: any;
  wishlist: string[];
  toggleWishlist: (id: string, name?: string) => void;
  addToCart: (product: any, size?: string) => void;
}

export function QuickViewModal({
  product,
  onClose,
  user,
  wishlist,
  toggleWishlist,
  addToCart,
}: QuickViewModalProps) {
  if (!product) return null;

  const getActivePriceForCard = (p: any) => {
    const isUb = Number(user?.is_filkom_verified) === 1;
    if (p.rawPrice) {
      if (isUb && p.filkom_price && Number(p.filkom_price) > 0) {
        return "Rp " + Number(p.filkom_price).toLocaleString("id-ID");
      }
      return "Rp " + Number(p.rawPrice || 0).toLocaleString("id-ID");
    }
    // Fallback for DB product structure
    if (p.price) {
      if (isUb && p.filkom_price && Number(p.filkom_price) > 0) {
        return "Rp " + Number(p.filkom_price).toLocaleString("id-ID");
      }
      return "Rp " + Number(p.price).toLocaleString("id-ID");
    }
    return p.price || "";
  };

  const getProductAvailableSizes = (p: any): string[] => {
    if (p.variants) {
      return p.variants.map((v: any) => v.size).filter(Boolean);
    }
    return ["S", "M", "L", "XL", "XXL"]; // Default mock sizes for legacy items without variants
  };

  const productName = product.name || "";
  const imageUrl = product.img || product.image_url;
  const categoryName = product.cat || product.category_name;
  const originalPrice = product.was || (product.original_price ? "Rp " + Number(product.original_price).toLocaleString("id-ID") : null);

  const description = productName.includes("Varsity")
    ? "Varsity Jacket edisi khusus civitas akademika Fakultas Ilmu Komputer Universitas Brawijaya. Terbuat dari cotton fleece premium 330gsm dengan jahitan double-stitch, furing katun adem, kancing snap metal anti-karat, dan bordir komputer timbul super tebal (chenille embroidery) khas varsity retail."
    : productName.includes("Hoodie")
      ? "Heavyweight Hoodie dengan cuttingan boxy khas fashion modern. Sangat pas untuk ngoding semalaman, melindungi tubuh dari angin malam AC gazebo. Terbuat dari katun fleece 300gsm tebal dengan kap kepala double layer."
      : productName.includes("Tee") || productName.includes("T-Shirt")
        ? "T-Shirt harian berbahan katun kombed 24s premium (Twill combed) bertekstur lembut dan menyerap keringat. Sablon presisi tinggi tahan cuci dengan desain grafis ikonik representasi kehidupan programmer FILKOM."
        : product.description || "Aksesoris eksklusif penunjang identitas mahasiswa FILKOM UB. Dibuat dengan material kokoh berdaya tahan tinggi, cocok dipakai kuliah harian maupun kegiatan praktikum.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-background border-4 border-ink rounded-lg w-full max-w-4xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 z-10 animate-scale-in max-h-[90vh] overflow-y-auto shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded border-2 border-ink bg-cream text-ink hover:bg-ink hover:text-cream transition-colors z-20 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left Image column */}
        <div className="w-full md:w-1/2 aspect-[4/5] bg-secondary border-2 border-ink rounded overflow-hidden relative">
          <img
            src={resolveImageUrl(imageUrl)}
            alt={productName}
            className="w-full h-full object-cover"
          />
          {product.tag && (
            <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-2.5 py-1 bg-ink text-cream rounded uppercase">
              {product.tag}
            </span>
          )}
        </div>

        {/* Right Details column */}
        <div className="w-full md:w-1/2 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-brand-orange uppercase mb-1">
              {categoryName}
            </div>
            <h3 className="display text-xl sm:text-3xl text-ink font-bold uppercase leading-none tracking-wide mb-3">
              {productName}
            </h3>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xl font-extrabold text-ink">{getActivePriceForCard(product)}</span>
              {(originalPrice || (product.filkom_price && Number(user?.is_filkom_verified) === 1 && Number(product.filkom_price) < (product.rawPrice || product.price || 0))) && (
                <span className="text-sm text-muted-foreground line-through font-bold">
                  {originalPrice || (product.rawPrice ? "Rp " + product.rawPrice.toLocaleString("id-ID") : product.price ? "Rp " + Number(product.price).toLocaleString("id-ID") : "")}
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-medium line-clamp-4">
              {description}
            </p>

            {/* Size Selector */}
            {getProductAvailableSizes(product).length > 0 && (
              <div className="space-y-2 mb-6 animate-scale-in">
                <span className="text-xs font-bold text-ink tracking-wider uppercase block">
                  PILIH UKURAN:
                </span>
                <div className="flex flex-wrap gap-2">
                  {getProductAvailableSizes(product).map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        addToCart(product, size);
                        onClose();
                      }}
                      className="border-2 border-ink font-bold text-xs py-2 px-4 hover:bg-brand-orange hover:text-cream cursor-pointer uppercase transition-all duration-200"
                    >
                      Size {size}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-ink/10 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                addToCart(product);
                onClose();
              }}
              className="flex-1 bg-ink text-cream font-bold tracking-widest text-xs py-4 text-center hover:bg-brand-orange hover:text-cream transition-all duration-200 uppercase cursor-pointer"
            >
              ADD TO BAG
            </button>
            <button
              onClick={() => {
                toggleWishlist(product.id, product.name);
              }}
              className="border-2 border-ink font-bold text-xs p-4 flex items-center justify-center hover:bg-ink hover:text-cream transition-all duration-200 cursor-pointer"
              aria-label="Wishlist toggle"
            >
              <Heart
                className={`w-4 h-4 ${wishlist.includes(product.id) ? "fill-red-500 text-red-500" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
