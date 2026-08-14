import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useEffect, useMemo, useRef } from "react";
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
  LayoutDashboard,
  MonitorSmartphone,
  Upload,
  Image,
  Eye,
  RefreshCw,
  Star,
  FileText,
  ShieldAlert,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  getUserOrders,
  regeneratePaymentToken,
  getStoreSettings,
  submitPaymentProof,
  createPelunasanOrderServerAction,
  confirmOrderCompletionServerAction,
  createProductReviewServerAction,
  submitOrderComplaintServerAction,
  claimSearchServerAction,
  submitClaimServerAction,
} from "@backend/server-actions";
import { Navbar } from "@/components/Navbar";
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
  const { user, loading: authLoading, logout } = useAuth();

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
  
  // Claim state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimSearchKeyword, setClaimSearchKeyword] = useState("");
  const [claimSearchResults, setClaimSearchResults] = useState<any[]>([]);
  const [isSearchingClaim, setIsSearchingClaim] = useState(false);
  const [submittingClaimOrderId, setSubmittingClaimOrderId] = useState<string | null>(null);

  const [storeSettings, setStoreSettings] = useState<any>(null);

  const [mayarCheckoutUrl, setMayarCheckoutUrl] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);

  const handleConfirmCompletion = async (orderId: string) => {
    if (!confirm("Apakah Anda yakin telah menerima semua pesanan dengan baik? Jika sudah diterima Anda tidak bisa mengajukan pengembalian dan hanya dapat memberikan penilaian produk.")) return;

    try {
      setCompletingOrderId(orderId);
      const res = await confirmOrderCompletionServerAction({ data: { orderId } });
      if (res.success) {
        toast.success("Pesanan berhasil dikonfirmasi selesai! Terima kasih.");
        await fetchOrders();
        navigate({ to: "/orders/$orderId", params: { orderId } });

      } else {
        toast.error(res.error || "Gagal mengonfirmasi pesanan selesai");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Terjadi kesalahan saat mengonfirmasi pesanan");
    } finally {
      setCompletingOrderId(null);
    }
  };



  // Check if store is in manual QRIS mode
  const isManualQrisMode = storeSettings?.payment_mode === "manual_qris";

  // Fetch orders and store settings
  const fetchOrders = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [result, settingsRes] = await Promise.all([
        getUserOrders({ data: Number(user.id) }),
        getStoreSettings(),
      ]);
      if (result.success) {
        setOrders(result.orders);
      } else {
        toast.error(result.error || "Gagal memuat pesanan");
      }
      if (settingsRes.settings) {
        setStoreSettings(settingsRes.settings);
      }
    } catch (error) {
      console.error("Error fetching user orders:", error);
      toast.error("Terjadi kesalahan saat memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    void fetchOrders();
  }, [user, authLoading, navigate]);

  const handleCopyOrderId = (id: string) => {
    void navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    toast.success("ID Pesanan disalin ke clipboard");
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handlePayNow = async (order: any, shouldRegenerate: boolean = true) => {
    try {
      setPayingOrderId(order.order_id);
      const res = await regeneratePaymentToken({ data: { orderId: order.order_id } });
      if (!res.success || (!res.token && !res.checkoutUrl)) {
        toast.error(res.error || "Gagal memproses pembayaran baru. Silakan coba lagi.");
        return;
      }
      const payUrl = res.checkoutUrl || res.token;
      setMayarCheckoutUrl(payUrl);
      setShowPaymentModal(true);
    } catch (err: any) {
      console.error("Error paying:", err);
      toast.error("Gagal memulai proses pembayaran Mayar.");
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleCreatePelunasan = (originalOrderId: string) => {
    navigate({ to: "/order-confirmation", search: { originalOrderId } });
  };

  const isPelunasanOrder = (order: any) => {
    if (!order) return false;
    return (
      String(order.order_id || "").startsWith("LNS-") ||
      (order.notes && String(order.notes).includes("Pelunasan untuk Order:"))
    );
  };

  const getLinkedPelunasan = (orderId: string) => {
    return orders.find(
      (o) =>
        o.order_status !== "cancelled" &&
        ((o.notes && o.notes.includes(`Pelunasan untuk Order: ${orderId}`)) ||
          String(o.order_id || "").startsWith(`LNS-${orderId}`))
    );
  };

  const isDpOrder = (order: any) => {
    if (isPelunasanOrder(order)) return false;
    const lns = getLinkedPelunasan(order.order_id);
    if (lns) return true;

    if (!order.items || order.items.length === 0) return false;

    return order.items.some((item: any) => {
      const colorStr = String(item.color || "").toUpperCase().trim();
      const sizeStr = String(item.size || "").toUpperCase().trim();

      const isExplicitLunas =
        colorStr.includes("LUNAS") ||
        sizeStr.includes("LUNAS") ||
        colorStr.includes("FULL");

      if (isExplicitLunas) {
        return false;
      }

      return colorStr.includes("DP") || sizeStr.includes("DP");
    });
  };

  // Main top-level orders (excludes pelunasan sub-transactions)
  const mainOrders = useMemo(() => {
    return orders.filter((o) => !isPelunasanOrder(o));
  }, [orders]);

  // Filter orders by active tab and search query
  const filteredOrders = useMemo(() => {
    return mainOrders.filter((order) => {
      const linkedLns = getLinkedPelunasan(order.order_id);

      // 1. Search Query Filter (matches parent order ID, linked pelunasan ID, or item product names)
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        order.order_id.toLowerCase().includes(query) ||
        (linkedLns && linkedLns.order_id.toLowerCase().includes(query)) ||
        (order.items && order.items.some((item: any) => String(item.product_name || "").toLowerCase().includes(query)));

      if (!matchesSearch) return false;

      // 2. Tab Filter
      const pStatus = order.payment_status;
      const oStatus = order.order_status;

      switch (activeTab) {
        case "unpaid":
          // Unpaid main order OR DP order with unpaid pelunasan
          const isMainUnpaid = pStatus === "unpaid" || pStatus === "pending";
          const isLnsUnpaid =
            pStatus === "paid" &&
            isDpOrder(order) &&
            (!linkedLns || linkedLns.payment_status === "unpaid" || linkedLns.payment_status === "pending");
          return isMainUnpaid || isLnsUnpaid;

        case "processing":
          // Paid orders currently being prepared / waiting pelunasan / ready for pickup / shipped
          const isMainPaid = pStatus === "paid";
          const notEnded = oStatus !== "completed" && oStatus !== "cancelled";
          return isMainPaid && notEnded;

        case "completed":
          return oStatus === "completed";

        case "cancelled":
          return oStatus === "cancelled";

        case "all":
        default:
          return true;
      }
    });
  }, [mainOrders, orders, activeTab, searchQuery]);

  // Helper to check if an order uses manual QRIS payment
  const isOrderManualQris = (order: any) => {
    return order.payment_type === "manual_qris" || isManualQrisMode;
  };

  const getSizeSurcharge = (sizeStr: string): number => {
    const s = String(sizeStr || "").toUpperCase().trim();
    if (s === "XXL" || s === "2XL") return 10000;
    if (s === "XXXL" || s === "3XL") return 20000;
    if (s === "XXXXL" || s === "4XL") return 30000;
    if (s === "XXXXXL" || s === "5XL") return 40000;
    return 0;
  };

  const getPelunasanStatusBadge = (lns: any) => {
    if (!lns) return null;
    const pStatus = lns.payment_status;
    const oStatus = lns.order_status;

    if (oStatus === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
          <XCircle className="w-3 h-3" />
          Dibatalkan
        </span>
      );
    }

    if (pStatus === "paid") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Pelunasan Lunas
        </span>
      );
    }

    if (lns.payment_proof_note && pStatus !== "paid") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200 animate-pulse">
          <XCircle className="w-3 h-3" />
          Bukti Pelunasan Ditolak
        </span>
      );
    }

    if (lns.payment_proof_url) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
          <Clock className="w-3 h-3 animate-pulse text-blue-600" />
          Verifikasi Pelunasan
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
        <Clock className="w-3 h-3 animate-pulse text-amber-600" />
        Menunggu Pelunasan
      </span>
    );
  };

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

    if (oStatus === "completed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Selesai
        </span>
      );
    }

    // QRIS Static: proof rejected by admin on main order
    if (isOrderManualQris(order) && pStatus !== "paid" && order.payment_proof_note) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200 animate-pulse">
          <XCircle className="w-3 h-3" />
          Bukti DP Ditolak
        </span>
      );
    }

    // QRIS Static: uploaded proof on main order but not yet verified
    if (isOrderManualQris(order) && pStatus !== "paid" && order.payment_proof_url) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
          <Clock className="w-3 h-3 animate-pulse" />
          Verifikasi Pembayaran DP
        </span>
      );
    }

    // QRIS Static: not yet uploaded proof for main order
    if (isOrderManualQris(order) && pStatus !== "paid" && !order.payment_proof_url) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
          <Upload className="w-3 h-3" />
          Menunggu Upload Bukti DP
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

    if (pStatus === "paid" && isDpOrder(order)) {
      const lns = getLinkedPelunasan(order.order_id);
      if (lns && lns.payment_status === "paid") {
        if (oStatus === "ready_for_pickup") {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
              <CheckCircle className="w-3 h-3" />
              Siap Diambil (Lunas)
            </span>
          );
        }
        if (oStatus === "shipped") {
          return (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
              <CheckCircle className="w-3 h-3" />
              Siap Diantar (Lunas)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Lunas Terbayar
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
            Siap Diantar
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
          <Clock className="w-3 h-3 animate-pulse" />
          Sedang Diproses
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
          Siap Diantar / Dikirim
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
        <Clock className="w-3 h-3 animate-pulse" />
        Sedang Diproses
      </span>
    );
  };

  const getFulfillmentLabel = (type: string, batchSource?: string) => {
    if (batchSource === "manual" || batchSource === "csv_import") return "Ambil di Toko FILKOM Merch";
    if (type === "pickup") return "Ambil di Toko FILKOM Merch";
    if (type === "walk_in") return "Beli Langsung (POS)";
    return "Pengiriman Kurir";
  };


  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-10 py-6 space-y-6">        {/* Profile Info Summary */}
        <div className="bg-white border-2 border-ink rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-extrabold text-md uppercase text-ink">
              Halo,{" "}
              {user?.type === "buyer" ? user.name : user?.type === "admin" ? user.username : ""}!
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.email} • Peran: {user?.type === "buyer" ? "Pembeli" : "Admin"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <Link
              to="/claimbatch1"
              className="bg-brand-orange hover:bg-brand-orange/90 text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-wide border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Klaim Pesanan
            </Link>
            <div className="flex gap-3 text-xs">
              <div className="bg-cream border border-ink px-4 py-2 rounded text-center">
                <span className="block font-bold text-lg">{mainOrders.length}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  Total Transaksi
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded text-center">
                <span className="block font-bold text-lg text-amber-700">
                  {
                    mainOrders.filter(
                      (o) =>
                        o.payment_status === "unpaid" ||
                        o.payment_status === "pending" ||
                        (isDpOrder(o) && getLinkedPelunasan(o.order_id)?.payment_status !== "paid"),
                    ).length
                  }
                </span>
                <span className="text-[10px] text-amber-800 uppercase font-semibold">
                  Belum Bayar
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mayar Payment Gateway Modal */}
        {showPaymentModal && mayarCheckoutUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-card rounded-2xl border-2 border-ink shadow-2xl overflow-hidden mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b-2 border-ink bg-cream/20">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-orange" />
                  <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-ink">
                    Pembayaran Online — Mayar
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    void fetchOrders();
                  }}
                  className="p-1.5 rounded-full border border-ink/20 hover:bg-red-50 hover:border-red-300 text-ink hover:text-red-600 transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Mayar Iframe */}
              <iframe
                src={mayarCheckoutUrl}
                className="w-full h-[600px] sm:h-[650px] border-none"
                title="Mayar Payment Gateway"
                allow="payment"
              />
            </div>
          </div>
        )}



        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pesanan berdasarkan ID Pesanan (FILKOM-...) atau nama produk..."
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-ink rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-orange/20 placeholder:text-muted-foreground/60 transition"
          />
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-muted-foreground" />
        </div>

        {/* Status Tabs */}
        <div className="flex border-b-2 border-ink overflow-x-auto whitespace-nowrap scrollbar-none gap-1 sm:gap-2">
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
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-t-2 border-x-2 border-transparent rounded-t-lg -mb-[2px] transition ${activeTab === tab.id
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
                ? "Tidak menemukan transaksi yang cocok dengan ID pesanan atau nama produk pencarian Anda."
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
            {filteredOrders.map((order) => {
              const linkedLns = getLinkedPelunasan(order.order_id);
              const isDp = isDpOrder(order);

              // Calculate expected remaining balance for pelunasan (including size surcharges for sizes > XL)
              const pelunasanAmount = linkedLns
                ? Number(linkedLns.gross_amount)
                : order.items
                ? order.items
                    .filter((item: any) => {
                      const c = String(item.color || "").toUpperCase();
                      const s = String(item.size || "").toUpperCase();
                      return (c.includes("DP") || s.includes("DP")) && !c.includes("LUNAS") && !s.includes("LUNAS");
                    })
                    .reduce((sum: number, item: any) => {
                      const baseSubtotal = Number(item.subtotal || item.unit_price * item.quantity || 0);
                      const sizeAddon = getSizeSurcharge(item.size) * Number(item.quantity || 1);
                      return sum + baseSubtotal + sizeAddon;
                    }, 0)
                : Number(order.gross_amount);

              return (
                <div
                  key={order.order_id}
                  className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(27,27,27,1)]"
                >
                  {/* Card Header */}
                  <div className="bg-cream/40 px-5 py-3.5 border-b-2 border-ink flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center flex-wrap gap-2 text-xs font-bold">
                      <span className="text-muted-foreground">ID Pesanan:</span>
                      <span className="text-ink font-mono font-extrabold bg-white px-2 py-0.5 rounded border border-ink/40">
                        {order.order_id}
                      </span>
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
                      {isDp && (
                        <span className="text-[10px] font-extrabold bg-amber-400/20 text-amber-900 border border-amber-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          DP 50%
                        </span>
                      )}
                    </div>
                    <div>{getStatusBadge(order)}</div>
                  </div>

                  {/* Items Section */}
                  <div className="divide-y border-b-2 border-ink divide-border px-5">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item: any) => (
                        <div key={item.id} className="py-4 flex gap-4 items-start">
                          <div className="w-16 h-20 bg-cream border border-ink rounded overflow-hidden flex items-center justify-center shrink-0">
                            {item.image_url ? (
                              <img src={resolveImageUrl(item.image_url)} alt={item.product_name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-muted-foreground" />
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

                  {/* Embedded Pelunasan Sub-Card (For DP Orders) */}
                  {isDp && (
                    <div className="mx-5 my-4 p-4 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/40 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-amber-500 text-white rounded-lg border border-ink shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-ink uppercase tracking-wide">
                              Status & Rincian Pelunasan
                            </h5>
                            <p className="text-[11px] text-muted-foreground">
                              {linkedLns
                                ? `Nomor Pelunasan: ${linkedLns.order_id}`
                                : "Pelunasan wajib diselesaikan sebelum atau saat pengambilan barang"}
                            </p>
                          </div>
                        </div>
                        {linkedLns && (
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => handleCopyOrderId(linkedLns.order_id)}
                              className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-ink rounded flex items-center gap-1 hover:bg-cream transition cursor-pointer"
                              title="Salin ID Pelunasan"
                            >
                              <span className="truncate max-w-[130px] sm:max-w-none">{linkedLns.order_id}</span>
                              {copiedOrderId === linkedLns.order_id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                            {getPelunasanStatusBadge(linkedLns)}
                          </div>
                        )}
                      </div>

                      {/* Rejection Note Warning for Pelunasan */}
                      {linkedLns && linkedLns.payment_proof_note && (
                        <div className="p-3 bg-red-100/90 border-2 border-red-300 rounded-lg text-red-900 text-xs flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-extrabold text-red-700 uppercase tracking-wider text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            Catatan Admin (Bukti Pelunasan Ditolak):
                          </div>
                          <p className="italic font-medium leading-snug">"{linkedLns.payment_proof_note}"</p>
                          <p className="text-[10px] text-red-600 font-bold mt-1">
                            * Silakan klik tombol "Ganti Bukti Pelunasan" di bawah untuk mengunggah ulang bukti transfer yang valid.
                          </p>
                        </div>
                      )}

                      {/* Pelunasan Amount & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-amber-200/80">
                        <div className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground font-semibold">Nominal Pelunasan (Sisa Kurang): </span>
                            <span className="font-extrabold text-brand-orange text-sm">
                              Rp {pelunasanAmount > 0 ? pelunasanAmount.toLocaleString("id-ID") : "—"}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            * DP Terbayar: Rp {Number(order.gross_amount).toLocaleString("id-ID")}
                            {pelunasanAmount > 0 && ` • Total Harga Produk: Rp ${(Number(order.gross_amount) + pelunasanAmount).toLocaleString("id-ID")}`}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          {linkedLns ? (
                            linkedLns.payment_status === "paid" ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300 rounded-lg text-xs">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Pelunasan Lunas Terbayar
                              </span>
                            ) : linkedLns.payment_proof_url ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => window.open(resolveImageUrl(linkedLns.payment_proof_url), "_blank")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg text-xs transition cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Lihat Bukti
                                </button>
                                <button
                                  onClick={() => navigate({ to: "/order-confirmation", search: { orderId: linkedLns.order_id } })}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-cream text-ink font-bold border-2 border-ink rounded-lg text-xs shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-brand-orange" />
                                  Ganti Bukti
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => navigate({ to: "/order-confirmation", search: { orderId: linkedLns.order_id } })}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold border-2 border-ink rounded-lg text-xs uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Upload Bukti Pelunasan
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => handleCreatePelunasan(order.order_id)}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold border-2 border-ink rounded-lg text-xs uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Bayar Pelunasan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejection Note Warning Alert (For Main Order Proof) */}
                  {order.payment_proof_note && (
                    <div className="px-5 py-3 bg-red-50 border-b-2 border-ink text-red-900 text-xs font-semibold flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-red-700 font-extrabold uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Bukti Pembayaran DP / Utama Ditolak</span>
                      </div>
                      <div className="bg-white/80 border border-red-200 p-3 rounded-lg text-ink">
                        <span className="font-extrabold text-[10px] text-red-800 uppercase block mb-1">Catatan Admin:</span>
                        <p className="italic font-medium leading-snug">"{order.payment_proof_note}"</p>
                      </div>
                      <p className="text-[10px] text-red-600 font-bold leading-normal">
                        * Silakan periksa kembali nominal/bukti transfer Anda, lalu klik tombol "Upload Bukti Pembayaran" di bawah untuk mengunggah ulang bukti transfer yang benar.
                      </p>
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-cream/10 border-t border-ink/20">
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-muted-foreground">Metode Pengiriman: </span>
                        <span className="font-bold text-ink">
                          {getFulfillmentLabel(order.fulfillment_type, order.batch_source)}
                        </span>
                      </div>
                      {order.fulfillment_type === "shipping" && order.shipping_address && (
                        <div>
                          <span className="text-muted-foreground">Alamat Pengiriman: </span>
                          <span className="font-bold text-ink">{order.shipping_address}</span>
                        </div>
                      )}
                      {order.fulfillment_type === "shipping" && (
                        <div className="text-[10px] text-brand-orange font-semibold mt-1">
                          * Ada ongkir menyesuaikan jarak, info lengkap akan diberitahu melalui WhatsApp
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
                      {(order.voucher_code || order.discount_amount > 0) && (
                        <div className="text-xs text-right space-y-0.5 -mb-2">
                          {order.voucher_code && (
                            <div className="text-muted-foreground flex items-center justify-end gap-1.5">
                              <span className="font-bold text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded text-[10px] uppercase border border-brand-orange/30">
                                Voucher Digunakan
                              </span>
                              <span className="font-mono font-extrabold text-ink">{order.voucher_code}</span>
                            </div>
                          )}
                          {order.discount_amount > 0 && (
                            <div className="text-brand-orange font-bold">
                              Diskon: -Rp {Number(order.discount_amount).toLocaleString("id-ID")}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-wide">
                          Total Pesanan:
                        </span>
                        <span className="text-lg font-extrabold text-brand-orange">
                          Rp {order.gross_amount.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: order.order_id }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-bold uppercase bg-amber-100 hover:bg-amber-200 text-ink rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-ink" />
                          Detail Transaksi
                        </Link>

                        {/* Confirm Completion Button */}
                        {(order.order_status === "ready_for_pickup" || order.order_status === "shipped") && (
                          <button
                            onClick={() => handleConfirmCompletion(order.order_id)}
                            disabled={completingOrderId === order.order_id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-extrabold uppercase bg-emerald-500 text-white hover:bg-emerald-600 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {completingOrderId === order.order_id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5" />
                            )}
                            Pesanan Diterima
                          </button>
                        )}

                        {/* Contact admin button for all states */}
                        <a
                          href="https://wa.me/6282287190402"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-bold uppercase bg-white hover:bg-cream rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                          Hubungi Admin
                        </a>

                        {/* Action buttons for main order payment (if main order is unpaid QRIS) */}
                        {isOrderManualQris(order) &&
                          order.order_status !== "cancelled" &&
                          order.payment_status !== "paid" &&
                          (() => {
                            const hasProof = !!order.payment_proof_url;
                            if (hasProof) {
                              return (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => window.open(resolveImageUrl(order.payment_proof_url), "_blank")}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-bold uppercase bg-blue-50 text-blue-700 hover:bg-blue-100 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Lihat Bukti DP
                                  </button>
                                  <button
                                    onClick={() => navigate({ to: "/order-confirmation", search: { orderId: order.order_id } })}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-bold uppercase bg-white hover:bg-cream rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-brand-orange" />
                                    Ganti Bukti DP
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <button
                                onClick={() => navigate({ to: "/order-confirmation", search: { orderId: order.order_id } })}
                                className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-ink text-xs font-extrabold uppercase bg-brand-orange text-white hover:bg-brand-orange/95 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Upload Bukti DP
                              </button>
                            );
                          })()}

                        {/* Mayar: Pay now button for pending main payments (non-QRIS) */}
                        {!isOrderManualQris(order) &&
                          (order.payment_status === "unpaid" || order.payment_status === "pending") &&
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
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
