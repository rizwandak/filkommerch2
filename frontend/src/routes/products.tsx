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
import { getProducts, getCategories, getActivePreOrderCampaignServerAction, type ProductWithVariants } from "@backend/server-actions";
import { useQuery } from "@tanstack/react-query";
import { isProductVisibleToUser } from "@/lib/pre-order-utils";
import { PreOrderNotOpenPlaceholder } from "@/components/PreOrderNotOpenPlaceholder";
import { useAuth } from "@/lib/auth";
import { VerificationModal } from "@frontend/components/VerificationModal";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent } from "@frontend/components/ui/card";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/image-resolver";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo-fm.jpg";

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
  validateSearch: (search: Record<string, unknown>): { sale_type?: string; category?: string; q?: string } => {
    return {
      sale_type: (search.sale_type as string) || undefined,
      category: (search.category as string) || undefined,
      q: (search.q as string) || undefined,
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
  image_url?: string;
};

function ProductsCatalogPage() {
  const { products, categories } = Route.useLoaderData();
  const searchParams = useSearch({ from: "/products" });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);

  // Sync search parameter q to state
  const [searchTerm, setSearchTerm] = useState(searchParams.q || "");
  useEffect(() => {
    if (searchParams.q !== undefined) {
      setSearchTerm(searchParams.q);
    }
  }, [searchParams.q]);

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

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans">
      <Navbar searchQuery={searchTerm} onSearchQueryChange={setSearchTerm} />



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
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex justify-between items-center border border-ink cursor-pointer ${selectedCategory === "ALL"
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
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex justify-between items-center border border-ink cursor-pointer ${selectedCategory === String(cat.id)
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
                    className={`w-full text-left text-xs px-3 py-2 rounded-lg font-bold transition flex justify-between items-center border border-ink cursor-pointer ${selectedSaleType === type.id
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
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${selectedSize === "ALL"
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
                      className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${selectedSize === size
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
                    className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${selectedColor === "ALL"
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
                      className={`text-[10px] font-bold px-2.5 py-1 rounded transition border-2 border-ink cursor-pointer ${selectedColor === col
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
            {!canSeeProducts ? (
              <div className="col-span-full py-4">
                <PreOrderNotOpenPlaceholder campaign={activePoCampaign} />
              </div>
            ) : filteredProducts.length > 0 ? (
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

      <Footer />

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


    </div>
  );
}
