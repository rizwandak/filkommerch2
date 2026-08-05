import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { getStoreSettings } from "../backend/server-actions";

import appCss from "../styles.css?url";
import logoFm from "../assets/logo-fm.jpg";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";
import { Toaster } from "@frontend/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SplashScreen } from "../components/SplashScreen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FILKOM Merch UB — Official Store" },
      { name: "description", content: "Platform resmi Merchandise Fakultas Ilmu Komputer Universitas Brawijaya" },
      { name: "author", content: "FILKOM Merch UB" },
      { property: "og:title", content: "FILKOM Merch UB — Official Store" },
      { property: "og:description", content: "Platform resmi Merchandise Fakultas Ilmu Komputer Universitas Brawijaya" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@filkommerch" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: logoFm },
      { rel: "shortcut icon", href: logoFm },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const getMarqueeText = (settings: any) => {
  const defaultText = "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN | 100% PRODUK MAHASISWA | CASHBACK 5% MEMBER | DROP BARU TIAP BULAN";
  if (!settings || !settings.homepage_layout) return defaultText;
  try {
    const parsed = typeof settings.homepage_layout === "object"
      ? settings.homepage_layout
      : JSON.parse(settings.homepage_layout);
    if (Array.isArray(parsed)) {
      // segment-based layout
      for (const segment of parsed) {
        if (segment.elements) {
          const marqueeEl = segment.elements.find((e: any) => e.type === "marquee");
          if (marqueeEl && marqueeEl.config?.text) {
            return marqueeEl.config.text;
          }
        }
      }
    } else if (parsed?.marqueeText) {
      return parsed.marqueeText;
    }
  } catch (e) {
    console.error("Error parsing homepage layout in root:", e);
  }
  return defaultText;
};

function GlobalLayout() {
  const location = useLocation();
  const isAdminOrCashier = location.pathname.startsWith("/admin") || location.pathname.startsWith("/pos");

  if (isAdminOrCashier) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <div className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-brand-orange selection:text-cream overflow-x-hidden max-w-full w-full">
      {/* Nested routes render here */}
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <GoogleOAuthProvider clientId="159528757023-4sr74hnesnfc377l0pule7b7fhh3g65n.apps.googleusercontent.com">
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <SplashScreen />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <GlobalLayout />
          <Toaster position="top-center" />
        </QueryClientProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
