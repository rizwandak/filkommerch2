import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminSidebar } from "@frontend/components/admin/admin-sidebar";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { Button } from "@frontend/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@frontend/components/ui/sheet";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!loading && (!user || user.type !== "admin")) {
      void navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading || !user || user.type !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Memuat panel admin...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="hidden md:block h-full shrink-0">
        <AdminSidebar
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <header className="flex md:hidden items-center justify-between border-b border-border bg-card px-4 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <AdminSidebar onNavigate={() => {}} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold">Admin Panel</span>
          </div>
          <HackerModeToggle />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
