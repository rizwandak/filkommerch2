import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, Package, AlertTriangle, Info, MessageSquare, X } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { getApiBaseUrl } from "@/lib/api-config";
import { NotificationDetailModal } from "./NotificationDetailModal";

const getAPI_URL = () => `${getApiBaseUrl()}/api`;

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: number | boolean;
  created_at: string;
}

export interface NotificationBellProps {
  variant?: "header" | "floating";
}

const formatNotificationTitle = (title: string): string => {
  if (!title) return "";
  if (title.startsWith("? PESANAN")) return title.replace("? PESANAN", "📦 PESANAN");
  if (title.startsWith("? Bukti")) return title.replace("? Bukti", "⚠️ Bukti");
  if (title.startsWith("? Pembayaran")) return title.replace("? Pembayaran", "✅ Pembayaran");
  if (title.startsWith("? Update")) return title.replace("? Update", "💬 Update");
  if (title.startsWith("? ")) return title.replace("? ", "📦 ");
  return title;
};

export function NotificationBell({ variant = "header" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (variant === "floating") {
      const dismissed = localStorage.getItem("notif_tooltip_dismissed");
      if (!dismissed) {
        setShowTooltip(true);
      }
    }
  }, [variant]);

  const dismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(false);
    localStorage.setItem("notif_tooltip_dismissed", "true");
  };

  const fetchNotifications = async () => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return;
    const user = JSON.parse(userJson);
    if (!user?.id) return;

    try {
      setLoading(true);
      const res = await fetch(`${getAPI_URL()}/notifications`, {
        headers: {
          "x-user-id": String(user.id),
        },
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      // Silently catch network/JSON parse errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      import("@/services/pushService").then((m) => m.subscribeUserToPush().catch(() => {}));
    }
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: number | "all") => {
    const userJson = localStorage.getItem("user");
    if (!userJson) return;
    const user = JSON.parse(userJson);

    try {
      await fetch(`${getAPI_URL()}/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          "x-user-id": String(user.id),
        },
      });

      if (id === "all") {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
        setUnreadCount(0);
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setIsOpen(false);
    setSelectedNotif(notif);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PREORDER_READY":
        return <Package className="w-5 h-5 text-emerald-500 shrink-0" />;
      case "PAYMENT_REJECTED":
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case "COMPLAINT_UPDATE":
        return <MessageSquare className="w-5 h-5 text-blue-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-primary shrink-0" />;
    }
  };

  const isFloating = variant === "floating";
  const totalCount = notifications.length;

  return (
    <div className={isFloating ? "fixed bottom-5 right-5 z-[95] sm:hidden flex flex-col items-end" : "relative"}>
      {/* Chat Bubble / Tooltip Hint for Mobile Floating Button */}
      {isFloating && showTooltip && !isOpen && (
        <div className="relative mb-2.5 mr-1 flex items-center gap-2 bg-ink text-white text-xs font-extrabold py-2 px-3.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(255,107,0,1)] border-2 border-brand-orange animate-bounce">
          <span className="tracking-wide">Cek notifikasi di sini! 🔔</span>
          <button
            type="button"
            onClick={dismissTooltip}
            className="p-1 text-white/70 hover:text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer shrink-0"
            title="Tutup petunjuk"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* Arrow pointing down */}
          <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-ink border-r-2 border-b-2 border-brand-orange rotate-45" />
        </div>
      )}

      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (showTooltip) {
            setShowTooltip(false);
            localStorage.setItem("notif_tooltip_dismissed", "true");
          }
        }}
        className={
          isFloating
            ? "relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-brand-orange via-orange-500 to-amber-600 text-white rounded-2xl border-[2.5px] border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] active:scale-95 hover:scale-105 transition-all cursor-pointer"
            : "relative p-2 text-gray-700 hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        }
        title="Notifikasi"
      >
        <Bell className={isFloating ? `w-7 h-7 ${unreadCount > 0 ? "animate-wiggle" : ""}` : "w-6 h-6"} />

        {/* Circle Badge with message count */}
        {unreadCount > 0 ? (
          <span
            className={
              isFloating
                ? "absolute -top-2 -right-2 flex items-center justify-center min-w-[26px] h-[26px] text-[11px] font-black text-white bg-red-500 border-2 border-white rounded-full px-1.5 shadow-lg animate-bounce"
                : "absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1 animate-pulse"
            }
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : (
          <span
            className={
              isFloating
                ? "absolute -top-2 -right-2 flex items-center justify-center min-w-[26px] h-[26px] text-[11px] font-black text-ink bg-white border-2 border-ink rounded-full px-1.5 shadow-md"
                : "absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-ink bg-white border border-ink rounded-full px-1"
            }
          >
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs" onClick={() => setIsOpen(false)} />

          {/* Notification Dropdown */}
          <div
            className={
              isFloating
                ? "fixed bottom-20 right-4 w-[calc(100vw-32px)] max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-ink z-50 overflow-hidden text-left animate-in fade-in slide-in-from-bottom-4 duration-200"
                : "absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden text-left"
            }
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Pemberitahuan
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} baru
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={() => markAsRead("all")}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Belum ada notifikasi
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors flex gap-3 ${
                      !notif.is_read ? "bg-primary/5 dark:bg-primary/10" : ""
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            !notif.is_read
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {formatNotificationTitle(notif.title)}
                        </h4>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-gray-400 mt-2 block">
                        {new Date(notif.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Notification Detail Preview Modal */}
      <NotificationDetailModal
        isOpen={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        notification={
          selectedNotif
            ? {
                id: selectedNotif.id,
                title: selectedNotif.title,
                message: selectedNotif.message,
                type: selectedNotif.type,
                link: selectedNotif.link,
                created_at: selectedNotif.created_at,
              }
            : null
        }
      />
    </div>
  );
}
