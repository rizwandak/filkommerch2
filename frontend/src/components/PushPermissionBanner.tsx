import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle2 } from "lucide-react";
import { subscribeUserToPush, isPushNotificationSupported } from "../services/pushService";

export function PushPermissionBanner() {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    async function checkPermission() {
      const isSupported = await isPushNotificationSupported();
      if (!isSupported) {
        setShowBanner(false);
        return;
      }

      // If notification permission is already granted or denied, hide banner automatically
      if (Notification.permission === "granted" || Notification.permission === "denied") {
        setShowBanner(false);
        return;
      }

      const dismissed = localStorage.getItem("push_banner_dismissed");
      if (dismissed) {
        setShowBanner(false);
        return;
      }

      // Show banner only if permission status is 'default' (not answered yet)
      if (Notification.permission === "default") {
        setShowBanner(true);
      }
    }

    checkPermission();

    // Check again if permissions change or window gets focus
    window.addEventListener("focus", checkPermission);
    return () => window.removeEventListener("focus", checkPermission);
  }, []);

  const handleEnablePush = async () => {
    setLoading(true);
    const res = await subscribeUserToPush();
    setLoading(false);

    if (res.success || Notification.permission === "granted") {
      setSuccess(true);
      localStorage.setItem("push_banner_dismissed", "true");
      setTimeout(() => {
        setShowBanner(false);
      }, 1200);
    } else {
      if (Notification.permission === "denied") {
        localStorage.setItem("push_banner_dismissed", "true");
        alert("Izin notifikasi telah diblokir di browser. Mohon izinkan notifikasi melalui pengaturan browser kamu jika ingin mengaktifkannya.");
        setShowBanner(false);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("push_banner_dismissed", "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-primary/90 to-sky-700 text-white py-2.5 px-4 sm:px-6 shadow-md relative z-30 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-full shrink-0">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-bounce" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold">Aktifkan Notifikasi Langsung di HP! 📱</h4>
            <p className="text-[11px] sm:text-xs text-sky-100 mt-0.5">
              Dapatkan info barang PO siap diambil, upload ulang bukti bayar, & promo tanpa harus buka web.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {success ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/20 text-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-400/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              Notifikasi Aktif!
            </span>
          ) : (
            <button
              onClick={handleEnablePush}
              disabled={loading}
              className="bg-white text-primary hover:bg-sky-50 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Memproses..." : "Aktifkan Sekarang"}
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
