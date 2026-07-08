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
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { verifyFilkomUserAction } from "@backend/server-actions";
import { useAuth } from "@/lib/auth";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VerificationModal({ isOpen, onClose, onSuccess }: VerificationModalProps) {
  const { user, setUser } = useAuth() as any; // Cast to update state if necessary
  const [nim, setNim] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nim.trim()) {
      toast.error("NIM tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyFilkomUserAction({ data: { nimOrNidn: nim.trim() } });

      if (result.success && result.user) {
        toast.success(result.message || "Verifikasi berhasil!");

        // Update local auth state with verified data
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
      } else {
        toast.error(result.error || "Verifikasi gagal. Pastikan data yang dimasukkan benar.");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-white border border-[#EBE3D5] rounded-2xl shadow-xl p-6 font-sans">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <ShieldCheck className="h-6 w-6 text-brand-blue" />
          </div>
          <DialogTitle className="text-center text-xl font-extrabold text-ink">
            Verifikasi Civitas FILKOM UB
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground leading-relaxed">
            Gunakan NIM (Mahasiswa) Anda untuk mengaktifkan diskon khusus civitas
            FILKOM UB pada semua produk FILKOM Merch.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label
              htmlFor="identifier"
              className="text-xs font-bold text-ink uppercase tracking-wider"
            >
              NIM Anda
            </label>
            <Input
              id="identifier"
              placeholder="Masukkan NIM"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              disabled={loading}
              className="border-[#D6C7AE] focus-visible:ring-brand-blue h-11 text-sm bg-cream/10"
              autoFocus
            />
          </div>

          <div className="bg-[#FAF7F0] border border-[#EBE3D5] rounded-xl p-3.5 space-y-2 text-[11px] text-muted-foreground leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-brand-orange font-bold">•</span>
              <span>
                Nama pada akun Google UB Anda harus sama dengan nama yang terdaftar di PDDIKTI.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-brand-orange font-bold">•</span>
              <span>Satu NIM hanya dapat terikat dengan satu akun aktif FILKOM Merch.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-brand-orange font-bold">•</span>
              <span>
                Jika API PDDIKTI eksternal down, sistem akan beralih ke pengecekan pola NIM secara otomatis.
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
              className="bg-brand-blue hover:bg-brand-blue/90 text-white flex-1 h-11 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-blue/20"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                "Verifikasi Sekarang"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
