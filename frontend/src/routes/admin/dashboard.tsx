import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Line
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@frontend/components/ui/tabs";
import { toast } from "sonner";
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Calendar, 
  Tag, 
  Store,
  Smartphone,
  ChevronRight,
  Package,
  Award
} from "lucide-react";
import { type InventoryItem } from "@backend/server-actions";

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardPage,
  head: () => ({
    meta: [
      { title: "Rekapan Pesanan — Admin Panel" },
      { name: "description", content: "Ringkasan pesanan online & offline, produk, varian, dan pembeli" },
    ],
  }),
});

interface SalesSummary {
  total_orders: number;
  online_orders: number;
  pos_orders: number;
  total_revenue: number;
  online_revenue: number;
  pos_revenue: number;
  total_discount: number;
  total_tax: number;
  total_subtotal: number;
}

interface ProductVariantSummary {
  variant_id: number;
  size: string;
  color: string;
  quantity: number;
  revenue: number;
}

interface ProductSummary {
  product_id: number;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  variants: ProductVariantSummary[];
  sizes: Record<string, number>;
  colors: Record<string, number>;
}

interface BuyerItem {
  product_name: string;
  size: string;
  color: string | null;
  quantity: number;
  total_spent: number;
}

interface BuyerSummary {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_nim: string | null;
  total_orders: number;
  total_spent: number;
  items: BuyerItem[];
}

interface SalesTrendPoint {
  label: string;
  revenue: number;
  orders_count: number;
}

interface OrdersSummaryResponse {
  success: boolean;
  summary: SalesSummary;
  products: ProductSummary[];
  buyers: BuyerSummary[];
  sales_trend: SalesTrendPoint[];
}

function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const API_BASE_URL = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
  
  const [period, setPeriod] = useState<"today" | "7" | "30" | "all">("30");
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [buyers, setBuyers] = useState<BuyerSummary[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrendPoint[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Accordion States
  const [productSearch, setProductSearch] = useState("");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
  const [expandedBuyers, setExpandedBuyers] = useState<Record<string, boolean>>({});
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "low" | "out">("all");

  const getAdminRequestHeaders = () => {
    const role = user?.type === "admin" ? user.role : undefined;
    const userId = user?.id ? String(user.id) : undefined;
    const name = user?.type === "admin" ? user.username : user?.name;

    const headers: Record<string, string> = {};
    if (role) headers["x-user-role"] = role;
    if (userId) headers["x-user-id"] = userId;
    if (name) headers["x-user-name"] = name;
    return headers;
  };

  const fetchJson = async <T,>(url: string) => {
    const res = await fetch(url, {
      method: "GET",
      headers: getAdminRequestHeaders(),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    return data as T;
  };

  const loadData = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true);
      else setLoading(true);

      // Fetch summary and trend metrics
      const summaryResult = await fetchJson<OrdersSummaryResponse>(
        `${API_BASE_URL}/api/analytics/orders-summary?days=${period}`
      );

      if (summaryResult.success) {
        setSummary(summaryResult.summary);
        setProducts(summaryResult.products || []);
        setBuyers(summaryResult.buyers || []);
        setSalesTrend(summaryResult.sales_trend || []);
      }

      // Fetch inventory status
      try {
        const inventoryResult = await fetchJson<{ inventory: InventoryItem[] }>(
          `${API_BASE_URL}/api/analytics/inventory`
        );
        setInventory(inventoryResult.inventory || []);
      } catch (err) {
        console.error("Error loading inventory:", err);
      }

      if (showRefreshToast) {
        toast.success("Data berhasil diperbarui!");
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Gagal memuat data rekapan");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading, user, period]);

  const toggleProductExpand = (productId: number) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const toggleBuyerExpand = (key: string) => {
    setExpandedBuyers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-4">
        <RefreshCw className="h-10 w-10 text-[var(--brand-blue)] animate-spin" />
        <p className="text-muted-foreground animate-pulse">Memuat rekapan dashboard...</p>
      </div>
    );
  }

  // Filtered lists
  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredBuyers = buyers.filter(b => 
    b.customer_name.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    (b.customer_email && b.customer_email.toLowerCase().includes(buyerSearch.toLowerCase())) ||
    (b.customer_nim && b.customer_nim.includes(buyerSearch))
  );

  const filteredInventory = inventory.filter(item => {
    if (inventoryFilter === "low") return item.status === "low";
    if (inventoryFilter === "out") return item.status === "out";
    return true;
  });

  const lowStockCount = inventory.filter(item => item.status === "low" || item.status === "out").length;

  // Chart data preps
  const channelData = summary ? [
    { name: "Online Checkout", value: summary.online_revenue, count: summary.online_orders, color: "#6b5cd8" },
    { name: "Offline POS", value: summary.pos_revenue, count: summary.pos_orders, color: "#f97316" }
  ] : [];

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-background min-h-screen">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="display text-3xl font-bold text-ink tracking-wider">Rekapan & Analisis Pesanan</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            Ringkasan data penjualan online & POS, varian produk, dan pembeli
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted p-1 rounded-md text-xs">
            <button
              onClick={() => setPeriod("today")}
              className={`px-3 py-1.5 rounded-sm font-medium transition-all ${
                period === "today" ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setPeriod("7")}
              className={`px-3 py-1.5 rounded-sm font-medium transition-all ${
                period === "7" ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setPeriod("30")}
              className={`px-3 py-1.5 rounded-sm font-medium transition-all ${
                period === "30" ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              30 Hari
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-sm font-medium transition-all ${
                period === "all" ? "bg-card text-ink shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              Semua
            </button>
          </div>

          <button
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs border border-border bg-card px-3 py-2 rounded-md hover:bg-muted font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Perbarui
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Revenue */}
        <Card className="shadow-sm border-border bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--brand-blue)]" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Total Revenue (Settled)
              <DollarSign className="h-4 w-4 text-[var(--brand-blue)]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-ink">
              Rp {(summary?.total_revenue || 0).toLocaleString("id-ID")}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Smartphone className="h-3 w-3 text-purple-600" /> Online:</span>
                <span className="font-semibold">Rp {(summary?.online_revenue || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1"><Store className="h-3 w-3 text-orange-600" /> POS Offline:</span>
                <span className="font-semibold">Rp {(summary?.pos_revenue || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Total Orders */}
        <Card className="shadow-sm border-border bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Total Pesanan
              <ShoppingBag className="h-4 w-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-ink">
              {summary?.total_orders || 0} <span className="text-xs font-normal text-muted-foreground">Orders</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span>Online orders:</span>
                <span className="font-semibold">{summary?.online_orders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>POS sales:</span>
                <span className="font-semibold">{summary?.pos_orders || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Items Sold */}
        <Card className="shadow-sm border-border bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Items Terjual
              <Package className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-ink">
              {products.reduce((acc, p) => acc + p.total_quantity, 0)} <span className="text-xs font-normal text-muted-foreground">Pcs</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span>Rata-rata item / order:</span>
                <span className="font-semibold">
                  {summary?.total_orders 
                    ? (products.reduce((acc, p) => acc + p.total_quantity, 0) / summary.total_orders).toFixed(1) 
                    : 0} pcs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Average order spend:</span>
                <span className="font-semibold">
                  Rp {summary?.total_orders 
                    ? Math.round(summary.total_revenue / summary.total_orders).toLocaleString("id-ID") 
                    : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Total Discounts */}
        <Card className="shadow-sm border-border bg-card overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--brand-orange)]" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Diskon Diberikan
              <Tag className="h-4 w-4 text-[var(--brand-orange)]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[var(--brand-orange)]">
              Rp {(summary?.total_discount || 0).toLocaleString("id-ID")}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span>PPN Terkumpul (Tax):</span>
                <span className="font-semibold">Rp {(summary?.total_tax || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal kotor:</span>
                <span className="font-semibold">Rp {(summary?.total_subtotal || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted p-1 border-b border-border w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="data-[state=active]:bg-card py-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5 mr-2" /> Ringkasan & Tren
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-card py-2 text-xs">
            <Package className="h-3.5 w-3.5 mr-2" /> Statistik Produk & Varian
          </TabsTrigger>
          <TabsTrigger value="buyers" className="data-[state=active]:bg-card py-2 text-xs">
            <Users className="h-3.5 w-3.5 mr-2" /> Daftar Buyer
          </TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-card py-2 text-xs">
            <Store className="h-3.5 w-3.5 mr-2" /> Status Stok
            {lowStockCount > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                {lowStockCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & CHARTS */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Sales trend chart */}
            <Card className="xl:col-span-2 shadow-sm border-border bg-card">
              <CardHeader>
                <CardTitle className="display text-sm tracking-wider text-ink flex items-center justify-between">
                  Tren Penjualan ({period === "today" ? "Jam ke Jam" : "Hari ke Hari"})
                  <span className="text-xs font-normal text-muted-foreground uppercase tracking-widest">
                    Periode: {period === "today" ? "Hari Ini" : `${period} Hari Terakhir`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesTrend.length === 0 ? (
                  <div className="flex items-center justify-center h-[320px] text-muted-foreground border border-dashed rounded-lg">
                    Belum ada data penjualan pada periode ini
                  </div>
                ) : (
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesTrend}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--brand-blue)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--brand-blue)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="label" fontSize={11} stroke="var(--ink)" opacity={0.6} />
                        <YAxis yAxisId="left" fontSize={11} stroke="var(--brand-blue)" tickFormatter={(val) => `Rp ${(val/1000).toLocaleString()}k`} />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} stroke="#6366f1" tickFormatter={(val) => Math.round(val).toString()} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === "Revenue") return [`Rp ${value.toLocaleString("id-ID")}`, "Revenue"];
                            return [value, "Jumlah Order"];
                          }}
                        />
                        <Legend />
                        <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="var(--brand-blue)" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="orders_count" stroke="#6366f1" name="Orders Count" strokeWidth={1.5} activeDot={{ r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales Channel Breakdown */}
            <div className="space-y-6">
              <Card className="shadow-sm border-border bg-card">
                <CardHeader>
                  <CardTitle className="display text-sm tracking-wider text-ink">
                    Perbandingan POS vs Online
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  {summary?.total_revenue === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                      Belum ada penjualan
                    </div>
                  ) : (
                    <>
                      <div className="h-[180px] w-[180px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={channelData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `Rp ${value.toLocaleString("id-ID")}`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[10px] text-muted-foreground font-semibold">Total Revenue</span>
                          <span className="text-sm font-bold text-ink">
                            Rp {(summary?.total_revenue || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>

                      <div className="w-full mt-4 space-y-2">
                        {channelData.map((item, index) => {
                          const percentage = summary?.total_revenue 
                            ? ((item.value / summary.total_revenue) * 100).toFixed(1) 
                            : "0";
                          return (
                            <div key={index} className="flex items-center justify-between text-xs p-2 rounded-md border border-border">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="font-medium text-ink">{item.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-ink">Rp {item.value.toLocaleString("id-ID")}</span>
                                <span className="text-muted-foreground ml-2">({percentage}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: PRODUCT & VARIANT BREAKDOWN */}
        <TabsContent value="products" className="space-y-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="display text-sm tracking-wider text-ink">
                  Statistik Penjualan per Produk & Varian
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Klik pada baris produk untuk membuka rincian ukuran, warna, dan varian yang terjual.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari nama produk..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)] text-ink"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Tidak ditemukan produk terjual yang cocok dengan pencarian
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-cream">
                      <tr>
                        <th className="w-8"></th>
                        <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">Produk</th>
                        <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">Qty Terjual</th>
                        <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const isExpanded = expandedProducts[product.product_id];
                        return (
                          <>
                            {/* Product main row */}
                            <tr 
                              key={`prod-${product.product_id}`} 
                              className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => toggleProductExpand(product.product_id)}
                            >
                              <td className="p-3 text-center">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </td>
                              <td className="p-3 font-semibold text-ink">
                                {product.product_name}
                              </td>
                              <td className="p-3 text-right font-medium text-ink">
                                {product.total_quantity} pcs
                              </td>
                              <td className="p-3 text-right font-bold text-[var(--brand-blue)]">
                                Rp {product.total_revenue.toLocaleString("id-ID")}
                              </td>
                            </tr>

                            {/* Expanded Details Row */}
                            {isExpanded && (
                              <tr key={`details-${product.product_id}`} className="bg-cream/40 border-t border-border">
                                <td colSpan={4} className="p-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Column 1: Size Aggregates */}
                                    <div className="bg-card p-4 rounded-md border border-border shadow-sm">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 pb-1 border-b">
                                        Distribusi Ukuran (Sizes)
                                      </h4>
                                      {Object.keys(product.sizes).length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2">Tidak ada data ukuran</p>
                                      ) : (
                                        <div className="space-y-3">
                                          {Object.entries(product.sizes)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([size, qty]) => {
                                              const maxVal = Math.max(...Object.values(product.sizes));
                                              const percent = maxVal ? (qty / maxVal) * 100 : 0;
                                              return (
                                                <div key={size} className="space-y-1">
                                                  <div className="flex justify-between text-xs">
                                                    <span className="font-semibold text-ink uppercase bg-muted px-1.5 py-0.5 rounded">{size}</span>
                                                    <span className="text-muted-foreground">{qty} pcs sold</span>
                                                  </div>
                                                  <div className="w-full bg-muted rounded-full h-1.5">
                                                    <div 
                                                      className="bg-[var(--brand-blue)] h-1.5 rounded-full transition-all duration-500" 
                                                      style={{ width: `${percent}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Column 2: Color Aggregates */}
                                    <div className="bg-card p-4 rounded-md border border-border shadow-sm">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 pb-1 border-b">
                                        Distribusi Warna (Colors)
                                      </h4>
                                      {Object.keys(product.colors).length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2">Tidak ada data warna</p>
                                      ) : (
                                        <div className="space-y-3">
                                          {Object.entries(product.colors)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([color, qty]) => {
                                              const maxVal = Math.max(...Object.values(product.colors));
                                              const percent = maxVal ? (qty / maxVal) * 100 : 0;
                                              return (
                                                <div key={color} className="space-y-1">
                                                  <div className="flex justify-between text-xs">
                                                    <span className="font-medium text-ink capitalize">{color}</span>
                                                    <span className="text-muted-foreground">{qty} pcs sold</span>
                                                  </div>
                                                  <div className="w-full bg-muted rounded-full h-1.5">
                                                    <div 
                                                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" 
                                                      style={{ width: `${percent}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Column 3: Full Varian table */}
                                    <div className="bg-card p-4 rounded-md border border-border shadow-sm">
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 pb-1 border-b">
                                        Rincian per Varian
                                      </h4>
                                      <div className="overflow-y-auto max-h-[180px] border border-border rounded">
                                        <table className="w-full text-xs">
                                          <thead className="bg-muted text-ink font-semibold">
                                            <tr>
                                              <th className="p-2 text-left font-semibold">Varian</th>
                                              <th className="p-2 text-right font-semibold">Qty</th>
                                              <th className="p-2 text-right font-semibold">Revenue</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {product.variants.map((variant, i) => (
                                              <tr key={i} className="border-t border-border hover:bg-muted/20">
                                                <td className="p-2 text-muted-foreground font-medium uppercase">
                                                  {variant.size} {variant.color && variant.color !== "Default" ? `- ${variant.color}` : ""}
                                                </td>
                                                <td className="p-2 text-right text-ink">{variant.quantity} pcs</td>
                                                <td className="p-2 text-right font-semibold text-ink">
                                                  Rp {variant.revenue.toLocaleString("id-ID")}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: BUYER DIRECTORY & HISTORY */}
        <TabsContent value="buyers" className="space-y-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="display text-sm tracking-wider text-ink">
                  Daftar & Rekap Belanja Buyer (Pelanggan)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Menampilkan rekapitulasi data pembelian dari setiap pelanggan, baik via POS (kasir) maupun online checkout.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau NIM buyer..."
                  value={buyerSearch}
                  onChange={(e) => setBuyerSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)] text-ink"
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredBuyers.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Tidak ditemukan data buyer yang cocok dengan pencarian
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-cream">
                      <tr>
                        <th className="w-8"></th>
                        <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">Nama Pembeli</th>
                        <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">Email & Kontak</th>
                        <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">NIM (Civitas UB)</th>
                        <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">Total Orders</th>
                        <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">Total Belanja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBuyers.map((buyer) => {
                        const buyerKey = `${buyer.customer_email.toLowerCase()}_${buyer.customer_name.toLowerCase()}`;
                        const isExpanded = expandedBuyers[buyerKey];
                        const isVerified = buyer.customer_nim && buyer.customer_nim.trim() !== "";
                        
                        return (
                          <>
                            {/* Buyer primary row */}
                            <tr 
                              key={`buyer-${buyerKey}`}
                              className="border-t border-border hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => toggleBuyerExpand(buyerKey)}
                            >
                              <td className="p-3 text-center">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </td>
                              <td className="p-3 font-semibold text-ink">
                                {buyer.customer_name}
                              </td>
                              <td className="p-3 text-left text-xs space-y-0.5">
                                <div className="text-ink font-medium">{buyer.customer_email}</div>
                                <div className="text-muted-foreground">{buyer.customer_phone}</div>
                              </td>
                              <td className="p-3 text-center">
                                {isVerified ? (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                    <Award className="h-3 w-3" />
                                    {buyer.customer_nim}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">Non-UB / Guest</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-medium text-ink">
                                {buyer.total_orders} transaksi
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-600">
                                Rp {buyer.total_spent.toLocaleString("id-ID")}
                              </td>
                            </tr>

                            {/* Expandable items purchased list */}
                            {isExpanded && (
                              <tr key={`buyer-details-${buyerKey}`} className="bg-cream/40 border-t border-border">
                                <td colSpan={6} className="p-6">
                                  <div className="bg-card p-4 rounded-md border border-border shadow-sm">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink mb-3 pb-1 border-b flex items-center justify-between">
                                      Daftar Barang yang Telah Dibeli
                                      <span className="text-xs font-normal text-muted-foreground italic capitalize">
                                        Total Spend: Rp {buyer.total_spent.toLocaleString("id-ID")}
                                      </span>
                                    </h4>

                                    {buyer.items.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">Tidak ditemukan item transaksi</p>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {buyer.items.map((item, i) => (
                                          <div key={i} className="flex items-center justify-between text-xs p-3 rounded border border-border bg-background hover:bg-muted/10 transition-colors">
                                            <div className="space-y-0.5">
                                              <div className="font-semibold text-ink">{item.product_name}</div>
                                              <div className="text-muted-foreground flex gap-2">
                                                <span>Ukuran: <span className="uppercase text-ink font-medium">{item.size}</span></span>
                                                {item.color && item.color !== "Default" && (
                                                  <span>Warna: <span className="capitalize text-ink font-medium">{item.color}</span></span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-bold text-ink">Qty: {item.quantity} pcs</div>
                                              <div className="text-muted-foreground font-semibold">Rp {item.total_spent.toLocaleString("id-ID")}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: INVENTORY STATUS */}
        <TabsContent value="inventory" className="space-y-6">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="display text-sm tracking-wider text-ink">
                  Status Ketersediaan Stok Produk
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pantau level stok produk varian untuk merencanakan restock tepat waktu.
                </p>
              </div>

              {/* Status Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => setInventoryFilter("all")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                    inventoryFilter === "all"
                      ? "bg-ink text-background border-ink"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setInventoryFilter("low")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                    inventoryFilter === "low"
                      ? "bg-yellow-500 text-white border-yellow-500"
                      : "bg-card text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                  }`}
                >
                  Stok Rendah (&le; 5)
                </button>
                <button
                  onClick={() => setInventoryFilter("out")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                    inventoryFilter === "out"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-card text-red-600 border-red-200 hover:bg-red-50"
                  }`}
                >
                  Habis (0)
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInventory.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Tidak ada varian produk yang memenuhi kriteria filter
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-cream">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">Nama Produk</th>
                        <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">Harga Satuan</th>
                        <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">Jumlah Stok</th>
                        <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item) => (
                        <tr key={item.id} className="border-t border-border hover:bg-muted/10 transition-colors">
                          <td className="p-3 font-semibold text-ink">
                            {item.product_name}
                          </td>
                          <td className="p-3 text-right font-medium text-muted-foreground">
                            Rp {item.product_price.toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-right font-bold text-ink">
                            {item.stock} pcs
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                item.status === "ok"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : item.status === "low"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {item.status === "ok"
                                ? "OK (Cukup)"
                                : item.status === "low"
                                  ? "Stok Rendah"
                                  : "Habis"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
