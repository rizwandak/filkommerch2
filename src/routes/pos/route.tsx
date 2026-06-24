import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@frontend/components/ui/button";
import logoFilkom from "@/assets/logo_filkom.png";

export const Route = createFileRoute("/pos")({
  component: PosLayout,
});

function PosLayout() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && (!user || user.type !== "admin")) {
      void navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.type !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
        Memuat POS...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          {user.role === "admin" && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-ink hover:text-brand-orange hover:bg-muted"
            >
              <Link to="/admin/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
          )}
          <div className="flex items-center gap-2">
            <img src={logoFilkom} alt="Logo FILKOM" className="h-8 w-8 object-contain" />
            <div>
              <p className="display text-brand-blue text-sm font-bold tracking-wide flex items-center gap-1.5">
                KASIR / POS OFFLINE
                <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  OFFICIAL
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{user.username}</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-brand-orange hover:bg-muted"
          onClick={() => {
            logout();
            void navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4 mr-1" />
          Keluar
        </Button>
      </header>

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
