import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useWishlist } from "@/lib/useWishlist";
import { getProducts } from "@backend/server-actions";
import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/image-resolver";
import { Heart, ArrowRight, Trash2, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
  head: () => ({
    meta: [
      { title: "Wishlist — FILKOM Merch" },
      { name: "description", content: "Daftar produk favorit kamu" },
    ],
  }),
});

function WishlistPage() {
  const { wishlist, toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(),
  });

  const products = data?.products || [];
  const wishlistProducts = products.filter((p) => wishlist.includes(String(p.id)));

  // Determine active price helper
  const getActivePrice = (product: any) => {
    const isUb = Number(user?.is_filkom_verified) === 1;
    if (product.promo_price && Number(product.promo_price) > 0) {
      return Number(product.promo_price);
    }
    if (isUb && product.filkom_price && Number(product.filkom_price) > 0) {
      return Number(product.filkom_price);
    }
    return Number(product.price);
  };

  const handleAddToCart = (product: any, isBuyNow: boolean) => {
    if (isBuyNow) {
      window.dispatchEvent(new CustomEvent("add-to-cart", { detail: { ...product, qty: 1 } }));
      setTimeout(() => navigate({ to: "/checkout" }), 100);
    } else {
      window.dispatchEvent(new CustomEvent("add-to-cart", { detail: { ...product, qty: 1 } }));
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-16">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-3 bg-brand-orange text-cream rounded-2xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] border-2 border-ink">
            <Heart className="w-8 h-8 fill-cream" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-ink">
              Wishlist Kamu
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
              {wishlistProducts.length} produk favorit tersimpan
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-ink border-t-brand-orange rounded-full animate-spin"></div>
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-24 bg-white border-2 border-ink rounded-3xl shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] max-w-2xl mx-auto">
            <Heart className="w-20 h-20 text-neutral-300 mx-auto mb-6" />
            <h2 className="text-2xl font-black uppercase mb-4 text-ink">
              Belum ada produk favorit
            </h2>
            <p className="text-muted-foreground mb-8">
              Koleksi barang-barang keren FILKOM Merch dan simpan di sini untuk dibeli nanti.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 bg-ink text-cream px-8 py-4 font-bold tracking-widest uppercase hover:bg-brand-orange hover:scale-105 transition-all shadow-[4px_4px_0px_0px_rgba(234,88,12,0.6)]"
            >
              Mulai Belanja <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {wishlistProducts.map((p) => {
              const currentPrice = getActivePrice(p);
              const showDiscount = p.original_price && p.original_price > currentPrice;

              return (
                <article
                  key={p.id}
                  className="group flex flex-col bg-card border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all duration-200 overflow-hidden relative h-full text-ink animate-fade-in"
                >
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="block relative aspect-square overflow-hidden bg-cream border-b-2 border-ink select-none"
                  >
                    {p.image_url ? (
                      <img
                        src={resolveImageUrl(p.image_url)}
                        alt={p.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold bg-cream text-xs">
                        No Photo
                      </div>
                    )}
                  </Link>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(p.id, p.name);
                    }}
                    className="absolute top-2 right-2 z-10 p-2 bg-white/90 hover:bg-red-50 text-red-500 rounded-full border border-ink shadow-sm hover:scale-110 transition-all"
                    aria-label="Hapus dari Wishlist"
                    title="Hapus dari Wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                        {p.category_name || "Uncategorized"}
                      </p>
                      <Link to="/product/$slug" params={{ slug: p.slug }}>
                        <h3 className="font-extrabold text-sm text-ink hover:text-brand-orange transition tracking-tight line-clamp-2">
                          {p.name}
                        </h3>
                      </Link>
                    </div>

                    <div className="mt-4 pt-4 border-t border-cream flex items-end justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-base text-ink">
                            Rp {currentPrice.toLocaleString("id-ID")}
                          </span>
                        </div>
                        {showDiscount && (
                          <p className="text-xs text-red-500 line-through font-bold">
                            Rp {p.original_price!.toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddToCart(p, false)}
                        className="bg-brand-orange hover:bg-ink text-cream hover:text-cream p-2.5 rounded-lg transition border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                        title="Masukkan Keranjang"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
