import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Search,
  User,
  ShoppingBag,
  Instagram,
  Facebook,
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
  HelpCircle,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  LayoutDashboard,
  MonitorSmartphone,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getProducts, getStoreSettings, getCategories, getActivePreOrderCampaignServerAction, type ProductWithVariants } from "@backend/server-actions";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { isProductVisibleToUser } from "@/lib/pre-order-utils";
import { PreOrderNotOpenPlaceholder } from "@/components/PreOrderNotOpenPlaceholder";
import {
  type HomepageSegment,
  convertLegacyToSegments,
  getDefaultSegments,
  extractLegacyConfigFromSegments,
} from "@/lib/homepage-types";
import { Carousel, CarouselContent, CarouselItem } from "@frontend/components/ui/carousel";
import type { CarouselApi } from "@frontend/components/ui/carousel";
import { resolveImageUrl } from "@/lib/image-resolver";

import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";
import hero from "@/assets/hero.jpg";
import pTshirt from "@/assets/p-tshirt.jpg";
import pHoodie from "@/assets/p-hoodie.jpg";
import pVarsity from "@/assets/p-varsity.jpg";
import pTote from "@/assets/p-tote.jpg";
import pCap from "@/assets/p-cap.jpg";
import pTee2 from "@/assets/p-tee2.jpg";
import about from "@/assets/about.jpg";
import varsityEdutech from "@/assets/varsityedutech.png";
import workJacket from "@/assets/workjacket.png";
import baraSmile from "@/assets/bara-smile.png";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [productsRes, settingsRes, categoriesRes] = await Promise.all([
      getProducts(),
      getStoreSettings(),
      getCategories(),
    ]);

    const dbProducts = productsRes.products || [];
    const settings = settingsRes.settings || null;

    const formattedProducts: ProductCard[] = dbProducts.map((product: ProductWithVariants) => {
      const productName = product.name.toLowerCase();
      const cat: Filter =
        product.category_slug === "bundle" || product.category_slug === "bundles" || product.product_type === "bundle"
          ? "BUNDLE"
          : product.category_id === 2
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
          : null,
        tag: product.is_best_seller
          ? "BEST SELLER"
          : product.is_limited
            ? "LIMITED"
            : product.sale_type === "pre_order"
              ? "PRE-ORDER"
              : "NEW",
        cat,
        product_id: product.id,
        is_best_seller: Boolean(product.is_best_seller),
        is_limited: Boolean(product.is_limited),
        is_featured: Boolean(product.is_featured),
        sale_type: product.sale_type || null,
        variants: product.variants || [],
        description: product.description || null,
        category_id: product.category_id || null,
        category_slug: product.category_slug || null,
        product_type: product.product_type || null,
        bundle_components: product.bundle_components || [],
        rawPrice: product.price || 0,
        rawOriginalPrice: product.original_price || null,
        filkom_price: (product as any).filkom_price || null,
        promo_price: (product as any).promo_price || null,
      };
    });

    return { products: formattedProducts, settings, categories: categoriesRes.categories || [] };
  },
  head: () => ({
    meta: [
      { title: "FILKOM Merch UB — Official Store" },
      {
        name: "description",
        content:
          "Official merchandise mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya. Jaket varsity, hoodie ngoding, kaos debugging, dan lanyard premium.",
      },
      { property: "og:title", content: "FILKOM Merch UB — Official Store" },
      {
        property: "og:description",
        content:
          "Official merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya. Dapatkan merchandise premium bergaransi.",
      },
      { property: "og:image", content: logo },
    ],
    links: [
      { rel: "icon", href: logo },
      { rel: "shortcut icon", href: logo },
    ],
  }),
  component: Index,
});

const NAV = [
  { label: "BERANDA", href: "/", isScroll: true, target: "top" },
  { label: "PRODUK", href: "/products" },
  { label: "PRE-ORDER", href: "/pre-order" },
  { label: "TENTANG KAMI", href: "/#about", isScroll: true, target: "about" },
  { label: "FAQ", href: "/faq" },
];

const FILTERS = ["ALL", "JACKET", "HOODIE", "TEE", "ACCESSORIES", "BUNDLE"] as const;
type Filter = (typeof FILTERS)[number];

type ProductCard = {
  id: string;
  img: string;
  name: string;
  price: string;
  was?: string | null;
  tag?: string;
  cat: Filter;
  product_id?: number;
  is_best_seller?: boolean;
  is_limited?: boolean;
  is_featured?: boolean;
  sale_type?: string | null;
  variants?: any[];
  description?: string | null;
  category_id?: number | null;
  category_slug?: string | null;
  product_type?: string | null;
  bundle_components?: any[];
  rawPrice?: number;
  rawOriginalPrice?: number | null;
  filkom_price?: number | null;
  promo_price?: number | null;
};

const FALLBACK_PRODUCTS: ProductCard[] = [
  {
    id: "varsity-jacket",
    img: pVarsity,
    name: "Varsity Jacket — Filkom '25",
    price: "Rp 450.000",
    was: "Rp 525.000",
    tag: "BEST SELLER",
    cat: "JACKET",
    is_best_seller: true,
    variants: [
      { id: 101, size: "S", stock: 12 },
      { id: 102, size: "M", stock: 25 },
      { id: 103, size: "L", stock: 18 },
      { id: 104, size: "XL", stock: 8 },
    ],
  },
  {
    id: "heavyweight-hoodie-navy",
    img: pHoodie,
    name: "Heavyweight Hoodie Navy",
    price: "Rp 285.000",
    was: "Rp 320.000",
    tag: "LIMITED",
    cat: "HOODIE",
    is_limited: true,
    variants: [
      { id: 201, size: "S", stock: 5 },
      { id: 202, size: "M", stock: 12 },
      { id: 203, size: "L", stock: 3 },
      { id: 204, size: "XL", stock: 0 },
    ],
  },
  {
    id: "essential-tee-navy",
    img: pTshirt,
    name: "Essential Tee — Navy",
    price: "Rp 125.000",
    tag: "NEW",
    cat: "TEE",
    variants: [
      { id: 301, size: "S", stock: 10 },
      { id: 302, size: "M", stock: 20 },
      { id: 303, size: "L", stock: 15 },
    ],
  },
  {
    id: "graphic-tee-forpt",
    img: pTee2,
    name: "Graphic Tee — Forpt Cantcont",
    price: "Rp 145.000",
    tag: "NEW",
    cat: "TEE",
    variants: [
      { id: 401, size: "M", stock: 8 },
      { id: 402, size: "L", stock: 12 },
    ],
  },
  {
    id: "f-logo-snapback",
    img: pCap,
    name: "F Logo Snapback",
    price: "Rp 95.000",
    cat: "ACCESSORIES",
    variants: [{ id: 501, size: "One Size", stock: 30 }],
  },
  {
    id: "canvas-tote-logo",
    img: pTote,
    name: "Canvas Tote — Logo Stamp",
    price: "Rp 65.000",
    cat: "ACCESSORIES",
    variants: [{ id: 601, size: "One Size", stock: 50 }],
  },
];

const CATEGORIES: { name: string; img: string; filter: Filter }[] = [
  { name: "Varsity Jacket", img: pVarsity, filter: "JACKET" },
  { name: "Hoodie", img: pHoodie, filter: "HOODIE" },
  { name: "T-Shirt", img: pTshirt, filter: "TEE" },
  { name: "Accessories", img: pCap, filter: "ACCESSORIES" },
  { name: "Exclusive Bundle", img: pTote, filter: "BUNDLE" },
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

function parsePrice(p: any): number {
  if (typeof p === "number") return p;
  if (!p) return 0;
  return Number(String(p).replace(/[^0-9]/g, "")) || 0;
}

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

// Determine active price based on user verification status (same logic as products.tsx)
function getActivePriceForCard(p: ProductCard, user: any): string {
  const isUb = user?.is_filkom_verified === 1;
  if (p.promo_price && Number(p.promo_price) > 0) {
    return formatRp(Number(p.promo_price));
  }
  if (isUb && p.filkom_price && Number(p.filkom_price) > 0) {
    return formatRp(Number(p.filkom_price));
  }
  return p.price;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Reusable Countdown Timer Component
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

  if (!timeLeft) return <div className="h-10 animate-pulse bg-neutral-200 rounded max-w-[200px]" />;

  return (
    <div className="flex gap-2 sm:gap-3 text-center font-mono">
      <div className="bg-ink text-cream p-1.5 sm:p-2.5 rounded border border-cream/20 shadow-md">
        <span className="display text-base sm:text-2xl block leading-none">
          {String(timeLeft.days).padStart(2, "0")}
        </span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">
          Hari
        </span>
      </div>
      <div className="display text-lg sm:text-2xl text-ink flex items-center">:</div>
      <div className="bg-ink text-cream p-1.5 sm:p-2.5 rounded border border-cream/20 shadow-md">
        <span className="display text-base sm:text-2xl block leading-none">
          {String(timeLeft.hours).padStart(2, "0")}
        </span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">
          Jam
        </span>
      </div>
      <div className="display text-lg sm:text-2xl text-ink flex items-center">:</div>
      <div className="bg-ink text-cream p-1.5 sm:p-2.5 rounded border border-cream/20 shadow-md">
        <span className="display text-base sm:text-2xl block leading-none">
          {String(timeLeft.minutes).padStart(2, "0")}
        </span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">
          Min
        </span>
      </div>
      <div className="display text-lg sm:text-2xl text-ink flex items-center">:</div>
      <div className="bg-ink text-cream p-1.5 sm:p-2.5 rounded border border-cream/20 shadow-md">
        <span className="display text-base sm:text-2xl block leading-none">
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">
          Det
        </span>
      </div>
    </div>
  );
}

interface HeroCarouselProps {
  images: string[];
}

function HeroCarousel({ images }: HeroCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Autoplay (Changed from 4000ms to 7000ms for 7 seconds slide intervals)
  useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [api]);

  const slideImages = images && images.length > 0 ? images : [varsityEdutech, workJacket];

  // Keyboard navigation for image preview lightbox
  useEffect(() => {
    if (previewIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewIndex(null);
      } else if (e.key === "ArrowLeft") {
        setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : slideImages.length - 1));
      } else if (e.key === "ArrowRight") {
        setPreviewIndex((prev) => (prev !== null && prev < slideImages.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, slideImages.length]);

  return (
    <div className="w-full h-full relative group">
      <Carousel setApi={setApi} className="w-full h-full" opts={{ loop: true }}>
        <CarouselContent className="h-full -ml-0">
          {slideImages.map((imgUrl, index) => (
            <CarouselItem key={index} className="h-full pl-0 relative">
              <div
                className="w-full h-full relative overflow-hidden group/slide cursor-zoom-in"
                onClick={() => setPreviewIndex(index)}
              >
                <img
                  src={resolveImageUrl(imgUrl)}
                  alt={`Filkom Merch Hero Lookbook Slide ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-[15000ms] ease-out hover:scale-105"
                />
                {/* Subtle Hover Zoom-in overlay */}
                <div className="absolute inset-0 bg-ink/10 opacity-0 group-hover/slide:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="bg-background/90 text-ink p-3 rounded-full shadow-lg transform scale-90 group-hover/slide:scale-100 transition-all duration-300 border-2 border-ink">
                    <ZoomIn className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* dots indicator */}
      {slideImages.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2.5 z-20">
          {slideImages.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2.5 rounded-full transition-all duration-300 border border-ink cursor-pointer ${index === current
                ? "bg-brand-orange w-7 shadow-sm"
                : "bg-cream/60 hover:bg-cream w-2.5"
                }`}
              aria-label={`Buka slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Preview Modal */}
      {previewIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
          onClick={() => setPreviewIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setPreviewIndex(null)}
            className="absolute top-6 right-6 text-cream/70 hover:text-cream transition-colors p-2 hover:bg-cream/10 rounded-full cursor-pointer z-[101]"
            aria-label="Close preview"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Left Arrow Navigation */}
          {slideImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : slideImages.length - 1));
              }}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 bg-cream/10 hover:bg-cream/20 text-cream p-3 rounded-full transition-all cursor-pointer z-[101]"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Right Arrow Navigation */}
          {slideImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIndex((prev) => (prev !== null && prev < slideImages.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 bg-cream/10 hover:bg-cream/20 text-cream p-3 rounded-full transition-all cursor-pointer z-[101]"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Main preview container */}
          <div
            className="relative max-w-[90vw] max-h-[80vh] sm:max-h-[85vh] flex flex-col items-center justify-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolveImageUrl(slideImages[previewIndex])}
              alt={`Filkom Merch Lookbook Slide Preview ${previewIndex + 1}`}
              className="max-w-full max-h-[80vh] sm:max-h-[85vh] object-contain rounded-lg border-2 border-cream/20 shadow-2xl"
            />
            {/* Slide Index indicator */}
            <div className="mt-4 text-center text-cream/70 text-xs font-semibold font-mono uppercase tracking-widest bg-ink/50 px-3 py-1 rounded-full border border-cream/10">
              Slide {previewIndex + 1} / {slideImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScrollFadeSegment({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.05,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`w-full overflow-hidden transition-all duration-700 ease-out transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
    >
      {children}
    </div>
  );
}

function Index() {
  const parsePrice = (p: any): number => {
    if (typeof p === "number") return p;
    if (!p) return 0;
    return Number(String(p).replace(/[^0-9]/g, "")) || 0;
  };

  const formatRp = (n: number) => {
    return "Rp " + n.toLocaleString("id-ID");
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { data: activePoRes } = useQuery({
    queryKey: ["activePreOrderCampaign"],
    queryFn: () => getActivePreOrderCampaignServerAction(),
    staleTime: 30 * 1000,
  });
  const activePoCampaign = activePoRes?.data || null;
  const canSeeProducts = useMemo(
    () => isProductVisibleToUser(user, activePoCampaign),
    [user, activePoCampaign]
  );

  const [filter, setFilter] = useState<Filter>("ALL");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductCard | null>(null);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);

  // Load wishlist and cart from localStorage
  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem("wishlist");
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const updateQty = (id: string, delta: number) => {
    const updated = cart
      .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0);
    saveCart(updated);
  };

  const removeItem = (id: string) => {
    saveCart(cart.filter((i) => i.id !== id));
  };

  // Handle hash scroll
  useEffect(() => {
    const handleHashScroll = () => {
      if (window.location.hash) {
        const id = window.location.hash.substring(1);
        const timer = setTimeout(() => {
          scrollToId(id);
        }, 300);
        return () => clearTimeout(timer);
      }
    };
    handleHashScroll();
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, []);


  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const loaderData = Route.useLoaderData() || {};
  const dbProducts = loaderData.products || [];
  const initialSettings = loaderData.settings || null;
  const categories = loaderData.categories || [];

  // Fetch store settings via React Query with initialData from loader to ensure background refetch on client
  const { data: settingsData } = useQuery({
    queryKey: ["storeSettings"],
    queryFn: () => getStoreSettings(),
    initialData: initialSettings ? { settings: initialSettings } : undefined,
    staleTime: 1000 * 30, // 30 seconds stale time
    refetchOnMount: true,
  });

  const settings = settingsData?.settings ?? initialSettings;

  // Merge database layout configuration with default segments list
  const segments = useMemo((): HomepageSegment[] => {
    const rawLayout = settings?.homepage_layout;
    if (!rawLayout) {
      return getDefaultSegments();
    }

    // If MySQL driver or API response already returned parsed Object/Array
    if (typeof rawLayout === "object") {
      return convertLegacyToSegments(rawLayout as any);
    }

    try {
      const parsed = JSON.parse(rawLayout);
      return convertLegacyToSegments(parsed);
    } catch (e) {
      console.warn("Standard JSON.parse failed for homepage_layout, trying robust cleanup:", e);
      try {
        if (typeof rawLayout === "string") {
          // Clean carriage returns and escape raw newlines/tabs inside the minified JSON string
          const cleaned = rawLayout
            .replace(/\r/g, "")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");
          const parsed = JSON.parse(cleaned);
          return convertLegacyToSegments(parsed);
        }
      } catch (err) {
        console.error("Failed parsing homepage_layout even with robust cleanup:", err);
      }
      return getDefaultSegments();
    }
  }, [settings]);

  // Merge database layout configuration with default editorial layout
  const layout = useMemo(() => {
    const defaults = {
      heroTitle: "Wear\nYour\nFaculty.",
      heroSubtitle:
        "Koleksi merchandise resmi mahasiswa Fakultas Ilmu Komputer UB. Dibuat oleh mahasiswa, untuk mahasiswa premium, eksklusif, dan limited stock.",
      heroSubLabel: "FILKOM MERCH 2026",
      heroBtnText: "SHOP THE DROP",
      heroImage: "",
      marqueeText:
        "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN | 100% PRODUK MAHASISWA | CASHBACK 5% MEMBER | DROP BARU TIAP BULAN",

      heroCountdownEnd: "2026-07-15T23:59:59+07:00",
      showHeroCountdown: true,

      featuredProductSlugs: "varsity-filkom,hoodie-code-run,tshirt-debugging",

      limitedTitle: "Varsity FILKOM Edition",
      limitedSubtitle:
        "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
      limitedProductSlug: "varsity-filkom",
      limitedImage: "",
      limitedCountdownEnd: "2026-07-10T23:59:59+07:00",
      limitedStockMax: 100,
      limitedStockCurrent: 82,
      showLimitedDrop: true,

      whyTitle1: "Desain Orisinal",
      whyDesc1:
        "Setiap artikel dirancang eksklusif oleh mahasiswa FILKOM demi mewakili identitas kita.",
      whyTitle2: "Kualitas Premium",
      whyDesc2:
        "Bahan cotton fleece tebal, sablon presisi tinggi, dan jahitan standar distro internasional.",
      whyTitle3: "Bebas Ongkir Kampus",
      whyDesc3: "Pesan online, ambil langsung di Toko FILKOM Merch tanpa biaya kirim sepeser pun.",
      whyTitle4: "Pembayaran Instan",
      whyDesc4:
        "Mendukung pembayaran otomatis QRIS, ShopeePay, GoPay, dan transfer bank via Midtrans.",

      faqQ1: "Apakah produk ini resmi (official) dari FILKOM?",
      faqA1:
        "Ya, Filkom Merchandise adalah toko merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya yang bekerjasama dengan pihak fakultas dan BEM FILKOM UB.",
      faqQ2: "Bagaimana cara mengambil pesanan saya?",
      faqA2:
        "Anda dapat memilih metode pengambilan 'Pickup di Kampus' saat checkout. Tim kami akan bersiap di Toko FILKOM Merch pada jadwal pengambilan yang diinfokan via WhatsApp.",
      faqQ3: "Berapa lama estimasi pengerjaan barang Pre-Order?",
      faqA3:
        "Proses produksi barang pre-order biasanya memakan waktu 14 hingga 21 hari kerja setelah sesi pemesanan ditutup, tergantung tingkat kerumitan desain dan antrean vendor.",
      faqQ4: "Apakah saya bisa menukar ukuran pakaian jika tidak pas?",
      faqA4:
        "Penukaran ukuran diperbolehkan maksimal 2 hari setelah barang diterima, dengan syarat tag belum dilepas, belum dicuci, dan stok ukuran pengganti masih tersedia.",
    };

    const extracted = extractLegacyConfigFromSegments(segments);
    return { ...defaults, ...extracted };
  }, [segments]);

  const products = dbProducts.length > 0 ? dbProducts : FALLBACK_PRODUCTS;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);

  const getCategoryImages = (catId: number, products: any[]): string[] => {
    const imgs: string[] = [];
    products.forEach((p) => {
      if (p.category_id === catId && p.img) {
        if (!imgs.includes(p.img)) {
          imgs.push(p.img);
        }
      }
    });
    return imgs.slice(0, 3);
  };

  const getCategoryDesc = (slug: string) => {
    const descs: Record<string, string> = {
      jacket: "Varsity & Coach Jackets",
      hoodie: "Premium Ngoding Sweaters",
      tee: "Oversized Cotton Combed",
      accessories: "Caps, Totebags, & More",
    };
    return descs[slug.toLowerCase()] || "Premium merchandise collection";
  };

  // Dynamic products count for categories
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      if (p.category_id) {
        counts[p.category_id] = (counts[p.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Wishlist actions
  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("wishlist", JSON.stringify(next));
      if (next.includes(id)) {
        toast.success("Added to wishlist", { icon: "❤️" });
      } else {
        toast.info("Removed from wishlist");
      }
      return next;
    });
  };

  const visibleProducts = useMemo(() => {
    let list = products;
    if (filter !== "ALL") list = list.filter((p) => p.cat === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, query, products]);

  // Featured Collection items (from config slugs)
  const featuredProducts = useMemo(() => {
    const slugs = (layout.featuredProductSlugs as string).split(",").map((s: string) => s.trim());
    const found = products.filter((p) => slugs.includes(p.id));
    return found.length > 0 ? found : products.slice(0, 3);
  }, [products, layout.featuredProductSlugs]);

  // Best Sellers (is_best_seller)
  const bestSellers = useMemo(() => {
    const found = products.filter((p) => p.is_best_seller);
    return found.length > 0 ? found : products.slice(0, 2);
  }, [products]);

  // New Arrivals
  const newArrivals = useMemo(() => {
    return products.filter((p) => p.tag === "NEW" || !p.is_best_seller);
  }, [products]);

  // Limited drop product
  const limitedProduct = useMemo(() => {
    return products.find((p) => p.id === layout.limitedProductSlug) || products[0];
  }, [products, layout.limitedProductSlug]);

  // Quick sizes selector for quick-add overlay
  const getProductAvailableSizes = (p: ProductCard) => {
    if (!p.variants || p.variants.length === 0) return [];
    // If it has only one size (e.g. accessories, bags), return empty to show simple Add To Cart
    if (
      p.variants.length === 1 &&
      (p.variants[0].size.toLowerCase() === "all size" ||
        p.variants[0].size.toLowerCase() === "one size")
    ) {
      return [];
    }
    return p.variants.filter((v: any) => (v.stock || 0) > 0).map((v: any) => v.size);
  };

  // Add to cart with support for custom sizes
  // Add to cart with support for custom sizes
  const addToCart = useCallback((p: ProductCard, selectedSize?: string) => {
    const variants = p.variants || [];
    const sizeToUse = selectedSize || variants[0]?.size || "One Size";
    const matchingVariant = variants.find((v: any) => v.size === sizeToUse) || variants[0];

    const itemId = selectedSize ? `${p.id}-${selectedSize}` : p.id;
    const itemName = selectedSize ? `${p.name} — ${selectedSize}` : p.name;

    let currentCart: any[] = [];
    try {
      const saved = localStorage.getItem("indexCart");
      if (saved) currentCart = JSON.parse(saved);
    } catch (e) { }

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
        price: getActivePriceForCard(p, user),
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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Email tidak valid");
      return;
    }
    toast.success("Subscribed!", { description: `Drop berikutnya dikirim ke ${email}` });
    setEmail("");
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand-orange selection:text-cream">
      {/* Header */}
      <Navbar searchQuery={query} onSearchQueryChange={setQuery} />

      <div id="top" />

      {/* Modular Builder segments renderer */}
      {segments
        .filter((seg) => seg.enabled)
        .map((seg) => (
          <ScrollFadeSegment key={seg.id}>
            {(seg.elements || []).map((el) => {
              switch (el.type) {
                case "marquee":
                  return null;

                case "hero_banner":
                  return (
                    <section key={el.id} className="relative bg-cream border-b-2 border-ink">
                      <div className="grid lg:grid-cols-12 max-w-[1400px] mx-auto animate-slide-up">
                        <div className="lg:col-span-6 px-4 sm:px-8 lg:px-12 py-10 sm:py-16 lg:py-24 flex flex-col justify-center order-2 lg:order-1">
                          {/* Social Proof Star Ratings & Badge */}
                          <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
                            <span className="text-[9px] bg-ink text-cream font-extrabold px-2.5 py-1 rounded tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                              <Check className="w-3 h-3 text-brand-orange" /> Official Merchandise FILKOM
                            </span>
                          </div>

                          {/* Sub label */}
                          {el.config.subLabel && (
                            <div className="text-xs tracking-[0.3em] text-brand-orange font-bold mb-3 uppercase">
                              {el.config.subLabel}
                            </div>
                          )}

                          {/* Title */}
                          <h1 className="display text-[44px] sm:text-[68px] lg:text-[96px] leading-[0.9] text-ink animate-fade-in font-extrabold uppercase">
                            {(el.config.title || "").split("\n").map((line: string, idx: number) => (
                              <span key={idx} className="block">
                                {line}
                              </span>
                            ))}
                          </h1>

                          {/* Subtitle */}
                          <p className="mt-4 sm:mt-6 text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed font-medium">
                            {el.config.subtitle}
                          </p>

                          {/* Urgent Countdown Timer if enabled */}
                          {el.config.showCountdown && el.config.countdownEnd && (
                            <div className="mt-6 sm:mt-8 bg-secondary border-2 border-ink p-4 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] w-fit flex flex-col gap-2">
                              <div className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-brand-orange uppercase flex items-center gap-1.5 animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                {el.config.countdownLabel || "PRE-ORDER BATCH BERAKHIR DALAM:"}
                              </div>
                              <CountdownTimer targetDate={el.config.countdownEnd} />
                            </div>
                          )}

                          {/* Call to actions */}
                          <div className="mt-6 sm:mt-10 flex flex-wrap gap-3">
                            <button
                              onClick={() => {
                                if (el.config.btnLink) {
                                  if (el.config.btnLink.startsWith("/#") || el.config.btnLink.startsWith("#")) {
                                    scrollToId(el.config.btnLink.replace("/#", "").replace("#", ""));
                                  } else {
                                    navigate({ to: el.config.btnLink });
                                  }
                                } else {
                                  scrollToId("shop");
                                }
                              }}
                              className="inline-flex items-center justify-center gap-2 bg-ink text-cream px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange transition-all duration-300 shadow-[3px_3px_0px_0px_rgba(27,27,27,0.15)] active:translate-y-0.5 cursor-pointer uppercase"
                            >
                              {el.config.btnText} <ArrowRight className="w-4 h-4" />
                            </button>
                            {el.config.showLookbookBtn !== false && (
                              <button
                                onClick={() => {
                                  const link = el.config.lookbookBtnLink || "#shop";
                                  if (link.startsWith("/#") || link.startsWith("#")) {
                                    scrollToId(link.replace("/#", "").replace("#", ""));
                                  } else {
                                    navigate({ to: link });
                                  }
                                }}
                                className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-bold tracking-[0.2em] border-2 border-ink text-ink hover:bg-ink hover:text-cream transition-all duration-300 active:translate-y-0.5 cursor-pointer uppercase"
                              >
                                {el.config.lookbookBtnText || "LOOKBOOK"}
                              </button>
                            )}
                            {el.config.showVerifyBtn && (() => {
                              if (!user) {
                                return (
                                  <button
                                    onClick={() => navigate({ to: "/login" })}
                                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-bold tracking-[0.2em] bg-cream text-ink border-2 border-ink hover:bg-brand-orange hover:text-cream hover:border-brand-orange transition-all duration-300 shadow-[3px_3px_0px_0px_rgba(27,27,27,0.15)] active:translate-y-0.5 cursor-pointer uppercase"
                                  >
                                    <ShieldCheck className="w-4 h-4" /> YUK LOGIN DULU
                                  </button>
                                );
                              }
                              const isUbEmail = user.email?.endsWith("@ub.ac.id");
                              if (isUbEmail && user.is_filkom_verified !== 1) {
                                return (
                                  <button
                                    onClick={() => window.dispatchEvent(new Event("open-verification"))}
                                    className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-bold tracking-[0.2em] bg-cream text-ink border-2 border-ink hover:bg-brand-orange hover:text-cream hover:border-brand-orange transition-all duration-300 shadow-[3px_3px_0px_0px_rgba(27,27,27,0.15)] active:translate-y-0.5 cursor-pointer uppercase animate-pulse"
                                  >
                                    <ShieldCheck className="w-4 h-4" /> VERIFIKASI NIM-MU!
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        <div className="lg:col-span-6 relative aspect-[5/6] border-t-2 lg:border-t-0 lg:border-l-2 border-ink bg-neutral-900 overflow-hidden order-1 lg:order-2">
                          <HeroCarousel images={el.config.images || (el.config.image ? [el.config.image] : [])} />
                        </div>
                      </div>
                    </section>
                  );

                case "countdown":
                  return (
                    <section key={el.id} className="bg-ink text-cream py-16 sm:py-20 border-b-2 border-ink text-center animate-slide-up">
                      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 space-y-6">
                        <div className="text-xs tracking-[0.3em] text-brand-orange font-bold uppercase">
                          {el.config.title}
                        </div>
                        {el.config.subtitle && (
                          <p className="text-sm text-cream/70 max-w-md mx-auto leading-relaxed">
                            {el.config.subtitle}
                          </p>
                        )}
                        <div className="flex justify-center text-cream">
                          <CountdownTimer targetDate={el.config.targetDate} />
                        </div>
                      </div>
                    </section>
                  );

                case "product_grid": {
                  const getSegmentProducts = (cfg: any) => {
                    const source = cfg.source || "all";
                    let list = [...products];
                    if (source === "featured") {
                      list = list.filter((p) => p.is_featured);
                    } else if (source === "best_seller") {
                      list = list.filter((p) => p.is_best_seller);
                    } else if (source === "slugs") {
                      const slugs = (cfg.slugs || "").split(",").map((s: string) => s.trim().toLowerCase());
                      list = list.filter((p) => slugs.includes(p.id.toLowerCase()));
                    }
                    return list.slice(0, cfg.maxItems || 6);
                  };

                  const gridProducts = getSegmentProducts(el.config);
                  const isMainHero = el.config.title?.toLowerCase().includes("hero");

                  // Strictly filter products assigned to "Main Hero" category (excluding bundles)
                  const heroCategoryProducts = products.filter((p) => {
                    const catName = (p.cat || (p as any).category_name || "").toLowerCase();
                    const catSlug = ((p as any).category_slug || "").toLowerCase();
                    const prodType = ((p as any).product_type || "").toLowerCase();
                    return (
                      prodType !== "bundle" &&
                      (catName.includes("main hero") ||
                        catName.includes("hero") ||
                        catSlug.includes("main-hero") ||
                        catSlug.includes("hero"))
                    );
                  });

                  const heroProductsToRender = heroCategoryProducts.length > 0
                    ? heroCategoryProducts
                    : gridProducts.filter((p) => (p as any).product_type !== "bundle");

                  return (
                    isMainHero ? (
                      <section key={el.id} className="bg-neutral-950 text-neutral-100 py-16 sm:py-24 border-b-2 border-ink animate-slide-up">
                        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
                          <div className="flex flex-col items-center text-center mb-10 sm:mb-14 gap-2">
                            {el.config.subtitle && (
                              <div className="text-xs sm:text-sm tracking-[0.35em] text-brand-orange font-black mb-1 uppercase">
                                🔥 {el.config.subtitle}
                              </div>
                            )}
                            <h2 className="display text-4xl sm:text-6xl lg:text-7xl text-white font-extrabold uppercase tracking-wide">
                              {el.config.title}
                            </h2>
                          </div>

                          {!canSeeProducts ? (
                            <PreOrderNotOpenPlaceholder campaign={activePoCampaign} />
                          ) : (
                            <div className="flex flex-wrap justify-center gap-3.5 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
                              {heroProductsToRender.map((p) => {
                                let discountText = null;
                                if (p.rawOriginalPrice && p.rawPrice && p.rawOriginalPrice > p.rawPrice) {
                                  const pct = Math.round(((p.rawOriginalPrice - p.rawPrice) / p.rawOriginalPrice) * 100);
                                  discountText = `Save ${pct}%`;
                                } else if (p.was && p.price) {
                                  const rawPrice = parsePrice(p.price);
                                  const rawOriginalPrice = parsePrice(p.was);
                                  if (rawOriginalPrice > rawPrice) {
                                    const pct = Math.round(((rawOriginalPrice - rawPrice) / rawOriginalPrice) * 100);
                                    discountText = `Save ${pct}%`;
                                  }
                                }

                                return (
                                  <div
                                    key={p.id}
                                    className="group flex flex-col border-2 border-ink bg-neutral-900 text-cream rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(255,107,0,085)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(255,107,0,1)] transition-all duration-200 w-[calc(50%-0.5rem)] sm:w-[260px] md:w-[290px] shrink-0"
                                  >
                                    {/* Top Full-Width Rigid 1:1 Aspect-Square Cover Photo */}
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
                                        {discountText && (
                                          <span className="text-[9px] font-black tracking-wider px-2 py-0.5 bg-red-600 text-white rounded-full border border-ink shadow-xs uppercase">
                                            🔥 {discountText}
                                          </span>
                                        )}
                                      </div>
                                    </Link>

                                    {/* Details Content Body Below Image */}
                                    <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                                      <div>
                                        {/* Header: Category & Title */}
                                        <div className="text-[8.5px] font-extrabold tracking-widest text-brand-orange uppercase mb-0.5">
                                          {p.cat || "MAIN HERO"}
                                        </div>
                                        <Link
                                          to="/product/$slug"
                                          params={{ slug: p.id }}
                                          className="hover:text-brand-orange transition-colors"
                                        >
                                          <h3 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wide leading-tight group-hover:text-brand-orange transition-colors">
                                            {p.name}
                                          </h3>
                                        </Link>
                                      </div>

                                      {/* Price Section */}
                                      <div className="pt-2 border-t border-neutral-800 flex items-baseline justify-between gap-1">
                                        <div>
                                          <span className="text-base sm:text-lg font-black text-brand-orange tracking-tight block leading-none">
                                            {getActivePriceForCard(p, user)}
                                          </span>
                                          {(p.was || (p.filkom_price && user?.is_filkom_verified === 1 && Number(p.filkom_price) < (p.rawPrice || 0))) && (
                                            <span className="text-[10px] font-extrabold text-red-500 line-through block mt-0.5">
                                              {p.was || p.price}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Dual Icon Action Buttons - Below Price, Full Width Split 50/50 */}
                                      <div className="pt-1 flex gap-1.5 w-full">
                                        <button
                                          onClick={() => {
                                            if ((p as any).rawProduct) {
                                              addToCart((p as any).rawProduct);
                                            } else {
                                              addToCart(p);
                                            }
                                          }}
                                          title="Masuk Bag"
                                          className="flex-1 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-brand-orange border border-neutral-600 shadow-[1px_1px_0px_0px_rgba(255,255,255,0.7)] transition-all cursor-pointer flex items-center justify-center"
                                        >
                                          <ShoppingBag className="w-4 h-4" />
                                        </button>

                                        <Link
                                          to="/product/$slug"
                                          params={{ slug: p.id }}
                                          title="Pesan Sekarang"
                                          className="flex-1 h-8 rounded-lg bg-brand-orange hover:bg-cream text-ink border border-ink shadow-[1px_1px_0px_0px_rgba(255,255,255,0.7)] transition-all cursor-pointer flex items-center justify-center"
                                        >
                                          <ArrowRight className="w-4 h-4" />
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </section>
                    ) : (
                      <section key={el.id} className="bg-background py-16 sm:py-24 border-b-2 border-ink animate-slide-up">
                        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
                          <div className="flex flex-col items-center text-center mb-10 sm:mb-12 gap-2">
                            {el.config.subtitle && (
                              <div className="text-xs tracking-[0.35em] text-brand-orange font-bold mb-2 uppercase">
                                {el.config.subtitle}
                              </div>
                            )}
                            <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase">
                              {el.config.title}
                            </h2>
                          </div>

                          {!canSeeProducts ? (
                            <PreOrderNotOpenPlaceholder campaign={activePoCampaign} />
                          ) : (
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-3.5 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
                              {gridProducts.map((p) => {
                                let discountText = null;
                                if (p.rawOriginalPrice && p.rawPrice && p.rawOriginalPrice > p.rawPrice) {
                                  const pct = Math.round(((p.rawOriginalPrice - p.rawPrice) / p.rawOriginalPrice) * 100);
                                  discountText = `Save ${pct}%`;
                                } else if (p.was && p.price) {
                                  const rawPrice = parsePrice(p.price);
                                  const rawOriginalPrice = parsePrice(p.was);
                                  if (rawOriginalPrice > rawPrice) {
                                    const pct = Math.round(((rawOriginalPrice - rawPrice) / rawOriginalPrice) * 100);
                                    discountText = `Save ${pct}%`;
                                  }
                                }

                                return (
                                  <div
                                    key={p.id}
                                    className="group flex flex-col border-2 border-ink bg-cream text-ink rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all duration-200 w-full sm:w-[260px] md:w-[290px] shrink-0"
                                  >
                                    <Link
                                      to="/product/$slug"
                                      params={{ slug: p.id }}
                                      className="relative w-full aspect-square border-b-2 border-ink bg-secondary overflow-hidden block"
                                    >
                                      <img
                                        src={resolveImageUrl(p.img)}
                                        alt={p.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                      />
                                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                                        {p.tag && (
                                          <span className="text-[9px] font-black tracking-wider px-2 py-0.5 bg-brand-orange text-cream rounded-full border border-ink shadow-xs uppercase">
                                            {p.tag}
                                          </span>
                                        )}
                                        {discountText && (
                                          <span className="text-[9px] font-black tracking-wider px-2 py-0.5 bg-red-600 text-white rounded-full border border-ink shadow-xs uppercase">
                                            🔥 {discountText}
                                          </span>
                                        )}
                                      </div>
                                    </Link>

                                    <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                                      <div>
                                        <div className="text-[8.5px] font-extrabold tracking-widest text-brand-orange uppercase mb-0.5">
                                          {p.cat}
                                        </div>
                                        <Link
                                          to="/product/$slug"
                                          params={{ slug: p.id }}
                                          className="hover:text-brand-orange transition-colors"
                                        >
                                          <h3 className="font-extrabold text-xs sm:text-sm text-ink uppercase tracking-wide leading-tight group-hover:text-brand-orange transition-colors">
                                            {p.name}
                                          </h3>
                                        </Link>
                                      </div>

                                      <div className="pt-2 border-t border-ink/10 flex items-baseline justify-between gap-1">
                                        <div>
                                          <span className="text-base sm:text-lg font-black text-ink tracking-tight block leading-none">
                                            {getActivePriceForCard(p, user)}
                                          </span>
                                          {(p.was || (p.filkom_price && user?.is_filkom_verified === 1 && Number(p.filkom_price) < (p.rawPrice || 0))) && (
                                            <span className="text-[10px] font-extrabold text-red-500 line-through block mt-0.5">
                                              {p.was || p.price}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="pt-1 flex gap-1.5 w-full">
                                        <button
                                          onClick={() => {
                                            if ((p as any).rawProduct) {
                                              addToCart((p as any).rawProduct);
                                            } else {
                                              addToCart(p);
                                            }
                                          }}
                                          title="Masuk Bag"
                                          className="flex-1 h-8 rounded-lg bg-ink hover:bg-brand-orange text-cream border border-ink shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer flex items-center justify-center"
                                        >
                                          <ShoppingBag className="w-4 h-4 text-brand-orange" />
                                        </button>

                                        <Link
                                          to="/product/$slug"
                                          params={{ slug: p.id }}
                                          title="Pesan Sekarang"
                                          className="flex-1 h-8 rounded-lg bg-brand-orange hover:bg-cream text-ink border border-ink shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer flex items-center justify-center"
                                        >
                                          <ArrowRight className="w-4 h-4" />
                                        </Link>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </section>
                    )
                  );
                }

                case "category_showcase":
                  return (
                    <section key={el.id} className="bg-cream border-b border-border animate-slide-up">
                      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 sm:py-24">
                        <div className="flex items-end justify-between mb-8 sm:mb-12">
                          <div>
                            <div className="text-xs tracking-[0.3em] text-muted-foreground font-bold mb-2">
                              02 — CATEGORIES
                            </div>
                            <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase">
                              {el.config.title || "Pick your fit."}
                            </h2>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(categories || []).map((cat) => {
                            const count = categoryCounts[cat.id] || 0;
                            const desc = getCategoryDesc(cat.slug);
                            const imgs = getCategoryImages(cat.id, products);
                            return (
                              <Link
                                key={cat.id}
                                to="/products"
                                search={{ category: String(cat.id) }}
                                className="group text-left border-2 border-ink rounded-lg bg-background p-4 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-y-[-4px] transition-all duration-300 flex flex-col h-full cursor-pointer overflow-hidden"
                              >
                                <div className="relative aspect-square w-full mb-6 shrink-0 overflow-hidden flex items-center justify-center pt-2">
                                  {imgs.length === 0 ? (
                                    <div className="w-[90%] h-[90%] bg-muted rounded overflow-hidden border border-ink/10 shadow-sm">
                                      <img
                                        src={resolveImageUrl(pVarsity)}
                                        alt={cat.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : imgs.length === 1 ? (
                                    <div className="w-[90%] h-[90%] bg-muted rounded overflow-hidden border-2 border-ink shadow-sm transition-transform duration-500 group-hover:scale-105">
                                      <img
                                        src={resolveImageUrl(imgs[0])}
                                        alt={cat.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="relative w-[82%] h-[82%]">
                                      {/* Third Image (Backmost) */}
                                      {imgs[2] && (
                                        <div className="absolute inset-0 bg-muted rounded overflow-hidden border border-ink/20 shadow-sm rotate-[8deg] translate-x-3.5 translate-y-0.5 transition-all duration-500 group-hover:rotate-[15deg] group-hover:translate-x-5 group-hover:translate-y-1 origin-bottom">
                                          <img
                                            src={resolveImageUrl(imgs[2])}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      {/* Second Image (Middle) */}
                                      {imgs[1] && (
                                        <div className="absolute inset-0 bg-muted rounded overflow-hidden border border-ink/20 shadow-sm -rotate-[6deg] -translate-x-2.5 translate-y-0.5 transition-all duration-500 group-hover:-rotate-[12deg] group-hover:-translate-x-4 group-hover:translate-y-1 origin-bottom">
                                          <img
                                            src={resolveImageUrl(imgs[1])}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      )}
                                      {/* First Image (Frontmost) */}
                                      <div className="absolute inset-0 bg-muted rounded overflow-hidden border-2 border-ink shadow-md transition-all duration-500 group-hover:scale-102 origin-bottom">
                                        <img
                                          src={resolveImageUrl(imgs[0])}
                                          alt={cat.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                  <div>
                                    <h3 className="font-extrabold text-base tracking-wide text-ink mb-1 group-hover:text-brand-orange transition-colors uppercase">
                                      {cat.name}
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                                      {desc}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-mono tracking-widest text-brand-orange font-bold mt-4 block uppercase">
                                    {count} items
                                  </span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  );

                case "image_banner":
                  return (
                    <div key={el.id} className="w-full border-b-2 border-ink overflow-hidden animate-slide-up">
                      <Link to={el.config.link || "/#shop"}>
                        <div
                          className="relative w-full bg-neutral-900 group cursor-pointer"
                          style={{
                            height:
                              el.config.height === "sm"
                                ? "200px"
                                : el.config.height === "lg"
                                  ? "600px"
                                  : "400px",
                          }}
                        >
                          <img
                            src={resolveImageUrl(el.config.image) || about}
                            alt={el.config.alt || "Promo Banner"}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-102 opacity-90 group-hover:opacity-100"
                          />
                        </div>
                      </Link>
                    </div>
                  );

                case "text_block": {
                  const hasImages = el.config.leftImage || el.config.rightImage;
                  return (
                    <section
                      key={el.id}
                      className="bg-background py-16 sm:py-24 border-b-2 border-ink animate-slide-up"
                    >
                      <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
                        <div className={`flex flex-col ${hasImages ? "lg:flex-row" : ""} items-center justify-center gap-8 lg:gap-12`}>

                          {/* Left Photo (Desktop only) */}
                          {el.config.leftImage && (
                            <div className="w-full lg:w-1/4 max-w-[280px] aspect-[3/4] shrink-0 border-2 border-ink rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] order-2 lg:order-1 lg:block hidden">
                              <img
                                src={resolveImageUrl(el.config.leftImage)}
                                alt="About Left Visual"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const parent = (e.target as HTMLImageElement).closest('div[class*="aspect-"]');
                                  if (parent) (parent as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          {/* Centered Text Content */}
                          <div className="flex-1 max-w-[700px] text-center order-1 lg:order-2 space-y-4 sm:space-y-6" style={{ textAlign: el.config.alignment || "center" }}>
                            {el.config.subtitle && (
                              <div className="text-xs tracking-[0.3em] text-brand-orange font-bold uppercase">
                                {el.config.subtitle}
                              </div>
                            )}
                            <h2 className="display text-3xl sm:text-5xl text-ink font-bold uppercase leading-none">
                              {el.config.title}
                            </h2>
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium max-w-2xl mx-auto whitespace-pre-line">
                              {el.config.body}
                            </p>
                          </div>

                          {/* Right Photo (Desktop only) */}
                          {el.config.rightImage && (
                            <div className="w-full lg:w-1/4 max-w-[280px] aspect-[3/4] shrink-0 border-2 border-ink rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] order-3 lg:block hidden">
                              <img
                                src={resolveImageUrl(el.config.rightImage)}
                                alt="About Right Visual"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const parent = (e.target as HTMLImageElement).closest('div[class*="aspect-"]');
                                  if (parent) (parent as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          {/* Mobile Photos Grid (shown only on mobile/tablet) */}
                          {hasImages && (
                            <div className="grid grid-cols-2 gap-4 w-full max-w-[500px] lg:hidden order-3 pt-4">
                              {el.config.leftImage ? (
                                <div className="aspect-[3/4] border-2 border-ink rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
                                  <img
                                    src={resolveImageUrl(el.config.leftImage)}
                                    alt="About Left Visual"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const parent = (e.target as HTMLImageElement).closest('div[class*="aspect-"]');
                                      if (parent) (parent as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : <div />}
                              {el.config.rightImage ? (
                                <div className="aspect-[3/4] border-2 border-ink rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
                                  <img
                                    src={resolveImageUrl(el.config.rightImage)}
                                    alt="About Right Visual"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const parent = (e.target as HTMLImageElement).closest('div[class*="aspect-"]');
                                      if (parent) (parent as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              ) : <div />}
                            </div>
                          )}

                        </div>
                      </div>
                    </section>
                  );
                }

                case "value_props":
                  return (
                    <section key={el.id} className="bg-cream border-b-2 border-ink animate-slide-up">
                      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 sm:py-20">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                          {el.config.items?.map((item: any, idx: number) => (
                            <div key={idx} className="space-y-3 p-4 bg-background/30 rounded border border-ink/5">
                              <div className="text-xs font-mono font-extrabold text-brand-orange">
                                0{idx + 1} — PILLAR
                              </div>
                              <h3 className="font-extrabold text-base tracking-wide text-ink">
                                {item.title}
                              </h3>
                              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                {item.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  );

                case "faq":
                  return (
                    <section key={el.id} className="bg-background py-16 sm:py-24 border-b-2 border-ink animate-slide-up">
                      <div className="max-w-[1000px] mx-auto px-5">
                        <div className="border-2 border-ink bg-cream/40 rounded-2xl p-6 sm:p-10 shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] flex flex-col md:flex-row items-center justify-between gap-8">
                          {/* Mascot Visual */}
                          <div className="relative shrink-0 flex items-center justify-center">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-ink bg-amber-100 flex items-center justify-center p-2 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
                              <img src={baraSmile} alt="Bara Mascot" className="w-full h-full object-contain" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-brand-orange text-ink font-mono font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-ink shadow-xs">
                              💬 AI ASSISTANT
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="text-xs tracking-[0.3em] text-brand-orange font-bold uppercase">
                              PUSAT BANTUAN & FAQ
                            </div>
                            <h2 className="display text-2xl sm:text-4xl text-ink font-bold uppercase leading-tight">
                              Ada Pertanyaan? Tanya Bara Aja!
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed max-w-lg">
                              Punya pertanyaan seputar ukuran produk, estimasi Pre-Order, opsi kirim, atau mekanisme pickup di FILKOM Merch? Diskusi langsung dengan maskot Bara!
                            </p>
                          </div>

                          {/* CTA Button */}
                          <div className="shrink-0 w-full md:w-auto">
                            <Link
                              to="/faq"
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-ink text-cream hover:bg-brand-orange hover:text-ink font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] transition-all transform hover:-translate-y-0.5 cursor-pointer"
                            >
                              TANYA BARA SEKARANG
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </section>
                  );

                case "limited_drop": {
                  const resolvedProduct = products.find((p) => p.id === el.config.productSlug) || products[0];

                  if (!resolvedProduct) return null;

                  return (
                    <section key={el.id} className="bg-ink text-cream py-16 sm:py-24 border-b-2 border-ink overflow-hidden animate-slide-up">
                      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 grid lg:grid-cols-12 gap-10 items-center">
                        <div className="lg:col-span-7 space-y-6">
                          <div className="inline-block bg-brand-orange text-ink font-mono font-extrabold text-[9px] sm:text-[10px] tracking-widest px-3 py-1 rounded-full uppercase shadow">
                            🔥 Pre-Order Campaign / Limited Drop
                          </div>

                          <h2 className="display text-4xl sm:text-6xl lg:text-[76px] leading-[0.95] text-cream font-bold uppercase tracking-wide">
                            {el.config.title}
                          </h2>

                          <p className="text-cream/70 text-sm sm:text-base max-w-lg leading-relaxed font-medium">
                            {el.config.subtitle}
                          </p>

                          {/* Urgency Progress bar */}
                          <div className="space-y-2 max-w-md bg-white/5 border border-white/10 p-4 rounded shadow-md">
                            <div className="flex justify-between text-[10px] sm:text-xs tracking-wider font-extrabold">
                              <span className="text-brand-orange">STOCK RUNNING OUT FAST!</span>
                              <span>
                                {el.config.stockCurrent} / {el.config.stockMax} Pcs
                              </span>
                            </div>
                            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-brand-orange h-full animate-pulse"
                                style={{
                                  width: `${(el.config.stockCurrent / el.config.stockMax) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-cream/50 font-mono">
                              ⚠️ Hanya sisa {el.config.stockMax - el.config.stockCurrent} pcs di batch
                              ini. Kehabisan harus menunggu semester depan.
                            </p>
                          </div>

                          {/* Dynamic Countdown */}
                          {el.config.countdownEnd && (
                            <div className="space-y-2.5">
                              <div className="text-[10px] tracking-widest text-cream/50 font-bold uppercase">
                                WAKTU PRE-ORDER TERSISA:
                              </div>
                              <div className="flex text-cream">
                                <CountdownTimer targetDate={el.config.countdownEnd} />
                              </div>
                            </div>
                          )}

                          <div className="pt-4 flex flex-wrap gap-4">
                            <Link
                              to="/product/$slug"
                              params={{ slug: resolvedProduct.id }}
                              className="bg-brand-orange hover:bg-cream text-ink hover:text-ink px-8 py-4 text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 cursor-pointer block"
                            >
                              PRE-ORDER NOW →
                            </Link>
                          </div>
                        </div>

                        <div className="lg:col-span-5 relative aspect-[4/5] border-4 border-cream rounded shadow-2xl bg-neutral-900 overflow-hidden">
                          <img
                            src={resolveImageUrl(el.config.image || resolvedProduct.img)}
                            alt={el.config.title}
                            className="w-full h-full object-cover mix-blend-normal opacity-95 group-hover:scale-102 transition-transform duration-500"
                          />
                        </div>
                      </div>
                    </section>
                  );
                }

                case "bundle_recommendation": {
                  const dbBundles = dbProducts.filter(
                    (p) =>
                      p.category_slug === "bundle" ||
                      p.category_slug === "bundles" ||
                      p.product_type === "bundle"
                  );
                  const bundlesToRender =
                    dbBundles.length > 0
                      ? dbBundles.map((p: any) => {
                          const activePriceStr = getActivePriceForCard(p, user);
                        const activePriceNum = parsePrice(activePriceStr);

                        const originalPriceVal = p.rawOriginalPrice !== null && p.rawOriginalPrice > activePriceNum
                          ? formatRp(p.rawOriginalPrice)
                          : p.rawPrice > activePriceNum
                            ? formatRp(p.rawPrice)
                            : p.was;

                        let saveText = "Save up to 15%";
                        const comparePrice = p.rawOriginalPrice || p.rawPrice;
                        if (comparePrice && comparePrice > activePriceNum) {
                          const pct = Math.round(((comparePrice - activePriceNum) / comparePrice) * 100);
                          saveText = `Save ${pct}%`;
                        }

                        return {
                          id: p.id,
                          name: p.name,
                          price: activePriceStr,
                          originalPrice: originalPriceVal,
                          description: p.description || "",
                          img: p.img,
                          bundleComponents: p.bundle_components || [],
                          saveText,
                          isReal: true,
                          rawProduct: p,
                        };
                      })
                      : (el.config.items || []).map((bundle: any) => ({
                        ...bundle,
                        img: bundle.image || pTote,
                        bundleComponents: [],
                        saveText: bundle.saveText || "Save 20%",
                        isReal: false,
                      }));

                  return (
                    <div key={el.id}>
                      <section className="bg-cream py-10 sm:py-16 border-b-2 border-ink animate-slide-up">
                        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
                          <div className="text-center mb-8">
                            {el.config.subtitle && (
                              <div className="text-[10px] sm:text-xs tracking-[0.3em] text-brand-orange font-bold mb-1.5 uppercase">
                                {el.config.subtitle}
                              </div>
                            )}
                            <h2 className="display text-2xl sm:text-4xl lg:text-5xl text-ink font-bold uppercase">
                              {el.config.title || "Exclusive Bundles"}
                            </h2>
                          </div>
                          {!canSeeProducts ? (
                            <PreOrderNotOpenPlaceholder campaign={activePoCampaign} />
                          ) : (
                            <div className="flex flex-wrap justify-center gap-3.5 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
                              {bundlesToRender.map((bundle: any, bIdx: number) => (
                              <div
                                key={bIdx}
                                className="group flex flex-col border-2 border-ink bg-background rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all duration-200 w-[calc(50%-0.5rem)] sm:w-[200px] md:w-[230px] shrink-0"
                              >
                                {/* Top Full-Width Rigid 1:1 Aspect-Square Cover Photo */}
                                <div className="relative w-full aspect-square border-b-2 border-ink bg-secondary overflow-hidden group">
                                  <img
                                    src={resolveImageUrl(bundle.img || pTote)}
                                    alt={bundle.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  {bundle.saveText && (
                                    <div className="absolute top-2 left-2 bg-brand-orange text-ink font-mono font-black text-[9px] tracking-wider px-2 py-0.5 rounded-full border border-ink shadow-xs uppercase">
                                      🔥 {bundle.saveText}
                                    </div>
                                  )}
                                </div>

                                  {/* Details Content Body Below Image */}
                                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                                  <div>
                                    {/* Header: Title Only */}
                                    <div className="pb-1.5 border-b border-border">
                                      <h3 className="font-extrabold text-xs sm:text-sm text-ink uppercase tracking-wide leading-tight">
                                        {bundle.name}
                                      </h3>
                                    </div>

                                    {/* Included Components Grid */}
                                    <div className="mt-2 space-y-1">
                                      <div className="text-[8.5px] font-black text-ink uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                                        PAKET BUNDLE:
                                      </div>

                                      {bundle.bundleComponents && bundle.bundleComponents.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-1">
                                          {bundle.bundleComponents.map((comp: any, compIdx: number) => (
                                            <div
                                              key={comp.id || compIdx}
                                              className="flex items-center gap-1.5 p-1 bg-secondary/60 border border-ink/15 rounded-md shadow-2xs"
                                            >
                                              <img
                                                src={resolveImageUrl(comp.image_url || comp.img || pTee2)}
                                                alt={comp.name}
                                                className="w-6 h-6 object-cover rounded border border-ink/20 shrink-0"
                                              />
                                              <div className="min-w-0 flex-1 leading-tight">
                                                <p className="font-extrabold text-ink text-[9px] uppercase truncate">
                                                  {comp.name}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : bundle.itemsList ? (
                                        <div className="grid grid-cols-1 gap-1">
                                          {bundle.itemsList.split(",").map((it: string, itIdx: number) => {
                                            const trimmedName = it.trim();
                                            const matchProd = products.find(
                                              (p) => p.name.toLowerCase().includes(trimmedName.toLowerCase())
                                            );
                                            const compImg = matchProd?.img || (itIdx % 2 === 0 ? pTshirt : pHoodie);

                                            return (
                                              <div
                                                key={itIdx}
                                                className="flex items-center gap-1.5 p-1 bg-secondary/60 border border-ink/15 rounded-md shadow-2xs"
                                              >
                                                <img
                                                  src={resolveImageUrl(compImg)}
                                                  alt={trimmedName}
                                                  className="w-6 h-6 object-cover rounded border border-ink/20 shrink-0"
                                                />
                                                <div className="min-w-0 flex-1 leading-tight">
                                                  <p className="font-extrabold text-ink text-[9px] uppercase truncate">
                                                    {trimmedName}
                                                  </p>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>

                                    {/* Price Below Bundle List */}
                                    <div className="mt-2.5 pt-2 border-t border-border flex items-baseline justify-between">
                                      {bundle.originalPrice && (
                                        <span className="text-[10px] font-extrabold text-red-500 line-through leading-none">
                                          {bundle.originalPrice}
                                        </span>
                                      )}
                                      <span className="text-base sm:text-lg font-black text-brand-orange leading-tight ml-auto">
                                        {bundle.price}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action Button - Redirect to Product Detail */}
                                  <div className="pt-2 border-t border-border w-full">
                                    <button
                                      onClick={() => {
                                        if (bundle.isReal && bundle.rawProduct) {
                                          navigate({ to: "/product/$slug", params: { slug: bundle.rawProduct.id } });
                                        } else if (bundle.link) {
                                          navigate({ to: bundle.link });
                                        } else {
                                          scrollToId("shop");
                                        }
                                      }}
                                      title="Pesan Sekarang"
                                      className="w-full h-8 rounded-lg bg-brand-orange hover:bg-cream text-ink border border-ink shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-black uppercase"
                                    >
                                      <span>Detail Produk</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          )}
                        </div>
                      </section>

                      {/* All Products Section */}
                      {(() => {
                        const allOthers = products.filter((p) => {
                          const catName = (p.category_name || "").toLowerCase();
                          const catSlug = (p.category_slug || "").toLowerCase();
                          const isHero = p.product_type !== "bundle" && (catName === "main hero" || catSlug === "main-hero");
                          const isBundle = p.cat?.toUpperCase() === "BUNDLE" || p.product_type === "bundle";
                          return !isHero && !isBundle;
                        });

                        if (allOthers.length === 0) return null;

                        return (
                          <section id="all-products-homepage" className="bg-cream py-10 sm:py-16 border-b-2 border-ink animate-slide-up scroll-mt-32 w-full">
                            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
                              <div className="flex flex-col items-center text-center mb-8 gap-1">
                                <div className="text-[10px] sm:text-xs tracking-[0.3em] text-brand-orange font-bold mb-1.5 uppercase">
                                  03 — ALL PRODUCTS
                                </div>
                                <h2 className="display text-2xl sm:text-4xl lg:text-5xl text-ink font-bold uppercase">
                                  SEMUA KATALOG PRODUK
                                </h2>
                              </div>

                              <div className="flex flex-wrap justify-center gap-3.5 sm:gap-6 lg:gap-8 max-w-7xl mx-auto">
                                {allOthers.map((p) => (
                                  <div
                                    key={p.id}
                                    className="group flex flex-col border-2 border-ink bg-background rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all duration-200 w-[calc(50%-0.5rem)] sm:w-[200px] md:w-[230px] shrink-0"
                                  >
                                    <Link
                                      to="/product/$slug"
                                      params={{ slug: p.id }}
                                      className="relative aspect-square overflow-hidden block border-b-2 border-ink bg-secondary"
                                    >
                                      <img
                                        src={resolveImageUrl(p.img)}
                                        alt={p.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      />
                                      <span className="absolute top-2 left-2 bg-brand-orange text-ink font-mono font-black text-[9px] tracking-wider px-2 py-0.5 rounded-full border border-ink shadow-xs uppercase">
                                        PO
                                      </span>
                                    </Link>

                                    <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                                      <div>
                                        <div className="pb-1.5 border-b border-border">
                                          <div className="text-[9px] font-extrabold tracking-widest text-brand-orange uppercase mb-1">
                                            {p.cat}
                                          </div>
                                          <h3 className="font-extrabold text-xs sm:text-sm text-ink uppercase tracking-wide leading-tight">
                                            {p.name}
                                          </h3>
                                        </div>
                                      </div>

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
                            </div>
                          </section>
                        );
                      })()}
                    </div>
                  );
                }

                case "gallery":
                  return (
                    <section key={el.id} className="bg-background py-16 sm:py-24 border-b-2 border-ink animate-slide-up">
                      <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
                        <div className="text-center mb-12">
                          {el.config.subtitle && (
                            <div className="text-xs tracking-[0.35em] text-brand-orange font-bold mb-2 uppercase">
                              {el.config.subtitle}
                            </div>
                          )}
                          <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase">
                            {el.config.title || "Campus Lookbook"}
                          </h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                          {(el.config.items || []).map((photo: any, gIdx: number) => {
                            const defaultPhotos = [varsityEdutech, workJacket, pVarsity, pHoodie];
                            const sourceImg = photo.image ? resolveImageUrl(photo.image) : defaultPhotos[gIdx % defaultPhotos.length];
                            return (
                              <div
                                key={photo.id || gIdx}
                                className="group relative aspect-[4/5] bg-cream border-2 border-ink rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-y-[-4px] transition-all duration-300"
                              >
                                <img
                                  src={sourceImg}
                                  alt={photo.caption || "Lifestyle Gallery"}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 sm:p-5 flex flex-col justify-end">
                                  <p className="text-xs sm:text-sm font-bold text-cream leading-tight">
                                    {photo.caption}
                                  </p>
                                  <span className="text-[10px] text-brand-orange font-mono mt-1.5 uppercase tracking-widest font-extrabold flex items-center gap-1">
                                    <Instagram className="w-3.5 h-3.5" /> SHOP THE LOOK
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  );

                case "testimonial":
                  return (
                    <section key={el.id} className="bg-cream py-16 sm:py-24 border-b-2 border-ink animate-slide-up">
                      <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
                        <div className="text-center mb-12">
                          {el.config.subtitle && (
                            <div className="text-xs tracking-[0.35em] text-brand-orange font-bold mb-2 uppercase">
                              {el.config.subtitle}
                            </div>
                          )}
                          <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase">
                            {el.config.title || "Campus Voices"}
                          </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
                          {(el.config.items || []).map((t: any, tIdx: number) => (
                            <div
                              key={t.id || tIdx}
                              className="bg-background border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] flex flex-col justify-between"
                            >
                              <div className="space-y-4">
                                <div className="flex text-brand-orange">
                                  {Array.from({ length: 5 }).map((_, starI) => (
                                    <Star key={starI} className="w-4 h-4 fill-current" />
                                  ))}
                                </div>
                                <blockquote className="text-sm sm:text-base text-ink font-semibold italic leading-relaxed">
                                  &ldquo;{t.content}&rdquo;
                                </blockquote>
                              </div>

                              <div className="flex items-center gap-3.5 mt-6 pt-5 border-t border-border">
                                <div className="w-10 h-10 rounded-full bg-brand-orange text-ink border-2 border-ink flex items-center justify-center font-extrabold text-sm shadow-sm uppercase">
                                  {t.name?.slice(0, 2) || "FM"}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-sm text-ink leading-tight">
                                    {t.name}
                                  </h4>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                                    {t.role}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  );

                default:
                  return null;
              }
            })}
          </ScrollFadeSegment>
        ))}


      {/* 10. Footer */}
      <Footer />



      {/* Quick View Dialog / Modal overlay */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setQuickViewProduct(null)} />
          <div className="relative bg-background border-4 border-ink rounded-lg w-full max-w-4xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 z-10 animate-scale-in max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 p-2 rounded border-2 border-ink bg-cream text-ink hover:bg-ink hover:text-cream transition-colors z-20 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left Image column */}
            <div className="w-full md:w-1/2 aspect-[4/5] bg-secondary border-2 border-ink rounded overflow-hidden relative">
              <img
                src={resolveImageUrl(quickViewProduct.img)}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover"
              />
              {quickViewProduct.tag && (
                <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-2.5 py-1 bg-ink text-cream rounded uppercase">
                  {quickViewProduct.tag}
                </span>
              )}
            </div>

            {/* Right Details column */}
            <div className="w-full md:w-1/2 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-brand-orange uppercase mb-1">
                  {quickViewProduct.cat}
                </div>
                <h3 className="display text-xl sm:text-3xl text-ink font-bold uppercase leading-none tracking-wide mb-3">
                  {quickViewProduct.name}
                </h3>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-xl font-extrabold text-ink">{getActivePriceForCard(quickViewProduct, user)}</span>
                  {(quickViewProduct.was || (quickViewProduct.filkom_price && user?.is_filkom_verified === 1 && Number(quickViewProduct.filkom_price) < (quickViewProduct.rawPrice || 0))) && (
                    <span className="text-sm text-muted-foreground line-through font-bold">
                      {quickViewProduct.was || quickViewProduct.price}
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-medium">
                  {quickViewProduct.name.includes("Varsity")
                    ? "Varsity Jacket edisi khusus civitas akademika Fakultas Ilmu Komputer Universitas Brawijaya. Terbuat dari cotton fleece premium 330gsm dengan jahitan double-stitch, furing katun adem, kancing snap metal anti-karat, dan bordir komputer timbul super tebal (chenille embroidery) khas varsity retail."
                    : quickViewProduct.name.includes("Hoodie")
                      ? "Heavyweight Hoodie dengan cuttingan boxy khas fashion modern. Sangat pas untuk ngoding semalaman, melindungi tubuh dari angin malam AC gazebo. Terbuat dari katun fleece 300gsm tebal dengan kap kepala double layer."
                      : quickViewProduct.name.includes("Tee")
                        ? "T-Shirt harian berbahan katun kombed 24s premium (Twill combed) bertekstur lembut dan menyerap keringat. Sablon presisi tinggi tahan cuci dengan desain grafis ikonik representasi kehidupan programmer FILKOM."
                        : "Aksesoris eksklusif penunjang identitas mahasiswa FILKOM UB. Dibuat dengan material kokoh berdaya tahan tinggi, cocok dipakai kuliah harian maupun kegiatan praktikum."}
                </p>

                {/* Size Selector */}
                {getProductAvailableSizes(quickViewProduct).length > 0 && (
                  <div className="space-y-2 mb-6 animate-scale-in">
                    <span className="text-xs font-bold text-ink tracking-wider uppercase block">
                      PILIH UKURAN:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {getProductAvailableSizes(quickViewProduct).map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            addToCart(quickViewProduct, size);
                            setQuickViewProduct(null);
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
                    addToCart(quickViewProduct);
                    setQuickViewProduct(null);
                  }}
                  className="flex-1 bg-ink text-cream font-bold tracking-widest text-xs py-4 text-center hover:bg-brand-orange hover:text-cream transition-all duration-200 uppercase cursor-pointer"
                >
                  ADD TO BAG
                </button>
                <button
                  onClick={() => {
                    toggleWishlist(quickViewProduct.id);
                  }}
                  className="border-2 border-ink font-bold text-xs p-4 flex items-center justify-center hover:bg-ink hover:text-cream transition-all duration-200 cursor-pointer"
                  aria-label="Wishlist toggle"
                >
                  <Heart
                    className={`w-4 h-4 ${wishlist.includes(quickViewProduct.id) ? "fill-red-500 text-red-500" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
