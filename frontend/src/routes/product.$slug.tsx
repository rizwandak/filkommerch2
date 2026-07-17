import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useMemo, useEffect } from "react";
import {
  ShoppingBag,
  ArrowLeft,
  Star,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Share2,
  Minus,
  Plus,
  MessageSquare,
  LogOut,
  User,
  Trash2,
  Menu,
  ArrowRight,
  Search,
  X,
  User as UserIcon,
  LayoutDashboard,
  MonitorSmartphone,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { getProductBySlug } from "@backend/server-actions";
import { Button } from "@frontend/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import pVarsity from "@/assets/p-varsity.jpg";
import pHoodie from "@/assets/p-hoodie.jpg";
import pTshirt from "@/assets/p-tshirt.jpg";
import pTee2 from "@/assets/p-tee2.jpg";
import { resolveImageUrl } from "@/lib/image-resolver";

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const NAV = [
  { label: "BERANDA", href: "/", isScroll: true, target: "top" },
  { label: "PRODUK", href: "/products" },
  { label: "PRE-ORDER", href: "/pre-order" },
  { label: "TENTANG KAMI", href: "/#about", isScroll: true, target: "about" },
  { label: "FAQ", href: "/faq" },
];

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

  const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");

  const [selectedBundleVariants, setSelectedBundleVariants] = useState<Record<number, any>>({});
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Size Fit Guide State
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [userHeight, setUserHeight] = useState("");
  const [userWeight, setUserWeight] = useState("");
  const [sizeRecommendation, setSizeRecommendation] = useState<{
    size: string;
    desc: string;
  } | null>(null);

  const calculateSize = () => {
    const h = parseInt(userHeight);
    const w = parseInt(userWeight);
    if (!h || !w) return;

    let recommended = "L";
    let desc = "Nyaman";

    if (h < 160 && w < 55) {
      recommended = "S";
      desc = "Pas badan";
    } else if (h < 165 && w < 65) {
      recommended = "M";
      desc = "Fit ideal";
    } else if (h < 175 && w < 75) {
      recommended = "L";
      desc = "Nyaman";
    } else if (h < 185 && w < 85) {
      recommended = "XL";
      desc = "Sedikit longgar";
    } else {
      recommended = "XXL";
      desc = "Oversized";
    }

    setSizeRecommendation({ size: recommended, desc });
  };



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

  useEffect(() => {
    if (product && product.product_type === "bundle" && product.bundle_components) {
      const initial: Record<number, any> = {};
      for (const comp of product.bundle_components) {
        const firstAvailable = comp.variants?.find((v) => v.stock > 0) || comp.variants?.[0];
        if (firstAvailable) {
          initial[comp.id] = firstAvailable;
        }
      }
      setSelectedBundleVariants(initial);
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

    // Pre-order items do not rely on physical stock count
    if (product.sale_type === "preorder") {
      return 999;
    }

    if (product.product_type === "bundle") {
      if (!product.bundle_components || product.bundle_components.length === 0) return 0;
      let minStock = Infinity;
      for (const comp of product.bundle_components) {
        const selectedVar = selectedBundleVariants[comp.id];
        if (!selectedVar) return 0;
        minStock = Math.min(minStock, selectedVar.stock);
      }
      return minStock === Infinity ? 0 : minStock;
    }

    if (product.variants.length === 0) return 0;

    if (colors.length === 0 && sizes.length === 0) {
      return product.variants[0].stock;
    }

    return currentVariant ? currentVariant.stock : 0;
  }, [product, currentVariant, colors, sizes, selectedBundleVariants]);

  // Dynamic Price computation
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    const isUb = user?.is_filkom_verified === 1;

    if (product.promo_price && Number(product.promo_price) > 0) {
      return Number(product.promo_price);
    }

    if (isUb) {
      if (selectedSize || selectedColor) {
        const matchingVariant = product.variants?.find(
          (v: any) =>
            v.is_active &&
            (!selectedSize || v.size === selectedSize) &&
            (!selectedColor || v.color === selectedColor),
        );
        if (matchingVariant?.filkom_price && Number(matchingVariant.filkom_price) > 0) {
          return Number(matchingVariant.filkom_price);
        }
      }
      if (product.filkom_price && Number(product.filkom_price) > 0) {
        return Number(product.filkom_price);
      }
    }

    if (selectedSize || selectedColor) {
      const matchingVariant = product.variants?.find(
        (v: any) =>
          v.is_active &&
          (!selectedSize || v.size === selectedSize) &&
          (!selectedColor || v.color === selectedColor),
      );
      if (matchingVariant?.price_override && Number(matchingVariant.price_override) > 0) {
        return Number(matchingVariant.price_override);
      }
    }

    return Number(product.price);
  }, [product, user, selectedSize, selectedColor]);

  // Dynamic original price (for strike-through display)
  const originalPrice = useMemo(() => {
    if (!product) return null;
    if (product.original_price && Number(product.original_price) > 0) {
      return Number(product.original_price);
    }
    const basePrice = Number(product.price);
    if (currentPrice < basePrice) {
      return basePrice;
    }
    return null;
  }, [product, currentPrice]);

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

    let cartItemName = product.name;
    let selectionsPayload: any[] = [];
    let uniqueSelectionsStr = "";

    if (product.product_type === "bundle") {
      const selectionDetails = (product.bundle_components || [])
        .map((comp) => {
          const variant = selectedBundleVariants[comp.id];
          const variantStr = [variant?.color, variant?.size]
            .filter((v) => v && v !== "One Size" && v !== "All Size")
            .join(" — ");
          return `${comp.name}${variantStr ? `: ${variantStr}` : ""}`;
        })
        .join(", ");
      cartItemName = `${product.name} (${selectionDetails})`;

      selectionsPayload = (product.bundle_components || []).map((comp) => {
        const variant = selectedBundleVariants[comp.id];
        return {
          product_id: comp.id,
          variant_id: variant?.id || 0,
          quantity: 1,
        };
      });
      uniqueSelectionsStr = selectionsPayload
        .map((s) => `${s.product_id}-${s.variant_id}`)
        .sort()
        .join("-");
    } else {
      const variantStr = [selectedColor, selectedSize].filter(Boolean).join(" — ");
      cartItemName = `${product.name}${variantStr ? ` (${variantStr})` : ""}`;
    }

    const cartItemId =
      product.product_type === "bundle"
        ? `online-bundle-${product.id}-${uniqueSelectionsStr}`
        : `online-${product.id}-${selectedColor || ""}-${selectedSize || ""}`;

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
      price: `Rp ${currentPrice.toLocaleString("id-ID")}`,
      img: product.image_url || "",
      qty: quantity,
      product_id: product.id,
      variant_id: currentVariant?.id || product.variants[0]?.id,
      size: selectedSize || "One Size",
      color: selectedColor || undefined,
      bundle_selections: selectionsPayload.length > 0 ? selectionsPayload : undefined,
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
      price: currentPrice,
      quantity: quantity,
      size: selectedSize || "One Size",
      color: selectedColor || undefined,
      variant_id: currentVariant?.id || product.variants[0]?.id,
      image_url: product.image_url || "",
      category: product.category_name || "Apparel",
      bundle_selections: selectionsPayload.length > 0 ? selectionsPayload : undefined,
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

    // In handleAddToCart:
    // Dispatch events to notify Navbar component
    window.dispatchEvent(new Event("cart-updated"));

    if (buyNow) {
      if (!user) {
        toast.info("Silakan login terlebih dahulu untuk checkout");
        navigate({ to: "/login" });
      } else {
        navigate({ to: "/checkout" });
      }
    } else {
      window.dispatchEvent(new Event("open-cart"));
      toast.success("Berhasil ditambahkan ke Keranjang", {
        description: `${cartItemName} (${quantity} pcs)`,
      });
    }
  };

  const [activeTab, setActiveTab] = useState<"detail" | "spesifikasi" | "panduan">("detail");

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink flex flex-col justify-between">
      {/* Header Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex-1 w-full pb-24 md:pb-8">
        {/* 3-Column Layout: Left (Fixed Sticky Photo) | Middle (Details & Tabs) | Right (Fixed Sticky Buy Card) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* COLUMN 1: LEFT STICKY GALLERY (4 Cols - Fixed Anchored) */}
          <div className="md:col-span-4 md:sticky md:top-28 self-start">
            {/* Horizontal Swipe Carousel */}
            <div className="relative w-full overflow-hidden">
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveImage(img);
                      setIsZoomOpen(true);
                    }}
                    className="w-[85%] md:w-full shrink-0 snap-center aspect-square bg-cream border-2 border-ink rounded-2xl overflow-hidden relative cursor-zoom-in group/img shadow-[5px_5px_0px_0px_rgba(27,27,27,1)]"
                  >
                    <img
                      src={resolveImageUrl(img)}
                      alt={`${product.name} - ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(img);
                        setIsZoomOpen(true);
                      }}
                      className="absolute bottom-3.5 right-3.5 p-2 bg-white/95 rounded-full shadow border-2 border-ink hover:scale-105 transition-transform z-10 cursor-pointer"
                      aria-label="Zoom image"
                    >
                      <Search className="w-4 h-4 text-ink" />
                    </button>
                    {images.length > 1 && (
                      <div className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-black/60 border border-white/20 rounded-lg text-[10px] text-white font-bold select-none">
                        {idx + 1} / {images.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2: MIDDLE DETAILS & TABS (5 Cols - Internal Scroll Slider) */}
          <div className="md:col-span-5 space-y-6 md:max-h-[calc(100vh-140px)] md:overflow-y-auto pr-2 md:pr-4">
            {/* Title & Category Header */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] bg-brand-orange text-ink font-mono font-extrabold px-2.5 py-0.5 rounded-full border border-ink uppercase">
                  {product.category_name || "APPAREL"}
                </span>
                {product.sale_type && (
                  <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase border border-red-200">
                    {product.sale_type}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ink uppercase tracking-tight leading-tight">
                  {product.name}
                </h1>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: product.name,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Tautan produk berhasil disalin!");
                    }
                  }}
                  className="shrink-0 p-2 rounded-xl border-2 border-ink bg-white hover:bg-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                  aria-label="Bagikan produk"
                >
                  <Share2 className="w-4 h-4 text-ink" />
                </button>
              </div>
            </div>

            {/* Price Section */}
            <div className="p-4 bg-white border-2 border-ink rounded-2xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-brand-orange tracking-tight">
                  Rp {currentPrice.toLocaleString("id-ID")}
                </span>
                {originalPrice && originalPrice > currentPrice && (
                  <span className="text-sm font-extrabold text-red-500 line-through">
                    Rp {originalPrice.toLocaleString("id-ID")}
                  </span>
                )}
              </div>

              {user?.is_filkom_verified === 1 ? (
                <div className="text-xs font-bold text-brand-orange bg-brand-orange/10 border border-brand-orange/30 rounded-lg p-2.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
                  🎉 Selamat kamu dapat harga khusus mahasiswa FILKOM!
                </div>
              ) : product.filkom_price && Number(product.filkom_price) > 0 ? (
                <div className="text-xs font-medium text-muted-foreground bg-slate-50 border border-slate-200 rounded-lg p-2">
                  {user ? (
                    <span>
                      💡{" "}
                      <button
                        onClick={() => window.dispatchEvent(new Event("open-verification"))}
                        className="font-bold text-brand-orange hover:underline cursor-pointer"
                      >
                        Verifikasi NIM Anda
                      </button>{" "}
                      untuk klaim diskon Civitas Rp{" "}
                      {Number(product.filkom_price).toLocaleString("id-ID")}
                    </span>
                  ) : (
                    <span>
                      💡 Login &amp; verifikasi NIM untuk harga Civitas Rp{" "}
                      {Number(product.filkom_price).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Product Variant Selectors */}
            {product.product_type === "bundle" ? (
              <div className="space-y-4 border-2 border-ink p-4 rounded-2xl bg-white shadow-sm">
                <p className="font-extrabold text-ink uppercase text-xs tracking-wider">
                  Pilih Ukuran / Warna Varian Paket Bundle:
                </p>
                {product.bundle_components?.map((comp) => {
                  const selectedVar = selectedBundleVariants[comp.id];
                  const compColors = Array.from(
                    new Set(comp.variants?.map((v) => v.color).filter(Boolean)),
                  ) as string[];
                  const compSizes = Array.from(
                    new Set(comp.variants?.map((v) => v.size).filter(Boolean)),
                  ) as string[];

                  const currentSize = selectedVar?.size || "";
                  const currentColor = selectedVar?.color || null;

                  return (
                    <div
                      key={comp.id}
                      className="p-3.5 bg-cream/30 border border-ink/30 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-ink text-xs uppercase truncate">
                          {comp.name}
                        </h4>
                        {selectedVar && (
                          <span
                            className={`text-[9px] font-extrabold ${selectedVar.stock <= 3 ? "text-red-600 bg-red-50" : "text-brand-orange bg-brand-orange/10"} px-2 py-0.5 border border-ink/20 rounded`}
                          >
                            Stok: {selectedVar.stock}
                          </span>
                        )}
                      </div>

                      {/* Colors */}
                      {compColors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {compColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                const matched =
                                  comp.variants.find(
                                    (v) => v.color === color && v.size === currentSize,
                                  ) ||
                                  comp.variants.find((v) => v.color === color) ||
                                  comp.variants[0];
                                if (matched) {
                                  setSelectedBundleVariants((prev) => ({
                                    ...prev,
                                    [comp.id]: matched,
                                  }));
                                }
                              }}
                              className={`px-3 py-1 text-[11px] font-bold border-2 transition rounded-lg cursor-pointer ${
                                currentColor === color
                                  ? "bg-brand-orange text-ink border-ink scale-95"
                                  : "bg-white text-ink border-border hover:border-ink"
                              }`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sizes */}
                      {compSizes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {compSizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                const matched =
                                  comp.variants.find(
                                    (v) => v.size === size && v.color === currentColor,
                                  ) ||
                                  comp.variants.find((v) => v.size === size) ||
                                  comp.variants[0];
                                if (matched) {
                                  setSelectedBundleVariants((prev) => ({
                                    ...prev,
                                    [comp.id]: matched,
                                  }));
                                }
                              }}
                              className={`w-9 h-8 flex items-center justify-center text-[11px] font-bold border-2 transition rounded-lg cursor-pointer ${
                                currentSize === size
                                  ? "bg-brand-orange text-ink border-ink scale-95"
                                  : "bg-white text-ink border-border hover:border-ink"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 p-4 bg-white border-2 border-ink rounded-2xl shadow-sm">
                {/* Selection: Colors */}
                {colors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase text-ink">
                      Pilih Warna: <span className="text-brand-orange">{selectedColor || "-"}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-4 py-2 text-xs font-bold border-2 transition rounded-xl cursor-pointer ${
                            selectedColor === color
                              ? "bg-brand-orange text-ink border-ink shadow-sm scale-95 font-black"
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
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase text-ink">
                      Pilih Ukuran: <span className="text-brand-orange">{selectedSize || "-"}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`w-12 h-10 flex items-center justify-center text-xs font-extrabold border-2 transition rounded-xl cursor-pointer ${
                            selectedSize === size
                              ? "bg-brand-orange text-ink border-ink shadow-sm scale-95 font-black"
                              : "bg-white text-ink border-border hover:border-ink"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Selector + Stock Info */}
                <div className="space-y-2 pt-3 border-t border-border mt-3">
                  <p className="text-xs font-extrabold uppercase text-ink">Jumlah</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center border-2 border-ink rounded-xl bg-cream/20 overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 border-r-2 border-ink hover:bg-cream active:scale-95 transition-all cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 text-center text-xs font-black">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                        disabled={currentStock <= 0}
                        className="p-2 border-l-2 border-ink hover:bg-cream active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right text-xs">
                      {product.sale_type === "preorder" ? (
                        <span className="text-brand-orange font-black uppercase tracking-wider text-[11px] bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/30">
                          ⚡ Pre-Order Open
                        </span>
                      ) : (
                        <>
                          <span className="text-muted-foreground font-bold">Stok: </span>
                          <span className={currentStock <= 3 ? "text-red-600 font-black animate-pulse" : "text-ink font-black"}>
                            {currentStock}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pre-Order Banner if Preorder product */}
            {product.product_type === "preorder" && (
              <div className="p-4 bg-orange-50 border-2 border-brand-orange rounded-xl text-xs space-y-2 text-ink shadow-sm">
                <div className="flex items-center gap-2 text-brand-orange font-extrabold uppercase tracking-wider text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                  Kampanye Pre-Order Aktif
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="text-muted-foreground">Mulai PO:</span>{" "}
                    <span className="font-bold">
                      {product.preorder_start_at
                        ? new Date(product.preorder_start_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Akhir PO:</span>{" "}
                    <span className="font-bold">
                      {product.preorder_end_at
                        ? new Date(product.preorder_end_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                  {product.preorder_moq && (
                    <div>
                      <span className="text-muted-foreground">Kuota MOQ:</span>{" "}
                      <span className="font-bold">{product.preorder_moq} pcs</span>
                    </div>
                  )}
                  {product.production_eta_days && (
                    <div>
                      <span className="text-muted-foreground">Estimasi Produksi:</span>{" "}
                      <span className="font-bold">{product.production_eta_days} Hari</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TABBED CONTENT SECTION (Deskripsi | Spesifikasi | Panduan) */}
            <div className="border-2 border-ink rounded-2xl bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] mt-8">
              {/* Tab Navigation Headers */}
              <div className="flex border-b-2 border-ink bg-cream/40">
                <button
                  onClick={() => setActiveTab("detail")}
                  className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-r border-ink/20 ${
                    activeTab === "detail"
                      ? "bg-white text-brand-orange border-b-4 border-b-brand-orange font-extrabold"
                      : "text-muted-foreground hover:text-ink hover:bg-cream"
                  }`}
                >
                  Deskripsi
                </button>
                <button
                  onClick={() => setActiveTab("spesifikasi")}
                  className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-r border-ink/20 ${
                    activeTab === "spesifikasi"
                      ? "bg-white text-brand-orange border-b-4 border-b-brand-orange font-extrabold"
                      : "text-muted-foreground hover:text-ink hover:bg-cream"
                  }`}
                >
                  Spesifikasi
                </button>
                <button
                  onClick={() => setActiveTab("panduan")}
                  className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === "panduan"
                      ? "bg-white text-brand-orange border-b-4 border-b-brand-orange font-extrabold"
                      : "text-muted-foreground hover:text-ink hover:bg-cream"
                  }`}
                >
                  Panduan Ukuran
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-5 text-xs sm:text-sm space-y-4">
                {activeTab === "detail" && (
                  <div className="space-y-3 leading-relaxed text-ink font-medium whitespace-pre-line">
                    {product.description ||
                      "Merchandise resmi Fakultas Ilmu Komputer Universitas Brawijaya. Diproduksi dengan standar kualitas kain premium yang nyaman dipakai untuk aktivitas perkuliahan maupun harian."}
                  </div>
                )}

                {activeTab === "spesifikasi" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border">
                      <span className="font-extrabold text-ink uppercase text-[11px]">Bahan kain</span>
                      <span className="col-span-2 text-muted-foreground font-semibold">
                        {product.bahan || "Cotton Heavyweight 330GSM Premium"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border">
                      <span className="font-extrabold text-ink uppercase text-[11px]">Aplikasi Sablon/Bordir</span>
                      <span className="col-span-2 text-muted-foreground font-semibold">
                        {product.aplikasi || "High Precision Bordir Komputer & DTF Print"}
                      </span>
                    </div>

                  </div>
                )}

                {activeTab === "panduan" && (
                  <div className="space-y-4">
                    {product.size_chart_url ? (
                      <div className="border-2 border-ink rounded-xl overflow-hidden max-w-md bg-cream mx-auto">
                        <img
                          src={resolveImageUrl(product.size_chart_url)}
                          alt="Size Chart"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    ) : (
                      <div className="bg-cream/40 p-4 border border-ink/20 rounded-xl space-y-2">
                        <p className="font-extrabold text-ink uppercase text-xs">Chart Standar Ukuran (cm):</p>
                        <ul className="space-y-1.5 text-xs text-ink font-semibold">
                          <li className="flex justify-between py-1 border-b border-border"><span>S</span><span>Panjang 66 cm × Lebar 50 cm</span></li>
                          <li className="flex justify-between py-1 border-b border-border"><span>M</span><span>Panjang 69 cm × Lebar 53 cm</span></li>
                          <li className="flex justify-between py-1 border-b border-border"><span>L</span><span>Panjang 72 cm × Lebar 56 cm</span></li>
                          <li className="flex justify-between py-1 border-b border-border"><span>XL</span><span>Panjang 75 cm × Lebar 59 cm</span></li>
                          <li className="flex justify-between py-1"><span>XXL</span><span>Panjang 78 cm × Lebar 62 cm</span></li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 3: RIGHT STICKY CHECKOUT SIDEBAR BOX (3 Cols - Fixed Anchored) */}
          <div className="md:col-span-3 md:sticky md:top-28 self-start space-y-5">
            <div className="bg-white border-2 border-ink rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] space-y-5">

              {/* Primary Action Buttons */}
              <div className="hidden md:grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleAddToCart(false)}
                  disabled={currentStock <= 0}
                  className="py-3 px-3 bg-brand-orange hover:bg-cream text-ink font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                >
                  <ShoppingBag className="w-4 h-4" /> {currentStock <= 0 ? "Habis" : "Masuk Bag"}
                </button>
                <button
                  onClick={() => handleAddToCart(true)}
                  disabled={currentStock <= 0}
                  className="py-3 px-3 bg-ink hover:bg-ink/80 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,0.4)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Zap className="w-4 h-4" /> {currentStock <= 0 ? "Habis" : "Beli Sekarang"}
                </button>
              </div>


            </div>
          </div>
        </div>
      </main>



      {/* Lightbox / Zoom Dialog */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out select-none animate-fadeIn"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 bg-white border-2 border-ink p-2 rounded-full shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:scale-105 transition active:scale-95 z-50 cursor-pointer"
            aria-label="Close image view"
          >
            <X className="w-5 h-5 text-ink" />
          </button>
          <img
            src={activeImage}
            alt={product.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg border-2 border-white/10 shadow-2xl scale-up"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}


      {/* Size Fit Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-ink rounded-xl shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-cream border-b-2 border-ink p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-ink uppercase tracking-tight flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Kalkulator Ukuran
              </h3>
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="hover:bg-black/10 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink uppercase tracking-wider">
                    Tinggi Badan (cm)
                  </label>
                  <input
                    type="number"
                    value={userHeight}
                    onChange={(e) => setUserHeight(e.target.value)}
                    placeholder="Contoh: 170"
                    className="w-full border-2 border-ink rounded p-2.5 outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink uppercase tracking-wider">
                    Berat Badan (kg)
                  </label>
                  <input
                    type="number"
                    value={userWeight}
                    onChange={(e) => setUserWeight(e.target.value)}
                    placeholder="Contoh: 65"
                    className="w-full border-2 border-ink rounded p-2.5 outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
              </div>
              <button
                onClick={calculateSize}
                className="w-full bg-ink text-white font-bold uppercase tracking-widest py-3 border-2 border-ink hover:bg-brand-orange transition-colors active:scale-95"
              >
                Cek Ukuranku
              </button>

              {sizeRecommendation && (
                <div className="mt-6 bg-green-50 border-2 border-green-500 rounded p-4 text-center animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <p className="text-sm font-semibold text-green-800 mb-1">
                    Ukuran Terbaik Untukmu:
                  </p>
                  <div className="text-4xl font-extrabold text-green-600 tracking-tight my-2">
                    {sizeRecommendation.size}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-100 px-3 py-1 w-fit mx-auto rounded-full">
                    {sizeRecommendation.desc}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Sticky Bottom Dock for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-ink p-3 md:hidden shadow-[0_-4px_15px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleAddToCart(false)}
            disabled={currentStock <= 0}
            className="py-3 px-3 bg-brand-orange hover:bg-cream text-ink font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" /> {currentStock <= 0 ? "Habis" : "Masuk Bag"}
          </button>
          <button
            onClick={() => handleAddToCart(true)}
            disabled={currentStock <= 0}
            className="py-3 px-3 bg-ink hover:bg-ink/80 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,0.4)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4" /> {currentStock <= 0 ? "Habis" : "Beli Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
}
