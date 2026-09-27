import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Calendar,
  Receipt,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Search,
  Building2,
  ExternalLink,
  Eye,
  Upload,
  X,
  PieChart,
  BarChart3,
  Sparkles,
  HelpCircle,
  Truck,
  Coins,
  ShieldCheck,
  Tag,
  Download,
} from "lucide-react";
import {
  getFinancialBalanceSheetServerAction,
  getOperationalExpensesServerAction,
  createOperationalExpenseServerAction,
  updateOperationalExpenseServerAction,
  deleteOperationalExpenseServerAction,
} from "@backend/server-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@frontend/components/ui/card";
import { Button } from "@frontend/components/ui/button";
import { Badge } from "@frontend/components/ui/badge";
import { Input } from "@frontend/components/ui/input";
import { Textarea } from "@frontend/components/ui/textarea";
import { Label } from "@frontend/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@frontend/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@frontend/components/ui/tabs";
import { Progress } from "@frontend/components/ui/progress";
import { Separator } from "@frontend/components/ui/separator";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/finance")({
  component: AdminFinancePage,
  head: () => ({ meta: [{ title: "Neraca Keuangan — Admin Panel" }] }),
});

const EXPENSE_CATEGORIES = [
  "Packaging & Packing",
  "Logistik & Pengiriman",
  "Operasional & ATK",
  "Konsumsi & Logistik Acara",
  "Marketing & Promosi",
  "Perlengkapan Stand/Booth",
  "Biaya Admin & Transaksi",
  "Lain-lain",
];

function formatRupiah(num: number | string | null | undefined): string {
  const n = Number(num || 0);
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export function AdminFinancePage() {
  const queryClient = useQueryClient();

  // Filters & State
  const [activeTab, setActiveTab] = useState("inflow");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");
  const [expenseBatchFilter, setExpenseBatchFilter] = useState("all");

  // Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  // Expense Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Packaging & Packing");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formBatchId, setFormBatchId] = useState<string>("none");
  const [formNotes, setFormNotes] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Queries
  const {
    data: balanceRes,
    isLoading: isBalanceLoading,
    isRefetching: isBalanceRefetching,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["financialBalanceSheet", selectedBatchFilter, startDate, endDate],
    queryFn: () =>
      getFinancialBalanceSheetServerAction({
        data: {
          batch: selectedBatchFilter !== "all" ? selectedBatchFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      }),
  });

  const {
    data: expensesRes,
    isLoading: isExpensesLoading,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["operationalExpenses", expenseCategoryFilter, expenseBatchFilter, expenseSearch, startDate, endDate],
    queryFn: () =>
      getOperationalExpensesServerAction({
        data: {
          category: expenseCategoryFilter !== "all" ? expenseCategoryFilter : undefined,
          batch_id: expenseBatchFilter !== "all" ? expenseBatchFilter : undefined,
          search: expenseSearch || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      }),
  });

  const balanceData = balanceRes?.data;
  const inflow = balanceData?.inflow;
  const outflow = balanceData?.outflow;
  const balance = balanceData?.balance;
  const expensesList: any[] = expensesRes?.data || [];

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => createOperationalExpenseServerAction({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("Pengeluaran operasional berhasil disimpan!");
        queryClient.invalidateQueries({ queryKey: ["financialBalanceSheet"] });
        queryClient.invalidateQueries({ queryKey: ["operationalExpenses"] });
        closeExpenseModal();
      } else {
        toast.error("Gagal menyimpan: " + (res?.error || "Terjadi kesalahan"));
      }
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data: any) => updateOperationalExpenseServerAction({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("Pengeluaran operasional berhasil diperbarui!");
        queryClient.invalidateQueries({ queryKey: ["financialBalanceSheet"] });
        queryClient.invalidateQueries({ queryKey: ["operationalExpenses"] });
        closeExpenseModal();
      } else {
        toast.error("Gagal memperbarui: " + (res?.error || "Terjadi kesalahan"));
      }
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => deleteOperationalExpenseServerAction({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("Pengeluaran berhasil dihapus");
        queryClient.invalidateQueries({ queryKey: ["financialBalanceSheet"] });
        queryClient.invalidateQueries({ queryKey: ["operationalExpenses"] });
        setDeletingExpenseId(null);
      } else {
        toast.error("Gagal menghapus: " + (res?.error || "Terjadi kesalahan"));
      }
    },
    onError: (err: any) => toast.error("Error: " + err.message),
  });

  const openAddExpenseModal = () => {
    setEditingExpense(null);
    setFormTitle("");
    setFormCategory("Packaging & Packing");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormBatchId("none");
    setFormNotes("");
    setFormReceiptUrl("");
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (item: any) => {
    setEditingExpense(item);
    setFormTitle(item.title || "");
    setFormCategory(item.category || "Packaging & Packing");
    setFormAmount(item.amount || 0);
    const dStr = item.expense_date ? new Date(item.expense_date).toISOString().split("T")[0] : "";
    setFormDate(dStr || new Date().toISOString().split("T")[0]);
    setFormBatchId(item.batch_id ? String(item.batch_id) : "none");
    setFormNotes(item.notes || "");
    setFormReceiptUrl(item.receipt_url || "");
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Format file harus berupa gambar (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setIsUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.url) {
        setFormReceiptUrl(json.url);
        toast.success("Foto struk/bukti berhasil diunggah!");
      } else {
        toast.error(json.error || "Gagal mengunggah foto bukti");
      }
    } catch (err: any) {
      toast.error("Gagal mengunggah foto: " + err.message);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Nama / Keperluan pengeluaran wajib diisi");
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      toast.error("Nominal pengeluaran harus lebih besar dari 0");
      return;
    }
    if (!formDate) {
      toast.error("Tanggal pengeluaran wajib diisi");
      return;
    }

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      amount: Number(formAmount),
      expense_date: formDate,
      batch_id: formBatchId !== "none" ? Number(formBatchId) : null,
      notes: formNotes.trim() || undefined,
      receipt_url: formReceiptUrl || undefined,
    };

    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, ...payload });
    } else {
      createExpenseMutation.mutate(payload);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!balanceData) return;

    const rows: string[][] = [];
    rows.push(["LAPORAN NERACA KEUANGAN & ARUS KAS FILKOM MERCH"]);
    rows.push([`Tanggal Cetak: ${new Date().toLocaleString("id-ID")}`]);
    rows.push([]);

    rows.push(["=== 1. RINGKASAN NERACA UTAMA ==="]);
    rows.push(["Indikator", "Nilai (Rp)"]);
    rows.push(["Potensi Pemasukan (Semisal Semua Lunas)", String(inflow?.potential_revenue || 0)]);
    rows.push(["Pemasukan Kas Riil Masuk", String(inflow?.realized_revenue || 0)]);
    rows.push(["Kekurangan Pemasukan / Piutang Belum Lunas", String(inflow?.unpaid_remaining || 0)]);
    rows.push(["Total Beban Kontrak Vendor", String(outflow?.vendoring?.total_contract || 0)]);
    rows.push(["Kas Keluar Vendor (Sudah Dibayar)", String(outflow?.vendoring?.total_paid || 0)]);
    rows.push(["Sisa Hutang Vendor", String(outflow?.vendoring?.total_unpaid || 0)]);
    rows.push(["Total Biaya Kebutuhan Operasional Manual", String(outflow?.operational?.total_amount || 0)]);
    rows.push(["Total Pengeluaran Realisasi (Kas Keluar)", String(outflow?.total_realized_expense || 0)]);
    rows.push(["Total Komitmen Pengeluaran", String(outflow?.total_committed_expense || 0)]);
    rows.push(["Saldo Kas Berjalan Saat Ini", String(balance?.current_net_cash || 0)]);
    rows.push(["Proyeksi Laba Bersih (Jika Semua Lunas)", String(balance?.projected_net_profit || 0)]);
    rows.push(["Proyeksi Margin Laba (%)", `${balance?.projected_profit_margin || 0}%`]);
    rows.push([]);

    rows.push(["=== 2. RINCIAN PEMASUKAN PER BATCH & READY STOCK ==="]);
    rows.push(["Sumber / Batch", "Total Pesanan", "Potensi Pemasukan", "Kas Riil Masuk", "Kurang / Piutang", "% Realisasi"]);
    (inflow?.batches || []).forEach((b: any) => {
      rows.push([
        b.name,
        String(b.total_orders),
        String(b.potential_revenue),
        String(b.realized_revenue),
        String(b.unpaid_remaining),
        `${b.settlement_rate}%`,
      ]);
    });
    rows.push([]);

    rows.push(["=== 3. RINCIAN PENGELUARAN VENDOR ==="]);
    rows.push(["No PO", "Vendor", "Total Kontrak", "Sudah Dibayar", "Sisa Hutang", "Status"]);
    (outflow?.vendoring?.orders || []).forEach((vo: any) => {
      rows.push([
        vo.po_number,
        vo.vendor_name || "-",
        String(vo.total_cost),
        String(vo.paid_cost),
        String(vo.unpaid_cost),
        vo.status,
      ]);
    });
    rows.push([]);

    rows.push(["=== 4. RINCIAN KEBUTUHAN LAIN & OPERASIONAL ==="]);
    rows.push(["Tanggal", "Nama Pengeluaran", "Kategori", "Terkait Batch", "Nominal", "Catatan"]);
    expensesList.forEach((e: any) => {
      rows.push([
        e.expense_date ? new Date(e.expense_date).toISOString().split("T")[0] : "-",
        e.title,
        e.category,
        e.batch_name || "Umum",
        String(e.amount),
        e.notes || "-",
      ]);
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows.map((r) => r.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Neraca_Keuangan_FILKOM_Merch_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan neraca keuangan berhasil diunduh dalam format CSV!");
  };

  const batches = inflow?.batches || [];

  return (
    <div className="flex flex-col min-h-screen bg-muted/20 pb-20">
      {/* HEADER SECTION */}
      <div className="border-b border-border bg-card px-4 sm:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Scale className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Neraca Keuangan & Arus Kas
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Kelola dan pantau seluruh pemasukan (PO Batch 1, Batch 2, Ready Stock), pengeluaran vendor, dan kebutuhan operasional toko.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchBalance();
                refetchExpenses();
                toast.success("Data neraca diperbarui");
              }}
              disabled={isBalanceLoading || isBalanceRefetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isBalanceRefetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Ekspor CSV</span>
            </Button>

            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Cetak</span>
            </Button>

            <Button size="sm" onClick={openAddExpenseModal} className="gap-2 bg-primary text-primary-foreground shadow">
              <Plus className="h-4 w-4" />
              <span>Tambah Pengeluaran</span>
            </Button>
          </div>
        </div>

        {/* QUICK FILTER BAR */}
        <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-border/60">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Cepat:</span>
          </div>

          {/* Batch Selector */}
          <div className="w-48">
            <Select value={selectedBatchFilter} onValueChange={setSelectedBatchFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Semua Batch PO" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PO & Ready Stock</SelectItem>
                {batches.map((b: any) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Dari:</span>
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Sampai:</span>
            <Input
              type="date"
              className="h-8 text-xs w-36"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {(startDate || endDate || selectedBatchFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSelectedBatchFilter("all");
                setStartDate("");
                setEndDate("");
              }}
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-6">
        {/* HERO KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Potensi Pemasukan */}
          <Card className="border border-border/80 shadow-sm relative overflow-hidden bg-card hover:border-primary/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Potensi Pemasukan
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">
                  Semisal Lunas
                </span>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {isBalanceLoading ? "Memuat..." : formatRupiah(inflow?.potential_revenue)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Realisasi: {formatRupiah(inflow?.realized_revenue)}</span>
                  <span className="font-semibold text-blue-600">{inflow?.settlement_rate || 0}%</span>
                </div>
                <Progress value={inflow?.settlement_rate || 0} className="h-1.5 bg-blue-100 dark:bg-blue-950/40" />
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Kurang {formatRupiah(inflow?.unpaid_remaining)} hingga lunas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 2. Kas Masuk Realisasi */}
          <Card className="border border-border/80 shadow-sm relative overflow-hidden bg-card hover:border-emerald-500/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Kas Masuk Diterima
                </span>
                <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-600">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {isBalanceLoading ? "Memuat..." : formatRupiah(inflow?.realized_revenue)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Pesanan Lunas:</span>
                  <span className="font-semibold text-foreground">{inflow?.paid_full_orders || 0} pesanan</span>
                </div>
                <div className="flex justify-between">
                  <span>DP Belum Lunas:</span>
                  <span className="font-semibold text-amber-600">{inflow?.dp_unpaid_orders || 0} pesanan</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Total Pengeluaran */}
          <Card className="border border-border/80 shadow-sm relative overflow-hidden bg-card hover:border-rose-500/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Pengeluaran
                </span>
                <div className="p-1 rounded-full bg-rose-500/10 text-rose-600">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                {isBalanceLoading ? "Memuat..." : formatRupiah(outflow?.total_realized_expense)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Vendor Dibayar:</span>
                  <span className="font-medium text-foreground">{formatRupiah(outflow?.vendoring?.total_paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kebutuhan Lain:</span>
                  <span className="font-medium text-foreground">{formatRupiah(outflow?.operational?.total_amount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-amber-600 pt-0.5">
                  <span>Sisa Hutang Vendor:</span>
                  <span>{formatRupiah(outflow?.vendoring?.total_unpaid)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Saldo Kas Berjalan Saat Ini */}
          <Card className="border border-border/80 shadow-sm relative overflow-hidden bg-card hover:border-indigo-500/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Saldo Kas Saat Ini
                </span>
                <Badge
                  variant={Number(balance?.current_net_cash || 0) >= 0 ? "default" : "destructive"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {Number(balance?.current_net_cash || 0) >= 0 ? "Surplus Kas" : "Defisit Kas"}
                </Badge>
              </div>
              <CardTitle
                className={`text-2xl font-bold tracking-tight mt-1 ${
                  Number(balance?.current_net_cash || 0) >= 0
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isBalanceLoading ? "Memuat..." : formatRupiah(balance?.current_net_cash)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Uang kas riil tersedia saat ini (Kas Masuk Diterima dikurangi Kas Keluar Vendor & Operasional).
              </p>
            </CardContent>
          </Card>

          {/* 5. Proyeksi Laba Bersih */}
          <Card className="border border-border/80 shadow-sm relative overflow-hidden bg-card hover:border-violet-500/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Proyeksi Laba Bersih
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600">
                  Margin {balance?.projected_profit_margin || 0}%
                </span>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400 mt-1">
                {isBalanceLoading ? "Memuat..." : formatRupiah(balance?.projected_net_profit)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-xs text-muted-foreground">
                Estimasi laba bersih akhir setelah semua pesanan lunas 100% dan seluruh kewajiban vendor terbayar.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* TABS NAVIGATION */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="inflow" className="gap-2 text-xs sm:text-sm">
                <Coins className="h-4 w-4 text-emerald-600" />
                <span>Pemasukan ({batches.length} Batch)</span>
              </TabsTrigger>
              <TabsTrigger value="outflow" className="gap-2 text-xs sm:text-sm">
                <TrendingDown className="h-4 w-4 text-rose-600" />
                <span>Pengeluaran & Kebutuhan</span>
              </TabsTrigger>
              <TabsTrigger value="balance" className="gap-2 text-xs sm:text-sm">
                <Scale className="h-4 w-4 text-primary" />
                <span>Neraca & Laba Rugi</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: PEMASUKAN (INFLOWS) */}
          <TabsContent value="inflow" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {batches.map((batch: any) => {
                const isReady = batch.id === "ready_stock";
                return (
                  <Card key={batch.id} className="border border-border/80 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={isReady ? "secondary" : "default"}>
                            {isReady ? "Ready Stock" : "Pre-Order"}
                          </Badge>
                          {batch.is_active && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                              Aktif
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">
                          {batch.total_orders} Pesanan
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold mt-1 text-foreground">
                        {batch.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Potensi vs Realisasi */}
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
                        <div>
                          <p className="text-[11px] text-muted-foreground font-medium">Potensi (Semua Lunas)</p>
                          <p className="text-base font-bold text-foreground mt-0.5">
                            {formatRupiah(batch.potential_revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground font-medium">Kas Masuk (Real)</p>
                          <p className="text-base font-bold text-emerald-600 mt-0.5">
                            {formatRupiah(batch.realized_revenue)}
                          </p>
                        </div>
                      </div>

                      {/* Outstanding remaining */}
                      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Kekurangan hingga Lunas:</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            {formatRupiah(batch.unpaid_remaining)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Realisasi Pelunasan:</span>
                            <span className="font-semibold text-foreground">{batch.settlement_rate}%</span>
                          </div>
                          <Progress value={batch.settlement_rate} className="h-1.5 bg-amber-100 dark:bg-amber-950/40" />
                        </div>
                      </div>

                      {/* Order Status Breakdown */}
                      <div className="text-xs space-y-1.5 pt-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Lunas Penuh (Full / LNS)
                          </span>
                          <span className="font-medium text-foreground">{batch.paid_full_orders} pesanan</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            DP Masuk (Kurang Pelunasan)
                          </span>
                          <span className="font-medium text-foreground">{batch.dp_unpaid_orders} pesanan</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-400" />
                            Belum Bayar (Pending)
                          </span>
                          <span className="font-medium text-foreground">{batch.unpaid_orders} pesanan</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40">
                        <Link
                          to="/admin/transactions"
                          className="flex items-center justify-center gap-1 text-xs text-primary font-medium hover:underline"
                        >
                          Lihat transaksi batch ini di menu Transaksi
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Inflow Summary Table */}
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-bold text-foreground">
                  Tabel Komparasi Pemasukan per Batch
                </CardTitle>
                <CardDescription>
                  Perbandingan potensi total (asumsi 100% lunas) dengan kas riil masuk dan sisa kekurangan per batch PO & Ready Stock.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Sumber Pemasukan</th>
                      <th className="py-3 px-4 font-semibold text-center">Total Pesanan</th>
                      <th className="py-3 px-4 font-semibold text-right">Potensi (Semua Lunas)</th>
                      <th className="py-3 px-4 font-semibold text-right text-emerald-600">Kas Masuk (Real)</th>
                      <th className="py-3 px-4 font-semibold text-right text-amber-600">Kurang / Piutang</th>
                      <th className="py-3 px-4 font-semibold text-center">% Realisasi</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batches.map((b: any) => (
                      <tr key={b.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-semibold text-foreground">{b.name}</td>
                        <td className="py-3 px-4 text-center">{b.total_orders}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatRupiah(b.potential_revenue)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          {formatRupiah(b.realized_revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-600">
                          {formatRupiah(b.unpaid_remaining)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[11px] bg-primary/10 text-primary">
                            {b.settlement_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {b.unpaid_remaining === 0 && b.potential_revenue > 0 ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-[10px]">
                              Lunas 100%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                              Menunggu Pelunasan
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Grand Total Row */}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border">
                      <td className="py-3.5 px-4 text-foreground">TOTAL KESELURUHAN</td>
                      <td className="py-3.5 px-4 text-center">{inflow?.total_orders || 0}</td>
                      <td className="py-3.5 px-4 text-right text-foreground">
                        {formatRupiah(inflow?.potential_revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600">
                        {formatRupiah(inflow?.realized_revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-amber-600">
                        {formatRupiah(inflow?.unpaid_remaining)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-primary">
                        {inflow?.settlement_rate || 0}%
                      </td>
                      <td className="py-3.5 px-4 text-center">-</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: PENGELUARAN & KEBUTUHAN (OUTFLOWS) */}
          <TabsContent value="outflow" className="space-y-6">
            {/* Top Overview Cards for Outflow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vendoring Box */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-5 w-5 text-indigo-600" />
                      <CardTitle className="text-base font-bold text-foreground">
                        Vendoring ke Vendor (PO & Produksi)
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-indigo-600 border-indigo-500/30">
                      {outflow?.vendoring?.orders_count || 0} SPK PO
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-lg bg-muted/40 border border-border/40">
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">Total Kontrak</p>
                      <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                        {formatRupiah(outflow?.vendoring?.total_contract)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">Sudah Dibayar</p>
                      <p className="text-sm sm:text-base font-bold text-emerald-600 mt-0.5">
                        {formatRupiah(outflow?.vendoring?.total_paid)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">Sisa Hutang</p>
                      <p className="text-sm sm:text-base font-bold text-amber-600 mt-0.5">
                        {formatRupiah(outflow?.vendoring?.total_unpaid)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Kebutuhan dana untuk melunasi vendor:</span>
                    <span className="font-bold text-foreground">{formatRupiah(outflow?.vendoring?.total_unpaid)}</span>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/admin/vendoring"
                      className="text-xs text-primary font-medium flex items-center justify-end gap-1 hover:underline"
                    >
                      Buka Modul Vendoring & SPK
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Operational Box */}
              <Card className="border border-border/80 shadow-sm">
                <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-rose-600" />
                      <CardTitle className="text-base font-bold text-foreground">
                        Kebutuhan Lain (Operasional Manual)
                      </CardTitle>
                    </div>
                    <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={openAddExpenseModal}>
                      <Plus className="h-3.5 w-3.5" />
                      Catat Pengeluaran
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-baseline justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Pengeluaran Manual:</p>
                      <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {formatRupiah(outflow?.operational?.total_amount)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {outflow?.operational?.count || 0} transaksi tercatat
                    </span>
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(outflow?.operational?.categories || []).map((cat: any) => (
                      <Badge
                        key={cat.category}
                        variant="secondary"
                        className="text-[11px] font-normal py-0.5 px-2 bg-muted hover:bg-muted/80"
                      >
                        <span className="font-medium mr-1">{cat.category}:</span>
                        <span className="font-semibold text-foreground">{formatRupiah(cat.amount)}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vendor Orders Contract List */}
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Daftar Kontrak PO Vendor
                    </CardTitle>
                    <CardDescription>
                      Daftar pesanan ke vendor mitra dan realisasi cicilan transfer yang telah dilakukan.
                    </CardDescription>
                  </div>
                  <Link to="/admin/vendoring">
                    <Button variant="outline" size="sm" className="text-xs gap-1.5">
                      Kelola Vendoring
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">No. PO</th>
                      <th className="py-2.5 px-4 font-semibold">Vendor Mitra</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Total Kontrak</th>
                      <th className="py-2.5 px-4 font-semibold text-right text-emerald-600">Sudah Dibayar</th>
                      <th className="py-2.5 px-4 font-semibold text-right text-amber-600">Sisa Tagihan</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Status Produksi</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Deadline</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(outflow?.vendoring?.orders || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-muted-foreground">
                          Belum ada kontrak PO vendor yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      (outflow?.vendoring?.orders || []).map((vo: any) => (
                        <tr key={vo.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 font-mono font-bold text-foreground">{vo.po_number}</td>
                          <td className="py-2.5 px-4 font-medium text-foreground">{vo.vendor_name || "-"}</td>
                          <td className="py-2.5 px-4 text-right font-medium">{formatRupiah(vo.total_cost)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                            {formatRupiah(vo.paid_cost)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-amber-600">
                            {formatRupiah(vo.unpaid_cost)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase ${
                                vo.status === "completed"
                                  ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                                  : vo.status === "in_production"
                                  ? "border-blue-500/30 text-blue-600 bg-blue-500/5"
                                  : "border-muted-foreground/30 text-muted-foreground"
                              }`}
                            >
                              {vo.status === "in_production" ? "Produksi" : vo.status === "completed" ? "Selesai" : vo.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-center text-muted-foreground">
                            {vo.deadline ? new Date(vo.deadline).toLocaleDateString("id-ID") : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Operational Expenses List (CRUD Table) */}
            <Card className="border border-border/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Buku Pengeluaran Kebutuhan Lain / Operasional
                    </CardTitle>
                    <CardDescription>
                      Catatan pengeluaran riil seperti lakban, bubble wrap, biaya ongkir, konsumsi, dan operasional lainnya.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={openAddExpenseModal} className="gap-1.5 self-start sm:self-auto">
                    <Plus className="h-4 w-4" />
                    Tambah Pengeluaran
                  </Button>
                </div>

                {/* Filter Controls for Operational Expenses */}
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari pengeluaran..."
                      className="pl-8 h-8 text-xs"
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                    />
                  </div>

                  <div className="w-44">
                    <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Semua Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kategori</SelectItem>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-40">
                    <Select value={expenseBatchFilter} onValueChange={setExpenseBatchFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Semua Batch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Alokasi</SelectItem>
                        {batches.map((b: any) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                      <th className="py-2.5 px-4 font-semibold">Keperluan / Nama Pengeluaran</th>
                      <th className="py-2.5 px-4 font-semibold">Kategori</th>
                      <th className="py-2.5 px-4 font-semibold">Alokasi Batch</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Nominal</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Bukti Struk</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expensesList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          {isExpensesLoading
                            ? "Memuat pengeluaran..."
                            : "Belum ada catatan pengeluaran manual. Klik '+ Tambah Pengeluaran' untuk mencatat."}
                        </td>
                      </tr>
                    ) : (
                      expensesList.map((item: any) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-4 whitespace-nowrap text-muted-foreground font-mono">
                            {item.expense_date ? new Date(item.expense_date).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="font-semibold text-foreground">{item.title}</p>
                            {item.notes && <p className="text-[11px] text-muted-foreground mt-0.5">{item.notes}</p>}
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge variant="secondary" className="text-[10px] font-medium">
                              {item.category}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {item.batch_name || "Umum / Ready Stock"}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                            {formatRupiah(item.amount)}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {item.receipt_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-primary gap-1"
                                onClick={() => setPreviewReceiptUrl(item.receipt_url)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Lihat
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditExpenseModal(item)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => setDeletingExpenseId(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: NERACA & LABA RUGI (FINANCIAL STATEMENT) */}
          <TabsContent value="balance" className="space-y-6">
            <Card className="border border-border/80 shadow-sm max-w-4xl mx-auto">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Laporan Neraca Keuangan & Laba Rugi
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      FILKOM Merch Official • Periode: {startDate ? startDate : "Awal"} s/d {endDate ? endDate : "Sekarang"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      Unduh CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                      <Printer className="h-3.5 w-3.5" />
                      Cetak Laporan
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* 1. BAGIAN PENDAPATAN / INFLOWS */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                      1. Pendapatan & Penjualan (Inflow)
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                      <span className="w-32 text-right">Potensi (Semua Lunas)</span>
                      <span className="w-32 text-right text-emerald-600">Realisasi (Kas Masuk)</span>
                    </div>
                  </div>

                  <div className="divide-y divide-border/40 text-xs">
                    {batches.map((b: any) => (
                      <div key={b.id} className="py-2.5 flex items-center justify-between hover:bg-muted/10">
                        <div className="flex-1 pr-4">
                          <p className="font-semibold text-foreground">{b.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {b.total_orders} pesanan • Kurang {formatRupiah(b.unpaid_remaining)} ({b.settlement_rate}% lunas)
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="w-32 text-right font-medium text-foreground">
                            {formatRupiah(b.potential_revenue)}
                          </span>
                          <span className="w-32 text-right font-bold text-emerald-600">
                            {formatRupiah(b.realized_revenue)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Subtotal Pemasukan */}
                    <div className="py-3 flex items-center justify-between font-bold bg-muted/30 px-2 rounded mt-2">
                      <span className="text-foreground">TOTAL PENDAPATAN KOTOR (GROSS)</span>
                      <div className="flex items-center gap-4">
                        <span className="w-32 text-right text-foreground">
                          {formatRupiah(inflow?.potential_revenue)}
                        </span>
                        <span className="w-32 text-right text-emerald-600">
                          {formatRupiah(inflow?.realized_revenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. BAGIAN BEBAN & PENGELUARAN / OUTFLOWS */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-border/80">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600">
                      2. Beban & Pengeluaran (Outflow)
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                      <span className="w-32 text-right">Komitmen Kontrak</span>
                      <span className="w-32 text-right text-rose-600">Realisasi (Kas Keluar)</span>
                    </div>
                  </div>

                  <div className="divide-y divide-border/40 text-xs">
                    {/* Vendoring Item */}
                    <div className="py-2.5 flex items-center justify-between hover:bg-muted/10">
                      <div className="flex-1 pr-4">
                        <p className="font-semibold text-foreground">Biaya Produksi Vendor (Vendoring)</p>
                        <p className="text-[11px] text-muted-foreground">
                          {outflow?.vendoring?.orders_count || 0} PO Vendor • Sisa hutang vendor {formatRupiah(outflow?.vendoring?.total_unpaid)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="w-32 text-right font-medium text-foreground">
                          {formatRupiah(outflow?.vendoring?.total_contract)}
                        </span>
                        <span className="w-32 text-right font-bold text-rose-600">
                          {formatRupiah(outflow?.vendoring?.total_paid)}
                        </span>
                      </div>
                    </div>

                    {/* Operational Categories Breakdown */}
                    {(outflow?.operational?.categories || []).map((cat: any) => (
                      <div key={cat.category} className="py-2 flex items-center justify-between hover:bg-muted/10">
                        <div className="flex-1 pr-4">
                          <p className="font-medium text-foreground">{cat.category}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="w-32 text-right font-medium text-muted-foreground">
                            {formatRupiah(cat.amount)}
                          </span>
                          <span className="w-32 text-right font-bold text-rose-600">
                            {formatRupiah(cat.amount)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Subtotal Pengeluaran */}
                    <div className="py-3 flex items-center justify-between font-bold bg-rose-500/5 px-2 rounded mt-2 border border-rose-500/20">
                      <span className="text-foreground">TOTAL BEBAN & PENGELUARAN</span>
                      <div className="flex items-center gap-4">
                        <span className="w-32 text-right text-foreground">
                          {formatRupiah(outflow?.total_committed_expense)}
                        </span>
                        <span className="w-32 text-right text-rose-600">
                          {formatRupiah(outflow?.total_realized_expense)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. BAGIAN RINGKASAN SALDO & LABA BERSIH */}
                <div className="pt-2">
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                      3. Neraca Akhir & Posisi Keuangan
                    </h3>

                    <div className="space-y-2 text-xs divide-y divide-border/60">
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-medium text-muted-foreground">Saldo Kas Berjalan Saat Ini (Cash Basis):</span>
                        <span
                          className={`text-base font-bold ${
                            Number(balance?.current_net_cash || 0) >= 0 ? "text-indigo-600" : "text-rose-600"
                          }`}
                        >
                          {formatRupiah(balance?.current_net_cash)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-muted-foreground">Piutang Pelanggan (Belum Lunas):</span>
                        <span className="font-bold text-amber-600">{formatRupiah(balance?.customer_receivables)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-muted-foreground">Hutang ke Vendor (Belum Dibayar):</span>
                        <span className="font-bold text-rose-600">{formatRupiah(balance?.vendor_payables)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
                        <div>
                          <p className="text-sm font-bold text-foreground">PROYEKSI LABA BERSIH (ACCRUAL BASIS)</p>
                          <p className="text-[11px] text-muted-foreground">
                            Estimasi keuntungan jika 100% pesanan lunas & seluruh vendor terlunasi
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-primary">
                            {formatRupiah(balance?.projected_net_profit)}
                          </p>
                          <p className="text-[11px] font-semibold text-emerald-600">
                            Profit Margin: {balance?.projected_profit_margin || 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL: TAMBAH / EDIT PENGELUARAN OPERASIONAL */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingExpense ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Catat biaya operasional manual seperti packaging, bubble wrap, ongkir, konsumsi, dan kebutuhan lainnya.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExpenseSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama / Keperluan Pengeluaran *</Label>
              <Input
                placeholder="Contoh: Lakban Fragile 5 Roll & Bubble Wrap 10m"
                className="text-xs"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Kategori *</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nominal (Rp) *</Label>
                <Input
                  type="number"
                  placeholder="Contoh: 125000"
                  className="text-xs"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Pengeluaran *</Label>
                <Input
                  type="date"
                  className="text-xs"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Alokasi Batch (Opsional)</Label>
                <Select value={formBatchId} onValueChange={setFormBatchId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih Batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      Umum / Ready Stock
                    </SelectItem>
                    {batches
                      .filter((b: any) => b.id !== "ready_stock")
                      .map((b: any) => (
                        <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan Tambahan (Opsional)</Label>
              <Textarea
                placeholder="Keterangan toko pembelian, nomor resi, atau person in charge..."
                className="text-xs resize-none h-16"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>

            {/* Foto Bukti Struk / Nota */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Foto Struk / Nota (Opsional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="text-xs cursor-pointer"
                  disabled={isUploadingReceipt}
                />
                {formReceiptUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs text-primary"
                    onClick={() => setPreviewReceiptUrl(formReceiptUrl)}
                  >
                    Lihat
                  </Button>
                )}
              </div>
              {isUploadingReceipt && (
                <p className="text-[11px] text-muted-foreground animate-pulse">Mengunggah foto bukti...</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={closeExpenseModal}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending || updateExpenseMutation.isPending ? "Menyimpan..." : "Simpan Pengeluaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: HAPUS PENGELUARAN KONFIRMASI */}
      <Dialog open={deletingExpenseId !== null} onOpenChange={() => setDeletingExpenseId(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">Hapus Pengeluaran?</DialogTitle>
            <DialogDescription className="text-xs">
              Catatan pengeluaran ini akan dihapus secara permanen dari neraca keuangan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingExpenseId(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deletingExpenseId && deleteExpenseMutation.mutate(deletingExpenseId)}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PREVIEW FOTO STRUK / BUKTI */}
      <Dialog open={previewReceiptUrl !== null} onOpenChange={() => setPreviewReceiptUrl(null)}>
        <DialogContent className="sm:max-w-lg p-3">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold">Bukti Pembelian / Struk</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2 bg-muted/40 rounded-lg">
            {previewReceiptUrl && (
              <img
                src={previewReceiptUrl}
                alt="Bukti Struk"
                className="max-h-[70vh] w-auto rounded object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPreviewReceiptUrl(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
