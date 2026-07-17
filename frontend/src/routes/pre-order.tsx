import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ShoppingBag,
  ArrowRight,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  LogOut,
  Heart,
  Eye,
  Star,
  Check,
  Calendar,
  Lock,
  User,
  ShieldCheck,
  LayoutDashboard,
  MonitorSmartphone,
  Instagram,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { getProducts, getStoreSettings, getActivePreOrderCampaignServerAction, type ProductWithVariants, type PreOrderCampaign } from "@backend/server-actions";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { isProductVisibleToUser } from "@/lib/pre-order-utils";
import { PreOrderNotOpenPlaceholder } from "@/components/PreOrderNotOpenPlaceholder";
import { resolveImageUrl } from "@/lib/image-resolver";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { extractLegacyConfigFromSegments } from "@/lib/homepage-types";
import pVarsity from "@/assets/p-varsity.jpg";
import pHoodie from "@/assets/p-hoodie.jpg";
import pTshirt from "@/assets/p-tshirt.jpg";
import pCap from "@/assets/p-cap.jpg";
import pTote from "@/assets/p-tote.jpg";

export const Route = createFileRoute("/pre-order")({
  loader: async () => {
    const [productsRes, settingsRes] = await Promise.all([getProducts(), getStoreSettings()]);
    return {
      products: productsRes.products || [],
      settings: settingsRes.settings || null,
    };
  },
  head: () => ({
    meta: [
      { title: "Pre-Order Terkini — FILKOM Merch UB" },
      {
        name: "description",
        content:
          "Koleksi merchandise pre-order mahasiswa FILKOM UB. Jangan lewatkan drop terbatas ini.",
      },
    ],
  }),
  component: PreOrderPage,
});

const NAV = [
  { label: "BERANDA", href: "/", isScroll: true, target: "top" },
  { label: "PRODUK", href: "/products" },
  { label: "PRE-ORDER", href: "/pre-order" },
  { label: "TENTANG KAMI", href: "/#about", isScroll: true, target: "about" },
  { label: "FAQ", href: "/faq" },
];

type CartItem = {
  id: string;
  name: string;
  price: string;
  img: string;
  qty: number;
  product_id?: number;
  variant_id?: number;
  size?: string;
  color?: string;
  image_url?: string;
};

// Reusable Countdown Timer Component (Vibrant Light Mode)
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return <div className="h-14 animate-pulse bg-brand-orange/20 rounded-xl w-[260px]" />;

  return (
    <div className="flex gap-2 sm:gap-3 text-center font-mono select-none">
      <div className="bg-background text-ink p-2.5 sm:p-3.5 rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] min-w-[58px] sm:min-w-[76px]">
        <span className="display text-xl sm:text-3xl block leading-none font-black text-ink">
          {String(timeLeft.days).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] tracking-widest uppercase text-brand-orange font-bold mt-1 block">
          HARI
        </span>
      </div>
      <div className="display text-xl sm:text-3xl text-ink flex items-center font-black">:</div>
      <div className="bg-background text-ink p-2.5 sm:p-3.5 rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] min-w-[58px] sm:min-w-[76px]">
        <span className="display text-xl sm:text-3xl block leading-none font-black text-ink">
          {String(timeLeft.hours).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] tracking-widest uppercase text-brand-orange font-bold mt-1 block">
          JAM
        </span>
      </div>
      <div className="display text-xl sm:text-3xl text-ink flex items-center font-black">:</div>
      <div className="bg-background text-ink p-2.5 sm:p-3.5 rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] min-w-[58px] sm:min-w-[76px]">
        <span className="display text-xl sm:text-3xl block leading-none font-black text-ink">
          {String(timeLeft.minutes).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] tracking-widest uppercase text-brand-orange font-bold mt-1 block">
          MENIT
        </span>
      </div>
      <div className="display text-xl sm:text-3xl text-ink flex items-center font-black">:</div>
      <div className="bg-brand-orange text-cream p-2.5 sm:p-3.5 rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] min-w-[58px] sm:min-w-[76px]">
        <span className="display text-xl sm:text-3xl block leading-none font-black text-cream">
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
        <span className="text-[8px] sm:text-[9px] tracking-widest uppercase text-cream/90 font-bold mt-1 block">
          DETIK
        </span>
      </div>
    </div>
  );
}

function getPoPhaseInfo(campaign: PreOrderCampaign | null) {
  if (!campaign || Number(campaign.is_active) !== 1) return null;

  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = new Date(campaign.end_date);
  const ext = campaign.extended_end_date ? new Date(campaign.extended_end_date) : null;

  if (now < start) {
    return {
      label: "PRE-ORDER AKAN DIBUKA DALAM",
      targetDate: campaign.start_date,
      batchName: campaign.batch_name,
      phase: "UPCOMING",
    };
  }

  if (now >= start && now < end) {
    return {
      label: "PRE-ORDER AKAN BERAKHIR DALAM",
      targetDate: campaign.end_date,
      batchName: campaign.batch_name,
      phase: "ACTIVE",
    };
  }

  if (ext && now >= end && now < ext) {
    return {
      label: "PRE-ORDER AKAN SEGERA DITUTUP DALAM",
      targetDate: campaign.extended_end_date!,
      batchName: campaign.batch_name,
      phase: "EXTENDED",
    };
  }

  return null;
}

function PreOrderPage() {
  const { products: dbProducts, settings } = Route.useLoaderData();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: activePoRes } = useQuery({
    queryKey: ["activePreOrderCampaign"],
    queryFn: () => getActivePreOrderCampaignServerAction(),
    staleTime: 30 * 1000,
  });
  const activePoCampaign = activePoRes?.data || null;
  const poInfo = useMemo(() => getPoPhaseInfo(activePoCampaign), [activePoCampaign]);
  const canSeeProducts = useMemo(
    () => isProductVisibleToUser(user, activePoCampaign),
    [user, activePoCampaign]
  );

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [pathname, setPathname] = useState("");
  useEffect(() => setPathname(window.location.pathname), []);
  const search = typeof window !== "undefined" ? window.location.search : "";

  // Load wishlist and cart from localStorage
  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem("wishlist");
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
      const savedCart = localStorage.getItem("cart");
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (e) {}
  }, []);

  const [query, setQuery] = useState("");

  // Layout configurations defaults
  const layout = useMemo(() => {
    const defaults = {
      marqueeText:
        "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN | 100% PRODUK MAHASISWA",
      limitedTitle: "Varsity FILKOM Edition",
      limitedSubtitle:
        "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
      limitedProductSlug: "varsity-filkom",
      limitedCountdownEnd: "2026-07-10T23:59:59+07:00",
      limitedStockMax: 100,
      limitedStockCurrent: 82,
    };

    if (!settings?.homepage_layout) return defaults;
    try {
      const parsed = JSON.parse(settings.homepage_layout);
      const extracted = extractLegacyConfigFromSegments(parsed);
      return { ...defaults, ...extracted };
    } catch {
      return defaults;
    }
  }, [settings]);

  // Format products lists
  const products = useMemo(() => {
    const list = dbProducts.length > 0 ? dbProducts : [];
    return list.map((product: ProductWithVariants) => {
      const productName = product.name.toLowerCase();
      const cat =
        product.category_id === 2
          ? "ACCESSORIES"
          : productName.includes("hood")
            ? "HOODIE"
            : productName.includes("varsity") || productName.includes("jacket")
              ? "JACKET"
              : productName.includes("tee") || productName.includes("shirt")
                ? "TEE"
                : "ACCESSORIES";

      return {
        id: product.slug || `product-${product.id}`,
        img: product.image_url || pVarsity,
        name: product.name,
        price: `Rp ${product.price.toLocaleString("id-ID")}`,
        was: product.original_price
          ? `Rp ${product.original_price.toLocaleString("id-ID")}`
          : undefined,
        tag: product.is_best_seller
          ? "BEST SELLER"
          : product.is_limited
            ? "LIMITED"
            : product.sale_type === "pre_order"
              ? "PRE-ORDER"
              : "NEW",
        cat,
        product_id: product.id,
        sale_type: product.sale_type,
        product_type: product.product_type,
        variants: product.variants || [],
        category_name: product.category_name,
        category_slug: product.category_slug,
      };
    });
  }, [dbProducts]);

  // Filter only PRE-ORDER items (No dummy data!)
  const preOrderProducts = useMemo(() => {
    return products.filter((p) => p.sale_type === "pre_order");
  }, [products]);

  // Active filtered list
  const filteredPreOrders = useMemo(() => {
    if (!query.trim()) return preOrderProducts;
    const q = query.toLowerCase();
    return preOrderProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q),
    );
  }, [query, preOrderProducts]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("wishlist", JSON.stringify(next));
      if (next.includes(id)) {
        toast.success("Added to wishlist");
      } else {
        toast.info("Removed from wishlist");
      }
      return next;
    });
  };

  const getProductAvailableSizes = (p: any) => {
    if (!p.variants || p.variants.length === 0) return [];
    if (
      p.variants.length === 1 &&
      (p.variants[0].size.toLowerCase() === "all size" ||
        p.variants[0].size.toLowerCase() === "one size")
    ) {
      return [];
    }
    return p.variants.filter((v: any) => (v.stock || 0) > 0).map((v: any) => v.size);
  };

  const addToCart = useCallback((p: any, selectedSize?: string) => {
    const variants = p.variants || [];
    const sizeToUse = selectedSize || variants[0]?.size || "One Size";
    const matchingVariant = variants.find((v: any) => v.size === sizeToUse) || variants[0];

    const itemId = selectedSize ? `${p.id}-${selectedSize}` : p.id;
    const itemName = selectedSize ? `${p.name} — ${selectedSize}` : p.name;

    let currentCart: any[] = [];
    try {
      const saved = localStorage.getItem("indexCart");
      if (saved) currentCart = JSON.parse(saved);
    } catch (e) {}

    const existingIdx = currentCart.findIndex((i) => i.id === itemId);
    if (existingIdx !== -1) {
      currentCart[existingIdx].qty += 1;
    } else {
      currentCart.push({
        id: itemId,
        name:
          itemId.includes("varsity-filkom") || itemId.includes("varsity-jacket")
            ? `${itemName} — Default`
            : itemName,
        price: p.price,
        img: p.img,
        qty: 1,
        product_id: p.product_id,
        variant_id: matchingVariant ? matchingVariant.id : undefined,
        size: sizeToUse,
        color: "Default",
      });
    }

    localStorage.setItem("indexCart", JSON.stringify(currentCart));
    window.dispatchEvent(new Event("cart-updated"));
    window.dispatchEvent(new Event("open-cart"));
    toast.success("Added to bag", { description: itemName });
  }, []);

  function parsePrice(p: any): number {
    if (typeof p === "number") return p;
    if (!p) return 0;
    return Number(String(p).replace(/[^0-9]/g, "")) || 0;
  }

  function formatRp(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Navbar />

      {/* Hero Countdown Section (Compact Vibrant Light Mode) */}
      <section className="bg-cream text-ink py-6 sm:py-8 border-b-2 border-ink text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ff6b00_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-15 pointer-events-none" />
        <div className="max-w-3xl px-5 space-y-4 relative z-10 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-brand-orange text-cream font-mono font-extrabold text-[10px] tracking-widest px-3.5 py-1 rounded-full uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] border-2 border-ink">
            <span className="w-2 h-2 rounded-full bg-cream animate-ping" />
            ⏱ Pre-Order
          </div>

          <h1 className="display text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase leading-none tracking-wide text-ink">
            {poInfo ? poInfo.batchName : "Pre-Order Terkini"}
          </h1>

          <p className="text-ink/80 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-semibold">
            Katalog merchandise edisi terbatas dengan skema harga spesial early-bird.
          </p>

          <div className="flex justify-center pt-1 pb-1">
            <div className="p-3.5 sm:p-4 rounded-xl bg-background border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] flex flex-col items-center gap-2.5">
              <div className="text-[10px] sm:text-xs font-mono font-extrabold tracking-widest text-brand-orange uppercase bg-brand-orange/10 border border-brand-orange/30 px-3 py-1 rounded-md">
                🔥 {poInfo ? poInfo.label.toUpperCase() : "PRE-ORDER AKAN DIBUKA DALAM"}
              </div>
              <CountdownTimer targetDate={poInfo ? poInfo.targetDate : layout.limitedCountdownEnd} />
            </div>
          </div>
        </div>
      </section>

      {/* Product list */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="text-xs tracking-[0.3em] text-brand-orange font-bold mb-2 uppercase">
              {poInfo ? `${poInfo.batchName.toUpperCase()} CATALOG` : "PRE-ORDER BATCH CATALOG"}
            </div>
            <h2 className="display text-2xl sm:text-4xl text-ink font-bold uppercase">
              Pre-order items.
            </h2>
          </div>
          <div className="flex border-2 border-ink rounded px-3 py-2 bg-cream max-w-xs items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari pre-order…"
              className="bg-transparent outline-none text-xs w-full text-ink"
            />
          </div>
        </div>

        <div className="bg-brand-orange text-cream font-bold text-center py-4 px-5 rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] mb-10 border-2 border-ink uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2">
          <Star className="w-5 h-5 fill-cream shrink-0" />
          <span>PERHATIAN: HARGA PRE-ORDER ADALAH HARGA TERMURAH SPECIAL EARLY BIRD SEBELUM KEMBALI NORMAL ON-SALE!</span>
          <Star className="w-5 h-5 fill-cream shrink-0" />
        </div>

        {filteredPreOrders.length === 0 ? (
          <div className="text-center py-16 px-6 border-2 border-dashed border-ink/30 rounded-2xl bg-cream/30 space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 bg-brand-orange/20 text-brand-orange rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-ink uppercase">Belum Ada Produk Pre-Order</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Saat ini belum ada item merchandise yang terdaftar pada batch pre-order ini. Silakan cek kembali dalam waktu dekat atau jelajahi katalog ready stock kami.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-ink text-cream font-bold text-xs px-5 py-3 rounded-lg hover:bg-brand-orange transition-colors uppercase"
            >
              Lihat Katalog Ready Stock
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : !canSeeProducts ? (
          <div className="py-8">
            <PreOrderNotOpenPlaceholder campaign={activePoCampaign} />
          </div>
        ) : (
          <div className="space-y-16">
            {/* 1. SEGMEN OUR MAIN HERO (Full Width Container) */}
            {(() => {
              const heroProducts = filteredPreOrders.filter((p) => {
                const catName = (p.category_name || "").toLowerCase();
                const catSlug = (p.category_slug || "").toLowerCase();
                return (
                  p.product_type !== "bundle" &&
                  (catName === "main hero" || catSlug === "main-hero")
                );
              });
              if (heroProducts.length === 0) return null;

              return (
                <section id="main-hero" className="scroll-mt-32 bg-ink text-cream px-6 sm:px-10 py-12 rounded-3xl border-2 border-ink shadow-[8px_8px_0px_0px_rgba(255,107,0,1)] w-full">
                  <div className="flex flex-col items-center text-center mb-8 gap-1">
                    <div className="text-[11px] tracking-[0.35em] text-brand-orange font-extrabold uppercase">
                      01 — CAMPAIGN PRE-ORDER
                    </div>
                    <h2 className="display text-3xl sm:text-5xl text-cream font-bold uppercase tracking-wide">
                      OUR MAIN HERO
                    </h2>
                  </div>

                  <div className="flex flex-wrap justify-center items-stretch gap-6 max-w-full mx-auto">
                    {heroProducts.map((p) => (
                      <div
                        key={p.id}
                        className="group flex flex-col border-2 border-ink bg-neutral-900 rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(255,107,0,1)] hover:translate-y-[-2px] transition-all duration-300 w-full sm:w-[280px] md:w-[310px] shrink-0"
                      >
                        <Link
                          to="/product/$slug"
                          params={{ slug: p.id }}
                          className="relative w-full aspect-square border-b-2 border-ink bg-neutral-950 overflow-hidden block"
                        >
                          <img
                            src={resolveImageUrl(p.img)}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                            {p.tag && (
                              <span className="text-[9px] font-black tracking-wider px-2 py-0.5 bg-brand-orange text-ink rounded-full border border-ink shadow-xs uppercase">
                                {p.tag}
                              </span>
                            )}
                          </div>
                        </Link>

                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="text-[9px] font-extrabold tracking-widest text-brand-orange uppercase mb-0.5">
                              {p.cat || "MAIN HERO"}
                            </div>
                            <Link
                              to="/product/$slug"
                              params={{ slug: p.id }}
                              className="hover:text-brand-orange transition-colors"
                            >
                              <h3 className="font-extrabold text-sm sm:text-base text-white uppercase tracking-wide leading-tight group-hover:text-brand-orange transition-colors line-clamp-1">
                                {p.name}
                              </h3>
                            </Link>

                            <div className="flex items-baseline justify-between gap-1 mt-3 pt-2.5 border-t border-neutral-800">
                              <div>
                                <span className="text-base sm:text-lg font-black text-brand-orange tracking-tight">
                                  {p.price}
                                </span>
                                {p.was && (
                                  <span className="ml-1.5 text-[11px] font-bold text-red-500 line-through">
                                    {p.was}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] font-bold tracking-widest text-brand-orange bg-brand-orange/10 border border-brand-orange/30 px-2 py-0.5 rounded uppercase">
                                HERO
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-neutral-800 flex gap-2">
                            <button
                              onClick={() => addToCart(p)}
                              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold tracking-wider text-[10px] py-2 px-2 rounded-lg border border-neutral-600 shadow-[1px_1px_0px_0px_rgba(255,255,255,0.7)] transition-all uppercase cursor-pointer flex items-center justify-center gap-1"
                            >
                              <ShoppingBag className="w-3 h-3 text-brand-orange" />
                              BAG
                            </button>

                            <Link
                              to="/product/$slug"
                              params={{ slug: p.id }}
                              className="flex-1 bg-brand-orange hover:bg-cream text-ink hover:text-ink font-extrabold tracking-wider text-[10px] py-2 px-2 rounded-lg border border-ink shadow-[1px_1px_0px_0px_rgba(255,255,255,0.7)] transition-all uppercase cursor-pointer flex items-center justify-center gap-1 text-center"
                            >
                              PESAN <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* 2. SEGMEN EXECUTIVE BUNDLES (Matches Category = Bundle OR Format = Bundle + Pre-Order) */}
            {(() => {
              const bundleProducts = filteredPreOrders.filter(
                (p) =>
                  p.sale_type === "pre_order" &&
                  (p.cat?.toUpperCase() === "BUNDLE" || p.product_type === "bundle")
              );
              if (bundleProducts.length === 0) return null;

              return (
                <section id="exclusive-bundles" className="scroll-mt-32 space-y-6 w-full">
                  <div className="flex flex-col items-center text-center mb-6 gap-1">
                    <div className="text-[11px] tracking-[0.35em] text-brand-orange font-extrabold uppercase">
                      02 — SPECIAL VALUE PACK
                    </div>
                    <h2 className="display text-3xl sm:text-5xl text-ink font-bold uppercase tracking-wide">
                      EXCLUSIVE BUNDLES
                    </h2>
                  </div>

                  <div className="flex flex-wrap justify-center items-stretch gap-6 max-w-full mx-auto">
                    {bundleProducts.map((p) => (
                      <div
                        key={p.id}
                        className="group flex flex-col border-2 border-ink bg-cream rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-y-[-2px] transition-all duration-300 w-full sm:w-[320px] md:w-[350px] shrink-0"
                      >
                        <div className="aspect-square bg-secondary relative overflow-hidden border-b-2 border-ink">
                          <img
                            src={resolveImageUrl(p.img)}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <span className="absolute top-2 left-2 bg-brand-orange text-cream text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full border border-ink uppercase">
                            BUNDLE
                          </span>
                        </div>

                        <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                          <div>
                            <div className="text-[9px] font-bold text-brand-orange tracking-widest uppercase mb-0.5">
                              PAKET HEMAT BATCH
                            </div>
                            <h4 className="text-sm sm:text-base font-extrabold text-ink uppercase tracking-wide line-clamp-1">
                              {p.name}
                            </h4>
                          </div>

                          <div className="pt-2.5 border-t border-ink/10 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-base sm:text-lg font-black text-ink">{p.price}</span>
                              {p.was && (
                                <span className="ml-1.5 text-[10px] text-muted-foreground line-through font-bold">
                                  {p.was}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => addToCart(p)}
                              className="bg-ink text-cream hover:bg-brand-orange font-extrabold text-[10px] py-2 px-3 rounded-lg border border-ink transition-colors uppercase flex items-center gap-1 cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)]"
                            >
                              <ShoppingBag className="w-3 h-3" /> + BAG
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}

            {/* 3. SEGMEN SEMUA KATALOG PRODUK PRE-ORDER (Full Width Grid) */}
            <section id="all-products" className="scroll-mt-32 space-y-6 w-full">
              <div className="flex flex-col items-center text-center mb-6 gap-1">
                <div className="text-[11px] tracking-[0.35em] text-brand-orange font-extrabold uppercase">
                  03 — ALL PRODUCTS
                </div>
                <h2 className="display text-3xl sm:text-5xl text-ink font-bold uppercase tracking-wide">
                  ALL PRE-ORDER PRODUCTS
                </h2>
              </div>

              <div className="flex flex-wrap justify-center items-stretch gap-4 max-w-full mx-auto">
                {filteredPreOrders.map((p) => (
                  <div
                    key={p.id}
                    className="group flex flex-col border-2 border-ink bg-cream rounded-lg overflow-hidden shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:translate-y-[-2px] transition-all duration-300 w-[calc(50%-8px)] sm:w-[200px] md:w-[230px] shrink-0"
                  >
                    <Link
                      to="/product/$slug"
                      params={{ slug: p.id }}
                      className="relative aspect-square overflow-hidden block border-b-2 border-ink bg-secondary"
                    >
                      <img
                        src={resolveImageUrl(p.img)}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <span className="absolute top-2 left-2 text-[8px] font-bold tracking-widest px-2 py-0.5 bg-brand-orange text-cream rounded-full uppercase border border-ink shadow-xs">
                        PO
                      </span>
                    </Link>

                    <div className="p-3 flex flex-col flex-1">
                      <div className="text-[9px] font-bold tracking-widest text-brand-orange uppercase mb-0.5">
                        {p.cat}
                      </div>
                      <Link
                        to="/product/$slug"
                        params={{ slug: p.id }}
                        className="hover:text-brand-orange transition-colors"
                      >
                        <h3 className="text-xs font-bold text-ink leading-snug tracking-wide line-clamp-1 mb-1.5">
                          {p.name}
                        </h3>
                      </Link>

                      <div className="mt-auto pt-2 border-t border-ink/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-ink">{p.price}</span>
                          {p.was && (
                            <span className="block text-[9px] text-muted-foreground line-through font-bold">
                              {p.was}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => addToCart(p)}
                          className="p-1.5 rounded bg-ink text-cream hover:bg-brand-orange transition-colors border border-ink cursor-pointer shadow-xs"
                          title="Tambah ke bag"
                        >
                          <ShoppingBag className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>

      {/* Floating Right Side Bookmark Navigation Widget (Mobile & Desktop) */}
      <aside className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 bg-background/95 backdrop-blur-md p-1.5 sm:p-2.5 rounded-2xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
        <a
          href="#main-hero"
          className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 border-ink bg-brand-orange text-cream hover:bg-cream hover:text-ink hover:scale-105 transition-all text-[10px] sm:text-[11px] font-black tracking-wider uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
          title="Ke Main Hero Drop"
        >
          <Sparkles className="w-3.5 h-3.5 fill-cream group-hover:fill-ink shrink-0" />
          <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden">
            01 MAIN HERO
          </span>
          <span className="group-hover:hidden">01</span>
        </a>
        <a
          href="#exclusive-bundles"
          className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 border-ink bg-brand-blue text-cream hover:bg-cream hover:text-ink hover:scale-105 transition-all text-[10px] sm:text-[11px] font-black tracking-wider uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
          title="Ke Executive Bundles"
        >
          <PackageCheck className="w-3.5 h-3.5 text-cream group-hover:text-ink shrink-0" />
          <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden">
            02 BUNDLES
          </span>
          <span className="group-hover:hidden">02</span>
        </a>
        <a
          href="#all-products"
          className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 border-ink bg-ink text-cream hover:bg-brand-orange hover:text-cream hover:scale-105 transition-all text-[10px] sm:text-[11px] font-black tracking-wider uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
          title="Ke Semua Produk Pre-Order"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-cream shrink-0" />
          <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden">
            03 ALL PRODUCTS
          </span>
          <span className="group-hover:hidden">03</span>
        </a>
      </aside>

      <Footer />



      {/* Quick View Dialog */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setQuickViewProduct(null)} />
          <div className="relative bg-background border-4 border-ink rounded-lg w-full max-w-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 z-10 animate-scale-in">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 p-2 rounded border-2 border-ink bg-cream text-ink"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full md:w-1/2 aspect-[4/5] bg-secondary border border-ink/20 rounded overflow-hidden">
              <img src={quickViewProduct.img} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="w-full md:w-1/2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-brand-orange uppercase">
                  {quickViewProduct.cat}
                </span>
                <h3 className="display text-xl sm:text-2xl text-ink font-bold uppercase mt-1">
                  {quickViewProduct.name}
                </h3>
                <p className="text-sm font-bold text-ink mt-2">{quickViewProduct.price}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-4">
                  Koleksi merchandise pre-order resmi dengan material cotton fleece pilihan, tebal,
                  adem, jahitan kokoh.
                </p>
              </div>
              <button
                onClick={() => {
                  addToCart(quickViewProduct);
                  setQuickViewProduct(null);
                }}
                className="w-full bg-ink text-cream py-3.5 text-xs font-bold tracking-widest hover:bg-brand-orange uppercase mt-6"
              >
                ADD TO BAG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
