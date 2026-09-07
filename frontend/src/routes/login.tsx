import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Lock,
  LogIn,
  User,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  KeyRound,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { authLogin, authGoogleLogin } from "@backend/server-actions";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";
import { useGoogleLogin } from "@react-oauth/google";
import { resolveImageUrl } from "@/lib/image-resolver";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign In — Filkom Merch UB" },
      { name: "description", content: "Masuk ke akun Filkom Merch dengan Akun Google UB" },
    ],
  }),
});

function LoginPage() {
  const { setUser } = useAuth();

  // Admin/Staff login toggle & states
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle Admin / Cashier manual login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username || !password) {
      toast.error("Username/Email dan password wajib diisi!");
      setLoading(false);
      return;
    }

    try {
      const result = await authLogin({ data: { username, password } });
      if (result && result.success && result.user) {
        setUser(result.user);
        localStorage.setItem("user", JSON.stringify(result.user));
        toast.success(`Selamat datang, ${result.user.username || result.user.name}!`);
        if (result.user.role === "admin") {
          window.location.href = "/admin";
        } else if (result.user.role === "cashier") {
          window.location.href = "/pos";
        } else {
          window.location.href = "/";
        }
        return;
      }

      toast.error(result?.error || "Username atau password salah!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Gagal terhubung ke server login.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Google OAuth Profile Login
  const handleGoogleProfileLogin = async (profile: {
    email: string;
    name: string;
  }) => {
    setLoading(true);
    try {
      const result = await authGoogleLogin({ data: { email: profile.email, name: profile.name } });
      if (result && result.success && result.user) {
        const updatedUser = {
          ...result.user,
          is_google: true,
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        toast.success(`Selamat datang, ${updatedUser.name || updatedUser.username}!`);
        window.location.href = "/";
        return;
      }

      toast.error(result?.error || "Gagal login dengan akun Google.");
    } catch (error: any) {
      console.error("Google login failed", error);
      toast.error(error.message || "Gagal login dengan Google.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await res.json();
        if (profile.email) {
          await handleGoogleProfileLogin({
            email: profile.email,
            name: profile.name,
          });
        } else {
          toast.error("Gagal mengambil data profil Google");
        }
      } catch (err) {
        console.error(err);
        toast.error("Google OAuth gagal diproses");
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Login dengan Google dibatalkan"),
  });

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col lg:flex-row items-stretch overflow-hidden font-sans">
      {/* LEFT: Branding/Hero Section (visible on desktop) */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 text-white overflow-hidden border-r-2 border-ink">
        {/* Background Image */}
        <img
          src={resolveImageUrl("/uploads/file-1783266825899-609321798.jpeg")}
          alt="FILKOM Merch Login Background"
          className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none transition-transform duration-[15000ms] ease-out hover:scale-110"
        />
        {/* Natural Photo Contrast Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/40 to-black/30 pointer-events-none" />

        {/* Floating Animated Geometric Objects */}
        <div className="absolute top-[15%] left-[10%] w-24 h-24 rounded-full border border-white/10 bg-white/5 blur-[2px] animate-[spin_35s_linear_infinite] pointer-events-none" />
        <div className="absolute bottom-[25%] right-[15%] w-36 h-36 bg-brand-orange/15 rounded-full blur-3xl animate-pulse duration-[8s] pointer-events-none" />
        <div className="absolute top-[45%] right-[8%] w-16 h-16 bg-brand-blue/20 rounded-xl border border-white/10 rotate-12 animate-[bounce_10s_ease-in-out_infinite] pointer-events-none" />

        {/* Top brand header */}
        <div className="flex items-center gap-3.5 z-10">
          <img
            src={logo}
            alt="Filkom Merch UB"
            className="h-10 w-10 rounded-full object-cover border border-white/30 shadow-lg"
          />
          <img
            src={logoFilkom}
            alt="Logo FILKOM UB"
            className="h-9 w-9 object-contain filter drop-shadow"
          />
          <span className="text-[10px] font-black tracking-[0.3em] uppercase drop-shadow-sm">
            FILKOM MERCH UB
          </span>
        </div>

        {/* Slogan and Brand representation */}
        <div className="flex flex-col items-center justify-center space-y-6 z-10 text-center flex-grow py-16">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl relative transition-all hover:scale-105 duration-300">
            <ShoppingBag className="h-11 w-11 text-white animate-pulse" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-6 w-6 text-brand-orange animate-bounce" />
          </div>
          <div className="space-y-3">
            <h2 className="display text-4xl font-black tracking-tight uppercase drop-shadow-md">
              FILKOM MERCH
            </h2>
            <p className="text-[10px] font-bold tracking-[0.2em] text-blue-200 uppercase drop-shadow">
              Official Store Merchandise FILKOM UB
            </p>
          </div>
          <p className="text-xs font-semibold text-white/80 max-w-sm leading-relaxed drop-shadow">
            Temukan koleksi apparel, aksesoris, dan merchandise eksklusif resmi Fakultas Ilmu
            Komputer Universitas Brawijaya.
          </p>

          <div className="pt-4 flex items-center gap-2 text-[11px] font-bold text-emerald-300 bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-500/30 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Single Sign-On Terintegrasi Google UB</span>
          </div>
        </div>

        {/* Bottom copyright representation */}
        <div className="z-10 flex items-center justify-between text-[9px] text-white/50 font-bold tracking-wider drop-shadow-sm">
          <span>&copy; 2026 FILKOM MERCH UB. ALL RIGHTS RESERVED.</span>
          <span>MADE BY FILKOM UB</span>
        </div>
      </div>

      {/* RIGHT: Login Section */}
      <div className="w-full lg:w-[55%] bg-[#FCFAF7] flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 relative overflow-y-auto">
        {/* Subtle decorative glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Navigation */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2 lg:hidden">
            <img
              src={logo}
              alt="Logo"
              className="h-8 w-8 rounded-full object-cover border border-ink"
            />
            <img src={logoFilkom} alt="Logo FILKOM" className="h-7 w-7 object-contain" />
            <span className="font-extrabold text-xs uppercase tracking-wider text-ink">
              FILKOM MERCH
            </span>
          </div>

          <a
            href="/"
            className="text-[10px] font-extrabold tracking-widest text-muted-foreground hover:text-ink transition-colors flex items-center gap-1.5 ml-auto uppercase"
          >
            &larr; Kembali ke Beranda
          </a>
        </div>

        {/* Form Body Container */}
        <div className="mx-auto w-full max-w-md space-y-6 z-10 animate-fade-in pt-10 sm:pt-4">
          {/* Header Title */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20 text-[10px] font-extrabold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5" />
              Portal Masuk Civitas
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink uppercase">
              MASUK KE FILKOM MERCH
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Login langsung dengan <strong className="text-ink">Akun Google UB (@student.ub.ac.id)</strong> untuk mengaktifkan diskon harga civitas dan menyimpan riwayat belanja Anda.
            </p>
          </div>

          {/* MAIN HERO ACTION: GOOGLE LOGIN BUTTON */}
          <div className="bg-white border-2 border-ink rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5 text-brand-blue" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-blue">
                  Khusus Mahasiswa & Civitas UB
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium">
                  1-Klik instan tanpa perlu registrasi manual atau buat password baru.
                </p>
              </div>
            </div>

            {/* Maximized Google Login Button */}
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3.5 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-ink border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-extrabold tracking-wider h-14 px-5 rounded-xl transition-all text-xs sm:text-sm uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <svg className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
              <div className="flex flex-col items-start leading-tight">
                <span className="font-black tracking-wide text-ink text-xs sm:text-sm">
                  {loading ? "MENYAMBUNGKAN..." : "MASUK DENGAN AKUN GOOGLE UB"}
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold lowercase tracking-normal">
                  @student.ub.ac.id
                </span>
              </div>
            </button>
          </div>

          {/* Benefits Feature List */}
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <div className="flex items-start gap-3 p-3 bg-brand-blue/5 border border-brand-blue/15 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-bold text-ink">Harga Khusus Civitas FILKOM</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Otomatis terhubung dengan NIM & identitas mahasiswa untuk menikmati harga diskon khusus.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-bold text-ink">Riwayat Pesanan & Klaim Tersimpan</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Pesanan pre-order batch sebelumnya otomatis tersinkronisasi berdasarkan email Google Anda.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-xs font-bold text-ink">100% Aman & Terverifikasi PDDIKTI</p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Data NIM dan Nama langsung diverifikasi ke pangkalan data resmi tanpa risiko salah ketik.
                </p>
              </div>
            </div>
          </div>

          {/* ACCORDION / TOGGLE: KHUSUS PENGELOLA / ADMIN / KASIR POS */}
          <div className="pt-2 border-t border-muted-foreground/20">
            <button
              type="button"
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-100/70 border border-transparent hover:border-neutral-200 transition-all text-left text-xs font-bold text-muted-foreground hover:text-ink cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                <span>Login Khusus Pengelola / Admin / Kasir POS</span>
              </div>
              {showAdminLogin ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdminLogin && (
              <form
                onSubmit={handleAdminLogin}
                className="mt-3 p-4 bg-white border-2 border-neutral-300 rounded-xl space-y-3.5 shadow-sm animate-fade-in"
              >
                <div className="space-y-1">
                  <Label
                    htmlFor="username"
                    className="text-[11px] font-bold uppercase tracking-wider text-ink"
                  >
                    Username atau Email Petugas
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="Username petugas (adminfm / kasirfm)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      className="pl-9 border-neutral-300 focus-visible:ring-0 focus-visible:border-brand-orange h-10 text-xs bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="password"
                    className="text-[11px] font-bold uppercase tracking-wider text-ink"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="pl-9 border-neutral-300 focus-visible:ring-0 focus-visible:border-brand-orange h-10 text-xs bg-white"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-ink text-white hover:bg-neutral-800 font-bold tracking-wider h-10 transition-all text-xs uppercase"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  {loading ? "MEMPROSES..." : "MASUK SEBAGAI PENGELOLA"}
                </Button>

                <p className="text-[10px] text-muted-foreground text-center font-medium">
                  *Form ini hanya untuk petugas BEM & kasir POS resmi.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
