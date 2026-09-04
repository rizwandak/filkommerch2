import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@frontend/components/ui/dialog";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { completeUserProfile } from "@backend/server-actions";
import {
  Phone,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export function MandatoryOnboardingModal() {
  const { user, setUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "");
  const [isFilkom, setIsFilkom] = useState<boolean | null>(null);
  const [nim, setNim] = useState(user?.nim || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check whether onboarding is needed
  if (!user || user.type === "admin") return null;

  const hasCompletedOnboarding =
    Boolean(user.onboarding_completed) ||
    Boolean(user.phone && user.phone.trim().length >= 8);

  if (hasCompletedOnboarding) return null;

  const isStudentUbEmail =
    user.email &&
    (user.email.toLowerCase().endsWith("@student.ub.ac.id") ||
      user.email.toLowerCase().endsWith("@ub.ac.id"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 8 || cleanPhone.length > 16) {
      toast.error("Nomor WhatsApp/HP wajib diisi (minimal 8 - 15 digit angka)!");
      return;
    }

    if (isFilkom === null) {
      toast.error("Silakan tentukan apakah Anda Mahasiswa FILKOM UB atau Bukan Mahasiswa FILKOM!");
      return;
    }

    if (isFilkom && (!nim || nim.trim().length < 5)) {
      toast.error("NIM wajib diisi untuk verifikasi Mahasiswa FILKOM!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await completeUserProfile({
        data: {
          userId: user.id,
          phone: cleanPhone,
          isFilkom: isFilkom,
          nim: isFilkom ? nim.trim() : undefined,
        },
      });

      if (res && res.success && res.user) {
        const updated = {
          ...user,
          ...res.user,
          phone: cleanPhone,
          nim: isFilkom ? nim.trim() : undefined,
          is_filkom_verified: res.user.is_filkom_verified || (isFilkom ? 1 : 0),
          onboarding_completed: 1,
        };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        toast.success(res.message || "Profil berhasil dilengkapi! Selamat berbelanja.");
      } else {
        toast.error(res?.error || "Gagal menyimpan data. Silakan coba lagi.");
      }
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error(err.message || "Terjadi kesalahan saat melengkapi data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto bg-white border-2 border-ink shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] p-5 sm:p-7 rounded-2xl [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="bg-brand-orange text-white text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
              Langkah Wajib
            </span>
            <span className="text-[11px] font-extrabold text-muted-foreground">
              Halo, {user.name} 👋
            </span>
          </div>
          <DialogTitle className="display text-xl sm:text-2xl tracking-wide text-ink uppercase">
            Lengkapi Profil Anda
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Sebelum masuk ke FILKOM Merch UB, mohon lengkapi nomor kontak WhatsApp dan status civitas Anda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Field 1: WhatsApp / Phone Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="onboarding-phone" className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Nomor WhatsApp / HP <span className="text-red-500 font-bold">*WAJIB</span>
              </Label>
              <span className="text-[10px] text-muted-foreground font-semibold">Aktif WhatsApp</span>
            </div>
            <Input
              id="onboarding-phone"
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border-2 border-ink focus-visible:ring-brand-orange h-11 text-sm bg-white font-mono"
              required
            />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Digunakan kasir POS dan sistem untuk konfirmasi pesanan &amp; notifikasi struk digital.
            </p>
          </div>

          {/* Field 2: FILKOM Student Status Choice */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-black uppercase tracking-wider text-ink block">
              Status Anda di Universitas Brawijaya <span className="text-red-500 font-bold">*WAJIB</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Mahasiswa FILKOM UB */}
              <button
                type="button"
                onClick={() => setIsFilkom(true)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                  isFilkom === true
                    ? "border-emerald-600 bg-emerald-50/70 shadow-[2px_2px_0px_0px_rgba(5,150,105,1)]"
                    : "border-border/80 bg-white hover:border-ink hover:bg-cream/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  {isFilkom === true && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-ink uppercase tracking-wide">
                    Mahasiswa FILKOM
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    Dapatkan <strong className="text-emerald-700">Harga Khusus Civitas</strong> untuk seluruh produk!
                  </p>
                </div>
              </button>

              {/* Option 2: Bukan Mahasiswa FILKOM */}
              <button
                type="button"
                onClick={() => {
                  setIsFilkom(false);
                  setNim("");
                }}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                  isFilkom === false
                    ? "border-brand-blue bg-blue-50/70 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)]"
                    : "border-border/80 bg-white hover:border-ink hover:bg-cream/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-brand-blue">
                    <Users className="w-4 h-4" />
                  </div>
                  {isFilkom === false && (
                    <CheckCircle2 className="w-4 h-4 text-brand-blue" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-black text-ink uppercase tracking-wide">
                    Bukan Mahasiswa FILKOM
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    Belanja sebagai pembeli umum. <strong className="text-brand-blue">Tidak perlu memasukkan NIM</strong>.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Conditional NIM input if Mahasiswa FILKOM */}
          {isFilkom === true && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label htmlFor="onboarding-nim" className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  Nomor Induk Mahasiswa (NIM) <span className="text-red-500 font-bold">*</span>
                </Label>
                <span className="text-[10px] text-emerald-800 font-bold">15 Digit</span>
              </div>
              <Input
                id="onboarding-nim"
                placeholder="Contoh: 215150200111001"
                value={nim}
                onChange={(e) => setNim(e.target.value)}
                className="border-2 border-emerald-600 focus-visible:ring-emerald-600 h-10 text-sm bg-white font-mono"
                required={isFilkom === true}
              />

              {!isStudentUbEmail && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 leading-tight flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Akun Google Anda ({user.email}) bukan email <strong>@student.ub.ac.id</strong>. Untuk verifikasi otomatis diskon civitas, disarankan login dengan akun Google UB Anda. Jika akun umum, Anda dapat memilih opsi <strong>"Bukan Mahasiswa FILKOM"</strong> di atas.
                  </span>
                </div>
              )}
            </div>
          )}

          {isFilkom === false && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0" />
              <span>
                Anda terdaftar sebagai <strong>Pembeli Umum</strong>. Anda tetap dapat menikmati seluruh koleksi resmi FILKOM Merch!
              </span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isFilkom === null}
            className="w-full h-11 text-xs font-black uppercase tracking-wider bg-brand-orange hover:bg-brand-orange/90 text-white border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                MEMVERIFIKASI &amp; MENYIMPAN...
              </span>
            ) : (
              <>
                <span>Simpan &amp; Masuk ke Beranda</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
