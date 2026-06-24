import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@frontend/components/ui/tabs";
import { Badge } from "@frontend/components/ui/badge";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
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
import { Eye, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  getOnlineOrders,
  getOfflineSales,
  getOrderById,
  getOfflineSaleById,
  updateOrderStatus,
  deleteOrder,
  deleteOfflineSale,
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
};

function AdminTransactionsPage() {
  const [onlineOrders, setOnlineOrders] = useState<Order[]>([]);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal States
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState<"online" | "offline">("online");
  const [activeTransaction, setActiveTransaction] = useState<any>(null);
  const [transactionItems, setTransactionItems] = useState<any[]>([]);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Edit Status Modal States
  const [editOpen, setEditOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");
  const [editShippingAddress, setEditShippingAddress] = useState<string>("");
  const [savingStatus, setSavingStatus] = useState(false);

  const loadTransactions = async () => {
    try {
      const [online, offline] = await Promise.all([getOnlineOrders(), getOfflineSales()]);
      setOnlineOrders(online.orders || []);
      setOfflineSales(offline.sales || []);
    } catch {
      toast.error("Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransactions();
  }, []);

  const handleOpenDetail = async (id: string, type: "online" | "offline") => {
    setFetchingDetail(true);
    setDetailType(type);
    setDetailOpen(true);
    try {
      if (type === "online") {
        const result = await getOrderById({ data: id });
        if (result.success && result.order) {
          setActiveTransaction(result.order);
          setTransactionItems(result.items || []);
        } else {
          toast.error("Gagal mengambil detail pesanan");
          setDetailOpen(false);
        }
      } else {
        const result = await getOfflineSaleById({ data: id });
        if (result.success && result.sale) {
          setActiveTransaction(result.sale);
          setTransactionItems(result.items || []);
        } else {
          toast.error("Gagal mengambil detail penjualan POS");
          setDetailOpen(false);
        }
      }
    } catch {
      toast.error("Terjadi kesalahan memuat detail");
      setDetailOpen(false);
    } finally {
      setFetchingDetail(false);
    }
  };

  const handleOpenEditStatus = (order: Order) => {
    setEditOrderId(order.order_id);
    setEditStatus(order.transaction_status);
    setEditShippingAddress(order.shipping_address || "");
    setEditOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!editOrderId || !editStatus) return;
    setSavingStatus(true);
    try {
      const result = await updateOrderStatus({
        data: {
          id: editOrderId,
          status: editStatus,
          shipping_address: editShippingAddress || undefined,
        },
      });
      if (result.success) {
        toast.success("Status transaksi berhasil diperbarui!");
        setEditOpen(false);
        await loadTransactions();
      } else {
        toast.error(result.error || "Gagal memperbarui status");
      }
    } catch {
      toast.error("Gagal melakukan aksi pembaruan");
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
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

  if (loading && onlineOrders.length === 0) {
    return (
      <div className="p-8 text-muted-foreground bg-background min-h-screen">
        Memuat transaksi...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider">Manajemen Transaksi</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Pesanan online (Midtrans) dan penjualan offline (POS)
          </p>
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
                Pesanan Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
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
                    {onlineOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          Belum ada pesanan online
                        </td>
                      </tr>
                    ) : (
                      onlineOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-t border-border hover:bg-cream/10 transition-colors"
                        >
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
                            <Badge
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                statusColor[order.transaction_status] ||
                                "bg-muted text-muted-foreground"
                              }`}
                            >
                              {order.transaction_status}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleOpenDetail(order.order_id, "online")}
                                className="hover:bg-muted text-ink"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditStatus(order)}
                                className="hover:bg-muted text-ink"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-red-50"
                                onClick={() => void handleDeleteOrder(order.order_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

        <TabsContent value="offline">
          <Card>
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink">
                Penjualan Offline / POS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
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
                    {offlineSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          Belum ada penjualan offline
                        </td>
                      </tr>
                    ) : (
                      offlineSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="border-t border-border hover:bg-cream/10 transition-colors"
                        >
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
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleOpenDetail(sale.sale_id, "offline")}
                                className="hover:bg-muted text-ink"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-red-50"
                                onClick={() => void handleDeleteSale(sale.sale_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* dialog modal detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="display text-lg tracking-wide text-ink uppercase">
              Rincian Transaksi
            </DialogTitle>
          </DialogHeader>

          {fetchingDetail || !activeTransaction ? (
            <div className="p-8 text-center text-muted-foreground">Memuat rincian item...</div>
          ) : (
            <div className="space-y-6">
              {/* Customer Box */}
              <div className="grid grid-cols-2 gap-4 bg-[#FCFAF7] border border-border p-4 rounded-lg text-xs">
                <div>
                  <p className="font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    DATA PEMBELI
                  </p>
                  <p className="font-bold text-ink text-sm uppercase">
                    {activeTransaction.customer_name}
                  </p>
                  {activeTransaction.customer_nim && (
                    <p className="text-muted-foreground mt-0.5">
                      NIM: {activeTransaction.customer_nim}
                    </p>
                  )}
                  {activeTransaction.customer_email && (
                    <p className="text-muted-foreground">{activeTransaction.customer_email}</p>
                  )}
                  {activeTransaction.customer_phone && (
                    <p className="text-muted-foreground">{activeTransaction.customer_phone}</p>
                  )}
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    DETAIL STRUK
                  </p>
                  <p className="font-semibold text-brand-blue font-mono">
                    {activeTransaction.order_id || activeTransaction.sale_id}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Metode: {activeTransaction.payment_type || activeTransaction.payment_method}
                  </p>
                  <p className="text-muted-foreground">
                    Waktu: {new Date(activeTransaction.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                {activeTransaction.shipping_address && (
                  <div className="col-span-2 border-t border-dashed border-border pt-2 mt-1">
                    <p className="font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      ALAMAT PENGIRIMAN
                    </p>
                    <p className="text-ink">{activeTransaction.shipping_address}</p>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-ink uppercase tracking-wider">
                  Item Yang Dibeli
                </p>
                <div className="border border-border rounded overflow-hidden text-xs">
                  <table className="w-full">
                    <thead className="bg-cream">
                      <tr>
                        <th className="p-2.5 text-left text-ink uppercase font-semibold">Produk</th>
                        <th className="p-2.5 text-center text-ink uppercase font-semibold">
                          Varian
                        </th>
                        <th className="p-2.5 text-right text-ink uppercase font-semibold">Harga</th>
                        <th className="p-2.5 text-center text-ink uppercase font-semibold">Qty</th>
                        <th className="p-2.5 text-right text-ink uppercase font-semibold">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionItems.map((item, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="p-2.5 font-bold text-ink uppercase">
                            {item.product_name}
                          </td>
                          <td className="p-2.5 text-center text-muted-foreground">
                            {item.size || "One Size"}
                            {item.color ? ` / ${item.color}` : ""}
                          </td>
                          <td className="p-2.5 text-right">
                            Rp{" "}
                            {item.price
                              ? item.price.toLocaleString("id-ID")
                              : item.unit_price.toLocaleString("id-ID")}
                          </td>
                          <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-right font-bold text-brand-blue">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-end pt-2">
                <div className="w-56 text-xs space-y-2 text-right">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold text-ink">
                      Rp{" "}
                      {activeTransaction.gross_amount
                        ? activeTransaction.gross_amount.toLocaleString("id-ID")
                        : activeTransaction.subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                  {activeTransaction.discount > 0 && (
                    <div className="flex justify-between text-yellow-600 font-semibold">
                      <span>Diskon POS:</span>
                      <span>-Rp {activeTransaction.discount.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold">
                    <span className="display text-xs text-ink uppercase tracking-wider">
                      Total Akhir:
                    </span>
                    <span className="text-brand-orange text-md">
                      Rp{" "}
                      {(activeTransaction.gross_amount || activeTransaction.total).toLocaleString(
                        "id-ID",
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              onClick={() => setDetailOpen(false)}
              className="bg-ink text-white font-bold uppercase tracking-wider text-xs px-6"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* dialog modal edit status online */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Status Pesanan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p>
                Mengubah status transaksi di sini secara manual HANYA disarankan bila terjadi
                kendala integrasi notifikasi Midtrans otomatis.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Order ID</Label>
              <Input value={editOrderId} readOnly className="font-mono text-xs bg-muted" />
            </div>

            <div className="space-y-1.5">
              <Label>Status Transaksi</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">PENDING (Belum Bayar)</SelectItem>
                  <SelectItem value="settlement">SETTLEMENT (Lunas)</SelectItem>
                  <SelectItem value="expire">EXPIRE (Kadaluarsa)</SelectItem>
                  <SelectItem value="cancel">CANCEL (Dibatalkan)</SelectItem>
                  <SelectItem value="completed">COMPLETED (Pesanan Selesai)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Alamat Pengiriman</Label>
              <Input
                value={editShippingAddress}
                onChange={(e) => setEditShippingAddress(e.target.value)}
                placeholder="Masukkan alamat pengiriman/ambil"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void handleSaveStatus()} disabled={savingStatus}>
              {savingStatus ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
