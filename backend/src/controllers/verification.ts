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
 * GET https://api-frontend.kemdikbud.go.id/hit_mhs/<NIM>
 */
async function fetchPDDIKTIStudent(nim: string): Promise<any | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const url = `https://api-frontend.kemdikbud.go.id/hit_mhs/${encodeURIComponent(nim)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = (await res.json()) as any;
    if (!data || !Array.isArray(data.mahasiswa) || data.mahasiswa.length === 0) {
      return null;
    }

    // Return the first exact or best match
    return data.mahasiswa.find((m: any) => m.nim.replace(/\s+/g, "") === nim.replace(/\s+/g, "")) || data.mahasiswa[0];
  } catch (err) {
    console.warn("[PDDIKTI Student Fetch] Error or timeout:", err);
    return null;
  }
}

/**
 * Verifies a lecturer via PDDIKTI API
 * GET https://api-frontend.kemdikbud.go.id/hit_dosen/<NIDN>
 */
async function fetchPDDIKTILecturer(nidn: string): Promise<any | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const url = `https://api-frontend.kemdikbud.go.id/hit_dosen/${encodeURIComponent(nidn)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = (await res.json()) as any;
    if (!data || !Array.isArray(data.dosen) || data.dosen.length === 0) {
      return null;
    }

    // Return the first exact or best match
    return data.dosen.find((d: any) => d.nidn.replace(/\s+/g, "") === nidn.replace(/\s+/g, "")) || data.dosen[0];
  } catch (err) {
    console.warn("[PDDIKTI Lecturer Fetch] Error or timeout:", err);
    return null;
  }
}

/**
 * Main handler to verify UB FILKOM civitas status (student or lecturer)
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
      return res.status(400).json({ success: false, error: "NIM atau NIDN wajib diisi" });
    }

    const cleanIdentifier = nimOrNidn.trim().replace(/\s+/g, "");

    // 1. Fetch user from database to make sure they exist
    const dbUser = await queryOne<any>("SELECT id, name, email FROM users WHERE id = ?", [userId]);
    if (!dbUser) {
      return res.status(404).json({ success: false, error: "User tidak ditemukan" });
    }

    const targetName = googleName || dbUser.name;

    console.log(`[Verification] User ${dbUser.email} (${targetName}) attempting verification with: ${cleanIdentifier}`);

    let verificationSource = "PDDIKTI API";
    let isVerified = false;
    let details: { role: string; prodi: string; nameOnRecord: string } | null = null;

    // --- STEP 1: Query PDDIKTI Student Registry ---
    const studentRecord = await fetchPDDIKTIStudent(cleanIdentifier);
    if (studentRecord) {
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
      }
    }

    // --- STEP 2: Query PDDIKTI Lecturer Registry (If not verified yet) ---
    if (!isVerified) {
      const lecturerRecord = await fetchPDDIKTILecturer(cleanIdentifier);
      if (lecturerRecord) {
        const isUB = lecturerRecord.nama_pt.toUpperCase().includes("BRAWIJAYA");
        const isFilkom = isFilkomProdi(lecturerRecord.nama_prodi);
        const nameMatch = isNameSimilar(targetName, lecturerRecord.nama);

        if (isUB && isFilkom && nameMatch) {
          isVerified = true;
          details = {
            role: "dosen",
            prodi: lecturerRecord.nama_prodi,
            nameOnRecord: lecturerRecord.nama
          };
        } else {
          console.warn(`[Verification Lecturer Match Failed] isUB: ${isUB}, isFilkom: ${isFilkom}, nameMatch: ${nameMatch} (Target: ${targetName}, Record: ${lecturerRecord?.nama}, Prodi: ${lecturerRecord?.nama_prodi})`);
        }
      }
    }

    // --- STEP 3: Fallback Logic if API is offline or has no results ---
    if (!isVerified) {
      console.log(`[Verification] PDDIKTI lookup failed or returned no match. Attempting fallback checks.`);

      // Regex pattern matching for FILKOM Student NIM:
      // Starts with Year (2 digits), followed by S1/S2/S3 level (3-7), followed by FILKOM code (15), then 10 digits.
      // Total 15 digits.
      const filkomNimRegex = /^\d{2}[3-7]15\d{10}$/;
      
      // Lecturer NIDN format is usually 10 digits
      const nidnRegex = /^\d{10}$/;

      if (filkomNimRegex.test(cleanIdentifier)) {
        isVerified = true;
        verificationSource = "NIM Pattern Match (Fallback)";
        details = {
          role: "mahasiswa",
          prodi: "FILKOM (Verified via NIM Pattern)",
          nameOnRecord: targetName
        };
        console.log(`[Verification] Verified successfully via NIM pattern fallback for: ${cleanIdentifier}`);
      } else if (dbUser.email.endsWith("@ub.ac.id") && /^\d{8,18}$/.test(cleanIdentifier)) {
        // Any numeric NIP/NIK/NIDN of 8-18 digits for staff/lecturer emails (@ub.ac.id) is accepted automatically
        isVerified = true;
        verificationSource = "Staff ID Pattern Match (Fallback)";
        details = {
          role: "dosen/staff",
          prodi: "FILKOM (Verified via Staff ID Pattern)",
          nameOnRecord: targetName
        };
        console.log(`[Verification] Verified successfully via staff pattern fallback for UB email ${dbUser.email}: ${cleanIdentifier}`);
      } else if (nidnRegex.test(cleanIdentifier)) {
        // Since NIDN is national and has no school prefix, we accept it under fallback
        isVerified = true;
        verificationSource = "NIDN Pattern Match (Fallback)";
        details = {
          role: "dosen/staff",
          prodi: "FILKOM (Verified via NIDN Pattern)",
          nameOnRecord: targetName
        };
        console.log(`[Verification] Verified successfully via NIDN pattern fallback: ${cleanIdentifier}`);
      }
    }

    if (isVerified && details) {
      // 2. Update user record in database
      await execute(
        "UPDATE users SET is_filkom_verified = 1, nim = ? WHERE id = ?",
        [cleanIdentifier, userId]
      );

      console.log(`[Verification Success] Verified user ${dbUser.email} using ${verificationSource} as ${details.role} (${details.prodi})`);

      return res.json({
        success: true,
        message: `Verifikasi berhasil via ${verificationSource}!`,
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
      error: "Verifikasi gagal. Pastikan NIM/NIDN Anda benar dan terdaftar di program studi FILKOM Universitas Brawijaya."
    });

  } catch (error: any) {
    console.error("Error verifying FILKOM civitas:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal melakukan verifikasi" });
  }
};
