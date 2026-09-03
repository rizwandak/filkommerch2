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
    const pickup_status = item.pickup_status;
    return { name, qty, price, subtotal, pickup_status };
  });

  const itemsSum = formattedItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const subtotal = Number(transaction.subtotal) || (itemsSum > 0 ? itemsSum : Number(transaction.gross_amount || 0));
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
    customer_name: transaction.customer_name || transaction.user_name || transaction.name || undefined,
  };
}

export function printBrowserReceipt(data: ReceiptData) {
  const itemsHtml = data.items
    .map((item) => {
      const isReadyOrPicked = item.pickup_status === "picked_up" || item.pickup_status === "ready";
      const isPending = item.pickup_status === "pending";
      const checkmark = isReadyOrPicked
        ? '<span style="font-weight: 900; margin-right: 2px;">[✓]</span> '
        : isPending
          ? '<span style="font-weight: normal; color: #555; margin-right: 2px;">[ ]</span> '
          : "";
      const suffixBadge = isPending
        ? ' <span style="font-size: 6.5px; font-weight: bold; border: 1px solid #000; padding: 0 1px;">(MENYUSUL)</span>'
        : "";

      return `
    <div style="margin-bottom: 5px; padding-bottom: 2px;">
      <div style="font-weight: bold; word-break: break-word; font-size: 8px; line-height: 1.25;">${checkmark}${item.name}${suffixBadge}</div>
      <div style="display: flex; justify-content: space-between; font-size: 7.5px; margin-top: 2px;">
        <span style="color: #333;">${item.qty}x @Rp ${item.price.toLocaleString("id-ID")}</span>
        <span style="font-weight: 900;">Rp ${item.subtotal.toLocaleString("id-ID")}</span>
      </div>
    </div>
  `;
    })
    .join("");

  const discountHtml =
    data.discount > 0
      ? `
    <div style="display: flex; justify-content: space-between; font-size: 7.5px; margin-bottom: 2px;">
      <span>Diskon:</span>
      <span>-Rp ${data.discount.toLocaleString("id-ID")}</span>
    </div>
  `
      : "";

  const paymentMethodHtml = data.payment_method
    ? `<div><strong>Metode:</strong> ${data.payment_method}</div>`
    : "";

  const customerHtml = data.customer_name
    ? `<div><strong>Pelanggan:</strong> ${data.customer_name}</div>`
    : "";

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cetak Struk - ${data.sale_id}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm !important;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100%;
            max-width: 48mm;
            margin: 0 !important;
            margin-left: 0 !important;
            padding: 1mm 0mm 6mm 0mm;
            padding-left: 0 !important;
            font-family: 'Consolas', 'Courier New', Courier, monospace;
            font-size: 7.5px;
            color: #000;
            background: #fff;
            line-height: 1.3;
          }
          .text-center {
            text-align: center;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 4px 0;
            width: 100%;
          }
          .header {
            margin-bottom: 5px;
            width: 100%;
          }
          .info {
            font-size: 7px;
            margin-bottom: 4px;
            line-height: 1.35;
            width: 100%;
          }
          .total-section {
            font-weight: bold;
            margin-top: 4px;
            width: 100%;
          }
          .footer {
            margin-top: 6px;
            font-size: 7px;
            width: 100%;
          }
          .no-print-bar {
            text-align: center;
            padding: 6px;
            background: #f3f4f6;
            margin-bottom: 6px;
            border-radius: 4px;
            font-family: sans-serif;
          }
          .no-print-btn {
            background: #ea580c;
            color: #fff;
            border: none;
            padding: 5px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 11px;
            cursor: pointer;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
            html, body {
              width: 100% !important;
              max-width: 48mm !important;
              margin: 0 !important;
              margin-left: 0 !important;
              padding: 0 !important;
              padding-left: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <button class="no-print-btn" onclick="window.print()">🖨️ Cetak ke Thermal 50mm</button>
        </div>

        <div class="header text-center">
          <div style="display: flex; justify-content: center; align-items: center; gap: 5px; margin-bottom: 4px;">
            <img src="${logoFilkom}" style="width: 24px; height: auto; filter: grayscale(100%);" />
            <img src="${logoFM}" style="width: 24px; height: auto; filter: grayscale(100%);" />
          </div>
          <div style="font-size: 10px; font-weight: 900; letter-spacing: 0.8px;">FILKOM MERCH</div>
          <div style="font-size: 7.5px; font-weight: bold; margin-top: 1px;">Universitas Brawijaya</div>
          <div style="font-size: 6.5px; line-height: 1.3; color: #222; margin-top: 2px;">
            Gedung A FILKOM UB<br/>
            Lowokwaru, Kota Malang
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="info">
          <div><strong>No:</strong> ${data.sale_id}</div>
          <div><strong>Tgl:</strong> ${data.date} ${data.time}</div>
          <div><strong>Kasir:</strong> ${data.cashier_name}</div>
          ${paymentMethodHtml}
          ${customerHtml}
        </div>
        
        <div class="divider"></div>
        
        <div class="items">
          ${itemsHtml}
        </div>
        
        <div class="divider"></div>
        
        <div class="total-section">
          <div style="display: flex; justify-content: space-between; font-size: 7.5px; margin-bottom: 2px;">
            <span>Subtotal:</span>
            <span>Rp ${data.subtotal.toLocaleString("id-ID")}</span>
          </div>
          ${discountHtml}
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; font-weight: 900; margin-top: 3px; border-top: 1px dashed #000; padding-top: 3px;">
            <span>TOTAL:</span>
            <span>Rp ${data.total.toLocaleString("id-ID")}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer text-center">
          <div style="font-weight: 900; letter-spacing: 0.5px;">*** TERIMA KASIH ***</div>
          <div style="margin-top: 2px; font-style: italic; font-size: 7px; color: #444;">Wear Your Faculty.</div>
          <div style="margin-top: 4px; font-size: 6.5px; line-height: 1.3; color: #333;">
            <div>filkommerch.com</div>
            <div>IG & TikTok: @filkommerchub</div>
          </div>
        </div>

        <script>
          function triggerPrint() {
            window.focus();
            setTimeout(function() {
              window.print();
            }, 300);
          }
          if (document.readyState === 'complete') {
            triggerPrint();
          } else {
            window.addEventListener('load', triggerPrint);
          }
          window.onafterprint = function() {
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  // 1. Try opening print window
  let printWindow: Window | null = null;
  try {
    printWindow = window.open("", "_blank", "width=420,height=650");
  } catch {
    printWindow = null;
  }

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      return;
    } catch (e) {
      console.warn("Popup printing document.write failed, falling back to iframe:", e);
    }
  }

  // 2. Fallback: Hidden iframe printing (bypasses popup blockers seamlessly)
  try {
    let iframe = document.getElementById("receipt-print-iframe") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "receipt-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 400);
    }
  } catch (err) {
    console.error("Iframe print fallback failed:", err);
    toast.error("Gagal membuka jendela cetak. Pastikan pop-up diperbolehkan di browser Anda.");
  }
}
