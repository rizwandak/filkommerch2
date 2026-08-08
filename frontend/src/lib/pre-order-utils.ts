import type { PreOrderCampaign } from "@backend/server-actions";

export function isPreOrderOpen(campaign: PreOrderCampaign | null): boolean {
  if (!campaign || Number(campaign.is_active) !== 1) return false;

  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = campaign.extended_end_date
    ? new Date(campaign.extended_end_date)
    : new Date(campaign.end_date);

  return now >= start && now <= end;
}

export function isProductVisibleToUser(
  user: any,
  campaign: PreOrderCampaign | null
): boolean {
  // Produk selalu terlihat oleh semua user.
  // Pembelian diatur terpisah via isPreOrderOpen().
  return true;
}

