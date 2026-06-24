import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sliders, RefreshCw, LayoutTemplate } from "lucide-react";
import { Button } from "@frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@frontend/components/ui/card";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { Textarea } from "@frontend/components/ui/textarea";
import { getStoreSettings, updateStoreSettings, type StoreSettings } from "@backend/server-actions";

export const Route = createFileRoute("/admin/homepage")({
  component: AdminHomepageEditorPage,
  head: () => ({ meta: [{ title: "Tata Letak — Admin Panel" }] }),
});

interface HomepageLayoutConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroSubLabel: string;
  heroBtnText: string;
  heroImage: string;
  marqueeText: string;
}

const defaultConfig = (): HomepageLayoutConfig => ({
  heroTitle: "Wear\nYour\nFaculty.",
  heroSubtitle:
    "Koleksi merchandise resmi mahasiswa Fakultas Ilmu Komputer UB. Dibuat oleh mahasiswa, untuk mahasiswa premium, eksklusif, dan limited stock.",
  heroSubLabel: "FILKOM MERCH 2026",
  heroBtnText: "SHOP THE DROP",
  heroImage: "",
  marqueeText:
    "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN | 100% PRODUK MAHASISWA | CASHBACK 5% MEMBER | DROP BARU TIAP BULAN",
});

function AdminHomepageEditorPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [layout, setLayout] = useState<HomepageLayoutConfig>(defaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getStoreSettings();
      if (result.settings) {
        setSettings(result.settings);
        if (result.settings.homepage_layout) {
          try {
            const parsed = JSON.parse(result.settings.homepage_layout);
            setLayout({
              ...defaultConfig(),
              ...parsed,
            });
          } catch {
            toast.error("Format layout sebelumnya rusak, menggunakan setelan bawaan");
          }
        }
      }
    } catch {
      toast.error("Gagal memuat pengaturan tata letak");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    try {
      const layoutJson = JSON.stringify(layout);
      const result = await updateStoreSettings({
        data: {
          store_name: settings.store_name,
          address: settings.address || undefined,
          phone: settings.phone || undefined,
          tax_rate: settings.tax_rate,
          qris_static_url: settings.qris_static_url || undefined,
          homepage_layout: layoutJson,
        },
      });

      if (result.success) {
        toast.success("Tata letak beranda berhasil diperbarui!");
        await loadData();
      } else {
        toast.error(result.error || "Gagal menyimpan perubahan");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Kembalikan tata letak ke setelan bawaan pabrik?")) {
      setLayout(defaultConfig());
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-muted-foreground bg-background min-h-screen">
        Memuat editor tata letak...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider">Editor Beranda</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Sesuaikan teks, gambar, dan running text promosi di halaman depan pembeli
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="border-2 border-ink text-xs font-bold uppercase tracking-wider"
          >
            Reset Default
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-ink hover:bg-brand-orange text-white text-xs font-bold uppercase tracking-widest py-5 px-6 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
          >
            {saving ? "Menyimpan..." : "Simpan Tata Letak"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-orange" /> Konfigurasi Banner Hero
              </CardTitle>
              <CardDescription>Ubah teks promosi utama di bagian atas website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sub-Label Atas Hero</Label>
                <Input
                  value={layout.heroSubLabel}
                  onChange={(e) => setLayout({ ...layout, heroSubLabel: e.target.value })}
                  placeholder="FILKOM MERCH 2026"
                />
              </div>

              <div className="space-y-2">
                <Label>Judul Utama Hero (Gunakan \n untuk baris baru)</Label>
                <Textarea
                  value={layout.heroTitle}
                  onChange={(e) => setLayout({ ...layout, heroTitle: e.target.value })}
                  placeholder="Wear\nYour\nFaculty."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Sub-Judul / Keterangan Hero</Label>
                <Textarea
                  value={layout.heroSubtitle}
                  onChange={(e) => setLayout({ ...layout, heroSubtitle: e.target.value })}
                  placeholder="Deskripsi koleksi merchandise..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Teks Tombol Hero</Label>
                <Input
                  value={layout.heroBtnText}
                  onChange={(e) => setLayout({ ...layout, heroBtnText: e.target.value })}
                  placeholder="SHOP THE DROP"
                />
              </div>

              <div className="space-y-2">
                <Label>URL Gambar Hero Lookbook (Kosongkan untuk bawaan)</Label>
                <Input
                  value={layout.heroImage}
                  onChange={(e) => setLayout({ ...layout, heroImage: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
            <CardHeader>
              <CardTitle className="display text-sm tracking-wider text-ink flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-brand-blue" /> Pengumuman Berjalan (Marquee)
              </CardTitle>
              <CardDescription>
                Pesan berjalan di bar hitam paling atas. Pisahkan pesan dengan karakter pipa "|"
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Teks Pengumuman (Gunakan pembatas | )</Label>
                <Textarea
                  value={layout.marqueeText}
                  onChange={(e) => setLayout({ ...layout, marqueeText: e.target.value })}
                  placeholder="Pesan 1 | Pesan 2 | Pesan 3..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-4 space-y-4">
            <h2 className="display text-xs tracking-widest text-muted-foreground uppercase font-bold flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Pratinjau Tampilan Beranda
            </h2>

            {/* Simulated Banner Marquee */}
            <div className="bg-ink text-cream py-1.5 px-3 overflow-hidden text-[9px] tracking-wider rounded border border-ink font-semibold flex items-center gap-4">
              <span className="bg-brand-orange text-ink px-1 rounded text-[8px] font-extrabold shrink-0">
                MARQUEE
              </span>
              <div className="truncate text-cream/90 flex gap-2">
                {layout.marqueeText.split("|").map((t, idx) => (
                  <span key={idx} className="shrink-0">
                    {t.trim()} <span className="text-brand-orange ml-2">●</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Simulated Hero Box */}
            <div className="bg-white border-2 border-ink rounded-lg p-5 shadow-md flex flex-col justify-between aspect-[4/5] overflow-hidden relative group">
              <div className="z-10 flex flex-col justify-center h-full max-w-[70%]">
                <span className="text-[8px] tracking-widest text-brand-orange font-bold uppercase mb-1">
                  {layout.heroSubLabel || "SUB LABEL"}
                </span>

                <h3 className="display text-3xl text-ink leading-none uppercase">
                  {layout.heroTitle
                    ? layout.heroTitle.split("\n").map((line, idx) => (
                        <span key={idx}>
                          {line}
                          <br />
                        </span>
                      ))
                    : "Wear Your Faculty."}
                </h3>

                <p className="text-[10px] text-muted-foreground line-clamp-4 mt-2">
                  {layout.heroSubtitle || "Deskripsi sub-banner hero akan tampil lengkap di sini."}
                </p>

                <div className="mt-4 bg-ink text-cream text-[9px] font-bold tracking-widest px-3 py-2 w-fit rounded uppercase">
                  {layout.heroBtnText || "SHOP THE DROP"} →
                </div>
              </div>

              {/* Background image mockup */}
              <div className="absolute top-0 right-0 bottom-0 left-[60%] bg-brand-blue/30 border-l border-ink/20">
                {layout.heroImage ? (
                  <img
                    src={layout.heroImage}
                    alt="Preview"
                    className="w-full h-full object-cover opacity-75 mix-blend-luminosity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground italic">
                    Default Lookbook
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
