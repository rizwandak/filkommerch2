import { useState } from "react";
import {
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Compass,
  Share,
  MoreVertical,
  X,
} from "lucide-react";
import { detectInAppBrowser, openExternalBrowser } from "@/lib/in-app-browser";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function InAppBrowserModal({ isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const info = detectInAppBrowser();

  if (!isOpen) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.href : "https://filkommerch.com";

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success("Tautan berhasil disalin! Silakan tempel (paste) di Chrome atau Safari.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Gagal menyalin tautan.");
    }
  };

  const handleOpenExternal = () => {
    if (info.isAndroid) {
      openExternalBrowser(currentUrl);
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl border-2 border-ink shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-amber-500 text-ink px-5 py-3 border-b-2 border-ink flex items-center justify-between font-black uppercase text-xs tracking-wider">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-ink" />
            <span>Peringatan Login Google</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-black/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-ink">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-black tracking-tight uppercase">
              Buka di Browser Chrome / Safari
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda terdeteksi membuka FILKOM Merch dari dalam aplikasi{" "}
              <strong className="text-ink font-bold">{info.appName || "In-App Browser"}</strong>.
              Google secara resmi memblokir login akun di dalam jendela aplikasi demi alasan keamanan.
            </p>
          </div>

          {/* Step Guide Box */}
          <div className="bg-neutral-50 border-2 border-ink/20 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-ink uppercase tracking-wider">
              Cara mudah melanjutkan:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-brand-orange text-white font-black text-[11px] flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="text-muted-foreground leading-snug">
                  Ketuk ikon{" "}
                  <strong className="text-ink font-semibold inline-flex items-center gap-1">
                    {info.isIOS ? <Share className="w-3.5 h-3.5 inline" /> : <MoreVertical className="w-3.5 h-3.5 inline" />}{" "}
                    {info.isIOS ? "Bagikan (Share)" : "Titik Tiga (⋮)"}
                  </strong>{" "}
                  di pojok layar aplikasi Anda.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-brand-orange text-white font-black text-[11px] flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-muted-foreground leading-snug">
                  Pilih menu{" "}
                  <strong className="text-ink font-semibold">
                    {info.isIOS ? "Buka di Safari" : "Buka di Browser / Open in Chrome"}
                  </strong>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {info.isAndroid && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs sm:text-sm py-3.5 px-4 rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer uppercase tracking-wider"
              >
                <Compass className="w-4 h-4" />
                <span>Buka Otomatis di Chrome</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-ink font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer uppercase tracking-wider"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Tautan Disalin!" : "Salin Tautan Web"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full text-center text-[11px] font-bold text-muted-foreground hover:text-ink pt-1 transition-colors cursor-pointer"
            >
              Lanjutkan tetap di sini &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
