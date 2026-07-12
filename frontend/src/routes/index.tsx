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
import { useMemo, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { ProductWithVariants } from "@backend/server-actions";
import { VerificationModal } from "@frontend/components/VerificationModal";
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

export const Route = createFileRoute("/")({
  loader: async () => {
    const { getProducts, getStoreSettings, getCategories } = await import("@backend/server-actions");
    const [productsRes, settingsRes, categoriesRes] = await Promise.all([
      getProducts(),
      getStoreSettings(),
      getCategories(),
    ]);

    const dbProducts = productsRes.products || [];
    const settings = settingsRes.settings || null;

    const formattedProducts = dbProducts.map((product: ProductWithVariants) => {
      const productName = product.name.toLowerCase();
      const cat: Filter =
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
        is_best_seller: product.is_best_seller,
        is_limited: product.is_limited,
        is_featured: product.is_featured,
        sale_type: product.sale_type,
        variants: product.variants || [],
        description: product.description,
        category_id: product.category_id,
        category_slug: product.category_slug,
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

const FILTERS = ["ALL", "JACKET", "HOODIE", "TEE", "ACCESSORIES"] as const;
type Filter = (typeof FILTERS)[number];

type ProductCard = {
  id: string;
  img: string;
  name: string;
  price: string;
  was?: string;
  tag?: string;
  cat: Filter;
  product_id?: number;
  is_best_seller?: boolean;
  is_limited?: boolean;
  is_featured?: boolean;
  sale_type?: string | null;
  variants?: any[];
  description?: string | null;
  category_id?: number;
  category_slug?: string | null;
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

function parsePrice(p: string) {
  return Number(p.replace(/[^0-9]/g, ""));
}

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
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
              className={`h-2.5 rounded-full transition-all duration-300 border border-ink cursor-pointer ${
                index === current
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

function Index() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductCard | null>(null);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});

  const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);

  // Load wishlist & cart from localStorage
  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem("wishlist");
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
      const savedCart = localStorage.getItem("indexCart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
    setCartLoaded(true);
  }, []);

  // Sync cart to localStorage
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem("indexCart", JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

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

  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const { products: loaderProducts, settings, categories } = Route.useLoaderData();
  const dbProducts = loaderProducts;

  // Merge database layout configuration with default segments list
  const segments = useMemo((): HomepageSegment[] => {
    if (!settings?.homepage_layout) {
      return getDefaultSegments();
    }
    try {
      const parsed = JSON.parse(settings.homepage_layout);
      return convertLegacyToSegments(parsed);
    } catch {
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
      whyDesc3: "Pesan online, ambil langsung di Gazebo FILKOM UB tanpa biaya kirim sepeser pun.",
      whyTitle4: "Pembayaran Instan",
      whyDesc4:
        "Mendukung pembayaran otomatis QRIS, ShopeePay, GoPay, dan transfer bank via Midtrans.",

      faqQ1: "Apakah produk ini resmi (official) dari FILKOM?",
      faqA1:
        "Ya, Filkom Merchandise adalah toko merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya yang bekerjasama dengan pihak fakultas dan BEM FILKOM UB.",
      faqQ2: "Bagaimana cara mengambil pesanan saya?",
      faqA2:
        "Anda dapat memilih metode pengambilan 'Pickup di Kampus' saat checkout. Tim kami akan bersiap di Gazebo FILKOM UB pada jadwal pengambilan yang diinfokan via WhatsApp.",
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
  const addToCart = useCallback((p: ProductCard, selectedSize?: string) => {
    const variants = p.variants || [];
    const sizeToUse = selectedSize || variants[0]?.size || "One Size";
    const matchingVariant = variants.find((v: any) => v.size === sizeToUse) || variants[0];

    const itemId = selectedSize ? `${p.id}-${selectedSize}` : p.id;
    const itemName = selectedSize ? `${p.name} — ${selectedSize}` : p.name;

    setCart((c) => {
      const existing = c.find((i) => i.id === itemId);
      if (existing) return c.map((i) => (i.id === itemId ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...c,
        {
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
        },
      ];
    });
    setCartOpen(true);
    toast.success("Added to bag", { description: itemName });
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((c) =>
      c.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((c) => c.filter((i) => i.id !== id));
  }, []);

  const handleNav = (item: (typeof NAV)[number]) => {
    setMenuOpen(false);
    if (item.isScroll) {
      scrollToId(item.target);
    } else {
      navigate({ to: item.href as any });
    }
  };

  const handleCheckout = () => {
    if (!cart.length) {
      toast.error("Your cart is empty");
      return;
    }

    if (!user) {
      toast.error("Please sign in to checkout");
      navigate({ to: "/login" });
      return;
    }

    const checkoutCart = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: parsePrice(item.price),
      quantity: item.qty,
      product_id: item.product_id,
      variant_id: item.variant_id,
      size: item.size,
      color: item.color,
      image_url: item.img || item.image_url || "",
      category: item.name.includes("Varsity")
        ? "JACKET"
        : item.name.includes("Hoodie")
          ? "HOODIE"
          : item.name.includes("Tee")
            ? "TEE"
            : "ACCESSORIES",
    }));

    localStorage.setItem("cart", JSON.stringify(checkoutCart));
    navigate({ to: "/checkout" });
    setCartOpen(false);
  };

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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b-2 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-10 flex items-center justify-between h-16 sm:h-20">
          <Link
            to="/"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                scrollToId("top");
              }
            }}
            className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <img
                src={logo}
                alt="Filkom Merch UB"
                className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover ring-2 ring-ink shadow-sm"
              />
              <img
                src={logoFilkom}
                alt="Logo FILKOM UB"
                className="h-8 w-8 sm:h-11 sm:w-11 object-contain"
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="display text-lg text-ink flex items-center gap-1.5 font-extrabold uppercase tracking-wide">
                Filkom Merch
                <span className="text-[8px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">
                  OFFICIAL
                </span>
              </div>
              <div className="text-[9px] tracking-[0.32em] text-muted-foreground font-black">
                UNIVERSITAS BRAWIJAYA
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV.map((n) => {
              const isActive = pathname === n.href || (n.href === "/" && pathname === "/" && !hash);
              const isScrollOnHome = n.isScroll && pathname === "/";

              if (isScrollOnHome) {
                return (
                  <button
                    key={n.label}
                    onClick={() => scrollToId(n.target!)}
                    className={`text-[11px] font-bold tracking-[0.2em] transition-colors cursor-pointer uppercase ${
                      isActive
                        ? "text-brand-orange border-b-2 border-brand-orange"
                        : "text-ink hover:text-brand-orange"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              }

              return (
                <Link
                  key={n.label}
                  to={n.href.startsWith("/#") ? "/" : (n.href as any)}
                  hash={n.isScroll ? n.target : undefined}
                  className={`text-[11px] font-bold tracking-[0.2em] transition-colors uppercase ${
                    isActive
                      ? "text-brand-orange border-b-2 border-brand-orange"
                      : "text-ink hover:text-brand-orange"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 text-ink">
            <HackerModeToggle />
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="hover:text-brand-orange transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                aria-label="Account"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="hover:text-brand-orange transition-colors"
              >
                <User className="w-5 h-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 min-w-[240px] w-max max-w-[320px] bg-background border-2 border-ink rounded-lg shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] z-50 animate-scale-in">
                  {user ? (
                    <>
                      <div className="px-5 py-3 border-b border-border">
                        <p className="text-sm font-bold text-foreground break-words">
                          {user.type === "admin" ? user.username : user.name}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-900 rounded">
                          {user.type === "admin" ? "ADMIN" : "BUYER"}
                        </span>
                        {user && (
                          <div className="mt-1.5">
                            {user.is_filkom_verified === 1 ? (
                              <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                                ✓ FILKOM VERIFIED
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsVerifyOpen(true);
                                  setUserMenuOpen(false);
                                }}
                                className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 border border-brand-orange/30 px-2 py-1 rounded w-full text-center transition-all cursor-pointer block"
                              >
                                Verifikasi NIM
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {user.type === "admin" && (
                        <Link
                          to="/admin/dashboard"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border font-bold text-brand-blue"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Panel Admin
                        </Link>
                      )}
                      {user.type === "admin" && (
                        <Link
                          to="/pos"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border font-bold text-brand-orange"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <MonitorSmartphone className="w-4 h-4" />
                          Kasir / POS
                        </Link>
                      )}
                      {user && (
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
                        className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="block px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>
            <button
              aria-label="Cart"
              className="relative hover:text-brand-orange transition-colors"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-orange text-cream text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button aria-label="Menu" className="lg:hidden" onClick={() => setMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="border-t border-border bg-background animate-slide-down">
            <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-4 flex items-center gap-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value) scrollToId("shop");
                }}
                placeholder="Cari produk…"
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-muted-foreground"
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      <div id="top" />

      {/* Modular Builder segments renderer */}
      {segments
        .filter((seg) => seg.enabled)
        .map((seg) => (
          <div key={seg.id} className="w-full">
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

                  return (
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

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                          {gridProducts.map((p) => (
                            <div
                              key={p.id}
                              className="group flex flex-col border-2 border-ink bg-cream rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-y-[-4px] transition-all duration-300"
                            >
                              <Link
                                to="/product/$slug"
                                params={{ slug: p.id }}
                                className="relative aspect-[4/5] overflow-hidden block border-b-2 border-ink bg-secondary animate-fade-in"
                              >
                                <img
                                  src={resolveImageUrl(p.img)}
                                  alt={p.name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                {p.tag && (
                                  <span className="absolute top-3 left-3 text-[9px] font-bold tracking-widest px-2.5 py-1 bg-ink text-cream rounded-full uppercase">
                                    {p.tag}
                                  </span>
                                )}
                              </Link>
                              <div className="p-5 flex flex-col flex-1">
                                <div className="text-[10px] font-bold tracking-widest text-brand-orange uppercase mb-1">
                                  {p.cat}
                                </div>
                                <Link
                                  to="/product/$slug"
                                  params={{ slug: p.id }}
                                  className="hover:text-brand-orange transition-colors"
                                >
                                  <h3 className="text-base font-bold text-ink leading-snug tracking-wide line-clamp-1 mb-1">
                                    {p.name}
                                  </h3>
                                </Link>
                                {p.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                    {p.description}
                                  </p>
                                )}
                                <div className="flex items-baseline gap-2 mt-auto">
                                  <span className="text-base font-extrabold text-ink">{p.price}</span>
                                  {p.was && (
                                    <span className="text-xs text-muted-foreground line-through font-bold">
                                      {p.was}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
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
                                className="group text-left border-2 border-ink rounded-lg bg-background p-4 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-y-[-4px] transition-all duration-300 flex flex-col h-full cursor-pointer overflow-visible"
                              >
                                <div className="relative aspect-square w-full mb-6 shrink-0 overflow-visible flex items-center justify-center pt-2">
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

                case "text_block":
                  return (
                    <section
                      key={el.id}
                      className="bg-background py-16 sm:py-24 border-b-2 border-ink animate-slide-up"
                    >
                      <div className="max-w-[800px] mx-auto px-5 text-center">
                        <div
                          className="space-y-4 sm:space-y-6"
                          style={{ textAlign: el.config.alignment || "center" }}
                        >
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
                      </div>
                    </section>
                  );

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
                        <div className="text-center mb-12">
                          <div className="text-xs tracking-[0.3em] text-brand-orange font-bold mb-2 uppercase">
                            TANYA BARA / FAQ
                          </div>
                          <h2 className="display text-3xl sm:text-5xl text-ink font-bold uppercase">
                            Pertanyaan Umum.
                          </h2>
                        </div>

                        <div className="space-y-4">
                          {el.config.items?.map((item: any) => (
                            <div
                              key={item.id}
                              className="border-2 border-ink rounded-lg bg-cream/35 overflow-hidden shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                            >
                              <details className="group [&_summary::-webkit-details-marker]:hidden">
                                <summary className="flex items-center justify-between p-5 text-ink font-bold text-sm sm:text-base cursor-pointer hover:bg-cream/70 select-none">
                                  <span>{item.q}</span>
                                  <span className="ml-1.5 shrink-0 rounded-full border-2 border-ink p-1 bg-background text-ink group-open:rotate-180 transition-transform duration-300">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </span>
                                </summary>
                                <div className="p-5 border-t-2 border-ink bg-background text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium whitespace-pre-line">
                                  {item.a}
                                </div>
                              </details>
                            </div>
                          ))}
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

                case "bundle_recommendation":
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
                            {el.config.title || "Rekomendasi Bundling"}
                          </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                          {(el.config.items || []).map((bundle: any, bIdx: number) => (
                            <div
                              key={bIdx}
                              className="border-2 border-ink bg-background rounded-xl p-6 sm:p-8 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] transition-all duration-200"
                            >
                              <div>
                                <div className="flex justify-between items-start gap-4 mb-4">
                                  <div>
                                    <span className="text-[9px] font-extrabold tracking-widest text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded-full uppercase">
                                      Save up to 15%
                                    </span>
                                    <h3 className="font-extrabold text-xl sm:text-2xl text-ink mt-2 uppercase tracking-wide">
                                      {bundle.name}
                                    </h3>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs text-muted-foreground line-through block font-bold">
                                      {bundle.originalPrice}
                                    </span>
                                    <span className="text-lg sm:text-xl font-black text-brand-orange block">
                                      {bundle.price}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-6">
                                  {bundle.description}
                                </p>

                                <div className="space-y-2 mb-8">
                                  <div className="text-[10px] font-bold text-ink uppercase tracking-wider mb-2">
                                    ISI BUNDLE:
                                  </div>
                                  {(bundle.itemsList || "").split(",").map((it: string, itIdx: number) => (
                                    <div key={itIdx} className="flex items-center gap-2 text-xs font-semibold text-ink">
                                      <Check className="w-4 h-4 text-brand-orange shrink-0" />
                                      <span>{it.trim()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  if (bundle.link) {
                                    navigate({ to: bundle.link });
                                  } else {
                                    scrollToId("shop");
                                  }
                                }}
                                className="w-full text-center py-3 bg-ink hover:bg-brand-orange text-cream hover:text-ink font-bold text-xs tracking-widest uppercase transition-all duration-300 border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none cursor-pointer font-extrabold"
                              >
                                ORDER BUNDLE NOW
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  );

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
          </div>
        ))}

      {/* Trust Indicators Row before Footer */}
      <section className="bg-cream py-6 border-b-2 border-ink shadow-sm">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-ink font-bold font-mono">
            <Lock className="w-4 h-4 text-brand-orange" /> SECURED BY MIDTRANS
          </div>
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-ink font-bold font-mono">
            <User className="w-4 h-4 text-brand-orange" /> GOOGLE STUDENT LOGIN
          </div>
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-ink font-bold font-mono">
            <Check className="w-4 h-4 text-brand-orange" /> BEM FILKOM PARTNER
          </div>
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-ink font-bold font-mono">
            <ShieldCheck className="w-4 h-4 text-brand-orange" /> 100% GARANSI PREMIUM
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="bg-background border-t border-border">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-14 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Filkom Merch logo" className="w-10 h-10 rounded-full" />
              <img src={logoFilkom} alt="FILKOM UB logo" className="w-9 h-9 object-contain" />
              <span className="display text-lg text-ink font-bold">Filkom Merch</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed font-medium">
              Official store Universitas Brawijaya. Bekerjasama langsung dengan Fakultas Ilmu
              Komputer (FILKOM) dan BEM FILKOM UB.
            </p>
            <div className="flex gap-3 mt-5 text-ink">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="hover:text-brand-orange transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="hover:text-brand-orange transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
          {[
            { title: "SHOP", items: ["New Drop", "Jackets", "Hoodies", "Tees", "Accessories"] },
            { title: "BANTUAN", items: ["Size Guide", "Shipping", "Returns", "FAQ"] },
            { title: "TENTANG", items: ["Cerita Kami", "Lookbook", "Kontak", "Pre-Order"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-xs font-bold tracking-[0.2em] text-ink mb-4">{col.title}</div>
              <ul className="space-y-2 text-sm text-muted-foreground font-medium">
                {col.items.map((i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        scrollToId(col.title === "SHOP" ? "shop" : "about");
                      }}
                      className="hover:text-ink text-left transition-colors cursor-pointer"
                    >
                      {i}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="text-xs font-bold tracking-[0.2em] text-ink mb-4">
              KONTAK (WA SUPPORT)
            </div>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://wa.me/6282235526105?text=Halo%20Admin%20Aliya,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-brand-orange text-xs text-muted-foreground hover:font-bold transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  Admin Aliya (Tanya Produk)
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/6282287190402?text=Halo%20Admin%20Puty,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-brand-orange text-xs text-muted-foreground hover:font-bold transition-all"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  Admin Puty (Keluhan & Custom)
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-5 flex flex-col md:flex-row justify-between gap-2 text-xs text-muted-foreground">
            <div>© 2026 Filkom Merch UB · Official student merchandise.</div>
            <div>Made with ♥ in Malang. Integrated with Midtrans Payment.</div>
          </div>
        </div>
      </footer>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ink text-cream flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 sm:px-5 h-16 sm:h-20 border-b border-cream/20">
            <span className="display text-lg font-bold">Filkom Merch</span>
            <button
              onClick={() => {
                setMenuOpen(false);
                setUserMenuOpen(false);
              }}
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col px-5 py-6 sm:py-8 gap-1">
            {NAV.map((n, idx) => (
              <Link
                key={n.label}
                to={n.href.startsWith("/#") ? "/" : (n.href as any)}
                hash={n.isScroll ? n.target : undefined}
                onClick={() => {
                  setMenuOpen(false);
                  setUserMenuOpen(false);
                }}
                className="display text-3xl sm:text-4xl text-left py-2.5 sm:py-3 hover:text-brand-orange transition-colors animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in">
          <div
            className="hidden sm:block flex-1 bg-ink/50 backdrop-blur-sm"
            onClick={() => {
              setCartOpen(false);
              setUserMenuOpen(false);
            }}
          />
          <aside className="w-full sm:max-w-md bg-background text-foreground flex flex-col shadow-2xl border-l border-ink">
            <div className="flex items-center justify-between h-20 px-6 border-b border-border">
              <div>
                <div className="display text-2xl text-ink font-bold">Your Bag</div>
                <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">
                  {cartCount} ITEMS
                </div>
              </div>
              <button
                onClick={() => {
                  setCartOpen(false);
                  setUserMenuOpen(false);
                }}
                aria-label="Close cart"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <p className="display text-2xl text-ink font-bold">Bag is empty.</p>
                  <p className="text-sm text-muted-foreground mt-2">Tambahkan produk favoritmu.</p>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      scrollToId("shop");
                    }}
                    className="mt-6 inline-flex items-center gap-2 bg-ink text-cream px-6 py-3 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange uppercase"
                  >
                    BROWSE PRODUCTS <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {cart.map((i) => (
                    <li key={i.id} className="py-4 flex gap-4">
                      <img
                        src={resolveImageUrl(i.img)}
                        alt=""
                        className="w-20 h-24 object-cover border border-ink/10 rounded"
                      />
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between gap-2">
                          <h4 className="text-sm font-bold text-ink leading-snug">{i.name}</h4>
                          <button onClick={() => removeItem(i.id)} aria-label="Remove">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-brand-orange transition-colors" />
                          </button>
                        </div>
                        {i.size && (
                          <span className="text-[10px] bg-secondary text-ink font-bold px-1.5 py-0.5 rounded w-fit mt-1 border border-ink/10">
                            Size: {i.size}
                          </span>
                        )}
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center border-2 border-ink rounded">
                            <button
                              onClick={() => updateQty(i.id, -1)}
                              className="px-2 py-1 hover:bg-secondary cursor-pointer"
                              aria-label="Decrease"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-3 text-sm font-bold">{i.qty}</span>
                            <button
                              onClick={() => updateQty(i.id, 1)}
                              className="px-2 py-1 hover:bg-secondary cursor-pointer"
                              aria-label="Increase"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-sm font-black text-ink">
                            {formatRp(parsePrice(i.price) * i.qty)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {cart.length > 0 && (
              <div className="border-t-2 border-ink px-6 py-5 space-y-4 bg-cream">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">Subtotal</span>
                  <span className="font-black text-ink">{formatRp(cartTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-ink text-cream py-4 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow uppercase"
                >
                  CHECKOUT NOW <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

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
                  <span className="text-xl font-extrabold text-ink">{quickViewProduct.price}</span>
                  {quickViewProduct.was && (
                    <span className="text-sm text-muted-foreground line-through font-bold">
                      {quickViewProduct.was}
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

      {user?.type === "buyer" && user.is_google && user.email.endsWith("ub.ac.id") && (
        <VerificationModal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} />
      )}
    </div>
  );
}
