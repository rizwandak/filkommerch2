import React from "react";
import type { PreOrderCampaign } from "@backend/server-actions";

interface Props {
  campaign?: PreOrderCampaign | null;
  message?: string;
}

export function PreOrderNotOpenPlaceholder({ campaign, message }: Props) {
  const startDateFormatted = campaign?.start_date
    ? new Date(campaign.start_date).toLocaleString("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="w-full border-2 border-ink bg-cream/40 rounded-2xl p-6 sm:p-10 text-center shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] my-6 max-w-2xl mx-auto space-y-4">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-orange/20 border-2 border-ink flex items-center justify-center text-2xl sm:text-3xl mx-auto shadow-xs animate-bounce">
        ⏳
      </div>
      <div className="space-y-2">
        <h3 className="display text-lg sm:text-2xl text-ink font-bold uppercase tracking-wide">
          Sabar Yaa, Pre-Order Belum Buka Nih! ⚡
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
          {message ? (
            message
          ) : startDateFormatted ? (
            <>
              Koleksi produk <strong>{campaign?.batch_name || "Pre-Order"}</strong> akan dibuka secara resmi pada{" "}
              <span className="text-brand-orange font-bold underline">{startDateFormatted}</span>.
            </>
          ) : (
            "Sesi Pre-Order merchandise FILKOM berikutnya sedang dipersiapkan. Pantau terus jadwal pembukaan batch terbaru di banner utama atau media sosial resmi kami!"
          )}
        </p>
      </div>
      <div className="pt-1">
        <span className="inline-block text-[9px] sm:text-[10px] font-black text-ink bg-brand-orange px-3.5 py-1.5 rounded-full border border-ink uppercase tracking-widest shadow-xs">
          🔒 KATALOG PRODUK DIKUNCI SEMENTARA UNTUK PEMBELI
        </span>
      </div>
    </div>
  );
}
