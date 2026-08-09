import React from "react";
import { X, Bell, Package, AlertTriangle, MessageSquare, Info, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: {
    id: number;
    title: string;
    message: string;
    type: string;
    link?: string;
    created_at: string;
  } | null;
}

export function NotificationDetailModal({
  isOpen,
  onClose,
  notification,
}: NotificationDetailModalProps) {
  const navigate = useNavigate();

  if (!isOpen || !notification) return null;

  // Extract Order ID if present in title, message, or link
  const extractOrderId = (): string | null => {
    // 1. Try from link (e.g., /orders/FILKOM-123 or /profile/orders?id=FILKOM-123)
    if (notification.link) {
      const matchPath = notification.link.match(/\/orders\/([A-Za-z0-9\-]+)/);
      if (matchPath && matchPath[1]) return matchPath[1];

      const matchQuery = notification.link.match(/id=([A-Za-z0-9\-]+)/);
      if (matchQuery && matchQuery[1]) return matchQuery[1];
    }

    // 2. Try from title or message (e.g., #FILKOM-1785524844866 or #TRX-1234)
    const textToSearch = `${notification.title} ${notification.message}`;
    const matchHash = textToSearch.match(/#(FILKOM-[A-Za-z0-9]+|[A-Za-z0-9\-]+)/);
    if (matchHash && matchHash[1]) return matchHash[1];

    return null;
  };

  const orderId = extractOrderId();

  const handleActionClick = () => {
    onClose();
    if (orderId) {
      navigate({ to: `/orders/$orderId`, params: { orderId } });
    } else if (notification.link) {
      const cleanLink = notification.link.replace("/profile/orders", "/orders");
      navigate({ to: cleanLink as any });
    } else {
      navigate({ to: "/orders" as any });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "PREORDER_READY":
        return (
          <div className="p-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-2xl shrink-0">
            <Package className="w-6 h-6" />
          </div>
        );
      case "PAYMENT_REJECTED":
        return (
          <div className="p-3 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case "COMPLAINT_UPDATE":
        return (
          <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-2xl shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="p-3 bg-primary/10 text-primary rounded-2xl shrink-0">
            <Bell className="w-6 h-6" />
          </div>
        );
    }
  };

  const renderMessageWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 font-semibold underline hover:text-blue-800 break-all inline-flex items-center gap-0.5"
          >
            {part} ↗
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 text-left overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {getNotificationIcon(notification.type)}
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {new Date(notification.created_at).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug mt-0.5">
                {notification.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complete Message Content */}
        <div className="py-5">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed font-normal">
              {renderMessageWithLinks(notification.message)}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleActionClick}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {orderId ? `Lihat Detail Pesanan (${orderId})` : "Lihat Daftar Pesanan"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
