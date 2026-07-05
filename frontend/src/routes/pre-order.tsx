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
} from "lucide-react";
import { getProducts, getStoreSettings, type ProductWithVariants } from "@backend/server-actions";
import { useAuth } from "@/lib/auth";
import { VerificationModal } from "@frontend/components/VerificationModal";
import { toast } from "sonner";

import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";
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
      { name: "description", content: "Koleksi merchandise pre-order mahasiswa FILKOM UB. Jangan lewatkan drop terbatas ini." },
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
};

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

  if (!timeLeft) return <div className="h-12 animate-pulse bg-white/10 rounded w-[250px]" />;

  return (
    <div className="flex gap-2 sm:gap-3 text-center font-mono select-none">
      <div className="bg-cream text-ink p-2 sm:p-3 rounded border border-ink shadow-md">
        <span className="display text-base sm:text-3xl block leading-none font-bold">{String(timeLeft.days).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-ink/75 font-bold">Hari</span>
      </div>
      <div className="display text-lg sm:text-3xl text-cream flex items-center">:</div>
      <div className="bg-cream text-ink p-2 sm:p-3 rounded border border-ink shadow-md">
        <span className="display text-base sm:text-3xl block leading-none font-bold">{String(timeLeft.hours).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-ink/75 font-bold">Jam</span>
      </div>
      <div className="display text-lg sm:text-3xl text-cream flex items-center">:</div>
      <div className="bg-cream text-ink p-2 sm:p-3 rounded border border-ink shadow-md">
        <span className="display text-base sm:text-3xl block leading-none font-bold">{String(timeLeft.minutes).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-ink/75 font-bold">Min</span>
      </div>
      <div className="display text-lg sm:text-3xl text-cream flex items-center">:</div>
      <div className="bg-cream text-ink p-2 sm:p-3 rounded border border-ink shadow-md">
        <span className="display text-base sm:text-3xl block leading-none font-bold">{String(timeLeft.seconds).padStart(2, "0")}</span>
        <span className="text-[7px] sm:text-[9px] tracking-widest uppercase text-ink/75 font-bold">Det</span>
      </div>
    </div>
  );
}

function PreOrderPage() {
  const { products: dbProducts, settings } = Route.useLoaderData();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const { location } = useRouterState();
  const pathname = location.pathname;
  const search = location.search.originalString || "";

  // Load wishlist & cart from localStorage
  useEffect(() => {
    try {
      const savedWishlist = localStorage.getItem("wishlist");
      if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
      const savedCart = localStorage.getItem("indexCart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch (e) {}
    setCartLoaded(true);
  }, []);

  // Sync cart to localStorage
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem("indexCart", JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  // Layout configurations defaults
  const layout = useMemo(() => {
    const defaults = {
      marqueeText: "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN | 100% PRODUK MAHASISWA",
      limitedTitle: "Varsity FILKOM Edition",
      limitedSubtitle: "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
      limitedProductSlug: "varsity-filkom",
      limitedCountdownEnd: "2026-07-10T23:59:59+07:00",
      limitedStockMax: 100,
      limitedStockCurrent: 82,
    };

    if (!settings?.homepage_layout) return defaults;
    try {
      const parsed = JSON.parse(settings.homepage_layout);
      return { ...defaults, ...parsed };
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
        sale_type: product.sale_type,
        variants: product.variants || [],
      };
    });
  }, [dbProducts]);

  // Filter only PRE-ORDER items
  const preOrderProducts = useMemo(() => {
    const list = products.filter((p) => p.sale_type === "pre_order");
    
    // Fallback if db has no pre-orders
    if (list.length === 0) {
      return [
        {
          id: "varsity-jacket",
          img: pVarsity,
          name: "Varsity Jacket — Filkom Edition (Pre-Order)",
          price: "Rp 185.000",
          was: "Rp 210.000",
          tag: "PRE-ORDER",
          cat: "JACKET" as const,
          variants: [
            { id: 101, size: "S", stock: 20 },
            { id: 102, size: "M", stock: 35 },
            { id: 103, size: "L", stock: 40 },
            { id: 104, size: "XL", stock: 15 },
          ],
        }
      ];
    }
    return list;
  }, [products]);

  // Active filtered list
  const filteredPreOrders = useMemo(() => {
    if (!query.trim()) return preOrderProducts;
    const q = query.toLowerCase();
    return preOrderProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)
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
    if (p.variants.length === 1 && (p.variants[0].size.toLowerCase() === "all size" || p.variants[0].size.toLowerCase() === "one size")) {
      return [];
    }
    return p.variants.filter((v: any) => (v.stock || 0) > 0).map((v: any) => v.size);
  };

  const addToCart = useCallback((p: any, selectedSize?: string) => {
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
      category: "JACKET",
    }));

    localStorage.setItem("cart", JSON.stringify(checkoutCart));
    navigate({ to: "/checkout" });
    setCartOpen(false);
  };

  function parsePrice(p: string) {
    return Number(p.replace(/[^0-9]/g, ""));
  }

  function formatRp(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          <Link to="/" className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-90">
            <img src={logo} alt="" className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover ring-2 ring-ink shadow-sm" />
            <img src={logoFilkom} alt="" className="h-8 w-8 sm:h-11 sm:w-11 object-contain" />
            <div className="leading-tight hidden sm:block">
              <div className="display text-lg text-ink flex items-center gap-1.5 font-extrabold uppercase">
                Filkom Merch
                <span className="text-[8px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">OFFICIAL</span>
              </div>
              <div className="text-[9px] tracking-[0.32em] text-muted-foreground font-black">UNIVERSITAS BRAWIJAYA</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.href as any}
                className={`text-[11px] font-bold tracking-[0.2em] transition-colors uppercase ${
                  pathname === n.href ? "text-brand-orange border-b-2 border-brand-orange" : "text-ink hover:text-brand-orange"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-ink">
            <HackerModeToggle />
            <button aria-label="Search" onClick={() => setSearchOpen((v) => !v)} className="hover:text-brand-orange">
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button aria-label="Account" onClick={() => setUserMenuOpen((v) => !v)} className="hover:text-brand-orange">
                <User className="w-5 h-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 min-w-[240px] w-max max-w-[320px] bg-background border-2 border-ink rounded-lg shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] z-50 animate-scale-in">
                  {user ? (
                    <div className="p-3 border-b border-border text-xs space-y-1.5">
                      <p className="font-bold">{user.name}</p>
                      <button onClick={logout} className="w-full text-left text-brand-orange font-bold mt-2">Logout</button>
                    </div>
                  ) : (
                    <Link to="/login" className="block px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary">Sign In</Link>
                  )}
                </div>
              )}
            </div>
            <button aria-label="Cart" className="relative hover:text-brand-orange" onClick={() => setCartOpen(true)}>
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-brand-orange text-cream text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
            </button>
            <button aria-label="Menu" className="lg:hidden" onClick={() => setMenuOpen(true)}><Menu className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {/* Hero Countdown Section */}
      <section className="bg-ink text-cream py-16 sm:py-24 border-b-2 border-ink text-center flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-blue/10 opacity-30 pointer-events-none" />
        <div className="max-w-3xl px-5 space-y-6 relative z-10 animate-slide-up">
          <span className="inline-block bg-brand-orange text-ink font-mono font-extrabold text-[10px] tracking-widest px-3.5 py-1 rounded-full uppercase shadow">
            ⏱ pre-order drops
          </span>
          <h1 className="display text-4xl sm:text-6xl lg:text-7xl font-extrabold uppercase leading-none tracking-wide">
            Pre-Order Terkini.
          </h1>
          <p className="text-cream/70 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Dapatkan katalog premium limited edition dengan masa produksi eksklusif. Sisa waktu penutupan batch pre-order:
          </p>
          
          <div className="flex justify-center pt-2">
            <CountdownTimer targetDate={layout.limitedCountdownEnd} />
          </div>
        </div>
      </section>

      {/* Product list */}
      <section className="max-w-[1400px] mx-auto px-5 lg:px-10 py-16 sm:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-12 gap-4">
          <div>
            <div className="text-xs tracking-[0.3em] text-brand-orange font-bold mb-2 uppercase">PRE-ORDER BATCH CATALOG</div>
            <h2 className="display text-2xl sm:text-4xl text-ink font-bold uppercase">Pre-order items.</h2>
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

        <div className="bg-brand-orange text-cream font-bold text-center py-4 px-4 rounded-lg shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] mb-8 border-2 border-ink uppercase tracking-widest text-xs sm:text-sm animate-pulse flex items-center justify-center gap-2">
          <Star className="w-5 h-5 fill-cream" />
          PERHATIAN: HARGA INI ADALAH HARGA TERMURAH SEBELUM ON SALE!
          <Star className="w-5 h-5 fill-cream" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12">
          {filteredPreOrders.map((p) => {
            const hasWishlisted = wishlist.includes(p.id);
            const sizes = getProductAvailableSizes(p);
            
            return (
              <article key={p.id} className="group relative flex flex-col bg-background border-2 border-ink p-2 rounded-lg hover:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] transition-all duration-300">
                <div className="relative aspect-[4/5] bg-secondary overflow-hidden rounded border border-ink/10">
                  <Link to="/product/$slug" params={{ slug: p.id }} className="block h-full">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                  </Link>

                  <span className="absolute top-2 left-2 text-[8px] sm:text-[9px] font-bold tracking-[0.18em] px-2.5 py-1 rounded bg-brand-orange text-cream uppercase">
                    PRE-ORDER
                  </span>

                  <button
                    onClick={() => toggleWishlist(p.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-cream border border-ink shadow-sm text-ink hover:text-red-500 hover:scale-105 transition-all z-20 cursor-pointer"
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasWishlisted ? "fill-red-500 text-red-500" : ""}`} />
                  </button>

                  {/* Desktop Hover Actions */}
                  <div className="absolute inset-0 bg-ink/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center gap-3 z-10 px-4">
                    <button
                      onClick={() => setQuickViewProduct(p)}
                      className="inline-flex items-center gap-2 bg-cream text-ink border border-ink px-4 py-2 text-[10px] font-bold tracking-widest hover:bg-ink hover:text-cream transition-colors rounded shadow duration-200 cursor-pointer uppercase"
                    >
                      <Eye className="w-3.5 h-3.5" /> Quick View
                    </button>
                    {sizes.length > 0 ? (
                      <div className="w-full bg-cream/90 p-2 rounded text-center border border-ink/20">
                        <div className="text-[8px] tracking-wider font-extrabold text-ink uppercase mb-1">Quick Select:</div>
                        <div className="flex flex-wrap justify-center gap-1">
                          {sizes.map((size: any) => (
                            <button
                              key={size}
                              onClick={() => addToCart(p, size)}
                              className="text-[9px] font-bold bg-ink text-cream hover:bg-brand-orange px-2 py-1 transition-colors border border-ink uppercase"
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="w-full bg-cream text-ink font-bold tracking-widest text-[9px] py-2 border-t border-ink text-center hover:bg-brand-orange hover:text-cream transition-colors cursor-pointer"
                      >
                        Add to Bag
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex flex-col flex-1">
                  <div className="text-[9px] sm:text-[10px] tracking-[0.2em] font-extrabold text-muted-foreground mb-0.5 uppercase">{p.cat}</div>
                  <Link to="/product/$slug" params={{ slug: p.id }}>
                    <h3 className="text-xs sm:text-sm font-bold text-ink hover:text-brand-orange transition-colors leading-snug line-clamp-1">{p.name}</h3>
                  </Link>
                  <div className="mt-auto pt-2 flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm font-black text-ink">{p.price}</span>
                    {p.was && <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-bold">{p.was}</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 flex flex-col md:flex-row justify-between gap-4 text-xs text-muted-foreground">
          <div>© 2026 Filkom Merch UB · Official student merchandise.</div>
          <div>Integrated with Midtrans Payment.</div>
        </div>
      </footer>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in">
          <div className="hidden sm:block flex-1 bg-ink/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <aside className="w-full sm:max-w-md bg-background text-foreground flex flex-col shadow-2xl border-l border-ink">
            <div className="flex items-center justify-between h-20 px-6 border-b border-border">
              <div className="display text-2xl text-ink font-bold">Your Bag</div>
              <button onClick={() => setCartOpen(false)}><X className="w-5 h-5 text-ink" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.map((i) => (
                <div key={i.id} className="py-4 flex gap-4 border-b border-border">
                  <img src={i.img} alt="" className="w-16 h-20 object-cover rounded border" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <span className="font-bold text-xs">{i.name}</span>
                      <button onClick={() => removeItem(i.id)}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-brand-orange" /></button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black">{i.price}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(i.id, -1)} className="p-1 border rounded"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold">{i.qty}</span>
                        <button onClick={() => updateQty(i.id, 1)} className="p-1 border rounded"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t-2 border-ink px-6 py-5 bg-cream">
                <div className="flex justify-between text-sm mb-4 font-bold"><span>Subtotal</span><span>{formatRp(cartTotal)}</span></div>
                <button onClick={handleCheckout} className="w-full bg-ink text-cream py-4 text-xs font-bold tracking-widest hover:bg-brand-orange uppercase">CHECKOUT NOW →</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Quick View Dialog */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setQuickViewProduct(null)} />
          <div className="relative bg-background border-4 border-ink rounded-lg w-full max-w-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 z-10 animate-scale-in">
            <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 p-2 rounded border-2 border-ink bg-cream text-ink"><X className="w-4 h-4" /></button>
            <div className="w-full md:w-1/2 aspect-[4/5] bg-secondary border border-ink/20 rounded overflow-hidden">
              <img src={quickViewProduct.img} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="w-full md:w-1/2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold tracking-widest text-brand-orange uppercase">{quickViewProduct.cat}</span>
                <h3 className="display text-xl sm:text-2xl text-ink font-bold uppercase mt-1">{quickViewProduct.name}</h3>
                <p className="text-sm font-bold text-ink mt-2">{quickViewProduct.price}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-4">Koleksi merchandise pre-order resmi dengan material cotton fleece pilihan, tebal, adem, jahitan kokoh.</p>
              </div>
              <button onClick={() => { addToCart(quickViewProduct); setQuickViewProduct(null); }} className="w-full bg-ink text-cream py-3.5 text-xs font-bold tracking-widest hover:bg-brand-orange uppercase mt-6">ADD TO BAG</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
