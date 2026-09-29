import mysql from "mysql2/promise";

interface MigrationOrderItem {
  product_id: number | null;
  variant_id?: number | null;
  use_variant?: "blue" | "topi" | "pulpen";
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface MigrationOrder {
  order_id: string;
  notes: string;
  created_at: string;
  payment_type: "QRIS" | "Tunai";
  provider: "qris" | "cash";
  subtotal: number;
  gross_amount: number;
  items: MigrationOrderItem[];
}

export async function runOhRabrawMigration(connection: mysql.Connection) {
  try {
    const [existing] = await connection.query<any[]>(
      "SELECT COUNT(*) as cnt FROM orders WHERE notes LIKE '%OH RABRAW%'",
    );
    if (existing && existing[0]?.cnt > 0) {
      console.log("ℹ️ [Migration] Data transaksi OH RABRAW 2026 sudah ada, skip import.");
      return;
    }

    console.log("🚀 [Migration] Memulai import data penjualan OH RABRAW 2026...");

    // 1. Resolve dynamic variant IDs to guarantee compatibility across local & live DBs
    const [topiVars] = await connection.query<any[]>(
      "SELECT id FROM product_variants WHERE product_id = 24 AND is_active = 1 LIMIT 1",
    );
    const vidTopi = topiVars?.[0]?.id || 281;

    const [pulpenVars] = await connection.query<any[]>(
      "SELECT id FROM product_variants WHERE product_id = 20 AND is_active = 1 LIMIT 1",
    );
    const vidPulpen = pulpenVars?.[0]?.id || 249;

    const [pinVars] = await connection.query<any[]>(
      "SELECT id, color FROM product_variants WHERE product_id = 17 AND is_active = 1",
    );
    const findPinId = (match: string, fallback: number) => {
      const found = pinVars.find((p) =>
        (p.color || "").toLowerCase().includes(match.toLowerCase()),
      );
      return found ? found.id : fallback;
    };

    const vidBlue = findPinId("Blue", 242);
    const vidBoys = findPinId("Boys", 243);
    const vidGirls = findPinId("Girls", 244);
    const vidOranye = findPinId("Oranye", 245);
    const vidCoding = findPinId("I ❤️", 246) || findPinId("Coding", 246);
    const vidNgoding = findPinId("First Time", 247);
    const vidConnected = findPinId("Connected", 248);

    // Helper to generate Pin item
    const pinItem = (qty: number): MigrationOrderItem => ({
      product_id: 17,
      use_variant: "blue",
      product_name: "Pin Tas",
      size: "One Size",
      color: "FILKOM Blue",
      quantity: qty,
      unit_price: 8000,
      subtotal: qty * 8000,
    });

    // Helper to generate Topi item
    const topiItem = (): MigrationOrderItem => ({
      product_id: 24,
      use_variant: "topi",
      product_name: "Topi Baseball",
      size: "One Size",
      color: "Black",
      quantity: 1,
      unit_price: 89000,
      subtotal: 89000,
    });

    const orders: MigrationOrder[] = [
      // QRIS TRANSACTIONS (42)
      {
        order_id: "OHRABRAW-Q01",
        notes: "OH RABRAW 2026 - QRIS #1",
        created_at: "2026-08-29 09:00:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 12000,
        gross_amount: 12000,
        items: [
          {
            product_id: 20,
            use_variant: "pulpen",
            product_name: "Pulpen",
            size: "One Size",
            color: "Default",
            quantity: 1,
            unit_price: 12000,
            subtotal: 12000,
          },
        ],
      },
      {
        order_id: "OHRABRAW-Q02",
        notes: "OH RABRAW 2026 - QRIS #2",
        created_at: "2026-08-29 09:05:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q03",
        notes: "OH RABRAW 2026 - QRIS #3",
        created_at: "2026-08-29 09:10:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q04",
        notes: "OH RABRAW 2026 - QRIS #4",
        created_at: "2026-08-29 09:15:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 48000,
        gross_amount: 48000,
        items: [pinItem(6)],
      },
      {
        order_id: "OHRABRAW-Q05",
        notes: "OH RABRAW 2026 - QRIS #5",
        created_at: "2026-08-29 09:20:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 240000,
        gross_amount: 240000,
        items: [
          {
            product_id: null,
            variant_id: null,
            product_name: "Varsity Jacket (Stok Lama)",
            size: "One Size",
            color: "Default",
            quantity: 1,
            unit_price: 240000,
            subtotal: 240000,
          },
        ],
      },
      {
        order_id: "OHRABRAW-Q06",
        notes: "OH RABRAW 2026 - QRIS #6",
        created_at: "2026-08-29 09:25:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q07",
        notes: "OH RABRAW 2026 - QRIS #7",
        created_at: "2026-08-29 09:30:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q08",
        notes: "OH RABRAW 2026 - QRIS #8",
        created_at: "2026-08-29 09:35:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q09",
        notes: "OH RABRAW 2026 - QRIS #9",
        created_at: "2026-08-29 09:40:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q10",
        notes: "OH RABRAW 2026 - QRIS #10",
        created_at: "2026-08-29 09:45:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q11",
        notes: "OH RABRAW 2026 - QRIS #11",
        created_at: "2026-08-29 09:50:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q12",
        notes: "OH RABRAW 2026 - QRIS #12",
        created_at: "2026-08-29 09:55:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q13",
        notes: "OH RABRAW 2026 - QRIS #13",
        created_at: "2026-08-29 10:00:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q14",
        notes: "OH RABRAW 2026 - QRIS #14",
        created_at: "2026-08-29 10:05:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 32000,
        gross_amount: 32000,
        items: [pinItem(4)],
      },
      {
        order_id: "OHRABRAW-Q15",
        notes: "OH RABRAW 2026 - QRIS #15",
        created_at: "2026-08-29 10:10:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q16",
        notes: "OH RABRAW 2026 - QRIS #16",
        created_at: "2026-08-29 10:15:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 89000,
        gross_amount: 89000,
        items: [topiItem()],
      },
      {
        order_id: "OHRABRAW-Q17",
        notes: "OH RABRAW 2026 - QRIS #17",
        created_at: "2026-08-29 10:20:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q18",
        notes: "OH RABRAW 2026 - QRIS #18",
        created_at: "2026-08-29 10:25:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q19",
        notes: "OH RABRAW 2026 - QRIS #19",
        created_at: "2026-08-29 10:30:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q20",
        notes: "OH RABRAW 2026 - QRIS #20",
        created_at: "2026-08-29 10:35:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q21",
        notes: "OH RABRAW 2026 - QRIS #21",
        created_at: "2026-08-29 10:40:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q22",
        notes: "OH RABRAW 2026 - QRIS #22",
        created_at: "2026-08-29 10:45:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q23",
        notes: "OH RABRAW 2026 - QRIS #23",
        created_at: "2026-08-29 10:50:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q24",
        notes: "OH RABRAW 2026 - QRIS #24",
        created_at: "2026-08-29 10:55:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q25",
        notes: "OH RABRAW 2026 - QRIS #25",
        created_at: "2026-08-29 11:00:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q26",
        notes: "OH RABRAW 2026 - QRIS #26",
        created_at: "2026-08-29 11:05:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 256000,
        gross_amount: 256000,
        items: [
          {
            product_id: null,
            variant_id: null,
            product_name: "Varsity Jacket (Stok Lama)",
            size: "One Size",
            color: "Default",
            quantity: 1,
            unit_price: 240000,
            subtotal: 240000,
          },
          pinItem(2),
        ],
      },
      {
        order_id: "OHRABRAW-Q27",
        notes: "OH RABRAW 2026 - QRIS #27",
        created_at: "2026-08-29 11:10:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q28",
        notes: "OH RABRAW 2026 - QRIS #28",
        created_at: "2026-08-29 11:15:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q29",
        notes: "OH RABRAW 2026 - QRIS #29",
        created_at: "2026-08-29 11:20:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q30",
        notes: "OH RABRAW 2026 - QRIS #30",
        created_at: "2026-08-29 11:25:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q31",
        notes: "OH RABRAW 2026 - QRIS #31",
        created_at: "2026-08-29 11:30:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q32",
        notes: "OH RABRAW 2026 - QRIS #32",
        created_at: "2026-08-29 11:35:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 89000,
        gross_amount: 89000,
        items: [topiItem()],
      },
      {
        order_id: "OHRABRAW-Q33",
        notes: "OH RABRAW 2026 - QRIS #33",
        created_at: "2026-08-29 11:40:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q34",
        notes: "OH RABRAW 2026 - QRIS #34",
        created_at: "2026-08-29 11:45:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q35",
        notes: "OH RABRAW 2026 - QRIS #35",
        created_at: "2026-08-29 11:50:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q36",
        notes: "OH RABRAW 2026 - QRIS #36",
        created_at: "2026-08-29 11:55:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q37",
        notes: "OH RABRAW 2026 - QRIS #37",
        created_at: "2026-08-29 12:00:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 65000,
        gross_amount: 65000,
        items: [
          {
            product_id: null,
            variant_id: null,
            product_name: "T-Shirt Kaos (Stok Lama)",
            size: "One Size",
            color: "Default",
            quantity: 1,
            unit_price: 65000,
            subtotal: 65000,
          },
        ],
      },
      {
        order_id: "OHRABRAW-Q38",
        notes: "OH RABRAW 2026 - QRIS #38",
        created_at: "2026-08-29 12:05:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-Q39",
        notes: "OH RABRAW 2026 - QRIS #39",
        created_at: "2026-08-29 12:10:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 89000,
        gross_amount: 89000,
        items: [topiItem()],
      },
      {
        order_id: "OHRABRAW-Q40",
        notes: "OH RABRAW 2026 - QRIS #40",
        created_at: "2026-08-29 12:15:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q41",
        notes: "OH RABRAW 2026 - QRIS #41",
        created_at: "2026-08-29 12:20:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-Q42",
        notes: "OH RABRAW 2026 - QRIS #42",
        created_at: "2026-08-29 12:25:00",
        payment_type: "QRIS",
        provider: "qris",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },

      // TUNAI TRANSACTIONS (13 Tracked)
      {
        order_id: "OHRABRAW-C01",
        notes: "OH RABRAW 2026 - Tunai #1",
        created_at: "2026-08-30 09:00:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C02",
        notes: "OH RABRAW 2026 - Tunai #2",
        created_at: "2026-08-30 09:10:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C03",
        notes: "OH RABRAW 2026 - Tunai #3",
        created_at: "2026-08-30 09:20:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-C04",
        notes: "OH RABRAW 2026 - Tunai #4",
        created_at: "2026-08-30 09:30:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C05",
        notes: "OH RABRAW 2026 - Tunai #5",
        created_at: "2026-08-30 09:40:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C06",
        notes: "OH RABRAW 2026 - Tunai #6",
        created_at: "2026-08-30 09:50:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C07",
        notes: "OH RABRAW 2026 - Tunai #7",
        created_at: "2026-08-30 10:00:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C08",
        notes: "OH RABRAW 2026 - Tunai #8",
        created_at: "2026-08-30 10:10:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-C09",
        notes: "OH RABRAW 2026 - Tunai #9",
        created_at: "2026-08-30 10:20:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C10",
        notes: "OH RABRAW 2026 - Tunai #10",
        created_at: "2026-08-30 10:30:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-C11",
        notes: "OH RABRAW 2026 - Tunai #11",
        created_at: "2026-08-30 10:40:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 16000,
        gross_amount: 16000,
        items: [pinItem(2)],
      },
      {
        order_id: "OHRABRAW-C12",
        notes: "OH RABRAW 2026 - Tunai #12",
        created_at: "2026-08-30 10:50:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 8000,
        gross_amount: 8000,
        items: [pinItem(1)],
      },
      {
        order_id: "OHRABRAW-C13",
        notes: "OH RABRAW 2026 - Tunai #13 (Jaket)",
        created_at: "2026-08-30 11:00:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 240000,
        gross_amount: 240000,
        items: [
          {
            product_id: null,
            variant_id: null,
            product_name: "Jaket (Stok Lama)",
            size: "One Size",
            color: "Default",
            quantity: 1,
            unit_price: 240000,
            subtotal: 240000,
          },
        ],
      },

      // TUNAI UNTRACKED (1 Lump-sum)
      {
        order_id: "OHRABRAW-CXX",
        notes:
          "OH RABRAW 2026 - Penjualan Tunai Gabungan (Termasuk 26 pin tak tercatat Rp208.000)",
        created_at: "2026-08-30 16:00:00",
        payment_type: "Tunai",
        provider: "cash",
        subtotal: 365000,
        gross_amount: 365000,
        items: [
          {
            product_id: null,
            variant_id: null,
            product_name: "Penjualan Tunai OH RABRAW (Gabungan)",
            size: "One Size",
            color: "Default",
            quantity: 1,
            unit_price: 365000,
            subtotal: 365000,
          },
        ],
      },
    ];

    // 2. Insert Orders, Items, Payments within a transaction
    await connection.beginTransaction();

    try {
      for (const ord of orders) {
        await connection.query(
          `INSERT INTO orders (
            order_id, channel, fulfillment_type, fulfillment_status, customer_name,
            customer_email, customer_phone, subtotal, gross_amount, payment_status,
            order_status, transaction_status, payment_type, notes, batch_source, created_at
          ) VALUES (?, 'pos', 'walk_in', 'completed', 'Walk-in OH RABRAW', 'pos@filkommerch.com', '000000000000', ?, ?, 'paid', 'completed', 'settlement', ?, ?, 'manual', ?)`,
          [
            ord.order_id,
            ord.subtotal,
            ord.gross_amount,
            ord.payment_type,
            ord.notes,
            ord.created_at,
          ],
        );

        for (const it of ord.items) {
          let resolvedVariantId = it.variant_id;
          if (it.use_variant === "blue") resolvedVariantId = vidBlue;
          else if (it.use_variant === "topi") resolvedVariantId = vidTopi;
          else if (it.use_variant === "pulpen") resolvedVariantId = vidPulpen;

          await connection.query(
            `INSERT INTO order_items (
              order_id, product_id, variant_id, product_name, size, quantity, unit_price, subtotal, color
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ord.order_id,
              it.product_id,
              resolvedVariantId,
              it.product_name,
              it.size,
              it.quantity,
              it.unit_price,
              it.subtotal,
              it.color,
            ],
          );
        }

        await connection.query(
          `INSERT INTO payments (
            order_id, provider, payment_method, amount, status, paid_at
          ) VALUES (?, ?, ?, ?, 'paid', ?)`,
          [ord.order_id, ord.provider, ord.payment_type, ord.gross_amount, ord.created_at],
        );
      }

      // 3. Update Stocks
      await connection.query("UPDATE product_variants SET stock = 11 WHERE id = ?", [vidNgoding]);
      await connection.query("UPDATE product_variants SET stock = 18 WHERE id = ?", [vidBlue]);
      await connection.query("UPDATE product_variants SET stock = 12 WHERE id = ?", [vidBoys]);
      await connection.query("UPDATE product_variants SET stock = 1  WHERE id = ?", [vidCoding]);
      await connection.query("UPDATE product_variants SET stock = 5  WHERE id = ?", [
        vidConnected,
      ]);
      await connection.query("UPDATE product_variants SET stock = 8  WHERE id = ?", [vidOranye]);
      await connection.query("UPDATE product_variants SET stock = 3  WHERE id = ?", [vidGirls]);

      await connection.query(
        "UPDATE product_variants SET stock = GREATEST(0, stock - 3) WHERE id = ?",
        [vidTopi],
      );
      await connection.query(
        "UPDATE product_variants SET stock = GREATEST(0, stock - 1) WHERE id = ?",
        [vidPulpen],
      );

      // 4. Log Stock Movements
      await connection.query(
        `INSERT INTO stock_movements (variant_id, movement_type, quantity_change, reference_type, reference_id, notes, created_at) VALUES
         (?, 'sale', -10, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pin Its My First Time Ngoding (21→11)', '2026-08-30 17:00:00'),
         (?, 'sale', -15, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pin FILKOM Blue (33→18)', '2026-08-30 17:00:00'),
         (?, 'sale', -15, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pin FILKOM Boys (27→12)', '2026-08-30 17:00:00'),
         (?, 'sale', -12, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pin I Love Coding (13→1)', '2026-08-30 17:00:00'),
         (?, 'sale',  -3, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pin Lets Stay Connected (8→5)', '2026-08-30 17:00:00'),
         (?, 'sale', -15, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pin FILKOM Oranye (23→8)', '2026-08-30 17:00:00'),
         (?, 'sale', -24, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pin FILKOM Girls (27→3)', '2026-08-30 17:00:00'),
         (?, 'sale',  -3, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Topi Baseball (3 buah)', '2026-08-30 17:00:00'),
         (?, 'sale',  -1, 'order', 'OHRABRAW-BATCH', 'OH RABRAW 2026: Pulpen (1 buah)', '2026-08-30 17:00:00')`,
        [
          vidNgoding,
          vidBlue,
          vidBoys,
          vidCoding,
          vidConnected,
          vidOranye,
          vidGirls,
          vidTopi,
          vidPulpen,
        ],
      );

      await connection.query(
        `INSERT INTO stock_movements (variant_id, movement_type, quantity_change, reference_type, reference_id, notes, created_at) VALUES
         (?, 'adjustment_out', -978, 'manual', 'STOCK-CORRECTION', 'Koreksi stok pin dari placeholder 999 ke stok fisik real (21 sebelum OH)', '2026-08-29 08:00:00'),
         (?, 'adjustment_out', -966, 'manual', 'STOCK-CORRECTION', 'Koreksi stok pin dari placeholder 999 ke stok fisik real (33 sebelum OH)', '2026-08-29 08:00:00'),
         (?, 'adjustment_out', -972, 'manual', 'STOCK-CORRECTION', 'Koreksi stok pin dari placeholder 999 ke stok fisik real (27 sebelum OH)', '2026-08-29 08:00:00'),
         (?, 'adjustment_out', -986, 'manual', 'STOCK-CORRECTION', 'Koreksi stok pin dari placeholder 999 ke stok fisik real (13 sebelum OH)', '2026-08-29 08:00:00'),
         (?, 'adjustment_out', -991, 'manual', 'STOCK-CORRECTION', 'Koreksi stok pin dari placeholder 999 ke stok fisik real (8 sebelum OH)', '2026-08-29 08:00:00'),
         (?, 'adjustment_out', -976, 'manual', 'STOCK-CORRECTION', 'Koreksi stok pin dari placeholder 999 ke stok fisik real (23 sebelum OH)', '2026-08-29 08:00:00'),
         (?, 'adjustment_out', -972, 'manual', 'STOCK-CORRECTION', 'Koreksi stok pin dari placeholder 999 ke stok fisik real (27 sebelum OH)', '2026-08-29 08:00:00')`,
        [vidNgoding, vidBlue, vidBoys, vidCoding, vidConnected, vidOranye, vidGirls],
      );

      await connection.commit();
      console.log("✅ [Migration] Sukses mengimpor 56 transaksi OH RABRAW 2026!");
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (err: any) {
    console.error("❌ [Migration] Gagal mengimpor OH RABRAW:", err?.message || err);
  }
}
