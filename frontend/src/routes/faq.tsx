import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  MessageSquare,
  ChevronRight,
  User,
  Send
} from "lucide-react";
import { getStoreSettings } from "@backend/server-actions";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";
import baraSmile from "@/assets/bara-smile.png";

export const Route = createFileRoute("/faq")({
  loader: async () => {
    const settingsRes = await getStoreSettings();
    return {
      settings: settingsRes.settings || null,
    };
  },
  head: () => ({
    meta: [
      { title: "Tanya Bara — FILKOM Merch UB" },
      { name: "description", content: "Tanya Bara, maskot FILKOM Merch UB. Pusat bantuan interaktif." },
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

type ChatMessage = {
  id: string;
  role: "bara" | "user";
  text: string;
};

const PRESET_QUESTIONS = [
  { 
    id: "size", 
    q: "Bara, kalau ukuranku kebesaran bisa ditukar nggak?", 
    a: "Waduh kalau kebesaran, tenang aja bro/sis! Penukaran ukuran boleh maksimal 2 hari setelah barang diterima kok. Syaratnya tag belum dilepas, belum dicuci, dan stok ukuran pengganti masih ada. Aman! 😎" 
  },
  { 
    id: "po", 
    q: "Barang pre-order selesainya kapan nih?", 
    a: "Proses produksi barang PO biasanya sekitar 14-21 hari kerja setelah sesi pemesanan ditutup yaa. Tergantung antrean vendor juga, tapi Bara bakal pastiin secepat mungkin! 🔥" 
  },
  { 
    id: "pickup", 
    q: "Ngambil pesanannya dimana Bar?", 
    a: "Pilih aja 'Pickup di Kampus' pas checkout! Nanti tim Bara bakal nungguin kamu di Gazebo FILKOM UB sesuai jadwal yang dikirim via WhatsApp. Jangan lupa bawa bukti pesanan ya! 🐯" 
  },
  { 
    id: "discount", 
    q: "Dapet diskon mahasiswa gimana caranya?", 
    a: "Gampang! Kamu tinggal login pake email student UB (@student.ub.ac.id) atau masukin NIM di menu Akun. Nanti otomatis dapet potongan harga civitas 5%! Lumayan kan buat beli es teh? 🥤" 
  },
  { 
    id: "payment", 
    q: "Pembayarannya bisa pakai apa aja?", 
    a: "Lengkap bos! Kita pakai Midtrans, jadi bisa QRIS (Gopay, ShopeePay, Dana, dll) atau Transfer Bank (BCA, Mandiri, dll). Praktis abis!" 
  },
  { 
    id: "shipping", 
    q: "Bisa kirim ke luar kota Malang?", 
    a: "Bisa banget! Bara siap anter pesananmu pake JNE, J&T, atau Sicepat ke seluruh penjuru Indonesia. Ongkirnya otomatis kehitung pas checkout ya." 
  },
  { 
    id: "ori", 
    q: "Ini barang ori dari FILKOM UB?", 
    a: "Yoi dong! Filkom Merch itu toko merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya, hasil kolaborasi mantap sama fakultas dan BEM FILKOM UB. 100% Original! ⭐️" 
  }
];

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
  
  const [pathname, setPathname] = useState("");
  useEffect(() => setPathname(window.location.pathname), []);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "1", role: "bara", text: "Halo Ksatria! Namaku Bara, maskot FILKOM Merch. 😎 Ada yang bisa Bara bantu hari ini?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Layout marquee
  const layout = useMemo(() => {
    const defaults = {
      marqueeText: "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN",
      faqItems: PRESET_QUESTIONS,
    };
    if (!settings?.homepage_layout) return defaults;
    try {
      const parsed = JSON.parse(settings.homepage_layout);
      return { ...defaults, ...parsed, faqItems: parsed.faqItems || PRESET_QUESTIONS };
    } catch {
      return defaults;
    }
  }, [settings]);

  const handleAsk = (presetId: string) => {
    if (isTyping) return;
    
    const question = layout.faqItems.find((q: any) => q.id === presetId);
    if (!question) return;

    // Add user message
    const newMessages = [...messages, { id: Date.now().toString(), role: "user" as const, text: question.q }];
    setMessages(newMessages);
    setIsTyping(true);

    // Simulate Bara typing
    setTimeout(() => {
      setMessages([...newMessages, { id: (Date.now() + 1).toString(), role: "bara" as const, text: question.a }]);
      setIsTyping(false);
    }, 1500);
  };

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
    <div className="min-h-screen bg-background text-foreground selection:bg-brand-orange selection:text-cream flex flex-col">
      {/* Announcement marquee */}
      <div className="bg-ink text-cream py-2.5 overflow-hidden border-b border-ink shrink-0">
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
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b-2 border-ink shrink-0">
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

      {/* Main Chat Interface */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-5 lg:px-10 py-6 sm:py-8 lg:py-10 grid lg:grid-cols-12 gap-8 h-full">
        
        {/* Chat Window (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-card border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden animate-slide-up h-[600px] lg:h-[700px]">
          {/* Chat Header */}
          <div className="bg-ink text-cream p-4 flex items-center gap-3 shrink-0">
            <div className="relative">
              <img src={baraSmile} alt="Bara" className="w-12 h-12 rounded-full object-cover bg-cream border-2 border-cream p-0.5" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-ink rounded-full"></span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Tanya Bara 🐯</h1>
              <p className="text-[10px] text-cream/70 font-mono tracking-widest uppercase">Online • Fast Response</p>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-cream/30 dark:bg-card scroll-smooth"
          >
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} animate-fade-in`}
              >
                {msg.role === "bara" && (
                  <img src={baraSmile} alt="Bara" className="w-8 h-8 rounded-full border-2 border-ink object-cover bg-white shrink-0 mt-1" />
                )}
                <div 
                  className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-sm sm:text-base border-2 border-ink leading-relaxed font-medium ${
                    msg.role === "user" 
                      ? "bg-brand-blue text-cream rounded-tr-none" 
                      : "bg-white text-ink rounded-tl-none shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 flex-row animate-fade-in">
                <img src={baraSmile} alt="Bara" className="w-8 h-8 rounded-full border-2 border-ink object-cover bg-white shrink-0 mt-1" />
                <div className="bg-white text-ink p-4 rounded-2xl rounded-tl-none border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] flex items-center gap-1.5 w-max">
                  <span className="w-2 h-2 bg-ink/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-ink/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-ink/40 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Chat Input (Decorative) */}
          <div className="p-4 bg-background border-t-2 border-ink flex gap-2 shrink-0">
            <div className="flex-1 bg-muted border-2 border-ink/20 rounded-full px-4 py-3 text-sm text-muted-foreground flex items-center cursor-not-allowed">
              Pilih pertanyaan di sebelah kanan ya...
            </div>
            <button disabled className="bg-ink text-cream p-3 rounded-full opacity-50 cursor-not-allowed">
              <Send className="w-5 h-5 ml-1" />
            </button>
          </div>
        </div>

        {/* Questions Sidebar (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          <div className="bg-brand-orange text-cream p-6 rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] animate-slide-up [animation-delay:0.1s]">
            <h2 className="display text-xl font-bold uppercase mb-2">Pilih Pertanyaan</h2>
            <p className="text-xs font-medium text-cream/90 leading-relaxed mb-6">
              Klik salah satu pertanyaan di bawah ini dan biarkan Bara menjawab semua kegundahanmu! 👇
            </p>

            <div className="space-y-3">
              {layout.faqItems.map((q: any) => (
                <button
                  key={q.id}
                  onClick={() => handleAsk(q.id)}
                  disabled={isTyping}
                  className="w-full text-left p-3.5 bg-white text-ink hover:bg-cream border-2 border-ink rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-white"
                >
                  <div className="flex justify-between items-center gap-3">
                    <span>{q.q}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-2 border-ink bg-ink text-cream p-6 rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-4 animate-slide-up [animation-delay:0.2s]">
            <h3 className="display text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-orange" /> Masih Bingung?
            </h3>
            <p className="text-[11px] text-cream/70 leading-relaxed font-medium">
              Kalau Bara belum bisa bantu, langsung aja chat manusia (baca: Admin) via WhatsApp!
            </p>

            <div className="space-y-3 pt-2">
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
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-background border-t border-border mt-auto">
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
