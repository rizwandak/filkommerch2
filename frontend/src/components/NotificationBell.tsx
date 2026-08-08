import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, Package, AlertTriangle, Info, MessageSquare } from "lucide-react";
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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const navigate = useNavigate();

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
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        title="Notifikasi"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Notification Dropdown */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden text-left">
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
                          {notif.title}
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
