import logoFilkom from "@/assets/logo_filkom.png";
import logoFM from "@/assets/logo-fm.jpg";
import { toast } from "sonner";
import type { ReceiptData } from "./bluetooth-printer";

export type { ReceiptData };

export function cleanProductName(name?: string | null): string {
  if (!name) return "Produk";
  return name
    .replace(/\s*\(\s*(?:DP|LUNAS|PELUNASAN|DP\s*\d*%?)\s*\)/gi, "")
    .replace(/\s*-\s*(?:DP|LUNAS|PELUNASAN|DP\s*\d*%?)/gi, "")
    .replace(/\b(?:DP\s*\d*%?|PELUNASAN)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function cleanVariantPart(str?: string | null): string {
  if (!str) return "";
  const trimmed = str.trim();
  if (
    /^(dp|lunas|pelunasan|dp\s*\d*%?|one\s*size|all\s*size|standard|default|-)$/i.test(trimmed)
  ) {
    return "";
  }
  const cleaned = trimmed
    .replace(/\s*\(\s*(?:dp|lunas|pelunasan|dp\s*\d*%?)\s*\)/gi, "")
    .replace(/\s*-\s*(?:dp|lunas|pelunasan|dp\s*\d*%?)\s*$/gi, "")
    .replace(/^\s*(?:dp|lunas|pelunasan|dp\s*\d*%?)\s*-\s*/gi, "")
    .replace(/\b(?:dp|lunas|pelunasan|dp\s*\d*%?)\b/gi, "")
    .replace(/\s*-\s*$/, "")
    .replace(/^\s*-\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (
    !cleaned ||
    /^(dp|lunas|pelunasan|dp\s*\d*%?|one\s*size|all\s*size|standard|default|-)$/i.test(cleaned)
  ) {
    return "";
  }
  return cleaned;
}

export function formatTransactionToReceiptData(
  transaction: any,
  items: any[],
  cashierName?: string
): ReceiptData {
  const store_name = "FILKOM MERCH";
  const sale_id = transaction.order_id || transaction.sale_id || "-";

  let date = new Date().toLocaleDateString("id-ID");
  let time = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (transaction.created_at) {
    const d = new Date(transaction.created_at);
    if (!isNaN(d.getTime())) {
      date = d.toLocaleDateString("id-ID");
      time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }
  }

  const formattedItems = (items || []).map((item) => {
    const cleanName = cleanProductName(item.product_name);
    const variantCandidates = [
      cleanVariantPart(item.size),
      cleanVariantPart(item.color),
      cleanVariantPart(item.variant_name),
      cleanVariantPart(item.variant_info),
    ].filter(Boolean);

    // Deduplicate identical variant parts (e.g. if size and variant_name are both "L")
    const uniqueVariants = Array.from(new Set(variantCandidates));
    const variantInfo = uniqueVariants.join(" / ");

    const name = variantInfo ? `${cleanName} (${variantInfo})` : cleanName;
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unit_price ?? item.price ?? 0);
    const subtotal = Number(item.subtotal ?? (qty * price));
    return { name, qty, price, subtotal };
  });

  const subtotal = Number(transaction.subtotal || transaction.gross_amount || 0);
  const discount = Number(transaction.discount || transaction.discount_amount || 0);
  const tax = Number(transaction.tax || transaction.tax_amount || 0);
  const total = Number(transaction.gross_amount || transaction.total || (subtotal - discount + tax));

  let paymentMethod = transaction.payment_type || transaction.payment_method || "Tunai";
  if (paymentMethod === "manual_qris") paymentMethod = "QRIS Statis";
  else if (paymentMethod === "cash") paymentMethod = "Tunai";
  else if (paymentMethod === "qris") paymentMethod = "QRIS";
  else if (paymentMethod === "bank_transfer") paymentMethod = "Transfer Bank";

  return {
    store_name,
    sale_id,
    date,
    time,
    items: formattedItems,
    subtotal,
    discount,
    tax,
    total,
    payment_method: paymentMethod,
    cashier_name: transaction.cashier_name || cashierName || "Admin",
    customer_name: transaction.customer_name || undefined,
  };
}

export function printBrowserReceipt(data: ReceiptData) {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) {
    toast.error("Gagal membuka jendela cetak. Pastikan pop-up diperbolehkan di browser Anda.");
    return;
  }

  const itemsHtml = data.items
    .map(
      (item) => `
    <div style="margin-bottom: 6px;">
      <div style="font-weight: bold; word-break: break-word;">${item.name}</div>
      <div style="display: flex; justify-content: space-between; font-size: 9px;">
        <span>${item.qty} x Rp ${item.price.toLocaleString("id-ID")}</span>
        <span>Rp ${item.subtotal.toLocaleString("id-ID")}</span>
      </div>
    </div>
  `,
    )
    .join("");

  const discountHtml =
    data.discount > 0
      ? `
    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
      <span>Diskon:</span>
      <span>-Rp ${data.discount.toLocaleString("id-ID")}</span>
    </div>
  `
      : "";

  const customerHtml = data.customer_name
    ? `
    <div>Pelanggan: ${data.customer_name}</div>
  `
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cetak Struk - FM</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body {
            width: 50mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 10px;
            color: #000;
            background: #fff;
            line-height: 1.3;
          }
          .text-center {
            text-align: center;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .header {
            margin-bottom: 8px;
          }
          .logo {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          .info {
            font-size: 9px;
            margin-bottom: 8px;
          }
          .total-section {
            font-weight: bold;
            margin-top: 6px;
          }
          .footer {
            margin-top: 12px;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="header text-center">
          <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 6px;">
            <img src="${logoFilkom}" style="width: 40px; height: auto; filter: grayscale(100%);" />
            <img src="${logoFM}" style="width: 40px; height: auto; filter: grayscale(100%);" />
          </div>
          <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px;">FILKOM MERCH</div>
          <div style="font-size: 8.5px; font-weight: bold; margin-bottom: 2px;">Universitas Brawijaya</div>
          <div style="font-size: 7.5px; line-height: 1.25; color: #222;">
            Gedung A Fakultas Ilmu Komputer UB<br/>
            Ketawanggede, Kec. Lowokwaru, Kota Malang, Jawa Timur 65113
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="info">
          <div>No: ${data.sale_id}</div>
          <div>Tgl: ${data.date} ${data.time}</div>
          <div>Kasir: ${data.cashier_name}</div>
          ${customerHtml}
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${itemsHtml}
        </div>
        
        <div class="divider"></div>
        
        <div class="total-section">
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
            <span>Subtotal:</span>
            <span>Rp ${data.subtotal.toLocaleString("id-ID")}</span>
          </div>
          ${discountHtml}
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 4px; border-top: 1px dashed #000; padding-top: 4px;">
            <span>TOTAL:</span>
            <span>Rp ${data.total.toLocaleString("id-ID")}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer text-center">
          <div style="font-weight: bold;">Terima kasih telah membeli!</div>
          <div style="margin-top: 2px; font-style: italic; font-size: 8px;">Wear Your Faculty.</div>
          <div style="margin-top: 5px; font-size: 7.5px; line-height: 1.3;">
            <div>filkommerch.com</div>
            <div>IG & TikTok: @filkommerchub</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
