import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select";
import { Eye, Trash2, ShieldAlert, Search, ChevronDown, ChevronUp } from "lucide-react";
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

const getStatusBadgeTextAndColor = (order: any) => {
  const pStatus = order.payment_status;
  const oStatus = order.order_status || order.transaction_status;

  if (oStatus === "cancelled" || oStatus === "cancel") {
    return { text: "Dibatalkan", color: "bg-red-100 text-red-800 border-red-200" };
  }

  // QRIS Static: proof rejected by admin
  if (order.payment_type === "manual_qris" && pStatus !== "paid" && order.payment_proof_note) {
    return { text: "Bukti Ditolak", color: "bg-red-100 text-red-800 border-red-200" };
  }

  // QRIS Static: uploaded proof but not yet verified by admin
  if (order.payment_type === "manual_qris" && pStatus !== "paid" && order.payment_proof_url) {
    return { text: "Menunggu Verifikasi", color: "bg-blue-100 text-blue-800 border-blue-200" };
  }

  // QRIS Static: not yet uploaded proof
  if (order.payment_type === "manual_qris" && pStatus !== "paid" && !order.payment_proof_url) {
    return { text: "Menunggu Upload Bukti", color: "bg-amber-100 text-amber-800 border-amber-200" };
  }

  if (pStatus === "unpaid" || pStatus === "pending" || oStatus === "pending") {
    return { text: "Belum Dibayar", color: "bg-amber-100 text-amber-800 border-amber-200" };
  }

  if (oStatus === "ready_for_pickup") {
    return { text: "Siap Diambil", color: "bg-teal-100 text-teal-800 border-teal-200" };
  }

  if (oStatus === "shipped") {
    return { text: "Siap Diantar / Dikirim", color: "bg-blue-100 text-blue-800 border-blue-200" };
  }

  if (oStatus === "completed" || oStatus === "settlement" || oStatus === "capture" || pStatus === "paid") {
    return { text: "Selesai", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }

  return { text: "Sedang Diproses", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
};

function AdminTransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const isCashier = user?.type === "admin" && user.role === "cashier";
  const API_BASE_URL = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
  const [onlineOrders, setOnlineOrders] = useState<Order[]>([]);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

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
  const [savingManaged, setSavingManaged] = useState(false);

  const [verificationNote, setVerificationNote] = useState<string>("");
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);

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
      const offline = await fetchJson<{ sales: OfflineSale[] }>(`${API_BASE_URL}/api/sales`);
      setOfflineSales(offline.sales || []);
    } catch (error) {
      console.error("Error fetching offline sales:", error);
      toast.error("Gagal memuat penjualan POS");
      setOfflineSales([]);
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
  };  const filteredOnlineOrders = onlineOrders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      order.order_id.toLowerCase().includes(query) ||
      (order.customer_name || "").toLowerCase().includes(query) ||
      (order.customer_email || "").toLowerCase().includes(query) ||
      (order.customer_phone || "").toLowerCase().includes(query) ||
      (order.payment_type || "").toLowerCase().includes(query) ||
      (order.transaction_status || "").toLowerCase().includes(query)
    );
  });

  const filteredOfflineSales = offlineSales.filter((sale) => {
    const query = searchQuery.toLowerCase();
    return (
      sale.sale_id.toLowerCase().includes(query) ||
      (sale.customer_name || "").toLowerCase().includes(query) ||
      (sale.cashier_name || "").toLowerCase().includes(query) ||
      (sale.payment_method || "").toLowerCase().includes(query) ||
      (sale.status || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider">Manajemen Transaksi</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Pesanan online (Midtrans) dan penjualan offline (POS)
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-2 border-ink focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <Tabs defaultValue="online">
        <TabsList>
          <TabsTrigger value="online">Pesanan Online</TabsTrigger>
          <TabsTrigger value="offline">Penjualan Offline / POS</TabsTrigger>
        </TabsList>

        <TabsContent value="online">
          <Card>
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink">
                Pesanan Online ({filteredOnlineOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="w-10 p-3"></th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        No
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Order ID
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pelanggan
                      </th>
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Total
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pembayaran
                      </th>
                      <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">
                        Status
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Tanggal
                      </th>
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOnlineOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-muted-foreground">
                          Tidak ada pesanan online yang cocok
                        </td>
                      </tr>
                    ) : (
                      filteredOnlineOrders.map((order, idx) => (
                        <>
                          <tr
                            key={order.order_id}
                            className="border-t border-border hover:bg-cream/10 transition-colors"
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
                              {order.order_id}
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
                            <td className="p-3 text-muted-foreground text-xs">
                              {order.payment_type || "-"}
                            </td>
                            <td className="p-3 text-center">
                              {(() => {
                                const badgeInfo = getStatusBadgeTextAndColor(order);
                                return (
                                  <Badge
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${badgeInfo.color}`}
                                  >
                                    {badgeInfo.text}
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
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-border text-xs font-bold">
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
                Penjualan Offline / POS ({filteredOfflineSales.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="w-10 p-3"></th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        No
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Sale ID
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Kasir
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pelanggan
                      </th>
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Total
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Pembayaran
                      </th>
                      <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">
                        Status
                      </th>
                      <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                        Tanggal
                      </th>
                      <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOfflineSales.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-muted-foreground">
                          Tidak ada penjualan offline yang cocok
                        </td>
                      </tr>
                    ) : (
                      filteredOfflineSales.map((sale, idx) => (
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
                          const badge = getStatusBadgeTextAndColor(managedTransaction);
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

                  {/* Payment Verification Proof section (Online QRIS Manual) */}
                  {managedType === "online" && managedTransaction.payment_type === "manual_qris" && (
                    <div className="border border-border rounded-lg p-4 bg-white space-y-4 shadow-sm">
                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Verifikasi Bukti QRIS</h4>
                      
                      {managedTransaction.payment_proof_url ? (
                        <div className="space-y-2">
                          <div className="w-full max-h-48 border border-border rounded overflow-hidden flex items-center justify-center bg-gray-50">
                            <img
                              src={resolveImageUrl(managedTransaction.payment_proof_url)}
                              alt="Bukti Transfer"
                              className="max-h-48 object-contain cursor-zoom-in hover:scale-105 transition-transform"
                              onClick={() => window.open(resolveImageUrl(managedTransaction.payment_proof_url), "_blank")}
                            />
                          </div>
                          <a
                            href={resolveImageUrl(managedTransaction.payment_proof_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-blue font-semibold hover:underline block text-[10px] text-center"
                          >
                            Buka Bukti Pembayaran di Tab Baru ↗
                          </a>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center p-4 border border-dashed rounded">
                          Belum mengunggah bukti pembayaran.
                        </p>
                      )}

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
                          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs font-semibold">
                            ⚠️ Menunggu Verifikasi Pembayaran
                          </div>
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
                          Rp {Number(managedTransaction.gross_amount || managedTransaction.subtotal).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {managedTransaction.discount > 0 && (
                        <div className="flex justify-between text-yellow-600 font-semibold">
                          <span>Diskon POS:</span>
                          <span>-Rp {Number(managedTransaction.discount).toLocaleString("id-ID")}</span>
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

                        <Button
                          onClick={() => void handleSaveManagedStatus()}
                          disabled={savingManaged}
                          className="w-full bg-ink text-white font-bold uppercase tracking-wider text-xs h-9"
                        >
                          {savingManaged ? "Menyimpan..." : "Simpan Perubahan Status"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-4">
            <Button
              onClick={() => setManagementOpen(false)}
              className="bg-ink text-white font-bold uppercase tracking-wider text-xs px-6"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
