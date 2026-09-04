import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Lock,
  LogIn,
  User,
  GraduationCap,
  Users,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
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
import loginBgImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Masuk Akun — FILKOM Merch UB" },
      { name: "description", content: "Masuk ke akun FILKOM Merch Anda dengan Google" },
    ],
  }),
});

function LoginPage() {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Admin form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username || !password) {
      toast.error("Username dan password wajib diisi!");
      setLoading(false);
      return;
    }

    try {
      const result = await authLogin({ data: { username, password } });
      if (result && result.success && result.user) {
        setUser(result.user);
        localStorage.setItem("user", JSON.stringify(result.user));
        toast.success(`Selamat datang, ${result.user.username || result.user.name}!`);
        if (result.user.role === "admin" || result.user.role === "cashier") {
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

  const handleGoogleProfileLogin = async (profile: {
    sub: string;
    email: string;
    name: string;
    picture?: string;
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
        toast.success(`Selamat datang, ${updatedUser.name || updatedUser.email}!`);
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
            sub: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          });
        } else {
          toast.error("Gagal mengambil data profil Google");
        }
      } catch (err) {
        console.error(err);
        toast.error("Google OAuth failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Login Google Dibatalkan"),
  });

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col lg:flex-row items-stretch overflow-hidden font-sans">
      {/* LEFT: Branding/Hero Section (visible on desktop) */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 text-white overflow-hidden border-r-2 border-ink">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center filter grayscale contrast-125 brightness-50"
          style={{ backgroundImage: `url(${loginBgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent z-1" />

        {/* Top Header Logos */}
        <div className="z-10 flex items-center gap-3">
          <img
            src={logo}
            alt="Logo"
            className="h-11 w-11 rounded-full object-cover border-2 border-white shadow-md"
          />
          <img
            src={logoFilkom}
            alt="Logo FILKOM"
            className="h-10 w-auto object-contain filter brightness-0 invert"
          />
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-wider uppercase drop-shadow-md">
              FILKOM MERCH
            </span>
            <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">
              Universitas Brawijaya
            </span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="z-10 space-y-5 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
            Official Merchandise Store
          </div>
          <h1 className="text-4xl xl:text-5xl font-black uppercase tracking-tight leading-tight text-white drop-shadow-lg">
            Wear Your Faculty Pride.
          </h1>
          <p className="text-sm text-white/90 leading-relaxed drop-shadow-md">
            Platform resmi pembelian pakaian, jaket, dan merchandise eksklusif Fakultas Ilmu Komputer Universitas Brawijaya.
          </p>

          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2 text-xs text-white/95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Diskon harga khusus civitas Mahasiswa FILKOM UB</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Terbuka untuk umum, alumni, dan civitas UB</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="z-10 flex items-center justify-between text-[9px] text-white/60 font-bold tracking-wider drop-shadow-sm">
          <span>&copy; 2026 FILKOM MERCH UB. ALL RIGHTS RESERVED.</span>
          <span>FILKOM UB</span>
        </div>
      </div>

      {/* RIGHT: Main Form Section */}
      <div className="w-full lg:w-[54%] bg-[#FCFAF7] flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 relative overflow-y-auto">
        <div className="mx-auto w-full max-w-md space-y-7 z-10 py-4">
          {/* Mobile Logos */}
          <div className="flex items-center justify-center gap-3 lg:hidden mb-2">
            <img
              src={logo}
              alt="Logo"
              className="h-10 w-10 rounded-full object-cover border border-ink"
            />
            <img src={logoFilkom} alt="Logo FILKOM" className="h-9 w-auto object-contain" />
          </div>

          {/* Section Header */}
          <div className="text-center sm:text-left space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-ink uppercase">
              Masuk Akun
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-normal">
              Masuk menggunakan akun Google Anda untuk mulai berbelanja merchandise FILKOM.
            </p>
          </div>

          {/* Primary Action: 1-Click Google Login */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3.5 bg-white hover:bg-neutral-50 text-ink border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[3px] hover:translate-y-[3px] font-black tracking-wider h-14 px-5 rounded-xl transition-all text-xs sm:text-sm uppercase cursor-pointer active:scale-[0.99]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{loading ? "MEMPROSES..." : "MASUK DENGAN GOOGLE (GMAIL / AKUN UB)"}</span>
            </button>

            <p className="text-[11px] text-center text-muted-foreground">
              Bisa menggunakan akun Gmail pribadi atau akun UB (<span className="font-semibold text-ink">@student.ub.ac.id</span>).
            </p>
          </div>

          {/* Educational Cards: Diskon FILKOM vs Umum */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" />
              Ketentuan Harga &amp; Status Akun
            </div>

            {/* Card 1: Mahasiswa FILKOM UB */}
            <div className="p-4 bg-emerald-50/80 border-2 border-emerald-400 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <GraduationCap className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-xs uppercase tracking-wide text-emerald-950">
                  Mahasiswa FILKOM UB
                </span>
                <span className="ml-auto text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase">
                  Harga Khusus
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                Login akun Google &amp; hubungkan <strong>NIM aktif Anda</strong> untuk menikmati potongan harga spesial civitas di seluruh katalog dan saat transaksi di kasir offline.
              </p>
            </div>

            {/* Card 2: Pembeli Umum */}
            <div className="p-4 bg-blue-50/70 border-2 border-blue-300 rounded-xl space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
                <span className="font-extrabold text-xs uppercase tracking-wide text-blue-950">
                  Pembeli Umum / Luar FILKOM
                </span>
                <span className="ml-auto text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">
                  Harga Reguler
                </span>
              </div>
              <p className="text-[11px] text-blue-900 leading-relaxed">
                Tidak perlu NIM. Semua orang dapat login dengan Gmail dan bebas berbelanja official merchandise FILKOM UB.
              </p>
            </div>
          </div>

          {/* Subtle Collapsible Admin Login Toggle */}
          <div className="pt-4 border-t border-border/80">
            <button
              type="button"
              onClick={() => setShowAdminLogin(!showAdminLogin)}
              className="w-full text-center text-xs font-bold text-muted-foreground hover:text-ink flex items-center justify-center gap-1.5 py-2 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login Pengelola / Admin Toko</span>
              {showAdminLogin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdminLogin && (
              <form onSubmit={handleAdminLogin} className="space-y-3.5 mt-3 p-4 bg-white border-2 border-ink rounded-xl shadow-sm animate-in fade-in duration-200">
                <div className="space-y-1">
                  <Label htmlFor="admin-username" className="text-[11px] font-extrabold uppercase text-ink">
                    Username Staf
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="admin-username"
                      placeholder="Username admin/kasir"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9 text-xs h-9 border-ink"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="admin-password" className="text-[11px] font-extrabold uppercase text-ink">
                    Password Staf
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 text-xs h-9 border-ink"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 bg-ink text-white font-bold text-xs uppercase hover:bg-brand-orange transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  Masuk sebagai Pengelola
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
