import { Router } from "express";
import { snap } from "../config/midtrans";
import { query, queryOne, execute, getConnection } from "../config/database";
import { config } from "../config/config";
import { verifyMidtransSignature } from "../utils/midtrans-signature";
import { validateBody, checkoutSchema } from "../middleware/validation";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiter khusus untuk checkout via payment route
const paymentCheckoutLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5, // Maksimal 5 request per IP per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak percobaan checkout. Silakan coba lagi dalam 1 menit.",
  },
});

// POST /api/payment/checkout — dilindungi rate limiter + validasi Zod
router.post("/checkout", paymentCheckoutLimiter, validateBody(checkoutSchema), async (req, res) => {
  try {
    const { orderId, grossAmount, customerName, customerEmail, customerPhone, items } = req.body;

    // Validasi tambahan: grossAmount sudah dipastikan positif oleh Zod schema
    // Items juga sudah divalidasi — price dan quantity dijamin positif

    // Create Midtrans snap transaction parameters
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Number(grossAmount)
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: customerName,
        email: customerEmail,
        phone: customerPhone
      },
      item_details: items ? items.map((item: any) => ({
        id: item.id || String(item.product_id) || "item-id",
        price: Number(item.price),
        quantity: Number(item.quantity),
        name: item.name || item.product_name
      })) : []
    };

    const transaction = await snap.createTransaction(parameter);
    
    // Update the snap token in database if the order exists
    await execute(
      "UPDATE orders SET snap_token = ?, payment_type = ? WHERE order_id = ?",
      [transaction.token, "qris", orderId]
    );

    return res.json({
      success: true,
      orderId,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      qrUrl: `https://app.sandbox.midtrans.com/qris/${transaction.token}.png`
    });
  } catch (error: any) {
    console.error("Error in /payment/checkout:", error);
    return res.status(500).json({ error: error.message || "Failed to create payment transaction" });
  }
});

// POST /api/payment/notification — Midtrans Webhook/Callback
// PENTING: Endpoint ini menerima request dari server Midtrans, bukan dari frontend.
// Verifikasi dilakukan via SHA-512 signature key dengan timing-safe comparison.
router.post("/notification", async (req, res) => {
  const connection = await getConnection();
  try {
    const payload = req.body;
    let { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id, payment_type } = payload;

    // ============ VERIFIKASI SIGNATURE KEY MIDTRANS ============
    // Formula: SHA512(order_id + status_code + gross_amount + server_key)
    // Menggunakan crypto.timingSafeEqual() untuk mencegah timing attack
    const isSignatureValid = verifyMidtransSignature(
      order_id,
      status_code,
      gross_amount,
      config.midtrans.serverKey,
      signature_key
    );

    if (!isSignatureValid) {
      console.error(`❌ [SECURITY] Invalid Midtrans signature for order: ${order_id}`);
      console.error(`   Received signature: ${signature_key?.substring(0, 32)}...`);
      return res.status(403).json({ error: "Invalid signature key — request ditolak" });
    }

    console.log(`🔔 ✅ Payment notification VERIFIED for order: ${order_id}, status: ${transaction_status}`);

    // Reassign order_id to actual order ID if it has a suffix timestamp
    const parts = order_id.split("-");
    if (parts.length > 2 && /^\d+$/.test(parts[parts.length - 1])) {
      order_id = parts.slice(0, -1).join("-");
      console.log(`🧹 Cleaned suffix from order_id: ${payload.order_id} -> ${order_id}`);
    }

    await connection.beginTransaction();

    // 1. Lock the order row
    const [orderRows] = await connection.execute(
      "SELECT id, order_id, user_id, channel, fulfillment_status, payment_status, order_status FROM orders WHERE order_id = ? FOR UPDATE",
      [order_id]
    );
    const order = (orderRows as any[])[0];

    if (!order) {
      console.warn("⚠️ Order not found in database:", order_id);
      await connection.rollback();
      return res.status(404).json({ error: "Order not found in database" });
    }

    // 2. Lock the payments row
    const [paymentRows] = await connection.execute(
      "SELECT id, status FROM payments WHERE order_id = ? AND provider = 'midtrans' LIMIT 1 FOR UPDATE",
      [order_id]
    );
    const existingPayment = (paymentRows as any[])[0];

    // Check if it's already marked as paid
    if (order.payment_status === "paid" || (existingPayment && existingPayment.status === "paid")) {
      console.log(`ℹ️ Webhook ignored: Order ${order_id} is already processed as paid.`);
      await connection.rollback();
      return res.json({ success: true, message: "Notification already handled" });
    }

    // 3. Map Midtrans transaction_status to payments status
    let mappedPaymentStatus: 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled' | 'refunded' | 'partial_refund' = 'pending';
    let isSettled = false;
    let isFailed = false;

    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      mappedPaymentStatus = 'paid';
      isSettled = true;
    } else if (transaction_status === 'pending') {
      mappedPaymentStatus = 'pending';
    } else if (transaction_status === 'expire') {
      mappedPaymentStatus = 'expired';
      isFailed = true;
    } else if (transaction_status === 'deny' || transaction_status === 'cancel') {
      mappedPaymentStatus = 'failed';
      isFailed = true;
    } else if (transaction_status === 'refund') {
      mappedPaymentStatus = 'refunded';
    }

    const paidAt = isSettled ? new Date() : null;
    const expiredAt = (transaction_status === 'expire') ? new Date() : null;

    // 4. Update payments table
    if (existingPayment) {
      await connection.execute(
        `UPDATE payments SET 
          status = ?, provider_transaction_id = ?, paid_at = ?, expired_at = ?, raw_callback_json = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          mappedPaymentStatus,
          transaction_id || null,
          paidAt,
          expiredAt,
          JSON.stringify(payload),
          existingPayment.id
        ]
      );
    } else {
      await connection.execute(
        `INSERT INTO payments (
          order_id, provider, payment_method, amount, status, provider_transaction_id, paid_at, expired_at, raw_callback_json
        ) VALUES (?, 'midtrans', ?, ?, ?, ?, ?, ?, ?)`,
        [
          order_id,
          payment_type || 'qris',
          Number(gross_amount),
          mappedPaymentStatus,
          transaction_id || null,
          paidAt,
          expiredAt,
          JSON.stringify(payload)
        ]
      );
    }

    // 5. Update orders table
    let orderStatus = order.order_status;
    let fulfillmentStatus = order.fulfillment_status;

    if (isSettled) {
      orderStatus = 'paid';
      if (order.channel === 'pos') {
        orderStatus = 'completed';
        fulfillmentStatus = 'completed';
      }
    } else if (isFailed) {
      orderStatus = 'cancelled';
    }

    await connection.execute(
      `UPDATE orders SET 
        payment_status = ?, order_status = ?, fulfillment_status = ?, payment_type = ?, 
        transaction_status = ?, midtrans_transaction_id = ?, updated_at = NOW() 
       WHERE order_id = ?`,
      [
        isSettled ? 'paid' : (isFailed ? mappedPaymentStatus : 'pending'),
        orderStatus,
        fulfillmentStatus,
        payment_type || null,
        transaction_status,
        transaction_id || null,
        order_id
      ]
    );

    // 6. Handle stock & stock movements
    const [items] = await connection.execute(
      "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
      [order_id]
    );

    const orderItemsList = items as any[];

    // Local stock movement logger to avoid circular references
    const logLocalStockMovement = async (
      conn: any,
      vId: number,
      mType: any,
      qtyChange: number,
      notesStr: string
    ) => {
      const [vRows] = await conn.execute(
        "SELECT stock FROM product_variants WHERE id = ? FOR UPDATE",
        [vId]
      );
      const curStock = vRows[0]?.stock || 0;
      const bfrStock = curStock;
      let aftStock = curStock;
      if (['sale', 'restock', 'initial', 'adjustment_in', 'adjustment_out', 'return', 'refund'].includes(mType)) {
        aftStock = curStock + qtyChange;
      }
      await conn.execute(
        `INSERT INTO stock_movements (
          variant_id, movement_type, quantity_change, stock_before, stock_after,
          reference_type, reference_id, created_by, notes
        ) VALUES (?, ?, ?, ?, ?, 'order', ?, NULL, ?)`,
        [vId, mType, qtyChange, bfrStock, aftStock, order_id, notesStr]
      );
    };

    if (isSettled) {
      // Pembayaran Sukses: rilis stock_reserved, potong stock fisik
      for (const item of orderItemsList) {
        if (item.variant_id) {
          // decrement physical stock
          await connection.execute(
            "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          // decrement stock_reserved
          await connection.execute(
            "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          // log movements
          await logLocalStockMovement(connection, item.variant_id, 'reservation_release', -item.quantity, 'Pelepasan reservasi stok (pembayaran sukses)');
          await logLocalStockMovement(connection, item.variant_id, 'sale', -item.quantity, 'Penjualan online selesai');
        }
      }
      console.log(`✅ Stock and reservations updated for completed order: ${order_id}`);
    } else if (isFailed) {
      // Pembayaran Gagal/Batal/Expired: cukup rilis stock_reserved
      for (const item of orderItemsList) {
        if (item.variant_id) {
          // decrement stock_reserved
          await connection.execute(
            "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          // log movement
          await logLocalStockMovement(connection, item.variant_id, 'reservation_release', -item.quantity, 'Pelepasan reservasi stok (pembayaran gagal/expired)');
        }
      }
      console.log(`❌ Reservations released for failed order: ${order_id}`);
    }

    await connection.commit();
    return res.json({ success: true, message: "Notification handled successfully" });
  } catch (error: any) {
    await connection.rollback();
    console.error("Error handling Midtrans notification:", error);
    return res.status(500).json({ error: error.message || "Failed to process webhook" });
  } finally {
    connection.release();
  }
});

// POST /api/payment/regenerate-token — Regenerasi token Snap Midtrans untuk ganti metode pembayaran
router.post("/regenerate-token", paymentCheckoutLimiter, async (req, res) => {
  const connection = await getConnection();
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "Order ID wajib diisi" });
    }

    console.log("🔄 Regenerating snap token for order:", orderId);

    await connection.beginTransaction();

    // 1. Ambil data pesanan
    const [orderRows] = await connection.execute(
      "SELECT * FROM orders WHERE order_id = ? FOR UPDATE",
      [orderId]
    );
    const order = (orderRows as any[])[0];

    if (!order) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Pesanan tidak ditemukan" });
    }

    if (order.payment_type === "manual_qris") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "Metode pembayaran untuk pesanan ini adalah manual QRIS. Silakan unggah bukti pembayaran Anda."
      });
    }

    // 2. Pastikan pesanan masih pending / unpaid
    if (order.payment_status !== "unpaid" && order.payment_status !== "pending") {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: `Pesanan sudah dibayar atau dibatalkan (Status: ${order.payment_status})` 
      });
    }

    // 3. Ambil data items pesanan
    const [itemRows] = await connection.execute(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId]
    );
    const items = itemRows as any[];

    // 4. Buat transaksi Snap baru dengan ID unik
    const transactionId = `${orderId}-${Date.now()}`;
    const itemDetails = items.map((item: any) => ({
      id: String(item.variant_id || item.product_id || "item"),
      price: Number(item.unit_price),
      quantity: Number(item.quantity),
      name: item.product_name.substring(0, 50)
    }));

    if (Number(order.shipping_cost) > 0) {
      itemDetails.push({
        id: "shipping-cost",
        price: Number(order.shipping_cost),
        quantity: 1,
        name: "Shipping Cost"
      });
    }
    if (Number(order.service_fee) > 0) {
      itemDetails.push({
        id: "service-fee",
        price: Number(order.service_fee),
        quantity: 1,
        name: "Service Fee"
      });
    }
    if (Number(order.tax_amount) > 0) {
      itemDetails.push({
        id: "tax-amount",
        price: Number(order.tax_amount),
        quantity: 1,
        name: "Tax"
      });
    }
    if (Number(order.discount_amount) > 0) {
      itemDetails.push({
        id: "discount",
        price: -Number(order.discount_amount),
        quantity: 1,
        name: "Discount"
      });
    }

    const parameter = {
      transaction_details: {
        order_id: transactionId,
        gross_amount: Number(order.gross_amount)
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone
      },
      item_details: itemDetails
    };

    const transaction = await snap.createTransaction(parameter);
    console.log("✅ New Snap transaction created with ID:", transactionId);

    // 5. Update snap_token di database
    await connection.execute(
      "UPDATE orders SET snap_token = ? WHERE order_id = ?",
      [transaction.token, orderId]
    );

    await connection.commit();

    return res.json({
      success: true,
      token: transaction.token,
      redirectUrl: transaction.redirect_url
    });
  } catch (error: any) {
    await connection.rollback();
    console.error("❌ Error regenerating snap token:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Gagal melakukan regenerasi token pembayaran" 
    });
  } finally {
    connection.release();
  }
});

export default router;
