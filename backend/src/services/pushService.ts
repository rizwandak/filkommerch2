import webPush from "web-push";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Load or generate VAPID keys
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
let vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@filkommerch.com";

if (!vapidPublicKey || !vapidPrivateKey) {
  // Generate VAPID keys dynamically if missing in env
  const keys = webPush.generateVAPIDKeys();
  vapidPublicKey = keys.publicKey;
  vapidPrivateKey = keys.privateKey;
  console.log("--------------------------------------------------");
  console.log("⚡ Auto-generated VAPID Keys for Web Push Notifications:");
  console.log("VAPID_PUBLIC_KEY =", vapidPublicKey);
  console.log("VAPID_PRIVATE_KEY =", vapidPrivateKey);
  console.log("Add these to your backend .env file to persist across restarts.");
  console.log("--------------------------------------------------");
}

webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

export function getVapidPublicKey() {
  return vapidPublicKey;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: any;
}

/**
 * Send push notification to a specific user by userId
 */
export async function sendPushToUser(
  connection: mysql.Connection | mysql.Pool,
  userId: number,
  payload: PushNotificationPayload
) {
  try {
    const [subs] = await connection.query<any[]>(
      "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?",
      [userId]
    );

    if (!subs || subs.length === 0) {
      console.log(`[PushService] User ID ${userId} has no active push subscriptions.`);
      return { success: false, sentCount: 0, reason: "No subscription found" };
    }

    const notificationData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      data: {
        url: payload.url || "/",
        ...(payload.data || {}),
      },
    });

    let successCount = 0;
    const expiredSubIds: number[] = [];

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, notificationData);
        successCount++;
      } catch (err: any) {
        console.warn(`[PushService] Failed sending to sub #${sub.id}:`, err.message);
        // If subscription is expired / gone (410 or 404), mark for cleanup
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredSubIds.push(sub.id);
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredSubIds.length > 0) {
      await connection.query(
        `DELETE FROM push_subscriptions WHERE id IN (${expiredSubIds.join(",")})`
      );
      console.log(`[PushService] Cleaned up ${expiredSubIds.length} expired subscriptions.`);
    }

    return { success: true, sentCount: successCount };
  } catch (error: any) {
    console.error("[PushService] Error sending push notification:", error);
    return { success: false, sentCount: 0, error: error.message };
  }
}

/**
 * Send push notification to multiple users (or broadcast to all subscribed users)
 */
export async function sendPushBroadcast(
  connection: mysql.Connection | mysql.Pool,
  userIds: number[] | null, // null means all users with subscription
  payload: PushNotificationPayload
) {
  try {
    let query = "SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions";
    let params: any[] = [];

    if (userIds && userIds.length > 0) {
      query += ` WHERE user_id IN (${userIds.map(() => "?").join(",")})`;
      params = userIds;
    }

    const [subs] = await connection.query<any[]>(query, params);

    if (!subs || subs.length === 0) {
      return { success: false, sentCount: 0, reason: "No subscriptions found" };
    }

    const notificationData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      data: {
        url: payload.url || "/",
        ...(payload.data || {}),
      },
    });

    let successCount = 0;
    const expiredSubIds: number[] = [];

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(pushSubscription, notificationData);
        successCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredSubIds.push(sub.id);
        }
      }
    }

    if (expiredSubIds.length > 0) {
      await connection.query(
        `DELETE FROM push_subscriptions WHERE id IN (${expiredSubIds.join(",")})`
      );
    }

    return { success: true, sentCount: successCount };
  } catch (error: any) {
    console.error("[PushService] Broadcast error:", error);
    return { success: false, sentCount: 0, error: error.message };
  }
}
