import type { PreOrderCampaign } from "@backend/server-actions";

export function isProductVisibleToUser(
  user: any,
  campaign: PreOrderCampaign | null
): boolean {
  // Admin & Cashier can always see all products
  const isAdminOrCashier =
    user?.type === "admin" || user?.role === "admin" || user?.role === "cashier";
  if (isAdminOrCashier) return true;

  // For Customers & Guests, pre-order campaign must be active and current time between start and end date
  if (!campaign || Number(campaign.is_active) !== 1) return false;

  const now = new Date();
  const start = new Date(campaign.start_date);
  const end = campaign.extended_end_date
    ? new Date(campaign.extended_end_date)
    : new Date(campaign.end_date);

  return now >= start && now <= end;
}
