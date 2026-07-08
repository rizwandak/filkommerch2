import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ArrowLeft,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  CreditCard,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { useState, useEffect } from "react";
import { getOrderById, regeneratePaymentToken } from "@backend/server-actions";
import { toast } from "sonner";

interface OrderConfirmationSearch {
  orderId?: string;
}

export const Route = createFileRoute("/order-confirmation")({
  validateSearch: (search: Record<string, unknown>): OrderConfirmationSearch => ({
    orderId: search.orderId as string | undefined,
  }),
  component: OrderConfirmationPage,
  head: () => ({
    meta: [
      { title: "Konfirmasi Pesanan — Filkom Merch UB" },
      { name: "description", content: "Status pesanan merchandise FILKOM UB Anda" },
    ],
  }),
});

function OrderConfirmationPage() {
  const search = useSearch({ from: "/order-confirmation" });
  const [order, setOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

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

  const fetchOrderDetails = async () => {
    if (!search.orderId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await getOrderById({ data: search.orderId });
      if (result.success && result.order) {
        setOrder(result.order);
        setOrderItems(result.items || []);
      } else {
        toast.error(result.error || "Gagal mengambil data status pesanan");
      }
    } catch (e) {
      console.error("Error fetching order confirmation details:", e);
      toast.error("Gagal memeriksa status terbaru pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrderDetails();
  }, [search.orderId]);

  const handlePayNow = async (shouldRegenerate: boolean = true) => {
    if (!order?.order_id) {
      toast.error("Data pesanan tidak valid.");
      return;
    }

    try {
      let snapToken = order.snap_token;

      if (shouldRegenerate || !snapToken) {
        setIsRegenerating(true);
        const res = await regeneratePaymentToken({ data: { orderId: order.order_id } });
        if (!res.success || !res.token) {
          toast.error(res.error || "Gagal memproses pembayaran baru. Silakan coba lagi.");
          return;
        }
        snapToken = res.token;
        setOrder((prev: any) => (prev ? { ...prev, snap_token: res.token } : prev));
      }

      if ((window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: (snapResult: any) => {
            toast.success("Pembayaran berhasil!");
            void fetchOrderDetails();
          },
          onPending: (snapResult: any) => {
            toast.info("Pembayaran tertunda. Silakan selesaikan pembayaran Anda.");
            void fetchOrderDetails();
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
      setIsRegenerating(false);
    }
  };

  const getFulfillmentLabel = (type: string) => {
    if (type === "pickup") return "Ambil di Toko (Pickup)";
    if (type === "walk_in") return "Beli Langsung (POS)";
    return "Pengiriman Kurir";
  };

  // Render Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 animate-spin text-brand-orange mb-4" />
        <p className="font-semibold text-muted-foreground">Memeriksa status transaksi terbaru...</p>
      </div>
    );
  }

  // Determine UI states based on payment status
  const pStatus = order?.payment_status || "unpaid";
  const oStatus = order?.order_status || "pending_payment";

  let statusIcon = <Clock className="mx-auto mb-6 h-16 w-16 text-amber-500" />;
  let statusTitle = "Menunggu Pembayaran";
  let statusDescription =
    "Pesanan Anda berhasil dibuat! Silakan lakukan pembayaran Anda sebelum batas waktu berakhir.";
  let statusBg = "bg-amber-50 border-amber-200 text-amber-900";

  if (oStatus === "cancelled" || pStatus === "failed" || pStatus === "expired") {
    statusIcon = <XCircle className="mx-auto mb-6 h-16 w-16 text-red-500" />;
    statusTitle = "Transaksi Gagal / Dibatalkan";
    statusDescription = "Maaf, pesanan Anda telah dibatalkan atau waktu pembayaran telah habis.";
    statusBg = "bg-red-50 border-red-200 text-red-900";
  } else if (
    pStatus === "paid" ||
    oStatus === "paid" ||
    oStatus === "processing" ||
    oStatus === "completed" ||
    oStatus === "ready_for_pickup"
  ) {
    statusIcon = <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-green-500" />;
    statusTitle = "Pembayaran Berhasil!";
    statusDescription =
      "Terima kasih! Pembayaran Anda telah diterima dan pesanan Anda sedang kami proses.";
    statusBg = "bg-green-50 border-green-200 text-green-900";
  }

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink">
      {/* Header */}
      <div className="border-b-2 border-ink bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-1 hover:bg-cream border border-transparent hover:border-ink rounded transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="display text-lg tracking-wider text-ink uppercase">
              Konfirmasi Pesanan
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center">
          {statusIcon}
          <h2 className="mb-2 text-3xl font-extrabold text-ink uppercase tracking-wider">
            {statusTitle}
          </h2>
          <p className="mb-8 text-md text-muted-foreground max-w-md mx-auto">{statusDescription}</p>
        </div>

        <Card className="mb-8 border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
          <CardHeader className="bg-cream/40 border-b-2 border-ink py-4">
            <CardTitle className="display text-sm tracking-wider uppercase text-ink">
              Rincian Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">ID Pesanan</p>
                <p className="break-all font-mono text-sm font-bold text-ink mt-0.5">
                  {search.orderId || "N/A"}
                </p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">
                  Total Transaksi
                </p>
                <p className="font-bold text-sm text-brand-orange mt-0.5">
                  Rp {order?.gross_amount?.toLocaleString("id-ID") || "0"}
                </p>
              </div>
            </div>

            {order && (
              <div className="border border-border rounded-lg p-3 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground uppercase font-bold text-[9px] block">
                    Metode Pengiriman
                  </span>
                  <span className="font-semibold text-ink">
                    {getFulfillmentLabel(order.fulfillment_type)}
                  </span>
                </div>
                {order.fulfillment_type === "shipping" && order.shipping_address && (
                  <div>
                    <span className="text-muted-foreground uppercase font-bold text-[9px] block">
                      Alamat Pengiriman
                    </span>
                    <span className="font-medium text-ink">{order.shipping_address}</span>
                  </div>
                )}
                {order.fulfillment_type === "shipping" && (
                  <div className="text-[10px] text-brand-orange font-semibold bg-brand-orange/5 p-2 rounded border border-brand-orange/20 mt-1">
                    * Biaya ongkir menyesuaikan jarak, rincian & cara pembayaran ongkir akan
                    diberitahu melalui WhatsApp.
                  </div>
                )}
                {order.fulfillment_type === "pickup" && (
                  <div className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 p-2 rounded border border-emerald-200 mt-1">
                    * Pengambilan barang gratis di toko fisik FILKOM Merch UB.
                  </div>
                )}
              </div>
            )}

            {orderItems && orderItems.length > 0 && (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-[#FCFAF7]">
                <p className="text-[10px] font-black text-ink uppercase tracking-wider border-b border-ink/10 pb-2">
                  Produk yang Dipesan
                </p>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center justify-between border-b border-ink/5 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-16 bg-cream border border-ink rounded overflow-hidden flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(27,27,27,1)]">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-ink leading-tight truncate">
                            {item.product_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                            {item.quantity} x Rp {item.unit_price?.toLocaleString("id-ID")}
                          </p>
                          {item.size && (
                            <span className="inline-block text-[9px] font-bold bg-cream border border-ink/10 px-2 py-0.5 rounded-full mt-1.5 text-ink">
                              Ukuran: {item.size} {item.color && item.color !== 'Default' ? `| Warna: ${item.color}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-extrabold text-brand-orange shrink-0">
                        Rp {item.subtotal?.toLocaleString("id-ID")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-4">
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Langkah Selanjutnya
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-blue-800 font-medium">
                  <li>• Ambil barang di toko (jika Pickup)</li>
                  <li>• Tunjukkan ID Pesanan kepada petugas</li>
                  <li>• Cek status ter-update di menu Pesanan Saya</li>
                </ul>
              </div>

              <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Butuh Bantuan?
                  </p>
                  <p className="mt-1 text-xs text-emerald-900 leading-relaxed">
                    Ada kendala pembayaran atau ingin menanyakan ketersediaan pengambilan barang?
                  </p>
                </div>
                <a
                  href="https://wa.me/628123456789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold uppercase transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white text-emerald-600" />
                  Hubungi Admin
                </a>
              </div>
            </div>

            {/* Pay Now Button directly if order is pending */}
            {(pStatus === "unpaid" || pStatus === "pending") && oStatus !== "cancelled" && (
              <div className="border-t border-dashed border-border pt-4 mt-2 space-y-2">
                {order.snap_token && (
                  <Button
                    onClick={() => handlePayNow(false)}
                    disabled={isRegenerating}
                    className="w-full h-12 bg-emerald-600 text-white hover:bg-emerald-600/90 font-bold uppercase tracking-wider border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-4 h-4" />
                    Lanjutkan Pembayaran
                  </Button>
                )}
                <Button
                  onClick={() => handlePayNow(true)}
                  disabled={isRegenerating}
                  className="w-full h-12 bg-brand-orange text-white hover:bg-brand-orange/90 font-bold uppercase tracking-wider border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {isRegenerating
                    ? "Memproses..."
                    : order.snap_token
                      ? "Ubah Metode Pembayaran"
                      : "Lanjutkan Pembayaran Sekarang"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            asChild
            className="flex-1 h-12 border-2 border-ink bg-white text-ink hover:bg-cream font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all"
          >
            <Link to="/">Lanjut Belanja</Link>
          </Button>
          <Button
            asChild
            className="flex-1 h-12 border-2 border-ink bg-ink text-white hover:bg-brand-orange font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all"
          >
            <Link to="/orders">Lacak Pesanan Saya</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
