import { Request, Response } from "express";
import { execute, query, queryOne } from "../config/database";
import { logActivity } from "./api";

// Whitelist of keywords for study programs under FILKOM UB
const FILKOM_PRODI_KEYWORDS = [
  "INFORMATIKA",
  "SISTEM INFORMASI",
  "TEKNOLOGI INFORMASI",
  "TEKNIK KOMPUTER",
  "ILMU KOMPUTER"
];

/**
 * Fuzzy check to match name similarity between Google profile and PDDIKTI record.
 * Handles abbreviations, middle names, and case differences.
 */
function isNameSimilar(name1: string, name2: string): boolean {
  const cleanWords = (name: string) => 
    name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 1); // Ignore single letter initials like "M"

  const words1 = cleanWords(name1);
  const words2 = cleanWords(name2);

  if (words1.length === 0 || words2.length === 0) return false;

  // Count overlapping words
  let matches = 0;
  for (const w of words1) {
    if (words2.includes(w)) {
      matches++;
    }
  }

  // If one name is short (e.g. 1-2 words), we need at least 1 match.
  // Otherwise, we require at least 2 matching words.
  const minLength = Math.min(words1.length, words2.length);
  const threshold = minLength <= 2 ? 1 : 2;

  return matches >= threshold;
}

/**
 * Validates whether a study program belongs to FILKOM
 */
function isFilkomProdi(prodiName: string): boolean {
  const upperProdi = prodiName.toUpperCase();
  return FILKOM_PRODI_KEYWORDS.some(keyword => upperProdi.includes(keyword));
}

/**
 * Verifies a student via PDDIKTI API
 */
interface PDDIKTIResult {
  status: "success" | "not_found" | "error";
  record?: any;
}

/**
 * Verifies a student via PDDIKTI API high-availability mirrors
 */
async function fetchPDDIKTIStudent(nim: string): Promise<PDDIKTIResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  // Try fastapicloud mirror first
  try {
    const url = `https://pddikti.fastapicloud.dev/api/search/mhs/${encodeURIComponent(nim)}/`;
    const res = await fetch(url, { signal: controller.signal });
    if (res.ok) {
      const data = (await res.json()) as any;
      if (Array.isArray(data)) {
        clearTimeout(timeoutId);
        if (data.length === 0) {
          return { status: "not_found" };
        }
        // Find the exact match or first match
        const match = data.find((m: any) => m.nim.replace(/\s+/g, "") === nim.replace(/\s+/g, "")) || data[0];
        return { status: "success", record: match };
      }
    }
  } catch (err) {
    console.warn("[PDDIKTI Mirror 1 Fetch] Failed:", err);
  }

  // Fallback to rone.dev mirror
  try {
    const url = `https://pddikti.rone.dev/api/search/mhs/${encodeURIComponent(nim)}/`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (Array.isArray(data)) {
        if (data.length === 0) {
          return { status: "not_found" };
        }
        const match = data.find((m: any) => m.nim.replace(/\s+/g, "") === nim.replace(/\s+/g, "")) || data[0];
        return { status: "success", record: match };
      }
    }
    return { status: "error" };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[PDDIKTI Mirror 2 Fetch] Failed:", err);
    return { status: "error" };
  }
}

/**
 * Main handler to verify UB FILKOM civitas status (student only)
 * POST /api/auth/verify-filkom
 */
export const verifyFilkomUser = async (req: Request, res: Response) => {
  try {
    const { nimOrNidn } = req.body;
    const userId = req.header("x-user-id");
    const googleName = req.header("x-user-name");

    if (!userId) {
      return res.status(401).json({ success: false, error: "Akses ditolak: User ID tidak ditemukan" });
    }

    if (!nimOrNidn || typeof nimOrNidn !== "string") {
      return res.status(400).json({ success: false, error: "NIM wajib diisi" });
    }

    const cleanIdentifier = nimOrNidn.trim().replace(/\s+/g, "");

    // 1. Fetch user from database to make sure they exist
    const dbUser = await queryOne<any>("SELECT id, name, email FROM users WHERE id = ?", [userId]);
    if (!dbUser) {
      return res.status(404).json({ success: false, error: "User tidak ditemukan" });
    }

    // 2. Validate that the user's email ends with @student.ub.ac.id
    if (!dbUser.email || !dbUser.email.toLowerCase().endsWith("@student.ub.ac.id")) {
      return res.status(400).json({
        success: false,
        error: "Akses ditolak: Verifikasi NIM hanya dapat dilakukan oleh akun dengan email berakhiran @student.ub.ac.id."
      });
    }

    // 2. Check if NIM is already linked to another account
    const existingNim = await queryOne<any>(
      "SELECT id FROM users WHERE nim = ? AND id != ?",
      [cleanIdentifier, userId]
    );
    if (existingNim) {
      return res.status(400).json({ success: false, error: "NIM ini sudah terdaftar pada akun lain" });
    }

    const targetName = googleName || dbUser.name;

    console.log(`[Verification] User ${dbUser.email} (${targetName}) attempting verification with NIM: ${cleanIdentifier}`);

    let verificationSource = "PDDIKTI API";
    let isVerified = false;
    let details: { role: string; prodi: string; nameOnRecord: string } | null = null;

    // --- STEP 1: Query PDDIKTI Student Registry ---
    const apiResult = await fetchPDDIKTIStudent(cleanIdentifier);
    
    if (apiResult.status === "success" && apiResult.record) {
      const studentRecord = apiResult.record;
      const isUB = studentRecord.nama_pt.toUpperCase().includes("BRAWIJAYA");
      const isFilkom = isFilkomProdi(studentRecord.nama_prodi);
      const nameMatch = isNameSimilar(targetName, studentRecord.nama);

      if (isUB && isFilkom && nameMatch) {
        isVerified = true;
        details = {
          role: "mahasiswa",
          prodi: studentRecord.nama_prodi,
          nameOnRecord: studentRecord.nama
        };
      } else {
        console.warn(`[Verification Student Match Failed] isUB: ${isUB}, isFilkom: ${isFilkom}, nameMatch: ${nameMatch} (Target: ${targetName}, Record: ${studentRecord.nama}, Prodi: ${studentRecord.nama_prodi})`);
        return res.status(400).json({
          success: false,
          error: `Verifikasi gagal. Data tidak cocok. Nama Anda harus mirip dengan "${studentRecord.nama}" dan terdaftar di Program Studi FILKOM UB.`
        });
      }
    } else if (apiResult.status === "not_found") {
      console.log(`[Verification] PDDIKTI API online but student NIM ${cleanIdentifier} not found.`);
      return res.status(400).json({
        success: false,
        error: "Verifikasi gagal. NIM Anda tidak ditemukan di pangkalan data PDDIKTI."
      });
    }

    // --- STEP 2: Fallback Logic if API is offline/error ---
    if (!isVerified && apiResult.status === "error") {
      console.log(`[Verification] PDDIKTI lookup failed (offline/timeout). Attempting pattern fallback check.`);

      // Regex pattern matching for FILKOM Student NIM:
      // Starts with Year (2 digits), followed by S1/S2/S3 level (3-7), followed by FILKOM code (15), then 10 digits.
      // Total 15 digits.
      const filkomNimRegex = /^\d{2}[3-7]15\d{10}$/;

      if (filkomNimRegex.test(cleanIdentifier)) {
        isVerified = true;
        verificationSource = "NIM Pattern Match (Fallback)";
        details = {
          role: "mahasiswa",
          prodi: "FILKOM (Verified via NIM Pattern)",
          nameOnRecord: targetName
        };
        console.log(`[Verification] Verified successfully via NIM pattern fallback for: ${cleanIdentifier}`);
      }
    }

    if (isVerified && details) {
      // Update user record in database
      await execute(
        "UPDATE users SET is_filkom_verified = 1, nim = ? WHERE id = ?",
        [cleanIdentifier, userId]
      );

      console.log(`[Verification Success] Verified user ${dbUser.email} using ${verificationSource} as ${details.role} (${details.prodi})`);

      return res.json({
        success: true,
        message: "Selamat! Anda berhasil terverifikasi sebagai Civitas FILKOM UB.",
        user: {
          id: String(dbUser.id),
          email: dbUser.email,
          name: dbUser.name,
          nim: cleanIdentifier,
          is_filkom_verified: 1,
          role: details.role,
          prodi: details.prodi
        }
      });
    }

    return res.status(400).json({
      success: false,
      error: "Verifikasi gagal. Pastikan NIM Anda benar dan terdaftar sebagai mahasiswa aktif FILKOM UB."
    });

  } catch (error: any) {
    console.error("Error verifying FILKOM civitas:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal melakukan verifikasi" });
  }
};

/**
 * Alumni account claim and data merge handler.
 * POST /api/auth/claim-alumni-account
 * Allows an alumni logged in with personal email (e.g. @gmail.com) to claim their old @student.ub.ac.id account
 * using their FILKOM NIM. Matches student on PDDIKTI, verifies they previously had a student account in our system,
 * and merges all historical orders, reviews, addresses, and data into their current account.
 */
export const claimAlumniAccount = async (req: Request, res: Response) => {
  try {
    const { nim } = req.body;
    const userId = req.header("x-user-id");
    const googleName = req.header("x-user-name");

    if (!userId) {
      return res.status(401).json({ success: false, error: "Akses ditolak: User ID tidak ditemukan" });
    }

    if (!nim || typeof nim !== "string") {
      return res.status(400).json({ success: false, error: "NIM wajib diisi" });
    }

    const cleanNim = nim.trim().replace(/\s+/g, "");

    // 1. Fetch current logged-in user
    const currentUser = await queryOne<any>(
      "SELECT id, name, email, nim, phone, address, is_filkom_verified FROM users WHERE id = ?",
      [userId]
    );
    if (!currentUser) {
      return res.status(404).json({ success: false, error: "Akun tidak ditemukan" });
    }

    if (Number(currentUser.is_filkom_verified) === 1) {
      return res.status(400).json({
        success: false,
        error: "Akun Anda saat ini sudah terverifikasi sebagai Civitas FILKOM UB."
      });
    }

    if (currentUser.email && currentUser.email.toLowerCase().endsWith("@student.ub.ac.id")) {
      return res.status(400).json({
        success: false,
        error: "Akun Anda menggunakan email student UB. Silakan gunakan menu 'Verifikasi NIM' reguler."
      });
    }

    const targetName = googleName || currentUser.name;
    console.log(`[Alumni Claim] User ${currentUser.email} (${targetName}) claiming with NIM: ${cleanNim}`);

    // 2. Query PDDIKTI to verify NIM, UB status, FILKOM prodi, and name similarity
    let isVerified = false;
    let studentRecord: any = null;
    let prodiName = "FILKOM";

    const apiResult = await fetchPDDIKTIStudent(cleanNim);

    if (apiResult.status === "success" && apiResult.record) {
      const rec = apiResult.record;
      const isUB = (rec.nama_pt || "").toUpperCase().includes("BRAWIJAYA");
      const isFilkom = isFilkomProdi(rec.nama_prodi || "");
      const nameMatch = isNameSimilar(targetName, rec.nama || "");

      if (isUB && isFilkom && nameMatch) {
        isVerified = true;
        studentRecord = rec;
        prodiName = rec.nama_prodi;
      } else {
        console.warn(`[Alumni Claim Failed] isUB: ${isUB}, isFilkom: ${isFilkom}, nameMatch: ${nameMatch} (Target: ${targetName}, Record: ${rec.nama}, Prodi: ${rec.nama_prodi})`);
        return res.status(400).json({
          success: false,
          error: `Klaim gagal. Data PDDIKTI tidak cocok. Nama Anda ("${targetName}") harus mirip dengan data PDDIKTI ("${rec.nama}") dan terdaftar di Program Studi FILKOM UB.`
        });
      }
    } else if (apiResult.status === "not_found") {
      return res.status(400).json({
        success: false,
        error: "Klaim gagal. NIM tidak ditemukan di pangkalan data PDDIKTI."
      });
    }

    // Fallback if PDDIKTI API is down / timeout
    if (!isVerified && apiResult.status === "error") {
      const filkomNimRegex = /^\d{2}[3-7]15\d{10}$/;
      if (filkomNimRegex.test(cleanNim)) {
        isVerified = true;
        prodiName = "FILKOM UB";
        console.log(`[Alumni Claim] Verified via NIM pattern fallback for: ${cleanNim}`);
      } else {
        return res.status(400).json({
          success: false,
          error: "Pengecekan PDDIKTI sedang bermasalah dan format NIM tidak valid sebagai mahasiswa FILKOM UB."
        });
      }
    }

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        error: "Verifikasi identitas alumni gagal. Pastikan NIM yang dimasukkan benar."
      });
    }

    // 3. Locate the old @student.ub.ac.id account to merge
    // Security requirement: Must match a prior student account or student orders in our system
    let oldUser: any = null;

    // Check by NIM first
    const existingByNim = await queryOne<any>(
      "SELECT * FROM users WHERE nim = ? AND id != ?",
      [cleanNim, currentUser.id]
    );

    if (existingByNim) {
      if (existingByNim.merged_into_id) {
        return res.status(400).json({
          success: false,
          error: "Akun mahasiswa untuk NIM ini sudah pernah digabungkan ke akun lain sebelumnya."
        });
      }
      oldUser = existingByNim;
    }

    // Fallback search by @student.ub.ac.id email and name match
    if (!oldUser) {
      const ubUsers = await query<any>(
        "SELECT * FROM users WHERE email LIKE '%@student.ub.ac.id' AND merged_into_id IS NULL AND id != ?",
        [currentUser.id]
      );

      const officialName = (studentRecord && studentRecord.nama) || targetName;

      for (const candidate of ubUsers) {
        if (
          isNameSimilar(candidate.name, officialName) ||
          isNameSimilar(candidate.name, targetName)
        ) {
          oldUser = candidate;
          break;
        }
      }
    }

    // If still not found in users table, check orders for guest checkouts using student UB email
    let guestOrdersCount = 0;
    if (!oldUser) {
      const officialName = (studentRecord && studentRecord.nama) || targetName;
      const candidateOrders = await query<any>(
        `SELECT id, customer_name, customer_email FROM orders 
         WHERE customer_email LIKE '%@student.ub.ac.id' 
         AND (user_id IS NULL OR user_id = 0)
         ORDER BY id DESC`
      );

      const matchingGuestOrders = candidateOrders.filter((ord: any) =>
        isNameSimilar(ord.customer_name || "", officialName) ||
        isNameSimilar(ord.customer_name || "", targetName)
      );

      if (matchingGuestOrders.length > 0) {
        for (const mOrder of matchingGuestOrders) {
          await execute("UPDATE orders SET user_id = ? WHERE id = ?", [currentUser.id, mOrder.id]);
          guestOrdersCount++;
        }
      }
    }

    // Per security requirement: Must have existing UB student trace to prevent unauthorized claims
    if (!oldUser && guestOrdersCount === 0) {
      return res.status(400).json({
        success: false,
        error: "Klaim akun alumni tidak dapat diproses: Tidak ditemukan riwayat akun mahasiswa (@student.ub.ac.id) terkait di sistem kami. Fitur klaim ini hanya untuk alumni yang sebelumnya pernah memiliki akun atau berbelanja menggunakan email UB."
      });
    }

    let mergedOrdersCount = guestOrdersCount;
    let oldEmail: string | null = null;

    if (oldUser) {
      const oldUserId = oldUser.id;
      oldEmail = oldUser.email;

      // 1. Orders: Transfer orders where user_id = oldUserId
      const res1: any = await execute(
        "UPDATE orders SET user_id = ? WHERE user_id = ?",
        [currentUser.id, oldUserId]
      );
      mergedOrdersCount += res1?.affectedRows || 0;

      // Also transfer orders matching oldEmail if unassigned
      if (oldEmail) {
        const res2: any = await execute(
          "UPDATE orders SET user_id = ? WHERE LOWER(TRIM(customer_email)) = LOWER(TRIM(?)) AND (user_id IS NULL OR user_id = 0)",
          [currentUser.id, oldEmail]
        );
        mergedOrdersCount += res2?.affectedRows || 0;
      }

      // 2. Product Reviews: avoid unique key conflict (order_id, product_id, user_id)
      await execute(
        `DELETE r1 FROM product_reviews r1
         JOIN product_reviews r2 ON r1.order_id = r2.order_id AND r1.product_id = r2.product_id
         WHERE r1.user_id = ? AND r2.user_id = ?`,
        [oldUserId, currentUser.id]
      );
      await execute(
        "UPDATE product_reviews SET user_id = ? WHERE user_id = ?",
        [currentUser.id, oldUserId]
      );

      // 3. Order Claims: avoid unique key conflict (user_id, order_id)
      await execute(
        `DELETE c1 FROM order_claims c1
         JOIN order_claims c2 ON c1.order_id = c2.order_id
         WHERE c1.user_id = ? AND c2.user_id = ?`,
        [oldUserId, currentUser.id]
      );
      await execute(
        "UPDATE order_claims SET user_id = ? WHERE user_id = ?",
        [currentUser.id, oldUserId]
      );

      // 4. Notifications
      await execute(
        "UPDATE notifications SET user_id = ? WHERE user_id = ?",
        [currentUser.id, oldUserId]
      );

      // 5. Push Subscriptions
      await execute(
        "UPDATE push_subscriptions SET user_id = ? WHERE user_id = ?",
        [currentUser.id, oldUserId]
      );

      // 6. User Addresses
      await execute(
        "UPDATE user_addresses SET user_id = ? WHERE user_id = ?",
        [currentUser.id, oldUserId]
      );

      // 7. Page Views
      await execute(
        "UPDATE page_views SET user_id = ? WHERE user_id = ?",
        [currentUser.id, oldUserId]
      );

      // 8. Copy phone or address if current user is missing them
      if (!currentUser.phone && oldUser.phone) {
        await execute("UPDATE users SET phone = ? WHERE id = ?", [oldUser.phone, currentUser.id]);
      }
      if (!currentUser.address && oldUser.address) {
        await execute("UPDATE users SET address = ? WHERE id = ?", [oldUser.address, currentUser.id]);
      }

      // 9. Soft-delete old user record: set merged_into_id, clear nim
      await execute(
        "UPDATE users SET merged_into_id = ?, nim = NULL WHERE id = ?",
        [currentUser.id, oldUserId]
      );
    }

    // 4. Update current user: set NIM and is_filkom_verified = 1
    await execute(
      "UPDATE users SET is_filkom_verified = 1, nim = ? WHERE id = ?",
      [cleanNim, currentUser.id]
    );

    // 5. Activity log
    await logActivity(
      currentUser.id,
      targetName,
      "customer",
      "claim_alumni_account",
      "user",
      currentUser.id,
      `Alumni claim: User ${currentUser.email} (ID ${currentUser.id}) berhasil mengklaim data akun lama (${oldEmail || "Guest UB"}) dengan NIM ${cleanNim}. ${mergedOrdersCount} pesanan digabungkan.`
    );

    console.log(`[Alumni Claim Success] User ${currentUser.email} claimed old account (${oldEmail}) with NIM ${cleanNim}. ${mergedOrdersCount} orders merged.`);

    return res.json({
      success: true,
      message: `Selamat! Akun Alumni FILKOM UB berhasil diverifikasi.${mergedOrdersCount > 0 ? ` Sebanyak ${mergedOrdersCount} riwayat pesanan lama berhasil digabungkan ke akun ini.` : ''}`,
      mergedOrdersCount,
      oldEmail,
      user: {
        id: String(currentUser.id),
        email: currentUser.email,
        name: currentUser.name,
        nim: cleanNim,
        is_filkom_verified: 1,
        role: "alumni",
        prodi: prodiName
      }
    });

  } catch (error: any) {
    console.error("Error claiming alumni account:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal memproses klaim akun alumni" });
  }
};

