import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Flame, ShoppingBag, Store } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { Textarea } from "@frontend/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select";
import { getStoreSettings, updateStoreSettings, type StoreSettings } from "@backend/server-actions";
import { uploadImageHelper } from "@/lib/upload-helper";
import { resolveImageUrl } from "@/lib/image-resolver";
import { isInStoreOnlyMode, setInStoreOnlyInLayout } from "@/lib/store-mode";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
  head: () => ({ meta: [{ title: "Pengaturan — Admin Panel" }] }),
});

function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const isCashier = user?.type === "admin" && user.role === "cashier";
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah QRIS.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading("Mengunggah QRIS statis...");
      const data = await uploadImageHelper(file);
      toast.dismiss();

      if (data.success && data.url) {
        const qrisUrl: string = data.url;
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                qris_static_url: qrisUrl,
              }
            : null
        );
        toast.success("Foto QRIS berhasil diunggah");
      } else {
        toast.error(data.error || "Gagal mengunggah QRIS");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah QRIS");
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void getStoreSettings()
      .then((res) => setSettings(res.settings))
      .finally(() => setLoading(false));
  }, [authLoading]);

  const handleSave = async () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah pengaturan toko.");
      return;
    }
    if (!settings) return;
    setSaving(true);
    const result = await updateStoreSettings({
      data: {
        store_name: settings.store_name,
        address: settings.address || undefined,
        phone: settings.phone || undefined,
        tax_rate: settings.tax_rate,
        qris_static_url: settings.qris_static_url || undefined,
        payment_mode: settings.payment_mode || "mayar",
        homepage_layout: settings.homepage_layout || undefined,
        userRole: user?.type === "admin" ? (user.role || "admin") : "admin",
        userId: String(user?.id || ""),
      },
    });
    setSaving(false);
    if (result.success) {
      void queryClient.invalidateQueries({ queryKey: ["storeSettings"] });
      toast.success("Pengaturan toko disimpan");
    } else {
      toast.error(result.error || "Gagal menyimpan");
    }
  };

  if (loading || !settings) {
    return <div className="p-8 text-muted-foreground">Memuat pengaturan...</div>;
  }

  const inStoreOnly = isInStoreOnlyMode(settings);

  const handleToggleInStoreOnly = (nextVal: boolean) => {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            homepage_layout: setInStoreOnlyInLayout(prev.homepage_layout, nextVal),
          }
        : null,
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl bg-background min-h-screen">
      <div>
        <h1 className="display text-3xl text-ink tracking-wider">Pengaturan Toko</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
          Konfigurasi informasi toko dan POS
        </p>
      </div>

      {isCashier && (
        <div className="bg-amber-50 text-amber-800 border-2 border-amber-300 p-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          ⚠ READ-ONLY MODE: Kasir tidak diizinkan mengubah pengaturan toko.
        </div>
      )}

      {/* Toggle Mode Year-End Sale (In-Store Only) vs Mode Online Normal */}
      <Card className={`border-2 ${inStoreOnly ? "border-brand-orange bg-orange-50/40 dark:bg-orange-950/20" : "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="display text-sm tracking-wider text-ink flex items-center gap-2">
            {inStoreOnly ? (
              <>
                <Flame className="w-4 h-4 text-brand-orange" /> Mode Promo Year-End Sale (In-Store Only)
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-emerald-600" /> Mode Pembelian Online Normal
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="font-bold text-ink">
                Status Saat Ini:{" "}
                <span className={inStoreOnly ? "text-brand-orange" : "text-emerald-600"}>
                  {inStoreOnly
                    ? "AKTIF — Pembelian Online Ditutup (Hanya Kasir POS & Store Offline)"
                    : "NONAKTIF — Pembelian Online & Checkout Dibuka Normal"}
                </span>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {inStoreOnly
                  ? "Banner, pop-up, marquee Year-End Sale, dan section Lokasi Store ditampilkan di beranda. Tombol keranjang & checkout online dinonaktifkan."
                  : "Seluruh banner/pop-up Year-End Sale disembunyikan dan tampilan kembali normal. Pengunjung dapat menambahkan barang ke keranjang dan checkout online."}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                disabled={isCashier}
                variant={inStoreOnly ? "default" : "outline"}
                onClick={() => handleToggleInStoreOnly(true)}
                className={`text-xs font-bold cursor-pointer ${inStoreOnly ? "bg-brand-orange text-cream hover:bg-brand-orange/90" : ""}`}
              >
                <Store className="w-3.5 h-3.5 mr-1.5" /> Mode In-Store
              </Button>
              <Button
                type="button"
                disabled={isCashier}
                variant={!inStoreOnly ? "default" : "outline"}
                onClick={() => handleToggleInStoreOnly(false)}
                className={`text-xs font-bold cursor-pointer ${!inStoreOnly ? "bg-emerald-600 text-white hover:bg-emerald-700" : ""}`}
              >
                <ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Mode Online Normal
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
            *Jangan lupa klik tombol <strong>Simpan Pengaturan</strong> di bawah setelah mengubah mode agar tersimpan ke server.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="display text-sm tracking-wider text-ink">Informasi Toko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset disabled={isCashier} className="space-y-4 w-full border-0 p-0 m-0">
            <div className="space-y-2">
              <Label>Nama Toko</Label>
              <Input
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Alamat</Label>
              <Textarea
                value={settings.address || ""}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Telepon</Label>
              <Input
                value={settings.phone || ""}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Pajak (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={settings.tax_rate}
                onChange={(e) =>
                  setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran Online Default</Label>
              <Select
                value={settings.payment_mode || "mayar"}
                onValueChange={(val) => setSettings({ ...settings, payment_mode: val as any })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Metode Pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mayar">Online Payment — Mayar (Otomatis)</SelectItem>
                  <SelectItem value="manual_qris">QRIS Statis & Upload Bukti (Manual)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tentukan apakah pembeli online melakukan transaksi otomatis via Mayar atau transfer manual dengan scan QRIS statis lalu mengunggah bukti pembayaran.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Foto QRIS Statis</Label>
              {settings.qris_static_url ? (
                <div className="relative border-2 border-dashed border-ink/30 rounded-lg p-4 bg-muted/30 flex flex-col items-center gap-3">
                  <img
                    src={resolveImageUrl(settings.qris_static_url)}
                    alt="QRIS Statis"
                    className="max-h-48 rounded object-contain border border-ink/20 bg-white"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setSettings((prev) => (prev ? { ...prev, qris_static_url: null } : null))}
                    className="text-xs uppercase tracking-wider font-bold animate-fade-in"
                  >
                    Hapus QRIS
                  </Button>
                </div>
              ) : (
                <div className="grid w-full items-center gap-1.5">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadQris}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unggah file gambar QRIS Statis Anda (PNG, JPG, WEBP). Digunakan saat kasir memilih
                    pembayaran QRIS Statis di POS.
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="display bg-ink text-white hover:bg-brand-orange transition-all duration-300 font-bold tracking-widest text-xs py-5 px-6"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
