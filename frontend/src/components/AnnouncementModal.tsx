import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Bell,
  CheckCircle2,
  Smartphone,
  Laptop,
  Share2,
  PlusSquare,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import confetti from "canvas-confetti";
import baraSmile from "@/assets/bara-smile.png";
import {
  subscribeUserToPush,
  checkPushSubscriptionStatus,
  isIosDevice,
} from "../services/pushService";
import { NotificationActivationModal } from "./NotificationActivationModal";
import { toast } from "sonner";

interface Props {
  delayMs?: number;
}

export function AnnouncementModal({ delayMs = 600 }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isAlreadyGranted, setIsAlreadyGranted] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");
  const animFrameRef = useRef<number | null>(null);
  const isRainingRef = useRef(false);

  useEffect(() => {
    // Check permission status
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setIsAlreadyGranted(true);
      }
    }

    if (isIosDevice()) {
      setActiveTab("ios");
    }

    const timer = setTimeout(() => {
      // Check if user already dismissed this specific announcement recently (optional, or always show for high priority)
      const dismissed = localStorage.getItem("notif_announcement_dismissed_v1");
      if (!dismissed) {
        setIsVisible(true);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      isRainingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [delayMs]);

  const handleClose = () => {
    isRainingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    try {
      confetti.reset();
    } catch {
      // ignore
    }
    localStorage.setItem("notif_announcement_dismissed_v1", "true");
    setIsVisible(false);
  };

  const handleDirectActivate = async () => {
    setIsActivating(true);
    try {
      const res = await subscribeUserToPush();
      if (res.success || (typeof window !== "undefined" && Notification.permission === "granted")) {
        setIsAlreadyGranted(true);
        toast.success("🎉 Notifikasi web berhasil diaktifkan!");
        // Trigger celebratory confetti burst
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      } else {
        if (Notification.permission === "denied") {
          toast.error("Izin notifikasi diblokir browser. Buka panduan untuk membuka blokir.");
          setIsNotifModalOpen(true);
        } else {
          setIsNotifModalOpen(true);
        }
      }
    } catch (e: any) {
      setIsNotifModalOpen(true);
    } finally {
      setIsActivating(false);
    }
  };

  if (!isVisible && !isNotifModalOpen) return null;

  return (
    <>
      {isVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/75 backdrop-blur-xs animate-fade-in overflow-y-auto"
          onClick={handleClose}
        >
          <div
            className="bg-background border-4 border-ink rounded-3xl w-full max-w-lg overflow-hidden shadow-[12px_12px_0px_0px_rgba(27,27,27,1)] relative animate-scale-in flex flex-col my-auto max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Bar */}
            <div className="bg-cream border-b-2 border-ink p-3.5 sm:p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-brand-orange text-cream text-[11px] font-black rounded-full border border-ink uppercase tracking-wider shadow-xs flex items-center gap-1.5 animate-pulse">
                  <Bell className="w-3.5 h-3.5 text-cream" /> PEMBERITAHUAN PENTING
                </span>
                <span className="text-[10px] font-black text-ink uppercase tracking-wider hidden sm:inline">
                  PUSH NOTIFIKASI
                </span>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 border-2 border-ink rounded-xl bg-white hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-xs"
                aria-label="Tutup pengumuman"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Card Body */}
            <div className="p-4 sm:p-6 space-y-4 text-ink overflow-y-auto">
              {/* Mascot & Graphic Headline */}
              <div className="flex items-center gap-3.5 bg-orange-50/90 dark:bg-orange-950/40 border-2 border-brand-orange/40 p-3.5 rounded-2xl shadow-xs">
                <img
                  src={baraSmile}
                  alt="Bara Filkom Merch"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-md animate-bounce"
                />
                <div className="space-y-1 min-w-0">
                  <h3 className="display text-base sm:text-lg font-black uppercase text-ink leading-tight flex items-center gap-1.5">
                    Wajib Aktifkan Notifikasi Web! 🔔
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold leading-relaxed">
                    Agar tidak terlewat info ketersediaan &amp; jadwal pengambilan Jaket PO Batch #1 &amp; #2.
                  </p>
                </div>
              </div>

              {/* Main Notice Paragraph */}
              <div className="text-xs leading-relaxed text-ink/90 font-medium space-y-2 bg-cream/30 dark:bg-cream/10 p-3.5 border border-ink/20 rounded-xl">
                <p>
                  Halo KBMFILKOM! Pengumuman ketersediaan barang untuk pengambilan jaket di <strong>FILKOM Merch Store</strong> serta update verifikasi pembayaran akan dikirimkan otomatis melalui <strong>Notifikasi Web (Push Notification)</strong> langsung ke perangkat HP &amp; laptop kamu.
                </p>
              </div>

              {/* Quick Guide Tabs: Android vs iPhone */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5 bg-secondary/60 p-1 rounded-xl border-2 border-ink">
                  <button
                    type="button"
                    onClick={() => setActiveTab("android")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeTab === "android"
                        ? "bg-brand-orange text-cream border border-ink shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> Android / PC
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("ios")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      activeTab === "ios"
                        ? "bg-brand-orange text-cream border border-ink shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> iPhone / iPad
                  </button>
                </div>

                {activeTab === "android" ? (
                  <div className="bg-background border-2 border-ink p-3 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-brand-orange flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5" /> Cara di Android &amp; Laptop/PC:
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      1. Tekan tombol <strong>"Aktifkan Notifikasi Sekarang"</strong> di bawah.<br />
                      2. Pilih <strong>"Izinkan" (Allow)</strong> pada dialog popup browser. Selesai!
                    </p>
                  </div>
                ) : (
                  <div className="bg-background border-2 border-ink p-3 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-brand-orange flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" /> Khusus Pengguna iPhone (iOS):
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      1. Buka di <strong>Safari</strong> -&gt; Tekan tombol <strong>Share</strong> <Share2 className="w-3 h-3 inline text-brand-orange" />.<br />
                      2. Pilih <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3 h-3 inline text-brand-orange" />.<br />
                      3. Buka web dari Home Screen iPhone &amp; izinkan notifikasi.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {isAlreadyGranted ? (
                  <div className="space-y-2">
                    <div className="w-full py-3 px-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl border-2 border-emerald-500/60 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Notifikasi di Perangkat Ini Sudah Aktif!
                    </div>
                    <button
                      onClick={() => {
                        setIsNotifModalOpen(true);
                        setIsVisible(false);
                      }}
                      className="w-full py-2.5 px-4 bg-ink hover:bg-brand-orange text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Cek / Test Kirim Notifikasi</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleDirectActivate}
                      disabled={isActivating}
                      className="w-full py-3.5 px-4 bg-brand-orange hover:bg-orange-600 text-cream font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Bell className="w-4 h-4 animate-bounce" />
                      {isActivating ? "Sedang Mengaktifkan..." : "🔔 AKTIFKAN NOTIFIKASI SEKARANG"}
                    </button>

                    <button
                      onClick={() => {
                        setIsNotifModalOpen(true);
                        setIsVisible(false);
                      }}
                      className="w-full py-2 text-center text-xs font-bold text-muted-foreground hover:text-brand-orange transition-colors cursor-pointer"
                    >
                      Lihat Panduan Lengkap &amp; Status Perangkat &rarr;
                    </button>
                  </div>
                )}

                <button
                  onClick={handleClose}
                  className="w-full py-2.5 text-center text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Tutup / Nanti Saja
                </button>
              </div>
            </div>

            {/* Bottom Footer Bar */}
            <div className="w-full bg-cream py-2 px-4 border-t-2 border-ink text-center text-[10px] font-black uppercase text-brand-orange tracking-widest flex items-center justify-center gap-2 shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> OFFICIAL ANNOUNCEMENT — FILKOM MERCH STORE <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* Notification Activation Detailed Modal */}
      <NotificationActivationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />
    </>
  );
}

/*
 ==============================================================================
 DEACTIVATED: Pre-Order Batch #1 & #2 Closing Celebration & Thank You Modal
 (Preserved below as reference if needed in future)
 ==============================================================================
 export function ThankYouAnnouncementModal_Deactivated() {
   ...
 }
 ==============================================================================
*/
