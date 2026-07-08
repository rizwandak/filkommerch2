import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useEffect, useMemo, useCallback } from "react";
import React from "react";
import {
  Search,
  SlidersHorizontal,
  ShoppingBag,
  ArrowUpDown,
  Check,
  X,
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  Heart,
  Menu,
  Plus,
  Minus,
  Trash2,
  LogOut,
  ArrowRight,
  User,
  LayoutDashboard,
  MonitorSmartphone,
} from "lucide-react";
import { getProducts, getCategories, type ProductWithVariants } from "@backend/server-actions";
import { useAuth } from "@/lib/auth";
import { VerificationModal } from "@frontend/components/VerificationModal";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent } from "@frontend/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";
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

export const Route = createFileRoute("/products")({
  validateSearch: (search: Record<string, unknown>): { sale_type?: string; category?: string } => {
    return {
      sale_type: (search.sale_type as string) || undefined,
      category: (search.category as string) || undefined,
    };
  },
  loader: async () => {
    const productsRes = await getProducts();
    const categoriesRes = await getCategories();
    return {
      products: productsRes.products || [],
      categories: categoriesRes.categories || [],
    };
  },
  head: () => ({
    meta: [
      { title: "Katalog Produk — FILKOM Merch UB" },
      {
        name: "description",
        content: "Katalog merchandise resmi Fakultas Ilmu Komputer Universitas Brawijaya",
      },
    ],
  }),
  component: ProductsCatalogPage,
});

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

function ProductsCatalogPage() {
  const { products, categories } = Route.useLoaderData();
  const searchParams = useSearch({ from: "/products" });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);

  // Cart state & handlers
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Load cart from localStorage only on client
  useEffect(() => {
    try {
      const saved = localStorage.getItem("indexCart");
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch {
      // ignore
    }
    setCartLoaded(true);
  }, []);

  // Sync cart ke localStorage setiap kali berubah
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem("indexCart", JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  function parsePrice(p: string) {
    return Number(p.replace(/[^0-9]/g, ""));
  }

  function formatRp(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

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

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.category || "ALL");
  const [selectedSaleType, setSelectedSaleType] = useState<string>(searchParams.sale_type || "ALL");
  const [selectedProductType, setSelectedProductType] = useState<string>("ALL");
  const [minPrice, setMinPrice] = useState<string>("0");
  const [maxPrice, setMaxPrice] = useState<string>("1000000");
  const [selectedSize, setSelectedSize] = useState<string>("ALL");
  const [selectedColor, setSelectedColor] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NEWEST");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Read params if they update
  useEffect(() => {
    if (searchParams.category) setSelectedCategory(searchParams.category);
    if (searchParams.sale_type) setSelectedSaleType(searchParams.sale_type);
  }, [searchParams]);

  // Determine active price helper
  const getActivePrice = (product: any) => {
    const isUb = user?.is_filkom_verified === 1;
    if (product.promo_price && Number(product.promo_price) > 0) {
      return Number(product.promo_price);
    }
    if (isUb && product.filkom_price && Number(product.filkom_price) > 0) {
      return Number(product.filkom_price);
    }
    return Number(product.price);
  };

  // Get color and size list from all active variants
  const allSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.size && v.is_active) sizes.add(v.size);
      });
    });
    return Array.from(sizes);
  }, [products]);

  const allColors = useMemo(() => {
    const colors = new Set<string>();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.color && v.is_active) colors.add(v.color);
      });
    });
    return Array.from(colors);
  }, [products]);

  // Filter products list
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)),
      );
    }

    // Category
    if (selectedCategory !== "ALL") {
      result = result.filter(
        (p) => String(p.category_id) === selectedCategory || p.category_slug === selectedCategory,
      );
    }

    // Sale Type (ready_stock, pre_order, limited_drop)
    if (selectedSaleType !== "ALL") {
      result = result.filter((p) => p.sale_type === selectedSaleType);
    }

    // Product Type (apparel, lifestyle, etc.)
    if (selectedProductType !== "ALL") {
      result = result.filter((p) => p.product_type === selectedProductType);
    }

    // Size filter
    if (selectedSize !== "ALL") {
      result = result.filter((p) =>
        p.variants?.some((v) => v.size === selectedSize && v.is_active && v.stock > 0),
      );
    }

    // Color filter
    if (selectedColor !== "ALL") {
      result = result.filter((p) =>
        p.variants?.some((v) => v.color === selectedColor && v.is_active && v.stock > 0),
      );
    }

    // Min Price
    if (minPrice !== "" && minPrice !== "0") {
      result = result.filter((p) => getActivePrice(p) >= parseFloat(minPrice));
    }

    // Max Price
    if (maxPrice !== "" && maxPrice !== "1000000") {
      result = result.filter((p) => getActivePrice(p) <= parseFloat(maxPrice));
    }

    // Sort By
    if (sortBy === "NEWEST") {
      result.sort((a, b) => b.id - a.id);
    } else if (sortBy === "PRICE_ASC") {
      result.sort((a, b) => getActivePrice(a) - getActivePrice(b));
    } else if (sortBy === "PRICE_DESC") {
      result.sort((a, b) => getActivePrice(b) - getActivePrice(a));
    } else if (sortBy === "BEST_SELLER") {
      result.sort((a, b) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0));
    }

    return result;
  }, [
    products,
    searchTerm,
    selectedCategory,
    selectedSaleType,
    selectedProductType,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    sortBy,
    user,
  ]);

  const clearFilters = () => {
    setSelectedCategory("ALL");
    setSelectedSaleType("ALL");
    setSelectedProductType("ALL");
    setMinPrice("0");
    setMaxPrice("1000000");
    setSelectedSize("ALL");
    setSelectedColor("ALL");
    setSearchTerm("");
  };

  const isUbCivitas = user?.is_filkom_verified === 1;

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans">
      {/* Announcement marquee */}
      <div className="bg-ink text-cream py-2 overflow-hidden border-b border-ink">
        <div className="flex marquee-track whitespace-nowrap text-xs tracking-[0.2em] font-medium">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-10 px-5">
              {[
                "OFFICIAL FILKOM UB MERCHANDISE",
                "FREE ONGKIR KE FILKOM ★",
                "PRE-ORDER VARSITY '25 OPEN",
                "100% PRODUK MAHASISWA",
                "CASHBACK 5% MEMBER",
                "DROP BARU TIAP BULAN",
              ].map((t: string) => (
                <span key={t} className="flex items-center gap-10">
                  {t}
                  <span className="text-brand-orange">●</span>
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
                className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover ring-2 ring-border"
              />
              <img
                src={logoFilkom}
                alt="Logo FILKOM UB"
                className="h-8 w-8 sm:h-11 sm:w-11 object-contain"
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="display text-lg text-ink flex items-center gap-1.5 font-bold uppercase">
                Filkom Merch
                <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  OFFICIAL
                </span>
              </div>
              <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">
                UNIVERSITAS BRAWIJAYA
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {NAV.map((n) => {
              const isActive = pathname === n.href || (n.href === "/" && pathname === "/" && !hash);
              const isScrollOnHome = n.isScroll && pathname === "/";

              if (isScrollOnHome) {
                return (
                  <button
                    key={n.label}
                    onClick={() => scrollToId(n.target!)}
                    className={`text-xs font-bold tracking-[0.18em] transition-colors cursor-pointer uppercase ${
                      isActive ? "text-brand-orange" : "text-ink hover:text-brand-orange"
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
                  onClick={() => {
                    if (n.href === "/products") {
                      setSelectedSaleType("ALL");
                    }
                  }}
                  className={`text-xs font-bold tracking-[0.18em] transition-colors uppercase ${
                    isActive ? "text-brand-orange" : "text-ink hover:text-brand-orange"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 text-ink">
            <HackerModeToggle />
            <button aria-label="Search" onClick={() => setSearchOpen((v) => !v)}>
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button aria-label="Account" onClick={() => setUserMenuOpen((v) => !v)}>
                <User className="w-5 h-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 min-w-[240px] w-max max-w-[320px] bg-background border-2 border-ink rounded-lg shadow-lg z-50 animate-scale-in py-1">
                  {user ? (
                    <>
                      <div className="px-5 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground break-words">
                          {user.type === "admin" ? user.username : user.name}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-900 rounded">
                          {user.type === "admin" ? "ADMIN" : "BUYER"}
                        </span>
                        {user && (
                          <div className="mt-1.5">
                            {user.is_filkom_verified === 1 ? (
                              <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-green-100 text-green-800 rounded">
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
                      {user.type === "admin" && (
                        <Link
                          to="/admin/dashboard"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border font-bold text-brand-blue animate-fade-in"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Panel Admin
                        </Link>
                      )}
                      {user.type === "admin" && (
                        <Link
                          to="/pos"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border font-bold text-brand-orange animate-fade-in"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <MonitorSmartphone className="w-4 h-4" />
                          Kasir / POS
                        </Link>
                      )}
                      {user && (
                        <Link
                          to="/orders"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border font-bold animate-fade-in"
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
                        className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="block px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary text-center animate-fade-in"
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
              className="relative cursor-pointer"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-orange text-cream text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              aria-label="Menu"
              className="lg:hidden cursor-pointer"
              onClick={() => setMenuOpen(true)}
            >
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari produk…"
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-muted-foreground font-bold"
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchTerm("");
                }}
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Banner */}
      <section className="bg-cream border-b-2 border-ink py-14 px-4 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-brand-orange text-cream border-2 border-ink px-4 py-1.5 rounded-full text-[10px] font-extrabold mb-4 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Civitas FILKOM UB Discount Active
            </div>
            <h1 className="display text-3xl sm:text-5xl text-ink uppercase tracking-tight">
              Katalog Resmi FILKOM Merch
            </h1>
            <p className="mt-3 text-sm text-muted-foreground max-w-xl font-medium leading-relaxed">
              Temukan koleksi eksklusif, apparel premium, lanyard, gantungan kunci, dan drop limited
              pre-order Fakultas Ilmu Komputer.
            </p>
          </div>
          {user?.type === "buyer" ? (
            user.is_filkom_verified === 1 ? (
              <div className="bg-card border-2 border-ink rounded-xl p-5 text-center md:text-right shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] max-w-xs shrink-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Status Akun:
                </p>
                <p className="text-lg font-extrabold text-brand-orange uppercase mt-1">
                  Spesial Civitas FILKOM UB 🔥
                </p>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                  Diskon otomatis aktif karena akun FILKOM Anda terverifikasi.
                </p>
              </div>
            ) : user.is_google && user.email.endsWith("ub.ac.id") ? (
              <div className="bg-card border-2 border-ink rounded-xl p-5 text-center md:text-right shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] max-w-xs shrink-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Diskon Civitas:
                </p>
                <p className="text-lg font-extrabold text-amber-600 uppercase mt-1">
                  Belum Terverifikasi ⚠️
                </p>
                <button
                  onClick={() => setIsVerifyOpen(true)}
                  className="mt-2 w-full bg-brand-orange text-cream text-[10px] font-bold py-2 rounded-lg border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none transition-all cursor-pointer block"
                >
                  Verifikasi NIM
                </button>
              </div>
            ) : (
              <div className="bg-card border-2 border-ink rounded-xl p-5 text-center md:text-right shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] max-w-xs shrink-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Diskon Khusus:
                </p>
                <p className="text-sm font-extrabold text-ink uppercase mt-1">
                  Gunakan Akun Google UB 🎓
                </p>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                  Verifikasi NIM mahasiswa FILKOM hanya tersedia jika Anda login menggunakan akun Google UB (@student.ub.ac.id).
                </p>
              </div>
            )
          ) : (
            <div className="bg-card border-2 border-ink rounded-xl p-5 text-center md:text-right shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] max-w-xs shrink-0">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Punya NIM FILKOM?
              </p>
              <p className="text-lg font-extrabold text-ink uppercase mt-1">
                Login & Verifikasi 🎓
              </p>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed font-semibold">
                Gunakan akun Google UB & hubungkan NIM Anda untuk mendapatkan diskon khusus FILKOM.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Main Catalog Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0 bg-card p-6 rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] h-fit sticky top-24 text-ink">
            <div className="flex items-center justify-between border-b-2 border-ink pb-4 mb-6">
              <h2 className="font-extrabold text-sm tracking-wider uppercase text-ink flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
                FILTER
              </h2>
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-muted-foreground hover:text-brand-orange transition cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-ink mb-2 uppercase tracking-wider">
                Pencarian
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-cream border-2 border-ink rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-0 text-ink placeholder:text-muted-foreground font-bold"
                />
                <Search className="w-4 h-4 text-ink absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-ink mb-2 uppercase tracking-wider">
                Kategori
              </label>
              <div className="space-y-1.5">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex justify-between items-center border border-ink cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-brand-orange text-cream"
                      : "bg-card text-ink hover:bg-cream"
                  }`}
                >
                  Semua Produk
                  {selectedCategory === "ALL" && <Check className="w-3.5 h-3.5" />}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(String(cat.id))}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex justify-between items-center border border-ink cursor-pointer ${
                      selectedCategory === String(cat.id)
                        ? "bg-brand-orange text-cream"
                        : "bg-card text-ink hover:bg-cream"
                    }`}
                  >
                    {cat.name}
                    {selectedCategory === String(cat.id) && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Penjualan (Ready vs PO) */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-ink mb-2 uppercase tracking-wider">
                Status Drop
              </label>
              <div className="space-y-1.5">
                {[
                  { id: "ALL", name: "Semua Status" },
                  { id: "ready_stock", name: "Ready Stock" },
                  { id: "pre_order", name: "Pre-Order" },
                  { id: "limited_drop", name: "Limited Drop" },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedSaleType(type.id)}
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex justify-between items-center border border-ink cursor-pointer ${
                      selectedSaleType === type.id
                        ? "bg-brand-orange text-cream"
                        : "bg-card text-ink hover:bg-cream"
                    }`}
                  >
                    {type.name}
                    {selectedSaleType === type.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-ink mb-2 uppercase tracking-wider">
                Rentang Harga (Rp)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-cream border-2 border-ink rounded-lg p-2 text-xs text-center text-ink focus:outline-none font-bold"
                />
                <span className="text-ink text-xs font-bold">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-cream border-2 border-ink rounded-lg p-2 text-xs text-center text-ink focus:outline-none font-bold"
                />
              </div>
            </div>

            {/* Sizes */}
            {allSizes.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-ink mb-2 uppercase tracking-wider">
                  Ukuran
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedSize("ALL")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${
                      selectedSize === "ALL"
                        ? "bg-ink text-cream"
                        : "bg-card text-ink hover:bg-cream"
                    }`}
                  >
                    ALL
                  </button>
                  {allSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${
                        selectedSize === size
                          ? "bg-ink text-cream"
                          : "bg-card text-ink hover:bg-cream"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {allColors.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-ink mb-2 uppercase tracking-wider">
                  Warna
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedColor("ALL")}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${
                      selectedColor === "ALL"
                        ? "bg-ink text-cream"
                        : "bg-card text-ink hover:bg-cream"
                    }`}
                  >
                    ALL
                  </button>
                  {allColors.map((col) => (
                    <button
                      key={col}
                      onClick={() => setSelectedColor(col)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${
                        selectedColor === col
                          ? "bg-ink text-cream"
                          : "bg-card text-ink hover:bg-cream"
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
          {/* Product Grid Area */}
          <div className="flex-1">
            {/* Sorting & Result Count Bar */}
            <div className="bg-card p-4 rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 text-ink">
              <p className="text-xs text-ink font-bold">
                Menampilkan <span className="text-brand-orange">{filteredProducts.length}</span>{" "}
                produk
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="flex lg:hidden items-center justify-center gap-1.5 bg-cream hover:bg-card text-ink px-3.5 py-2 rounded-lg text-xs font-bold border-2 border-ink flex-1 sm:flex-initial cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
                  Filter
                </button>

                <div className="flex items-center gap-2 bg-cream border-2 border-ink rounded-lg px-3 py-1.5 flex-1 sm:flex-initial justify-between">
                  <ArrowUpDown className="w-3.5 h-3.5 text-ink" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-ink focus:outline-none cursor-pointer pr-4"
                  >
                    <option value="NEWEST">Terbaru</option>
                    <option value="PRICE_ASC">Harga Terendah</option>
                    <option value="PRICE_DESC">Harga Tertinggi</option>
                    <option value="BEST_SELLER">Produk Terlaris</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {filteredProducts.map((p) => {
                  const currentPrice = getActivePrice(p);
                  const showDiscount = p.original_price && p.original_price > currentPrice;

                  return (
                    <article
                      key={p.id}
                      className="group flex flex-col bg-card border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all duration-200 overflow-hidden relative h-full text-ink"
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
                            className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold bg-cream text-xs">
                            No Photo
                          </div>
                        )}

                        {/* Drop Badge */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                          {p.sale_type === "pre_order" && (
                            <span className="bg-brand-orange text-cream border-2 border-ink font-extrabold text-[9px] px-2 py-0.5 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] tracking-wide flex items-center gap-1 uppercase">
                              <Calendar className="w-3 h-3" />
                              PRE-ORDER
                            </span>
                          )}
                          {p.sale_type === "limited_drop" && (
                            <span className="bg-red-500 text-cream border-2 border-ink font-extrabold text-[9px] px-2 py-0.5 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] tracking-wide uppercase">
                              LIMITED DROP
                            </span>
                          )}
                          {!!p.is_best_seller && (
                            <span className="bg-emerald-600 text-cream border-2 border-ink font-extrabold text-[9px] px-2 py-0.5 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] tracking-wide uppercase">
                              BEST SELLER
                            </span>
                          )}
                        </div>

                        {/* Civitas Badge Indicator */}
                        {p.filkom_price && (
                          <div className="absolute bottom-3 left-3 bg-blue-900/90 text-white font-extrabold text-[9px] px-2 py-1 rounded shadow border border-blue-400/30 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                            SPE-CIVITAS Rp {p.filkom_price.toLocaleString("id-ID")}
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 bg-ink text-cream py-3 text-[11px] font-bold tracking-[0.2em] lg:translate-y-full lg:group-hover:translate-y-0 transition-transform duration-300 text-center uppercase">
                          Lihat Detail Fit
                        </div>
                      </Link>

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
                              {showDiscount && (
                                <span className="bg-red-100 text-red-800 border border-red-200 font-extrabold text-[9px] px-1 rounded">
                                  -
                                  {Math.round(
                                    ((p.original_price! - currentPrice) / p.original_price!) * 100,
                                  )}
                                  %
                                </span>
                              )}
                            </div>
                            {showDiscount && (
                              <p className="text-xs text-muted-foreground line-through font-bold">
                                Rp {p.original_price!.toLocaleString("id-ID")}
                              </p>
                            )}
                          </div>

                          <Link
                            to="/product/$slug"
                            params={{ slug: p.slug }}
                            className="bg-brand-orange hover:bg-ink text-cream hover:text-cream p-2 rounded-lg transition border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none"
                          >
                            <ShoppingBag className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-12 text-center text-ink">
                <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-bold text-lg text-ink">Tidak ada produk yang cocok</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Coba sesuaikan kata kunci pencarian atau bersihkan filter Anda.
                </p>
                <Button
                  onClick={clearFilters}
                  className="mt-6 bg-ink text-cream border-2 border-ink font-bold hover:bg-brand-orange hover:text-cream cursor-pointer transition shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none"
                >
                  Reset Semua Filter
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* WhatsApp Floating Contact Widget */}
      <footer className="bg-card border-t-2 border-ink mt-20 py-12 text-ink text-xs font-bold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src={logo}
                alt="Logo"
                className="w-8 h-8 rounded-full object-cover border border-ink"
              />
              <span className="font-extrabold text-sm text-ink uppercase">FILKOM Merch Store</span>
            </div>
            <p className="text-muted-foreground font-normal leading-relaxed mb-4 max-w-sm">
              Official store merchandise Fakultas Ilmu Komputer Universitas Brawijaya. Menyediakan
              produk kreatif berkualitas tinggi untuk civitas akademika dan masyarakat umum.
            </p>
          </div>
          <div>
            <h4 className="font-extrabold text-ink uppercase tracking-widest mb-3 border-b-2 border-ink pb-1 inline-block">
              Layanan Kami
            </h4>
            <ul className="space-y-2 font-normal text-muted-foreground mt-2">
              <li>
                <Link to="/products" className="hover:text-brand-orange transition">
                  Katalog Drop Utama
                </Link>
              </li>
              <li>
                <Link
                  to="/products"
                  search={{ sale_type: "pre_order" }}
                  className="hover:text-brand-orange transition"
                >
                  Pre-Order BATCH Aktif
                </Link>
              </li>
              <li>
                <a href="/#about" className="hover:text-brand-orange transition">
                  Tentang Toko Resmi
                </a>
              </li>
            </ul>
          </div>
          <div id="contact">
            <h4 className="font-extrabold text-ink uppercase tracking-widest mb-3 border-b-2 border-ink pb-1 inline-block">
              Hubungi Admin (WhatsApp)
            </h4>
            <div className="space-y-3 mt-2">
              <a
                href="https://wa.me/6282235526105?text=Halo%20Admin%20Aliya,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition p-3 rounded-lg border-2 border-ink font-bold shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Hubungi Admin Aliya (Online)
              </a>
              <a
                href="https://wa.me/6282287190402?text=Halo%20Admin%20Puty,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition p-3 rounded-lg border-2 border-ink font-bold shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Hubungi Admin Puty (Online)
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border pt-8 mt-8 text-center text-muted-foreground font-normal">
          &copy; 2026 FILKOM Merchandise UB Store. Developed in alignment with Technical Brief
          revisions.
        </div>
      </footer>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card w-80 h-full p-6 flex flex-col justify-between shadow-2xl border-r-2 border-ink animate-slide-right overflow-y-auto text-ink">
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-4 mb-6">
                <h3 className="font-extrabold text-sm text-ink uppercase">Filters</h3>
                <button onClick={() => setShowMobileFilters(false)}>
                  <X className="w-5 h-5 text-ink" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-ink mb-2 uppercase">Pencarian</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari..."
                    className="w-full bg-cream border-2 border-ink rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none text-ink font-bold"
                  />
                  <Search className="w-4 h-4 text-ink absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Category */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-ink mb-2 uppercase">Kategori</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-cream border-2 border-ink rounded-lg p-2 text-xs font-bold focus:outline-none text-ink cursor-pointer"
                >
                  <option value="ALL">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Sale */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-ink mb-2 uppercase">
                  Status Drop
                </label>
                <select
                  value={selectedSaleType}
                  onChange={(e) => setSelectedSaleType(e.target.value)}
                  className="w-full bg-cream border-2 border-ink rounded-lg p-2 text-xs font-bold focus:outline-none text-ink cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ready_stock">Ready Stock</option>
                  <option value="pre_order">Pre-Order</option>
                  <option value="limited_drop">Limited Drop</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-ink mb-2 uppercase">
                  Rentang Harga (Rp)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-cream border-2 border-ink rounded-lg p-2 text-xs text-center text-ink focus:outline-none font-bold"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-cream border-2 border-ink rounded-lg p-2 text-xs text-center text-ink focus:outline-none font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t-2 border-ink flex gap-3">
              <button
                onClick={clearFilters}
                className="flex-1 text-xs font-bold border-2 border-ink bg-card hover:bg-cream text-ink py-2 rounded transition cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 bg-brand-orange border-2 border-ink text-cream hover:bg-ink text-xs font-bold py-2 rounded transition cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

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
              className="cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col px-5 py-6 sm:py-8 gap-1">
            {NAV.map((n, idx) => {
              return (
                <Link
                  key={n.label}
                  to={n.href.startsWith("/#") ? "/" : (n.href as any)}
                  hash={n.isScroll ? n.target : undefined}
                  onClick={() => {
                    setMenuOpen(false);
                    setUserMenuOpen(false);
                    if (n.href === "/products") {
                      setSelectedSaleType("ALL");
                    }
                  }}
                  className="display text-3xl sm:text-4xl text-left py-2.5 sm:py-3 hover:text-brand-orange transition-colors animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {n.label}
                </Link>
              );
            })}
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
          <aside className="w-full sm:max-w-md bg-background text-ink flex flex-col shadow-2xl border-l-2 border-ink">
            <div className="flex items-center justify-between h-20 px-6 border-b border-border">
              <div>
                <div className="display text-2xl text-ink">Your Bag</div>
                <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">
                  {cartCount} ITEM
                </div>
              </div>
              <button
                onClick={() => {
                  setCartOpen(false);
                  setUserMenuOpen(false);
                }}
                aria-label="Close cart"
                className="cursor-pointer"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <p className="display text-2xl text-ink font-bold">Bag is empty.</p>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">
                    Tambahkan produk favoritmu.
                  </p>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                    }}
                    className="mt-6 inline-flex items-center gap-2 bg-ink text-cream px-6 py-3 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange cursor-pointer border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none transition-all"
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
                        className="w-20 h-24 object-cover border border-ink"
                      />
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between gap-2">
                          <h4 className="text-sm font-semibold text-ink leading-snug">{i.name}</h4>
                          <button
                            onClick={() => removeItem(i.id)}
                            aria-label="Remove"
                            className="cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-brand-orange" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center border border-ink bg-card">
                            <button
                              onClick={() => updateQty(i.id, -1)}
                              className="px-2 py-1.5 hover:bg-cream cursor-pointer"
                              aria-label="Decrease"
                            >
                              <Minus className="w-3 h-3 text-ink" />
                            </button>
                            <span className="px-3 text-sm font-bold text-ink">{i.qty}</span>
                            <button
                              onClick={() => updateQty(i.id, 1)}
                              className="px-2 py-1.5 hover:bg-cream cursor-pointer"
                              aria-label="Increase"
                            >
                              <Plus className="w-3 h-3 text-ink" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-ink">
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
              <div className="border-t border-border px-6 py-5 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-bold">Subtotal</span>
                  <span className="font-bold text-ink">{formatRp(cartTotal)}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-ink text-cream py-4 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange transition-colors inline-flex items-center justify-center gap-2 border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none cursor-pointer"
                >
                  CHECKOUT <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
      {user?.type === "buyer" && (
        <VerificationModal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} />
      )}
    </div>
  );
}
