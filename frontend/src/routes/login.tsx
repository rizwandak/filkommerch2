import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Mail,
  Lock,
  LogIn,
  User,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  UserPlus,
  ShoppingBag,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { authLogin, authGoogleLogin, authRegister } from "@backend/server-actions";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@frontend/components/ui/card";
import { Label } from "@frontend/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";
import { useGoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { resolveImageUrl } from "@/lib/image-resolver";
import loginBgImage from "@/assets/hero.jpg";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign In — Filkom Merch UB" },
      { name: "description", content: "Access your Filkom Merch account" },
    ],
  }),
});

interface GoogleJwtPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  hd?: string;
}

function LoginPage() {
  const { setUser } = useAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Form fields for admin only
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
        if (result.user.type === "admin") {
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
    hd?: string;
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
            sub: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            hd: profile.hd,
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
    onError: () => toast.error("Google Login Cancelled"),
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
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-black/30 pointer-events-none" />

        {/* Floating Geometric Elements */}
        <div className="absolute top-[15%] left-[10%] w-24 h-24 rounded-full border border-white/10 bg-white/5 blur-[2px] animate-[spin_35s_linear_infinite] pointer-events-none" />
        <div className="absolute bottom-[25%] right-[15%] w-36 h-36 bg-brand-orange/15 rounded-full blur-3xl animate-pulse duration-[8s] pointer-events-none" />

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
        <div className="flex flex-col items-center justify-center space-y-6 z-10 text-center flex-grow py-20">
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
        </div>

        {/* Bottom copyright representation */}
        <div className="z-10 flex items-center justify-between text-[9px] text-white/50 font-bold tracking-wider drop-shadow-sm">
          <span>&copy; 2026 FILKOM MERCH UB. ALL RIGHTS RESERVED.</span>
          <span>MADE BY FILKOM UB</span>
        </div>
      </div>

      {/* RIGHT: Main Login Section */}
      <div className="w-full lg:w-[55%] bg-[#FCFAF7] flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-16 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Navigation (Mobile Logo) */}
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
        </div>

        {/* Form Body Container */}
        <div className="mx-auto w-full max-w-md space-y-8 z-10 animate-fade-in py-8">
          {/* Section Header */}
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-block bg-brand-orange/10 text-brand-orange border border-brand-orange/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1">
              Akun Google 1-Click
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-ink uppercase">
              MASUK KE TOKO
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Silakan login menggunakan akun Google Anda untuk melanjutkan ke platform belanja resmi FILKOM Merch UB.
            </p>
          </div>

          {/* Primary Action: Google Login */}
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3.5 bg-white hover:bg-neutral-50 text-ink border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-black tracking-wider h-13 px-5 rounded-xl transition-all text-xs sm:text-sm uppercase cursor-pointer"
            >
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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

            {/* Educational Info Cards */}
            <div className="space-y-3 pt-1">
              {/* Card 1: FILKOM Student Special Price */}
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-start gap-3 shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <GraduationCap className="h-5 w-5 text-emerald-800" />
                </div>
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                    Harga Khusus Mahasiswa FILKOM UB
                  </h4>
                  <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                    Gunakan email Google UB (<strong className="text-emerald-900">@student.ub.ac.id</strong>) dan verifikasi NIM saat login untuk langsung mendapatkan <strong>Harga Khusus Civitas</strong> di setiap produk!
                  </p>
                </div>
              </div>

              {/* Card 2: General Visitors Supported */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3 shadow-xs">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-brand-blue border border-blue-200">
                  <Sparkles className="h-5 w-5 text-brand-blue" />
                </div>
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-black text-brand-blue uppercase tracking-wide">
                    Umum &amp; Mahasiswa Luar FILKOM
                  </h4>
                  <p className="text-[11px] text-blue-950 leading-relaxed font-medium">
                    Semua orang dapat masuk langsung menggunakan <strong>akun Gmail biasa</strong>. Cukup klik tombol di atas tanpa perlu mengisi form pendaftaran manual yang rumit.
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle Collapsible Admin/Cashier Login */}
            <div className="pt-4 border-t border-border/80 text-center">
              {!showAdminLogin ? (
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(true)}
                  className="text-[11px] font-bold text-muted-foreground hover:text-ink transition-colors hover:underline cursor-pointer"
                >
                  🔒 Login Pengelola / Admin Toko
                </button>
              ) : (
                <div className="p-4 bg-white border-2 border-ink rounded-xl space-y-3 text-left shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-ink">
                      Login Admin &amp; Kasir
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdminLogin(false)}
                      className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="admin-username" className="text-[10px] font-black uppercase text-ink">
                        Username / Email Admin
                      </Label>
                      <Input
                        id="admin-username"
                        placeholder="admin / kasir"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-9 text-xs border-ink bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="admin-password" className="text-[10px] font-black uppercase text-ink">
                        Password
                      </Label>
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-9 text-xs border-ink bg-white"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-9 bg-ink hover:bg-brand-orange text-white text-xs font-black uppercase tracking-wider cursor-pointer"
                    >
                      {loading ? "Memproses..." : "Masuk sebagai Pengelola"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
