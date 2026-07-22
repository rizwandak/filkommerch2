import { Request, Response } from "express";
import { execute, queryOne } from "../config/database";

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
