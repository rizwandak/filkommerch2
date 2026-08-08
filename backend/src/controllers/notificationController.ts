import { Request, Response } from "express";
import { getPool } from "../config/database";
import { getVapidPublicKey, sendPushToUser, sendPushBroadcast } from "../services/pushService";

/**
 * Get VAPID Public Key for frontend push subscription setup
 */
export async function getVapidKey(req: Request, res: Response) {
  try {
    const key = getVapidPublicKey();
    return res.json({ success: true, publicKey: key });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Save user push subscription token to DB
 */
export async function subscribePush(req: Request, res: Response) {
  try {
    const pool = getPool();
    const userId = (req as any).user?.id || (req as any).headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, error: "Invalid push subscription object" });
    }

    // Check if sub already exists for this endpoint
    const [existing] = await pool.query<any[]>(
      "SELECT id FROM push_subscriptions WHERE endpoint = ?",
      [endpoint]
    );

    if (existing && existing.length > 0) {
      // Update user_id or keys if changed
      await pool.query(
        "UPDATE push_subscriptions SET user_id = ?, p256dh = ?, auth = ? WHERE endpoint = ?",
        [userId, keys.p256dh, keys.auth, endpoint]
      );
    } else {
      // Insert new subscription
      await pool.query(
        "INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)",
        [userId, endpoint, keys.p256dh, keys.auth]
      );
    }

    return res.json({ success: true, message: "Push subscription saved successfully" });
  } catch (err: any) {
    console.error("[NotificationController] subscribePush error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get In-App Notifications for current user
 */
export async function getUserNotifications(req: Request, res: Response) {
  try {
    const pool = getPool();
    const userId = (req as any).user?.id || (req as any).headers["x-user-id"];
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const [rows] = await pool.query<any[]>(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [userId]
    );

    const [unreadCountResult] = await pool.query<any[]>(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
      [userId]
    );

    const unreadCount = unreadCountResult[0]?.count || 0;

    return res.json({
      success: true,
      notifications: rows,
      unreadCount,
    });
  } catch (err: any) {
    console.error("[NotificationController] getUserNotifications error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(req: Request, res: Response) {
  try {
    const pool = getPool();
    const userId = (req as any).user?.id || (req as any).headers["x-user-id"];
    const notifId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (notifId === "all") {
      await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [userId]);
    } else {
      await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [
        notifId,
        userId,
      ]);
    }

    return res.json({ success: true, message: "Notification marked as read" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Helper function to create notification in DB and send push notification to user
 */
export async function createAndSendNotification(opts: {
  userId: number;
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  const pool = getPool();
  const { userId, title, message, type = "GENERAL", link = "/orders" } = opts;

  // 1. Save in-app notification in DB
  await pool.query(
    "INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)",
    [userId, title, message, type, link]
  );

  // 2. Send Web Push notification
  const pushRes = await sendPushToUser(pool, userId, {
    title,
    body: message,
    url: link,
  });

  return pushRes;
}

/**
 * Admin Endpoint: Send direct notification to a specific user/transaction
 */
export async function adminSendNotification(req: Request, res: Response) {
  try {
    const { userId, title, message, type, link } = req.body;

    if (!userId || !title || !message) {
      return res
        .status(400)
        .json({ success: false, error: "userId, title, and message are required" });
    }

    const pushResult = await createAndSendNotification({
      userId: Number(userId),
      title,
      message,
      type: type || "CUSTOM_DIRECT",
      link: link || "/orders",
    });

    return res.json({
      success: true,
      message: "Notification sent successfully",
      pushSent: pushResult.sentCount > 0,
    });
  } catch (err: any) {
    console.error("[NotificationController] adminSendNotification error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Admin Endpoint: Broadcast notification to multiple buyers or all buyers of a specific product
 */
export async function adminBroadcastNotification(req: Request, res: Response) {
  try {
    const pool = getPool();
    const { productId, campaignId, title, message, link } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: "title and message are required" });
    }

    let targetUserIds: number[] = [];

    if (productId || campaignId) {
      let query = `
        SELECT DISTINCT o.user_id 
        FROM orders o 
        JOIN order_items oi ON o.order_id = oi.order_id 
        WHERE o.order_status != 'cancelled'
      `;
      const params: any[] = [];

      if (productId) {
        query += " AND oi.product_id = ?";
        params.push(productId);
      }
      if (campaignId) {
        query += " AND o.pre_order_campaign_id = ?";
        params.push(campaignId);
      }

      const [rows] = await pool.query<any[]>(query, params);
      targetUserIds = rows.map((r: any) => r.user_id).filter(Boolean);

      if (targetUserIds.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No buyers found for the selected product/campaign filter",
        });
      }
    }

    // 1. Insert in-app notifications
    if (targetUserIds.length > 0) {
      const values = targetUserIds.map((uId: number) => [
        uId,
        title,
        message,
        "BROADCAST",
        link || "/products",
      ]);
      await pool.query(
        "INSERT INTO notifications (user_id, title, message, type, link) VALUES ?",
        [values]
      );
    } else {
      // Broadcast to ALL users in users table
      const [allUsers] = await pool.query<any[]>("SELECT id FROM users");
      targetUserIds = allUsers.map((u: any) => u.id);
      if (targetUserIds.length > 0) {
        const values = targetUserIds.map((uId: number) => [
          uId,
          title,
          message,
          "BROADCAST",
          link || "/products",
        ]);
        await pool.query(
          "INSERT INTO notifications (user_id, title, message, type, link) VALUES ?",
          [values]
        );
      }
    }

    // 2. Send Push Broadcast
    const pushResult = await sendPushBroadcast(pool, targetUserIds.length > 0 ? targetUserIds : null, {
      title,
      body: message,
      url: link || "/products",
    });

    return res.json({
      success: true,
      message: `Broadcast sent to ${targetUserIds.length} users`,
      pushSentCount: pushResult.sentCount,
    });
  } catch (err: any) {
    console.error("[NotificationController] adminBroadcastNotification error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
