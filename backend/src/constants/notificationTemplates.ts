export interface NotificationTemplate {
  title: string;
  message: string;
  link?: string;
  type: string;
}

export const NOTIFICATION_TEMPLATES = {
  PREORDER_READY: (trxId: string, productName?: string): NotificationTemplate => ({
    title: `📦 Pesanan #${trxId} Siap Diambil!`,
    message: `Halo! Produk ${productName ? `"${productName}"` : "Pre-Order kamu"} sudah siap diambil di FILKOM Merch (Samping Gedung A dekat FTAB). Silakan tunjukkan QR / ID pesanan saat pengambilan.`,
    link: `/orders/${trxId}`,
    type: "PREORDER_READY",
  }),

  PAYMENT_REJECTED: (trxId: string, reason?: string): NotificationTemplate => ({
    title: `⚠️ Bukti Pembayaran Perlu Diupload Ulang (#${trxId})`,
    message: `Bukti pembayaran untuk pesanan #${trxId} belum sesuai${reason ? `: ${reason}` : " (buram/nominal tidak pas)"}. Mohon upload ulang bukti transfer kamu.`,
    link: `/orders/${trxId}`,
    type: "PAYMENT_REJECTED",
  }),

  PAYMENT_VERIFIED: (trxId: string): NotificationTemplate => ({
    title: `✅ Pembayaran #${trxId} Berhasil Dikonfirmasi`,
    message: `Pembayaran kamu untuk pesanan #${trxId} telah diverifikasi oleh admin. Terima kasih!`,
    link: `/orders/${trxId}`,
    type: "PAYMENT_VERIFIED",
  }),

  COMPLAINT_UPDATE: (trxId: string, statusText?: string): NotificationTemplate => ({
    title: `💬 Update Status Komplain Pesanan #${trxId}`,
    message: `Komplain kamu untuk pesanan #${trxId} telah diperbarui${statusText ? `: ${statusText}` : ""}. Klik untuk melihat kelanjutannya.`,
    link: `/orders/${trxId}`,
    type: "COMPLAINT_UPDATE",
  }),

  CUSTOM_DIRECT: (title: string, message: string, trxId?: string): NotificationTemplate => ({
    title,
    message,
    link: trxId ? `/orders/${trxId}` : "/orders",
    type: "CUSTOM_DIRECT",
  }),

  BROADCAST: (title: string, message: string, link?: string): NotificationTemplate => ({
    title,
    message,
    link: link || "/products",
    type: "BROADCAST",
  }),
};
