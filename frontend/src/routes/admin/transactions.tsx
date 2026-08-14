import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, Fragment } from "react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@frontend/components/ui/tabs";
import { Badge } from "@frontend/components/ui/badge";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import { Textarea } from "@frontend/components/ui/textarea";
import { Label } from "@frontend/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@frontend/components/ui/dialog";
import { SendNotificationModal } from "@/components/SendNotificationModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select";
import {
  Eye,
  Trash2,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  Filter,
  Upload,
  X,
  Users,
  Package,
  History,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Truck,
  Store,
  SlidersHorizontal,
  RotateCcw,
  Megaphone,
} from "lucide-react";
import { BroadcastNotificationModal } from "@/components/BroadcastNotificationModal";
import { SentNotificationsHistoryModal } from "@/components/SentNotificationsHistoryModal";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";
import { resolveImageUrl } from "@/lib/image-resolver";
import {
  getOnlineOrders,
  getOfflineSales,
  getOrderById,
  getOfflineSaleById,
  updateOrderStatus,
  deleteOrder,
  deleteOfflineSale,
  verifyPaymentProof,
  getAllClaimsServerAction,
  approveClaimServerAction,
  rejectClaimServerAction,
  type Order,
  type OfflineSale,
} from "@backend/server-actions";

export const Route = createFileRoute("/admin/transactions")({
  component: AdminTransactionsPage,
  head: () => ({ meta: [{ title: "Transaksi — Admin Panel" }] }),
});

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  settlement: "bg-green-100 text-green-800",
  capture: "bg-green-100 text-green-800",
  expire: "bg-red-100 text-red-800",
  cancel: "bg-gray-100 text-gray-600",
  completed: "bg-green-100 text-green-800",
  ready_for_pickup: "bg-teal-100 text-teal-800",
  shipped: "bg-blue-100 text-blue-800",
};

const getPaymentStatusBadge = (order: any, linkedLns?: any) => {
  if (!order) return { text: "-", color: "" };
  const pStatus = order.payment_status;
  const oStatus = order.order_status || order.transaction_status;

  if (oStatus === "cancelled" || oStatus === "cancel") {
    return { text: "Dibatalkan", color: "bg-red-100 text-red-800 border-red-200" };
  }

  const isManualQris =
    order.payment_type === "manual_qris" ||
    !!order.payment_proof_url ||
    String(order.order_id || "").startsWith("LNS");

  if (isManualQris && pStatus !== "paid" && order.payment_proof_note) {
    return { text: "Bukti Ditolak", color: "bg-red-100 text-red-800 border-red-200" };
  }

  if (isManualQris && pStatus !== "paid" && order.payment_proof_url) {
    return { text: "Menunggu Verifikasi", color: "bg-blue-100 text-blue-800 border-blue-200" };
  }

  if (isManualQris && pStatus !== "paid" && !order.payment_proof_url) {
    return { text: "Menunggu Upload Bukti", color: "bg-amber-100 text-amber-800 border-amber-200" };
  }

  const lnsPaid = linkedLns && (linkedLns.payment_status === "paid" || linkedLns.order_status === "completed");
  const itemsList = order.items || [];
  const isDp = order.is_dp || itemsList.some((i: any) => String(i.color || "").includes("DP") || String(i.size || "").includes("DP"));
  const hasRegular = itemsList.some((i: any) => !String(i.color || "").includes("DP") && !String(i.size || "").includes("DP"));

  if (isDp && !lnsPaid) {
    if (hasRegular) {
      return { text: "SEBAGIAN LUNAS", color: "bg-orange-100 text-orange-950 border-orange-300 font-extrabold" };
    }
    return { text: "SUDAH DP BELUM LUNAS", color: "bg-amber-100 text-amber-950 border-amber-300 font-extrabold" };
  }

  if (pStatus === "paid" || oStatus === "completed" || oStatus === "settlement") {
    return { text: "Lunas Terbayar", color: "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold" };
  }

  return { text: "Belum Dibayar", color: "bg-amber-100 text-amber-800 border-amber-200" };
};

const getFulfillmentStatusBadge = (order: any) => {
  if (!order) return { text: "-", color: "" };
  if (order.is_complained) {
    return { text: "Ada Komplain", color: "bg-red-600 text-white border-red-700 font-black animate-pulse" };
  }

  const oStatus = order.order_status || order.fulfillment_status;

  if (oStatus === "completed") {
    return { text: "Selesai / Diterima", color: "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold" };
  }

  if (oStatus === "shipped") {
    return { text: "Sedang Diantar", color: "bg-blue-100 text-blue-800 border-blue-200 font-bold" };
  }

  if (oStatus === "ready_for_pickup") {
    return { text: "Siap Diambil", color: "bg-teal-100 text-teal-800 border-teal-200 font-bold" };
  }

  return { text: "Sedang Diproses", color: "bg-blue-100 text-blue-800 border-blue-200 font-bold" };
};

const getStatusBadgeTextAndColor = getPaymentStatusBadge;

type SortField = "no" | "order_id" | "customer_name" | "gross_amount" | "payment_status" | "fulfillment_status" | "created_at";
type SortDirection = "asc" | "desc";

const SortHeaderColumn = ({
  label,
  field,
  currentField,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "center" | "right";
}) => {
  const isActive = currentField === field;
  const justifyClass =
    align === "center"
      ? "justify-center"
      : align === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <th
      onClick={() => onSort(field)}
      className={`p-3 text-${align} text-xs font-semibold tracking-wider text-ink uppercase cursor-pointer select-none hover:bg-black/5 transition-colors group`}
      title={`Klik untuk mengurutkan ${direction === "asc" ? "Menurun (DESC)" : "Meningkat (ASC)"}`}
    >
      <div className={`inline-flex items-center gap-1.5 ${justifyClass} w-full`}>
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5 text-brand-orange stroke-[3]" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-brand-orange stroke-[3]" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-ink transition-colors" />
        )}
      </div>
    </th>
  );
};

function AdminTransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const isCashier = user?.type === "admin" && user.role === "cashier";
  const API_BASE_URL = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
  const [onlineOrders, setOnlineOrders] = useState<Order[]>([]);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orderClaims, setOrderClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "verifying" | "dp" | "unpaid">("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [productFilterMode, setProductFilterMode] = useState<"include" | "exclude">("include");
  const [shippingFilter, setShippingFilter] = useState<"all" | "pickup" | "delivery">("all");
  const [groupByCustomer, setGroupByCustomer] = useState<boolean>(false);

  // Filter Modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (campaignFilter !== "all") count++;
    if (productFilter.length > 0) count++;
    if (shippingFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    return count;
  }, [campaignFilter, productFilter, shippingFilter, statusFilter]);

  const handleResetAllFilters = () => {
    setCampaignFilter("all");
    setProductFilter([]);
    setProductFilterMode("include");
    setShippingFilter("all");
    setStatusFilter("all");
  };

  // Collapsible Row States
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [rowItems, setRowItems] = useState<Record<string, any[]>>({});
  const [rowItemsLoading, setRowItemsLoading] = useState<Record<string, boolean>>({});

  // Unified Management Modal States
  const [managementOpen, setManagementOpen] = useState(false);
  const [managedType, setManagedType] = useState<"online" | "offline">("online");
  const [managedTransaction, setManagedTransaction] = useState<any>(null);
  const [managedItems, setManagedItems] = useState<any[]>([]);
  const [fetchingManagedDetail, setFetchingManagedDetail] = useState(false);

  const [managedStatus, setManagedStatus] = useState<string>("");
  const [managedShippingAddress, setManagedShippingAddress] = useState<string>("");
  const [managedNotes, setManagedNotes] = useState<string>("");
  const [managedFulfillmentProof, setManagedFulfillmentProof] = useState<string>("");
  const [uploadingFulfillmentProof, setUploadingFulfillmentProof] = useState(false);
  const [savingManaged, setSavingManaged] = useState(false);

  const [verificationNote, setVerificationNote] = useState<string>("");
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);

  // Notification Modal States
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifTargetUser, setNotifTargetUser] = useState<{ id: number; name: string; trxId: string }>({
    id: 0,
    name: "",
    trxId: "",
  });
  const [notifDefaultTitle, setNotifDefaultTitle] = useState("");
  const [notifDefaultMessage, setNotifDefaultMessage] = useState("");
  const [notifDefaultType, setNotifDefaultType] = useState("CUSTOM_DIRECT");
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [zoomMedia, setZoomMedia] = useState<{ url: string, type: string } | null>(null);

  const getAdminRequestHeaders = () => {
    const role = user?.type === "admin" ? user.role : undefined;
    const userId = user?.id ? String(user.id) : undefined;
    const name = user?.type === "admin" ? user.username : user?.name;

    const headers: Record<string, string> = {};
    if (role) headers["x-user-role"] = role;
    if (userId) headers["x-user-id"] = userId;
    if (name) headers["x-user-name"] = name;
    return headers;
  };

  const fetchJson = async <T,>(url: string) => {
    const res = await fetch(url, {
      method: "GET",
      headers: getAdminRequestHeaders(),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    return data as T;
  };

  const loadTransactions = async () => {
    try {
      const online = await fetchJson<{ orders: Order[] }>(`${API_BASE_URL}/api/admin/orders`);
      setOnlineOrders(online.orders || []);
    } catch (error) {
      console.error("Error fetching online orders:", error);
      toast.error("Gagal memuat pesanan online");
      setOnlineOrders([]);
    }

    try {
      const campRes = await fetchJson<{ success: boolean; data: any[] }>(`${API_BASE_URL}/api/pre-order-campaigns`);
      if (campRes?.data) {
        setCampaigns(campRes.data);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }

    try {
      const prodRes = await fetchJson<{ products: any[] }>(`${API_BASE_URL}/api/products`);
      if (prodRes?.products) {
        setProducts(prodRes.products);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }

    try {
      const offline = await fetchJson<{ sales: OfflineSale[] }>(`${API_BASE_URL}/api/sales`);
      setOfflineSales(offline.sales || []);
    } catch (error) {
      console.error("Error fetching offline sales:", error);
      toast.error("Gagal memuat penjualan POS");
      setOfflineSales([]);
    }

    try {
      const claimsRes = await getAllClaimsServerAction();
      if (claimsRes && claimsRes.success && claimsRes.claims) {
        setOrderClaims(claimsRes.claims);
      }
    } catch (error) {
      console.error("Error fetching claims:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadTransactions();
  }, [authLoading, user]);

  const toggleRow = async (id: string, type: "online" | "offline") => {
    const isExpanded = !!expandedRows[id];
    setExpandedRows((prev) => ({ ...prev, [id]: !isExpanded }));

    if (!isExpanded && !rowItems[id]) {
      setRowItemsLoading((prev) => ({ ...prev, [id]: true }));
      try {
        if (type === "online") {
          const result = await getOrderById({ data: id });
          if (result.success && result.items) {
            setRowItems((prev) => ({ ...prev, [id]: result.items || [] }));
          }
        } else {
          const result = await getOfflineSaleById({ data: id });
          if (result.success && result.items) {
            setRowItems((prev) => ({ ...prev, [id]: result.items || [] }));
          }
        }
      } catch (err) {
        console.error("Error loading row items:", err);
      } finally {
        setRowItemsLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const handleOpenManagement = async (id: string, type: "online" | "offline") => {
    setFetchingManagedDetail(true);
    setManagedType(type);
    setVerificationNote("");
    setShowRejectReason(false);
    setManagementOpen(true);

    try {
      if (type === "online") {
        const result = await getOrderById({ data: id });
        if (result.success && result.order) {
          setManagedTransaction(result.order);
          setManagedItems(result.items || []);
          setManagedStatus(result.order.transaction_status);
          setManagedShippingAddress(result.order.shipping_address || "");
          setManagedNotes(result.order.notes || "");
          setManagedFulfillmentProof(result.order.fulfillment_proof_url || "");
        } else {
          toast.error("Gagal mengambil detail pesanan");
          setManagementOpen(false);
        }
      } else {
        const result = await getOfflineSaleById({ data: id });
        if (result.success && result.sale) {
          setManagedTransaction(result.sale);
          setManagedItems(result.items || []);
        } else {
          toast.error("Gagal mengambil detail penjualan POS");
          setManagementOpen(false);
        }
      }
    } catch {
      toast.error("Terjadi kesalahan memuat detail");
      setManagementOpen(false);
    } finally {
      setFetchingManagedDetail(false);
    }
  };

  const handleSaveManagedStatus = async () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah status transaksi.");
      return;
    }
    if (!managedTransaction || !managedStatus) return;
    setSavingManaged(true);
    try {
      const result = await updateOrderStatus({
        data: {
          id: managedTransaction.order_id,
          status: managedStatus,
          shipping_address: managedShippingAddress || undefined,
          notes: managedNotes || undefined,
          fulfillment_proof_url: managedFulfillmentProof || undefined,
        },
      });
      if (result.success) {
        toast.success("Status transaksi berhasil diperbarui!");
        await loadTransactions();
        // Re-fetch details to sync state
        const detailRes = await getOrderById({ data: managedTransaction.order_id });
        if (detailRes.success && detailRes.order) {
          setManagedTransaction(detailRes.order);
        }
        setManagementOpen(false);
      } else {
        toast.error(result.error || "Gagal memperbarui status");
      }
    } catch {
      toast.error("Gagal melakukan aksi pembaruan");
    } finally {
      setSavingManaged(false);
    }
  };

  const openNotifModalForOrder = (order: any, presetType: string = "CUSTOM_DIRECT") => {
    const userId = order?.user_id || 0;
    const userName = order?.customer_name || order?.user_name || "Pembeli";
    const trxId = order?.order_id || "";

    setNotifTargetUser({ id: userId, name: userName, trxId });

    if (presetType === "PREORDER_READY") {
      setNotifDefaultTitle(`📦 Pesanan #${trxId} Siap Diambil!`);
      setNotifDefaultMessage(`Halo Kak ${userName}! Barang Pre-Order kamu sudah siap diambil di FILKOM Merch (Belakang Tulisan FILKOM dekat FTP). Silakan tunjukkan QR / ID pesanan.`);
      setNotifDefaultType("PREORDER_READY");
    } else if (presetType === "PAYMENT_REJECTED") {
      setNotifDefaultTitle(`⚠️ Bukti Pembayaran Perlu Diupload Ulang (#${trxId})`);
      setNotifDefaultMessage(`Bukti pembayaran kamu belum sesuai (buram/nominal tidak cocok). Mohon lakukan upload ulang bukti transfer.`);
      setNotifDefaultType("PAYMENT_REJECTED");
    } else {
      setNotifDefaultTitle(`Info Pesanan #${trxId}`);
      setNotifDefaultMessage("");
      setNotifDefaultType("CUSTOM_DIRECT");
    }

    setManagementOpen(false);
    setNotifModalOpen(true);
  };

  const handleUploadFulfillmentProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFulfillmentProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url || data.path) {
        setManagedFulfillmentProof(data.url || data.path);
        toast.success("Foto bukti penyiapan/resi berhasil diunggah");
      } else {
        toast.error(data.error || "Gagal mengunggah file");
      }
    } catch {
      toast.error("Gagal mengunggah foto bukti");
    } finally {
      setUploadingFulfillmentProof(false);
    }
  };

  const handleVerifyManaged = async (isAccepted: boolean) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan memverifikasi pembayaran.");
      return;
    }
    if (!managedTransaction) return;

    if (!isAccepted && !verificationNote.trim()) {
      toast.error("Catatan wajib diisi jika bukti pembayaran ditolak.");
      return;
    }

    setSubmittingVerification(true);
    try {
      const result = await verifyPaymentProof({
        data: {
          id: managedTransaction.order_id,
          isAccepted,
          note: isAccepted ? undefined : verificationNote.trim(),
        },
      });
      if (result.success) {
        toast.success(
          isAccepted
            ? "Pembayaran berhasil diverifikasi & dikonfirmasi (Status: Sedang Diproses)"
            : "Bukti pembayaran ditolak & catatan terkirim ke pembeli"
        );
        setShowRejectReason(false);
        setVerificationNote("");
        await loadTransactions();
        // Re-fetch details to sync state
        const detailRes = await getOrderById({ data: managedTransaction.order_id });
        if (detailRes.success && detailRes.order) {
          setManagedTransaction(detailRes.order);
          setManagedStatus(detailRes.order.transaction_status);
          setManagedShippingAddress(detailRes.order.shipping_address || "");
          setManagedNotes(detailRes.order.notes || "");
        }
      } else {
        toast.error(result.error || "Gagal memproses verifikasi");
      }
    } catch (error: any) {
      toast.error(error.message || "Gagal memproses verifikasi");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus transaksi.");
      return;
    }
    if (!window.confirm(`Hapus transaksi online ${id} secara permanen?`)) return;
    try {
      const result = await deleteOrder({ data: id });
      if (result.success) {
        toast.success("Transaksi berhasil dihapus");
        await loadTransactions();
      } else {
        toast.error(result.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Aksi gagal");
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus data POS.");
      return;
    }
    if (!window.confirm(`Hapus penjualan offline POS ${id} secara permanen?`)) return;
    try {
      const result = await deleteOfflineSale({ data: id });
      if (result.success) {
        toast.success("Data POS berhasil dihapus");
        await loadTransactions();
      } else {
        toast.error(result.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Aksi gagal");
    }
  };

  const handleApproveClaim = async (id: number) => {
    if (!window.confirm("Setujui klaim ini dan hubungkan pesanan ke akun pembeli?")) return;
    const adminNote = window.prompt("Catatan untuk pengguna (opsional):");
    try {
      const res = await approveClaimServerAction({ data: { id, adminNote: adminNote || undefined } });
      if (res.success) {
        toast.success(res.message);
        await loadTransactions();
      } else {
        toast.error(res.error || "Gagal menyetujui klaim");
      }
    } catch (e: any) {
      toast.error("Terjadi kesalahan sistem");
    }
  };

  const handleRejectClaim = async (id: number) => {
    if (!window.confirm("Tolak klaim ini?")) return;
    const adminNote = window.prompt("Catatan untuk pengguna (wajib jika ditolak, opsional):");
    try {
      const res = await rejectClaimServerAction({ data: { id, adminNote: adminNote || undefined } });
      if (res.success) {
        toast.success(res.message);
        await loadTransactions();
      } else {
        toast.error(res.error || "Gagal menolak klaim");
      }
    } catch (e: any) {
      toast.error("Terjadi kesalahan sistem");
    }
  };



  const isDpOrder = (o: any) => {
    if (!o) return false;
    if (o.is_dp !== undefined && o.is_dp !== null) return !!o.is_dp;
    const notes = String(o.notes || "").toUpperCase();
    if (notes.includes("PELUNASAN") || notes.includes("LUNAS")) return false;
    if (o.items && Array.isArray(o.items)) {
      const hasLunasVariant = o.items.some((i: any) => {
        const c = String(i?.color || "").toUpperCase();
        const s = String(i?.size || "").toUpperCase();
        return c.includes("LUNAS") || s.includes("LUNAS") || c.includes("FULL") || s.includes("FULL");
      });
      if (hasLunasVariant) return false;

      const hasDpVariant = o.items.some((i: any) => {
        const c = String(i?.color || "").toUpperCase();
        const s = String(i?.size || "").toUpperCase();
        return c.includes("DP") || s.includes("DP");
      });
      if (hasDpVariant) return true;
    }
    if (notes.includes("DP")) return true;
    return false;
  };

  // Map LNS pelunasan orders by parent order ID
  const dpPelunasanMap = useMemo(() => {
    const map: Record<string, any> = {};
    (onlineOrders || []).forEach((o) => {
      if (String(o.order_id || "").startsWith("LNS") || (o.notes && o.notes.includes("Pelunasan untuk Order:"))) {
        const match = o.notes && o.notes.match(/Pelunasan untuk Order:\s*([A-Za-z0-9-]+)/);
        if (match && match[1]) {
          map[match[1]] = o;
        } else {
          const parts = (o.order_id || "").split("-");
          if (parts.length >= 3) {
            const parentId = parts.slice(1, parts.length - 1).join("-");
            map[parentId] = o;
          }
        }
      }
    });
    return map;
  }, [onlineOrders]);

  // Extract unique product names from products table for the filter dropdown
  const uniqueProductNames = useMemo(() => {
    return products
      .filter((p) => p.name)
      .map((p) => ({ id: p.id, name: String(p.name).trim() }))
      .sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [products]);

  // 1. Base filtered list (respects campaign batch filter and search query)
  const baseFilteredOrders = useMemo(() => {
    const ordersList = Array.isArray(onlineOrders) ? onlineOrders : [];
    const parentIdsInList = new Set(ordersList.map((o) => o.order_id));

    return ordersList.filter((order) => {
      if (!order) return false;

      // Hide standalone LNS orders if their parent DP order exists in list (it will be rendered as sub-row)
      const isLns = String(order.order_id || "").startsWith("LNS") || (order.notes && order.notes.includes("Pelunasan untuk Order:"));
      if (isLns) {
        const match = order.notes && order.notes.match(/Pelunasan untuk Order:\s*([A-Za-z0-9-]+)/);
        const parentId = match ? match[1] : order.order_id.split("-").slice(1, -1).join("-");
        if (parentId && parentIdsInList.has(parentId) && !searchQuery) {
          return false;
        }
      }

      // Campaign Batch Filter (Match by explicit campaign ID or order creation date within campaign window)
      if (campaignFilter !== "all") {
        const orderCampaignId = (order as any).pre_order_campaign_id;
        const matchedCampaign = campaigns.find((c) => {
          if (orderCampaignId && Number(orderCampaignId) === Number(c.id)) {
            return true;
          }
          if (c.start_date && (c.extended_end_date || c.end_date) && order.created_at) {
            const dt = new Date(order.created_at).getTime();
            const s = new Date(c.start_date).getTime();
            const e = new Date(c.extended_end_date || c.end_date).getTime();
            if (!isNaN(dt) && !isNaN(s) && !isNaN(e)) {
              return dt >= s && dt <= e;
            }
          }
          return false;
        });

        if (campaignFilter === "none") {
          // Ready Stock (orders not belonging to any pre-order campaign)
          if (matchedCampaign) return false;
        } else {
          // Specific campaign batch (e.g. Batch #2)
          if (!matchedCampaign || String(matchedCampaign.id) !== String(campaignFilter)) {
            return false;
          }
        }
      }

      // Product Filter: check if order contains items matching ANY of the selected products
      if (productFilter.length > 0) {
        const orderItems = (order as any).items || [];
        const selectedProductNames = products
          .filter((p) => productFilter.includes(String(p.id)))
          .map((p) => String(p.name).trim().toLowerCase());

        const hasMatchingProduct = orderItems.some((item: any) => {
          const itemName = String(item.product_name || "").trim().toLowerCase();
          const cleanItemName = itemName
            .replace(/\s*\(?(dp|pelunasan|lunas|full)\)?\s*$/i, "")
            .replace(/\s*-\s*(dp|pelunasan|lunas|full)\s*$/i, "")
            .trim();

          return selectedProductNames.some(
            (filterName) => itemName.includes(filterName) || cleanItemName === filterName
          );
        });

        if (productFilterMode === "exclude") {
          // Exclude mode: hide orders that contain ANY of the selected products
          if (hasMatchingProduct) return false;
        } else {
          // Include mode (default): only show orders containing selected products
          if (!hasMatchingProduct) return false;
        }
      }

      // Shipping Method Filter (Ambil di FILKOM Merch vs Diantar)
      if (shippingFilter !== "all") {
        const addr = String((order as any).shipping_address || "").toLowerCase();
        const isPickup = !addr || addr.includes("ambil") || addr.includes("filkom merch") || addr.includes("pickup");
        if (shippingFilter === "pickup" && !isPickup) return false;
        if (shippingFilter === "delivery" && isPickup) return false;
      }

      // Search Query Filter
      const query = (searchQuery || "").toLowerCase();
      const linkedLns = dpPelunasanMap[order.order_id];
      const matchesQuery =
        !query ||
        String(order.order_id || "").toLowerCase().includes(query) ||
        String(order.customer_name || "").toLowerCase().includes(query) ||
        String(order.customer_email || "").toLowerCase().includes(query) ||
        String(order.customer_phone || "").toLowerCase().includes(query) ||
        String(order.payment_type || "").toLowerCase().includes(query) ||
        String(order.transaction_status || "").toLowerCase().includes(query) ||
        (linkedLns && String(linkedLns.order_id || "").toLowerCase().includes(query));

      return matchesQuery;
    });
  }, [onlineOrders, searchQuery, campaignFilter, productFilter, productFilterMode, shippingFilter, dpPelunasanMap]);

  const getOrderCategory = (order: Order): "paid" | "verifying" | "unpaid" => {
    const linkedLns = dpPelunasanMap[order.order_id];
    const isPaid =
      order.payment_status === "paid" ||
      order.transaction_status === "settlement" ||
      order.order_status === "completed";
    const lnsIsPaid = linkedLns && (linkedLns.payment_status === "paid" || linkedLns.order_status === "completed");

    if (isPaid && (!linkedLns || lnsIsPaid)) {
      return "paid";
    }

    const isVerifyingOrder = (o: any) => {
      if (!o) return false;
      const oPaid = o.payment_status === "paid" || o.transaction_status === "settlement" || o.order_status === "completed";
      if (oPaid) return false;

      const hasProof = !!o.payment_proof_url;
      const isRejected = (o.payment_status as string) === "rejected" || !!o.payment_proof_note;

      return hasProof && !isRejected;
    };

    if (isVerifyingOrder(order) || (linkedLns && isVerifyingOrder(linkedLns))) {
      return "verifying";
    }

    return "unpaid";
  };

  // 2. Stats summary computed strictly from baseFilteredOrders (always matches active batch filter & search)
  const stats = useMemo(() => {
    const total = baseFilteredOrders.length;
    let paidCount = 0;
    let verifyingBarisCount = 0;
    let totalVerifyingProofs = 0;
    let dpCount = 0;
    let unpaidCount = 0;

    const isVerifyingOrder = (o: any) => {
      if (!o) return false;
      const oPaid = o.payment_status === "paid" || o.transaction_status === "settlement" || o.order_status === "completed";
      if (oPaid) return false;

      const hasProof = !!o.payment_proof_url;
      const isRejected = (o.payment_status as string) === "rejected" || !!o.payment_proof_note;

      return hasProof && !isRejected;
    };

    baseFilteredOrders.forEach((o) => {
      if (!o) return;

      const cat = getOrderCategory(o);
      if (cat === "paid") paidCount++;
      else if (cat === "verifying") {
        verifyingBarisCount++;
      } else if (cat === "unpaid") unpaidCount++;

      if (isVerifyingOrder(o)) {
        totalVerifyingProofs++;
      }

      const linkedLns = dpPelunasanMap[o.order_id];
      if (linkedLns && isVerifyingOrder(linkedLns)) {
        totalVerifyingProofs++;
      }

      if (isDpOrder(o)) {
        dpCount++;
      }
    });

    return {
      total,
      paidCount,
      verifyingCount: totalVerifyingProofs, // 10 Total Proofs needing ACC
      verifyingBarisCount, // 8 Main Rows in Table
      dpCount,
      unpaidCount,
    };
  }, [baseFilteredOrders, dpPelunasanMap]);

  // 3. Final filtered orders list applying status filter
  const filteredOnlineOrders = useMemo(() => {
    if (statusFilter === "all") return baseFilteredOrders;

    return baseFilteredOrders.filter((order) => {
      if (statusFilter === "dp") return isDpOrder(order);
      return getOrderCategory(order) === statusFilter;
    });
  }, [baseFilteredOrders, statusFilter, dpPelunasanMap]);

  const targetUserIds = useMemo(() => {
    const ids = filteredOnlineOrders
      .map((o) => o.user_id)
      .filter((id): id is number => !!id && Number(id) > 0);
    return Array.from(new Set(ids));
  }, [filteredOnlineOrders]);

  const targetFilterSummary = useMemo(() => {
    const filters: string[] = [];
    if (statusFilter !== "all") {
      const statusLabels: Record<string, string> = {
        paid: "Lunas",
        verifying: "Butuh ACC",
        dp: "DP",
        unpaid: "Belum Bayar",
      };
      filters.push(`Status: ${statusLabels[statusFilter] || statusFilter}`);
    }
    if (campaignFilter !== "all") {
      if (campaignFilter === "none") {
        filters.push("Batch: Ready Stock");
      } else {
        const camp = campaigns.find((c) => String(c.id) === String(campaignFilter));
        filters.push(`Batch: ${camp?.batch_name || campaignFilter}`);
      }
    }
    if (productFilter.length > 0) {
      filters.push(`Produk: ${productFilter.length} dipilih`);
    }
    if (shippingFilter !== "all") {
      filters.push(`Pengiriman: ${shippingFilter === "pickup" ? "Ambil di Store" : "Diantar"}`);
    }
    if (searchQuery) {
      filters.push(`Pencarian: "${searchQuery}"`);
    }

    if (filters.length === 0) return "Menampilkan semua transaksi online";
    return `Filter Aktif: ${filters.join(", ")}`;
  }, [statusFilter, campaignFilter, campaigns, productFilter, shippingFilter, searchQuery]);

  const groupedCustomerOrders = useMemo(() => {
    if (!groupByCustomer) return [];

    const groups: Array<{
      key: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_nim: string;
      words: string[];
      emails: Set<string>;
      phones: Set<string>;
      orders: Order[];
      total_amount: number;
      paid_count: number;
      pending_count: number;
      latest_created_at: string;
    }> = [];

    const getCleanWords = (name: string) => {
      return String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length >= 2);
    };

    const getCleanPhone = (phone: string) => {
      const digits = String(phone || "").replace(/\D/g, "");
      return digits.length >= 8 ? digits.slice(-9) : "";
    };

    filteredOnlineOrders.forEach((o) => {
      const rawName = (o.customer_name || o.customer_email || "Pelanggan").trim();
      const rawEmail = String(o.customer_email || "").trim().toLowerCase();
      const rawPhone = String(o.customer_phone || "").trim();
      const cleanPhone = getCleanPhone(rawPhone);
      const words = getCleanWords(rawName);

      // Find existing group that matches by email, phone, or >=2 words in name
      let matchedGroup = groups.find((g) => {
        if (rawEmail && rawEmail !== "-" && g.emails.has(rawEmail)) {
          return true;
        }
        if (cleanPhone && g.phones.has(cleanPhone)) {
          return true;
        }
        if (words.length >= 2 && g.words.length >= 2) {
          const sharedWords = words.filter((w) => g.words.includes(w));
          if (sharedWords.length >= 2) {
            return true;
          }
        }
        return false;
      });

      if (!matchedGroup) {
        matchedGroup = {
          key: `group-${groups.length + 1}-${rawName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          customer_name: rawName,
          customer_email: rawEmail && rawEmail !== "-" ? rawEmail : "-",
          customer_phone: rawPhone && rawPhone !== "-" ? rawPhone : "-",
          customer_nim: (o as any).user_nim || (o as any).customer_nim || "-",
          words,
          emails: new Set(rawEmail && rawEmail !== "-" ? [rawEmail] : []),
          phones: new Set(cleanPhone ? [cleanPhone] : []),
          orders: [],
          total_amount: 0,
          paid_count: 0,
          pending_count: 0,
          latest_created_at: o.created_at,
        };
        groups.push(matchedGroup);
      } else {
        if (rawName.length > matchedGroup.customer_name.length) {
          matchedGroup.customer_name = rawName;
        }
        if (rawEmail && rawEmail !== "-" && matchedGroup.customer_email === "-") {
          matchedGroup.customer_email = rawEmail;
        }
        if (rawPhone && rawPhone !== "-" && matchedGroup.customer_phone === "-") {
          matchedGroup.customer_phone = rawPhone;
        }
        if (rawEmail && rawEmail !== "-") matchedGroup.emails.add(rawEmail);
        if (cleanPhone) matchedGroup.phones.add(cleanPhone);

        words.forEach((w) => {
          if (!matchedGroup!.words.includes(w)) {
            matchedGroup!.words.push(w);
          }
        });
      }

      matchedGroup.orders.push(o);
      matchedGroup.total_amount += Number(o.gross_amount || 0);

      const isPaid =
        o.payment_status === "paid" ||
        o.transaction_status === "settlement" ||
        o.order_status === "completed";
      if (isPaid) {
        matchedGroup.paid_count++;
      } else {
        matchedGroup.pending_count++;
      }

      if (new Date(o.created_at) > new Date(matchedGroup.latest_created_at)) {
        matchedGroup.latest_created_at = o.created_at;
      }
    });

    return groups;
  }, [filteredOnlineOrders, groupByCustomer]);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedOnlineOrders = useMemo(() => {
    const list = [...filteredOnlineOrders];
    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "order_id":
          valA = String(a.order_id || "");
          valB = String(b.order_id || "");
          break;
        case "customer_name":
          valA = String(a.customer_name || "").toLowerCase();
          valB = String(b.customer_name || "").toLowerCase();
          break;
        case "gross_amount":
          valA = Number(a.gross_amount || 0);
          valB = Number(b.gross_amount || 0);
          break;
        case "payment_status":
          valA = getPaymentStatusBadge(a, dpPelunasanMap[a.order_id]).text;
          valB = getPaymentStatusBadge(b, dpPelunasanMap[b.order_id]).text;
          break;
        case "fulfillment_status":
          valA = getFulfillmentStatusBadge(a).text;
          valB = getFulfillmentStatusBadge(b).text;
          break;
        case "created_at":
        case "no":
        default:
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredOnlineOrders, sortField, sortDirection, dpPelunasanMap]);

  const sortedGroupedCustomerOrders = useMemo(() => {
    const list = [...groupedCustomerOrders];
    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "order_id":
          valA = a.orders.length;
          valB = b.orders.length;
          break;
        case "customer_name":
          valA = String(a.customer_name || "").toLowerCase();
          valB = String(b.customer_name || "").toLowerCase();
          break;
        case "gross_amount":
          valA = Number(a.total_amount || 0);
          valB = Number(b.total_amount || 0);
          break;
        case "payment_status":
          valA = a.paid_count;
          valB = b.paid_count;
          break;
        case "created_at":
        case "no":
        default:
          valA = new Date(a.latest_created_at || 0).getTime();
          valB = new Date(b.latest_created_at || 0).getTime();
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [groupedCustomerOrders, sortField, sortDirection]);

  const sortedOfflineSales = useMemo(() => {
    const salesList = Array.isArray(offlineSales) ? offlineSales : [];
    const filtered = salesList.filter((sale) => {
      if (!sale) return false;
      const query = (searchQuery || "").toLowerCase();
      return (
        !query ||
        String(sale.sale_id || "").toLowerCase().includes(query) ||
        String(sale.customer_name || "").toLowerCase().includes(query) ||
        String(sale.cashier_name || "").toLowerCase().includes(query) ||
        String(sale.payment_method || "").toLowerCase().includes(query) ||
        String(sale.status || "").toLowerCase().includes(query)
      );
    });

    filtered.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortField) {
        case "order_id":
          valA = String(a.sale_id || "");
          valB = String(b.sale_id || "");
          break;
        case "customer_name":
          valA = String(a.customer_name || "").toLowerCase();
          valB = String(b.customer_name || "").toLowerCase();
          break;
        case "gross_amount":
          valA = Number(a.total || 0);
          valB = Number(b.total || 0);
          break;
        case "payment_status":
          valA = String(a.status || "");
          valB = String(b.status || "");
          break;
        case "created_at":
        case "no":
        default:
          valA = new Date(a.created_at || 0).getTime();
          valB = new Date(b.created_at || 0).getTime();
          break;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [offlineSales, searchQuery, sortField, sortDirection]);

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider">Manajemen Transaksi</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Pesanan website dan POS Kasir.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 border-2 border-ink rounded-xl text-xs font-extrabold bg-white text-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer hover:bg-gray-100 transition-all active:scale-95 shrink-0"
            title="Kelola & Tarik Notifikasi Terkirim"
          >
            <History className="w-4 h-4 text-brand-orange" />
            Riwayat / Tarik Notif
          </button>
          <button
            type="button"
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-ink rounded-xl text-xs font-extrabold bg-brand-orange text-white shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer hover:bg-brand-orange/90 transition-all active:scale-95 shrink-0"
          >
            <Megaphone className="w-4 h-4" />
            Broadcast Push Notif
          </button>
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari transaksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-2 border-ink focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
      </div>

      {/* Stat Cards / Interactive Status Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Semua */}
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${statusFilter === "all"
            ? "bg-ink text-white border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] scale-[1.02]"
            : "bg-white text-ink border-ink/30 hover:border-ink hover:shadow-[3px_3px_0px_0px_rgba(27,27,27,0.8)]"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
              Total Semua
            </span>
            <ShoppingBag className="w-4 h-4 opacity-70" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.total}
            </span>
            <span className="text-[10px] font-bold block mt-1 opacity-70">
              Semua Transaksi
            </span>
          </div>
          {statusFilter === "all" && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-orange"></span>
          )}
        </button>

        {/* Menunggu Verifikasi */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "verifying" ? "all" : "verifying")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${statusFilter === "verifying"
            ? "bg-blue-600 text-white border-blue-900 shadow-[4px_4px_0px_0px_rgba(30,58,138,1)] scale-[1.02]"
            : "bg-blue-50/70 text-blue-950 border-blue-200 hover:border-blue-500 hover:shadow-[3px_3px_0px_0px_rgba(59,130,246,0.3)]"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Butuh ACC Admin
            </span>
            <div className="relative">
              <Clock className="w-4 h-4 text-blue-500" />
              {stats.verifyingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping"></span>
              )}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.verifyingCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-blue-700">
              {stats.verifyingCount !== stats.verifyingBarisCount
                ? `${stats.verifyingCount} Bukti (${stats.verifyingBarisCount} Pesanan)`
                : "Menunggu Verifikasi"}
            </span>
          </div>
        </button>

        {/* Lunas / Selesai */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "paid" ? "all" : "paid")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${statusFilter === "paid"
            ? "bg-emerald-700 text-white border-emerald-950 shadow-[4px_4px_0px_0px_rgba(6,78,59,1)] scale-[1.02]"
            : "bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:border-emerald-500 hover:shadow-[3px_3px_0px_0px_rgba(16,185,129,0.3)]"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Lunas Terbayar
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.paidCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-emerald-700">
              Lunas / Selesai
            </span>
          </div>
        </button>

        {/* Pesanan DP */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "dp" ? "all" : "dp")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${statusFilter === "dp"
            ? "bg-amber-600 text-white border-amber-950 shadow-[4px_4px_0px_0px_rgba(120,53,15,1)] scale-[1.02]"
            : "bg-amber-50/70 text-amber-950 border-amber-200 hover:border-amber-500 hover:shadow-[3px_3px_0px_0px_rgba(245,158,11,0.3)]"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Down Payment
            </span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.dpCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-amber-800">
              Pesanan DP
            </span>
          </div>
        </button>

        {/* Belum Dibayar */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "unpaid" ? "all" : "unpaid")}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${statusFilter === "unpaid"
            ? "bg-rose-700 text-white border-rose-950 shadow-[4px_4px_0px_0px_rgba(136,19,55,1)] scale-[1.02]"
            : "bg-rose-50/70 text-rose-950 border-rose-200 hover:border-rose-500 hover:shadow-[3px_3px_0px_0px_rgba(244,63,94,0.3)]"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Belum Bayar
            </span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.unpaidCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-rose-700">
              Menunggu Bukti / Transfer
            </span>
          </div>
        </button>
      </div>

      {(statusFilter !== "all" || productFilter.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 bg-brand-orange/10 border border-brand-orange/30 px-3.5 py-2 rounded-xl text-xs text-brand-orange font-bold">
          <Filter className="w-4 h-4" />
          <div className="flex flex-wrap items-center gap-1.5">
            {statusFilter !== "all" && (
              <span>
                Status:{" "}
                <strong className="uppercase underline">
                  {statusFilter === "verifying"
                    ? "Menunggu Verifikasi"
                    : statusFilter === "paid"
                      ? "Lunas / Selesai"
                      : statusFilter === "dp"
                        ? "Pesanan DP"
                        : "Belum Dibayar"}
                </strong>
              </span>
            )}
            {statusFilter !== "all" && productFilter.length > 0 && (
              <span className="text-brand-orange/50">•</span>
            )}
            {productFilter.length > 0 && (
              <span>
                Produk {productFilterMode === "exclude" ? "TANPA" : "BERISI"} ({productFilter.length}):{" "}
                <strong className="uppercase underline">
                  {productFilter.map((id) => products.find((p) => String(p.id) === id)?.name || id).slice(0, 2).join(", ")}
                  {productFilter.length > 2 ? "..." : ""}
                </strong>
              </span>
            )}
          </div>
          <button
            onClick={() => { setStatusFilter("all"); setProductFilter([]); setProductFilterMode("include"); }}
            className="ml-auto text-[10px] uppercase bg-brand-orange text-white px-2.5 py-1 rounded hover:bg-brand-orange/90 font-black cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      <Tabs defaultValue="online">
        <TabsList>
          <TabsTrigger value="online">Pesanan Online</TabsTrigger>
          <TabsTrigger value="offline">Penjualan Offline / POS</TabsTrigger>
          <TabsTrigger value="claims">
            Klaim Pesanan
            {orderClaims.filter(c => c.status === 'pending').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {orderClaims.filter(c => c.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="online">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="display text-sm tracking-wider text-ink">
                  Pesanan Online ({
                    groupByCustomer
                      ? `${groupedCustomerOrders.length} Pembeli`
                      : statusFilter === "verifying" && stats.verifyingCount !== stats.verifyingBarisCount
                        ? `${filteredOnlineOrders.length} Pesanan (${stats.verifyingCount} Bukti ACC)`
                        : `${filteredOnlineOrders.length} Transaksi`
                  })
                </CardTitle>

                {/* Clean Control Bar with Filter Modal Trigger */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant={activeFilterCount > 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterModalOpen(true)}
                    className={`h-9 text-xs font-black border-2 border-ink transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] flex items-center gap-2 ${activeFilterCount > 0
                      ? "bg-brand-orange text-white hover:bg-brand-orange/90"
                      : "bg-white text-ink hover:bg-cream"
                      }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter Transaksi</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-white text-brand-orange text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[18px] text-center border border-brand-orange/30">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>

                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResetAllFilters}
                      className="h-9 px-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                      title="Reset semua filter"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Reset Filter</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant={groupByCustomer ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGroupByCustomer(!groupByCustomer)}
                    className={`h-9 text-xs font-black border-2 border-ink transition-all cursor-pointer ${groupByCustomer ? "bg-purple-600 text-white hover:bg-purple-700 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-white text-ink hover:bg-cream"
                      }`}
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    {groupByCustomer ? "Gabung Pembeli (Aktif)" : "Gabungkan Nama Pembeli Sama"}
                  </Button>
                </div>
              </div>

              {/* Active Filter Chips Summary */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-dashed border-border mt-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Filter Aktif:
                  </span>
                  {campaignFilter !== "all" && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 text-[10px] font-bold flex items-center gap-1">
                      Batch: {campaignFilter === "none" ? "Ready Stock" : campaigns.find(c => String(c.id) === campaignFilter)?.batch_name || `#${campaignFilter}`}
                      <X className="w-3 h-3 cursor-pointer ml-1 hover:text-red-600" onClick={() => setCampaignFilter("all")} />
                    </Badge>
                  )}
                  {productFilter.length > 0 && (
                    <Badge variant="outline" className={`${productFilterMode === "exclude" ? "bg-red-50 text-red-900 border-red-300" : "bg-blue-50 text-blue-900 border-blue-300"} text-[10px] font-bold flex items-center gap-1`}>
                      {productFilterMode === "exclude" ? "TANPA" : "Produk"} ({productFilter.length}): {
                        productFilter.map(id => uniqueProductNames.find(p => String(p.id) === id)?.name || id).slice(0, 2).join(", ")
                      }{productFilter.length > 2 ? "..." : ""}
                      <X className="w-3 h-3 cursor-pointer ml-1 hover:text-red-600" onClick={() => { setProductFilter([]); setProductFilterMode("include"); }} />
                    </Badge>
                  )}
                  {shippingFilter !== "all" && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300 text-[10px] font-bold flex items-center gap-1">
                      Pengiriman: {shippingFilter === "pickup" ? "Ambil Store" : "Diantar"}
                      <X className="w-3 h-3 cursor-pointer ml-1 hover:text-red-600" onClick={() => setShippingFilter("all")} />
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-900 border-purple-300 text-[10px] font-bold flex items-center gap-1">
                      Status: {statusFilter === "paid" ? "Lunas" : statusFilter === "verifying" ? "ACC Admin" : statusFilter === "dp" ? "Pesanan DP" : "Belum Bayar"}
                      <X className="w-3 h-3 cursor-pointer ml-1 hover:text-red-600" onClick={() => setStatusFilter("all")} />
                    </Badge>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="w-10 p-3"></th>
                      <SortHeaderColumn label="NO" field="no" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <SortHeaderColumn label="ORDER ID" field="order_id" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <SortHeaderColumn label="PELANGGAN" field="customer_name" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <SortHeaderColumn label="TOTAL" field="gross_amount" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                      <SortHeaderColumn label="STATUS PEMBAYARAN" field="payment_status" currentField={sortField} direction={sortDirection} onSort={handleSort} align="center" />
                      <SortHeaderColumn label="STATUS PENERIMAAN" field="fulfillment_status" currentField={sortField} direction={sortDirection} onSort={handleSort} align="center" />
                      <SortHeaderColumn label="TANGGAL" field="created_at" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupByCustomer ? (
                      sortedGroupedCustomerOrders.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground font-bold">
                            Tidak ada data pembeli yang cocok dengan filter
                          </td>
                        </tr>
                      ) : (
                        sortedGroupedCustomerOrders.map((group, idx) => {
                          const isExpanded = !!expandedRows[`group-${group.key}`];
                          return (
                            <Fragment key={group.key}>
                              <tr className="border-t border-border hover:bg-cream/20 transition-colors">
                                <td className="p-3 text-center">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-muted"
                                    onClick={() => {
                                      setExpandedRows((prev) => ({ ...prev, [`group-${group.key}`]: !isExpanded }));
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-ink" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-ink" />
                                    )}
                                  </Button>
                                </td>
                                <td className="p-3 font-semibold text-xs text-ink">{idx + 1}</td>
                                <td className="p-3 font-mono text-xs">
                                  <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold text-[10px] uppercase">
                                    {group.orders.length} Transaksi
                                  </Badge>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate font-mono">
                                    {group.orders.map((o) => o.order_id).join(", ")}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <p className="font-bold text-ink uppercase text-xs tracking-wide">
                                    {group.customer_name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {group.customer_email} {group.customer_phone !== "-" ? `• ${group.customer_phone}` : ""}
                                  </p>
                                </td>
                                <td className="p-3 text-right font-black text-ink">
                                  Rp {Number(group.total_amount).toLocaleString("id-ID")}
                                </td>
                                <td className="p-3 text-center">
                                  {group.pending_count === 0 ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]">
                                      {group.paid_count} Lunas Terbayar
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-amber-100 text-amber-950 border-amber-300 font-bold text-[10px]">
                                      {group.paid_count} Lunas • {group.pending_count} Pending
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-3 text-center text-xs text-muted-foreground font-bold">
                                  {group.orders.length} Transaksi Tergabung
                                </td>
                                <td className="p-3 text-xs text-muted-foreground font-medium">
                                  {new Date(group.latest_created_at).toLocaleString("id-ID")}
                                </td>
                                <td className="p-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 border-2 border-ink text-xs font-bold"
                                    onClick={() => {
                                      setExpandedRows((prev) => ({ ...prev, [`group-${group.key}`]: !isExpanded }));
                                    }}
                                  >
                                    {isExpanded ? "Tutup Detail" : "Lihat Rincian"}
                                  </Button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr>
                                  <td colSpan={9} className="p-4 bg-amber-50/40 border-t border-b border-border">
                                    <div className="space-y-3 pl-2 sm:pl-4">
                                      <p className="text-xs font-black uppercase text-ink tracking-wider flex items-center gap-2">
                                        <Users className="w-4 h-4 text-brand-orange" />
                                        Rincian Transaksi Dari: <span className="text-brand-orange">{group.customer_name}</span> ({group.orders.length} Transaksi)
                                      </p>
                                      <div className="space-y-2">
                                        {group.orders.map((subOrder) => (
                                          <div
                                            key={subOrder.order_id}
                                            className="p-3 bg-white border-2 border-ink/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
                                          >
                                            <div className="space-y-0.5">
                                              <div className="font-mono font-bold text-brand-blue flex items-center gap-2">
                                                <span>{subOrder.order_id}</span>
                                                {(subOrder as any).pre_order_campaign_id && (
                                                  <Badge variant="outline" className="text-[9px] font-bold border-ink/30 bg-cream/50">
                                                    Batch #{(subOrder as any).pre_order_campaign_id}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="text-[10px] text-muted-foreground">
                                                Waktu: {new Date(subOrder.created_at).toLocaleString("id-ID")}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <span className="font-black text-ink">
                                                Rp {Number(subOrder.gross_amount).toLocaleString("id-ID")}
                                              </span>
                                              {(() => {
                                                const payBadge = getPaymentStatusBadge(subOrder, dpPelunasanMap[subOrder.order_id]);
                                                return (
                                                  <span
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${payBadge.color}`}
                                                  >
                                                    {payBadge.text}
                                                  </span>
                                                );
                                              })()}
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs font-black border-2 border-ink bg-white hover:bg-cream"
                                                onClick={() => void handleOpenManagement(subOrder.order_id, "online")}
                                              >
                                                Kelola
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })
                      )
                    ) : sortedOnlineOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-muted-foreground">
                          Tidak ada pesanan online yang cocok
                        </td>
                      </tr>
                    ) : (
                      sortedOnlineOrders.map((order, idx) => (
                        <>
                          <tr
                            key={order.order_id}
                            className={`border-t border-border transition-colors ${order.voucher_code || order.discount_amount > 0
                              ? "bg-orange-50/50 hover:bg-orange-100/60"
                              : "hover:bg-cream/10"
                              }`}
                          >
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-muted"
                                onClick={() => void toggleRow(order.order_id, "online")}
                              >
                                {expandedRows[order.order_id] ? (
                                  <ChevronUp className="h-4 w-4 text-ink" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-ink" />
                                )}
                              </Button>
                            </td>
                            <td className="p-3 font-semibold text-xs text-ink">
                              {idx + 1}
                            </td>
                            <td className="p-3 font-mono text-xs text-brand-blue font-bold">
                              <div>{order.order_id}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {isDpOrder(order) && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] px-1.5 py-0 uppercase font-black">
                                    Pesanan DP
                                  </Badge>
                                )}
                                {dpPelunasanMap[order.order_id] && (
                                  <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[9px] px-1.5 py-0 uppercase font-black">
                                    + Pelunasan
                                  </Badge>
                                )}
                                {(() => {
                                  const addr = String((order as any).shipping_address || "").toLowerCase();
                                  const isPickup = !addr || addr.includes("ambil") || addr.includes("filkom merch") || addr.includes("pickup");
                                  return isPickup ? (
                                    <Badge className="bg-emerald-50 text-emerald-950 border-emerald-300 text-[9px] px-1.5 py-0 uppercase font-extrabold flex items-center gap-1">
                                      <Store className="w-2.5 h-2.5 text-emerald-700" /> Ambil Store
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-50 text-blue-950 border-blue-300 text-[9px] px-1.5 py-0 uppercase font-extrabold flex items-center gap-1" title={order.shipping_address || undefined}>
                                      <Truck className="w-2.5 h-2.5 text-blue-700" /> Diantar
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-ink uppercase text-xs tracking-wide">
                                {order.customer_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {order.customer_email}
                              </p>
                            </td>
                            <td className="p-3 text-right font-bold text-ink">
                              Rp {Number(order.gross_amount).toLocaleString("id-ID")}
                            </td>
                            <td className="p-3 text-center">
                              {(() => {
                                const payBadge = getPaymentStatusBadge(order, dpPelunasanMap[order.order_id]);
                                return (
                                  <Badge
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${payBadge.color}`}
                                  >
                                    {payBadge.text}
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td className="p-3 text-center">
                              {(() => {
                                const fulBadge = getFulfillmentStatusBadge(order);
                                return (
                                  <Badge
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${fulBadge.color}`}
                                  >
                                    {fulBadge.text}
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString("id-ID")}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1 items-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleOpenManagement(order.order_id, "online")}
                                  className="border-2 border-ink hover:bg-cream text-ink font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
                                >
                                  Kelola
                                </Button>
                                {!isCashier && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-red-50"
                                    onClick={() => void handleDeleteOrder(order.order_id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {dpPelunasanMap[order.order_id] && (() => {
                            const linkedLns = dpPelunasanMap[order.order_id];
                            const lnsBadge = getStatusBadgeTextAndColor(linkedLns);
                            return (
                              <tr className="bg-purple-50/80 border-b-2 border-purple-300">
                                <td colSpan={9} className="p-2.5 px-6">
                                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-purple-700 text-white rounded font-black text-[10px] uppercase tracking-wider">
                                        ↪ Transaksi Pelunasan Terhubung
                                      </span>
                                      <span className="font-mono font-black text-purple-950">
                                        {linkedLns.order_id}
                                      </span>
                                      <span className="text-[10px] text-purple-700 font-medium">
                                        ({new Date(linkedLns.created_at).toLocaleString("id-ID")})
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="text-purple-800 text-[10px] font-bold">Sisa Pelunasan:</span>
                                      <span className="font-bold text-purple-950 font-mono">
                                        Rp {Number(linkedLns.gross_amount).toLocaleString("id-ID")}
                                      </span>

                                      <Badge className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${lnsBadge.color}`}>
                                        {lnsBadge.text}
                                      </Badge>

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void handleOpenManagement(linkedLns.order_id, "online")}
                                        className="border-2 border-purple-900 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] uppercase tracking-wider h-7 shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] cursor-pointer"
                                      >
                                        Kelola Pelunasan ↗
                                      </Button>
                                      {!isCashier && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-600 hover:bg-red-100/80 cursor-pointer"
                                          title="Hapus transaksi pelunasan ini"
                                          onClick={() => void handleDeleteOrder(linkedLns.order_id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                          {expandedRows[order.order_id] && (
                            <tr className="bg-[#FCFAF7] border-b border-border">
                              <td colSpan={9} className="p-4 pl-12">
                                {rowItemsLoading[order.order_id] ? (
                                  <p className="text-xs text-muted-foreground animate-pulse">Memuat item...</p>
                                ) : (
                                  <div className="space-y-3 max-w-2xl border border-border rounded-lg p-3 bg-white shadow-sm">
                                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-border">
                                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Item Yang Dibeli</h4>
                                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                        ID: {order.order_id}
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground border-b border-border pb-1">
                                            <th className="text-left font-semibold pb-1">Nama Produk</th>
                                            <th className="text-center font-semibold pb-1">Varian</th>
                                            <th className="text-right font-semibold pb-1">Harga</th>
                                            <th className="text-center font-semibold pb-1">Qty</th>
                                            <th className="text-right font-semibold pb-1">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(rowItems[order.order_id] || []).map((item: any, idx_item: number) => (
                                            <tr key={idx_item} className="border-b border-dashed border-border/40 last:border-0">
                                              <td className="py-2 font-bold text-ink uppercase">{item.product_name}</td>
                                              <td className="py-2 text-center text-muted-foreground">
                                                {item.size || "One Size"}{item.color ? ` / ${item.color}` : ""}
                                              </td>
                                              <td className="py-2 text-right">
                                                Rp {Number(item.price || item.unit_price).toLocaleString("id-ID")}
                                              </td>
                                              <td className="py-2 text-center font-bold">{item.quantity}</td>
                                              <td className="py-2 text-right font-bold text-brand-blue">
                                                Rp {Number(item.subtotal).toLocaleString("id-ID")}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    {(order.voucher_code || order.discount_amount > 0) && (
                                      <div className="flex justify-between items-center pt-2 text-xs font-bold text-brand-orange">
                                        <span className="flex items-center gap-1.5">
                                          {order.voucher_code ? (
                                            <>Voucher <span className="bg-brand-orange/10 border border-brand-orange/30 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">{order.voucher_code}</span>:</>
                                          ) : (
                                            "Diskon:"
                                          )}
                                        </span>
                                        <span>-Rp {Number(order.discount_amount || 0).toLocaleString("id-ID")}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-border text-xs font-bold mt-2">
                                      <span className="text-muted-foreground">TOTAL PEMBAYARAN:</span>
                                      <span className="text-brand-orange text-sm font-extrabold">
                                        Rp {Number(order.gross_amount).toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline">
          <Card>
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink">
                Penjualan Offline / POS ({sortedOfflineSales.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="w-10 p-3"></th>
                      <SortHeaderColumn label="NO" field="no" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <SortHeaderColumn label="SALE ID" field="order_id" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Kasir
                      </th>
                      <SortHeaderColumn label="PELANGGAN" field="customer_name" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <SortHeaderColumn label="TOTAL" field="gross_amount" currentField={sortField} direction={sortDirection} onSort={handleSort} align="right" />
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pembayaran
                      </th>
                      <SortHeaderColumn label="STATUS" field="payment_status" currentField={sortField} direction={sortDirection} onSort={handleSort} align="center" />
                      <SortHeaderColumn label="TANGGAL" field="created_at" currentField={sortField} direction={sortDirection} onSort={handleSort} />
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOfflineSales.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted-foreground font-bold">
                          Tidak ada penjualan offline
                        </td>
                      </tr>
                    ) : (
                      sortedOfflineSales.map((sale, idx) => (
                        <>
                          <tr
                            key={sale.sale_id}
                            className="border-t border-border hover:bg-cream/10 transition-colors"
                          >
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-muted"
                                onClick={() => void toggleRow(sale.sale_id, "offline")}
                              >
                                {expandedRows[sale.sale_id] ? (
                                  <ChevronUp className="h-4 w-4 text-ink" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-ink" />
                                )}
                              </Button>
                            </td>
                            <td className="p-3 font-semibold text-xs text-ink">
                              {idx + 1}
                            </td>
                            <td className="p-3 font-mono text-xs text-brand-blue font-bold">
                              {sale.sale_id}
                            </td>
                            <td className="p-3 font-semibold text-ink uppercase text-xs tracking-wide">
                              {sale.cashier_name || "-"}
                            </td>
                            <td className="p-3 font-medium text-ink">
                              {sale.customer_name || "Walk-in"}
                            </td>
                            <td className="p-3 text-right font-bold text-ink">
                              Rp {Number(sale.total).toLocaleString("id-ID")}
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">
                              {sale.payment_method}
                            </td>
                            <td className="p-3 text-center">
                              <Badge
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColor[sale.status] || statusColor.completed}`}
                              >
                                {sale.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">
                              {new Date(sale.created_at).toLocaleString("id-ID")}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1 items-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleOpenManagement(sale.sale_id, "offline")}
                                  className="border-2 border-ink hover:bg-cream text-ink font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
                                >
                                  Kelola
                                </Button>
                                {!isCashier && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-red-50"
                                    onClick={() => void handleDeleteSale(sale.sale_id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedRows[sale.sale_id] && (
                            <tr className="bg-[#FCFAF7] border-b border-border">
                              <td colSpan={10} className="p-4 pl-12">
                                {rowItemsLoading[sale.sale_id] ? (
                                  <p className="text-xs text-muted-foreground animate-pulse">Memuat item...</p>
                                ) : (
                                  <div className="space-y-3 max-w-2xl border border-border rounded-lg p-3 bg-white shadow-sm">
                                    <div className="flex justify-between items-center pb-2 border-b border-dashed border-border">
                                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Item Yang Dibeli</h4>
                                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                        ID: {sale.sale_id}
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground border-b border-border pb-1">
                                            <th className="text-left font-semibold pb-1">Nama Produk</th>
                                            <th className="text-center font-semibold pb-1">Varian</th>
                                            <th className="text-right font-semibold pb-1">Harga</th>
                                            <th className="text-center font-semibold pb-1">Qty</th>
                                            <th className="text-right font-semibold pb-1">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(rowItems[sale.sale_id] || []).map((item: any, idx_item: number) => (
                                            <tr key={idx_item} className="border-b border-dashed border-border/40 last:border-0">
                                              <td className="py-2 font-bold text-ink uppercase">{item.product_name}</td>
                                              <td className="py-2 text-center text-muted-foreground">
                                                {item.size || "One Size"}{item.color ? ` / ${item.color}` : ""}
                                              </td>
                                              <td className="py-2 text-right">
                                                Rp {Number(item.price || item.unit_price).toLocaleString("id-ID")}
                                              </td>
                                              <td className="py-2 text-center font-bold">{item.quantity}</td>
                                              <td className="py-2 text-right font-bold text-brand-blue">
                                                Rp {Number(item.subtotal).toLocaleString("id-ID")}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-border text-xs font-bold">
                                      <span className="text-muted-foreground">TOTAL PEMBAYARAN:</span>
                                      <span className="text-brand-orange text-sm font-extrabold">
                                        Rp {Number(sale.total).toLocaleString("id-ID")}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink">
                Klaim Pesanan Batch 1 ({orderClaims.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border-2 border-ink">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-cream border-b-2 border-ink font-bold">
                    <tr>
                      <th className="p-3 text-ink text-xs tracking-wider uppercase">Waktu Pengajuan</th>
                      <th className="p-3 text-ink text-xs tracking-wider uppercase">Data Akun Web (User)</th>
                      <th className="p-3 text-ink text-xs tracking-wider uppercase">Data Pesanan CSV</th>
                      <th className="p-3 text-ink text-xs tracking-wider uppercase">Status</th>
                      <th className="p-3 text-ink text-xs tracking-wider uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-ink/10 bg-white">
                    {orderClaims.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold">
                          Tidak ada data klaim.
                        </td>
                      </tr>
                    ) : (
                      orderClaims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-amber-50 transition-colors">
                          <td className="p-3 text-xs">
                            {new Date(claim.created_at).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-xs">
                            <div className="font-bold text-ink">{claim.web_user_name}</div>
                            <div className="text-muted-foreground">{claim.web_user_nim}</div>
                            <div className="text-muted-foreground">{claim.web_user_email}</div>
                          </td>
                          <td className="p-3 text-xs">
                            <div className="font-bold text-ink">{claim.csv_name} (ID: {claim.order_id})</div>
                            <div className="text-muted-foreground">{claim.csv_nim}</div>
                            <div className="text-muted-foreground">{claim.csv_phone}</div>
                          </td>
                          <td className="p-3 text-xs">
                            <Badge
                              className={
                                claim.status === "pending"
                                  ? "bg-amber-100 text-amber-800"
                                  : claim.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {claim.status.toUpperCase()}
                            </Badge>
                            {claim.admin_note && (
                              <div className="mt-1 text-[10px] text-muted-foreground whitespace-normal max-w-[200px]">
                                <span className="font-bold">Catatan:</span> {claim.admin_note}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-xs flex gap-2">
                            {claim.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-none text-[10px]"
                                  onClick={() => handleApproveClaim(claim.id)}
                                >
                                  Terima
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="shadow-none text-[10px]"
                                  onClick={() => handleRejectClaim(claim.id)}
                                >
                                  Tolak
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* dialog modal management */}
      <Dialog open={managementOpen} onOpenChange={setManagementOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="display text-xl tracking-wide text-ink uppercase">
              Kelola Transaksi
            </DialogTitle>
          </DialogHeader>

          {fetchingManagedDetail || !managedTransaction ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Memuat rincian transaksi...</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column: buyer data and proof of payment */}
                <div className="space-y-4">
                  <div className="bg-[#FCFAF7] border border-border p-4 rounded-lg text-xs space-y-3 shadow-sm">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[10px]">
                        DATA PEMBELI
                      </p>
                      <p className="font-bold text-ink text-sm uppercase">
                        {managedTransaction.customer_name}
                      </p>
                      {managedTransaction.customer_nim && (
                        <p className="text-muted-foreground mt-0.5">
                          NIM: {managedTransaction.customer_nim}
                        </p>
                      )}
                      {managedTransaction.customer_email && (
                        <p className="text-muted-foreground">{managedTransaction.customer_email}</p>
                      )}
                      {managedTransaction.customer_phone && (
                        <p className="text-muted-foreground">{managedTransaction.customer_phone}</p>
                      )}
                    </div>

                    <div className="border-t border-dashed border-border pt-3">
                      <p className="font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[10px]">
                        DETAIL STRUK
                      </p>
                      <p className="font-semibold text-brand-blue font-mono text-sm">
                        {managedTransaction.order_id || managedTransaction.sale_id}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        Metode Pembayaran: {managedTransaction.payment_type || managedTransaction.payment_method}
                      </p>
                      <p className="text-muted-foreground">
                        Waktu: {new Date(managedTransaction.created_at).toLocaleString("id-ID")}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        Status:
                        {(() => {
                          const badge = getPaymentStatusBadge(managedTransaction, dpPelunasanMap[managedTransaction.order_id]);
                          return (
                            <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${badge.color}`}>
                              {badge.text}
                            </Badge>
                          );
                        })()}
                      </p>
                    </div>

                    {managedTransaction.shipping_address && (
                      <div className="border-t border-dashed border-border pt-3">
                        <p className="font-bold uppercase tracking-wider text-muted-foreground mb-1 text-[10px]">
                          ALAMAT PENGIRIMAN
                        </p>
                        <p className="text-ink bg-white p-2 rounded border border-border">{managedTransaction.shipping_address}</p>
                      </div>
                    )}
                  </div>

                  {/* Informasi Pelunasan for DP Orders (FILKOM-...) */}
                  {dpPelunasanMap[managedTransaction.order_id] && (() => {
                    const linkedLns = dpPelunasanMap[managedTransaction.order_id];
                    const lnsBadge = getPaymentStatusBadge(linkedLns);
                    return (
                      <div className="bg-purple-50/90 border-2 border-purple-300 p-4 rounded-lg text-xs space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold uppercase tracking-wider text-purple-950 flex items-center gap-1.5 text-[11px]">
                            <CreditCard className="w-4 h-4 text-purple-700" />
                            INFORMASI PELUNASAN (SISA TAGIHAN)
                          </p>
                          <Badge className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${lnsBadge.color}`}>
                            {lnsBadge.text}
                          </Badge>
                        </div>

                        <div className="bg-white p-3 rounded-md border border-purple-200 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-[11px]">ID Pelunasan:</span>
                            <span className="font-mono font-black text-purple-950">{linkedLns.order_id}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-[11px]">Sisa Nominal Pelunasan:</span>
                            <span className="font-extrabold font-mono text-purple-950 text-sm">
                              Rp {Number(linkedLns.gross_amount).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-[11px]">Waktu Dibuat:</span>
                            <span className="text-muted-foreground font-medium text-[11px]">
                              {new Date(linkedLns.created_at).toLocaleString("id-ID")}
                            </span>
                          </div>
                          {linkedLns.payment_proof_note && (
                            <div className="text-red-700 bg-red-50 p-2 rounded border border-red-200 text-[10px] mt-1">
                              <strong className="block text-red-900">Catatan Penolakan:</strong> "{linkedLns.payment_proof_note}"
                            </div>
                          )}
                        </div>

                        {/* Bukti Pelunasan Thumbnail if uploaded */}
                        {linkedLns.payment_proof_url && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-extrabold text-purple-950 uppercase block">
                              Bukti Transfer Pelunasan:
                            </span>
                            <div className="w-full max-h-36 border border-purple-200 rounded-lg overflow-hidden bg-white flex items-center justify-center p-1 relative group">
                              <img
                                src={resolveImageUrl(linkedLns.payment_proof_url)}
                                alt="Bukti Transfer Pelunasan"
                                className="max-h-32 object-contain cursor-zoom-in group-hover:scale-105 transition-transform"
                                onClick={() => window.open(resolveImageUrl(linkedLns.payment_proof_url), "_blank")}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setManagementOpen(false);
                              setTimeout(() => {
                                void handleOpenManagement(linkedLns.order_id, "online");
                              }, 150);
                            }}
                            className="border-2 border-purple-900 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] uppercase tracking-wider h-8 shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
                          >
                            Kelola Transaksi Pelunasan Ini ↗
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Verification Proof section (Online QRIS Manual) */}
                  {managedType === "online" &&
                    (managedTransaction.payment_type === "manual_qris" ||
                      !!managedTransaction.payment_proof_url ||
                      String(managedTransaction.order_id || "").startsWith("LNS")) && (
                      <div className="border border-border rounded-lg p-4 bg-white space-y-4 shadow-sm">
                        <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Verifikasi Bukti QRIS</h4>

                        {managedTransaction.payment_proof_url ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-extrabold uppercase text-ink">
                                Bukti Pembayaran Terbaru:
                              </span>
                              {managedTransaction.payment_proof_note && (
                                <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] uppercase font-bold">
                                  Status: Ditolak Admin
                                </Badge>
                              )}
                            </div>
                            <div className="w-full max-h-52 border-2 border-ink/30 rounded-xl overflow-hidden flex items-center justify-center bg-cream/30 p-2 relative group">
                              <img
                                src={resolveImageUrl(managedTransaction.payment_proof_url)}
                                alt="Bukti Transfer"
                                className="max-h-48 object-contain cursor-zoom-in group-hover:scale-105 transition-transform"
                                onClick={() => window.open(resolveImageUrl(managedTransaction.payment_proof_url), "_blank")}
                              />
                            </div>
                            <a
                              href={resolveImageUrl(managedTransaction.payment_proof_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-blue font-bold hover:underline block text-[10px] text-center"
                            >
                              Buka Bukti Pembayaran Terbaru di Tab Baru ↗
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center p-4 border border-dashed rounded">
                            Belum mengunggah bukti pembayaran.
                          </p>
                        )}

                        {/* Proof History / Comparison Section */}
                        {(() => {
                          let historyList: Array<{ url: string; note?: string | null; replaced_at?: string }> = [];
                          const rawHist = managedTransaction.payment_proof_history;
                          if (rawHist) {
                            if (Array.isArray(rawHist)) historyList = rawHist;
                            else if (typeof rawHist === "string") {
                              try {
                                const parsed = JSON.parse(rawHist);
                                if (Array.isArray(parsed)) historyList = parsed;
                              } catch { historyList = []; }
                            }
                          }
                          if (historyList.length === 0) return null;

                          return (
                            <div className="mt-4 pt-4 border-t border-dashed border-border space-y-3">
                              <div className="flex items-center gap-1.5 text-amber-900">
                                <History className="w-4 h-4 text-brand-orange" />
                                <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-ink">
                                  Riwayat Bukti Ditolak Sebelumnya ({historyList.length}) — Pembanding
                                </h5>
                              </div>
                              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                {historyList.map((hist, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 bg-red-50/70 border border-red-200 rounded-lg flex items-start gap-3 text-xs"
                                  >
                                    <a
                                      href={resolveImageUrl(hist.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="w-16 h-16 border border-red-300 rounded overflow-hidden bg-white shrink-0 group relative cursor-pointer"
                                    >
                                      <img
                                        src={resolveImageUrl(hist.url)}
                                        alt={`Bukti Lama #${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition"
                                      />
                                      <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center">
                                        <span className="text-[8px] font-black text-white bg-red-600 px-1 rounded uppercase">Lama</span>
                                      </div>
                                    </a>
                                    <div className="flex-1 space-y-1 text-[11px]">
                                      <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-red-900">Bukti #{idx + 1} (Ditolak)</span>
                                        {hist.replaced_at && (
                                          <span className="text-[9px] text-muted-foreground">
                                            {new Date(hist.replaced_at).toLocaleString("id-ID")}
                                          </span>
                                        )}
                                      </div>
                                      {hist.note && (
                                        <p className="text-red-800 bg-white/80 p-1.5 rounded border border-red-200 text-[10px]">
                                          <strong className="text-red-900">Catatan/Alasan Ditolak:</strong> "{hist.note}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Display current status and annul option */}
                        {(managedTransaction.payment_status === "paid" || managedTransaction.transaction_status === "settlement") ? (
                          <div className="space-y-3">
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <span className="font-bold uppercase tracking-wider text-[10px]">Pembayaran Telah Diterima / Terverifikasi</span>
                            </div>
                            {!isCashier && (
                              <div className="space-y-2">
                                <p className="text-[10px] text-muted-foreground">
                                  Anda masih dapat menganulir status ini ke ditolak jika terjadi kesalahan.
                                </p>
                                {!showRejectReason ? (
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowRejectReason(true)}
                                    className="w-full text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    Tolak & Batalkan Pembayaran
                                  </Button>
                                ) : (
                                  <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-xs font-semibold text-ink">Catatan Penolakan (Wajib)</Label>
                                    <Textarea
                                      value={verificationNote}
                                      onChange={(e) => setVerificationNote(e.target.value)}
                                      placeholder="Contoh: Bukti transfer terpotong atau nominal salah."
                                      rows={2}
                                      className="text-xs"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => setShowRejectReason(false)}>
                                        Batal
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={submittingVerification}
                                        onClick={() => void handleVerifyManaged(false)}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                                      >
                                        Konfirmasi Tolak
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {managedTransaction.payment_proof_note ? (
                              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs font-semibold space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-red-700">
                                  <span>🚫 Bukti Ditolak Admin (Menunggu Pembeli Unggah Baru)</span>
                                </div>
                                <div className="text-[11px] text-red-600 italic">
                                  Catatan Penolakan: "{managedTransaction.payment_proof_note}"
                                </div>
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs font-semibold">
                                ⚠️ Menunggu Verifikasi Pembayaran
                              </div>
                            )}
                            {!isCashier && (
                              <div className="space-y-3">
                                {!showRejectReason ? (
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => void handleVerifyManaged(true)}
                                      disabled={submittingVerification}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-ink uppercase font-bold text-xs tracking-wider h-10 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
                                    >
                                      {submittingVerification ? "Memproses..." : "Terima Pembayaran"}
                                    </Button>
                                    <Button
                                      onClick={() => setShowRejectReason(true)}
                                      disabled={submittingVerification}
                                      className="bg-red-600 hover:bg-red-700 text-white border-2 border-ink uppercase font-bold text-xs tracking-wider h-10 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px]"
                                    >
                                      Tolak
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-xs font-semibold text-ink">Catatan Penolakan (Wajib)</Label>
                                    <Textarea
                                      value={verificationNote}
                                      onChange={(e) => setVerificationNote(e.target.value)}
                                      placeholder="Contoh: Bukti transfer terpotong atau nominal salah."
                                      rows={2}
                                      className="text-xs"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => setShowRejectReason(false)}>
                                        Batal
                                      </Button>
                                      <Button
                                        size="sm"
                                        disabled={submittingVerification}
                                        onClick={() => void handleVerifyManaged(false)}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                                      >
                                        Konfirmasi Tolak
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                </div>

                {/* Right Column: Items bought & Status updates */}
                <div className="space-y-4">
                  {/* Items List */}
                  <div className="border border-border rounded-lg p-4 bg-white shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Item Yang Dibeli</h4>
                    <div className="border border-border rounded overflow-x-auto text-xs">
                      <table className="w-full">
                        <thead className="bg-cream">
                          <tr>
                            <th className="p-2 text-left text-ink font-semibold">Produk</th>
                            <th className="p-2 text-center text-ink font-semibold">Varian</th>
                            <th className="p-2 text-right text-ink font-semibold">Harga</th>
                            <th className="p-2 text-center text-ink font-semibold">Qty</th>
                            <th className="p-2 text-right text-ink font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managedItems.map((item, idx) => (
                            <tr key={idx} className="border-t border-border">
                              <td className="p-2 font-bold text-ink uppercase">{item.product_name}</td>
                              <td className="p-2 text-center text-muted-foreground">
                                {item.size || "One Size"}{item.color ? ` / ${item.color}` : ""}
                              </td>
                              <td className="p-2 text-right">
                                Rp {Number(item.price || item.unit_price).toLocaleString("id-ID")}
                              </td>
                              <td className="p-2 text-center font-bold">{item.quantity}</td>
                              <td className="p-2 text-right font-bold text-brand-blue">
                                Rp {Number(item.subtotal).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pricing summary */}
                    <div className="text-xs space-y-2 border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-semibold text-ink">
                          Rp {Number(managedTransaction.subtotal || managedTransaction.gross_amount).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {managedTransaction.discount > 0 && (
                        <div className="flex justify-between text-yellow-600 font-semibold">
                          <span>Diskon POS:</span>
                          <span>-Rp {Number(managedTransaction.discount).toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      {managedTransaction.voucher_code && (
                        <div className="flex justify-between text-brand-orange font-semibold">
                          <span className="flex items-center gap-1.5">
                            Voucher <span className="bg-brand-orange/10 border border-brand-orange/30 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono">{managedTransaction.voucher_code}</span>:
                          </span>
                          <span>-Rp {Number(managedTransaction.discount_amount || 0).toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold">
                        <span className="text-xs text-ink uppercase tracking-wider">Total Akhir:</span>
                        <span className="text-brand-orange">
                          Rp {Number(managedTransaction.gross_amount || managedTransaction.total).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status edit controls (Non-POS/Online order only) */}
                  {managedType === "online" && !isCashier && (
                    <div className="border border-border rounded-lg p-4 bg-white shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Pembaruan Status & Pengiriman</h4>

                      {/* Complaint Warning Banner */}
                      {managedTransaction?.is_complained === 1 && (
                        <div className="rounded-lg bg-red-100 border-2 border-red-500 p-3 text-red-900 font-semibold text-xs space-y-1">
                          <div className="flex items-center gap-2 font-black uppercase text-red-700">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            PEMBELI MENGAJUKAN KOMPLAIN
                          </div>
                          <p className="text-[11px] leading-snug">
                            Pembeli telah mengajukan komplain kecacatan produk (defect).
                          </p>
                          {managedTransaction.complaint_notes && (
                            <p className="italic bg-white/80 p-2 rounded text-[11px] border border-red-300">
                              "{managedTransaction.complaint_notes}"
                            </p>
                          )}
                          {managedTransaction.complaint_media_urls && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(() => {
                                try {
                                  const urls = JSON.parse(managedTransaction.complaint_media_urls);
                                  return urls.map((url: string, idx: number) => (
                                    <div key={idx} className="w-16 h-16 rounded border border-red-300 overflow-hidden bg-white shrink-0 cursor-zoom-in" onClick={() => setZoomMedia({ url: resolveImageUrl(url) || "", type: url.match(/\.(mp4|mov|webm)$/i) ? "video" : "image" })}>
                                      {url.match(/\.(mp4|mov|webm)$/i) ? (
                                        <video src={resolveImageUrl(url)} className="w-full h-full object-cover" />
                                      ) : (
                                        <img src={resolveImageUrl(url)} alt={`Bukti ${idx + 1}`} className="w-full h-full object-cover hover:scale-110 transition" />
                                      )}
                                    </div>
                                  ));
                                } catch (e) {
                                  return null;
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="rounded bg-amber-50 border border-amber-200 p-2.5 text-[10px] text-amber-900 flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                        <p>
                          Perubahan status pengiriman/transaksi di bawah ini dilakukan secara manual.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-ink">Status Transaksi</Label>
                          <Select value={managedStatus} onValueChange={setManagedStatus}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">PENDING (Belum Bayar)</SelectItem>
                              <SelectItem value="settlement">SETTLEMENT (Lunas)</SelectItem>
                              <SelectItem value="ready_for_pickup">SIAP DIAMBIL (Ambil di Toko)</SelectItem>
                              <SelectItem value="shipped">SIAP DIANTAR / DIKIRIM (Kurir)</SelectItem>
                              <SelectItem value="expire">EXPIRE (Kadaluarsa)</SelectItem>
                              <SelectItem value="cancel">CANCEL (Dibatalkan)</SelectItem>
                              <SelectItem value="completed">COMPLETED (Pesanan Selesai)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Photo Proof Upload for Siap Diambil / Sedang Diantar / Selesai */}
                        {(managedStatus === "ready_for_pickup" || managedStatus === "shipped" || managedStatus === "completed" || managedStatus === "settlement") && (
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-ink">Foto Bukti Pengambilan / Penerimaan Barang</Label>

                            <div className="border-2 border-dashed border-ink/40 bg-cream/30 hover:bg-cream/60 rounded-xl p-3.5 text-center transition flex flex-col items-center justify-center gap-2">
                              {managedFulfillmentProof ? (
                                <div className="relative w-full flex flex-col items-center gap-2">
                                  <div className="relative w-40 h-28 rounded-lg border-2 border-ink overflow-hidden shadow-sm">
                                    <img src={resolveImageUrl(managedFulfillmentProof)} alt="Bukti Pengambilan/Penerimaan" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
                                      ✓ Foto Bukti Terunggah
                                    </span>
                                    <label className="cursor-pointer text-[10px] font-extrabold uppercase text-brand-orange hover:underline">
                                      {uploadingFulfillmentProof ? "Mengunggah..." : "Ganti Foto"}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingFulfillmentProof}
                                        onChange={(e) => void handleUploadFulfillmentProofFile(e)}
                                      />
                                    </label>
                                  </div>
                                </div>
                              ) : (
                                <label className="cursor-pointer w-full flex flex-col items-center justify-center py-2 text-xs gap-1.5">
                                  <div className="w-10 h-10 rounded-full bg-cream border border-ink/30 flex items-center justify-center text-ink">
                                    <Upload className="w-5 h-5 text-brand-orange" />
                                  </div>
                                  <span className="font-extrabold text-ink uppercase tracking-wider text-[11px]">
                                    {uploadingFulfillmentProof ? "Sedang Mengunggah Foto..." : "Klik Untuk Unggah Foto Bukti"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Format: JPG, PNG, WEBP (Foto serah terima / foto resi)
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={uploadingFulfillmentProof}
                                    onChange={(e) => void handleUploadFulfillmentProofFile(e)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-ink">Alamat Pengiriman</Label>
                          <Input
                            value={managedShippingAddress}
                            onChange={(e) => setManagedShippingAddress(e.target.value)}
                            placeholder="Alamat lengkap pengiriman"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-ink">Catatan untuk Pembeli</Label>
                          <Textarea
                            value={managedNotes}
                            onChange={(e) => setManagedNotes(e.target.value)}
                            placeholder="Tulis informasi pelacakan atau instruksi penjemputan..."
                            rows={2}
                            className="text-xs"
                          />
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                          <Button
                            onClick={() => void handleSaveManagedStatus()}
                            disabled={savingManaged}
                            className="w-full bg-ink text-white font-bold uppercase tracking-wider text-xs h-9 cursor-pointer"
                          >
                            {savingManaged ? "Menyimpan..." : "Simpan Perubahan Status"}
                          </Button>

                          <Button
                            type="button"
                            onClick={() => openNotifModalForOrder(managedTransaction)}
                            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold uppercase tracking-wider text-xs h-9 cursor-pointer shadow-sm"
                          >
                            📱 Kirim Push Notifikasi ke Pembeli
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-4 flex items-center justify-between">
            <Button
              type="button"
              onClick={() => openNotifModalForOrder(managedTransaction)}
              variant="outline"
              className="border-2 border-brand-orange text-brand-orange hover:bg-brand-orange/10 font-bold text-xs"
            >
              💬 Custom Message
            </Button>
            <Button
              onClick={() => setManagementOpen(false)}
              className="bg-ink text-white font-bold uppercase tracking-wider text-xs px-6"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Modal Dialog */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="max-w-md bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5">
          <DialogHeader>
            <DialogTitle className="display text-lg tracking-wide text-ink flex items-center gap-2 uppercase">
              <SlidersHorizontal className="w-5 h-5 text-brand-orange" />
              Filter &amp; Penyaringan Transaksi
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* 1. Batch PO Filter */}
            <div className="space-y-1.5">
              <label className="font-extrabold uppercase text-ink flex items-center gap-1.5 text-[11px]">
                <Filter className="w-3.5 h-3.5 text-brand-orange" />
                Batch / Kampanye Pre-Order
              </label>
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="w-full text-xs font-bold text-ink bg-cream/40 border-2 border-ink rounded-lg p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Batch / Tipe</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.batch_name || `Batch #${c.id}`}
                  </option>
                ))}
                <option value="none">Ready Stock</option>
              </select>
            </div>

            {/* 2. Product Filter (Multi-Select Checkboxes) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-extrabold uppercase text-ink flex items-center gap-1.5 text-[11px]">
                  <Package className="w-3.5 h-3.5 text-brand-orange" />
                  Filter Produk (Pilih Lebih Dari 1)
                </label>
                {productFilter.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setProductFilter([])}
                    className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Reset Produk ({productFilter.length})
                  </button>
                )}
              </div>

              {/* Include / Exclude Mode Toggle */}
              <div className="flex items-center gap-1 bg-cream/40 border-2 border-ink rounded-lg p-1.5">
                <button
                  type="button"
                  onClick={() => setProductFilterMode("include")}
                  className={`flex-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-md transition-all cursor-pointer ${
                    productFilterMode === "include"
                      ? "bg-brand-orange text-white shadow-sm"
                      : "text-ink hover:bg-black/5"
                  }`}
                >
                  ✅ Berisi (Include)
                </button>
                <button
                  type="button"
                  onClick={() => setProductFilterMode("exclude")}
                  className={`flex-1 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-md transition-all cursor-pointer ${
                    productFilterMode === "exclude"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-ink hover:bg-black/5"
                  }`}
                >
                  🚫 Tanpa (Exclude)
                </button>
              </div>
              {productFilterMode === "exclude" && productFilter.length > 0 && (
                <div className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">
                  ⚠️ Mode EXCLUDE aktif — menampilkan transaksi yang <strong>TIDAK berisi</strong> produk yang dipilih di bawah.
                </div>
              )}

              <div className="bg-cream/40 border-2 border-ink rounded-lg p-2.5 max-h-48 overflow-y-auto space-y-1">
                <label
                  className={`flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer text-xs font-bold transition-colors select-none ${productFilter.length === 0 ? "bg-brand-orange/10 text-brand-orange" : "hover:bg-black/5 text-ink"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={productFilter.length === 0}
                    onChange={() => setProductFilter([])}
                    className="w-4 h-4 accent-brand-orange cursor-pointer rounded"
                  />
                  <span>Semua Produk (Tanpa Filter)</span>
                </label>

                <div className="border-t border-dashed border-ink/20 my-1"></div>

                {uniqueProductNames.map((p) => {
                  const pIdStr = String(p.id);
                  const isChecked = productFilter.includes(pIdStr);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer text-xs transition-colors select-none ${isChecked ? "bg-amber-100/90 text-amber-950 font-bold border border-amber-300" : "hover:bg-black/5 text-ink font-semibold"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProductFilter((prev) => [...prev, pIdStr]);
                          } else {
                            setProductFilter((prev) => prev.filter((id) => id !== pIdStr));
                          }
                        }}
                        className="w-4 h-4 accent-brand-orange cursor-pointer rounded"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 3. Shipping Method Filter */}
            <div className="space-y-1.5">
              <label className="font-extrabold uppercase text-ink flex items-center gap-1.5 text-[11px]">
                <Truck className="w-3.5 h-3.5 text-brand-orange" />
                Metode Pengiriman
              </label>
              <select
                value={shippingFilter}
                onChange={(e) => setShippingFilter(e.target.value as "all" | "pickup" | "delivery")}
                className="w-full text-xs font-bold text-ink bg-cream/40 border-2 border-ink rounded-lg p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Metode Pengiriman</option>
                <option value="pickup">Ambil di Store (FILKOM Merch)</option>
                <option value="delivery">Diantar (Kurir / Alamat)</option>
              </select>
            </div>

            {/* 4. Payment Status Filter */}
            <div className="space-y-1.5">
              <label className="font-extrabold uppercase text-ink flex items-center gap-1.5 text-[11px]">
                <CreditCard className="w-3.5 h-3.5 text-brand-orange" />
                Status Pembayaran
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full text-xs font-bold text-ink bg-cream/40 border-2 border-ink rounded-lg p-2.5 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Status Pembayaran</option>
                <option value="paid">Lunas Terbayar</option>
                <option value="verifying">Butuh ACC Admin (Bukti QRIS)</option>
                <option value="dp">Pesanan DP</option>
                <option value="unpaid">Belum Bayar / Ditolak</option>
              </select>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 pt-3 border-t border-dashed border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetAllFilters}
              disabled={activeFilterCount === 0}
              className="border-2 border-ink text-xs font-black uppercase h-9 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset All
            </Button>
            <Button
              type="button"
              onClick={() => setFilterModalOpen(false)}
              className="bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold text-xs uppercase h-9 border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
            >
              Terapkan Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox / Zoom Dialog for Complaint Media */}
      {zoomMedia && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out select-none animate-fadeIn"
          onClick={() => setZoomMedia(null)}
        >
          <button
            onClick={() => setZoomMedia(null)}
            className="absolute top-4 right-4 bg-white border-2 border-ink p-2 rounded-full shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:scale-105 transition active:scale-95 z-[101] cursor-pointer"
            aria-label="Close media view"
          >
            <X className="w-5 h-5 text-ink" />
          </button>
          {zoomMedia.type === "video" ? (
            <video src={zoomMedia.url} className="max-w-full max-h-[90vh] rounded-lg border-2 border-white/10 shadow-2xl scale-up" controls autoPlay onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={zoomMedia.url} alt="Preview Bukti" className="max-w-full max-h-[90vh] object-contain rounded-lg border-2 border-white/10 shadow-2xl scale-up" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}

      {/* Send Push Notification Modal */}
      <SendNotificationModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        targetUserId={notifTargetUser.id}
        targetUserName={notifTargetUser.name}
        targetTrxId={notifTargetUser.trxId}
        defaultTitle={notifDefaultTitle}
        defaultMessage={notifDefaultMessage}
        defaultType={notifDefaultType}
        onSuccess={() => {
          toast.success("Notifikasi berhasil terkirim ke HP pembeli!");
        }}
      />

      {/* Broadcast Push Notification Modal */}
      <BroadcastNotificationModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        products={products.map((p: any) => ({ id: p.id, name: p.name }))}
        campaigns={campaigns.map((c: any) => ({ id: c.id, batch_name: c.batch_name }))}
        targetUserIds={targetUserIds}
        targetTransactionCount={filteredOnlineOrders.length}
        targetFilterSummary={targetFilterSummary}
        onSuccess={() => {
          toast.success("Broadcast push notification berhasil disiarkan!");
        }}
      />

      {/* Sent Notifications History & Unsend Modal */}
      <SentNotificationsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}
