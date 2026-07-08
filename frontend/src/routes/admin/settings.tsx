import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { Textarea } from "@frontend/components/ui/textarea";
import { getStoreSettings, updateStoreSettings, type StoreSettings } from "@backend/server-actions";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
  head: () => ({ meta: [{ title: "Pengaturan — Admin Panel" }] }),
});

function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.loading("Mengunggah QRIS statis...");
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.url) {
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                qris_static_url: data.url,
              }
            : null,
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
    void getStoreSettings()
      .then((res) => setSettings(res.settings))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const result = await updateStoreSettings({
      data: {
        store_name: settings.store_name,
        address: settings.address || undefined,
        phone: settings.phone || undefined,
        tax_rate: settings.tax_rate,
        qris_static_url: settings.qris_static_url || undefined,
      },
    });
    setSaving(false);
    if (result.success) {
      toast.success("Pengaturan toko disimpan");
    } else {
      toast.error(result.error || "Gagal menyimpan");
    }
  };

  if (loading || !settings) {
    return <div className="p-8 text-muted-foreground">Memuat pengaturan...</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-2xl bg-background min-h-screen">
      <div>
        <h1 className="display text-3xl text-ink tracking-wider">Pengaturan Toko</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
          Konfigurasi informasi toko dan POS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="display text-sm tracking-wider text-ink">Informasi Toko</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label>Foto QRIS Statis</Label>
            {settings.qris_static_url ? (
              <div className="relative border-2 border-dashed border-ink/30 rounded-lg p-4 bg-muted/30 flex flex-col items-center gap-3">
                <img
                  src={settings.qris_static_url}
                  alt="QRIS Statis"
                  className="max-h-48 rounded object-contain border border-ink/20 bg-white"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setSettings({ ...settings, qris_static_url: "" })}
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
        </CardContent>
      </Card>
    </div>
  );
}
