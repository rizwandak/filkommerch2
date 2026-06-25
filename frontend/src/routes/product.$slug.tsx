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
  User,
  Trash2,
  Menu,
  ArrowRight,
  Search,
  X,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getProductBySlug } from "@backend/server-actions";
import { Button } from "@frontend/components/ui/button";
import { useAuth } from "@/lib/auth";
import logoFilkom from "@/assets/logo_filkom.png";
import logo from "@/assets/logo-fm.jpg";

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const NAV = [
  { label: "BERANDA", href: "/", isScroll: true, target: "top" },
  { label: "PRODUK", href: "/products" },
  { label: "PRE-ORDER", href: "/products?sale_type=pre_order" },
  { label: "TENTANG KAMI", href: "/#about", isScroll: true, target: "about" },
  { label: "HUBUNGI KAMI", href: "/#contact", isScroll: true, target: "contact" },
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

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cart state & handlers
  const [cart, setCart] = useState<any[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Load cart from localStorage only on client
  useEffect(() => {
    try {
      const saved = localStorage.getItem("indexCart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch (e) {
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
        .filter((item) => item.qty > 0)
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

  // Dynamic Price computation
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    const isUb = user?.email ? (user.email.endsWith("@student.ub.ac.id") || user.email.endsWith("@ub.ac.id")) : false;
    
    if (product.promo_price && Number(product.promo_price) > 0) {
      return Number(product.promo_price);
    }
    
    if (isUb) {
      if (selectedSize || selectedColor) {
        const matchingVariant = product.variants?.find(
          (v: any) => 
            v.is_active && 
            (!selectedSize || v.size === selectedSize) && 
            (!selectedColor || v.color === selectedColor)
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
          (!selectedColor || v.color === selectedColor)
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
      price: `Rp ${currentPrice.toLocaleString("id-ID")}`,
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
      price: currentPrice,
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

    // In handleAddToCart:
    // Update local cart state so the drawer shows it immediately!
    setCart(indexCart);

    if (buyNow) {
      if (!user) {
        toast.info("Silakan login terlebih dahulu untuk checkout");
        navigate({ to: "/login" });
      } else {
        navigate({ to: "/checkout" });
      }
    } else {
      setCartOpen(true);
      toast.success("Berhasil ditambahkan ke Keranjang", {
        description: `${cartItemName} (${quantity} pcs)`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink">
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
                className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover ring-2 ring-ink"
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
              const isActive =
                n.href === "/products" && window.location.pathname === "/products" && !window.location.search.includes("sale_type=pre_order") ||
                n.href.includes("pre_order") && window.location.search.includes("sale_type=pre_order") ||
                n.href === "/" && window.location.pathname === "/" && !window.location.hash;

              const isScrollOnHome = n.isScroll && window.location.pathname === "/";

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

              if (n.href.includes("sale_type=pre_order")) {
                return (
                  <Link
                    key={n.label}
                    to="/products"
                    search={{ sale_type: "pre_order" }}
                    className={`text-xs font-bold tracking-[0.18em] transition-colors uppercase ${
                      isActive ? "text-brand-orange" : "text-ink hover:text-brand-orange"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={n.label}
                  to={n.href.startsWith("/#") ? "/" : (n.href as any)}
                  hash={n.isScroll ? n.target : undefined}
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
            <button aria-label="Search" onClick={() => navigate({ to: "/products" })}>
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button aria-label="Account" onClick={() => setUserMenuOpen((v) => !v)}>
                <User className="w-5 h-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-background border-2 border-ink rounded-lg shadow-lg z-50 animate-scale-in py-1">
                  {user ? (
                    <>
                      <div className="px-5 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {user.type === "admin" ? user.username : user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-900 rounded">
                          {user.type === "admin" ? "ADMIN" : "BUYER"}
                        </span>
                      </div>
                      {user.type === "buyer" && (
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
            <button aria-label="Cart" className="relative cursor-pointer" onClick={() => setCartOpen(true)}>
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-orange text-cream text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button aria-label="Menu" className="lg:hidden cursor-pointer" onClick={() => setMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
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

              {user?.email && (user.email.endsWith("@student.ub.ac.id") || user.email.endsWith("@ub.ac.id")) ? (
                <div className="mt-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded px-2.5 py-1.5 w-fit">
                  🎉 Harga Khusus Civitas UB Aktif!
                </div>
              ) : (
                product.filkom_price && Number(product.filkom_price) > 0 ? (
                  <div className="mt-2 text-xs font-medium text-muted-foreground bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 w-fit">
                    💡 Punya email UB? Masuk untuk dapat harga civitas Rp {Number(product.filkom_price).toLocaleString("id-ID")}
                  </div>
                ) : null
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
                        {product.preorder_start_at ? new Date(product.preorder_start_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Akhir PO:</span>{" "}
                      <span className="font-bold">
                        {product.preorder_end_at ? new Date(product.preorder_end_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
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
              if (n.href.includes("sale_type=pre_order")) {
                return (
                  <Link
                    key={n.label}
                    to="/products"
                    search={{ sale_type: "pre_order" }}
                    onClick={() => {
                      setMenuOpen(false);
                      setUserMenuOpen(false);
                    }}
                    className="display text-3xl sm:text-4xl text-left py-2.5 sm:py-3 hover:text-brand-orange transition-colors animate-slide-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {n.label}
                  </Link>
                );
              }

              return (
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
                  <p className="text-sm text-muted-foreground mt-2 font-medium">Tambahkan produk favoritmu.</p>
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
                      <img src={i.img} alt="" className="w-20 h-24 object-cover border border-ink" />
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between gap-2">
                          <h4 className="text-sm font-semibold text-ink leading-snug">{i.name}</h4>
                          <button onClick={() => removeItem(i.id)} aria-label="Remove" className="cursor-pointer">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-brand-orange" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center border border-ink bg-white">
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
    </div>
  );
}
