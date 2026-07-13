import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { resolveImageUrl } from "@/lib/image-resolver";
import { HackerModeToggle } from "./HackerModeToggle";
import { VerificationModal } from "@frontend/components/VerificationModal";
import { toast } from "sonner";
import {
  ShoppingBag,
  User,
  Search,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  LogOut,
  LayoutDashboard,
  MonitorSmartphone,
  ArrowRight,
} from "lucide-react";

import logo from "@/assets/logo-fm.jpg";
import logoFilkom from "@/assets/logo_filkom.png";

const NAV = [
  { label: "BERANDA", href: "/", isScroll: true, target: "top" },
  { label: "PRODUK", href: "/products" },
  { label: "PRE-ORDER", href: "/pre-order" },
  { label: "TENTANG KAMI", href: "/#about", isScroll: true, target: "about" },
  { label: "FAQ", href: "/faq" },
];

export interface CartItem {
  id: string;
  name: string;
  price: string;
  img: string;
  qty: number;
  product_id?: number;
  variant_id?: number;
  size?: string;
  color?: string;
  image_url?: string;
}

function parsePrice(p: any): number {
  if (typeof p === "number") return p;
  if (!p) return 0;
  return Number(String(p).replace(/[^0-9]/g, "")) || 0;
}

function formatRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface NavbarProps {
  // Optional search state overrides for on-the-fly filtering
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
}

export function Navbar({ searchQuery, onSearchQueryChange }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const hash = location.hash;
  const { user, logout } = useAuth();

  // State variables
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState("");

  // Refs for click outside detection
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load cart from localStorage
  const loadCart = useCallback(() => {
    try {
      const saved = localStorage.getItem("indexCart");
      if (saved) {
        setCart(JSON.parse(saved));
      } else {
        setCart([]);
      }
    } catch (e) {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    loadCart();

    // Event listeners for page-to-navbar communication
    const handleCartUpdated = () => loadCart();
    const handleOpenCart = () => {
      loadCart();
      setCartOpen(true);
    };
    const handleOpenVerification = () => {
      setIsVerifyOpen(true);
    };

    window.addEventListener("cart-updated", handleCartUpdated);
    window.addEventListener("open-cart", handleOpenCart);
    window.addEventListener("open-verification", handleOpenVerification);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdated);
      window.removeEventListener("open-cart", handleOpenCart);
      window.removeEventListener("open-verification", handleOpenVerification);
    };
  }, [loadCart]);

  // Click outside listener for user menu dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  // Sync cart back to localStorage
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("indexCart", JSON.stringify(newCart));
    // Dispatch event to notify any other instances/listeners
    window.dispatchEvent(new Event("cart-updated"));
  };

  const updateQty = (id: string, delta: number) => {
    const updated = cart
      .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0);
    saveCart(updated);
  };

  const removeItem = (id: string) => {
    const updated = cart.filter((item) => item.id !== id);
    saveCart(updated);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);

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
      image_url: item.img || item.image_url || "",
      category: item.name.includes("Varsity")
        ? "JACKET"
        : item.name.includes("Hoodie")
          ? "HOODIE"
          : item.name.includes("Tee")
            ? "TEE"
            : "ACCESSORIES",
    }));

    localStorage.setItem("cart", JSON.stringify(checkoutCart));
    navigate({ to: "/checkout" });
    setCartOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery !== undefined ? searchQuery : localQuery;
    
    if (pathname === "/" || pathname === "/products") {
      // If we are on home/catalog, let's trigger scroll or filter via state
      if (onSearchQueryChange) {
        onSearchQueryChange(query);
      }
      if (pathname === "/") {
        scrollToId("shop");
      }
    } else {
      // If we are on other pages, redirect to catalog page with search parameter
      navigate({
        to: "/products",
        search: { q: query },
      });
      setSearchOpen(false);
    }
  };

  const handleSearchChange = (val: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
      if (pathname === "/") {
        scrollToId("shop");
      }
    } else {
      setLocalQuery(val);
    }
  };

  const displayQuery = searchQuery !== undefined ? searchQuery : localQuery;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b-2 border-ink">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-10 flex items-center justify-between h-16 sm:h-20">
          <Link
            to="/"
            onClick={(e) => {
              if (window.location.pathname === "/") {
                e.preventDefault();
                scrollToId("top");
              }
            }}
            className="flex items-center gap-2 sm:gap-3 text-left hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <img
                src={logo}
                alt="Filkom Merch UB"
                className="h-[42px] w-[42px] sm:h-[55px] sm:w-[55px] rounded-full object-cover ring-2 ring-ink shadow-sm"
              />
              <img
                src={logoFilkom}
                alt="Logo FILKOM UB"
                className="h-[37px] w-[37px] sm:h-[51px] sm:w-[51px] object-contain"
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="display text-lg text-ink flex items-center gap-1.5 font-extrabold uppercase tracking-wide">
                Filkom Merch
                <span className="text-[8px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">
                  OFFICIAL
                </span>
              </div>
              <div className="text-[9px] tracking-[0.32em] text-muted-foreground font-black">
                UNIVERSITAS BRAWIJAYA
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV.map((n) => {
              const isActive = pathname === n.href || (n.href === "/" && pathname === "/" && !hash);
              const isScrollOnHome = n.isScroll && pathname === "/";

              if (isScrollOnHome) {
                return (
                  <button
                    key={n.label}
                    onClick={() => scrollToId(n.target!)}
                    className={`text-[11px] font-bold tracking-[0.2em] transition-colors cursor-pointer uppercase ${
                      isActive
                        ? "text-brand-orange border-b-2 border-brand-orange"
                        : "text-ink hover:text-brand-orange"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              }

              return (
                <Link
                  key={n.label}
                  to={n.href.startsWith("/#") ? "/" : (n.href as any)}
                  hash={n.isScroll ? n.target : undefined}
                  className={`text-[11px] font-bold tracking-[0.2em] transition-colors uppercase ${
                    isActive
                      ? "text-brand-orange border-b-2 border-brand-orange"
                      : "text-ink hover:text-brand-orange"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 text-ink">
            <HackerModeToggle />
            <button
              aria-label="Search"
              onClick={() => setSearchOpen((v) => !v)}
              className="hover:text-brand-orange transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                aria-label="Account"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="hover:text-brand-orange transition-colors"
              >
                <User className="w-5 h-5" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 min-w-[240px] w-max max-w-[320px] bg-background border-2 border-ink rounded-lg shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] z-50 animate-scale-in">
                  {user ? (
                    <>
                      <div className="px-5 py-3 border-b border-border">
                        <p className="text-sm font-bold text-foreground break-words">
                          {user.type === "admin" ? user.username : user.name}
                        </p>
                        <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-900 rounded">
                          {user.type === "admin" ? "ADMIN" : "BUYER"}
                        </span>
                        {user && (
                          <div className="mt-1.5">
                            {user.is_filkom_verified === 1 ? (
                              <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                                ✓ FILKOM VERIFIED
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsVerifyOpen(true);
                                  setUserMenuOpen(false);
                                }}
                                className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 border border-brand-orange/30 px-2 py-1 rounded w-full text-center transition-all cursor-pointer block"
                              >
                                Verifikasi NIM
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {user.type === "admin" && (
                        <Link
                          to="/admin/dashboard"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border font-bold text-brand-blue"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Panel Admin
                        </Link>
                      )}
                      {user.type === "admin" && (
                        <Link
                          to="/pos"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border font-bold text-brand-orange"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <MonitorSmartphone className="w-4 h-4" />
                          Kasir / POS
                        </Link>
                      )}
                      {user && (
                        <Link
                          to="/orders"
                          className="block px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 border-b border-border"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Pesanan Saya
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setUserMenuOpen(false);
                          toast.success("Logged out");
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary flex items-center gap-2 pointer-events-auto"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="block px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>
            <button
              aria-label="Cart"
              className="relative hover:text-brand-orange transition-colors"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-orange text-cream text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              aria-label="Menu"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="border-t border-border bg-background animate-slide-down"
          >
            <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-4 flex items-center gap-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={displayQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Cari produk…"
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  handleSearchChange("");
                }}
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ink text-cream flex flex-col animate-fade-in animate-duration-300">
          <div className="flex items-center justify-between px-4 sm:px-5 h-16 sm:h-20 border-b border-cream/20">
            <span className="display text-lg font-bold">Filkom Merch</span>
            <button
              onClick={() => {
                setMenuOpen(false);
                setUserMenuOpen(false);
              }}
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 flex flex-col px-5 py-6 sm:py-8 gap-1">
            {NAV.map((n, idx) => (
              <Link
                key={n.label}
                to={n.href.startsWith("/#") ? "/" : (n.href as any)}
                hash={n.isScroll ? n.target : undefined}
                onClick={() => {
                  setMenuOpen(false);
                  setUserMenuOpen(false);
                }}
                className="display text-3xl sm:text-4xl text-left py-2.5 sm:py-3 hover:text-brand-orange transition-colors animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in">
          <div
            className="hidden sm:block flex-1 bg-ink/50 backdrop-blur-sm"
            onClick={() => {
              setCartOpen(false);
              setUserMenuOpen(false);
            }}
          />
          <aside className="w-full sm:max-w-md bg-background text-foreground flex flex-col shadow-2xl border-l border-ink">
            <div className="flex items-center justify-between h-20 px-6 border-b border-border">
              <div>
                <div className="display text-2xl text-ink font-bold">Your Bag</div>
                <div className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">
                  {cartCount} ITEMS
                </div>
              </div>
              <button
                onClick={() => {
                  setCartOpen(false);
                  setUserMenuOpen(false);
                }}
                aria-label="Close cart"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  <p className="display text-2xl text-ink font-bold">Bag is empty.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tambahkan produk favoritmu.
                  </p>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      // If we are on homepage, scroll to shop, otherwise go to products
                      if (pathname === "/") {
                        scrollToId("shop");
                      } else {
                        navigate({ to: "/products" });
                      }
                    }}
                    className="mt-6 inline-flex items-center gap-2 bg-ink text-cream px-6 py-3 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange uppercase"
                  >
                    BROWSE PRODUCTS <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {cart.map((i) => (
                    <li key={i.id} className="py-4 flex gap-4">
                      <img
                        src={resolveImageUrl(i.img || i.image_url)}
                        alt={i.name}
                        className="w-20 h-24 object-cover border border-ink/10 rounded"
                      />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-ink leading-tight">
                            {i.name}
                          </h4>
                          {i.size && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Ukuran: {i.size}
                            </p>
                          )}
                          {i.color && i.color !== "Default" && (
                            <p className="text-[10px] text-muted-foreground">
                              Warna: {i.color}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-secondary border border-ink/10 px-2 py-1 rounded">
                            <button
                              onClick={() => updateQty(i.id, -1)}
                              className="text-xs hover:text-brand-orange"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono w-4 text-center">
                              {i.qty}
                            </span>
                            <button
                              onClick={() => updateQty(i.id, 1)}
                              className="text-xs hover:text-brand-orange"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-xs font-bold font-mono">
                            {formatRp(parsePrice(i.price) * i.qty)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(i.id)}
                        className="text-muted-foreground hover:text-red-500 self-start"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-border p-6 bg-secondary/30">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs tracking-[0.2em] font-bold uppercase text-muted-foreground">
                    Subtotal
                  </span>
                  <span className="text-xl font-bold font-mono text-ink">
                    {formatRp(cartTotal)}
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 bg-ink text-cream py-4 text-xs font-bold tracking-[0.2em] hover:bg-brand-orange transition-colors uppercase cursor-pointer"
                >
                  PROCEED TO CHECKOUT <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Verification Modal integration */}
      <VerificationModal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
      />
    </>
  );
}
