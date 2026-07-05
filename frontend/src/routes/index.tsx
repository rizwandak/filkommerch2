import { createFileRoute, useNavigate, Link  , useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useMemo, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import type { ProductWithVariants } from "@backend/server-actions";
import { VerificationModal } from "@frontend/components/VerificationModal";

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

export const Route = createFileRoute("/")({
  loader: async () => {
    const { getProducts, getStoreSettings } = await import("@backend/server-actions");
    const [productsRes, settingsRes] = await Promise.all([getProducts(), getStoreSettings()]);

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
        was: product.original_price ? `Rp ${product.original_price.toLocaleString("id-ID")}` : undefined,
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
      };
    });

    return { products: formattedProducts, settings };
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
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

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
        <span className="display text-base sm:text-2xl block leading-none">{String(timeLeft.days).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">Hari</span>
      </div>
      <div className="display text-lg sm:text-2xl text-ink flex items-center">:</div>
      <div className="bg-ink text-cream p-1.5 sm:p-2.5 rounded border border-cream/20 shadow-md">
        <span className="display text-base sm:text-2xl block leading-none">{String(timeLeft.hours).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">Jam</span>
      </div>
      <div className="display text-lg sm:text-2xl text-ink flex items-center">:</div>
      <div className="bg-ink text-cream p-1.5 sm:p-2.5 rounded border border-cream/20 shadow-md">
        <span className="display text-base sm:text-2xl block leading-none">{String(timeLeft.minutes).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">Min</span>
      </div>
      <div className="display text-lg sm:text-2xl text-ink flex items-center">:</div>
      <div className="bg-ink text-cream p-1.5 sm:p-2.5 rounded border border-cream/20 shadow-md">
        <span className="display text-base sm:text-2xl block leading-none">{String(timeLeft.seconds).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-cream/60 font-bold">Det</span>
      </div>
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

  const { location } = useRouterState();
  const pathname = location.pathname;
  const search = location.search.originalString || "";
  const hash = location.hash || "";

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
  const { products: loaderProducts, settings } = Route.useLoaderData();
  const dbProducts = loaderProducts;

  // Merge database layout configuration with default editorial layout
  const layout = useMemo(() => {
    const defaults = {
      heroTitle: "Wear\nYour\nFaculty.",
      heroSubtitle: "Koleksi merchandise resmi mahasiswa Fakultas Ilmu Komputer UB. Dibuat oleh mahasiswa, untuk mahasiswa premium, eksklusif, dan limited stock.",
      heroSubLabel: "FILKOM MERCH 2026",
      heroBtnText: "SHOP THE DROP",
      heroImage: "",
      marqueeText: "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN | 100% PRODUK MAHASISWA | CASHBACK 5% MEMBER | DROP BARU TIAP BULAN",
      
      heroCountdownEnd: "2026-07-15T23:59:59+07:00",
      showHeroCountdown: true,
      
      featuredProductSlugs: "varsity-filkom,hoodie-code-run,tshirt-debugging",
      
      limitedTitle: "Varsity FILKOM Edition",
      limitedSubtitle: "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
      limitedProductSlug: "varsity-filkom",
      limitedImage: "",
      limitedCountdownEnd: "2026-07-10T23:59:59+07:00",
      limitedStockMax: 100,
      limitedStockCurrent: 82,
      showLimitedDrop: true,
      
      whyTitle1: "Desain Orisinal",
      whyDesc1: "Setiap artikel dirancang eksklusif oleh mahasiswa FILKOM demi mewakili identitas kita.",
      whyTitle2: "Kualitas Premium",
      whyDesc2: "Bahan cotton fleece tebal, sablon presisi tinggi, dan jahitan standar distro internasional.",
      whyTitle3: "Bebas Ongkir Kampus",
      whyDesc3: "Pesan online, ambil langsung di Gazebo FILKOM UB tanpa biaya kirim sepeser pun.",
      whyTitle4: "Pembayaran Instan",
      whyDesc4: "Mendukung pembayaran otomatis QRIS, ShopeePay, GoPay, dan transfer bank via Midtrans.",
      
      faqQ1: "Apakah produk ini resmi (official) dari FILKOM?",
      faqA1: "Ya, Filkom Merchandise adalah toko merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya yang bekerjasama dengan pihak fakultas dan BEM FILKOM UB.",
      faqQ2: "Bagaimana cara mengambil pesanan saya?",
      faqA2: "Anda dapat memilih metode pengambilan 'Pickup di Kampus' saat checkout. Tim kami akan bersiap di Gazebo FILKOM UB pada jadwal pengambilan yang diinfokan via WhatsApp.",
      faqQ3: "Berapa lama estimasi pengerjaan barang Pre-Order?",
      faqA3: "Proses produksi barang pre-order biasanya memakan waktu 14 hingga 21 hari kerja setelah sesi pemesanan ditutup, tergantung tingkat kerumitan desain dan antrean vendor.",
      faqQ4: "Apakah saya bisa menukar ukuran pakaian jika tidak pas?",
      faqA4: "Penukaran ukuran diperbolehkan maksimal 2 hari setelah barang diterima, dengan syarat tag belum dilepas, belum dicuci, dan stok ukuran pengganti masih tersedia."
    };

    if (!settings?.homepage_layout) return defaults;
    try {
      const parsed = JSON.parse(settings.homepage_layout);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }, [settings]);

  const products = dbProducts.length > 0 ? dbProducts : FALLBACK_PRODUCTS;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);

  // Dynamic products count for categories
  const categoryCounts = useMemo(() => {
    const counts = { JACKET: 0, HOODIE: 0, TEE: 0, ACCESSORIES: 0 };
    products.forEach((p) => {
      if (p.cat in counts) {
        counts[p.cat as keyof typeof counts] += 1;
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
    const slugs = layout.featuredProductSlugs.split(",").map((s) => s.trim());
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
    if (p.variants.length === 1 && (p.variants[0].size.toLowerCase() === "all size" || p.variants[0].size.toLowerCase() === "one size")) {
      return [];
    }
    return p.variants.filter((v: any) => (v.stock || 0) > 0).map((v: any) => v.size);
  };

  // Add to cart with support for custom sizes
  const addToCart = useCallback((p: ProductCard, selectedSize?: string) => {
    const variants = p.variants || [];
    const sizeToUse = selectedSize || (variants[0]?.size || "One Size");
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
          name: itemId.includes('varsity-filkom') || itemId.includes('varsity-jacket') ? `${itemName} — Default` : itemName,
          price: p.price,
          img: p.img,
          qty: 1,
          product_id: p.product_id,
          variant_id: matchingVariant ? matchingVariant.id : undefined,
          size: sizeToUse,
          color: "Default"
        }
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
      
      {/* Announcement marquee */}
      <div className="bg-ink text-cream py-2.5 overflow-hidden border-b border-ink">
        <div className="flex marquee-track whitespace-nowrap text-[10px] sm:text-xs tracking-[0.2em] font-bold">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-10 px-5">
              {layout.marqueeText.split("|").map((t: string) => (
                <span key={t} className="flex items-center gap-10">
                  {t.trim().toUpperCase()}
                  <span className="text-brand-orange">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

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
                      isActive ? "text-brand-orange border-b-2 border-brand-orange" : "text-ink hover:text-brand-orange"
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
                    isActive ? "text-brand-orange border-b-2 border-brand-orange" : "text-ink hover:text-brand-orange"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 text-ink">
            <HackerModeToggle />
            <button aria-label="Search" onClick={() => setSearchOpen((v) => !v)} className="hover:text-brand-orange transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button aria-label="Account" onClick={() => setUserMenuOpen((v) => !v)} className="hover:text-brand-orange transition-colors">
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
                        {user.type === "buyer" && (
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
                                Verifikasi FILKOM
                              </button>
                            )}
                          </div>
                        )}
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
            <button aria-label="Cart" className="relative hover:text-brand-orange transition-colors" onClick={() => setCartOpen(true)}>
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

      {/* 1. Hero Section */}
      <section className="relative bg-cream border-b-2 border-ink">
        <div className="grid lg:grid-cols-12 max-w-[1400px] mx-auto animate-slide-up">
          <div className="lg:col-span-6 px-4 sm:px-8 lg:px-12 py-10 sm:py-16 lg:py-24 flex flex-col justify-center order-2 lg:order-1">
            
            {/* Social Proof Star Ratings & Badge */}
            <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
              <span className="text-[9px] bg-ink text-cream font-extrabold px-2.5 py-1 rounded tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
                <Check className="w-3 h-3 text-brand-orange" /> Official Merchandise
              </span>
              
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <span className="text-[10px] tracking-widest text-ink font-bold">
                  4.9 ★ (1,200+ Mahasiswa)
                </span>
              </div>
            </div>

            {/* Sub label */}
            <div className="text-xs tracking-[0.3em] text-brand-orange font-bold mb-3 uppercase">
              {layout.heroSubLabel}
            </div>

            {/* Title */}
            <h1 className="display text-[44px] sm:text-[68px] lg:text-[96px] leading-[0.9] text-ink animate-fade-in font-extrabold uppercase">
              {layout.heroTitle.split("\n").map((line: string, idx: number) => (
                <span key={idx} className="block">
                  {line}
                </span>
              ))}
            </h1>

            {/* Subtitle */}
            <p className="mt-4 sm:mt-6 text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed font-medium">
              {layout.heroSubtitle}
            </p>

            {/* Urgent Countdown Timer if enabled */}
            {layout.showHeroCountdown && (
              <div className="mt-6 sm:mt-8 bg-secondary border-2 border-ink p-4 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] w-fit flex flex-col gap-2">
                <div className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-brand-orange uppercase flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  PRE-ORDER BATCH BERAKHIR DALAM:
                </div>
                <CountdownTimer targetDate={layout.heroCountdownEnd} />
              </div>
            )}

            {/* Call to actions */}
            <div className="mt-6 sm:mt-10 flex flex-wrap gap-3">
              <button
                onClick={() => scrollToId("shop")}
                className="inline-flex items-center justify-center gap-2 bg-ink text-cream px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange transition-all duration-300 shadow-[3px_3px_0px_0px_rgba(27,27,27,0.15)] active:translate-y-0.5 cursor-pointer uppercase"
              >
                {layout.heroBtnText} <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToId("about")}
                className="inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 text-xs font-bold tracking-[0.2em] border-2 border-ink text-ink hover:bg-ink hover:text-cream transition-all duration-300 active:translate-y-0.5 cursor-pointer uppercase"
              >
                LOOKBOOK
              </button>
            </div>

            {/* Overlapping customer avatars proof */}
            <div className="mt-8 sm:mt-12 flex items-center gap-3">
              <div className="flex -space-x-3.5">
                <img className="w-8 h-8 rounded-full border-2 border-cream object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60" alt="" />
                <img className="w-8 h-8 rounded-full border-2 border-cream object-cover" src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=60" alt="" />
                <img className="w-8 h-8 rounded-full border-2 border-cream object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60" alt="" />
                <div className="w-8 h-8 rounded-full border-2 border-cream bg-ink text-cream text-[9px] font-bold flex items-center justify-center">
                  +1.2k
                </div>
              </div>
              <span className="text-[10px] tracking-wider font-bold text-muted-foreground uppercase">
                Mahasiswa FILKOM telah memesan bulan ini
              </span>
            </div>
          </div>

          <div className="lg:col-span-6 relative order-1 lg:order-2 bg-brand-blue border-l-2 border-ink">
            <img
              src={layout.heroImage || hero}
              alt="Filkom Merch lookbook"
              className="w-full h-[40vh] sm:h-[60vh] lg:h-[85vh] object-cover mix-blend-luminosity opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/35 via-transparent to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-cream">
              <div className="display text-3xl sm:text-4xl lg:text-5xl leading-none font-bold uppercase tracking-wider">
                EST.
                <br />
                FILKOM
              </div>
              <div className="text-right text-[10px] tracking-[0.3em] font-black uppercase">
                SS / 26
                <br />
                COLLECTION
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Collection Section */}
      <section className="bg-background py-16 sm:py-24 border-b-2 border-ink">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-4">
            <div>
              <div className="text-xs tracking-[0.35em] text-brand-orange font-bold mb-2 uppercase">
                RECOMMENDED BY BEM
              </div>
              <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase">
                Featured Collection.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm font-medium">
              Produk terfavorit yang paling banyak dipakai mahasiswa di lorong gedung FILKOM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {featuredProducts.map((p) => (
              <div key={p.id} className="group flex flex-col border-2 border-ink bg-cream rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-y-[-4px] transition-all duration-300">
                <Link to="/product/$slug" params={{ slug: p.id }} className="relative aspect-[4/5] overflow-hidden block border-b-2 border-ink bg-secondary animate-fade-in">
                  <img
                    src={p.img}
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
                  <div className="text-[10px] font-bold tracking-widest text-brand-orange uppercase mb-1">{p.cat}</div>
                  <Link to="/product/$slug" params={{ slug: p.id }} className="hover:text-brand-orange transition-colors">
                    <h3 className="text-base font-bold text-ink leading-snug tracking-wide line-clamp-1 mb-2">
                      {p.name}
                    </h3>
                  </Link>
                  <div className="flex items-baseline gap-2 mt-auto">
                    <span className="text-base font-extrabold text-ink">{p.price}</span>
                    {p.was && <span className="text-xs text-muted-foreground line-through font-bold">{p.was}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Categories Section */}
      <section className="bg-cream border-b border-border">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 sm:py-24">
          <div className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <div className="text-xs tracking-[0.3em] text-muted-foreground font-bold mb-2">
                02 — CATEGORIES
              </div>
              <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase">Pick your fit.</h2>
            </div>
            <button
              onClick={() => {
                setFilter("ALL");
                scrollToId("shop");
              }}
              className="text-xs font-bold tracking-[0.2em] text-ink hover:text-brand-orange uppercase transition-colors"
            >
              VIEW ALL PRODUCTS →
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {CATEGORIES.map((c) => (
              <button
                key={c.name}
                onClick={() => {
                  setFilter(c.filter);
                  scrollToId("shop");
                }}
                className="group relative overflow-hidden bg-background aspect-[3/4] text-left border-2 border-ink rounded shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer animate-scale-in"
              >
                <img
                  src={c.img}
                  alt={c.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 mix-blend-luminosity hover:mix-blend-normal"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
                
                {/* Dynamic Product Count */}
                <div className="absolute top-3 right-3 bg-cream/90 backdrop-blur-sm text-ink px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-mono font-bold tracking-wider uppercase border border-ink">
                  {categoryCounts[c.filter]} Items
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 flex items-center justify-between text-cream">
                  <span className="display text-sm sm:text-xl font-bold tracking-wide">{c.name}</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Best Seller & 5. New Arrival (Filtered Shop Grid) */}
      <section id="shop" className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 sm:py-24 border-b-2 border-ink">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="text-xs tracking-[0.3em] text-muted-foreground font-bold mb-2">
              03 — ARTICLE SHOP
            </div>
            <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase">Premium merchandise.</h2>
          </div>
          <div className="hidden md:flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-extrabold tracking-[0.18em] px-4 py-2.5 border-2 transition-colors cursor-pointer uppercase ${filter === f ? "bg-ink text-cream border-ink" : "border-ink/20 text-ink hover:border-ink"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 text-[10px] font-bold tracking-[0.18em] px-3.5 py-2 border-2 transition-colors uppercase ${filter === f ? "bg-ink text-cream border-ink" : "border-ink/20 text-ink"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12">
          {visibleProducts.map((p) => {
            const hasWishlisted = wishlist.includes(p.id);
            const sizes = getProductAvailableSizes(p);
            
            return (
              <article
                key={p.name}
                className="group relative flex flex-col bg-background border-2 border-ink p-2 rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] transition-all duration-300 animate-fade-in"
              >
                <div className="relative aspect-[4/5] bg-secondary overflow-hidden rounded border border-ink/10">
                  <Link to="/product/$slug" params={{ slug: p.id }} className="block h-full">
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                    />
                  </Link>

                  {/* Dynamic Badge styling */}
                  {p.tag && (
                    <span
                      className={`absolute top-2 left-2 text-[8px] sm:text-[9px] font-bold tracking-[0.18em] px-2.5 py-1 rounded shadow-sm uppercase ${
                        p.tag === "NEW" ? "bg-ink text-cream" : p.tag === "BEST SELLER" ? "bg-brand-orange text-cream" : "bg-blue-600 text-cream"
                      }`}
                    >
                      {p.tag}
                    </span>
                  )}

                  {/* Stock countdown limit warning */}
                  {!p.sale_type && p.variants && p.variants.reduce((acc, v) => acc + (v.stock || 0), 0) <= 15 && (
                    <span className="absolute top-2 right-2 text-[7px] sm:text-[8px] font-mono font-bold bg-rose-500 text-cream px-2 py-0.5 rounded uppercase">
                      Hampir Habis!
                    </span>
                  )}

                  {/* Wishlist Button floating top-right */}
                  <button
                    onClick={() => toggleWishlist(p.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-cream border border-ink shadow-sm text-ink hover:text-red-500 hover:scale-105 active:scale-95 transition-all z-20 cursor-pointer"
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                  </button>

                  {/* Desktop Hover Quick Actions Overlay */}
                  <div className="absolute inset-0 bg-ink/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center gap-3 z-10 px-4">
                    {/* Quick View Trigger */}
                    <button
                      onClick={() => setQuickViewProduct(p)}
                      className="inline-flex items-center gap-2 bg-cream text-ink border border-ink px-4 py-2 text-[10px] font-bold tracking-widest hover:bg-ink hover:text-cream transition-colors rounded shadow duration-200 cursor-pointer uppercase animate-slide-up"
                    >
                      <Eye className="w-3.5 h-3.5" /> Quick View
                    </button>

                    {/* Quick Size Selectors */}
                    {sizes.length > 0 ? (
                      <div className="w-full bg-cream/90 backdrop-blur-sm p-2 rounded text-center border border-ink/20 animate-scale-in">
                        <div className="text-[8px] tracking-wider font-extrabold text-ink uppercase mb-1">Quick Add Size:</div>
                        <div className="flex flex-wrap justify-center gap-1">
                          {sizes.map((size) => (
                            <button
                              key={size}
                              onClick={() => addToCart(p, size)}
                              className="text-[9px] font-bold bg-ink text-cream hover:bg-brand-orange hover:text-cream px-2 py-1 transition-colors border border-ink uppercase cursor-pointer"
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="w-full bg-cream text-ink font-bold tracking-widest text-[9px] py-2 border-t border-ink text-center hover:bg-brand-orange hover:text-cream transition-colors cursor-pointer uppercase animate-slide-up"
                      >
                        Add to Bag
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex flex-col flex-1">
                  <div className="text-[9px] sm:text-[10px] tracking-[0.2em] font-extrabold text-muted-foreground mb-0.5 sm:mb-1 uppercase">
                    {p.cat}
                  </div>
                  <Link to="/product/$slug" params={{ slug: p.id }}>
                    <h3 className="text-xs sm:text-sm font-bold text-ink hover:text-brand-orange transition-colors leading-snug line-clamp-1">
                      {p.name}
                    </h3>
                  </Link>

                  <div className="mt-auto pt-2 flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm font-black text-ink">{p.price}</span>
                    {p.was && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-bold">
                        {p.was}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {visibleProducts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="display text-3xl text-ink mb-2">No products found.</p>
            <button
              onClick={() => {
                setFilter("ALL");
                setQuery("");
              }}
              className="text-xs font-bold tracking-[0.2em] text-brand-orange uppercase cursor-pointer"
            >
              RESET FILTERS →
            </button>
          </div>
        )}
      </section>

      {/* 6. Limited Drop Showcase Section */}
      {layout.showLimitedDrop && limitedProduct && (
        <section className="bg-ink text-cream py-16 sm:py-24 border-b-2 border-ink overflow-hidden animate-slide-up">
          <div className="max-w-[1400px] mx-auto px-5 lg:px-10 grid lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-block bg-brand-orange text-ink font-mono font-extrabold text-[9px] sm:text-[10px] tracking-widest px-3 py-1 rounded-full uppercase shadow">
                🔥 Pre-Order Campaign / Limited Drop
              </div>

              <h2 className="display text-4xl sm:text-6xl lg:text-[76px] leading-[0.95] text-cream font-bold uppercase tracking-wide">
                {layout.limitedTitle}
              </h2>

              <p className="text-cream/70 text-sm sm:text-base max-w-lg leading-relaxed font-medium">
                {layout.limitedSubtitle}
              </p>

              {/* Urgency Progress bar */}
              <div className="space-y-2 max-w-md bg-white/5 border border-white/10 p-4 rounded shadow-md">
                <div className="flex justify-between text-[10px] sm:text-xs tracking-wider font-extrabold">
                  <span className="text-brand-orange">STOCK RUNNING OUT FAST!</span>
                  <span>{layout.limitedStockCurrent} / {layout.limitedStockMax} Pcs</span>
                </div>
                <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-orange h-full animate-pulse"
                    style={{ width: `${(layout.limitedStockCurrent / layout.limitedStockMax) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-cream/50 font-mono">
                  ⚠️ Hanya sisa {layout.limitedStockMax - layout.limitedStockCurrent} pcs di batch ini. Kehabisan harus menunggu semester depan.
                </p>
              </div>

              {/* Dynamic Countdown */}
              <div className="space-y-2.5">
                <div className="text-[10px] tracking-widest text-cream/50 font-bold uppercase">
                  WAKTU PRE-ORDER TERSISA:
                </div>
                <div className="flex text-cream">
                  <CountdownTimer targetDate={layout.limitedCountdownEnd} />
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-4">
                <Link
                  to="/product/$slug"
                  params={{ slug: limitedProduct.id }}
                  className="bg-brand-orange hover:bg-cream text-ink hover:text-ink px-8 py-4 text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 cursor-pointer block"
                >
                  PRE-ORDER NOW →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative aspect-[4/5] border-4 border-cream rounded shadow-2xl bg-neutral-900 overflow-hidden">
              <img
                src={layout.limitedImage || limitedProduct.img}
                alt={layout.limitedTitle}
                className="w-full h-full object-cover mix-blend-normal opacity-95 group-hover:scale-102 transition-transform duration-500"
              />
            </div>

          </div>
        </section>
      )}

      {/* 7. Mengapa Memilih Kami Section */}
      <section id="about" className="bg-cream border-b-2 border-ink py-16 sm:py-24 animate-slide-up">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10">
          <div className="max-w-xl mb-12 sm:mb-16">
            <div className="text-xs tracking-[0.3em] text-brand-orange font-bold mb-2 uppercase">
              04 — WHY CHOOSE US
            </div>
            <h2 className="display text-3xl sm:text-5xl lg:text-7xl text-ink font-bold uppercase leading-none">
              Designed for premium pride.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 border-t border-ink/10 pt-8 sm:pt-12">
            
            {/* Value 1 */}
            <div className="space-y-3 p-4 border border-ink/5 bg-white/40 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-ink text-cream rounded flex items-center justify-center font-bold font-mono">
                01
              </div>
              <h3 className="text-lg font-bold text-ink">{layout.whyTitle1}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {layout.whyDesc1}
              </p>
            </div>

            {/* Value 2 */}
            <div className="space-y-3 p-4 border border-ink/5 bg-white/40 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-ink text-cream rounded flex items-center justify-center font-bold font-mono">
                02
              </div>
              <h3 className="text-lg font-bold text-ink">{layout.whyTitle2}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {layout.whyDesc2}
              </p>
            </div>

            {/* Value 3 */}
            <div className="space-y-3 p-4 border border-ink/5 bg-white/40 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-ink text-cream rounded flex items-center justify-center font-bold font-mono">
                03
              </div>
              <h3 className="text-lg font-bold text-ink">{layout.whyTitle3}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {layout.whyDesc3}
              </p>
            </div>

            {/* Value 4 */}
            <div className="space-y-3 p-4 border border-ink/5 bg-white/40 rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-ink text-cream rounded flex items-center justify-center font-bold font-mono">
                04
              </div>
              <h3 className="text-lg font-bold text-ink">{layout.whyTitle4}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {layout.whyDesc4}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section className="bg-background py-16 sm:py-24 border-b-2 border-ink animate-slide-up">
        <div className="max-w-[800px] mx-auto px-5">
          <div className="text-center mb-10 sm:mb-14">
            <div className="text-xs tracking-[0.3em] text-brand-orange font-bold mb-2 uppercase">
              05 — FAQ QUESTION
            </div>
            <h2 className="display text-3xl sm:text-5xl text-ink font-bold uppercase">Frequently Asked Qs.</h2>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Pertanyaan umum seputar verifikasi mahasiswa, waktu pre-order, dan sistem pengambilan.
            </p>
          </div>

          <div className="space-y-4 border-t-2 border-ink pt-4">
            {[
              { q: layout.faqQ1, a: layout.faqA1 },
              { q: layout.faqQ2, a: layout.faqA2 },
              { q: layout.faqQ3, a: layout.faqA3 },
              { q: layout.faqQ4, a: layout.faqA4 },
            ].map((item, idx) => (
              <div key={idx} className="border-b-2 border-ink/10 pb-4">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center text-left py-3 text-sm sm:text-base font-bold text-ink hover:text-brand-orange transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <Plus className={`w-4 h-4 shrink-0 transition-transform duration-300 ${faqOpen[idx] ? "rotate-45 text-brand-orange" : ""}`} />
                </button>
                
                {faqOpen[idx] && (
                  <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1.5 pb-2 pr-6 animate-slide-down font-medium">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Newsletter Section */}
      <section className="bg-ink text-cream border-b-2 border-ink">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <h2 className="display text-2xl sm:text-4xl lg:text-5xl leading-none font-bold uppercase">
            Jangan ketinggalan
            <br />
            <span className="text-brand-orange">drop berikutnya.</span>
          </h2>
          <form className="flex flex-col gap-3" onSubmit={handleSubscribe}>
            <label className="text-xs tracking-[0.3em] text-cream/70 font-bold">EMAIL MAHASISWA</label>
            <div className="flex border-b border-cream/40 pb-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@student.ub.ac.id"
                className="flex-1 bg-transparent outline-none placeholder:text-cream/45 text-cream text-sm"
              />
              <button
                type="submit"
                className="text-xs font-bold tracking-[0.2em] text-brand-orange hover:text-cream transition-colors cursor-pointer"
              >
                SUBSCRIBE →
              </button>
            </div>
            <p className="text-[11px] text-cream/50 mt-1">
              Dapatkan info drop pertama di WhatsApp + kupon diskon 5% Verified Member.
            </p>
          </form>
        </div>
      </section>

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
            <div className="text-xs font-bold tracking-[0.2em] text-ink mb-4">KONTAK (WA SUPPORT)</div>
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
                      <img src={i.img} alt="" className="w-20 h-24 object-cover border border-ink/10 rounded" />
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
                src={quickViewProduct.img}
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
                    <span className="text-xs font-bold text-ink tracking-wider uppercase block">PILIH UKURAN:</span>
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
                  <Heart className={`w-4 h-4 ${wishlist.includes(quickViewProduct.id) ? "fill-red-500 text-red-500" : ""}`} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {user?.type === "buyer" && (
        <VerificationModal
          isOpen={isVerifyOpen}
          onClose={() => setIsVerifyOpen(false)}
        />
      )}
    </div>
  );
}
