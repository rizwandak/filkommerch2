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
  Upload,
  FileText,
} from "lucide-react";
import {
  getPreOrderCampaignsServerAction,
  createPreOrderCampaignServerAction,
  updatePreOrderCampaignServerAction,
  deletePreOrderCampaignServerAction,
  togglePreOrderCampaignActiveServerAction,
  getPreOrderCampaignStatsServerAction,
  importOrdersServerAction,
  deleteImportedOrdersServerAction,
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

  // CSV Import Modal state
  const [selectedCampaignForImport, setSelectedCampaignForImport] = useState<PreOrderCampaign | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [cleanReimport, setCleanReimport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const openImportModal = (c: PreOrderCampaign) => {
    setSelectedCampaignForImport(c);
    setImportFileName("");
    setParsedImportRows([]);
    setCleanReimport(false);
  };

  const closeImportModal = () => {
    setSelectedCampaignForImport(null);
    setImportFileName("");
    setParsedImportRows([]);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        let text = (evt.target?.result as string) || "";
        if (!text) return;
        text = text.replace(/^\uFEFF/, "");

        // Parse CSV robustly
        const lines: string[] = [];
        let currentLine = "";
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
            inQuotes = !inQuotes;
            currentLine += char;
          } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (currentLine.trim()) {
              lines.push(currentLine);
            }
            currentLine = "";
            if (char === '\r' && text[i + 1] === '\n') i++;
          } else {
            currentLine += char;
          }
        }
        if (currentLine.trim()) lines.push(currentLine);

        if (lines.length <= 1) {
          alert("File CSV kosong atau tidak memiliki data!");
          return;
        }

        const parseCsvLine = (lineStr: string) => {
          const cells: string[] = [];
          let currentCell = "";
          let inside = false;
          for (let i = 0; i < lineStr.length; i++) {
            const ch = lineStr[i];
            if (ch === '"') {
              if (inside && lineStr[i + 1] === '"') {
                currentCell += '"';
                i++;
              } else {
                inside = !inside;
              }
            } else if (ch === ',' && !inside) {
              cells.push(currentCell.trim());
              currentCell = "";
            } else {
              currentCell += ch;
            }
          }
          cells.push(currentCell.trim());
          return cells;
        };

        const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
        const dataRows: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          const rowVals = parseCsvLine(lines[i]).map((v) => v.replace(/^"|"$/g, "").trim());
          if (rowVals.length === 0 || (rowVals.length === 1 && !rowVals[0])) continue;

          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = rowVals[idx] || "";
          });
          dataRows.push(rowObj);
        }

        setParsedImportRows(dataRows);
      } catch (err: any) {
        alert("Gagal membaca file CSV: " + err.message);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleExecuteImport = async () => {
    if (!selectedCampaignForImport || parsedImportRows.length === 0) {
      alert("Pilih file CSV yang valid terlebih dahulu!");
      return;
    }

    try {
      setIsImporting(true);
      const res = await importOrdersServerAction({
        data: {
          campaignId: selectedCampaignForImport.id,
          cleanReimport,
          rows: parsedImportRows,
        },
      });

      if (res?.success) {
        alert(`Sukses! ${res.message || "Data CSV berhasil di-import."}`);
        queryClient.invalidateQueries({ queryKey: ["adminPreOrderCampaigns"] });
        queryClient.invalidateQueries({ queryKey: ["preOrderCampaignStats"] });
        queryClient.invalidateQueries({ queryKey: ["productionSummary"] });
        queryClient.invalidateQueries({ queryKey: ["financialOverview"] });
        closeImportModal();
      } else {
        alert(`Gagal meng-import: ${res?.error || "Terjadi kesalahan server"}`);
      }
    } catch (err: any) {
      alert(`Gagal meng-import: ${err.message || "Terjadi kesalahan"}`);
    } finally {
      setIsImporting(false);
    }
  };

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

  const deleteImportMutation = useMutation({
    mutationFn: (campaignId: number) => deleteImportedOrdersServerAction({ data: campaignId }),
    onSuccess: (res: any) => {
      if (res?.success) {
        alert(`Sukses! ${res.message || "Data import batch ini berhasil dihapus."}`);
        queryClient.invalidateQueries({ queryKey: ["adminPreOrderCampaigns"] });
        queryClient.invalidateQueries({ queryKey: ["preOrderCampaignStats"] });
        queryClient.invalidateQueries({ queryKey: ["productionSummary"] });
        queryClient.invalidateQueries({ queryKey: ["financialOverview"] });
        setParsedImportRows([]);
        setImportFileName("");
      } else {
        alert("Gagal menghapus data import: " + (res?.error || res?.message));
      }
    },
  });

  const handleDeleteImport = () => {
    if (!selectedCampaignForImport) return;
    if (confirm("Apakah Anda yakin ingin menghapus semua data pesanan yang berasal dari file CSV untuk batch ini? Tindakan ini tidak dapat dibatalkan!")) {
      deleteImportMutation.mutate(selectedCampaignForImport.id);
    }
  };

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
                      {Boolean(c.is_active) && (
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
                          onClick={() => openImportModal(c)}
                          className="px-3 py-1.5 rounded-lg border-2 border-ink bg-blue-600 text-white hover:bg-ink font-extrabold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          title="Import Data Transaksi CSV ke Batch Ini"
                        >
                          <Upload className="w-3.5 h-3.5" /> Import CSV
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
                    {Number(statsData?.summary?.total_discount || 0) > 0 ? (
                      <div className="text-[11px] font-semibold text-stone-700 pt-1.5 border-t border-orange-200/90 mt-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Kotor (Subtotal):</span>
                          <span className="font-bold">Rp {Number(statsData?.summary?.total_subtotal || 0).toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600">
                          <span>Diskon Voucher:</span>
                          <span className="font-bold">- Rp {Number(statsData?.summary?.total_discount || 0).toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-medium">Dari transaksi terbayar</p>
                    )}
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
                      Breakdown Produk ({statsData?.product_breakdown?.length || 0})
                    </button>
                    <button
                      onClick={() => setStatsTab("orders")}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-ink ${
                        statsTab === "orders"
                          ? "bg-brand-orange text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          : "bg-cream text-ink hover:bg-neutral-200"
                      }`}
                    >
                      Daftar Pembeli ({statsData?.orders?.length || 0})
                    </button>
                    <button
                      onClick={() => setStatsTab("connected")}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-ink ${
                        statsTab === "connected"
                          ? "bg-brand-orange text-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                          : "bg-cream text-ink hover:bg-neutral-200"
                      }`}
                    >
                      Katalog Produk ({statsData?.connected_products?.length || 0})
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
                                <td className="p-3 font-bold text-xs">
                                  <div className="font-black text-brand-orange text-sm">
                                    {p.total_qty} pcs
                                  </div>
                                  {p.bundle_qty > 0 ? (
                                    <div className="text-[10px] space-y-0.5 mt-0.5">
                                      <span className="text-muted-foreground">
                                        Langsung: <strong className="text-ink">{p.direct_qty} pcs</strong>
                                      </span>
                                      <div className="text-blue-700 font-black flex items-center gap-1">
                                        <span>+{p.bundle_qty} pcs (Bundle)</span>
                                      </div>
                                      {Object.entries(p.bundle_source_breakdown || {}).map(([bName, bQty]) => (
                                        <div key={bName} className="text-[9px] text-neutral-600 pl-1.5 font-medium">
                                          • {bName}: <strong className="text-ink">{String(bQty)} pcs</strong>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground font-medium">Penjualan Langsung</span>
                                  )}
                                </td>
                                <td className="p-3 space-y-2">
                                   {/* Block 1: Direct Purchase Variants */}
                                   {Object.keys(p.direct_variants || {}).length > 0 && (
                                     <div className="space-y-1">
                                       {p.bundle_qty > 0 && (
                                         <div className="text-[9px] font-black uppercase text-neutral-500 tracking-wider">
                                           PENJUALAN LANGSUNG ({p.direct_qty} PCS):
                                         </div>
                                       )}
                                       <div className="flex flex-wrap gap-1">
                                         {Object.entries(p.direct_variants || {}).map(([vName, vQty]) => (
                                           <span
                                             key={vName}
                                             className="px-2 py-0.5 bg-neutral-100 border border-ink/20 rounded font-bold text-[10px] text-ink"
                                           >
                                             {vName}: <strong>{String(vQty)}</strong>
                                           </span>
                                         ))}
                                       </div>
                                     </div>
                                   )}

                                   {/* Block 2: Bundle Purchase Variants */}
                                   {p.bundle_qty > 0 && (
                                     <div className="space-y-1 pt-1.5 border-t border-ink/10">
                                       <div className="text-[9px] font-black uppercase text-blue-700 tracking-wider">
                                         DARI PAKET BUNDLE (+{p.bundle_qty} PCS):
                                       </div>
                                       <div className="flex flex-wrap gap-1">
                                         {Object.entries(p.bundle_variants || p.bundle_source_breakdown || {}).map(([bName, bQty]) => (
                                           <span
                                             key={bName}
                                             className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-300 rounded font-bold text-[10px]"
                                           >
                                             {bName}: <strong>{String(bQty)}</strong>
                                           </span>
                                         ))}
                                       </div>
                                     </div>
                                   )}

                                   {/* Fallback if no variants */}
                                   {Object.keys(p.direct_variants || {}).length === 0 && p.bundle_qty === 0 && (
                                     <span className="text-muted-foreground italic text-[11px]">-</span>
                                   )}
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
      {/* CSV IMPORT MODAL */}
      {selectedCampaignForImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#fcfaf8] border-[3px] border-ink rounded-xl w-full max-w-4xl my-8 p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b-2 border-ink pb-4">
              <div>
                <span className="px-3 py-1 bg-blue-600 text-white text-[11px] font-black rounded uppercase tracking-wider">
                  IMPORT CSV PESANAN BATCH
                </span>
                <h2 className="text-4xl font-black text-ink uppercase mt-2 font-display tracking-tight">
                  IMPORT KE {selectedCampaignForImport.batch_name.toUpperCase()}
                </h2>
                <p className="text-sm text-neutral-600 font-medium mt-1">
                  Upload file CSV (format standar export 10-kolom atau 8-kolom) untuk memasukkan transaksi historis.
                </p>
              </div>
              <button
                onClick={closeImportModal}
                className="p-1.5 border-2 border-ink rounded-lg bg-white hover:bg-neutral-100 transition-all cursor-pointer shadow-sm"
              >
                <X className="w-6 h-6 text-ink" />
              </button>
            </div>

            {/* File Picker Dropzone */}
            <div className="border-[2px] border-dashed border-ink p-10 rounded-xl text-center space-y-4 relative bg-transparent">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex justify-center">
                <div className="text-brand-orange">
                  <FileText className="w-12 h-12" />
                </div>
              </div>
              
              <div className="flex justify-center">
                <button className="px-6 py-2.5 bg-brand-orange text-white font-bold text-sm uppercase rounded-lg border-[3px] border-ink shadow-[4px_4px_0px_0px_#1b1b1b] pointer-events-none">
                  PILIH FILE CSV...
                </button>
              </div>

              {importFileName && (
                <div className="text-sm font-bold text-ink mt-2">
                  📄 File terpilih: <span className="text-brand-blue font-mono">{importFileName}</span>
                </div>
              )}

              <p className="text-xs text-neutral-500 font-medium max-w-2xl mx-auto pt-2">
                Format kolom: No Order, Tanggal Order, Nama Pembeli, Email, No HP, NIM, Rincian Produk, Status Bayar, Status Pesanan, Total Bayar.
              </p>
            </div>

            {/* Preview Table */}
            {parsedImportRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs text-ink uppercase tracking-wider">
                    Preview Data ({parsedImportRows.length} Pesanan SIAP DI-IMPORT):
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    ✓ Valid Format
                  </span>
                </div>

                <div className="border-2 border-ink rounded-xl overflow-hidden bg-white">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-cream border-b-2 border-ink text-ink font-black uppercase">
                          <th className="p-2.5 w-20">No Order</th>
                          <th className="p-2.5">Pembeli</th>
                          <th className="p-2.5">No HP / NIM</th>
                          <th className="p-2.5">Rincian Produk</th>
                          <th className="p-2.5 text-right">Total Bayar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/10">
                        {parsedImportRows.slice(0, 10).map((r: any, idx: number) => {
                          const orderId = r["No Order"] || r.no_order || r.order_id || `Row ${idx + 1}`;
                          const buyer = r["Nama Pembeli"] || r.nama_pembeli || r.customer_name || "-";
                          const phone = r["No HP Pembeli"] || r.no_hp_pembeli || r.customer_phone || "";
                          const nim = r["NIM Pembeli"] || r.nim_pembeli || r.customer_nim || "";
                          const items = r["Rincian Produk (Item / Size / Qty)"] || r.rincian_produk || r.items_formatted || "-";
                          const total = r["Total Bayar (Rp)"] || r.total_bayar || r.grand_total || "0";

                          return (
                            <tr key={idx} className="hover:bg-cream/30">
                              <td className="p-2.5 font-bold text-ink font-mono">{orderId}</td>
                              <td className="p-2.5 font-bold text-ink">{buyer}</td>
                              <td className="p-2.5 font-mono text-[11px]">
                                {phone} {nim ? `(${nim})` : ""}
                              </td>
                              <td className="p-2.5 text-[11px] font-medium">{items}</td>
                              <td className="p-2.5 text-right font-black text-brand-orange">
                                Rp {Number(String(total).replace(/\D/g, "") || 0).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsedImportRows.length > 10 && (
                    <div className="bg-cream/40 p-2 text-center text-[10px] font-bold text-muted-foreground border-t border-ink/20">
                      ...dan {parsedImportRows.length - 10} baris pesanan lainnya
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clean Re-Import Checkbox */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 border-t-2 border-ink">
              <label className="flex items-center gap-3 text-sm font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanReimport}
                  onChange={(e) => setCleanReimport(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 border-[3px] border-ink rounded cursor-pointer"
                />
                <span>Hapus &amp; Timpa Data CSV Import Sebelumnya (Clean Re-Import)</span>
              </label>
              
              <button 
                type="button" 
                onClick={handleDeleteImport}
                disabled={deleteImportMutation.isPending}
                className="text-rose-600 hover:text-rose-700 font-bold text-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> 
                {deleteImportMutation.isPending ? "Menghapus..." : "Hapus Data Import Batch Ini"}
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t-2 border-ink">
              <button
                type="button"
                onClick={closeImportModal}
                className="px-6 py-2.5 border-2 border-ink rounded-lg bg-white text-sm font-bold hover:bg-neutral-100 uppercase transition-all"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={parsedImportRows.length === 0 || isImporting}
                className="px-6 py-2.5 bg-[#8da9ec] hover:bg-blue-400 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider rounded-lg border-2 border-ink shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> MENG-IMPORT PESANAN...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> KONFIRMASI IMPORT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
