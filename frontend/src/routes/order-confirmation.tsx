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
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { useState, useEffect, useRef } from "react";
import {
  getOrderById,
  regeneratePaymentToken,
  getStoreSettings,
  submitPaymentProof
} from "@backend/server-actions";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/image-resolver";

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
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofUrl, setProofUrl] = useState<string>("");
  const [proofUrlTemp, setProofUrlTemp] = useState<string>("");
  const [isEditingProof, setIsEditingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mayarCheckoutUrl, setMayarCheckoutUrl] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Auto poll order status while payment modal is open or pending
  useEffect(() => {
    const orderId = search.orderId;
    if (!orderId) return;

    const pStatus = order?.payment_status;

    if (pStatus === "paid" || order?.order_status === "cancelled") {
      if (showPaymentModal) {
        setShowPaymentModal(false);
        toast.success("✓ Pembayaran Anda telah terverifikasi dan berhasil!");
      }
      return;
    }

    const interval = setInterval(() => {
      void getOrderById({ data: orderId }).then((result) => {
        if (result.success && result.order) {
          setOrder(result.order);
          if (result.items) setOrderItems(result.items);
          if (result.order.payment_status === "paid") {
            setShowPaymentModal(false);
            toast.success("✓ Pembayaran Anda telah terverifikasi dan berhasil!");
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [search.orderId, order?.payment_status, showPaymentModal]);

  const fetchOrderDetails = async () => {
    if (!search.orderId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [result, settingsRes] = await Promise.all([
        getOrderById({ data: search.orderId }),
        getStoreSettings(),
      ]);

      if (result.success && result.order) {
        setOrder(result.order);
        setOrderItems(result.items || []);
        if (result.order.payment_proof_url) {
          setProofUrl(result.order.payment_proof_url);
        }
      } else {
        toast.error(result.error || "Gagal mengambil data status pesanan");
      }

      if (settingsRes.settings) {
        setStoreSettings(settingsRes.settings);
      }
    } catch (e) {
      console.error("Error fetching order confirmation details:", e);
      toast.error("Gagal memeriksa status terbaru pesanan");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const API_BASE_URL = import.meta.env.VITE_API_URL || "https://filkommerch.com";

    try {
      setUploadingProof(true);
      toast.loading("Mengunggah bukti transfer...");
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.url) {
        setProofUrlTemp(data.url);
        toast.success("Foto bukti transfer berhasil diunggah");
      } else {
        toast.error(data.error || "Gagal mengunggah foto");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah bukti transfer");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!order?.order_id || !proofUrlTemp) return;

    try {
      setSubmittingProof(true);
      const res = await submitPaymentProof({
        data: {
          orderId: order.order_id,
          paymentProofUrl: proofUrlTemp,
        },
      });

      if (res.success) {
        setProofUrl(proofUrlTemp);
        setProofUrlTemp("");
        setIsEditingProof(false);
        toast.success("Bukti transfer berhasil diperbarui. Menunggu verifikasi admin.");
        void fetchOrderDetails();
      } else {
        toast.error(res.error || "Gagal mengirim bukti transfer");
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan mengirim bukti transfer");
    } finally {
      setSubmittingProof(false);
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
      setIsRegenerating(true);
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

  // Determine payment mode
  const isManualQrisMode = order?.payment_type === "manual_qris" || storeSettings?.payment_mode === "manual_qris";

  let statusIcon = <Clock className="mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12 text-amber-500" />;
  let statusTitle = "Menunggu Pembayaran";
  let statusDescription =
    "Pesanan Anda berhasil dibuat! Silakan lakukan pembayaran Anda sebelum batas waktu berakhir.";
  let statusBg = "bg-amber-50 border-amber-200 text-amber-900";

  // Override for manual QRIS mode
  if (isManualQrisMode && (pStatus === "unpaid" || pStatus === "pending")) {
    if (proofUrl || order?.payment_proof_url) {
      statusIcon = <Clock className="mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12 text-blue-500" />;
      statusTitle = "Pesanan Sedang Direview Admin";
      statusDescription =
        "Bukti pembayaran Anda telah diterima. Sembari menunggu, anda bisa melihat-lihat produk lain dengan klik \"Lanjut Belanja\".";
      statusBg = "bg-blue-50 border-blue-200 text-blue-900";
    } else {
      statusTitle = "Pesanan Berhasil Dibuat";
      statusDescription =
        "Silakan scan QRIS di bawah dan unggah bukti pembayaran Anda. Admin akan memverifikasi pembayaran secara manual.";
    }
  }

  if (oStatus === "cancelled" || pStatus === "failed" || pStatus === "expired") {
    statusIcon = <XCircle className="mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12 text-red-500" />;
    statusTitle = "Transaksi Gagal / Dibatalkan";
    statusDescription = "Maaf, pesanan Anda telah dibatalkan atau waktu pembayaran telah habis.";
    statusBg = "bg-red-50 border-red-200 text-red-900";
  } else if (oStatus === "ready_for_pickup") {
    statusIcon = <CheckCircle2 className="mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12 text-teal-500" />;
    statusTitle = "Siap Diambil!";
    statusDescription =
      "Pesanan Anda telah dikonfirmasi dan sudah siap diambil di Store FILKOM Merch UB. Tunjukkan halaman ini atau kode pengambilan Anda.";
    statusBg = "bg-teal-50 border-teal-200 text-teal-900";
  } else if (oStatus === "shipped") {
    statusIcon = <CheckCircle2 className="mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12 text-blue-500" />;
    statusTitle = "Siap Diantar / Dikirim!";
    statusDescription =
      "Pesanan Anda sedang diantar kurir atau telah diserahkan ke jasa pengiriman. Info resi/pengiriman akan dihubungi via WhatsApp.";
    statusBg = "bg-blue-50 border-blue-200 text-blue-900";
  } else if (
    pStatus === "paid" ||
    oStatus === "paid" ||
    oStatus === "processing" ||
    oStatus === "completed"
  ) {
    statusIcon = <CheckCircle2 className="mx-auto mb-3 h-10 w-10 sm:h-12 sm:w-12 text-green-500" />;
    statusTitle = "Pembayaran Berhasil!";
    statusDescription =
      "Terima kasih! Pembayaran Anda telah diterima dan pesanan Anda sedang kami proses.";
    statusBg = "bg-green-50 border-green-200 text-green-900";
  }

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink">
      {/* Header */}
      <div className="border-b-2 border-ink bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-1 hover:bg-cream border border-transparent hover:border-ink rounded transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="display text-base sm:text-lg tracking-wider text-ink uppercase">
              Konfirmasi Pesanan
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content (2-Column Grid on Desktop) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-24 lg:pb-28">

          {/* KOLOM KIRI (LEBIH BESAR): Status & Pembayaran QRIS / Upload Bukti */}
          <div className="lg:col-span-7 space-y-6">
            {/* Compact Status Header */}
            <div className="text-center lg:text-left bg-white border-2 border-ink rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="shrink-0">{statusIcon}</div>
              <div>
                <h2 className="mb-1 text-xl sm:text-2xl font-extrabold text-ink uppercase tracking-wider">
                  {statusTitle}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {statusDescription}
                </p>
              </div>
            </div>

            {/* Determine payment mode */}
            {(() => {
              const isManualQrisMode = order?.payment_type === "manual_qris" || storeSettings?.payment_mode === "manual_qris";
              const isPending = (pStatus === "unpaid" || pStatus === "pending") && oStatus !== "cancelled";

              if (!isPending) return null;

              if (isManualQrisMode) {
                return (
                  <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
                    <CardHeader className="bg-cream/40 border-b-2 border-ink py-3.5">
                      <CardTitle className="display text-sm tracking-wider uppercase text-ink flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-brand-orange" />
                        Pembayaran QRIS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-5">
                      <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                        Silakan bayar melalui QRIS di bawah ini sejumlah{" "}
                        <strong className="text-brand-orange font-bold text-sm">
                          Rp {order?.gross_amount?.toLocaleString("id-ID") || "0"}
                        </strong>{" "}
                        dan unggah bukti transfernya pada form di bawah gambar QRIS.
                      </p>

                      {storeSettings?.qris_static_url ? (
                        <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-ink rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] max-w-sm sm:max-w-md mx-auto w-full">
                          <div className="w-full aspect-square relative flex items-center justify-center p-2 bg-white">
                            <img
                              src={resolveImageUrl(storeSettings.qris_static_url)}
                              alt="QRIS Pembayaran"
                              className="w-full h-full object-contain rounded-md"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 border-2 border-dashed border-ink/20 rounded-lg bg-muted/20 text-center text-xs text-muted-foreground font-semibold">
                          QRIS Pembayaran belum diset oleh Admin. Silakan hubungi admin untuk informasi pembayaran.
                        </div>
                      )}

                      {/* Upload Bukti Pembayaran */}
                      <div className="border-2 border-ink rounded-xl p-4 space-y-3 bg-white shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]">
                        <h3 className="font-extrabold text-xs uppercase tracking-wider text-ink">
                          Unggah Bukti Pembayaran
                        </h3>

                        {order?.payment_proof_note && (
                          <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-red-900 text-xs font-semibold flex items-start gap-2 text-left shadow-[2px_2px_0px_0px_rgba(239,68,68,1)] animate-fade-in">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-extrabold uppercase block text-[10px] text-red-800">Bukti Pembayaran Ditolak:</span>
                              <p className="mt-0.5 text-[11px] font-semibold text-ink leading-snug">"{order.payment_proof_note}"</p>
                              <p className="mt-1.5 text-[10px] text-red-600 font-bold">* Silakan upload ulang bukti transfer yang benar.</p>
                            </div>
                          </div>
                        )}

                        {proofUrl && !isEditingProof ? (
                          <div className="space-y-3">
                            <div className="relative border border-emerald-200 rounded-lg p-3 bg-emerald-50/50 flex flex-col items-center gap-3">
                              <img
                                src={resolveImageUrl(proofUrl)}
                                alt="Bukti Transfer"
                                className="max-h-48 rounded object-contain border border-emerald-200 bg-white"
                              />
                              <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">
                                Bukti Pembayaran Terunggah ✓
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground text-center font-semibold uppercase tracking-wide">
                              Sembari menunggu, anda bisa melihat-lihat produk lain dengan klik "Lanjut Belanja"
                            </p>
                            {order?.notes && (
                              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg text-amber-900 text-xs font-semibold flex items-start gap-2 text-left">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-extrabold uppercase block text-[10px] text-amber-800">Catatan dari Admin:</span>
                                  <p className="mt-0.5 text-[11px] font-medium leading-snug">{order.notes}</p>
                                </div>
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsEditingProof(true);
                                setProofUrlTemp("");
                              }}
                              className="w-full border-2 border-ink bg-white text-ink hover:bg-cream text-xs font-bold uppercase tracking-wider h-10 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-brand-orange" />
                              Ganti Foto Bukti Pembayaran
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="grid w-full items-center gap-1.5">
                              <div className="flex items-center justify-between">
                                <label htmlFor="payment-proof-upload" className="text-[10px] uppercase font-bold text-ink">
                                  {isEditingProof ? "Pilih Foto Bukti Pembayaran Baru:" : "Pilih File Bukti Transfer:"}
                                </label>
                                {isEditingProof && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsEditingProof(false);
                                      setProofUrlTemp("");
                                    }}
                                    className="text-[10px] font-bold text-red-600 hover:underline uppercase cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                )}
                              </div>
                              <input
                                ref={fileInputRef}
                                id="payment-proof-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleUploadProof}
                                disabled={uploadingProof || submittingProof}
                                className="flex h-10 w-full rounded-md border-2 border-ink bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-semibold cursor-pointer disabled:opacity-50"
                              />
                              <p className="text-[10px] text-muted-foreground">
                                Unggah file bukti transfer Anda (format PNG, JPG, atau WEBP, max 5MB).
                              </p>
                            </div>

                            {proofUrlTemp && (
                              <div className="relative border-2 border-dashed border-ink/20 rounded-lg p-3 bg-muted/10 flex flex-col items-center gap-3">
                                <img
                                  src={resolveImageUrl(proofUrlTemp)}
                                  alt="Bukti Transfer"
                                  className="max-h-48 rounded object-contain border border-ink/10 bg-white"
                                />
                                <div className="flex gap-2 w-full">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 border-2 border-ink bg-white text-ink hover:bg-cream text-xs font-bold uppercase tracking-wider h-10 cursor-pointer"
                                  >
                                    Pilih Foto Lain
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={handleSubmitProof}
                                    disabled={submittingProof}
                                    className="flex-1 bg-ink text-white hover:bg-brand-orange text-xs font-bold uppercase tracking-wider h-10 border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
                                  >
                                    {submittingProof ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        Mengirim...
                                      </>
                                    ) : (
                                      "Kirim Bukti"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              // Online Payment Mayar Mode
              return (
                <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
                  <CardHeader className="bg-cream/40 border-b-2 border-ink py-3.5">
                    <CardTitle className="display text-sm tracking-wider uppercase text-ink flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-brand-orange" />
                      Pembayaran Online — Mayar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      Gunakan tombol di bawah untuk membuka portal pembayaran Mayar. Tersedia berbagai opsi Virtual Account, QRIS Dinamis, E-Wallet, dan Kartu Kredit.
                    </p>
                    {order?.snap_token && (
                      <Button
                        onClick={() => handlePayNow(false)}
                        disabled={isRegenerating}
                        className="w-full h-12 bg-emerald-600 text-white hover:bg-emerald-600/90 font-bold uppercase tracking-wider border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        Lanjutkan Pembayaran
                      </Button>
                    )}
                    <Button
                      onClick={() => handlePayNow(true)}
                      disabled={isRegenerating}
                      className="w-full h-12 bg-brand-orange text-white hover:bg-brand-orange/90 font-bold uppercase tracking-wider border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      {isRegenerating
                        ? "Memproses..."
                        : order?.snap_token
                          ? "Ubah Metode Pembayaran"
                          : "Lanjutkan Pembayaran Sekarang"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* KOLOM KANAN: Rincian Transaksi, Action Buttons, & Seksi Bantuan */}
          <div className="lg:col-span-5 space-y-6">
            {/* Rincian Transaksi */}
            <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
              <CardHeader className="bg-cream/40 border-b-2 border-ink py-3.5">
                <CardTitle className="display text-sm tracking-wider uppercase text-ink">
                  Rincian Transaksi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <img src={resolveImageUrl(item.image_url)} alt={item.product_name} className="w-full h-full object-cover" />
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
              </CardContent>
            </Card>

            {/* Action Buttons placeholder - actual buttons are fixed at bottom */}

            {/* Seksi Butuh Bantuan (Di bawah Action Buttons) */}
            <div className="rounded-xl bg-emerald-50 border-2 border-ink p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]">
              <div className="text-center sm:text-left">
                <p className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  Butuh Bantuan?
                </p>
                <p className="mt-0.5 text-xs text-emerald-900 font-medium leading-relaxed">
                  Ada kendala pembayaran atau ingin menanyakan ketersediaan pengambilan barang?
                </p>
              </div>
              <a
                href="https://wa.me/628123456789"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border border-emerald-800 text-xs font-extrabold uppercase transition shadow-xs"
              >
                <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                Hubungi Admin
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Fixed Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-ink px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-6xl flex flex-col gap-2 sm:flex-row sm:gap-3">
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
            <Link to="/orders">Lihat Pesanan Saya</Link>
          </Button>
        </div>
      </div>

      {/* Mayar Payment Gateway Modal */}
      {showPaymentModal && mayarCheckoutUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-card rounded-2xl border-2 border-ink shadow-2xl overflow-hidden mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b-2 border-ink bg-cream/20">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-brand-orange" />
                <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-ink">
                  Pembayaran Online — Mayar
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    toast.loading("Memeriksa status pembayaran...");
                    await fetchOrderDetails();
                    toast.dismiss();
                    if (order?.payment_status === "paid") {
                      setShowPaymentModal(false);
                      toast.success("✓ Pembayaran berhasil terverifikasi!");
                    } else {
                      toast.info("Status pembayaran masih pending / belum diterima.");
                    }
                  }}
                  className="h-8 text-xs font-bold border-ink/30 cursor-pointer bg-white"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Cek Status
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    void fetchOrderDetails();
                  }}
                  className="p-1.5 rounded-full border border-ink/20 hover:bg-red-50 hover:border-red-300 text-ink hover:text-red-600 transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Informational Guidance Sub-header */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-900 flex items-center justify-between">
              <span className="font-medium">💡 Selesaikan pembayaran di halaman Mayar. Status akan otomatis diperbarui.</span>
              <span className="font-bold text-amber-950 shrink-0 ml-2">Mayar Gateway</span>
            </div>
            {/* Mayar Iframe */}
            <iframe
              src={mayarCheckoutUrl}
              className="w-full h-[600px] sm:h-[650px] border-none"
              title="Mayar Payment Gateway"
              allow="payment"
              onLoad={() => {
                // Instantly re-check status when Mayar iframe navigates/redirects after payment
                void fetchOrderDetails();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
