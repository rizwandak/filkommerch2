import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { completeUserProfile } from "@backend/server-actions";
import { toast } from "sonner";
import { Phone, GraduationCap, Users, Sparkles, CheckCircle2, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui/dialog";

export function MandatoryOnboardingModal() {
  const { user, updateUserProfile, logout } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "");
  const [isFilkom, setIsFilkom] = useState<boolean>(
    user?.is_filkom_verified === 1 || !!user?.nim || user?.email?.endsWith("@student.ub.ac.id") || false
  );
  const [nim, setNim] = useState(user?.nim || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if onboarding is needed:
  // Buyer is logged in, but either has no phone or onboarding_completed is 0/falsy
  const needsOnboarding =
    !!user &&
    user.type === "buyer" &&
    (!user.phone || user.phone.trim() === "" || user.onboarding_completed === 0 || user.onboarding_completed === undefined);

  if (!needsOnboarding) {
    return null;
  }

  const displayName = user ? user.name : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("Nomor WhatsApp / HP wajib diisi (minimal 8-15 digit angka)!");
      return;
    }

    if (isFilkom) {
      const cleanNim = nim.trim().replace(/\s+/g, "");
      if (!cleanNim || cleanNim.length < 5) {
        toast.error("NIM wajib diisi untuk verifikasi Mahasiswa FILKOM UB!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await completeUserProfile({
        data: {
          userId: user.id || "",
          phone: cleanPhone,
          isFilkom,
          nim: isFilkom ? nim.trim() : undefined,
        },
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan data profil");
        return;
      }

      toast.success(res.message || "Data profil berhasil disimpan!");
      if (res.user) {
        updateUserProfile(res.user);
      } else {
        updateUserProfile({
          phone: cleanPhone,
          nim: isFilkom ? nim.trim() : undefined,
          is_filkom_verified: isFilkom ? 1 : 0,
          onboarding_completed: 1,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan sistem saat menyimpan profil");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent
        className="sm:max-w-lg w-[95vw] max-h-[92vh] flex flex-col bg-white text-ink border-2 border-ink shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] p-5 sm:p-7 overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange font-bold text-xs w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            Langkah Terakhir Sebelum Masuk
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink">
            Lengkapi Profil Anda
          </DialogTitle>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Halo <strong>{displayName || user.email}</strong>! Lengkapi nomor WhatsApp dan verifikasi status Anda untuk melanjutkan ke website FILKOM Merch.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* No WhatsApp / HP (Wajib Semua) */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-ink uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-orange" />
                Nomor WhatsApp / HP <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">Wajib Semua Pengguna</span>
            </label>
            <Input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border-2 border-ink h-11 text-sm font-semibold rounded-lg focus-visible:ring-brand-orange"
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Digunakan untuk notifikasi status pesanan, klaim pesanan, dan pencarian cepat di kasir offline.
            </p>
          </div>

          {/* Status Civitas FILKOM vs Umum */}
          <div className="space-y-2">
            <label className="text-xs font-black text-ink uppercase tracking-wider block">
              Pilih Status Pengguna <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card Mahasiswa FILKOM */}
              <button
                type="button"
                onClick={() => setIsFilkom(true)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                  isFilkom
                    ? "border-emerald-600 bg-emerald-50/80 shadow-[3px_3px_0px_0px_rgba(5,150,105,1)]"
                    : "border-border bg-background hover:border-ink/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <GraduationCap className="w-4 h-4" />
                  </span>
                  {isFilkom && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-ink uppercase">
                    Mahasiswa FILKOM UB
                  </h4>
                  <p className="text-[10px] text-emerald-800 font-bold mt-0.5">
                    ✓ Dapat Diskon Harga Civitas
                  </p>
                </div>
              </button>

              {/* Card Bukan Mahasiswa FILKOM */}
              <button
                type="button"
                onClick={() => setIsFilkom(false)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                  !isFilkom
                    ? "border-brand-blue bg-blue-50/80 shadow-[3px_3px_0px_0px_rgba(37,99,235,1)]"
                    : "border-border bg-background hover:border-ink/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <Users className="w-4 h-4" />
                  </span>
                  {!isFilkom && (
                    <CheckCircle2 className="w-4 h-4 text-brand-blue fill-blue-100" />
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-ink uppercase">
                    Bukan FILKOM (Umum)
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Harga Reguler / Umum
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Input NIM jika Mahasiswa FILKOM */}
          {isFilkom ? (
            <div className="space-y-1.5 p-3.5 bg-emerald-50/70 border-2 border-emerald-500 rounded-xl animate-in fade-in duration-200">
              <label className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center justify-between">
                <span>Nomor Induk Mahasiswa (NIM) <span className="text-red-500">*</span></span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Verifikasi FILKOM</span>
              </label>
              <Input
                type="text"
                placeholder="Contoh: 215150200111001"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                className="border-2 border-emerald-600 h-11 text-sm font-bold bg-white text-ink rounded-lg focus-visible:ring-emerald-500"
                required
              />
              <p className="text-[10px] text-emerald-900 leading-relaxed">
                💡 Masukkan NIM aktif FILKOM Anda untuk mendapatkan potongan harga spesial mahasiswa di setiap produk!
              </p>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-600 leading-relaxed">
              ℹ️ Anda akan berbelanja dengan <strong>Harga Reguler / Umum</strong>. Tidak diperlukan NIM. Anda tetap dapat melakukan pre-order, belanja online, dan checkout di kasir offline.
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-ink hover:bg-brand-orange text-white font-black text-xs uppercase tracking-widest border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Menyimpan...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Simpan &amp; Lanjutkan ke Homepage
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          {/* Ganti Akun / Logout Option */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={logout}
              className="text-[11px] text-muted-foreground hover:text-red-600 transition-colors inline-flex items-center gap-1 font-semibold underline underline-offset-2 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Bukan akun Anda? Keluar / Ganti Akun
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
