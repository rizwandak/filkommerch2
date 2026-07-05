import { createFileRoute, Link, useNavigate   } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ShoppingBag,
  ArrowRight,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Check,
  User,
} from "lucide-react";
import { getStoreSettings } from "@backend/server-actions";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";

export const Route = createFileRoute("/faq")({
  loader: async () => {
    const settingsRes = await getStoreSettings();
    return {
      settings: settingsRes.settings || null,
    };
  },
  head: () => ({
    meta: [
      { title: "FAQ & Bantuan — FILKOM Merch UB" },
      { name: "description", content: "Pusat bantuan mahasiswa FILKOM Merch UB. Pertanyaan seputar pemesanan, verifikasi, pre-order, dan pengambilan." },
    ],
  }),
  component: FAQPage,
});

const NAV = [
  { label: "BERANDA", href: "/", isScroll: true, target: "top" },
  { label: "PRODUK", href: "/products" },
  { label: "PRE-ORDER", href: "/pre-order" },
  { label: "TENTANG KAMI", href: "/#about", isScroll: true, target: "about" },
  { label: "FAQ", href: "/faq" },
];

type CartItem = {
  id: string;
  name: string;
  price: string;
  img: string;
  qty: number;
  product_id?: number;
  variant_id?: number;
  size?: string;
  color?: string;
};

function FAQPage() {
  const { settings } = Route.useLoaderData();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});

  const [pathname, setPathname] = useState("");
  useEffect(() => setPathname(window.location.pathname), []);
  const search = location.search.originalString || "";

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("indexCart");
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch (e) {}
    setCartLoaded(true);
  }, []);

  // Sync cart to localStorage
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem("indexCart", JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  // Layout marquee
  const layout = useMemo(() => {
    const defaults = {
      marqueeText: "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN",
      faqQ1: "Apakah produk ini resmi (official) dari FILKOM?",
      faqA1: "Ya, Filkom Merchandise adalah toko merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya yang bekerjasama dengan pihak fakultas dan BEM FILKOM UB.",
      faqQ2: "Bagaimana cara mengambil pesanan saya?",
      faqA2: "Anda dapat memilih metode pengambilan 'Pickup di Kampus' saat checkout. Tim kami akan bersiap di Gazebo FILKOM UB pada jadwal pengambilan yang diinfokan via WhatsApp.",
      faqQ3: "Berapa lama estimasi pengerjaan barang Pre-Order?",
      faqA3: "Proses produksi barang pre-order biasanya memakan waktu 14 hingga 21 hari kerja setelah sesi pemesanan ditutup, tergantung tingkat kerumitan desain dan antrean vendor.",
      faqQ4: "Apakah saya bisa menukar ukuran pakaian jika tidak pas?",
      faqA4: "Penukaran ukuran diperbolehkan maksimal 2 hari setelah barang diterima, dengan syarat tag belum dilepas, belum dicuci, dan stok ukuran pengganti masih tersedia."
    };

    if (!settings?.homepage_layout) return defaults;
    try {
      const parsed = JSON.parse(settings.homepage_layout);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  }, [settings]);

  // Comprehensive FAQ list
  const faqs = useMemo(() => [
    {
      q: layout.faqQ1,
      a: layout.faqA1,
      cat: "UMUM"
    },
    {
      q: layout.faqQ2,
      a: layout.faqA2,
      cat: "PENGIRIMAN & PICKUP"
    },
    {
      q: layout.faqQ3,
      a: layout.faqA3,
      cat: "PRE-ORDER"
    },
    {
      q: layout.faqQ4,
      a: layout.faqA4,
      cat: "PENGEMBALIAN & UKURAN"
    },
    {
      q: "Bagaimana cara memverifikasi status mahasiswa FILKOM saya?",
      a: "Anda dapat melakukan verifikasi di menu Akun -> 'Verifikasi FILKOM' dengan mengisi data NIM Anda atau masuk via Google OAuth menggunakan email student UB (@student.ub.ac.id). Setelah terverifikasi, Anda otomatis mendapatkan potongan harga civitas sebesar 5%.",
      cat: "AKUN & CIVITAS"
    },
    {
      q: "Apa saja metode pembayaran yang didukung?",
      a: "Kami menggunakan Midtrans Payment Gateway, sehingga mendukung pembayaran otomatis via QRIS (Gopay, ShopeePay, Dana, LinkAja, OVO), Transfer Bank virtual account (BCA, Mandiri, BNI, BRI), serta kartu debit/kredit.",
      cat: "PEMBAYARAN"
    },
    {
      q: "Apakah pesanan bisa dikirim ke luar kota Malang?",
      a: "Bisa. Kami bekerjasama dengan ekspedisi JNE, J&T, dan Sicepat untuk pengiriman ke seluruh wilayah Indonesia. Biaya kirim akan dihitung secara otomatis saat Anda memasukkan alamat tujuan pengiriman di halaman checkout.",
      cat: "PENGIRIMAN & PICKUP"
    }
  ], [layout]);

  // Filter FAQs based on query
  const filteredFaqs = useMemo(() => {
    if (!query.trim()) return faqs;
    const q = query.toLowerCase();
    return faqs.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q)
    );
  }, [query, faqs]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((c) =>
      c.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart((c) => c.filter((i) => i.id !== id));
  }, []);

  const handleCheckout = () => {
    if (!cart.length) {
      toast.error("Your cart is empty");
      return;
    }

    if (!user) {
      toast.error("Please sign in to checkout");
      navigate({ to: "/login" });
      return;
    }

    const checkoutCart = cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: parsePrice(item.price),
      quantity: item.qty,
      product_id: item.product_id,
      variant_id: item.variant_id,
      size: item.size,
      color: item.color,
      category: "TEE",
    }));

    localStorage.setItem("cart", JSON.stringify(checkoutCart));
    navigate({ to: "/checkout" });
    setCartOpen(false);
  };

  function parsePrice(p: string) {
    return Number(p.replace(/[^0-9]/g, ""));
  }

  function formatRp(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand-orange selection:text-cream">
      {/* Announcement marquee */}
      <div className="bg-ink text-cream py-2.5 overflow-hidden border-b border-ink">
        <div className="flex marquee-track whitespace-nowrap text-[10px] sm:text-xs tracking-[0.2em] font-bold">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-10 px-5">
              {layout.marqueeText.split("|").map((t: string) => (
                <span key={t} className="flex items-center gap-10">
                  {t.trim().toUpperCase()}
                  <span className="text-brand-orange">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b-2 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-10 flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-90">
            <img src={logo} alt="" className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover ring-2 ring-ink shadow-sm" />
            <img src={logoFilkom} alt="" className="h-8 w-8 sm:h-11 sm:w-11 object-contain" />
            <div className="leading-tight hidden sm:block">
              <div className="display text-lg text-ink flex items-center gap-1.5 font-extrabold uppercase">
                Filkom Merch
                <span className="text-[8px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">OFFICIAL</span>
              </div>
              <div className="text-[9px] tracking-[0.32em] text-muted-foreground font-black">UNIVERSITAS BRAWIJAYA</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.href as any}
                className={`text-[11px] font-bold tracking-[0.2em] transition-colors uppercase ${
                  pathname === n.href ? "text-brand-orange border-b-2 border-brand-orange" : "text-ink hover:text-brand-orange"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4 text-ink">
            <HackerModeToggle />
              <button aria-label="Search" onClick={() => setSearchOpen((v) => !v)} className="hover:text-brand-orange">
              <Search className="w-5 h-5" />
            </button>
            <div className="relative">
              <button aria-label="Account" onClick={() => setUserMenuOpen((v) => !v)} className="hover:text-brand-orange">
                <User className="w-5 h-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 min-w-[240px] w-max max-w-[320px] bg-background border-2 border-ink rounded-lg shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] z-50 animate-scale-in">
                  {user ? (
                    <div className="p-3 border-b border-border text-xs space-y-1.5">
                      <p className="font-bold">{user.name}</p>
                      <button onClick={logout} className="w-full text-left text-brand-orange font-bold mt-2">Logout</button>
                    </div>
                  ) : (
                    <Link to="/login" className="block px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary">Sign In</Link>
                  )}
                </div>
              )}
            </div>
            <button aria-label="Cart" className="relative hover:text-brand-orange" onClick={() => setCartOpen(true)}>
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-brand-orange text-cream text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
            </button>
            <button aria-label="Menu" className="lg:hidden" onClick={() => setMenuOpen(true)}><Menu className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      {/* Hero FAQ Section */}
      <section className="bg-cream py-16 sm:py-24 border-b-2 border-ink text-center">
        <div className="max-w-2xl mx-auto px-5 space-y-4 animate-slide-up">
          <span className="inline-block bg-ink text-cream font-mono font-extrabold text-[9px] tracking-widest px-3 py-1 rounded uppercase">
            FAQ & BANTUAN
          </span>
          <h1 className="display text-4xl sm:text-6xl text-ink font-bold uppercase leading-none">
            Pusat Bantuan.
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed font-medium">
            Temukan jawaban instan untuk pertanyaan umum Anda atau hubungi admin support kami.
          </p>

          <div className="flex border-2 border-ink rounded px-3 py-2 bg-white max-w-md mx-auto items-center gap-2 shadow-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari FAQ / Masalah Anda…"
              className="bg-transparent outline-none text-xs w-full text-ink font-medium"
            />
          </div>
        </div>
      </section>

      {/* Main FAQ list & Support Contacts Grid */}
      <section className="max-w-[1200px] mx-auto px-5 py-16 sm:py-24 grid lg:grid-cols-12 gap-12">
        
        {/* Accordions (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="display text-xl sm:text-2xl text-ink font-bold uppercase border-b-2 border-ink pb-2">
            Frequently Asked Qs ({filteredFaqs.length})
          </h2>

          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => (
              <div key={idx} className="border-2 border-ink bg-cream rounded p-4 shadow-sm">
                <button
                  onClick={() => setFaqOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  className="w-full flex justify-between items-center text-left text-sm sm:text-base font-bold text-ink hover:text-brand-orange transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  <Plus className={`w-4 h-4 shrink-0 transition-transform duration-300 ${faqOpen[idx] ? "rotate-45 text-brand-orange" : ""}`} />
                </button>
                {faqOpen[idx] && (
                  <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-3 border-t border-ink/10 mt-3 font-medium">
                    <span className="inline-block bg-ink text-cream text-[8px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider mb-2">{faq.cat}</span>
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}

            {filteredFaqs.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-55" />
                <p className="font-bold">Pertanyaan tidak ditemukan.</p>
                <p className="text-xs mt-1">Coba gunakan kata kunci lain atau chat admin langsung di kanan.</p>
              </div>
            )}
          </div>
        </div>

        {/* Support Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="border-2 border-ink bg-ink text-cream p-6 rounded-lg shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-4">
            <h3 className="display text-lg font-bold text-cream flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-orange" /> Chat Admin
            </h3>
            <p className="text-[11px] text-cream/70 leading-relaxed font-medium">
              Pertanyaan Anda belum terjawab? Silakan hubungi admin kami melalui WhatsApp di bawah ini:
            </p>

            <div className="space-y-3 pt-2">
              {/* Admin 1 */}
              <a
                href="https://wa.me/6282235526105?text=Halo%20Admin%20Aliya,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 bg-cream text-ink hover:bg-brand-orange hover:text-cream rounded-md border border-ink font-bold transition-all duration-300"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold">Admin Aliya</div>
                    <div className="text-[9px] opacity-60 font-semibold uppercase tracking-wider">Tanya Produk & Preorder</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </a>

              {/* Admin 2 */}
              <a
                href="https://wa.me/6282287190402?text=Halo%20Admin%20Puty,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 bg-cream text-ink hover:bg-brand-orange hover:text-cream rounded-md border border-ink font-bold transition-all duration-300"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold">Admin Puty</div>
                    <div className="text-[9px] opacity-60 font-semibold uppercase tracking-wider">Keluhan & Custom Size</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            <div className="text-[10px] opacity-50 font-mono text-center pt-2">
              Jam Operasional: 09:00 - 17:00 WIB
            </div>
          </div>
        </div>

      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-10 flex flex-col md:flex-row justify-between gap-4 text-xs text-muted-foreground">
          <div>© 2026 Filkom Merch UB · Official student merchandise.</div>
          <div>Integrated with Midtrans Payment.</div>
        </div>
      </footer>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in">
          <div className="hidden sm:block flex-1 bg-ink/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <aside className="w-full sm:max-w-md bg-background text-foreground flex flex-col shadow-2xl border-l border-ink">
            <div className="flex items-center justify-between h-20 px-6 border-b border-border">
              <div className="display text-2xl text-ink font-bold">Your Bag</div>
              <button onClick={() => setCartOpen(false)}><X className="w-5 h-5 text-ink" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.map((i) => (
                <div key={i.id} className="py-4 flex gap-4 border-b border-border">
                  <img src={i.img} alt="" className="w-16 h-20 object-cover rounded border" />
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <span className="font-bold text-xs">{i.name}</span>
                      <button onClick={() => removeItem(i.id)}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-brand-orange" /></button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black">{i.price}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(i.id, -1)} className="p-1 border rounded"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold">{i.qty}</span>
                        <button onClick={() => updateQty(i.id, 1)} className="p-1 border rounded"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t-2 border-ink px-6 py-5 bg-cream">
                <div className="flex justify-between text-sm mb-4 font-bold"><span>Subtotal</span><span>{formatRp(cartTotal)}</span></div>
                <button onClick={handleCheckout} className="w-full bg-ink text-cream py-4 text-xs font-bold tracking-widest hover:bg-brand-orange uppercase">CHECKOUT NOW →</button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
