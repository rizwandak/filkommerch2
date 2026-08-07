import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  BarChart3,
  Users,
  ShoppingBag,
  DollarSign,
  Download,
  Search,
  Package,
  X,
} from "lucide-react";
import {
  getPreOrderCampaignsServerAction,
  createPreOrderCampaignServerAction,
  updatePreOrderCampaignServerAction,
  deletePreOrderCampaignServerAction,
  togglePreOrderCampaignActiveServerAction,
  getPreOrderCampaignStatsServerAction,
  type PreOrderCampaign,
} from "@backend/server-actions";

export const Route = createFileRoute("/admin/pre-order")({
  component: AdminPreOrderBatchPage,
});

function AdminPreOrderBatchPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PreOrderCampaign | null>(null);

  // Stats Modal state
  const [selectedBatchForStats, setSelectedBatchForStats] = useState<PreOrderCampaign | null>(null);
  const [statsTab, setStatsTab] = useState<"products" | "orders" | "connected">("products");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");

  // Form states
  const [batchName, setBatchName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [extendedEndDate, setExtendedEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Fetch campaigns
  const { data: campaignsRes, isLoading, refetch } = useQuery({
    queryKey: ["adminPreOrderCampaigns"],
    queryFn: () => getPreOrderCampaignsServerAction(),
  });

  const campaigns: PreOrderCampaign[] = campaignsRes?.data || [];

  // Fetch Stats for selected batch
  const { data: statsRes, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["preOrderCampaignStats", selectedBatchForStats?.id],
    queryFn: () =>
      selectedBatchForStats
        ? getPreOrderCampaignStatsServerAction({ data: { id: selectedBatchForStats.id } })
        : Promise.resolve(null),
    enabled: Boolean(selectedBatchForStats),
  });

  const statsData = statsRes?.data;

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => createPreOrderCampaignServerAction({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["adminPreOrderCampaigns"] });
        queryClient.invalidateQueries({ queryKey: ["activePreOrderCampaign"] });
        closeModal();
      } else {
        alert("Gagal membuat batch: " + (res?.error || res?.message));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updatePreOrderCampaignServerAction({ data: { id, ...data } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["adminPreOrderCampaigns"] });
        queryClient.invalidateQueries({ queryKey: ["activePreOrderCampaign"] });
        closeModal();
      } else {
        alert("Gagal memperbarui batch: " + (res?.error || res?.message));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePreOrderCampaignServerAction({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["adminPreOrderCampaigns"] });
        queryClient.invalidateQueries({ queryKey: ["activePreOrderCampaign"] });
      } else {
        alert("Gagal menghapus: " + (res?.error || res?.message));
      }
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      togglePreOrderCampaignActiveServerAction({ data: { id, is_active } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["adminPreOrderCampaigns"] });
        queryClient.invalidateQueries({ queryKey: ["activePreOrderCampaign"] });
      }
    },
  });

  const openCreateModal = () => {
    setEditingCampaign(null);
    setBatchName("");
    setStartDate("");
    setEndDate("");
    setExtendedEndDate("");
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (c: PreOrderCampaign) => {
    setEditingCampaign(c);
    setBatchName(c.batch_name);
    setStartDate(c.start_date ? c.start_date.substring(0, 16) : "");
    setEndDate(c.end_date ? c.end_date.substring(0, 16) : "");
    setExtendedEndDate(c.extended_end_date ? c.extended_end_date.substring(0, 16) : "");
    setIsActive(Boolean(c.is_active));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
  };

  const openStatsModal = (c: PreOrderCampaign) => {
    setSelectedBatchForStats(c);
    setStatsTab("products");
    setOrderSearchQuery("");
  };

  const closeStatsModal = () => {
    setSelectedBatchForStats(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName || !startDate || !endDate) {
      alert("Nama batch, tanggal mulai, dan tanggal selesai wajib diisi!");
      return;
    }

    const payload = {
      batch_name: batchName,
      start_date: startDate,
      end_date: endDate,
      extended_end_date: extendedEndDate || null,
      is_active: isActive,
    };

    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleExportCSV = () => {
    if (!statsData?.orders || !selectedBatchForStats) return;

    const headers = [
      "No Order",
      "Tanggal Order",
      "Nama Pembeli",
      "Email Pembeli",
      "No HP Pembeli",
      "NIM Pembeli",
      "Rincian Produk (Item / Size / Qty)",
      "Status Pembayaran",
      "Status Pesanan",
      "Total Bayar (Rp)"
    ];

    const rows = statsData.orders.map((o: any) => {
      const itemsFormatted = o.items.map((i: any) => {
        const variantText = [i.size, i.color].filter(Boolean).filter((x: string) => x !== "-").join("/");
        return `${i.product_name}${variantText ? ` [${variantText}]` : ''} (x${i.quantity})`;
      }).join(" | ");

      const dateStr = o.created_at ? new Date(o.created_at).toLocaleString("id-ID") : "-";

      return [
        `"${o.order_id}"`,
        `"${dateStr}"`,
        `"${o.customer_name}"`,
        `"${o.customer_email}"`,
        `"${o.customer_phone}"`,
        `"${o.customer_nim}"`,
        `"${itemsFormatted.replace(/"/g, '""')}"`,
        `"${o.payment_status}"`,
        `"${o.order_status}"`,
        `"${o.grand_total}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_PreOrder_${selectedBatchForStats.batch_name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (dtStr?: string) => {
    if (!dtStr) return "-";
    try {
      const date = new Date(dtStr);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  const getPhaseBadge = (c: PreOrderCampaign) => {
    if (!c.is_active) {
      return (
        <span className="inline-flex items-center gap-1 bg-neutral-200 text-neutral-700 text-xs px-2.5 py-1 rounded-full font-bold">
          <Clock className="w-3 h-3" /> NONAKTIF
        </span>
      );
    }

    const now = new Date();
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    const ext = c.extended_end_date ? new Date(c.extended_end_date) : null;

    if (now < start) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">
          <Clock className="w-3 h-3" /> AKAN DATANG (UPCOMING)
        </span>
      );
    }

    if (now >= start && now < end) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
          <CheckCircle2 className="w-3 h-3" /> BERJALAN (ACTIVE)
        </span>
      );
    }

    if (ext && now >= end && now < ext) {
      return (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-bold">
          <Sparkles className="w-3 h-3" /> DIPERPANJANG (EXTENDED)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-bold">
        <AlertCircle className="w-3 h-3" /> DITUTUP (CLOSED)
      </span>
    );
  };

  // Filtered orders for stats modal
  const filteredOrders = (statsData?.orders || []).filter((o: any) => {
    if (!orderSearchQuery.trim()) return true;
    const q = orderSearchQuery.toLowerCase();
    return (
      o.order_id?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.customer_nim?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background border-2 border-ink p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-brand-orange uppercase mb-1">
            <Calendar className="w-4 h-4" /> PRE-ORDER CAMPAIGN MANAGEMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink uppercase tracking-wide">
            Kelola Batch Pre-Order
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Atur periode tanggal buka, tutup, dan perpanjangan waktu batch pre-order toko serta pantau data analitik pembeli.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="p-3 bg-secondary hover:bg-neutral-200 border-2 border-ink rounded-xl text-ink font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-brand-orange hover:bg-ink text-cream font-bold text-xs uppercase tracking-wider rounded-xl border-2 border-ink transition-all cursor-pointer flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]"
          >
            <Plus className="w-4 h-4" /> TAMBAH BATCH BARU
          </button>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-background border-2 border-ink rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
        <div className="p-4 bg-cream border-b-2 border-ink font-bold text-xs uppercase tracking-widest text-ink flex items-center justify-between">
          <span>Daftar Batch Pre-Order</span>
          <span className="text-muted-foreground">Total: {campaigns.length} Batch</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-xs font-bold animate-pulse">
            Memuat data batch pre-order...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Calendar className="w-10 h-10 text-brand-orange mx-auto opacity-50" />
            <div className="text-sm font-bold text-ink uppercase">Belum Ada Batch Pre-Order</div>
            <p className="text-xs max-w-md mx-auto">
              Silakan buat batch pre-order baru untuk mengaktifkan penjualan pre-order di katalog website.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b-2 border-ink text-ink font-extrabold uppercase">
                  <th className="p-4">Nama Batch</th>
                  <th className="p-4">Status &amp; Fase</th>
                  <th className="p-4">Tgl Mulai</th>
                  <th className="p-4">Tgl Selesai Normal</th>
                  <th className="p-4">Tgl Perpanjangan (Extended)</th>
                  <th className="p-4 text-right">Aksi &amp; Laporan</th>
                </tr>
              </thead>
              <tbody className="divide-y border-ink/10">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-cream/40 transition-colors">
                    <td className="p-4 font-bold text-ink text-sm">
                      {c.batch_name}
                      {c.is_active && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-cream text-[9px] font-black rounded uppercase">
                          AKTIF DI FRONTEND
                        </span>
                      )}
                    </td>
                    <td className="p-4">{getPhaseBadge(c)}</td>
                    <td className="p-4 font-medium">{formatDateTime(c.start_date)}</td>
                    <td className="p-4 font-medium">{formatDateTime(c.end_date)}</td>
                    <td className="p-4 font-medium text-brand-orange">
                      {c.extended_end_date ? formatDateTime(c.extended_end_date) : "-"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openStatsModal(c)}
                          className="px-3 py-1.5 rounded-lg border-2 border-ink bg-brand-orange text-cream hover:bg-ink font-extrabold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          title="Lihat Laporan & Detail Batch"
                        >
                          <BarChart3 className="w-3.5 h-3.5" /> Laporan &amp; Detail
                        </button>
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({ id: c.id, is_active: !c.is_active })
                          }
                          className={`px-3 py-1.5 rounded-lg border border-ink text-[11px] font-bold transition-all cursor-pointer ${
                            c.is_active
                              ? "bg-rose-100 hover:bg-rose-200 text-rose-800"
                              : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                          }`}
                        >
                          {c.is_active ? "Nonaktifkan" : "Set Aktif"}
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg border border-ink bg-cream hover:bg-brand-orange hover:text-cream transition-all cursor-pointer"
                          title="Edit Batch"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus batch "${c.batch_name}"?`)) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-ink bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white transition-all cursor-pointer"
                          title="Hapus Batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-background border-4 border-ink rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] relative">
            <h2 className="text-xl font-extrabold text-ink uppercase tracking-wide border-b-2 border-ink pb-3">
              {editingCampaign ? "Edit Batch Pre-Order" : "Tambah Batch Pre-Order Baru"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  Nama Batch Pre-Order *
                </label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Contoh: Batch #2 Official Drop"
                  className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange bg-cream/30"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Tanggal Buka (Start) *
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none bg-cream/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Tanggal Tutup Normal (End) *
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none bg-cream/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  Tanggal Perpanjangan (Extended End Date - Opsional)
                </label>
                <input
                  type="datetime-local"
                  value={extendedEndDate}
                  onChange={(e) => setExtendedEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none bg-cream/30"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Isi jika ingin memperpanjang countdown batch secara otomatis setelah periode normal berakhir.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-brand-orange border-2 border-ink rounded cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-ink uppercase cursor-pointer">
                  Aktifkan batch ini di katalog website sekarang
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-ink">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border-2 border-ink rounded-xl text-xs font-bold text-ink hover:bg-neutral-200 transition-colors uppercase"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2.5 bg-brand-orange hover:bg-ink text-cream font-bold text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics & Batch Report Modal */}
      {selectedBatchForStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-background border-4 border-ink rounded-2xl w-full max-w-5xl my-8 p-6 sm:p-8 space-y-6 shadow-[10px_10px_0px_0px_rgba(27,27,27,1)] relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b-2 border-ink pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-brand-orange text-cream text-[10px] font-black rounded uppercase tracking-wider">
                    PO BATCH REPORT
                  </span>
                  {getPhaseBadge(selectedBatchForStats)}
                </div>
                <h2 className="text-2xl font-black text-ink uppercase tracking-wide mt-1">
                  {selectedBatchForStats.batch_name}
                </h2>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Periode PO: {formatDateTime(selectedBatchForStats.start_date)} s/d {formatDateTime(selectedBatchForStats.end_date)}
                </p>
              </div>
              <button
                onClick={closeStatsModal}
                className="p-2 border-2 border-ink rounded-xl bg-cream hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isStatsLoading ? (
              <div className="p-16 text-center text-muted-foreground text-xs font-bold animate-pulse space-y-2">
                <RefreshCw className="w-8 h-8 text-brand-orange animate-spin mx-auto" />
                <p>Memuat statistik &amp; data transaksi batch...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4 Summary Stats KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-orange-50/60 border-2 border-brand-orange p-4 rounded-xl space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-brand-orange text-xs font-black uppercase">
                      <span>Total Omset PO</span>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-ink">
                      Rp {Number(statsData?.summary?.total_revenue || 0).toLocaleString("id-ID")}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">Dari transaksi terbayar</p>
                  </div>

                  <div className="bg-blue-50/60 border-2 border-brand-blue p-4 rounded-xl space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-brand-blue text-xs font-black uppercase">
                      <span>Terjual</span>
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-ink">
                      {statsData?.summary?.total_units_sold || 0} <span className="text-xs text-muted-foreground">unit</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">Total akumulasi pcs produk</p>
                  </div>

                  <div className="bg-emerald-50/60 border-2 border-emerald-600 p-4 rounded-xl space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-700 text-xs font-black uppercase">
                      <span>Total Transaksi</span>
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-ink">
                      {statsData?.summary?.total_orders || 0} <span className="text-xs text-muted-foreground">pesanan</span>
                    </div>
                    <p className="text-[10px] text-emerald-800 font-bold">
                      {statsData?.summary?.paid_orders_count || 0} Lunas • {statsData?.summary?.pending_orders_count || 0} Pending
                    </p>
                  </div>

                  <div className="bg-purple-50/60 border-2 border-purple-600 p-4 rounded-xl space-y-1 shadow-xs">
                    <div className="flex items-center justify-between text-purple-700 text-xs font-black uppercase">
                      <span>Total Pembeli</span>
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-ink">
                      {statsData?.summary?.total_buyers || 0} <span className="text-xs text-muted-foreground">orang</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium">Pembeli unik terdaftar</p>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b-2 border-ink pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStatsTab("products")}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-ink ${
                        statsTab === "products"
                          ? "bg-brand-orange text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          : "bg-cream text-ink hover:bg-neutral-200"
                      }`}
                    >
                      📦 Breakdown Produk ({statsData?.product_breakdown?.length || 0})
                    </button>
                    <button
                      onClick={() => setStatsTab("orders")}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-ink ${
                        statsTab === "orders"
                          ? "bg-brand-orange text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          : "bg-cream text-ink hover:bg-neutral-200"
                      }`}
                    >
                      👥 Daftar Pembeli ({statsData?.orders?.length || 0})
                    </button>
                    <button
                      onClick={() => setStatsTab("connected")}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-ink ${
                        statsTab === "connected"
                          ? "bg-brand-orange text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          : "bg-cream text-ink hover:bg-neutral-200"
                      }`}
                    >
                      🏷️ Katalog Produk ({statsData?.connected_products?.length || 0})
                    </button>
                  </div>

                  {statsTab === "orders" && (
                    <button
                      onClick={handleExportCSV}
                      disabled={!statsData?.orders || statsData.orders.length === 0}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold uppercase rounded-xl border-2 border-ink flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                    >
                      <Download className="w-4 h-4" /> Export CSV / Excel
                    </button>
                  )}
                </div>

                {/* Tab 1: Product Breakdown */}
                {statsTab === "products" && (
                  <div className="space-y-4">
                    {statsData?.product_breakdown?.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-xs font-bold border-2 border-dashed border-ink/30 rounded-xl">
                        Belum ada penjualan produk terakumulasi dalam batch ini.
                      </div>
                    ) : (
                      <div className="border-2 border-ink rounded-xl overflow-hidden bg-background">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-cream border-b-2 border-ink text-ink font-black uppercase">
                              <th className="p-3">Produk</th>
                              <th className="p-3">Harga Satuan</th>
                              <th className="p-3">Total Qty Terjual</th>
                              <th className="p-3">Rincian Varian / Ukuran</th>
                              <th className="p-3 text-right">Subtotal Omset</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y border-ink/10">
                            {statsData?.product_breakdown?.map((p: any) => (
                              <tr key={p.product_id} className="hover:bg-cream/30">
                                <td className="p-3 font-bold text-ink">
                                  <div className="flex items-center gap-2.5">
                                    {p.image_url ? (
                                      <img
                                        src={p.image_url}
                                        alt={p.name}
                                        className="w-9 h-9 rounded object-cover border border-ink/30 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded bg-cream border border-ink/30 shrink-0" />
                                    )}
                                    <span className="text-xs font-extrabold">{p.name}</span>
                                  </div>
                                </td>
                                <td className="p-3 font-semibold">
                                  Rp {Number(p.unit_price || 0).toLocaleString("id-ID")}
                                </td>
                                <td className="p-3 font-black text-brand-orange text-sm">
                                  {p.total_qty} pcs
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(p.variants || {}).map(([vName, vQty]) => (
                                      <span
                                        key={vName}
                                        className="px-2 py-0.5 bg-neutral-100 border border-ink/20 rounded font-bold text-[10px] text-ink"
                                      >
                                        {vName}: <strong>{String(vQty)}</strong>
                                      </span>
                                    ))}
                                    {Object.keys(p.variants || {}).length === 0 && (
                                      <span className="text-muted-foreground italic text-[11px]">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right font-black text-ink">
                                  Rp {Number(p.total_subtotal || 0).toLocaleString("id-ID")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Customer / Orders List */}
                {statsTab === "orders" && (
                  <div className="space-y-4">
                    {/* Search filter */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <input
                        type="text"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="Cari pembeli berdasarkan nama, email, no HP, NIM, atau No. Order..."
                        className="w-full pl-9 pr-4 py-2.5 border-2 border-ink rounded-xl text-xs font-medium bg-cream/30 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                      />
                    </div>

                    {filteredOrders.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-xs font-bold border-2 border-dashed border-ink/30 rounded-xl">
                        Tidak ada transaksi pembeli ditemukan.
                      </div>
                    ) : (
                      <div className="border-2 border-ink rounded-xl overflow-x-auto bg-background">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-cream border-b-2 border-ink text-ink font-black uppercase">
                              <th className="p-3">No. Order / Tgl</th>
                              <th className="p-3">Data Pembeli</th>
                              <th className="p-3">Produk &amp; Varian Dipesan</th>
                              <th className="p-3">Status Bayar</th>
                              <th className="p-3 text-right">Total Bayar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y border-ink/10">
                            {filteredOrders.map((o: any) => (
                              <tr key={o.order_id} className="hover:bg-cream/30">
                                <td className="p-3 align-top font-bold text-ink">
                                  <div className="font-extrabold text-brand-orange">{o.order_id}</div>
                                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                    {formatDateTime(o.created_at)}
                                  </div>
                                </td>
                                <td className="p-3 align-top">
                                  <div className="font-extrabold text-ink">{o.customer_name}</div>
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    📧 {o.customer_email}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    📞 {o.customer_phone} {o.customer_nim !== "-" ? `• NIM: ${o.customer_nim}` : ""}
                                  </div>
                                </td>
                                <td className="p-3 align-top">
                                  <div className="space-y-1">
                                    {o.items.map((item: any, idx: number) => (
                                      <div key={idx} className="text-xs font-bold text-ink flex items-center justify-between gap-2 border-b border-dashed border-ink/10 pb-1">
                                        <span>
                                          {item.product_name}{" "}
                                          <span className="text-[10px] text-brand-orange font-mono">
                                            ({[item.size, item.color].filter(Boolean).filter((x: string) => x !== "-").join("/")})
                                          </span>
                                        </span>
                                        <span className="text-xs font-black shrink-0">x{item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-3 align-top">
                                  <span
                                    className={`px-2 py-1 rounded text-[10px] font-black uppercase inline-block ${
                                      o.payment_status === "paid" || o.payment_status === "settlement"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : "bg-amber-100 text-amber-900 border border-amber-300"
                                    }`}
                                  >
                                    {o.payment_status === "settlement" ? "PAID" : o.payment_status?.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-3 align-top text-right font-black text-ink text-sm">
                                  Rp {Number(o.grand_total || 0).toLocaleString("id-ID")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Connected Products */}
                {statsTab === "connected" && (
                  <div className="space-y-4">
                    {statsData?.connected_products?.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-xs font-bold border-2 border-dashed border-ink/30 rounded-xl">
                        Belum ada produk katalog yang dihubungkan ke batch PO ini. Ubah skema penjualan produk di menu Produk untuk menghubungkan.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {statsData?.connected_products?.map((p: any) => (
                          <div
                            key={p.id}
                            className="border-2 border-ink p-4 rounded-xl bg-white space-y-3 flex items-start gap-3 shadow-xs"
                          >
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-14 h-14 rounded-lg object-cover border border-ink/30 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-cream border border-ink/30 shrink-0" />
                            )}
                            <div className="space-y-1">
                              <h4 className="font-extrabold text-xs text-ink line-clamp-1">{p.name}</h4>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                                {p.category_name || "Kategori"}
                              </p>
                              <div className="text-xs font-black text-brand-orange">
                                Rp {Number(p.price).toLocaleString("id-ID")}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
