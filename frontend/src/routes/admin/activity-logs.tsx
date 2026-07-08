import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import React from "react";
import { toast } from "sonner";
import { Activity, Search, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select";
import { getActivityLogs, type ActivityLog } from "@backend/server-actions";

export const Route = createFileRoute("/admin/activity-logs")({
  component: AdminActivityLogsPage,
  head: () => ({ meta: [{ title: "Log Aktivitas — Admin Panel" }] }),
});

function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getActivityLogs();
      if (res.logs) {
        setLogs(res.logs);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengambil log aktivitas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  // Filtering
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor_name_snapshot?.toLowerCase().includes(search.toLowerCase()) ||
      false ||
      log.action?.toLowerCase().includes(search.toLowerCase()) ||
      false ||
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      false ||
      log.entity_id?.toLowerCase().includes(search.toLowerCase()) ||
      false;

    const matchesRole =
      roleFilter === "all" || log.actor_role?.toLowerCase() === roleFilter.toLowerCase();

    const matchesEntity =
      entityFilter === "all" || log.entity_type?.toLowerCase() === entityFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesEntity;
  });

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes("create") || act.includes("tambah") || act.includes("insert")) {
      return "bg-green-50 text-green-700 border-green-200";
    }
    if (
      act.includes("update") ||
      act.includes("edit") ||
      act.includes("ubah") ||
      act.includes("simpan")
    ) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (
      act.includes("delete") ||
      act.includes("hapus") ||
      act.includes("remove") ||
      act.includes("nonaktif")
    ) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getRoleColor = (role: string | null) => {
    if (!role) return "bg-gray-50 text-gray-600 border-gray-200";
    const r = role.toLowerCase();
    if (r === "admin") {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (r === "cashier" || r === "kasir") {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider flex items-center gap-2">
            <Activity className="h-7 w-7 text-brand-orange" /> Log Aktivitas
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Riwayat lengkap tindakan administrator & staf kasir
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadLogs()}
          disabled={loading}
          className="h-9 px-3 text-xs font-bold border-2 hover:border-brand-orange transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
          Segarkan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filters */}
        <div className="md:col-span-2 space-y-2">
          <Label className="text-xs font-bold text-ink">Cari Tindakan / Deskripsi</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari aktor, tindakan, deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-ink">Filter Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="cashier">Kasir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-ink">Filter Tipe Entitas</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Entitas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Entitas</SelectItem>
              <SelectItem value="product">Produk</SelectItem>
              <SelectItem value="category">Kategori</SelectItem>
              <SelectItem value="order">Pesanan</SelectItem>
              <SelectItem value="sale">Penjualan Langsung</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="settings">Pengaturan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="display text-sm tracking-wider text-ink">
            Daftar Audit Trail ({filteredLogs.length} entri ditemukan)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto border-t">
            <table className="w-full text-xs">
              <thead className="bg-cream">
                <tr>
                  <th className="p-3 text-left font-semibold text-ink uppercase tracking-wider w-[180px]">
                    Waktu
                  </th>
                  <th className="p-3 text-left font-semibold text-ink uppercase tracking-wider w-[150px]">
                    Aktor
                  </th>
                  <th className="p-3 text-left font-semibold text-ink uppercase tracking-wider w-[120px]">
                    Aksi
                  </th>
                  <th className="p-3 text-left font-semibold text-ink uppercase tracking-wider w-[100px]">
                    Entitas
                  </th>
                  <th className="p-3 text-left font-semibold text-ink uppercase tracking-wider">
                    Keterangan
                  </th>
                  <th className="p-3 text-center font-semibold text-ink uppercase tracking-wider w-[80px]">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Memuat data log...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Tidak ada log aktivitas yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-cream/10 transition-colors">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-ink">
                                {log.actor_name_snapshot || "Sistem"}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] w-fit font-bold border uppercase tracking-wider ${getRoleColor(
                                  log.actor_role,
                                )}`}
                              >
                                {log.actor_role || "system"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold border text-[10px] ${getActionColor(
                                log.action,
                              )}`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-ink">
                            <div className="flex flex-col gap-0.5">
                              <span className="capitalize text-[10px]">
                                {log.entity_type || "-"}
                              </span>
                              {log.entity_id && (
                                <span className="text-[9px] text-muted-foreground">
                                  ID: {log.entity_id}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground max-w-sm truncate leading-relaxed">
                            {log.description}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="h-7 w-7"
                              title={isExpanded ? "Sembunyikan metadata" : "Tampilkan metadata"}
                            >
                              {isExpanded ? (
                                <EyeOff className="h-4 w-4 text-brand-orange" />
                              ) : (
                                <Eye className="h-4 w-4 text-muted-foreground hover:text-ink" />
                              )}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#FAF8F5]">
                            <td colSpan={6} className="p-4 border-t border-b">
                              <div className="space-y-3 max-w-3xl">
                                <h4 className="font-bold text-[10px] uppercase text-ink tracking-wider">
                                  Metadata & Info Teknis
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-[10px]">
                                  <div>
                                    <span className="text-muted-foreground">User Agent:</span>{" "}
                                    <span className="font-semibold text-ink">
                                      {log.user_agent || "N/A"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">IP Address:</span>{" "}
                                    <span className="font-semibold text-ink">
                                      {log.ip_address || "N/A"}
                                    </span>
                                  </div>
                                </div>
                                <div className="border border-border rounded-lg bg-white p-3 overflow-x-auto max-h-[250px]">
                                  <pre className="text-[10px] text-ink font-mono">
                                    {log.metadata
                                      ? JSON.stringify(
                                          typeof log.metadata === "string"
                                            ? JSON.parse(log.metadata)
                                            : log.metadata,
                                          null,
                                          2,
                                        )
                                      : "// Tidak ada metadata tambahan"}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
