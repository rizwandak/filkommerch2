/**
 * In-App Browser Detector & Utilities
 * Mendeteksi WebView bawaan aplikasi (Instagram, WhatsApp, TikTok, LINE, Telegram, dll)
 * yang sering memblokir Google OAuth Popup / window.open()
 */

export interface InAppBrowserInfo {
  isInApp: boolean;
  appName: string;
  isAndroid: boolean;
  isIOS: boolean;
}

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === "undefined" || !navigator) {
    return {
      isInApp: false,
      appName: "",
      isAndroid: false,
      isIOS: false,
    };
  }

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  const isAndroid = /android/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;

  let appName = "";
  let isInApp = false;

  if (/Instagram/i.test(ua)) {
    isInApp = true;
    appName = "Instagram";
  } else if (/WhatsApp/i.test(ua)) {
    isInApp = true;
    appName = "WhatsApp";
  } else if (/FBAN|FBAV|FB_IAB|FBSS/i.test(ua)) {
    isInApp = true;
    appName = "Facebook / Messenger";
  } else if (/Line\//i.test(ua)) {
    isInApp = true;
    appName = "LINE";
  } else if (/musical_ly|ByteLocale|BytedanceWebview|TikTok/i.test(ua)) {
    isInApp = true;
    appName = "TikTok";
  } else if (/Telegram/i.test(ua)) {
    isInApp = true;
    appName = "Telegram";
  } else if (/MicroMessenger/i.test(ua)) {
    isInApp = true;
    appName = "WeChat";
  } else if (/Twitter|TwitterAndroid|TwitterKit/i.test(ua)) {
    isInApp = true;
    appName = "Twitter / X";
  } else if (isAndroid && /;\s*wv\)/.test(ua)) {
    // Android generic WebView
    isInApp = true;
    appName = "In-App Browser";
  } else if (
    isIOS &&
    /AppleWebKit/i.test(ua) &&
    !/Safari/i.test(ua) &&
    !/CriOS/i.test(ua) &&
    !/FxiOS/i.test(ua)
  ) {
    // iOS generic UIWebView / WKWebView
    isInApp = true;
    appName = "In-App Browser";
  }

  return {
    isInApp,
    appName,
    isAndroid,
    isIOS,
  };
}

/**
 * Mencoba membuka URL di browser eksternal default (Chrome / Safari)
 */
export function openExternalBrowser(targetUrl?: string) {
  if (typeof window === "undefined") return;

  const url = targetUrl || window.location.href;
  const { isAndroid } = detectInAppBrowser();

  if (isAndroid) {
    // Buka via Android Intent ke Chrome
    const cleanUrl = url.replace(/^https?:\/\//i, "");
    const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
    return;
  }

  // Fallback: Salin link ke clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    }
  } catch {}
}
