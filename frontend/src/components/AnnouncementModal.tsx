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
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Users,
  ShoppingBag,
  PartyPopper,
  Check,
  Info,
} from "lucide-react";
import confetti from "canvas-confetti";
import baraSmile from "@/assets/bara-smile.png";
import {
  subscribeUserToPush,
  isIosDevice,
} from "../services/pushService";
import { NotificationActivationModal } from "./NotificationActivationModal";
import { VerificationModal } from "@frontend/components/VerificationModal";
import { AccountClaimModal } from "@frontend/components/AccountClaimModal";
import { useAuth } from "@/lib/auth";
import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

interface Props {
  delayMs?: number;
  enabled?: boolean;
  activeTemplate?: "filkom_verification" | "notification" | "thank_you";
  version?: string;
}

export function AnnouncementModal(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || props.enabled === false || typeof window === "undefined") {
    return null;
  }

  return <AnnouncementModalInner {...props} />;
}

function AnnouncementModalInner({
  delayMs = 600,
  enabled = true,
  activeTemplate = "filkom_verification",
  version = "v1",
}: Props) {
  const { user, loginAsGoogle } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [activeTabNotif, setActiveTabNotif] = useState<"android" | "ios">("android");
  const [activeTabCivitas, setActiveTabCivitas] = useState<"student" | "alumni">("student");

  const animFrameRef = useRef<number | null>(null);
  const isRainingRef = useRef(false);

  // Play celebration audio for Thank You template
  const playCheersSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Confetti party sound simulation
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio playback might be prevented by autoplay policy
    }
  };

  useEffect(() => {
    if (!enabled) {
      setIsVisible(false);
      return;
    }

    if (isIosDevice()) {
      setActiveTabNotif("ios");
    }

    const dismissKey = `notif_announcement_dismissed_${activeTemplate}_${version || "v1"}`;
    const dismissed = localStorage.getItem(dismissKey);

    const timer = setTimeout(() => {
      if (!dismissed) {
        setIsVisible(true);

        if (activeTemplate === "thank_you") {
          playCheersSound();
          isRainingRef.current = true;
          try {
            const colors = ["#ff5e00", "#10b981", "#3b82f6", "#f59e0b", "#1b1b1b", "#ffffff"];
            const frame = () => {
              if (!isRainingRef.current) return;
              confetti({
                particleCount: 2,
                angle: 60,
                spread: 50,
                origin: { x: 0, y: 0.65 },
                colors,
                ticks: 120,
              });
              confetti({
                particleCount: 2,
                angle: 120,
                spread: 50,
                origin: { x: 1, y: 0.65 },
                colors,
                ticks: 120,
              });
              animFrameRef.current = requestAnimationFrame(frame);
            };
            frame();
          } catch {
            // ignore confetti error
          }
        }
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      isRainingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [delayMs, enabled, activeTemplate, version]);

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
    const dismissKey = `notif_announcement_dismissed_${activeTemplate}_${version || "v1"}`;
    localStorage.setItem(dismissKey, "true");
    setIsVisible(false);
  };

  // Google OAuth Login Action for Template 1 (Civitas / Alumni)
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoggingIn(true);
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        if (profile.email) {
          await loginAsGoogle({
            email: profile.email,
            name: profile.name || profile.given_name || "Civitas FILKOM",
          });
          toast.success(`Selamat datang, ${profile.name || "Civitas FILKOM"}!`);

          // Trigger celebratory burst
          try {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          } catch {}

          // Check whether user needs NIM verification or Alumni claim
          setTimeout(() => {
            const stored = localStorage.getItem("user");
            const parsed = stored ? JSON.parse(stored) : null;
            if (parsed && !parsed.is_filkom_verified) {
              if (activeTabCivitas === "alumni" || !profile.email.endsWith("@student.ub.ac.id")) {
                setIsClaimModalOpen(true);
              } else {
                setIsVerifyModalOpen(true);
              }
            }
          }, 400);
        } else {
          toast.error("Gagal mengambil data profil Google");
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Gagal masuk dengan Google.");
      } finally {
        setIsGoogleLoggingIn(false);
      }
    },
    onError: () => toast.error("Login dengan Google dibatalkan"),
  });

  // Direct Push Notification Activate Action for Template 2
  const handleDirectActivatePush = async () => {
    setIsActivatingPush(true);
    try {
      const res = await subscribeUserToPush();
      if (res.success || (typeof window !== "undefined" && Notification.permission === "granted")) {
        toast.success("🎉 Notifikasi web berhasil diaktifkan!");
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
    } catch {
      setIsNotifModalOpen(true);
    } finally {
      setIsActivatingPush(false);
    }
  };

  if (!enabled) return null;
  if (!isVisible && !isNotifModalOpen && !isVerifyModalOpen && !isClaimModalOpen) return null;

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
            {/* ========================================================================= */}
            {/* TEMPLATE 1: MAHASISWA & ALUMNI FILKOM UB DISCOUNT & VERIFICATION MODAL    */}
            {/* ========================================================================= */}
            {activeTemplate === "filkom_verification" && (
              <>
                {/* Header Bar */}
                <div className="bg-cream border-b-2 border-ink p-3.5 sm:p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-brand-orange text-cream text-[11px] font-black rounded-full border border-ink uppercase tracking-wider shadow-xs flex items-center gap-1.5 animate-pulse">
                      <GraduationCap className="w-3.5 h-3.5 text-cream" /> EKSKLUSIF KBMFILKOM
                    </span>
                    <span className="text-[10px] font-black text-ink uppercase tracking-wider hidden sm:inline">
                      DISKON CIVITAS &amp; ALUMNI
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
                  {/* Mascot & Headline */}
                  <div className="flex items-center gap-3.5 bg-orange-50/90 dark:bg-orange-950/40 border-2 border-brand-orange/40 p-3.5 rounded-2xl shadow-xs">
                    <img
                      src={baraSmile}
                      alt="Bara Filkom Merch"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-md animate-bounce"
                    />
                    <div className="space-y-1 min-w-0">
                      <h3 className="display text-base sm:text-lg font-black uppercase text-ink leading-tight flex items-center gap-1.5">
                        Kamu Mahasiswa / Alumni FILKOM? 🎓
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold leading-relaxed">
                        Dapatkan <strong>potongan harga khusus civitas FILKOM</strong> untuk seluruh merchandise resmi!
                      </p>
                    </div>
                  </div>

                  {/* Tab Selector: Mahasiswa / Student vs Alumni */}
                  <div className="grid grid-cols-2 gap-1.5 bg-secondary/60 p-1 rounded-xl border-2 border-ink">
                    <button
                      type="button"
                      onClick={() => setActiveTabCivitas("student")}
                      className={`py-2 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeTabCivitas === "student"
                          ? "bg-brand-orange text-cream border border-ink shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" /> Mahasiswa Aktif
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabCivitas("alumni")}
                      className={`py-2 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        activeTabCivitas === "alumni"
                          ? "bg-brand-orange text-cream border border-ink shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Khusus Alumni
                    </button>
                  </div>

                  {/* TAB 1: MAHASISWA AKTIF (@student.ub.ac.id) */}
                  {activeTabCivitas === "student" ? (
                    <div className="space-y-3">
                      <div className="bg-cream/40 dark:bg-cream/10 border-2 border-ink p-3.5 rounded-xl text-xs space-y-2">
                        <p className="font-extrabold text-ink flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-brand-orange" /> Alur Cepat Aktivasi Diskon:
                        </p>
                        <ol className="text-muted-foreground text-[11px] leading-relaxed list-decimal list-inside space-y-1 font-medium">
                          <li>
                            Klik tombol <strong>"Masuk dengan Akun Google UB"</strong> di bawah.
                          </li>
                          <li>
                            Gunakan email student Anda (<strong>@student.ub.ac.id</strong>).
                          </li>
                          <li>
                            Lakukan verifikasi <strong>NIM</strong>. Selesai! Diskon mahasiswa langsung aktif otomatis.
                          </li>
                        </ol>
                      </div>

                      {/* Status / Action Button */}
                      {user && (user as any).is_filkom_verified ? (
                        <div className="space-y-2">
                          <div className="w-full py-3 px-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl border-2 border-emerald-500/60 flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Akun kamu sudah terverifikasi Civitas FILKOM!</span>
                          </div>
                          <button
                            onClick={handleClose}
                            className="w-full py-3 px-4 bg-brand-orange text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <span>Lanjut Belanja dengan Diskon</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      ) : user ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-400 rounded-xl text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                            Kamu sudah login sebagai <strong>{(user as any).email}</strong>. Tinggal verifikasi NIM kamu untuk mengaktifkan potongan harga!
                          </div>
                          <button
                            onClick={() => {
                              setIsVerifyModalOpen(true);
                              setIsVisible(false);
                            }}
                            className="w-full py-3.5 px-4 bg-brand-orange hover:bg-orange-600 text-cream font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <ShieldCheck className="w-4 h-4" />
                            VERIFIKASI NIM MAHASISWA SEKARANG
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={() => loginWithGoogle()}
                            disabled={isGoogleLoggingIn}
                            className="w-full py-3.5 px-4 bg-white hover:bg-neutral-50 text-ink font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                              />
                            </svg>
                            <span>{isGoogleLoggingIn ? "MENYAMBUNGKAN..." : "MASUK DENGAN AKUN GOOGLE UB"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* TAB 2: KHUSUS ALUMNI (EMAIL STUDENT SUDAH NONAKTIF) */
                    <div className="space-y-3">
                      <div className="bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-600/50 p-3.5 rounded-xl text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                          <Info className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>Email Student UB Sudah Nonaktif?</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Alumni tetap berhak mendapatkan harga khusus civitas! Cukup masuk menggunakan <strong>Akun Google Pribadi (Gmail)</strong>, lalu klaim status alumni dengan memasukkan NIM lama Anda.
                        </p>
                      </div>

                      {user && (user as any).is_filkom_verified ? (
                        <div className="w-full py-3 px-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl border-2 border-emerald-500/60 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Status Alumni Kamu Sudah Terverifikasi!</span>
                        </div>
                      ) : user ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-ink/20 rounded-xl text-[11px] text-muted-foreground">
                            Terhubung sebagai: <strong>{(user as any).email}</strong>. Klik tombol di bawah untuk klaim akun alumni dengan NIM Anda.
                          </div>
                          <button
                            onClick={() => {
                              setIsClaimModalOpen(true);
                              setIsVisible(false);
                            }}
                            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            <GraduationCap className="w-4 h-4" />
                            KLAIM AKUN ALUMNI SEKARANG 🎓
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            onClick={() => loginWithGoogle()}
                            disabled={isGoogleLoggingIn}
                            className="w-full py-3.5 px-4 bg-white hover:bg-neutral-50 text-ink font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-60"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                              />
                            </svg>
                            <span>{isGoogleLoggingIn ? "MENYAMBUNGKAN..." : "MASUK DENGAN GOOGLE PRIBADI"}</span>
                          </button>

                          <button
                            onClick={() => {
                              toast.info("Silakan masuk dengan akun Google pribadi terlebih dahulu untuk mengklaim data alumni.");
                              loginWithGoogle();
                            }}
                            className="w-full py-2 text-center text-xs font-bold text-muted-foreground hover:text-brand-orange transition-colors cursor-pointer"
                          >
                            Panduan Klaim Akun Alumni &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Close link */}
                  <button
                    onClick={handleClose}
                    className="w-full py-2 text-center text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer pt-1"
                  >
                    Tutup / Lanjut Belanja Tanpa Diskon
                  </button>
                </div>

                {/* Footer Bar */}
                <div className="w-full bg-cream py-2 px-4 border-t-2 border-ink text-center text-[10px] font-black uppercase text-brand-orange tracking-widest flex items-center justify-center gap-2 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> OFFICIAL ANNOUNCEMENT — FILKOM MERCH STORE <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
              </>
            )}

            {/* ========================================================================= */}
            {/* TEMPLATE 2: PUSH NOTIFICATION ACTIVATION & PO PICKUP ANNOUNCEMENT MODAL  */}
            {/* ========================================================================= */}
            {activeTemplate === "notification" && (
              <>
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
                        onClick={() => setActiveTabNotif("android")}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          activeTabNotif === "android"
                            ? "bg-brand-orange text-cream border border-ink shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Smartphone className="w-3 h-3" /> Android / PC
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTabNotif("ios")}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          activeTabNotif === "ios"
                            ? "bg-brand-orange text-cream border border-ink shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Smartphone className="w-3 h-3" /> iPhone / iPad
                      </button>
                    </div>

                    {activeTabNotif === "android" ? (
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
                    <button
                      onClick={handleDirectActivatePush}
                      disabled={isActivatingPush}
                      className="w-full py-3.5 px-4 bg-brand-orange hover:bg-orange-600 text-cream font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Bell className="w-4 h-4 animate-bounce" />
                      {isActivatingPush ? "Sedang Mengaktifkan..." : "🔔 AKTIFKAN NOTIFIKASI SEKARANG"}
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
              </>
            )}

            {/* ========================================================================= */}
            {/* TEMPLATE 3: PRE-ORDER CLOSING & THANK YOU CELEBRATION MODAL               */}
            {/* ========================================================================= */}
            {activeTemplate === "thank_you" && (
              <>
                {/* Header Bar */}
                <div className="bg-cream border-b-2 border-ink p-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-brand-orange text-cream text-[11px] font-black rounded-full border border-ink uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                      <PartyPopper className="w-3.5 h-3.5 text-cream animate-bounce" /> PRE ORDER
                    </span>
                    <span className="text-[10px] font-black text-ink uppercase tracking-wider">
                      BATCH #1 &amp; #2
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
                <div className="p-5 sm:p-7 space-y-4 text-ink relative overflow-y-auto">
                  {/* Bara Mascot & Graphic Header */}
                  <div className="flex items-center gap-3.5 bg-orange-50/90 border-2 border-brand-orange/40 p-3.5 rounded-2xl shadow-xs">
                    <img
                      src={baraSmile}
                      alt="Bara Filkom Merch"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0 drop-shadow-md animate-bounce"
                    />
                    <div className="space-y-1 min-w-0">
                      <h3 className="display text-base sm:text-lg font-black uppercase text-ink leading-tight flex items-center gap-1.5">
                        Terima Kasih KBMFILKOM! 🎉
                      </h3>
                      <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold leading-relaxed">
                        Antusiasme luar biasa di Pre-Order Batch #1 dan #2!
                      </p>
                    </div>
                  </div>

                  {/* Key Stats Counter */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background border-2 border-ink p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3">
                      <div className="p-2 bg-brand-orange/20 border border-brand-orange rounded-lg text-brand-orange shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base sm:text-lg font-black text-ink">210+</div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase">Pembeli PO</div>
                      </div>
                    </div>

                    <div className="bg-background border-2 border-ink p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 border border-emerald-500 rounded-lg text-emerald-700 shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base sm:text-lg font-black text-ink">500+</div>
                        <div className="text-[9px] font-bold text-muted-foreground uppercase">Items Dibeli</div>
                      </div>
                    </div>
                  </div>

                  {/* Main Notice Paragraph */}
                  <div className="text-xs leading-relaxed text-ink/90 font-medium space-y-2 bg-cream/30 p-3.5 border border-ink/20 rounded-xl">
                    <p>
                      Kami mengucapkan terima kasih sebesar-besarnya atas antusiasme seluruh KBMFILKOM di Pre-Order Batch #1 dan #2.
                    </p>
                    <p>
                      Untuk informasi ketersediaan barang untuk pengambilan di FILKOM Merch Store dan pengantaran, akan kami sampaikan melalui web{" "}
                      <a href="https://filkommerch.com" target="_blank" rel="noreferrer" className="text-brand-orange font-extrabold underline">
                        filkommerch.com
                      </a>{" "}
                      dan Official Instagram{" "}
                      <a href="https://instagram.com/filkommerchub" target="_blank" rel="noreferrer" className="text-brand-orange font-extrabold underline">
                        @filkommerchub
                      </a>
                      , jadi harap dicek secara berkala.
                    </p>
                    <p className="font-extrabold text-ink pt-0.5">Sampai jumpa. 🔥</p>
                  </div>

                  {/* Action Close Button */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3.5 px-4 bg-ink hover:bg-brand-orange text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5 text-brand-orange" /> SAYA MENGERTI
                  </button>
                </div>

                {/* Celebratory Bottom Footer Bar */}
                <div className="w-full bg-cream py-2 px-4 border-t-2 border-ink text-center text-[10px] font-black uppercase text-brand-orange tracking-widest flex items-center justify-center gap-2 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" /> OFFICIAL ANNOUNCEMENT — FILKOM MERCH STORE <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Verification Modal for NIM verification */}
      <VerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onSuccess={() => {
          setIsVerifyModalOpen(false);
          setIsVisible(false);
        }}
      />

      {/* Alumni Account Claim Modal */}
      <AccountClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onSuccess={() => {
          setIsClaimModalOpen(false);
          setIsVisible(false);
        }}
      />

      {/* Notification Activation Detailed Modal */}
      <NotificationActivationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />
    </>
  );
}
