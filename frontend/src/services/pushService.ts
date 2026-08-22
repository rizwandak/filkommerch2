import { getApiBaseUrl } from "@/lib/api-config";

const getAPI_URL = () => `${getApiBaseUrl()}/api`;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  // Also check iPadOS on modern iPads which report MacIntel with multi-touch
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIos || isIpadOs;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await reg.update().catch(() => {});
    return reg;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

export async function checkPushSubscriptionStatus(): Promise<{
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isIos: boolean;
  isPwa: boolean;
  subscription: PushSubscription | null;
}> {
  const isIos = isIosDevice();
  const isPwa = isStandalonePwa();

  if (!(await isPushNotificationSupported())) {
    return {
      isSupported: false,
      permission: "unsupported",
      isSubscribed: false,
      isIos,
      isPwa,
      subscription: null,
    };
  }

  const permission = Notification.permission;
  try {
    const reg = await registerServiceWorker();
    if (!reg) {
      return { isSupported: true, permission, isSubscribed: false, isIos, isPwa, subscription: null };
    }
    const sub = await reg.pushManager.getSubscription();
    return {
      isSupported: true,
      permission,
      isSubscribed: !!sub,
      isIos,
      isPwa,
      subscription: sub,
    };
  } catch (e) {
    return { isSupported: true, permission, isSubscribed: false, isIos, isPwa, subscription: null };
  }
}

export async function subscribeUserToPush(customUserId?: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await isPushNotificationSupported())) {
      return { success: false, error: "Notifikasi Push tidak didukung oleh browser ini." };
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { success: false, error: "Izin notifikasi ditolak oleh pengguna atau browser." };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: "Gagal mendaftarkan Service Worker browser." };
    }

    // Ensure service worker is fully active and ready before push subscription
    if ("serviceWorker" in navigator) {
      await navigator.serviceWorker.ready;
    }

    // Fetch VAPID key from backend
    const vapidRes = await fetch(`${getAPI_URL()}/notifications/vapid-key`);
    const vapidData = await vapidRes.json();
    if (!vapidData.success || !vapidData.publicKey) {
      return { success: false, error: "Gagal mendapatkan VAPID public key dari server." };
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);

    // Subscribe to PushManager safely handling key changes
    let subscription: PushSubscription | null = null;
    try {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    } catch (subErr: any) {
      // If subscription failed (e.g. InvalidStateError due to different VAPID key), unsubscribe old & resubscribe
      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      } else {
        throw subErr;
      }
    }

    const userJson = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null;
    const user = userJson ? JSON.parse(userJson) : null;
    const userId = customUserId !== undefined ? String(customUserId) : (user?.id ? String(user.id) : "");

    // Send subscription object to backend
    const res = await fetch(`${getAPI_URL()}/notifications/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(userId),
      },
      body: JSON.stringify(subscription),
    });

    const data = await res.json();
    if (data.success) {
      return { success: true };
    } else {
      return { success: false, error: data.error || "Gagal menyimpan subskripsi push." };
    }
  } catch (err: any) {
    console.error("Error subscribing to push:", err);
    return { success: false, error: err.message };
  }
}

export async function testSelfPushNotification(): Promise<{
  success: boolean;
  pushSent?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    if (!(await isPushNotificationSupported())) {
      return { success: false, error: "Notifikasi tidak didukung oleh browser ini." };
    }

    if (Notification.permission !== "granted") {
      return { success: false, error: "Izin notifikasi belum diaktifkan (Granted)." };
    }

    const reg = await registerServiceWorker();
    let sub: PushSubscription | null = null;
    if (reg) {
      sub = await reg.pushManager.getSubscription();
    }

    const userJson = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null;
    const user = userJson ? JSON.parse(userJson) : null;
    const userId = user?.id ? String(user.id) : "";

    // 1. Send push request to backend
    const res = await fetch(`${getAPI_URL()}/notifications/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(userId),
      },
      body: JSON.stringify({
        endpoint: sub?.endpoint || null,
      }),
    });

    const data = await res.json();

    // 2. Also trigger a direct ServiceWorker notification as immediate proof/fallback
    if (reg) {
      try {
        await reg.showNotification("🔔 FILKOM Merch — Test Notifikasi Berhasil!", {
          body: "Keren! Push notifikasi di perangkatmu sudah aktif. Update status pesanan & info pengambilan jaket PO akan langsung muncul di sini.",
          icon: "/logo-fm.png",
          badge: "/pwa-192x192.png",
          tag: `test-notif-${Date.now()}`,
          vibrate: [200, 100, 200],
          data: { url: "/orders" },
        } as any);
      } catch (swErr) {
        console.warn("[PushService] Local SW notification trigger:", swErr);
      }
    }

    return {
      success: true,
      pushSent: data.pushSent,
      message: data.message || "Notifikasi test berhasil dikirim!",
    };
  } catch (err: any) {
    console.error("Error testing push notification:", err);
    return { success: false, error: err.message };
  }
}
