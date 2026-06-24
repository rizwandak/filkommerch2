import { Router } from "express";
import { snap } from "../config/midtrans";
import { query, queryOne, execute } from "../config/database";
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

    // 1. Get the current order status and check if stock has already been reduced
    const order = await queryOne<{ id: number; transaction_status: string; stock_reduced: number }>(
      "SELECT id, transaction_status, stock_reduced FROM orders WHERE order_id = ?",
      [order_id]
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found in database" });
    }

    // Update payment status in database
    await execute(
      "UPDATE orders SET transaction_status = ?, payment_type = ?, midtrans_transaction_id = ?, updated_at = NOW() WHERE order_id = ?",
      [transaction_status, payment_type || null, transaction_id || null, order_id]
    );

    // Reduce stock if settled/capture
    const isSettled = transaction_status === "settlement" || transaction_status === "capture" || status_code === "200";

    if (isSettled && !order.stock_reduced) {
      // Fetch order items
      const items = await query<{ product_id: number; size: string; quantity: number }>(
        "SELECT product_id, size, quantity FROM order_items WHERE order_id = ?",
        [order_id]
      );

      for (const item of items) {
        if (item.product_id) {
          // Check if variant exists
          const variant = await queryOne<{ id: number }>(
            "SELECT id FROM product_variants WHERE product_id = ? AND size = ?",
            [item.product_id, item.size]
          );

          if (variant) {
            // Decrement variant stock
            await execute(
              "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
              [item.quantity, variant.id]
            );
          }
        }
      }

      // Mark stock as reduced
      await execute(
        "UPDATE orders SET stock_reduced = TRUE WHERE order_id = ?",
        [order_id]
      );

      console.log(`✅ Stock reduced for online order: ${order_id}`);
    }

    return res.json({ success: true, message: "Notification handled successfully" });
  } catch (error: any) {
    console.error("Error handling Midtrans notification:", error);
    return res.status(500).json({ error: error.message || "Failed to process webhook" });
  }
});

export default router;
