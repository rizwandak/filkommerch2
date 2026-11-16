import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  PackageCheck,
  Search,
  RefreshCw,
  Calendar,
  Eye,
  X,
  UserCheck,
  Clock,
  CheckCircle2,
  Camera,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  getAllPickupLogsServerAction,
  type PickupLogEntry,
} from "@backend/server-actions";
import { resolveImageUrl } from "@/lib/image-resolver";
import { Button } from "@frontend/components/ui/button";
import { Badge } from "@frontend/components/ui/badge";

export const Route = createFileRoute("/admin/pickup-history")({
  component: AdminPickupHistoryPage,
  head: () => ({ meta: [{ title: "Riwayat Pengambilan Barang — Admin FILKOM Merch" }] }),
});

function AdminPickupHistoryPage() {
  const [logs, setLogs] = useState<PickupLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    total_logs: 0,
    picked_up_total: 0,
    picked_up_today: 0,
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "picked_up" | "ready" | "pending">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 30;

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllPickupLogsServerAction({
        data: {
          search: search.trim() || undefined,
          status: statusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          limit: pageSize,
          offset: page * pageSize,
        },
      });
      if (res.success) {
        setLogs(res.logs || []);
        setTotal(res.total || 0);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to fetch pickup logs:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, startDate, endDate, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(0);
  };

  const statusLabel = (s?: string | null) => {
    if (s === "picked_up") return "Sudah Diambil";
    if (s === "ready") return "Siap Diambil";
    if (s === "pending") return "Menyusul";
    return s || "-";
  };

  const statusBadgeClass = (s?: string | null) => {
    if (s === "picked_up") return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (s === "ready") return "bg-blue-100 text-blue-800 border-blue-300";
    return "bg-amber-100 text-amber-800 border-amber-300";
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-ink uppercase tracking-tight flex items-center gap-2.5">
            <PackageCheck className="w-7 h-7 text-brand-orange" />
            Riwayat Pengambilan Barang
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Catatan lengkap serah terima barang pesanan oleh kasir/admin beserta bukti foto.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="border-2 border-ink font-bold text-xs shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border-2 border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-300 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Pengambilan Hari Ini
            </p>
            <p className="text-2xl font-black text-ink">{stats.picked_up_today}</p>
          </div>
        </div>

        <div className="bg-card border-2 border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-brand-orange/15 text-brand-orange border border-brand-orange/30 shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Sudah Diambil
            </p>
            <p className="text-2xl font-black text-ink">{stats.picked_up_total}</p>
          </div>
        </div>

        <div className="bg-card border-2 border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-700 border border-blue-300 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Aktivitas Log
            </p>
            <p className="text-2xl font-black text-ink">{stats.total_logs}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border-2 border-ink rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Cari Order ID, pembeli, produk, atau petugas..."
              className="w-full h-9 pl-9 pr-3 text-xs font-medium bg-background border-2 border-ink rounded-xl focus:outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(0);
              }}
              className="w-full h-9 px-3 text-xs font-bold bg-background border-2 border-ink rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="picked_up">Sudah Diambil</option>
              <option value="ready">Siap Diambil</option>
              <option value="pending">Menyusul (Pending)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="w-full h-9 px-2 text-xs font-medium bg-background border-2 border-ink rounded-xl"
              title="Dari tanggal"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-1.5">
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="w-full h-9 px-2 text-xs font-medium bg-background border-2 border-ink rounded-xl"
              title="Sampai tanggal"
            />
            {(search || statusFilter !== "all" || startDate || endDate) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleResetFilters}
                title="Reset Filter"
                className="h-9 w-9 shrink-0 border-2 border-ink rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-card border-2 border-ink rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-medium">
            Memuat riwayat pengambilan barang...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <PackageCheck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-bold text-ink">Belum ada riwayat pengambilan barang</p>
            <p className="text-xs text-muted-foreground">
              Coba ubah kata kunci pencarian atau rentang tanggal filter.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-cream/50 border-b-2 border-ink text-[10px] font-black uppercase tracking-wider text-ink">
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Order &amp; Pembeli</th>
                    <th className="p-3">Barang &amp; Varian</th>
                    <th className="p-3">Perubahan Status</th>
                    <th className="p-3">Petugas</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-center">Bukti Foto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => {
                    const variantText = [log.size, log.color]
                      .filter((v) => v && v !== "-" && v !== "One Size" && v !== "All Size")
                      .join(" / ");
                    return (
                      <tr key={log.id} className="hover:bg-cream/20 transition-colors">
                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-black text-brand-blue">{log.order_id}</div>
                          <div className="font-bold text-ink uppercase text-[11px] mt-0.5">
                            {log.customer_name || "-"}
                          </div>
                          {log.customer_nim && (
                            <div className="text-[10px] text-muted-foreground font-mono">
                              NIM: {log.customer_nim}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-ink">
                            {log.product_name || `Item #${log.order_item_id}`}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {variantText ? `${variantText} • ` : ""}
                            <span className="font-semibold text-ink">{log.quantity || 1} pcs</span>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Badge className={`border font-bold px-1.5 py-0 ${statusBadgeClass(log.previous_status)}`}>
                              {statusLabel(log.previous_status)}
                            </Badge>
                            <span className="text-muted-foreground font-bold">→</span>
                            <Badge className={`border font-bold px-1.5 py-0 ${statusBadgeClass(log.new_status)}`}>
                              {statusLabel(log.new_status)}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-ink">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{log.actor_name || "Admin"}</span>
                          </div>
                          {log.actor_role && (
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {log.actor_role}
                            </span>
                          )}
                        </td>
                        <td className="p-3 max-w-[220px]">
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {log.notes || "-"}
                          </p>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {log.proof_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(log.proof_url || null)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Lihat Foto
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-border">
              {logs.map((log) => {
                const variantText = [log.size, log.color]
                  .filter((v) => v && v !== "-" && v !== "One Size" && v !== "All Size")
                  .join(" / ");
                return (
                  <div key={log.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-brand-blue">{log.order_id}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div>
                      <p className="font-extrabold text-ink uppercase">
                        {log.customer_name || "-"}
                      </p>
                      <p className="font-bold text-ink mt-0.5">
                        {log.product_name || `Item #${log.order_item_id}`}
                        {variantText ? ` (${variantText})` : ""} — {log.quantity || 1} pcs
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Badge className={`border font-bold px-1.5 py-0 ${statusBadgeClass(log.previous_status)}`}>
                        {statusLabel(log.previous_status)}
                      </Badge>
                      <span className="text-muted-foreground font-bold">→</span>
                      <Badge className={`border font-bold px-1.5 py-0 ${statusBadgeClass(log.new_status)}`}>
                        {statusLabel(log.new_status)}
                      </Badge>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-muted-foreground bg-secondary/40 p-2 rounded-lg">
                        {log.notes}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <strong className="text-ink">{log.actor_name || "Admin"}</strong>
                      </span>
                      {log.proof_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(log.proof_url || null)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" /> Lihat Bukti
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {total > pageSize && (
          <div className="p-3 border-t border-border bg-cream/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              Halaman <strong>{page + 1}</strong> dari <strong>{totalPages}</strong> ({total} data)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 border-2 border-ink font-bold text-xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages}
                className="h-8 border-2 border-ink font-bold text-xs cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Photo Proof Lightbox */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-3.5 bg-gray-900 border-b border-gray-800 text-white text-xs font-bold">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Foto Bukti Serah Terima Barang</span>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3">
              <img
                src={resolveImageUrl(previewPhoto)}
                alt="Bukti Pengambilan"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
