import { Router, Request, Response } from "express";
import axios from "axios";
import { config } from "../config/config";
import { getConnection, execute } from "../config/database";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter khusus checkout Mayar (Mencegah spam request)
const mayarCheckoutLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5, // Maksimal 5 percobaan checkout per IP per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak percobaan checkout. Silakan coba lagi dalam 1 menit.",
  },
});

/**
 * A. ROUTE CHECKOUT MAYAR (POST /api/mayar/checkout atau /api/checkout)
 * Dipanggil oleh Frontend saat user mengklik "Bayar" / Proceed to Payment.
 * Menembak REST API Mayar untuk membuat Invoice Link / Payment Link.
 */
router.post("/checkout", mayarCheckoutLimiter, async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const {
      orderId,
      grossAmount,
      customerName,
      customerEmail,
      customerPhone,
      description,
      redirectUrl,
    } = req.body;

    if (!orderId || !grossAmount || !customerEmail || !customerName) {
      return res.status(400).json({
        success: false,
        error: "Parameter wajib tidak lengkap: orderId, grossAmount, customerName, dan customerEmail wajib diisi.",
      });
    }

    console.log(`💳 [MAYAR CHECKOUT] Memproses pembayaran untuk Order ID: ${orderId}, Total: Rp${grossAmount}`);

    // Verification API Key Mayar
    if (!config.mayar.apiKey) {
      console.warn("⚠️ MAYAR_API_KEY belum dikonfigurasi di .env!");
    }

    // 1. Ambil data pesanan dari DB jika perlu dipastikan ketersediaannya
    const [orderRows] = await connection.execute(
      "SELECT order_id, gross_amount, customer_name, customer_email, customer_phone FROM orders WHERE order_id = ?",
      [orderId]
    );
    const existingOrder = (orderRows as any[])[0];

    const finalAmount = existingOrder ? Number(existingOrder.gross_amount) : Number(grossAmount);
    const finalEmail = existingOrder ? existingOrder.customer_email : customerEmail;
    const finalName = existingOrder ? existingOrder.customer_name : customerName;
    const finalPhone = existingOrder?.customer_phone || customerPhone || "08123456789";

    const frontendBase = process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";
    const defaultRedirectUrl = `${frontendBase}/order-success?order_id=${orderId}`;

    // Payload request ke Mayar REST API (https://api.mayar.id/hl/v1/payment/create)
    const mayarPayload = {
      name: finalName,
      email: finalEmail,
      mobile: finalPhone,
      amount: Number(finalAmount),
      description: description || `Pembayaran Merchandise FILKOM UB - Order #${orderId}`,
      redirectUrl: redirectUrl || defaultRedirectUrl,
      extra: {
        orderId: orderId,
      },
    };

    // REST API Endpoint Mayar
    const endpointUrl = `${config.mayar.apiUrl}/payment/create`;

    console.log(`🚀 Sending request to Mayar API (${endpointUrl})...`);

    let paymentLink = "";
    let mayarId = "";

    try {
      const response = await axios.post(endpointUrl, mayarPayload, {
        headers: {
          Authorization: `Bearer ${config.mayar.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 detik timeout
      });

      const mayarData = response.data;
      console.log("✅ Respons dari Mayar API:", JSON.stringify(mayarData));

      // Ekstraksi Invoice URL / Payment Link dari respon Mayar
      paymentLink =
        mayarData?.data?.link ||
        mayarData?.data?.url ||
        mayarData?.link ||
        mayarData?.url;

      mayarId = mayarData?.data?.id || mayarData?.id || "";

      if (!paymentLink) {
        throw new Error("Format respons Mayar tidak memuat tautan pembayaran (link/url)");
      }
    } catch (apiError: any) {
      console.error("❌ Gagal menembak REST API Mayar:", apiError.response?.data || apiError.message);
      
      // Fallback jika API Sandbox belum aktif atau API Key dummy
      if (process.env.NODE_ENV !== "production") {
        console.warn("⚠️ Modus Development/Dev Fallback: Menghasilkan link simulasi Mayar.");
        paymentLink = `https://mayar.id/p/demo-${orderId}`;
        mayarId = `mayar-demo-${Date.now()}`;
      } else {
        return res.status(502).json({
          success: false,
          error: "Gagal menghubungkan ke gateway pembayaran Mayar: " + (apiError.response?.data?.message || apiError.message),
        });
      }
    }

    // 2. Simpan token/link pembayaran Mayar ke database
    await execute(
      "UPDATE orders SET snap_token = ?, payment_type = ? WHERE order_id = ?",
      [paymentLink, "mayar_qris", orderId]
    );

    // 3. Update/Insert catatan transaksi di tabel payments
    const [paymentRows] = await connection.execute(
      "SELECT id FROM payments WHERE order_id = ? AND provider = 'mayar' LIMIT 1",
      [orderId]
    );
    const existingPayment = (paymentRows as any[])[0];

    if (existingPayment) {
      await execute(
        "UPDATE payments SET payment_method = 'mayar', amount = ?, provider_transaction_id = ?, updated_at = NOW() WHERE id = ?",
        [finalAmount, mayarId, existingPayment.id]
      );
    } else {
      await execute(
        `INSERT INTO payments (
          order_id, provider, payment_method, amount, status
        ) VALUES (?, 'mayar', 'mayar_qris', ?, 'pending')`,
        [orderId, finalAmount]
      );
    }

    return res.json({
      success: true,
      orderId,
      paymentUrl: paymentLink,
      redirectUrl: paymentLink,
      mayarId,
      message: "Tautan pembayaran Mayar berhasil dibuat",
    });
  } catch (error: any) {
    console.error("❌ Error internal pada /api/mayar/checkout:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Gagal memproses transaksi checkout Mayar",
    });
  } finally {
    connection.release();
  }
});

/**
 * B. ROUTE WEBHOOK / CALLBACK MAYAR (POST /api/webhook-mayar atau /api/mayar/webhook)
 * Ditembak otomatis oleh server Mayar ketika status pembayaran berubah (misal payment.success).
 * Memperbarui status pesanan di MySQL & stok fisik secara safe & modular.
 */
router.post("/webhook", async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const payload = req.body;
    console.log("🔔 [MAYAR WEBHOOK RECEIVED] Payload:", JSON.stringify(payload, null, 2));

    // Validasi Signature Token (Opsional jika Mayar melempar x-mayar-signature / Authorization Token)
    const webhookTokenHeader = req.headers["authorization"] || req.headers["x-mayar-signature"];
    if (config.mayar.webhookToken && webhookTokenHeader) {
      const cleanToken = String(webhookTokenHeader).replace("Bearer ", "").trim();
      if (cleanToken !== config.mayar.webhookToken) {
        console.error("❌ Security Warning: Token signature Mayar Webhook tidak valid!");
        return res.status(401).json({ error: "Invalid Webhook Token" });
      }
    }

    // Mengambil data event & objek transaksi dari Mayar payload
    // Struktur Mayar standard: { event: "payment.received" / "payment.success", data: { ... } }
    const eventType = payload.event || payload.type || "";
    const dataObj = payload.data || payload;

    const statusStr = (dataObj.status || "").toUpperCase();
    const transactionId = dataObj.id || dataObj.transactionId || dataObj.paymentId || null;
    const paymentMethod = dataObj.paymentCategory || dataObj.paymentChannel || dataObj.paymentMethod || "mayar_qris";

    // Ekstraksi order_id
    let orderId = dataObj.extra?.orderId || dataObj.orderId || dataObj.order_id || null;

    // Jika orderId tidak tersurat di extra, coba ekstrak dari deskripsi
    if (!orderId && dataObj.description) {
      const match = dataObj.description.match(/Order #([A-Za-z0-9-]+)/);
      if (match && match[1]) {
        orderId = match[1];
      }
    }

    // Jika orderId masih belum didapatkan, coba cari order berdasarkan email
    if (!orderId && (dataObj.customerEmail || dataObj.email)) {
      const emailSearch = dataObj.customerEmail || dataObj.email;
      const [matchingOrders] = await connection.execute(
        "SELECT order_id FROM orders WHERE customer_email = ? AND payment_status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [emailSearch]
      );
      const foundOrder = (matchingOrders as any[])[0];
      if (foundOrder) {
        orderId = foundOrder.order_id;
        console.log(`🔍 Order ID ditemukan berdasarkan pencarian email (${emailSearch}): ${orderId}`);
      }
    }

    if (!orderId) {
      console.warn("⚠️ Webhook Mayar diabaikan: Tidak dapat menemukan Order ID dari payload.");
      // Tetap kirim 200 ke Mayar agar server Mayar tidak melakukan retry berulang-ulang
      return res.status(200).json({ success: true, message: "Order ID not identifiable, payload logged." });
    }

    console.log(`⚙️ Memproses Webhook Mayar untuk Order: ${orderId}, Event: ${eventType}, Status: ${statusStr}`);

    // Mulai Transaksi SQL
    await connection.beginTransaction();

    // 1. Lock baris database order
    const [orderRows] = await connection.execute(
      "SELECT id, order_id, user_id, channel, fulfillment_status, payment_status, order_status FROM orders WHERE order_id = ? FOR UPDATE",
      [orderId]
    );
    const order = (orderRows as any[])[0];

    if (!order) {
      console.warn(`⚠️ Order ID (${orderId}) tidak ditemukan di tabel orders.`);
      await connection.rollback();
      return res.status(200).json({ success: true, message: "Order not found in DB" });
    }

    // Lock baris payments
    const [paymentRows] = await connection.execute(
      "SELECT id, status FROM payments WHERE order_id = ? FOR UPDATE",
      [orderId]
    );
    const existingPayment = (paymentRows as any[])[0];

    // Cek idempotensi: jika pesanan sudah berstatus 'paid', langsung sukseskan tanpa mutasi ulang stok
    if (order.payment_status === "paid" || (existingPayment && existingPayment.status === "paid")) {
      console.log(`ℹ️ Webhook Mayar diabaikan: Order ID ${orderId} sudah pernah diproses LUNAS/PAID.`);
      await connection.rollback();
      return res.status(200).json({ success: true, message: "Order already processed as paid" });
    }

    // Deteksi apakah pembayaran sukses
    const isSuccess =
      eventType === "payment.success" ||
      eventType === "payment.received" ||
      eventType === "payment.settled" ||
      statusStr === "SETTLED" ||
      statusStr === "SUCCESS" ||
      statusStr === "PAID";

    const isFailed =
      eventType === "payment.failed" ||
      eventType === "payment.expired" ||
      statusStr === "EXPIRED" ||
      statusStr === "FAILED" ||
      statusStr === "CANCELLED";

    let mappedPaymentStatus: "pending" | "paid" | "expired" | "failed" = "pending";
    if (isSuccess) mappedPaymentStatus = "paid";
    if (isFailed) mappedPaymentStatus = "failed";

    const paidAt = isSuccess ? new Date() : null;

    // 2. Update tabel payments
    if (existingPayment) {
      await connection.execute(
        `UPDATE payments SET 
          status = ?, provider = 'mayar', payment_method = ?, provider_transaction_id = ?, paid_at = ?, raw_callback_json = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          mappedPaymentStatus,
          paymentMethod,
          transactionId,
          paidAt,
          JSON.stringify(payload),
          existingPayment.id,
        ]
      );
    } else {
      await connection.execute(
        `INSERT INTO payments (
          order_id, provider, payment_method, amount, status, provider_transaction_id, paid_at, raw_callback_json
        ) VALUES (?, 'mayar', ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          paymentMethod,
          order.gross_amount || 0,
          mappedPaymentStatus,
          transactionId,
          paidAt,
          JSON.stringify(payload),
        ]
      );
    }

    // 3. Update tabel orders
    let orderStatus = order.order_status;
    let fulfillmentStatus = order.fulfillment_status;

    if (isSuccess) {
      orderStatus = "paid";
      if (order.channel === "pos") {
        orderStatus = "completed";
        fulfillmentStatus = "completed";
      }
    } else if (isFailed) {
      orderStatus = "cancelled";
    }

    await connection.execute(
      `UPDATE orders SET 
        payment_status = ?, order_status = ?, fulfillment_status = ?, payment_type = ?, 
        transaction_status = ?, midtrans_transaction_id = ?, updated_at = NOW() 
       WHERE order_id = ?`,
      [
        isSuccess ? "paid" : isFailed ? "failed" : "pending",
        orderStatus,
        fulfillmentStatus,
        paymentMethod,
        isSuccess ? "settlement" : isFailed ? "cancel" : "pending",
        transactionId,
        orderId,
      ]
    );

    // 4. Manajemen Stok & Catatan Pergerakan Stok (Stock Movements)
    const [items] = await connection.execute(
      "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
      [orderId]
    );
    const orderItemsList = items as any[];

    if (isSuccess) {
      // Pembayaran Sukses: Potong stok fisik & rilis stok yang direservasi
      for (const item of orderItemsList) {
        if (item.variant_id) {
          // Potong stok fisik
          await connection.execute(
            "UPDATE product_variants SET stock = GREATEST(0, CAST(stock AS SIGNED) - ?) WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          // Rilis reservasi stok
          await connection.execute(
            "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
            [item.quantity, item.variant_id]
          );

          // Catat Riwayat Stock Movement
          const [vRows] = await connection.execute(
            "SELECT stock FROM product_variants WHERE id = ?",
            [item.variant_id]
          );
          const curStock = (vRows as any[])[0]?.stock || 0;

          await connection.execute(
            `INSERT INTO stock_movements (
              variant_id, movement_type, quantity_change, stock_before, stock_after,
              reference_type, reference_id, notes
            ) VALUES (?, 'sale', ?, ?, ?, 'order', ?, 'Pembayaran Mayar Sukses (Lunas)')`,
            [item.variant_id, -item.quantity, curStock + item.quantity, curStock, orderId]
          );
        }
      }
      console.log(`✅ [STOK UPDATED] Stok berhasil diperbarui untuk Order: ${orderId}`);
    } else if (isFailed) {
      // Pembayaran Gagal: Cukup rilis reservasi stok
      for (const item of orderItemsList) {
        if (item.variant_id) {
          await connection.execute(
            "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
            [item.quantity, item.variant_id]
          );
        }
      }
      console.log(`❌ [STOK RELEASED] Reservasi stok dirilis untuk Order Gagal: ${orderId}`);
    }

    await connection.commit();
    console.log(`🎉 Webhook Mayar untuk order ${orderId} SELESAI diproses.`);

    // Respon 200 OK ke Server Mayar
    return res.status(200).json({
      success: true,
      message: "Webhook Mayar processed successfully",
      orderId,
    });
  } catch (error: any) {
    await connection.rollback();
    console.error("❌ Error saat memproses Webhook Mayar:", error);
    // Tetap kembalikan 200 agar server callback Mayar tidak melakukan looping retry liar
    return res.status(200).json({
      success: false,
      error: error.message || "Failed to process Mayar webhook internal error",
    });
  } finally {
    connection.release();
  }
});

export default router;
