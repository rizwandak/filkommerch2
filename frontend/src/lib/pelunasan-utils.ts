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
  upsizePaidAtDp: boolean;
  unpaidUpsize: number;
}

export const getJacketPriceBreakdown = (item: any): JacketPriceBreakdown => {
  const isJacket = isJacketProduct(item?.product_name);
  const isDp = isDpItem(item);
  const unitPrice = Number(item?.unit_price || item?.price || 0);
  const upsize = isJacket ? getJacketUpsizeSurcharge(item?.product_name, item?.size) : 0;
  const defaultNormalDp = isJacket ? getJacketDefaultNormalDpPrice(item?.product_name) : 0;

  let normalPrice = unitPrice;
  let upsizePaidAtDp = true;
  let unpaidUpsize = 0;

  if (isJacket && isDp) {
    if (defaultNormalDp > 0) {
      normalPrice = defaultNormalDp;
      // If the buyer paid strictly <= defaultNormalDp (e.g. 124.500 for Work Jacket XXL),
      // upsize (+10.000) was NOT paid at DP and is deferred to Pelunasan!
      if (upsize > 0 && unitPrice <= defaultNormalDp) {
        upsizePaidAtDp = false;
        unpaidUpsize = upsize;
      }
    } else if (upsize > 0) {
      normalPrice = Math.max(0, unitPrice - upsize);
    }
  } else if (isJacket && !isDp && upsize > 0) {
    normalPrice = Math.max(0, unitPrice - upsize);
  } else if (isJacket && normalPrice <= 0) {
    normalPrice = defaultNormalDp;
  }

  const subtotal = Number(item?.subtotal || unitPrice * Number(item?.quantity || 1) || 0);

  return {
    isJacket,
    isDp,
    unitPrice,
    upsize,
    normalPrice,
    subtotal,
    upsizePaidAtDp,
    unpaidUpsize,
  };
};

/**
 * Calculates the exact expected pelunasan amount for an order.
 * - If order already has a linked LNS order, uses linkedLns.gross_amount.
 * - Otherwise, sums only the normal DP prices of jacket items (plus any unpaid upsize deferred from DP).
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
    // If upsize was not paid at DP (e.g. Achmad Alvian: charged 124.500 for XXL), add the unpaid upsize (+10.000) to Pelunasan!
    totalPelunasan += (breakdown.normalPrice + breakdown.unpaidUpsize) * qty;
  }

  return totalPelunasan;
};

// ============ MASTER PRICE MATRIX (BATCH 1, BATCH 2, READY STOCK) ============

export const BATCH_1_PRICES: Record<string, number> = {
  kaos: 105000,
  topi: 80000,
  totebag: 40000,
  keychain: 10000,
  sticker: 8000,
  pin_tas: 4000,
  pin_enamel: 26000,
};

export const BATCH_2_PRICES: Record<string, number> = {
  work_jacket: 249000,
  varsity: 329000,
  half_zip: 179000,
  kaos: 89000,
  topi: 80000,
  tumbler: 79000,
  totebag: 40000,
  notebook: 25000,
  pulpen: 10000,
  keychain: 13000,
  sticker: 13000,
  pin_tas: 6000,
  pin_enamel: 32000,
  // Bundles
  brand_new_days: 27000,
  starter_pack: 99000,
  explorer: 319000,
  proud_to_be_filkom: 349000,
};

// PO Batch 2 untuk Umum (Non-FILKOM): menggunakan kolom "FILKOM Sell Price" sesuai arahan
export const BATCH_2_UMUM_PRICES: Record<string, number> = {
  work_jacket: 259000,
  varsity: 349000,
  half_zip: 189000,
  kaos: 95000,
  topi: 89000,
  tumbler: 85000,
  totebag: 45000,
  notebook: 27000,
  pulpen: 12000,
  keychain: 15000,
  sticker: 15000,
  pin_tas: 6000,
  pin_enamel: 36000,
  // Bundles
  brand_new_days: 35000,
  starter_pack: 115000,
  explorer: 349000,
  proud_to_be_filkom: 389000,
};

export const READY_STOCK_FILKOM_PRICES: Record<string, number> = {
  work_jacket: 259000,
  varsity: 349000,
  half_zip: 189000,
  kaos: 95000,
  topi: 89000,
  tumbler: 85000,
  totebag: 45000,
  notebook: 27000,
  pulpen: 12000,
  keychain: 15000,
  sticker: 15000,
  pin_tas: 6000,
  pin_enamel: 36000,
  // Bundles
  brand_new_days: 27000,
  starter_pack: 99000,
  explorer: 319000,
  proud_to_be_filkom: 349000,
};

export const READY_STOCK_UMUM_PRICES: Record<string, number> = {
  work_jacket: 269000,
  varsity: 359000,
  half_zip: 199000,
  kaos: 99000,
  topi: 95000,
  tumbler: 95000,
  totebag: 49000,
  notebook: 29000,
  pulpen: 12000,
  keychain: 15000,
  sticker: 20000,
  pin_tas: 8000,
  pin_enamel: 40000,
  // Bundles
  brand_new_days: 35000,
  starter_pack: 115000,
  explorer: 349000,
  proud_to_be_filkom: 389000,
};

export const normalizeProductKey = (name?: string | null): string => {
  if (!name) return "";
  const n = String(name).toLowerCase();
  if (n.includes("work jacket")) return "work_jacket";
  if (n.includes("varsity")) return "varsity";
  if (n.includes("half zip") || n.includes("halfzip") || n.includes("half-zip")) return "half_zip";
  if (n.includes("kaos") || n.includes("t-shirt") || n.includes("tee")) return "kaos";
  if (n.includes("topi")) return "topi";
  if (n.includes("tumbler") || n.includes("botol")) return "tumbler";
  if (n.includes("totebag") || n.includes("tote")) return "totebag";
  if (n.includes("notebook") || n.includes("buku")) return "notebook";
  if (n.includes("pulpen") || n.includes("pen")) return "pulpen";
  if (n.includes("keychain") || n.includes("gantungan")) return "keychain";
  if (n.includes("sticker") || n.includes("stiker")) return "sticker";
  if (n.includes("pin enamel")) return "pin_enamel";
  if (n.includes("pin tas") || n.includes("pin 44")) return "pin_tas";
  if (n.includes("brand new days")) return "brand_new_days";
  if (n.includes("starter pack")) return "starter_pack";
  if (n.includes("explorer")) return "explorer";
  if (n.includes("proud to be filkom")) return "proud_to_be_filkom";
  return "";
};

export type OrderBatchTier = "BATCH_1" | "BATCH_2" | "READY_STOCK";
export type CustomerPriceCategory = "FILKOM" | "UMUM" | "INTERNASIONAL";

export const determineOrderBatch = (order: any): OrderBatchTier => {
  if (!order) return "READY_STOCK";
  const cId = Number(order.pre_order_campaign_id);
  const orderNum = String(order.order_number || order.order_id || "");
  if (cId === 3 || orderNum.startsWith("IMP-")) return "BATCH_1";
  if (cId === 1) return "BATCH_2";

  const d = order.created_at ? String(order.created_at).substring(0, 10) : "";
  if (d && d >= "2026-07-01" && d <= "2026-07-15") return "BATCH_1";
  if (d && d >= "2026-07-16" && d <= "2026-08-08") return "BATCH_2";
  return "READY_STOCK";
};

export const getOrderBatchLabel = (batch: OrderBatchTier): string => {
  if (batch === "BATCH_1") return "PO Batch 1";
  if (batch === "BATCH_2") return "PO Batch 2";
  return "Ready Stock";
};

/**
 * Calculates item price given a specific category (FILKOM vs UMUM vs INTERNASIONAL)
 */
export const calculateSingleItemPrice = (
  item: any,
  batch: OrderBatchTier,
  category: CustomerPriceCategory
): number => {
  if (!item) return 0;
  const name = item.product_name || item.name || "";
  if (String(name).includes("[KOMPONEN BUNDLE]")) return 0;

  const key = normalizeProductKey(name);

  // Pelunasan item (remaining 50% balance)
  const isPelunasanItem =
    String(name).toUpperCase().includes("PELUNASAN") ||
    String(item.color || "").toUpperCase().includes("PELUNASAN") ||
    String(item.order_id || "").startsWith("LNS-");

  if (isPelunasanItem) {
    if (key === "work_jacket") return 124500;
    if (key === "half_zip") return 89500;
    if (key === "varsity") return 164500;
    if (key === "proud_to_be_filkom") return 164500;
  }

  // Base price lookup according to batch & category
  let basePrice = 0;
  if (category === "INTERNASIONAL") {
    basePrice = Number(item.unit_price || 0);
  } else if (category === "UMUM") {
    if (batch === "BATCH_1") {
      basePrice = BATCH_1_PRICES[key] ?? Number(item.unit_price || 0);
    } else if (batch === "BATCH_2") {
      basePrice = BATCH_2_UMUM_PRICES[key] ?? Number(item.unit_price || 0);
    } else {
      basePrice = READY_STOCK_UMUM_PRICES[key] ?? Number(item.unit_price || 0);
    }
  } else {
    // FILKOM
    if (batch === "BATCH_1") {
      basePrice = BATCH_1_PRICES[key] ?? Number(item.unit_price || 0);
    } else if (batch === "BATCH_2") {
      basePrice = BATCH_2_PRICES[key] ?? Number(item.unit_price || 0);
    } else {
      basePrice = READY_STOCK_FILKOM_PRICES[key] ?? Number(item.unit_price || 0);
    }
  }

  // Jacket calculation: applies upsize (XXL, XXXL, etc.) for both DP and Lunas
  if (isJacketProduct(name)) {
    const upsize = getJacketUpsizeSurcharge(name, item.size);
    if (isDpItem(item)) {
      const halfBase = Math.floor(basePrice / 2);
      const actualUnit = Number(item.unit_price || 0);
      // If the buyer was charged only standard base DP at checkout (e.g. 124.500 instead of 134.500 for XXL),
      // the upsize fee (+10.000) was not charged at DP and is deferred to Pelunasan.
      if (actualUnit === halfBase) {
        return halfBase;
      }
      return halfBase + upsize;
    }
    return basePrice + upsize;
  }

  return basePrice;
};

/**
 * Calculates sum of items under a specific category
 */
export const calculateCategoryTotal = (
  items: any[],
  order: any,
  category: CustomerPriceCategory
): number => {
  const batch = determineOrderBatch(order);
  return items.reduce((sum: number, it: any) => {
    if (String(it?.product_name || "").includes("[KOMPONEN BUNDLE]")) return sum;
    const unitPrice = calculateSingleItemPrice(it, batch, category);
    const qty = Number(it?.quantity || 1);
    return sum + (unitPrice * qty);
  }, 0);
};

/**
 * Determines whether the customer used FILKOM, UMUM, or INTERNASIONAL pricing
 */
export const determineCustomerPriceCategory = (
  order: any,
  itemsOverride?: any[]
): CustomerPriceCategory => {
  if (!order) return "FILKOM";

  // 1. Check International explicitly
  if (
    order.is_international ||
    order.customer_type === "internasional" ||
    order.customer_category === "internasional" ||
    String(order.notes || "").toLowerCase().includes("internasional") ||
    String(order.notes || "").toLowerCase().includes("international")
  ) {
    return "INTERNASIONAL";
  }

  // 2. POS explicit customer_type / category
  if (order.customer_type === "umum" || order.customer_category === "umum") {
    return "UMUM";
  }
  if (order.customer_type === "filkom" || order.customer_category === "filkom") {
    return "FILKOM";
  }

  // 3. Batch 1 Google Form orders (IMP-*) always used Batch 1 prices
  const orderNum = String(order.order_number || order.order_id || "");
  const campaignId = Number(order.pre_order_campaign_id);
  if (campaignId === 3 || orderNum.startsWith("IMP-")) {
    return "FILKOM";
  }

  // 4. Compare subtotal against FILKOM vs UMUM calculation
  const items = itemsOverride || order.items || [];
  const actualSubtotal = Number(order.subtotal || 0);
  if (items.length > 0 && actualSubtotal > 0) {
    const filkomTotal = calculateCategoryTotal(items, order, "FILKOM");
    const umumTotal = calculateCategoryTotal(items, order, "UMUM");

    // If matches UMUM exactly and differs from FILKOM (e.g. Imam: 57.000 vs 51.000, Fathia: 35.000 vs 27.000)
    if (actualSubtotal === umumTotal && actualSubtotal !== filkomTotal) {
      return "UMUM";
    }
    // If matches FILKOM exactly and differs from UMUM
    if (actualSubtotal === filkomTotal && actualSubtotal !== umumTotal) {
      return "FILKOM";
    }
  }

  // 5. Check NIM and verification status
  // PENTING: Civitas FILKOM wajib memiliki NIM terverifikasi (terdaftar di profil atau diisi saat checkout).
  // Akun mahasiswa UB fakultas lain atau mahasiswa yang belum verified NIM-nya (seperti kasus Imam dan Fathia)
  // tetap dikenakan tarif Harga UMUM.
  const nim = String(order.customer_nim || "").trim();
  const isVerified = order.is_filkom_verified === 1 || order.is_filkom_verified === true || order.is_filkom_verified === "1";

  if (nim.length >= 5 || isVerified) {
    return "FILKOM";
  }

  // Jika tidak memiliki NIM terverifikasi pada transaksi -> Harga UMUM
  return "UMUM";
};

export const getPriceCategoryLabel = (category: CustomerPriceCategory): string => {
  if (category === "FILKOM") return "Harga FILKOM";
  if (category === "UMUM") return "Harga Umum";
  return "Harga Internasional";
};

export const getPriceCategoryBadgeColor = (category: CustomerPriceCategory): string => {
  if (category === "FILKOM") return "bg-emerald-100 text-emerald-900 border-emerald-300";
  if (category === "UMUM") return "bg-indigo-100 text-indigo-900 border-indigo-300";
  return "bg-amber-100 text-amber-900 border-amber-300";
};

export const isFilkomCustomer = (order: any): boolean => {
  return determineCustomerPriceCategory(order) === "FILKOM";
};

export const getExpectedItemUnitPrice = (
  item: any,
  order: any,
  categoryOverride?: CustomerPriceCategory
): number => {
  const batch = determineOrderBatch(order);
  const category = categoryOverride || determineCustomerPriceCategory(order);
  return calculateSingleItemPrice(item, batch, category);
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
  batchTier: OrderBatchTier;
  batchLabel: string;
  priceCategory: CustomerPriceCategory;
  priceCategoryLabel: string;
  isFilkom: boolean;
  // Payment tracking (e.g. for Nisfil +2.000 surplus)
  paidAmount: number;
  hasPaymentDiscrepancy: boolean;
  paymentDiff: number;
  paymentDiffType: "OVERPAID" | "UNDERPAID" | "EXACT";
  paymentNote: string | null;
  // Deferred upsize tracking (when upsize was not charged at DP and is deferred to Pelunasan)
  hasDeferredUpsize: boolean;
  deferredUpsizeAmount: number;
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
      batchTier: "READY_STOCK",
      batchLabel: "Ready Stock",
      priceCategory: "FILKOM",
      priceCategoryLabel: "Harga FILKOM",
      isFilkom: true,
      paidAmount: 0,
      hasPaymentDiscrepancy: false,
      paymentDiff: 0,
      paymentDiffType: "EXACT",
      paymentNote: null,
      hasDeferredUpsize: false,
      deferredUpsizeAmount: 0,
    };
  }

  const items: any[] = itemsOverride || order.items || [];
  const batchTier = determineOrderBatch(order);
  const batchLabel = getOrderBatchLabel(batchTier);
  const priceCategory = determineCustomerPriceCategory(order, items);
  const priceCategoryLabel = getPriceCategoryLabel(priceCategory);
  const isFilkom = priceCategory === "FILKOM";

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

  // Calculate expected subtotal using category & batch-aware expected unit prices
  let calculatedExpectedSubtotal = 0;
  if (items.length > 0) {
    calculatedExpectedSubtotal = items.reduce((sum: number, it: any) => {
      if (String(it?.product_name || "").includes("[KOMPONEN BUNDLE]")) return sum;
      const expectedUnit = getExpectedItemUnitPrice(it, order, priceCategory);
      const qty = Number(it?.quantity || 1);
      return sum + (expectedUnit * qty);
    }, 0);
  } else {
    calculatedExpectedSubtotal = actualSubtotal;
  }

  const expectedSubtotal = calculatedExpectedSubtotal;
  const expectedGross = Math.max(
    0,
    expectedSubtotal - posDiscount - voucherDiscount + shippingCost + serviceFee + taxAmount + uniqueCode
  );

  const subtotalDiff = actualSubtotal - expectedSubtotal;
  const grossDiff = actualGross - expectedGross;

  // Detect mismatch if there are items and subtotal differs, or gross amount differs
  const hasMismatch = (items.length > 0 && Math.abs(subtotalDiff) > 0) || Math.abs(grossDiff) > 0;

  // Payment discrepancy tracking (e.g. for Google Form CSV import human error like Nisfil +2.000)
  const verifiedNominal = Number(order.payment_proof_verified_amount || 0);
  const paidAmount = verifiedNominal > 0 ? verifiedNominal : actualGross;
  let paymentDiff = 0;
  let paymentDiffType: "OVERPAID" | "UNDERPAID" | "EXACT" = "EXACT";
  let hasPaymentDiscrepancy = false;
  let paymentNote: string | null = null;

  if (verifiedNominal > 0 && verifiedNominal !== expectedGross) {
    paymentDiff = verifiedNominal - expectedGross;
    hasPaymentDiscrepancy = true;
    paymentDiffType = paymentDiff > 0 ? "OVERPAID" : "UNDERPAID";
    paymentNote =
      paymentDiff > 0
        ? `Pembeli mentransfer Rp ${verifiedNominal.toLocaleString("id-ID")} (Kelebihan Bayar: +Rp ${paymentDiff.toLocaleString("id-ID")})`
        : `Pembeli mentransfer Rp ${verifiedNominal.toLocaleString("id-ID")} (Kurang Bayar: -Rp ${Math.abs(paymentDiff).toLocaleString("id-ID")})`;
  }

  // Detect deferred upsize (e.g. Achmad Alvian: XXL upsize +10k was not charged at DP, will be charged at Pelunasan)
  let deferredUpsizeAmount = 0;
  for (const it of items) {
    if (isJacketProduct(it?.product_name) && isDpItem(it)) {
      const bd = getJacketPriceBreakdown(it);
      if (!bd.upsizePaidAtDp && bd.unpaidUpsize > 0) {
        deferredUpsizeAmount += bd.unpaidUpsize * Number(it?.quantity || 1);
      }
    }
  }
  const hasDeferredUpsize = deferredUpsizeAmount > 0;

  return {
    actualSubtotal,
    expectedSubtotal,
    subtotalDiff,
    actualGross,
    expectedGross,
    grossDiff,
    hasMismatch,
    hasBundleComponents,
    itemsSum: expectedSubtotal,
    batchTier,
    batchLabel,
    priceCategory,
    priceCategoryLabel,
    isFilkom,
    paidAmount,
    hasPaymentDiscrepancy,
    paymentDiff,
    paymentDiffType,
    paymentNote,
    hasDeferredUpsize,
    deferredUpsizeAmount,
  };
};


