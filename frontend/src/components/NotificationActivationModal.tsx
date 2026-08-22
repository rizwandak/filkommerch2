import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Smartphone,
  Laptop,
  Share2,
  PlusSquare,
  Sparkles,
  RefreshCw,
  Send,
  HelpCircle,
  ShieldCheck,
  Package,
  QrCode,
  Truck,
} from "lucide-react";
import {
  checkPushSubscriptionStatus,
  subscribeUserToPush,
  testSelfPushNotification,
  isIosDevice,
  isStandalonePwa,
} from "../services/pushService";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "android" | "ios";

export function NotificationActivationModal({ isOpen, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("android");
  const [isChecking, setIsChecking] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [status, setStatus] = useState<{
    isSupported: boolean;
    permission: NotificationPermission | "unsupported";
    isSubscribed: boolean;
    isIos: boolean;
    isPwa: boolean;
  }>({
    isSupported: true,
    permission: "default",
    isSubscribed: false,
    isIos: false,
    isPwa: false,
  });

  const refreshStatus = async () => {
    setIsChecking(true);
    try {
      const res = await checkPushSubscriptionStatus();
      setStatus({
        isSupported: res.isSupported,
        permission: res.permission,
        isSubscribed: res.isSubscribed,
        isIos: res.isIos,
        isPwa: res.isPwa,
      });

      // Auto-select iOS tab if user is on iPhone/iPad
      if (res.isIos) {
        setActiveTab("ios");
      }
    } catch (err) {
      console.error("Error checking push status:", err);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const res = await subscribeUserToPush();
      if (res.success) {
        toast.success("🎉 Notifikasi Web FILKOM Merch berhasil diaktifkan!");
        await refreshStatus();
      } else {
        if (Notification.permission === "denied") {
          toast.error("Izin notifikasi diblokir oleh browser. Silakan izinkan melalui pengaturan browser.");
        } else {
          toast.error(res.error || "Gagal mengaktifkan notifikasi.");
        }
        await refreshStatus();
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengaktifkan notifikasi.");
    } finally {
      setIsActivating(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const res = await testSelfPushNotification();
      if (res.success) {
        toast.success("🔔 Notifikasi uji coba telah dikirim ke perangkat kamu!");
      } else {
        toast.error(res.error || "Gagal mengirim notifikasi test. Pastikan izin sudah diberikan.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kendala pengujian notifikasi.");
    } finally {
      setIsTesting(false);
    }
  };

  const isGranted = status.permission === "granted";
  const isDenied = status.permission === "denied";
  const isDefault = status.permission === "default";
  const isUnsupported = !status.isSupported || status.permission === "unsupported";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/75 backdrop-blur-xs animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-background border-4 border-ink rounded-3xl w-full max-w-xl overflow-hidden shadow-[10px_10px_0px_0px_rgba(27,27,27,1)] relative animate-scale-in flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-cream border-b-2 border-ink p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-brand-orange text-cream rounded-xl border border-ink shadow-xs">
              <Bell className="w-5 h-5 animate-wiggle" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-ink uppercase tracking-wide flex items-center gap-1.5">
                Status Notifikasi Web
              </h2>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground font-bold">
                FILKOM Merch Push Notification Hub
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 border-2 border-ink rounded-xl bg-white hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-xs"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-ink">
          {/* Real-time Status Card */}
          <div className="bg-secondary/40 border-2 border-ink p-3.5 sm:p-4 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                Status Perangkat Ini
              </span>
              <button
                onClick={refreshStatus}
                disabled={isChecking}
                className="text-[10px] font-bold text-brand-orange hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "Memeriksa..." : "Perbarui Status"}
              </button>
            </div>

            {/* Badge Indicator */}
            {isGranted ? (
              <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/60 p-3 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300">
                    🟢 NOTIFIKASI SUDAH AKTIF &amp; TERHUBUNG
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed font-medium">
                    Perangkatmu sudah terdaftar untuk menerima update pengambilan barang PO, pembayaran QRIS, &amp; pengumuman langsung.
                  </p>
                </div>
              </div>
            ) : isDenied ? (
              <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500/60 p-3 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-black text-rose-800 dark:text-rose-300">
                    🔴 IZIN NOTIFIKASI DIBLOKIR BROWSER
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 leading-relaxed font-medium">
                    Browser kamu memblokir izin notifikasi web ini. Silakan ikuti panduan reset izin di bawah untuk mengaktifkannya.
                  </p>
                </div>
              </div>
            ) : isUnsupported ? (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/60 p-3 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300">
                    ⚠️ BROWSER TIDAK MENDUKUNG WEB PUSH
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    Gunakan browser modern seperti Google Chrome, Microsoft Edge, atau Safari (iOS dengan Add to Home Screen).
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500/60 p-3 rounded-xl">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300">
                    🟡 NOTIFIKASI BELUM DIAKTIFKAN
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    Aktifkan notifikasi sekarang agar tidak terlewat pengumuman pengambilan jaket PO dan konfirmasi pembayaran.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Action Button Area */}
            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              {!isGranted ? (
                <button
                  onClick={handleActivate}
                  disabled={isActivating || isUnsupported || isDenied}
                  className="w-full py-3 px-4 bg-brand-orange hover:bg-orange-600 text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Bell className="w-4 h-4" />
                  {isActivating ? "Sedang Mengaktifkan..." : "Aktifkan Notifikasi Sekarang"}
                </button>
              ) : (
                <button
                  onClick={handleTestNotification}
                  disabled={isTesting}
                  className="w-full py-3 px-4 bg-ink hover:bg-brand-orange text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-brand-orange" />
                  {isTesting ? "Mengirim Notifikasi Test..." : "🔔 Uji Coba / Test Kirim Notifikasi Push"}
                </button>
              )}
            </div>
          </div>

          {/* Dual Guide Section: Android vs iPhone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> Panduan Cara Aktivasi Per Perangkat
              </span>
            </div>

            {/* Device Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-secondary/60 p-1.5 rounded-xl border-2 border-ink">
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "android"
                    ? "bg-brand-orange text-cream border border-ink shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Android &amp; PC/Laptop
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "ios"
                    ? "bg-brand-orange text-cream border border-ink shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> iPhone / iPad (iOS)
              </button>
            </div>

            {/* Tab 1: Android & Laptop / PC Guide */}
            {activeTab === "android" && (
              <div className="bg-background border-2 border-ink p-4 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-brand-orange">
                  <Laptop className="w-4 h-4" /> Cara Aktivasi di Android / Chrome / Edge / Firefox:
                </div>

                <ol className="space-y-2.5 text-xs text-foreground/90 font-medium">
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-orange text-cream text-[11px] font-black shrink-0">
                      1
                    </span>
                    <span>
                      Tekan tombol <strong>"Aktifkan Notifikasi Sekarang"</strong> di atas.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-orange text-cream text-[11px] font-black shrink-0">
                      2
                    </span>
                    <span>
                      Saat muncul kotak dialog izin dari browser (<em>"filkommerch.com ingin mengirim notifikasi"</em>), pilih <strong>"Izinkan" / "Allow"</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-orange text-cream text-[11px] font-black shrink-0">
                      3
                    </span>
                    <span>
                      Tekan tombol <strong>"Uji Coba / Test Kirim Notifikasi"</strong> untuk memastikan notifikasi muncul di layar HP/PC kamu.
                    </span>
                  </li>
                </ol>

                {isDenied && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 space-y-1">
                    <strong>Cara Buka Blokir Izin di Browser:</strong>
                    <p>
                      Klik ikon 🔒 / pengaturan situs di sebelah kiri kolom URL browser -&gt; Ubah izin <strong>Notifikasi</strong> menjadi <strong>Izinkan (Allow)</strong> -&gt; lalu refresh halaman web.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: iPhone / iPad (iOS) Guide */}
            {activeTab === "ios" && (
              <div className="bg-background border-2 border-ink p-4 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-brand-orange">
                  <Smartphone className="w-4 h-4" /> Khusus Pengguna iPhone &amp; iPad (iOS 16.4+):
                </div>

                <div className="bg-orange-50/80 dark:bg-orange-950/30 p-2.5 rounded-xl border border-brand-orange/30 text-[11px] text-ink font-semibold">
                  ⚠️ <strong>Wajib Add to Home Screen (PWA):</strong> Apple mewajibkan website ditambahkan ke Layar Utama iPhone terlebih dahulu agar fitur Web Push Notification dapat berjalan.
                </div>

                <ol className="space-y-2.5 text-xs text-foreground/90 font-medium">
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-orange text-cream text-[11px] font-black shrink-0">
                      1
                    </span>
                    <span>
                      Buka web <strong>filkommerch.com</strong> menggunakan browser <strong>Safari</strong> (bukan browser in-app IG/TikTok).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-orange text-cream text-[11px] font-black shrink-0">
                      2
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Tekan tombol <strong>Share / Bagikan</strong> <Share2 className="w-3.5 h-3.5 text-brand-orange inline shrink-0" /> di bilah bawah Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-orange text-cream text-[11px] font-black shrink-0">
                      3
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      Pilih menu <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 text-brand-orange inline shrink-0" /> lalu tekan <strong>Tambah (Add)</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-orange text-cream text-[11px] font-black shrink-0">
                      4
                    </span>
                    <span>
                      Buka aplikasi <strong>FILKOM Merch</strong> dari ikon Layar Utama iPhone kamu, lalu buka menu ini dan tekan <strong>"Aktifkan Notifikasi"</strong> -&gt; <strong>Izinkan (Allow)</strong>.
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* Benefit Pillars */}
          <div className="bg-cream/40 border border-ink/20 p-3.5 rounded-2xl space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" /> Manfaat Mengaktifkan Notifikasi Web:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px] font-bold text-ink">
              <div className="bg-background border border-ink/15 p-2 rounded-xl flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-orange shrink-0" />
                <span>Info Pengambilan Jaket PO di Store</span>
              </div>
              <div className="bg-background border border-ink/15 p-2 rounded-xl flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Status Bukti Bayar QRIS &amp; Pelunasan</span>
              </div>
              <div className="bg-background border border-ink/15 p-2 rounded-xl flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Update Resi &amp; Pengiriman Paket</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-cream border-t-2 border-ink p-3 text-center text-[10px] font-black uppercase text-brand-orange tracking-wider flex items-center justify-center gap-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5 animate-spin" /> PUSH NOTIFICATION SYSTEM — FILKOM MERCH STORE <Sparkles className="w-3.5 h-3.5 animate-spin" />
        </div>
      </div>
    </div>
  );
}
