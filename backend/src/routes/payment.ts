import { Router } from "express";
import { snap } from "../config/midtrans";
import { query, queryOne, execute, getConnection } from "../config/database";
import crypto from "crypto";
import { config } from "../config/config";

const router = Router();

// POST /api/payment/checkout
router.post("/checkout", async (req, res) => {
  try {
    const { orderId, grossAmount, customerName, customerEmail, customerPhone, items } = req.body;

    if (!orderId || !grossAmount) {
      return res.status(400).json({ error: "Missing required checkout parameters" });
    }

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

// POST /api/payment/notification
router.post("/notification", async (req, res) => {
  const connection = await getConnection();
  try {
    const payload = req.body;
    const { order_id, status_code, gross_amount, signature_key, transaction_status, transaction_id, payment_type } = payload;

    // Verify signature key
    const localSignature = crypto
      .createHash("sha512")
      .update(`${order_id}${status_code}${gross_amount}${config.midtrans.serverKey}`)
      .digest("hex");

    if (localSignature !== signature_key) {
      console.error("❌ Invalid signature for order:", order_id);
      return res.status(400).json({ error: "Invalid signature key" });
    }

    console.log(`🔔 Payment notification received for order: ${order_id}, status: ${transaction_status}`);

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

    // Import helper dynamic import or call local logger to avoid circular references if necessary
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

export default router;
