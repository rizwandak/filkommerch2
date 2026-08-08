import React, { useState, useEffect, useRef } from "react";
import { X, Sparkles, ShoppingBag, Users, CheckCircle2, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";
import baraSmile from "@/assets/bara-smile.png";

interface Props {
  delayMs?: number;
}

export function AnnouncementModal({ delayMs = 600 }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const isRainingRef = useRef(false);

  // Synthesize crowd cheers & celebratory melody using Web Audio API
  const playCheersSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // 1. Triumphant 4-note celebratory chime melody (C5 - E5 - G5 - C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.8);
      });

      // 2. Crowd applause / cheering noise simulation
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1200;
      filter.Q.value = 0.5;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.2);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(ctx.currentTime + 0.2);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      playCheersSound();
      isRainingRef.current = true;

      // Continuous Confetti Rain Animation Loop
      try {
        const colors = ["#ff5e00", "#10b981", "#3b82f6", "#f59e0b", "#1b1b1b", "#ffffff"];

        const frame = () => {
          if (!isRainingRef.current) return;

          confetti({
            particleCount: 2,
            angle: 60,
            spread: 50,
            origin: { x: 0, y: 0.65 },
            colors,
            ticks: 120,
          });

          confetti({
            particleCount: 2,
            angle: 120,
            spread: 50,
            origin: { x: 1, y: 0.65 },
            colors,
            ticks: 120,
          });

          animFrameRef.current = requestAnimationFrame(frame);
        };

        frame();
      } catch (e) {
        console.error("Confetti error:", e);
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      isRainingRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [delayMs]);

  const handleClose = () => {
    isRainingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    try {
      confetti.reset();
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-background border-4 border-ink rounded-3xl w-full max-w-lg overflow-hidden shadow-[12px_12px_0px_0px_rgba(27,27,27,1)] relative animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-cream border-b-2 border-ink p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-brand-orange text-cream text-[11px] font-black rounded-full border border-ink uppercase tracking-wider shadow-xs flex items-center gap-1.5">
              <PartyPopper className="w-3.5 h-3.5 text-cream animate-bounce" /> PRE ORDER
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
          <div className="flex items-center gap-3.5 bg-orange-50/90 border-2 border-brand-orange/40 p-3.5 rounded-2xl shadow-xs">
            <img
              src={baraSmile}
              alt="Bara Filkom Merch"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain shrink-0 drop-shadow-md animate-bounce"
            />
            <div className="space-y-1 min-w-0">
              <h3 className="display text-base sm:text-lg font-black uppercase text-ink leading-tight flex items-center gap-1.5">
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
                <div className="text-base sm:text-lg font-black text-ink">210+</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase">Pembeli PO</div>
              </div>
            </div>

            <div className="bg-background border-2 border-ink p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex items-center gap-3">
              <div className="p-2 bg-emerald-100 border border-emerald-500 rounded-lg text-emerald-700 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-black text-ink">500+</div>
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
            className="w-full py-3.5 px-4 bg-ink hover:bg-brand-orange text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-brand-orange" /> SAYA MENGERTI
          </button>
        </div>

        {/* Celebratory Bottom Footer Bar */}
        <div className="w-full bg-cream py-2 px-4 border-t-2 border-ink text-center text-[10px] font-black uppercase text-brand-orange tracking-widest flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 animate-spin" /> OFFICIAL ANNOUNCEMENT — FILKOM MERCH STORE <Sparkles className="w-3.5 h-3.5 animate-spin" />
        </div>
      </div>
    </div>
  );
}
