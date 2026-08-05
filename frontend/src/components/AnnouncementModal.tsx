import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, ShoppingBag, Users, CheckCircle2 } from "lucide-react";
import baraSmile from "@/assets/bara-smile.png";

interface Props {
  delayMs?: number;
  durationMs?: number;
}

export function AnnouncementModal({ delayMs = 600, durationMs = 10000 }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    if (!isVisible) return;

    const startTime = performance.now();

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const remaining = Math.max(0, durationMs - elapsed);
      const pct = (remaining / durationMs) * 100;
      setProgress(pct);

      if (remaining > 0) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        setIsVisible(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isVisible, durationMs]);

  const handleClose = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-background border-4 border-ink rounded-3xl w-full max-w-lg overflow-hidden shadow-[10px_10px_0px_0px_rgba(27,27,27,1)] relative animate-scale-in flex flex-col">
        {/* Header Bar */}
        <div className="bg-cream border-b-2 border-ink p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-brand-orange text-cream text-[10px] font-black rounded-full border border-ink uppercase tracking-wider shadow-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cream animate-pulse" /> PENGUMUMAN PO
            </span>
            <span className="text-[10px] font-black text-ink uppercase tracking-wider">
              BATCH #1 &amp; #2
            </span>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 border-2 border-ink rounded-xl bg-white hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-xs"
            aria-label="Tutup pengumuman"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-7 space-y-4 text-ink relative">
          {/* Bara Mascot & Graphic Header */}
          <div className="flex items-center gap-3.5 bg-orange-50/80 border-2 border-brand-orange/40 p-3.5 rounded-2xl">
            <img
              src={baraSmile}
              alt="Bara Filkom Merch"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0 drop-shadow-md animate-bounce"
            />
            <div className="space-y-1 min-w-0">
              <h3 className="display text-base sm:text-lg font-black uppercase text-ink leading-tight">
                Terima Kasih KBMFILKOM! 🎉
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold leading-relaxed">
                Antusiasme luar biasa di Pre-Order Batch #1 dan #2!
              </p>
            </div>
          </div>

          {/* Key Stats Counter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background border-2 border-ink p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3">
              <div className="p-2 bg-brand-orange/20 border border-brand-orange rounded-lg text-brand-orange shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-ink">150+</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">Pembeli PO</div>
              </div>
            </div>

            <div className="bg-background border-2 border-ink p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3">
              <div className="p-2 bg-emerald-100 border border-emerald-500 rounded-lg text-emerald-700 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-ink">300+</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">Items Dibeli</div>
              </div>
            </div>
          </div>

          {/* Main Notice Paragraph */}
          <div className="text-xs leading-relaxed text-ink/90 font-medium space-y-2 bg-cream/30 p-3.5 border border-ink/20 rounded-xl">
            <p>
              Kami mengucapkan terima kasih sebesar-besarnya atas antusiasme seluruh KBMFILKOM di Pre-Order Batch #1 dan #2.
            </p>
            <p>
              Untuk informasi ketersediaan barang untuk pengambilan di FILKOM Merch Store dan pengantaran, akan kami sampaikan melalui web{" "}
              <a href="https://filkommerch.com" target="_blank" rel="noreferrer" className="text-brand-orange font-extrabold underline">
                filkommerch.com
              </a>{" "}
              dan Official Instagram{" "}
              <a href="https://instagram.com/filkommerchub" target="_blank" rel="noreferrer" className="text-brand-orange font-extrabold underline">
                @filkommerchub
              </a>
              , jadi harap dicek secara berkala.
            </p>
            <p className="font-extrabold text-ink pt-0.5">Sampai jumpa. 🔥</p>
          </div>

          {/* Action Close Button */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 bg-ink hover:bg-brand-orange text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-brand-orange" /> SAYA MENGERTI
          </button>
        </div>

        {/* Animated Progress Bar at the bottom edge */}
        <div className="w-full bg-cream h-2.5 border-t-2 border-ink relative overflow-hidden">
          <div
            className="h-full bg-brand-orange transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
