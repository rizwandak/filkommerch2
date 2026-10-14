/**
 * Pelunasan & Jacket Sizing Utilities
 * 
 * Rules:
 * 1. Hanya jaket (Varsity Jacket, Work Jacket, Half Zip Jacket) yang memiliki komponen pelunasan.
 *    Barang selain jaket (sticker, pin, gantungan kunci, dsb.) dibayar lunas di awal saat checkout DP.
 * 2. Biaya upsize (untuk ukuran XXL ke atas: XXL +Rp10.000, XXXL +Rp15.000/Rp20.000) HANYA
 *    dibayar satu kali di pembayaran DP.
 * 3. Pelunasan hanya membayar sesuai harga normal jaket (50% dari harga normal jaket tanpa biaya upsize).
 */

export const isJacketProduct = (productName?: string | null): boolean => {
  if (!productName) return false;
  const n = String(productName).toLowerCase();
  return (
    n.includes("varsity") ||
    n.includes("work jacket") ||
    n.includes("half zip") ||
    n.includes("halfzip") ||
    n.includes("half-zip")
  );
};

export const getJacketUpsizeSurcharge = (productName?: string | null, sizeStr?: string | null): number => {
  const s = String(sizeStr || "").toUpperCase().trim();
  const n = String(productName || "").toLowerCase();

  if (s === "XXL" || s === "2XL") {
    return 10000;
  }
  if (s === "XXXL" || s === "3XL") {
    if (n.includes("varsity")) return 20000;
    return 15000;
  }
  if (s === "XXXXL" || s === "4XL") {
    return 30000;
  }
  if (s === "XXXXXL" || s === "5XL") {
    return 40000;
  }
  return 0;
};

export const getJacketDefaultNormalDpPrice = (productName?: string | null): number => {
  const n = String(productName || "").toLowerCase();
  if (n.includes("work jacket")) return 124500;
  if (n.includes("half")) return 89500;
  if (n.includes("varsity")) return 164500;
  return 0;
};

export const isDpItem = (item: any): boolean => {
  if (!item) return false;
  const c = String(item.color || "").toUpperCase();
  const s = String(item.size || "").toUpperCase();
  const n = String(item.product_name || "").toUpperCase();

  const isExplicitLunas =
    c.includes("LUNAS") ||
    s.includes("LUNAS") ||
    c.includes("FULL") ||
    s.includes("FULL");

  if (isExplicitLunas) return false;

  return c.includes("DP") || s.includes("DP") || n.includes("DP");
};

export interface JacketPriceBreakdown {
  isJacket: boolean;
  isDp: boolean;
  unitPrice: number;
  upsize: number;
  normalPrice: number;
  subtotal: number;
}

export const getJacketPriceBreakdown = (item: any): JacketPriceBreakdown => {
  const isJacket = isJacketProduct(item?.product_name);
  const isDp = isDpItem(item);
  const unitPrice = Number(item?.unit_price || item?.price || 0);
  const upsize = isJacket ? getJacketUpsizeSurcharge(item?.product_name, item?.size) : 0;

  let normalPrice = unitPrice;
  if (isJacket && upsize > 0) {
    normalPrice = Math.max(0, unitPrice - upsize);
  } else if (isJacket && normalPrice <= 0) {
    normalPrice = getJacketDefaultNormalDpPrice(item?.product_name);
  }

  const subtotal = Number(item?.subtotal || unitPrice * Number(item?.quantity || 1) || 0);

  return {
    isJacket,
    isDp,
    unitPrice,
    upsize,
    normalPrice,
    subtotal,
  };
};

/**
 * Calculates the exact expected pelunasan amount for an order.
 * - If order already has a linked LNS order, uses linkedLns.gross_amount.
 * - Otherwise, sums only the normal DP prices of jacket items (ignoring upsize and non-jacket items).
 */
export const calculateOrderPelunasanAmount = (order: any, linkedLns?: any): number => {
  if (linkedLns && Number(linkedLns.gross_amount) > 0) {
    return Number(linkedLns.gross_amount);
  }

  if (!order) return 0;

  const items: any[] = order.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    // If order notes mention DP and specific jacket
    const notes = String(order.notes || "").toLowerCase();
    if (notes.includes("work jacket")) return 124500;
    if (notes.includes("half zip") || notes.includes("halfzip")) return 89500;
    if (notes.includes("varsity")) return 164500;
    return 0;
  }

  let totalPelunasan = 0;
  for (const item of items) {
    if (!isJacketProduct(item.product_name)) continue;
    if (!isDpItem(item)) continue;

    const breakdown = getJacketPriceBreakdown(item);
    const qty = Number(item.quantity || 1);
    totalPelunasan += breakdown.normalPrice * qty;
  }

  return totalPelunasan;
};

export interface OrderPriceAudit {
  actualSubtotal: number;
  expectedSubtotal: number;
  subtotalDiff: number; // actual - expected (+: overcharged in DB, -: undercharged in DB)
  actualGross: number;
  expectedGross: number;
  grossDiff: number;
  hasMismatch: boolean;
  hasBundleComponents: boolean;
  itemsSum: number;
}

export const calculateOrderPriceAudit = (order: any, itemsOverride?: any[]): OrderPriceAudit => {
  if (!order) {
    return {
      actualSubtotal: 0,
      expectedSubtotal: 0,
      subtotalDiff: 0,
      actualGross: 0,
      expectedGross: 0,
      grossDiff: 0,
      hasMismatch: false,
      hasBundleComponents: false,
      itemsSum: 0,
    };
  }

  const items: any[] = itemsOverride || order.items || [];
  const actualSubtotal = Number(order.subtotal || 0);
  const actualGross = Number(order.gross_amount || 0);

  const posDiscount = Number(order.discount || 0);
  const voucherDiscount = Number(order.discount_amount || 0);
  const shippingCost = Number(order.shipping_cost || 0);
  const serviceFee = Number(order.service_fee || 0);
  const taxAmount = Number(order.tax_amount || 0);
  const uniqueCode = Number(order.unique_code || 0);

  const hasBundleComponents = items.some((i: any) =>
    String(i?.product_name || "").includes("[KOMPONEN BUNDLE]")
  );

  // If there are items, sum them up (exclude [KOMPONEN BUNDLE] prices as the bundle covers it)
  let itemsSum = 0;
  if (items.length > 0) {
    itemsSum = items.reduce((sum: number, it: any) => {
      if (String(it?.product_name || "").includes("[KOMPONEN BUNDLE]")) return sum;
      return sum + Number(it?.subtotal ?? (Number(it?.unit_price || 0) * Number(it?.quantity || 1)));
    }, 0);
  } else {
    itemsSum = actualSubtotal;
  }

  const expectedSubtotal = itemsSum;
  const expectedGross = Math.max(
    0,
    expectedSubtotal - posDiscount - voucherDiscount + shippingCost + serviceFee + taxAmount + uniqueCode
  );

  const subtotalDiff = actualSubtotal - expectedSubtotal;
  const grossDiff = actualGross - expectedGross;

  // Detect mismatch if there are items and subtotal differs, or gross amount differs
  const hasMismatch = (items.length > 0 && Math.abs(subtotalDiff) > 0) || Math.abs(grossDiff) > 0;

  return {
    actualSubtotal,
    expectedSubtotal,
    subtotalDiff,
    actualGross,
    expectedGross,
    grossDiff,
    hasMismatch,
    hasBundleComponents,
    itemsSum,
  };
};
