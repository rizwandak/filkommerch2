import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ticket,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  getVouchersServerAction,
  createVoucherServerAction,
  updateVoucherServerAction,
  deleteVoucherServerAction,
  type Voucher,
} from "@backend/server-actions";

export const Route = createFileRoute("/admin/vouchers")({
  component: AdminVouchersPage,
  head: () => ({ meta: [{ title: "Kelola Voucher — Admin Panel" }] }),
});

function AdminVouchersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [minPurchase, setMinPurchase] = useState(0);
  const [stock, setStock] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [maxDiscount, setMaxDiscount] = useState<number | null>(null);

  // Fetch vouchers
  const { data: vouchersRes, isLoading, refetch } = useQuery({
    queryKey: ["adminVouchers"],
    queryFn: () => getVouchersServerAction(),
  });

  const vouchers: Voucher[] = vouchersRes?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => createVoucherServerAction({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["adminVouchers"] });
        closeModal();
      } else {
        alert("Gagal membuat voucher: " + (res?.error || res?.message));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateVoucherServerAction({ data: { id, ...data } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["adminVouchers"] });
        closeModal();
      } else {
        alert("Gagal memperbarui voucher: " + (res?.error || res?.message));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteVoucherServerAction({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ["adminVouchers"] });
      } else {
        alert("Gagal menghapus voucher: " + (res?.error || res?.message));
      }
    },
  });

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getVoucherStatusBadge = (v: Voucher) => {
    if (v.is_active !== 1) {
      return (
        <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase">
          Nonaktif
        </span>
      );
    }

    const now = new Date();
    const start = new Date(v.start_date);
    const end = new Date(v.end_date);

    if (now < start) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase">
          <Clock className="w-3 h-3" /> Belum Mulai
        </span>
      );
    }

    if (now > end) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase">
          <AlertCircle className="w-3 h-3" /> Kadaluarsa
        </span>
      );
    }

    if (v.stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase">
          Habis
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase">
        <CheckCircle2 className="w-3 h-3" /> Aktif
      </span>
    );
  };

  // Helper to format ISO date string for datetime-local input
  const formatForInput = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const openCreateModal = () => {
    setEditingVoucher(null);
    setCode("");
    setDiscountAmount(0);
    setMinPurchase(0);
    setStock(0);
    // Set default dates: start now, end in 7 days
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartDate(formatForInput(now.toISOString()));
    setEndDate(formatForInput(nextWeek.toISOString()));
    setIsActive(true);
    setDiscountType("fixed");
    setMaxDiscount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingVoucher(v);
    setCode(v.code);
    setDiscountAmount(v.discount_amount);
    setMinPurchase(v.min_purchase);
    setStock(v.stock);
    setStartDate(formatForInput(v.start_date));
    setEndDate(formatForInput(v.end_date));
    setIsActive(v.is_active === 1);
    setDiscountType(v.discount_type || "fixed");
    setMaxDiscount(v.max_discount || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVoucher(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || discountAmount <= 0 || !startDate || !endDate) {
      alert("Harap lengkapi semua kolom wajib diisi.");
      return;
    }

    if (discountType === "percentage" && discountAmount > 100) {
      alert("Persentase diskon tidak boleh melebihi 100%.");
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      discount_amount: Number(discountAmount),
      min_purchase: Number(minPurchase),
      stock: Number(stock),
      start_date: startDate.replace("T", " ") + ":00",
      end_date: endDate.replace("T", " ") + ":00",
      is_active: isActive ? 1 : 0,
      discount_type: discountType,
      max_discount: discountType === "percentage" && maxDiscount ? Number(maxDiscount) : null,
    };

    if (editingVoucher) {
      updateMutation.mutate({ id: editingVoucher.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background border-2 border-ink p-6 rounded-2xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-brand-orange uppercase mb-1">
            <Ticket className="w-4 h-4" /> VOUCHER CODE MANAGEMENT
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink uppercase tracking-wide">
            Kelola Kode Voucher
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Buat, aktifkan, dan atur batasan nominal serta periode berlaku kupon diskon untuk transaksi pembeli.
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
            <Plus className="w-4 h-4" /> TAMBAH VOUCHER BARU
          </button>
        </div>
      </div>

      {/* Voucher List */}
      <div className="bg-background border-2 border-ink rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
        <div className="p-4 bg-cream border-b-2 border-ink font-bold text-xs uppercase tracking-widest text-ink flex items-center justify-between">
          <span>Daftar Voucher Toko</span>
          <span className="text-muted-foreground">Total: {vouchers.length} Voucher</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-xs font-bold animate-pulse">
            Memuat data voucher...
          </div>
        ) : vouchers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Ticket className="w-10 h-10 text-brand-orange mx-auto opacity-50" />
            <div className="text-sm font-bold text-ink uppercase">Belum Ada Voucher</div>
            <p className="text-xs max-w-md mx-auto">
              Silakan buat kode voucher baru agar pelanggan Anda bisa menikmati potongan belanja.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-secondary/40 border-b-2 border-ink text-ink font-extrabold uppercase">
                  <th className="p-4">Kode Voucher</th>
                  <th className="p-4">Nominal Diskon</th>
                  <th className="p-4">Min. Pembelian</th>
                  <th className="p-4">Stok</th>
                  <th className="p-4">Periode Berlaku</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y border-ink/10">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-cream/40 transition-colors">
                    <td className="p-4 font-bold text-ink text-sm">
                      <span className="bg-cream border-2 border-ink border-dashed px-2.5 py-1 text-xs tracking-wider rounded">
                        {v.code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-brand-orange text-sm">
                      {v.discount_type === "percentage" ? (
                        <div>
                          <span>{v.discount_amount}%</span>
                          {v.max_discount && v.max_discount > 0 ? (
                            <span className="text-[10px] text-muted-foreground block font-semibold mt-0.5">
                              (Maks Rp {v.max_discount.toLocaleString("id-ID")})
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground block font-semibold mt-0.5">
                              (Tanpa Batas Maks)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span>Rp {v.discount_amount.toLocaleString("id-ID")}</span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-ink">
                      Rp {v.min_purchase.toLocaleString("id-ID")}
                    </td>
                    <td className="p-4 font-bold text-ink">
                      {v.stock}
                    </td>
                    <td className="p-4 font-medium text-muted-foreground space-y-0.5">
                      <div>Mulai: {formatDateTime(v.start_date)}</div>
                      <div>Selesai: {formatDateTime(v.end_date)}</div>
                    </td>
                    <td className="p-4">{getVoucherStatusBadge(v)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(v)}
                          className="p-1.5 rounded-lg border border-ink bg-cream hover:bg-brand-orange hover:text-cream transition-all cursor-pointer"
                          title="Edit Voucher"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus voucher "${v.code}"?`)) {
                              deleteMutation.mutate(v.id);
                            }
                          }}
                          className="p-1.5 rounded-lg border border-ink bg-rose-100 hover:bg-rose-600 text-rose-800 hover:text-white transition-all cursor-pointer"
                          title="Hapus Voucher"
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
              {editingVoucher ? "Edit Kode Voucher" : "Tambah Voucher Baru"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  Kode Voucher *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: HEMATBANYAK"
                  className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-orange bg-cream/30 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  Tipe Diskon *
                </label>
                <div className="grid grid-cols-2 gap-2 border-2 border-ink rounded-xl p-1 bg-cream/20">
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed")}
                    className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                      discountType === "fixed"
                        ? "bg-brand-orange text-white border-ink shadow-[1px_1px_0px_0px_rgba(27,27,27,1)]"
                        : "border-transparent hover:bg-cream/40 text-ink"
                    }`}
                  >
                    Nominal (Rupiah)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`py-2 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                      discountType === "percentage"
                        ? "bg-brand-orange text-white border-ink shadow-[1px_1px_0px_0px_rgba(27,27,27,1)]"
                        : "border-transparent hover:bg-cream/40 text-ink"
                    }`}
                  >
                    Persentase (%)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    {discountType === "percentage" ? "Diskon (%) *" : "Nominal Diskon (Rp) *"}
                  </label>
                  <input
                    type="number"
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    placeholder={discountType === "percentage" ? "Contoh: 10" : "Contoh: 15000"}
                    className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none bg-cream/30"
                    min="0"
                    max={discountType === "percentage" ? "100" : undefined}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Min. Pembelian (Rp) *
                  </label>
                  <input
                    type="number"
                    value={minPurchase || ""}
                    onChange={(e) => setMinPurchase(Number(e.target.value))}
                    placeholder="Contoh: 50000"
                    className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none bg-cream/30"
                    min="0"
                    required
                  />
                </div>
              </div>

              {discountType === "percentage" && (
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Batas Maksimum Diskon (Rp) <span className="text-[9px] font-medium text-muted-foreground block sm:inline font-sans">(Kosongkan jika tanpa batas)</span>
                  </label>
                  <input
                    type="number"
                    value={maxDiscount || ""}
                    onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Contoh: 20000"
                    className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none bg-cream/30"
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-ink uppercase mb-1">
                  Stok Voucher *
                </label>
                <input
                  type="number"
                  value={stock || ""}
                  onChange={(e) => setStock(Number(e.target.value))}
                  placeholder="Contoh: 100"
                  className="w-full px-3 py-2.5 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none bg-cream/30"
                  min="0"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink uppercase mb-1">
                    Mulai Berlaku *
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
                    Berakhir *
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

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-brand-orange border-2 border-ink rounded cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-bold text-ink uppercase cursor-pointer">
                  Aktifkan voucher ini
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-ink">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 border-2 border-ink rounded-xl text-xs font-bold text-ink hover:bg-neutral-200 transition-colors uppercase cursor-pointer"
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
                    : "Simpan Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
