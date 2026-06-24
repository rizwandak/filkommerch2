import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag,
  ArrowLeft,
  Star,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Heart,
  Share2,
  Minus,
  Plus,
  MessageSquare,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getProductBySlug } from "@backend/server-actions";
import { Button } from "@frontend/components/ui/button";
import { useAuth } from "@/lib/auth";
import logoFilkom from "@/assets/logo_filkom.png";
import logo from "@/assets/logo-fm.jpg";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const result = await getProductBySlug({ data: params.slug });
    return { product: result.product || null, error: result.error || null };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.product
      ? `${loaderData.product.name} — FILKOM Merch`
      : "Detail Produk — FILKOM Merch";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: loaderData?.product?.description || "Detail Produk Merchandise FILKOM UB",
        },
      ],
    };
  },
  component: ProductDetailPage,
});

// Mock reviews seed
const MOCK_REVIEWS = [
  {
    id: 1,
    name: "Rian Prasetya",
    nim: "2251502******",
    rating: 5,
    date: "2026-06-18",
    comment:
      "Bahan varsity-nya tebal banget, bordirannya rapi pol. Gak nyesel beli pre-order kmrn. Dipakai nugas malem-malem di gazebo adem bgt.",
    variant: "Navy / L",
  },
  {
    id: 2,
    name: "Alya Nabila",
    nim: "2351504******",
    rating: 5,
    date: "2026-06-20",
    comment:
      "T-shirt debugging kaosnya adem, sablonannya oke, pas banget buat kuliah harian. Desainnya juga relate anak IT bgt wkwk.",
    variant: "Black / M",
  },
  {
    id: 3,
    name: "Daffa Ramadhan",
    nim: "2151506******",
    rating: 4,
    date: "2026-06-22",
    comment:
      "Lanyard-nya bagus, tali tebal dan pengaitnya kokoh. Pas buat id card praktikum. Sukses terus Bem Filkom!",
    variant: "All Size",
  },
];

function ProductDetailPage() {
  const { product, error } = Route.useLoaderData();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Initialize values when product changes
  useEffect(() => {
    if (product) {
      if (product.image_url) {
        setActiveImage(product.image_url);
      }

      // Extract unique colors and sizes from variants
      const colors = Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean)));
      const sizes = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)));

      if (colors.length > 0) {
        setSelectedColor(colors[0] as string);
      }
      if (sizes.length > 0) {
        setSelectedSize(sizes[0] as string);
      }
    }
  }, [product]);

  // Extract color & size arrays for rendering
  const colors = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[];
  }, [product]);

  const sizes = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean))) as string[];
  }, [product]);

  // Calculate dynamic stock based on selections
  const currentVariant = useMemo(() => {
    if (!product) return null;
    return (
      product.variants.find((v) => {
        const matchColor = !selectedColor || v.color === selectedColor;
        const matchSize = !selectedSize || v.size === selectedSize;
        return matchColor && matchSize;
      }) || null
    );
  }, [product, selectedColor, selectedSize]);

  const currentStock = useMemo(() => {
    if (!product) return 0;
    if (product.variants.length === 0) return 0;

    // If no variants filters are needed (like all size/no color)
    if (colors.length === 0 && sizes.length === 0) {
      return product.variants[0].stock;
    }

    return currentVariant ? currentVariant.stock : 0;
  }, [product, currentVariant, colors, sizes]);

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] text-ink flex flex-col items-center justify-center p-6">
        <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Produk Tidak Ditemukan</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Sayang sekali produk yang Anda cari tidak tersedia atau dinonaktifkan.
        </p>
        <Link
          to="/"
          className="font-bold text-brand-orange hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // Product images gallery
  const images =
    product.images && product.images.length > 0
      ? product.images
      : ([product.image_url].filter(Boolean) as string[]);

  const handleAddToCart = (buyNow = false) => {
    if (!selectedSize && sizes.length > 0) {
      toast.error("Pilih ukuran terlebih dahulu!");
      return;
    }
    if (!selectedColor && colors.length > 0) {
      toast.error("Pilih warna terlebih dahulu!");
      return;
    }
    if (currentStock <= 0) {
      toast.error("Stok untuk variasi ini habis!");
      return;
    }
    if (quantity > currentStock) {
      toast.error(`Kuantitas melebihi stok yang tersedia (${currentStock} pcs)`);
      return;
    }

    // Build variant string details
    const variantStr = [selectedColor, selectedSize].filter(Boolean).join(" — ");
    const cartItemName = `${product.name}${variantStr ? ` (${variantStr})` : ""}`;
    const cartItemId = `online-${product.id}-${selectedColor || ""}-${selectedSize || ""}`;

    // Read indexCart
    let indexCart: any[] = [];
    try {
      const saved = localStorage.getItem("indexCart");
      if (saved) indexCart = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    // Upsert indexCart (for homepage navbar bag)
    const existingIndexIdx = indexCart.findIndex((i) => i.id === cartItemId);
    const itemData = {
      id: cartItemId,
      name: cartItemName,
      price: `Rp ${product.price.toLocaleString("id-ID")}`,
      img: product.image_url || "",
      qty: quantity,
      product_id: product.id,
      variant_id: currentVariant?.id,
      size: selectedSize || "One Size",
      color: selectedColor || undefined,
    };

    if (existingIndexIdx > -1) {
      indexCart[existingIndexIdx].qty += quantity;
    } else {
      indexCart.push(itemData);
    }
    localStorage.setItem("indexCart", JSON.stringify(indexCart));

    // Format for checkout page cart structure
    const checkoutItem = {
      id: cartItemId,
      product_id: product.id,
      product_name: cartItemName,
      name: cartItemName,
      price: product.price,
      quantity: quantity,
      size: selectedSize || "One Size",
      color: selectedColor || undefined,
      variant_id: currentVariant?.id,
      category: product.category_name || "Apparel",
    };

    // Save to checkout cart (usually replaces or appends)
    let checkoutCart: any[] = [];
    try {
      const saved = localStorage.getItem("cart");
      if (saved) checkoutCart = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    const existingCheckIdx = checkoutCart.findIndex((i) => i.id === cartItemId);
    if (existingCheckIdx > -1) {
      checkoutCart[existingCheckIdx].quantity += quantity;
    } else {
      checkoutCart.push(checkoutItem);
    }
    localStorage.setItem("cart", JSON.stringify(checkoutCart));

    if (buyNow) {
      if (!user) {
        toast.info("Silakan login terlebih dahulu untuk checkout");
        navigate({ to: "/login" });
      } else {
        navigate({ to: "/checkout" });
      }
    } else {
      toast.success("Berhasil ditambahkan ke Keranjang", {
        description: `${cartItemName} (${quantity} pcs)`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-cream rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="Logo"
                className="w-9 h-9 rounded-full object-cover border border-ink"
              />
              <img src={logoFilkom} alt="FILKOM" className="h-8 w-8 object-contain" />
              <div className="leading-tight hidden sm:block">
                <p className="font-bold text-sm">FILKOM Merch</p>
                <p className="text-[9px] tracking-widest text-muted-foreground uppercase">
                  Official UB Store
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-brand-blue border border-brand-blue/30 px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  {user.type === "admin" ? user.username : user.name}
                </button>

                {userMenuOpen && (
                  <>
                    {/* Overlay to close menu */}
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white border border-border shadow-lg py-1 z-50 animate-fade-in text-ink text-left">
                      <div className="px-5 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground">
                          {user.type === "admin" ? user.username : user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-900 rounded">
                          {user.type === "admin" ? "ADMIN" : "BUYER"}
                        </span>
                      </div>
                      {user.type === "buyer" && (
                        <Link
                          to="/orders"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Pesanan Saya
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          toast.success("Logged out");
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold text-brand-orange border border-brand-orange px-4 py-1.5 rounded-full hover:bg-brand-orange hover:text-white transition-colors"
              >
                SIGN IN
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main product box */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-ink rounded-xl shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] overflow-hidden grid md:grid-cols-12">
          {/* LEFT: Image gallery (5 cols) */}
          <div className="md:col-span-6 p-6 border-b-2 md:border-b-0 md:border-r-2 border-ink flex flex-col justify-between">
            <div className="aspect-[4/5] bg-cream border-2 border-ink rounded-lg overflow-hidden relative">
              <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setIsWishlisted(!isWishlisted);
                  toast.success(isWishlisted ? "Dihapus dari wishlist" : "Ditambahkan ke wishlist");
                }}
                className="absolute top-4 right-4 p-2.5 bg-white/95 rounded-full shadow border border-ink hover:scale-105 transition-transform"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 aspect-square rounded border-2 overflow-hidden bg-cream shrink-0 transition-all ${
                    activeImage === img
                      ? "border-brand-orange scale-95 shadow-sm"
                      : "border-ink/25 hover:border-ink"
                  }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Product details (6 cols) */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] bg-brand-orange/10 text-brand-orange font-extrabold px-2.5 py-1 rounded tracking-widest uppercase">
                  {product.category_name || "APPAREL"}
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-900 font-bold px-2 py-1 rounded">
                  OFFICIAL FIT
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink uppercase tracking-tight">
                {product.name}
              </h1>

              {/* Ratings and Sold stats (Shopee style) */}
              <div className="flex items-center gap-4 mt-2 py-2 border-y border-dashed border-border text-xs sm:text-sm">
                <div className="flex items-center gap-1 text-yellow-500">
                  <span className="font-bold text-ink mr-0.5">4.9</span>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <div className="h-4 w-px bg-border" />
                <p className="text-muted-foreground">
                  <span className="font-semibold text-ink">48</span> Penilaian
                </p>
                <div className="h-4 w-px bg-border" />
                <p className="text-muted-foreground">
                  <span className="font-semibold text-ink">120+</span> Terjual
                </p>
              </div>

              {/* Price Tag */}
              <div className="mt-4 p-4 bg-[#FCFAF7] border border-ink/20 rounded-lg flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-brand-orange">
                  Rp {product.price.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  Rp {(product.price * 1.15).toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                  -15%
                </span>
              </div>

              {/* Delivery Info */}
              <div className="space-y-2 mt-5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <p>
                    <span className="font-bold text-ink">Free Ongkir Khusus FILKOM UB</span> (Ambil
                    di BEM)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-blue" />
                  <p>Garansi Penukaran Ukuran (maks 3 hari setelah diterima)</p>
                </div>
              </div>

              {/* Selection: Colors */}
              {colors.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pilih Warna:{" "}
                    <span className="text-ink font-extrabold">{selectedColor || "-"}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2 text-xs font-semibold border-2 transition rounded ${
                          selectedColor === color
                            ? "bg-ink text-white border-ink shadow-sm scale-95"
                            : "bg-white text-ink border-border hover:border-ink"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selection: Sizes */}
              {sizes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pilih Ukuran:{" "}
                    <span className="text-ink font-extrabold">{selectedSize || "-"}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`w-12 h-10 flex items-center justify-center text-xs font-bold border-2 transition rounded ${
                          selectedSize === size
                            ? "bg-ink text-white border-ink shadow-sm scale-95"
                            : "bg-white text-ink border-border hover:border-ink"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity and Stock status */}
              <div className="mt-6 flex items-center gap-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                  Jumlah:
                </p>
                <div className="flex items-center border-2 border-ink rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 border-r border-ink hover:bg-cream active:scale-95 transition-all"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center text-sm font-extrabold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    disabled={currentStock <= 0}
                    className="p-2 border-l border-ink hover:bg-cream active:scale-95 transition-all disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Stok:{" "}
                  <span
                    className={`font-bold ${currentStock <= 3 ? "text-red-600 animate-pulse" : "text-ink"}`}
                  >
                    {currentStock} pcs
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons: Add to Bag and Buy Now */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => handleAddToCart(false)}
                disabled={currentStock <= 0}
                className="flex-1 py-6 border-2 border-ink hover:bg-cream text-ink font-bold text-xs uppercase tracking-widest transition-transform active:scale-98"
              >
                Masukkan Keranjang
              </Button>
              <Button
                onClick={() => handleAddToCart(true)}
                disabled={currentStock <= 0}
                className="flex-1 py-6 bg-ink hover:bg-brand-orange text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-98 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
              >
                Beli Sekarang
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Specifications */}
        <div className="mt-8">
          {/* Specifications Box (Full Width 12 cols) */}
          <div className="bg-white border-2 border-ink rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
            <h2 className="text-lg font-bold text-ink uppercase tracking-wider border-b border-border pb-3 mb-4">
              Spesifikasi & Deskripsi
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border text-xs">
                <span className="font-bold text-ink uppercase tracking-wider">Bahan</span>
                <span className="col-span-2">
                  {product.bahan || "Premium Cotton Fleece / Heavyweight Cotton 24s"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border text-xs">
                <span className="font-bold text-ink uppercase tracking-wider">Aplikasi</span>
                <span className="col-span-2">
                  {product.aplikasi || "Embroidery (Bordir Timbul) / High Quality DTF Screen Print"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-border text-xs">
                <span className="font-bold text-ink uppercase tracking-wider">Asal</span>
                <span className="col-span-2">
                  {product.asal || "Dibuat oleh BEM FILKOM UB Creative Division"}
                </span>
              </div>

              <div className="pt-2">
                <p className="font-bold text-ink uppercase text-xs mb-2 tracking-wider">
                  Penjelasan Produk:
                </p>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.description ||
                    "Tidak ada deskripsi produk kustom yang diberikan. Barang merchandise resmi dari Fakultas Ilmu Komputer Universitas Brawijaya dengan kualitas premium, jaminan kenyamanan dipakai kuliah seharian."}
                </div>
              </div>

              <div className="pt-2 border-t border-border mt-4">
                <p className="font-bold text-ink uppercase text-xs mb-2 tracking-wider">
                  Ukuran Chart:
                </p>
                {product.size_chart_url ? (
                  <div className="mt-2 max-w-lg border-2 border-ink rounded-lg overflow-hidden bg-cream">
                    <img
                      src={product.size_chart_url}
                      alt="Size Chart"
                      className="w-full h-auto object-contain max-h-[350px]"
                    />
                  </div>
                ) : (
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>S : 50 cm x 66 cm</li>
                    <li>M : 53 cm x 69 cm</li>
                    <li>L : 56 cm x 72 cm</li>
                    <li>XL : 59 cm x 75 cm</li>
                    <li>XXL : 62 cm x 78 cm</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
