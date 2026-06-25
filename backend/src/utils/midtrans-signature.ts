import crypto from "crypto";

/**
 * Verifikasi signature key dari Midtrans webhook notification.
 *
 * Formula resmi Midtrans:
 *   SHA512(order_id + status_code + gross_amount + server_key)
 *
 * Referensi: https://docs.midtrans.com/reference/receiving-notifications
 *
 * Menggunakan crypto.timingSafeEqual() untuk mencegah timing attack
 * yang bisa mengeksploitasi perbandingan string biasa (===).
 *
 * @param orderId - Order ID dari notifikasi
 * @param statusCode - HTTP status code dari notifikasi (e.g., "200")
 * @param grossAmount - Gross amount dari notifikasi (e.g., "100000.00")
 * @param serverKey - Midtrans Server Key dari environment
 * @param receivedSignature - Signature key yang diterima dari Midtrans
 * @returns true jika signature valid dan autentik
 */
export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  receivedSignature: string
): boolean {
  // Validasi input — pastikan semua parameter ada
  if (!orderId || !statusCode || !grossAmount || !serverKey || !receivedSignature) {
    console.error("[Midtrans Signature] Missing required parameters for verification");
    return false;
  }

  // Hitung signature lokal sesuai formula resmi Midtrans
  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const computedSignature = crypto
    .createHash("sha512")
    .update(payload)
    .digest("hex");

  // Gunakan timing-safe comparison untuk mencegah timing attack
  // Kedua buffer harus memiliki panjang yang sama (SHA-512 selalu 128 hex chars)
  try {
    const computedBuffer = Buffer.from(computedSignature, "hex");
    const receivedBuffer = Buffer.from(receivedSignature, "hex");

    // Jika panjang berbeda, signature jelas invalid
    if (computedBuffer.length !== receivedBuffer.length) {
      console.error(
        `[Midtrans Signature] Length mismatch: computed=${computedBuffer.length}, received=${receivedBuffer.length}`
      );
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, receivedBuffer);
  } catch (error) {
    // Jika receivedSignature bukan hex string yang valid
    console.error("[Midtrans Signature] Invalid signature format:", error);
    return false;
  }
}
