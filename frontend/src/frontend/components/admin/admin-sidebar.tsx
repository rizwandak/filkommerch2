import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  LogOut,
  Store,
  MonitorSmartphone,
  Users,
  Sliders,
  History,
  CalendarClock,
  Ticket,
  Home,
  Truck,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, type AdminRole } from "@/lib/auth";
import { Button } from "@frontend/components/ui/button";
import { Separator } from "@frontend/components/ui/separator";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AdminRole[];
}

const adminNavItems: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard, roles: ["admin", "cashier"] },
  { label: "Produk", to: "/admin/products", icon: Package, roles: ["admin", "cashier"] },
  { label: "Pre-Order Batch", to: "/admin/pre-order", icon: CalendarClock, roles: ["admin", "cashier"] },
  { label: "Vendoring", to: "/admin/vendoring", icon: Truck, roles: ["admin", "cashier"] },
  { label: "Kode Voucher", to: "/admin/vouchers", icon: Ticket, roles: ["admin"] },
  { label: "Transaksi", to: "/admin/transactions", icon: Receipt, roles: ["admin", "cashier"] },
  { label: "Pengguna", to: "/admin/users", icon: Users, roles: ["admin", "cashier"] },
  { label: "Tata Letak", to: "/admin/homepage", icon: Sliders, roles: ["admin", "cashier"] },
  { label: "Log Aktivitas", to: "/admin/activity-logs", icon: History, roles: ["admin", "cashier"] },
  { label: "Pengaturan Toko", to: "/admin/settings", icon: Settings, roles: ["admin", "cashier"] },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const { user, logout } = useAuth();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  if (!user || user.type !== "admin") return null;

  const role = user.role;
  const visibleItems = adminNavItems.filter((item) => item.roles.includes(role));
  const canAccessPos = role === "admin" || role === "cashier";

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="display text-sm tracking-wider leading-tight text-ink">FILKOM Merch</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">
              {role} panel
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Dark Mode"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-1 p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.to || currentPath.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {canAccessPos && (
          <>
            <Separator className="my-3 border-border" />
            <Link
              to="/pos"
              onClick={onNavigate}
              className={cn(
                "display flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold tracking-wider transition-all",
                currentPath.startsWith("/pos")
                  ? "bg-brand-orange text-white shadow-lg shadow-brand-orange/30"
                  : "bg-brand-orange/90 text-white hover:bg-brand-orange hover:shadow-lg hover:shadow-brand-orange/20",
              )}
            >
              <MonitorSmartphone className="h-5 w-5" />
              KASIR / POS
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-border p-4 mt-auto space-y-2 shrink-0 bg-card">
        <div className="mb-2 px-1">
          <p className="text-xs font-bold text-ink truncate">{user.username}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
            <span>{isDark ? "Mode Gelap (Aktif)" : "Mode Terang (Aktif)"}</span>
          </div>
          <div className={cn("w-7 h-4 rounded-full p-0.5 transition-colors", isDark ? "bg-brand-orange" : "bg-muted-foreground/30")}>
            <div className={cn("w-3 h-3 rounded-full bg-white transition-transform", isDark ? "translate-x-3" : "translate-x-0")} />
          </div>
        </button>

        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:bg-accent transition-colors"
        >
          <Home className="h-4 w-4 text-primary" />
          Kembali ke Beranda
        </Link>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 font-bold text-xs"
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
        >
          <LogOut className="h-4 w-4" />
          Keluar / Logout
        </Button>
      </div>
    </aside>
  );
}
