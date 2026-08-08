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

export async function isPushNotificationSupported(): Promise<boolean> {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

export async function subscribeUserToPush(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await isPushNotificationSupported())) {
      return { success: false, error: "Notifikasi Push tidak didukung oleh browser ini." };
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "Izin notifikasi ditolak oleh pengguna." };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: "Gagal mendaftarkan Service Worker." };
    }

    // Fetch VAPID key from backend
    const vapidRes = await fetch(`${getAPI_URL()}/notifications/vapid-key`);
    const vapidData = await vapidRes.json();
    if (!vapidData.success || !vapidData.publicKey) {
      return { success: false, error: "Gagal mendapatkan VAPID public key dari server." };
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);

    // Subscribe to PushManager
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    const userJson = localStorage.getItem("user");
    const user = userJson ? JSON.parse(userJson) : null;
    const userId = user?.id || "";

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
