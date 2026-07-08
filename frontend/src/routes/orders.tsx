import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  ArrowLeft,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  CreditCard,
  MessageCircle,
  Loader2,
  User,
  Trash2,
  Menu,
  ArrowRight,
  Plus,
  Minus,
  LogOut,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getUserOrders, regeneratePaymentToken } from "@backend/server-actions";
import { VerificationModal } from "@frontend/components/VerificationModal";
import logoFilkom from "@/assets/logo_filkom.png";
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

export const Route = createFileRoute("/orders")({
  component: UserOrdersPage,
  head: () => ({
    meta: [
      { title: "Pesanan Saya — Filkom Merch UB" },
      {
        name: "description",
        content: "Lacak status pembayaran dan pesanan merchandise FILKOM UB Anda",
      },
    ],
  }),
});

type TabStatus = "all" | "unpaid" | "processing" | "completed" | "cancelled";

function UserOrdersPage() {
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

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
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

  // Load Midtrans Snap script dynamically
  useEffect(() => {
    const snapScriptUrl = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = "Mid-client-xBEPEMQRGEXHq99n";

    let script = document.querySelector(
      `script[src="${snapScriptUrl}"]`,
    ) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.src = snapScriptUrl;
      script.setAttribute("data-client-key", clientKey);
      document.body.appendChild(script);
    }
  }, []);

  // Fetch orders
  const fetchOrders = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const result = await getUserOrders({ data: Number(user.id) });
      if (result.success) {
        setOrders(result.orders);
      } else {
        toast.error(result.error || "Gagal memuat pesanan");
      }
    } catch (error) {
      console.error("Error fetching user orders:", error);
      toast.error("Terjadi kesalahan saat memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    void fetchOrders();
  }, [user, navigate]);

  const handleCopyOrderId = (id: string) => {
    void navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    toast.success("ID Pesanan disalin ke clipboard");
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handlePayNow = async (order: any, shouldRegenerate: boolean = true) => {
    try {
      let snapToken = order.snap_token;

      if (shouldRegenerate || !snapToken) {
        setPayingOrderId(order.order_id);
        const res = await regeneratePaymentToken({ data: { orderId: order.order_id } });
        if (!res.success || !res.token) {
          toast.error(res.error || "Gagal memproses pembayaran baru. Silakan coba lagi.");
          return;
        }
        snapToken = res.token;
        // Update local order snap_token
        setOrders((prev) =>
          prev.map((o) => (o.order_id === order.order_id ? { ...o, snap_token: res.token } : o)),
        );
      }

      if ((window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: (snapResult: any) => {
            toast.success("Pembayaran berhasil!");
            void fetchOrders();
          },
          onPending: (snapResult: any) => {
            toast.info("Pembayaran tertunda. Silakan selesaikan pembayaran Anda.");
            void fetchOrders();
          },
          onError: (snapResult: any) => {
            toast.error("Pembayaran gagal!");
          },
          onClose: () => {
            toast.warning("Anda menutup popup pembayaran sebelum menyelesaikan transaksi.");
          },
        });
      } else {
        toast.error("Sistem pembayaran Midtrans gagal dimuat. Coba segarkan halaman.");
      }
    } catch (err: any) {
      console.error("Error paying:", err);
      toast.error("Gagal memulai proses pembayaran.");
    } finally {
      setPayingOrderId(null);
    }
  };

  // Filter orders by active tab and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query Filter
      const matchesSearch = order.order_id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Tab Filter
      const pStatus = order.payment_status;
      const oStatus = order.order_status;

      switch (activeTab) {
        case "unpaid":
          // Pending or unpaid orders
          return pStatus === "unpaid" || pStatus === "pending";
        case "processing":
          // Paid orders currently being prepared
          return (
            pStatus === "paid" &&
            (oStatus === "paid" ||
              oStatus === "processing" ||
              oStatus === "ready_for_pickup" ||
              oStatus === "shipped")
          );
        case "completed":
          return oStatus === "completed";
        case "cancelled":
          return oStatus === "cancelled";
        case "all":
        default:
          return true;
      }
    });
  }, [orders, activeTab, searchQuery]);

  const getStatusBadge = (order: any) => {
    const pStatus = order.payment_status;
    const oStatus = order.order_status;

    if (oStatus === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
          <XCircle className="w-3 h-3" />
          Dibatalkan
        </span>
      );
    }

    if (pStatus === "unpaid" || pStatus === "pending") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
          <Clock className="w-3 h-3 animate-pulse" />
          Belum Dibayar
        </span>
      );
    }

    if (oStatus === "ready_for_pickup") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
          <CheckCircle className="w-3 h-3" />
          Siap Diambil
        </span>
      );
    }

    if (oStatus === "shipped") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
          <CheckCircle className="w-3 h-3" />
          Dikirim
        </span>
      );
    }

    if (oStatus === "completed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle className="w-3 h-3" />
          Selesai
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full border border-indigo-200">
        <AlertCircle className="w-3 h-3" />
        Sedang Diproses
      </span>
    );
  };

  const getFulfillmentLabel = (type: string) => {
    if (type === "pickup") return "Ambil di Toko (Pickup)";
    if (type === "walk_in") return "Beli Langsung (POS)";
    return "Pengiriman Kurir";
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans">
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
            <button aria-label="Search" onClick={() => navigate({ to: "/products" })}>
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
                        {user.type === "buyer" && (
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
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Info Summary */}
        <div className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-md uppercase text-ink">
              Halo,{" "}
              {user?.type === "buyer" ? user.name : user?.type === "admin" ? user.username : ""}!
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.email} • Peran: {user?.type === "buyer" ? "Pembeli" : "Admin"}
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="bg-cream border border-ink px-4 py-2 rounded text-center">
              <span className="block font-bold text-lg">{orders.length}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                Total Transaksi
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded text-center">
              <span className="block font-bold text-lg text-amber-700">
                {
                  orders.filter(
                    (o) => o.payment_status === "unpaid" || o.payment_status === "pending",
                  ).length
                }
              </span>
              <span className="text-[10px] text-amber-800 uppercase font-semibold">
                Belum Bayar
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pesanan berdasarkan ID Pesanan (FILKOM-...)"
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-ink rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-orange/20 placeholder:text-muted-foreground/60 transition"
          />
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
        </div>

        {/* Status Tabs */}
        <div className="flex border-b-2 border-ink mb-8 overflow-x-auto whitespace-nowrap scrollbar-none gap-1 sm:gap-2">
          {(
            [
              { id: "all", label: "Semua" },
              { id: "unpaid", label: "Belum Dibayar" },
              { id: "processing", label: "Sedang Diproses" },
              { id: "completed", label: "Selesai" },
              { id: "cancelled", label: "Dibatalkan" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-t-2 border-x-2 border-transparent rounded-t-lg -mb-[2px] transition ${
                activeTab === tab.id
                  ? "bg-white border-ink border-b-white text-brand-orange text-sm shadow-[0_2px_0_0_#FFF]"
                  : "text-muted-foreground hover:text-ink hover:bg-cream/40"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-brand-orange mb-4" />
            <p className="text-sm font-semibold text-muted-foreground">
              Memuat data pesanan Anda...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="display text-xl tracking-wide uppercase text-ink">Tidak Ada Pesanan</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
              {searchQuery
                ? "Tidak menemukan transaksi yang cocok dengan ID pencarian Anda."
                : "Anda belum memiliki transaksi di kategori status ini saat ini."}
            </p>
            <Link
              to="/"
              className="inline-block mt-6 px-6 py-2.5 bg-ink hover:bg-brand-orange text-white text-xs font-extrabold uppercase tracking-widest rounded-lg border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] transition-all"
            >
              BELANJA SEKARANG
            </Link>
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div
                key={order.order_id}
                className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="bg-cream/40 px-5 py-3 border-b-2 border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-2 text-xs font-bold">
                    <span className="text-muted-foreground">ID Pesanan:</span>
                    <span className="text-ink font-mono">{order.order_id}</span>
                    <button
                      onClick={() => handleCopyOrderId(order.order_id)}
                      className="p-1 hover:bg-cream border border-transparent hover:border-ink rounded transition"
                      title="Salin ID Pesanan"
                    >
                      {copiedOrderId === order.order_id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-ink" />
                      )}
                    </button>
                    <span className="text-muted-foreground font-normal ml-1">
                      (
                      {new Date(order.created_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      )
                    </span>
                  </div>
                  <div>{getStatusBadge(order)}</div>
                </div>

                {/* Items Section */}
                <div className="divide-y border-b-2 border-ink divide-border px-5">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item: any) => (
                      <div key={item.id} className="py-4 flex gap-4 items-start">
                        {/* Dummy image representation based on category or default placeholder */}
                        <div className="w-16 h-20 bg-cream border border-ink rounded overflow-hidden flex items-center justify-center shrink-0">
                          {item.product_name.includes("Varsity") ? (
                            <div className="text-[10px] text-ink font-bold text-center p-1">
                              VARSITY JACKET
                            </div>
                          ) : item.product_name.includes("Hoodie") ? (
                            <div className="text-[10px] text-ink font-bold text-center p-1">
                              HOODIE
                            </div>
                          ) : item.product_name.includes("T-Shirt") ||
                            item.product_name.includes("Kaos") ? (
                            <div className="text-[10px] text-ink font-bold text-center p-1">
                              T-SHIRT TEE
                            </div>
                          ) : (
                            <div className="text-[10px] text-ink font-bold text-center p-1">
                              UB MERCH
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-ink normal-case leading-snug truncate">
                            {item.product_name}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.size && (
                              <span className="text-[10px] font-bold bg-cream border border-ink/20 text-ink px-2 py-0.5 rounded">
                                Ukuran: {item.size}
                              </span>
                            )}
                            {item.color && item.color !== "Default" && (
                              <span className="text-[10px] font-bold bg-cream border border-ink/20 text-ink px-2 py-0.5 rounded">
                                Warna: {item.color}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.quantity} x Rp {item.unit_price.toLocaleString("id-ID")}
                          </div>
                        </div>

                        <div className="text-right font-bold text-sm text-ink shrink-0 self-center">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 text-xs text-muted-foreground text-center">
                      Rincian produk tidak tersedia
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/10">
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-muted-foreground">Metode Pengiriman: </span>
                      <span className="font-bold text-ink">
                        {getFulfillmentLabel(order.fulfillment_type)}
                      </span>
                    </div>
                    {order.fulfillment_type === "shipping" && order.shipping_address && (
                      <div>
                        <span className="text-muted-foreground">Alamat Pengiriman: </span>
                        <span className="font-bold text-ink">{order.shipping_address}</span>
                      </div>
                    )}
                    {order.fulfillment_type === "shipping" && (
                      <div className="text-[10px] text-brand-orange font-semibold">
                        * Ada ongkir menyesuaikan jarak, info lengkap akan diberitahu melalui
                        WhatsApp
                      </div>
                    )}
                    {order.pickup_code && (
                      <div>
                        <span className="text-muted-foreground">Kode Pengambilan: </span>
                        <span className="font-mono font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                          {order.pickup_code}
                        </span>
                      </div>
                    )}
                    {order.notes && (
                      <p className="text-muted-foreground italic truncate max-w-xs mt-1">
                        Catatan: "{order.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wide">
                        Total Pesanan:
                      </span>
                      <span className="text-lg font-extrabold text-brand-orange">
                        Rp {order.gross_amount.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* Contact admin button for all states */}
                      <a
                        href="https://wa.me/628123456789" // Dummy WhatsApp number
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-bold uppercase bg-white hover:bg-cream rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        Hubungi Admin
                      </a>

                      {/* Pay now button for pending payments */}
                      {(order.payment_status === "unpaid" || order.payment_status === "pending") &&
                        order.order_status !== "cancelled" && (
                          <div className="flex flex-wrap gap-2">
                            {order.snap_token && (
                              <button
                                onClick={() => handlePayNow(order, false)}
                                disabled={payingOrderId !== null}
                                className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-ink text-xs font-extrabold uppercase bg-emerald-600 text-white hover:bg-emerald-600/95 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Lanjutkan Pembayaran
                              </button>
                            )}
                            <button
                              onClick={() => handlePayNow(order, true)}
                              disabled={payingOrderId !== null}
                              className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-ink text-xs font-extrabold uppercase bg-brand-orange text-white hover:bg-brand-orange/95 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {payingOrderId === order.order_id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="w-3.5 h-3.5" />
                              )}
                              {payingOrderId === order.order_id
                                ? "Memproses..."
                                : order.snap_token
                                  ? "Ubah Metode"
                                  : "Bayar Sekarang"}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                        src={i.img}
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
      {user?.type === "buyer" && user.is_google && user.email.endsWith("ub.ac.id") && (
        <VerificationModal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} />
      )}
    </div>
  );
}
