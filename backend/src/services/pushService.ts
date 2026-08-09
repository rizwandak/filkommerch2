import webPush from "web-push";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Load or set static VAPID keys
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "BGmHQBD7ZxZ_SYEFSx30LOwo2Rfj4NZbZxIupm3sKdbRKnjaDADJqlDhx0rvxSzcA39BTnrjB_Pnvd5_E8L8j20";
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "71FHCC1d2oiKPCTbi0SwSsHg0hc1cJCAGJjx1xufuMk";
let vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@filkommerch.com";

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
      "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? OR user_id = 0",
      [userId]
    );

    if (!subs || subs.length === 0) {
      console.log(`[PushService] User ID ${userId} has no active push subscriptions.`);
      return { success: false, sentCount: 0, reason: "No subscription found" };
    }

    const notificationData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/logo-fm.png",
      badge: payload.badge || "/logo-fm.png",
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
      icon: payload.icon || "/logo-fm.png",
      badge: payload.badge || "/logo-fm.png",
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
