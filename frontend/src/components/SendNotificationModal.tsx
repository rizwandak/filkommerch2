import React, { useState, useEffect } from "react";
import { Send, X, Smartphone, Check, Sparkles } from "lucide-react";

import { getApiBaseUrl } from "@/lib/api-config";

const getAPI_URL = () => `${getApiBaseUrl()}/api`;

export interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: number;
  targetUserName?: string;
  targetTrxId?: string;
  defaultTitle?: string;
  defaultMessage?: string;
  defaultLink?: string;
  defaultType?: string;
  onSuccess?: () => void;
}

export function SendNotificationModal({
  isOpen,
  onClose,
  targetUserId,
  targetUserName,
  targetTrxId,
  defaultTitle = "",
  defaultMessage = "",
  defaultLink = "",
  defaultType = "CUSTOM_DIRECT",
  onSuccess,
}: SendNotificationModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [message, setMessage] = useState(defaultMessage);
  const [link, setLink] = useState(defaultLink);
  const [type, setType] = useState(defaultType);
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(
        defaultTitle ||
          (targetTrxId
            ? `Info Pesanan #${targetTrxId}`
            : "Pemberitahuan Filkom Merch")
      );
      setMessage(defaultMessage);
      setLink(
        defaultLink ||
          (targetTrxId ? `/orders/${targetTrxId}` : "/orders")
      );
      setType(defaultType);
      setSentSuccess(false);
    }
  }, [isOpen, defaultTitle, defaultMessage, defaultLink, defaultType, targetTrxId]);

  if (!isOpen) return null;

  const applyPreset = (presetType: string) => {
    setType(presetType);
    if (presetType === "PREORDER_READY") {
      setTitle(`📦 Pesanan #${targetTrxId || "TRX"} Siap Diambil!`);
      setMessage(
        `Halo${
          targetUserName ? ` Kak ${targetUserName}` : ""
        }! Barang Pre-Order kamu sudah siap diambil di booth Filkom Merch (Gedung F). Silakan tunjukkan QR / ID pesanan.`
      );
      setLink(targetTrxId ? `/orders/${targetTrxId}` : "/orders");
    } else if (presetType === "PAYMENT_REJECTED") {
      setTitle(`⚠️ Bukti Pembayaran Perlu Diupload Ulang (#${targetTrxId || "TRX"})`);
      setMessage(
        `Bukti pembayaran kamu belum sesuai (buram/nominal tidak cocok). Mohon lakukan upload ulang bukti transfer.`
      );
      setLink(targetTrxId ? `/orders/${targetTrxId}` : "/orders");
    } else if (presetType === "COMPLAINT_UPDATE") {
      setTitle(`💬 Update Status Komplain Pesanan #${targetTrxId || "TRX"}`);
      setMessage(
        `Pengajuan komplain kamu telah ditanggapi oleh admin. Silakan periksa detailnya.`
      );
      setLink(targetTrxId ? `/orders/${targetTrxId}` : "/orders");
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Judul dan isi pesan notifikasi tidak boleh kosong.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      setLoading(true);
      const res = await fetch(`${getAPI_URL()}/admin/notifications/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          userId: targetUserId,
          title,
          message,
          type,
          link,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSentSuccess(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        alert(`Gagal mengirim notifikasi: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 text-left overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-2xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Kirim Notifikasi ke Pembeli
              </h3>
              <p className="text-xs text-gray-500">
                Penerima: <span className="font-semibold text-gray-700 dark:text-gray-300">{targetUserName || `User #${targetUserId}`}</span> {targetTrxId && `(${targetTrxId})`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Chips */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Template Cepat:
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("PREORDER_READY")}
              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1.5 rounded-xl font-medium transition-colors"
            >
              📦 Barang Siap Diambil
            </button>
            <button
              type="button"
              onClick={() => applyPreset("PAYMENT_REJECTED")}
              className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-1.5 rounded-xl font-medium transition-colors"
            >
              ⚠️ Bukti Bayar Ditolak
            </button>
            <button
              type="button"
              onClick={() => applyPreset("COMPLAINT_UPDATE")}
              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 px-3 py-1.5 rounded-xl font-medium transition-colors"
            >
              💬 Update Komplain
            </button>
          </div>
        </div>

        {/* Form Controls */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Judul Notifikasi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: 📦 Pesanan Siap Diambil"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Isi Pesan Notifikasi
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan lengkap yang akan dibaca pembeli..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="mt-4 p-3.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/60">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            📱 Pratinjau Tampilan di HP Pembeli
          </span>
          <div className="flex items-start gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl shadow-xs border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
              FM
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Filkom Merch</span>
                <span className="text-[9px] text-gray-400">Sekarang</span>
              </div>
              <h5 className="text-xs font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                {title || "Judul Notifikasi"}
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mt-0.5">
                {message || "Isi pesan notifikasi..."}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Batal
          </button>

          {sentSuccess ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 rounded-xl border border-emerald-200">
              <Check className="w-4 h-4" /> Notifikasi Terkirim!
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? "Mengirim..." : "Kirim Notifikasi"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
