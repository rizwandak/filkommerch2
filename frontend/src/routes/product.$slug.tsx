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
  Heart,
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
  const [isWishlisted, setIsWishlisted] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink">
      {/* Header */}
      <Navbar />

      {/* Main product box */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white border-2 border-ink rounded-xl shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] overflow-hidden grid md:grid-cols-12">
          {/* LEFT: Image gallery (5 cols) */}
          <div className="md:col-span-6 p-6 border-b-2 md:border-b-0 md:border-r-2 border-ink flex flex-col justify-between">
            <div
              onClick={() => setIsZoomOpen(true)}
              className="aspect-[4/5] bg-cream border-2 border-ink rounded-lg overflow-hidden relative cursor-zoom-in group/img"
            >
              <img
                src={resolveImageUrl(activeImage)}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWishlisted(!isWishlisted);
                  toast.success(isWishlisted ? "Dihapus dari wishlist" : "Ditambahkan ke wishlist");
                }}
                className="absolute top-4 right-4 p-2.5 bg-white/95 rounded-full shadow border border-ink hover:scale-105 transition-transform z-10"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : ""}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomOpen(true);
                }}
                className="absolute bottom-4 right-4 p-2 bg-white/95 rounded-full shadow border border-ink hover:scale-105 transition-transform z-10"
                aria-label="Zoom image"
              >
                <Search className="w-4 h-4 text-ink" />
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
                  <img src={resolveImageUrl(img)} alt="thumb" className="w-full h-full object-cover" />
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

              <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-extrabold text-ink tracking-tight">
                  Rp {currentPrice.toLocaleString("id-ID")}
                </span>
                {originalPrice && originalPrice > currentPrice && (
                  <span className="text-sm font-semibold text-muted-foreground line-through decoration-red-500">
                    Rp {originalPrice.toLocaleString("id-ID")}
                  </span>
                )}
                {product.sale_type && (
                  <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded tracking-wide uppercase">
                    {product.sale_type}
                  </span>
                )}
              </div>

              {user?.is_filkom_verified === 1 ? (
                <div className="mt-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded px-2.5 py-1.5 w-fit flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  🎉 Harga Khusus Civitas FILKOM Aktif!
                </div>
              ) : product.filkom_price && Number(product.filkom_price) > 0 ? (
                <div className="mt-2 text-xs font-medium text-muted-foreground bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 w-fit">
                  {user ? (
                    <span>
                      💡{" "}
                      <button
                        onClick={() => window.dispatchEvent(new Event("open-verification"))}
                        className="font-bold text-brand-orange hover:underline cursor-pointer"
                      >
                        Verifikasi NIM Anda
                      </button>{" "}
                      untuk mendapatkan harga khusus FILKOM Rp{" "}
                      {Number(product.filkom_price).toLocaleString("id-ID")}
                    </span>
                  ) : (
                    <span>
                      💡 Login & verifikasi NIM untuk mendapatkan harga khusus FILKOM Rp{" "}
                      {Number(product.filkom_price).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
              ) : null}

              {product.product_type === "bundle" &&
                product.bundle_components &&
                product.bundle_components.length > 0 && (
                  <div className="p-4 bg-brand-blue/5 border-2 border-brand-blue/30 rounded-xl space-y-2 mt-4">
                    <h4 className="font-extrabold text-brand-blue text-xs uppercase tracking-wider flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-brand-blue animate-pulse" />
                      Isi Paket Bundling (Komponen Produk):
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {product.bundle_components.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex gap-2 p-2 bg-white border border-border rounded-lg shadow-sm items-center"
                        >
                          {comp.image_url ? (
                            <img
                              src={resolveImageUrl(comp.image_url)}
                              alt={comp.name}
                              className="w-10 h-10 object-cover rounded border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-cream rounded border border-border flex items-center justify-center text-[9px] text-muted-foreground shrink-0 font-bold">
                              No Image
                            </div>
                          )}
                          <p className="font-bold text-ink uppercase tracking-tight text-[11px] truncate">
                            {comp.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {product.product_type === "preorder" && (
                <div className="mt-4 p-4 bg-orange-50 border-2 border-brand-orange rounded-lg text-xs space-y-2 text-ink shadow-[2px_2px_0px_0px_rgba(242,87,33,0.15)]">
                  <div className="flex items-center gap-2 text-brand-orange font-bold uppercase tracking-wider text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                    Pre-Order Active
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

              {/* Selection: Colors & Sizes for Bundle Components OR Normal Product */}
              {product.product_type === "bundle" ? (
                <div className="mt-6 space-y-5 border-t border-border pt-4">
                  <p className="font-extrabold text-ink uppercase text-xs tracking-wider">
                    Pilih Ukuran / Warna Varian Paket:
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
                        className="p-4 bg-cream/20 border-2 border-ink rounded-lg space-y-3.5 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-ink text-xs uppercase tracking-tight">
                            {comp.name}
                          </h4>
                          {selectedVar && (
                            <span
                              className={`text-[9px] font-bold ${selectedVar.stock <= 3 ? "text-red-600 bg-red-50 border-red-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"} px-2 py-0.5 border rounded`}
                            >
                              Stok: {selectedVar.stock} pcs
                            </span>
                          )}
                        </div>

                        {/* Colors Selector */}
                        {compColors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                              Warna
                            </p>
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
                                  className={`px-3 py-1 text-[11px] font-semibold border-2 transition rounded ${
                                    currentColor === color
                                      ? "bg-ink text-white border-ink scale-95"
                                      : "bg-white text-ink border-border hover:border-ink"
                                  }`}
                                >
                                  {color}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sizes Selector */}
                        {compSizes.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                              Ukuran
                            </p>
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
                                  className={`w-9 h-8 flex items-center justify-center text-[11px] font-bold border-2 transition rounded ${
                                    currentSize === size
                                      ? "bg-ink text-white border-ink scale-95"
                                      : "bg-white text-ink border-border hover:border-ink"
                                  }`}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
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
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Pilih Ukuran:{" "}
                          <span className="text-ink font-extrabold">{selectedSize || "-"}</span>
                        </p>
                        <button
                          onClick={() => setIsSizeGuideOpen(true)}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                          </svg>
                          Cari Ukuranmu
                        </button>
                      </div>
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
                </>
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

            {/* FOMO Stock Indicator */}
            {currentStock > 0 && currentStock <= 5 && (
              <div className="mt-6 p-3 bg-red-50 border-2 border-red-500 rounded flex items-center gap-2 animate-pulse">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <p className="text-sm font-extrabold text-red-600 tracking-tight">
                  Hurry up! Sisa stok tinggal {currentStock} pcs lagi di ukuran ini!
                </p>
              </div>
            )}

            {/* Action Buttons */}
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
                      src={resolveImageUrl(product.size_chart_url)}
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

          {/* Lookbook / Gallery Box */}
          <div className="mt-8 bg-white border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
              <h2 className="text-lg font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Dipakai Sama Siapa?
              </h2>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline-block">
                On-Model Gallery
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                pVarsity,
                pHoodie,
                pTshirt,
                pTee2,
              ].map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-[4/5] bg-cream border-2 border-ink rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => {
                    setActiveImage(img);
                    setIsZoomOpen(true);
                  }}
                >
                  <img
                    src={resolveImageUrl(img)}
                    alt={`Lookbook ${idx + 1}`}
                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/10 transition-colors" />
                  <div className="absolute bottom-2 left-2 bg-white border-2 border-ink text-ink text-[10px] font-extrabold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                    LIHAT
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs font-medium text-muted-foreground mt-4 text-center">
              *Foto ini adalah contoh (dummy). Nantinya akan diisi dengan foto asli mahasiswa FILKOM
              yang memakai merch ini.
            </p>
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
    </div>
  );
}
