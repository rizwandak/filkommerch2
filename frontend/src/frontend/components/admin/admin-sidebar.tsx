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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, type AdminRole } from "@/lib/auth";
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ onNavigate, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
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

  const userInitial = (user.username || user.name || "A").charAt(0).toUpperCase();

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* HEADER */}
      <div
        className={cn(
          "flex items-center border-b border-border py-3.5 shrink-0 transition-all",
          collapsed ? "flex-col gap-2.5 px-2" : "justify-between px-4"
        )}
      >
        {/* Brand Logo & Title */}
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0 cursor-pointer"
            onClick={onToggleCollapse}
            title={collapsed ? "Buka Sidebar" : undefined}
          >
            <Store className="h-4 w-4" />
          </div>

          {!collapsed && (
            <div className="overflow-hidden leading-tight">
              <p className="display text-xs font-bold tracking-wider text-ink uppercase truncate">
                FILKOM MERCH
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
                {role} panel
              </p>
            </div>
          )}
        </div>

        {/* Action buttons (Theme + Collapse) */}
        <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            aria-label="Toggle Dark Mode"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-400" />}
          </button>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? "Perluas Sidebar" : "Sembunyikan Sidebar (Mode Ramping)"}
              aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer hidden md:flex items-center justify-center"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4 text-brand-orange" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION MENU */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.to || currentPath.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg transition-all duration-150 font-medium group",
                collapsed
                  ? "justify-center h-10 w-10 mx-auto"
                  : "gap-2.5 px-3 py-2 text-xs",
                active
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("shrink-0", collapsed ? "h-4 w-4" : "h-4 w-4")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}

        {canAccessPos && (
          <div className="pt-2">
            <Separator className="my-1.5 border-border opacity-60" />
            <Link
              to="/pos"
              onClick={onNavigate}
              title={collapsed ? "KASIR / POS" : undefined}
              className={cn(
                "display flex items-center rounded-lg font-bold tracking-wider transition-all duration-150 shadow-xs",
                collapsed
                  ? "justify-center h-10 w-10 mx-auto bg-brand-orange text-white hover:bg-brand-orange/90"
                  : "gap-2.5 px-3 py-2 text-xs bg-brand-orange text-white hover:bg-brand-orange/90",
                currentPath.startsWith("/pos") && "ring-2 ring-brand-orange/50 ring-offset-1"
              )}
            >
              <MonitorSmartphone className="h-4 w-4 shrink-0" />
              {!collapsed && <span>KASIR / POS</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* FOOTER: STREAMLINED USER & ACTIONS */}
      <div className={cn("border-t border-border mt-auto shrink-0 bg-card/60 transition-all", collapsed ? "p-2 space-y-2" : "p-3 space-y-2.5")}>
        {/* User profile */}
        {collapsed ? (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue font-black text-xs mx-auto border border-brand-blue/30"
            title={`${user.username || user.name}\n${user.email || ""}`}
          >
            {userInitial}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1 py-0.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue font-black text-xs border border-brand-blue/30">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-xs font-bold text-ink truncate">
                {user.username || user.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate font-mono">
                {user.email}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className={cn("flex gap-1.5", collapsed ? "flex-col items-center" : "items-center")}>
          <Link
            to="/"
            onClick={onNavigate}
            title="Kembali ke Beranda Web"
            className={cn(
              "flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-[11px] font-semibold",
              collapsed ? "h-8 w-8" : "flex-1 py-1.5 gap-1.5 px-2"
            )}
          >
            <Home className="h-3.5 w-3.5 text-primary" />
            {!collapsed && <span>Beranda</span>}
          </Link>

          <button
            type="button"
            title="Keluar / Logout"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className={cn(
              "flex items-center justify-center rounded-md border border-rose-200 dark:border-rose-900/60 bg-background text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors text-[11px] font-semibold cursor-pointer",
              collapsed ? "h-8 w-8" : "flex-1 py-1.5 gap-1.5 px-2"
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
