import React, { useState } from "react";
import { Megaphone, X, Send, Sparkles, Smartphone, Check } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export interface BroadcastNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Array<{ id: number; name: string }>;
  campaigns?: Array<{ id: number; batch_name: string }>;
  onSuccess?: () => void;
}

export function BroadcastNotificationModal({
  isOpen,
  onClose,
  products = [],
  campaigns = [],
  onSuccess,
}: BroadcastNotificationModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [title, setTitle] = useState("Pengumuman Pengambilan Filkom Merch 📦");
  const [message, setMessage] = useState(
    "Halo Pembeli Pre-Order! Pengambilan barang sudah dapat dilakukan di FILKOM Merch (Belakang Tulisan FILKOM dekat FTP). Silakan cek detail transaksi kamu."
  );
  const [link, setLink] = useState("/profile/orders");
  const [loading, setLoading] = useState(false);
  const [sentResult, setSentResult] = useState<{ count: number } | null>(null);

  if (!isOpen) return null;

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      alert("Judul dan pesan broadcast tidak boleh kosong.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/notifications/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-role": "admin",
        },
        body: JSON.stringify({
          productId: selectedProduct ? Number(selectedProduct) : undefined,
          campaignId: selectedCampaign ? Number(selectedCampaign) : undefined,
          title,
          message,
          link,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSentResult({ count: data.pushSentCount || 0 });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          setSentResult(null);
          onClose();
        }, 2200);
      } else {
        alert(`Gagal mengirim broadcast: ${data.error}`);
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
            <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-2xl">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Broadcast Notifikasi Massal
              </h3>
              <p className="text-xs text-gray-500">
                Kirim push notification langsung ke HP semua pembeli yang ditargetkan
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

        {/* Target Filter Options */}
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                Target Produk (Opsional)
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden"
              >
                <option value="">Semua Produk Pembeli</option>
                {products.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                Target Batch PO (Opsional)
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden"
              >
                <option value="">Semua Batch PO</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.batch_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Judul Notifikasi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pengambilan Merch Hari Ini Tutup Lebih Awal"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-orange/40"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Isi Pesan Broadcast
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan lengkap yang akan disiarkan..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-orange/40 resize-none"
            />
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="mt-4 p-3.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/60">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-brand-orange" />
            Pratinjau Notifikasi di HP Pembeli
          </span>
          <div className="flex items-start gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl shadow-xs border border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 rounded-xl bg-brand-orange text-white flex items-center justify-center font-bold text-xs shrink-0">
              FM
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                  Filkom Merch
                </span>
                <span className="text-[9px] text-gray-400">Sekarang</span>
              </div>
              <h5 className="text-xs font-semibold text-gray-900 dark:text-white truncate mt-0.5">
                {title || "Judul Broadcast"}
              </h5>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed mt-0.5">
                {message || "Isi pesan..."}
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

          {sentResult ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 rounded-xl border border-emerald-200">
              <Check className="w-4 h-4" /> Push Notifikasi Terkirim!
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSendBroadcast}
              disabled={loading}
              className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {loading ? "Menyiarkan..." : "🚀 Kirim Broadcast Massal"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
