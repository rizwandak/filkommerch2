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
import { useAuth, type BuyerUser } from "@/lib/auth";
import { authLogin, authGoogleLogin } from "@backend/server-actions";
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
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import loginBgVideo from "@/assets/login-bg-video.mp4";
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

interface LocalAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
}

interface GoogleJwtPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  hd?: string;
}

function LoginPage() {
  const { setUser, loginAsGoogle, upsertBuyer } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Form fields
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Local accounts state
  const [accounts, setAccounts] = useState<LocalAccount[]>([]);

  // Load registered buyers from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("registeredBuyers");
      if (saved) {
        setAccounts(JSON.parse(saved));
      } else {
        // Seed a demo buyer account
        const demoAccount: LocalAccount = {
          id: "buyer_demo",
          name: "Brawijaya Buyer",
          username: "buyer",
          email: "buyer@student.ub.ac.id",
          password: "password123",
        };
        localStorage.setItem("registeredBuyers", JSON.stringify([demoAccount]));
        setAccounts([demoAccount]);
      }
    } catch (e) {
      console.error("Failed to load local accounts", e);
    }
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name || !username || !email || !password) {
      toast.error("Semua field wajib diisi!");
      setLoading(false);
      return;
    }

    if (!email.endsWith("@student.ub.ac.id") && !email.includes("@")) {
      toast.error("Gunakan email UB atau email valid!");
      setLoading(false);
      return;
    }

    // Check if username or email already exists
    const exists = accounts.find((acc) => acc.username === username || acc.email === email);
    if (exists) {
      toast.error("Username atau Email sudah terdaftar!");
      setLoading(false);
      return;
    }

    const newAccount: LocalAccount = {
      id: "buyer_" + Math.random().toString(36).substr(2, 9),
      name,
      username,
      email,
      password,
    };

    const updatedAccounts = [...accounts, newAccount];
    localStorage.setItem("registeredBuyers", JSON.stringify(updatedAccounts));
    setAccounts(updatedAccounts);

    toast.success("Registrasi berhasil! Silakan login.");
    setMode("login");
    setPassword("");
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!username || !password) {
      toast.error("Username/Email dan password wajib diisi!");
      setLoading(false);
      return;
    }

    try {
      // 1. Attempt login to the backend database
      const result = await authLogin({ data: { username, password } });
      if (result && result.success && result.user) {
        setUser(result.user);
        localStorage.setItem("user", JSON.stringify(result.user));
        toast.success(`Selamat datang kembali, ${result.user.type === "admin" ? result.user.username : result.user.name}!`);
        
        // Redirect to homepage for all users. Users with admin/cashier role can navigate to admin dashboard via navbar avatar dropdown.
        window.location.href = "/";
        setLoading(false);
        return;
      }

      // 2. Fallback to local accounts if backend returned fail or offline
      const account = accounts.find(
        (acc) => (acc.username === username || acc.email === username) && acc.password === password
      );
      if (account) {
        const fallbackUser: BuyerUser = {
          type: "buyer",
          id: account.id,
          email: account.email,
          name: account.name,
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(account.name)}`,
        };
        setUser(fallbackUser);
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        toast.success(`Selamat datang kembali (Offline), ${account.name}!`);
        window.location.href = "/";
      } else {
        toast.error(result?.error || "Username atau password salah!");
      }
    } catch (error: any) {
      // 3. Fallback on network/fetch error
      const account = accounts.find(
        (acc) => (acc.username === username || acc.email === username) && acc.password === password
      );
      if (account) {
        const fallbackUser: BuyerUser = {
          type: "buyer",
          id: account.id,
          email: account.email,
          name: account.name,
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(account.name)}`,
        };
        setUser(fallbackUser);
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        toast.success(`Selamat datang kembali (Offline), ${account.name}!`);
        window.location.href = "/";
      } else {
        toast.error(error.message || "Gagal login.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    try {
      const token = credentialResponse.credential;
      if (!token) throw new Error("No credential returned");

      const decoded = jwtDecode<GoogleJwtPayload>(token);
      const isUB = decoded.hd === "student.ub.ac.id" || decoded.email.endsWith("@student.ub.ac.id");
      const organization = isUB ? "FILKOM UB" : "Umum";

      // Call backend google auth route
      const result = await authGoogleLogin({ data: { email: decoded.email, name: decoded.name } });
      if (result && result.success && result.user) {
        const updatedUser = {
          ...result.user,
          is_google: true,
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        const roleText = result.user.type === "admin" ? result.user.role.toUpperCase() : "BUYER";
        toast.success(`Welcome, ${decoded.name}!`, {
          description: `Masuk sebagai ${roleText}`,
        });
        window.location.href = "/";
      } else {
        // Fallback for buyer
        const fallbackUser: BuyerUser = {
          type: "buyer",
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          is_google: true,
        };
        setUser(fallbackUser);
        localStorage.setItem("user", JSON.stringify(fallbackUser));
        upsertBuyer(fallbackUser);

        toast.success(`Welcome, ${decoded.name}! (Offline)`, {
          description: `Masuk sebagai civitas ${organization}`,
        });
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Google login failed", error);
      toast.error("Google login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error("Google login failed");
  };

  return (
    <div className="min-h-screen bg-white text-ink flex flex-col lg:flex-row items-stretch overflow-hidden font-sans">
      {/* LEFT: Branding/Hero Section (visible on desktop) */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 text-white overflow-hidden border-r-2 border-ink">
        {/* Background Video (Local Asset) with Zoom Effect and fallbacks */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none transition-transform duration-[15000ms] ease-out hover:scale-110"
          poster={loginBgImage}
        >
          <source src={loginBgVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        {/* Gradient Overlays for High Contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/85 via-indigo-900/80 to-brand-blue/70 mix-blend-multiply pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-transparent to-ink/10 pointer-events-none" />

        {/* Floating Animated Geometric Objects */}
        <div className="absolute top-[15%] left-[10%] w-24 h-24 rounded-full border border-white/10 bg-white/5 blur-[2px] animate-[spin_35s_linear_infinite] pointer-events-none" />
        <div className="absolute bottom-[25%] right-[15%] w-36 h-36 bg-brand-orange/15 rounded-full blur-3xl animate-pulse duration-[8s] pointer-events-none" />
        <div className="absolute top-[45%] right-[8%] w-16 h-16 bg-brand-blue/20 rounded-xl border border-white/10 rotate-12 animate-[bounce_10s_ease-in-out_infinite] pointer-events-none" />
        <div className="absolute bottom-[15%] left-[8%] w-20 h-20 bg-indigo-500/10 rounded-full blur-md animate-[pulse_6s_ease-in-out_infinite] pointer-events-none" />

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

      {/* RIGHT: Form Section */}
      <div className="w-full lg:w-[55%] bg-[#FCFAF7] flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-16 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Navigation (Mobile Logo + Back button) */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          {/* Mobile logo */}
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

          {/* Back Link */}
          <a
            href="/"
            className="text-[10px] font-extrabold tracking-widest text-muted-foreground hover:text-ink transition-colors flex items-center gap-1.5 ml-auto uppercase"
          >
            &larr; Kembali ke Beranda
          </a>
        </div>

        {/* Form Body Container */}
        <div className="mx-auto w-full max-w-md space-y-8 z-10 animate-fade-in py-8">
          {/* Section Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink uppercase">
              {mode === "login" && "Sign In"}
              {mode === "register" && "Create Account"}
            </h2>
            <p className="text-xs text-muted-foreground leading-normal">
              {mode === "login" &&
                "Masukkan akun Anda untuk melanjutkan belanja merchandise resmi."}
              {mode === "register" &&
                "Daftarkan akun pembeli baru untuk menikmati diskon khusus civitas."}
            </p>
          </div>

          {/* Mode Forms */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="username"
                  className="text-xs font-extrabold uppercase tracking-wider text-ink"
                >
                  Username or Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Masukkan username atau email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10.5 border-2 border-ink focus-visible:ring-0 focus-visible:border-brand-orange h-11 text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-extrabold uppercase tracking-wider text-ink"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10.5 border-2 border-ink focus-visible:ring-0 focus-visible:border-brand-orange h-11 text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-cream hover:bg-brand-orange hover:text-white border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold tracking-wider h-11 transition-all text-xs uppercase"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? "MEMPROSES..." : "MASUK KE AKUN"}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted-foreground/20"></div>
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="px-3.5 bg-[#FCFAF7] text-muted-foreground font-black tracking-widest">
                    OR
                  </span>
                </div>
              </div>

              {/* Google login option styled premium with education banner */}
              <div className="space-y-4">
                <div className="p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-2xl flex items-start gap-3 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                    <GraduationCap className="h-5 w-5 text-brand-blue" />
                  </div>
                  <div className="space-y-1 text-left">
                    <h4 className="text-[11px] font-extrabold text-brand-blue uppercase tracking-wider">
                      Mahasiswa FILKOM UB?
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold">
                      Login dengan <span className="font-extrabold text-brand-blue">akun Google UB Anda (@student.ub.ac.id)</span> & hubungkan NIM di profil untuk mengaktifkan diskon khusus civitas!
                    </p>
                  </div>
                </div>

                <div className="flex justify-center w-full py-1">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap
                    shape="pill"
                    theme="outline"
                    size="large"
                    text="signin_with"
                  />
                </div>
              </div>

              <div className="text-center pt-4 text-xs font-semibold">
                <span className="text-muted-foreground">Belum punya akun? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setUsername("");
                    setPassword("");
                  }}
                  className="font-bold text-brand-orange hover:underline inline-flex items-center gap-1"
                >
                  Daftar Sekarang &rarr;
                </button>
              </div>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-name"
                  className="text-xs font-extrabold uppercase tracking-wider text-ink"
                >
                  Nama Lengkap
                </Label>
                <div className="relative">
                  <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-name"
                    placeholder="Contoh: Muhammad Rafli"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10.5 border-2 border-ink focus-visible:ring-0 focus-visible:border-brand-orange h-11 text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-username"
                  className="text-xs font-extrabold uppercase tracking-wider text-ink"
                >
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-username"
                    placeholder="Contoh: raflimand"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10.5 border-2 border-ink focus-visible:ring-0 focus-visible:border-brand-orange h-11 text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-email"
                  className="text-xs font-extrabold uppercase tracking-wider text-ink"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="rafli@student.ub.ac.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10.5 border-2 border-ink focus-visible:ring-0 focus-visible:border-brand-orange h-11 text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-password"
                  className="text-xs font-extrabold uppercase tracking-wider text-ink"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10.5 border-2 border-ink focus-visible:ring-0 focus-visible:border-brand-orange h-11 text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-cream hover:bg-brand-orange hover:text-white border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold tracking-wider h-11 transition-all text-xs uppercase"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {loading ? "MEMPROSES..." : "DAFTAR SEKARANG"}
              </Button>

              <div className="text-center pt-3 text-xs font-semibold">
                <span className="text-muted-foreground">Sudah punya akun? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setUsername("");
                    setPassword("");
                  }}
                  className="font-bold text-brand-orange hover:underline"
                >
                  Login di sini
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
