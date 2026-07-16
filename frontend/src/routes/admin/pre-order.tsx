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
  Eye,
} from "lucide-react";
import {
  getPreOrderCampaignsServerAction,
  createPreOrderCampaignServerAction,
  updatePreOrderCampaignServerAction,
  deletePreOrderCampaignServerAction,
  togglePreOrderCampaignActiveServerAction,
  type PreOrderCampaign,
} from "@backend/server-actions";

export const Route = createFileRoute("/admin/pre-order")({
  component: AdminPreOrderBatchPage,
});

function AdminPreOrderBatchPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PreOrderCampaign | null>(null);

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
            Atur periode tanggal buka, tutup, dan perpanjangan waktu batch pre-order toko secara fleksibel.
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
                  <th className="p-4">Aksi</th>
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
                    <td className="p-4">
                      <div className="flex items-center gap-2">
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

      {/* Create / Edit Modal */}
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
    </div>
  );
}
