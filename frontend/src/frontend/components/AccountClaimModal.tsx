import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@frontend/components/ui/dialog";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import { toast } from "sonner";
import { Loader2, GraduationCap, History, ShieldCheck } from "lucide-react";
import { claimAlumniAccountAction } from "@backend/server-actions";
import { useAuth } from "@/lib/auth";

interface AccountClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AccountClaimModal({ isOpen, onClose, onSuccess }: AccountClaimModalProps) {
  const { user, setUser } = useAuth() as any;
  const [nim, setNim] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNim = nim.trim();
    if (!cleanNim) {
      toast.error("NIM tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      const result = await claimAlumniAccountAction({ data: { nim: cleanNim } });

      if (result.success && result.user) {
        toast.success(result.message || "Klaim akun alumni berhasil!");

        // Update local auth state with verified alumni data
        if (user && setUser) {
          const updatedUser = {
            ...user,
            is_filkom_verified: 1,
            nim: result.user.nim,
          };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        if (onSuccess) onSuccess();
        onClose();

        // Refresh orders or page context if orders were merged
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        toast.error(result.error || "Klaim akun alumni gagal. Pastikan data yang dimasukkan benar.");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-white border border-[#EBE3D5] rounded-2xl shadow-xl p-6 font-sans">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <GraduationCap className="h-6 w-6 text-amber-700" />
          </div>
          <DialogTitle className="text-center text-xl font-extrabold text-ink">
            Klaim Akun Alumni FILKOM UB
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
            Akun Google student UB Anda dinonaktifkan setelah lulus? Masukkan NIM Anda untuk menghubungkan data akun lama ke akun ini dan mengaktifkan harga khusus civitas FILKOM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleClaim} className="space-y-4 py-3">
          <div className="space-y-1.5">
            <label
              htmlFor="alumni-nim"
              className="text-xs font-bold text-ink uppercase tracking-wider"
            >
              NIM Mahasiswa Anda
            </label>
            <Input
              id="alumni-nim"
              placeholder="Contoh: 205150200111000"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              disabled={loading}
              className="border-[#D6C7AE] focus-visible:ring-amber-600 h-11 text-sm bg-cream/10"
              autoFocus
            />
          </div>

          <div className="bg-[#FAF7F0] border border-[#EBE3D5] rounded-xl p-3.5 space-y-2.5 text-[11px] text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-2">
              <History className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Penggabungan Data:</strong> Riwayat pesanan & ulasan dari akun @student.ub.ac.id lama Anda akan otomatis dialihkan ke akun ini.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Verifikasi PDDIKTI:</strong> Nama pada akun Google Anda harus sesuai dengan nama yang terdaftar di PDDIKTI untuk NIM tersebut.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-700 font-bold">•</span>
              <span>
                Klaim ini hanya berlaku bagi alumni yang sebelumnya pernah terdaftar atau bertransaksi menggunakan email UB.
              </span>
            </div>
          </div>

          <DialogFooter className="pt-2 sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-[#D6C7AE] text-muted-foreground hover:bg-slate-50 flex-1 h-11 rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-700 hover:bg-amber-800 text-white flex-1 h-11 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-800/20"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses Klaim...
                </>
              ) : (
                "Klaim Akun Sekarang"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
