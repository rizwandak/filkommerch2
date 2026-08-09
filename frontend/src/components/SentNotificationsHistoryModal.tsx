import React, { useEffect, useState, useMemo } from "react";
import { X, Trash2, History, Search, RefreshCw, Megaphone, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";

const getAPI_URL = () => `${getApiBaseUrl()}/api`;

export interface SentNotificationsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SentNotificationsHistoryModal({
  isOpen,
  onClose,
}: SentNotificationsHistoryModalProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{
    type: "single" | "batch";
    id?: number;
    title: string;
    createdAt?: string;
    count?: number;
    ids?: number[];
  } | null>(null);

  const fetchHistory = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const res = await fetch(`${getAPI_URL()}/admin/notifications/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-role": "admin",
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch notification history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const executeUnsendSingle = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      setDeletingKey(`single-${id}`);
      setConfirmTarget(null);
      const res = await fetch(`${getAPI_URL()}/admin/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-role": "admin",
        },
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Notifikasi berhasil ditarik (unsent)!");
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        toast.error(`Gagal menarik notifikasi: ${data.error}`);
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
      toast.error("Terjadi kesalahan saat menarik notifikasi.");
    } finally {
      setDeletingKey(null);
    }
  };

  const executeUnsendBroadcastBatch = async (title: string, createdAt: string, ids?: number[]) => {
    const token = localStorage.getItem("token");
    try {
      const key = `batch-${title}_${createdAt}`;
      setDeletingKey(key);
      setConfirmTarget(null);
      const res = await fetch(`${getAPI_URL()}/admin/notifications/delete-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-role": "admin",
        },
        body: JSON.stringify({ ids, title, createdAt }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Berhasil menarik seluruh broadcast untuk ${data.count} pembeli!`);
        fetchHistory();
      } else {
        toast.error(`Gagal menarik broadcast: ${data.error}`);
      }
    } catch (err) {
      console.error("Error deleting broadcast batch:", err);
      toast.error("Terjadi kesalahan saat menarik broadcast batch.");
    } finally {
      setDeletingKey(null);
    }
  };

  // Group broadcast notifications by title and created_at
  const groupedDisplayList = useMemo(() => {
    const list: any[] = [];
    const broadcastGroupsMap = new Map<string, any>();

    notifications.forEach((item) => {
      const isBroadcast = item.type === "BROADCAST";

      if (isBroadcast) {
        const groupKey = `${item.title}_${item.created_at}`;
        if (!broadcastGroupsMap.has(groupKey)) {
          const newGroup = {
            isGroup: true,
            groupKey,
            title: item.title,
            message: item.message,
            created_at: item.created_at,
            type: "BROADCAST",
            items: [item],
          };
          broadcastGroupsMap.set(groupKey, newGroup);
          list.push(newGroup);
        } else {
          const group = broadcastGroupsMap.get(groupKey);
          group.items.push(item);
        }
      } else {
        list.push({
          isGroup: false,
          ...item,
        });
      }
    });

    return list;
  }, [notifications]);

  const filteredList = useMemo(() => {
    if (!searchQuery) return groupedDisplayList;
    const query = searchQuery.toLowerCase();

    return groupedDisplayList.filter((item) => {
      if (item.isGroup) {
        return (
          item.title?.toLowerCase().includes(query) ||
          item.message?.toLowerCase().includes(query) ||
          item.items.some((i: any) =>
            i.user_name?.toLowerCase().includes(query) || i.user_email?.toLowerCase().includes(query)
          )
        );
      } else {
        return (
          item.title?.toLowerCase().includes(query) ||
          item.message?.toLowerCase().includes(query) ||
          item.user_name?.toLowerCase().includes(query) ||
          item.user_email?.toLowerCase().includes(query)
        );
      }
    });
  }, [groupedDisplayList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border-2 border-ink text-left overflow-hidden flex flex-col max-h-[85vh] relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-orange/10 text-brand-orange rounded-2xl border border-brand-orange/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-ink dark:text-white text-lg">
                Riwayat Notifikasi Terkirim
              </h3>
              <p className="text-xs text-muted-foreground">
                Kelola & tarik pesan notifikasi per individu atau seluruh kampanye broadcast.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-ink dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="py-3 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari penerima, judul, atau isi pesan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border-2 border-ink rounded-xl text-xs bg-gray-50 dark:bg-gray-800 font-medium focus:outline-none"
            />
          </div>

          <button
            onClick={fetchHistory}
            disabled={loading}
            className="p-2 border-2 border-ink rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
            title="Refresh Riwayat"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-medium">
              Memuat riwayat notifikasi...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-medium">
              Belum ada riwayat notifikasi terkirim.
            </div>
          ) : (
            filteredList.map((item) => {
              if (item.isGroup) {
                const count = item.items.length;
                const key = `batch-${item.groupKey}`;
                const isDeleting = deletingKey === key;

                return (
                  <div
                    key={item.groupKey}
                    className="p-4 bg-brand-orange/5 dark:bg-brand-orange/10 border-2 border-brand-orange/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-brand-orange transition-all shadow-xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 bg-brand-orange text-white rounded-md uppercase tracking-wider flex items-center gap-1">
                          <Megaphone className="w-3 h-3" />
                          BROADCAST MASSAL ({count} Pembeli)
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          • {new Date(item.created_at).toLocaleString("id-ID")}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-ink dark:text-white leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        {item.message}
                      </p>

                      <p className="text-[11px] text-gray-500 font-medium pt-0.5">
                        Penerima ({count}): {item.items.slice(0, 3).map((i: any) => i.user_name || "Pembeli").join(", ")}
                        {count > 3 ? ` dan ${count - 3} lainnya` : ""}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        setConfirmTarget({
                          type: "batch",
                          title: item.title,
                          createdAt: item.created_at,
                          count,
                          ids: item.items.map((i: any) => i.id),
                        })
                      }
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl border border-red-800 shadow-sm transition-all shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Tarik Seluruh Broadcast Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isDeleting ? "Menarik..." : `Tarik Broadcast (${count})`}
                    </button>
                  </div>
                );
              }

              // Individual Direct Notification Item
              const isDeleting = deletingKey === `single-${item.id}`;
              return (
                <div
                  key={item.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-ink transition-all"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-md uppercase flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.type || "DIRECT"}
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        Penerima: {item.user_name || `User #${item.user_id}`}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        • {new Date(item.created_at).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-ink dark:text-white leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                      {item.message}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setConfirmTarget({
                        type: "single",
                        id: item.id,
                        title: item.title,
                      })
                    }
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl border border-red-700 shadow-xs transition-all shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Tarik / Hapus Notifikasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeleting ? "Menarik..." : "Tarik (Unsend)"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 border-2 border-ink rounded-xl text-xs font-bold bg-white text-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-gray-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {/* Custom Styled Confirmation Sub-Modal Overlay */}
        {confirmTarget && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-gray-900 border-2 border-ink rounded-2xl p-5 max-w-md w-full shadow-2xl text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base">
                    Konfirmasi Tarik Notifikasi
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Tindakan ini akan menarik pesan secara langsung.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 space-y-1">
                <p className="font-bold text-ink dark:text-white">
                  "{confirmTarget.title}"
                </p>
                {confirmTarget.type === "batch" ? (
                  <p className="text-gray-500 text-[11px]">
                    Notifikasi broadcast ini akan ditarik sekaligus dari lonceng web & spanduk HP milik <strong className="text-red-500 font-bold">{confirmTarget.count} pembeli</strong>.
                  </p>
                ) : (
                  <p className="text-gray-500 text-[11px]">
                    Notifikasi akan dihapus dari lonceng pembeli dan spanduk HP yang belum dibaca akan otomatis ditarik.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmTarget(null)}
                  className="px-4 py-2 border-2 border-ink rounded-xl text-xs font-bold bg-white text-ink hover:bg-gray-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmTarget.type === "single" && confirmTarget.id) {
                      executeUnsendSingle(confirmTarget.id);
                    } else if (confirmTarget.type === "batch") {
                      executeUnsendBroadcastBatch(confirmTarget.title, confirmTarget.createdAt || "", confirmTarget.ids);
                    }
                  }}
                  className="px-4 py-2 border-2 border-ink rounded-xl text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Ya, Tarik Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
