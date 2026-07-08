import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sliders,
  RefreshCw,
  LayoutTemplate,
  HelpCircle,
  ShieldCheck,
  Tag,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
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
  // Hero settings
  heroTitle: string;
  heroSubtitle: string;
  heroSubLabel: string;
  heroBtnText: string;
  heroImage: string;
  marqueeText: string;

  // Hero countdown
  heroCountdownEnd: string;
  showHeroCountdown: boolean;

  // Featured products (comma-separated slugs)
  featuredProductSlugs: string;

  // Limited Drop Section
  limitedTitle: string;
  limitedSubtitle: string;
  limitedProductSlug: string;
  limitedImage: string;
  limitedCountdownEnd: string;
  limitedStockMax: number;
  limitedStockCurrent: number;
  showLimitedDrop: boolean;

  // Value propositions
  whyTitle1: string; whyDesc1: string;
  whyTitle2: string; whyDesc2: string;
  whyTitle3: string; whyDesc3: string;
  whyTitle4: string; whyDesc4: string;

  // FAQ Section
  faqQ1?: string; faqA1?: string;
  faqQ2?: string; faqA2?: string;
  faqQ3?: string; faqA3?: string;
  faqQ4?: string; faqA4?: string;
  faqItems: { id: string, q: string, a: string }[];
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

  heroCountdownEnd: "2026-07-15T23:59:59+07:00",
  showHeroCountdown: true,

  featuredProductSlugs: "varsity-filkom,hoodie-code-run,tshirt-debugging",

  limitedTitle: "Varsity FILKOM Edition",
  limitedSubtitle: "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
  limitedProductSlug: "varsity-filkom",
  limitedImage: "",
  limitedCountdownEnd: "2026-07-10T23:59:59+07:00",
  limitedStockMax: 100,
  limitedStockCurrent: 82,
  showLimitedDrop: true,

  whyTitle1: "Desain Orisinal",
  whyDesc1: "Setiap artikel dirancang eksklusif oleh mahasiswa FILKOM demi mewakili identitas kita.",
  whyTitle2: "Kualitas Premium",
  whyDesc2: "Bahan cotton fleece tebal, sablon presisi tinggi, dan jahitan standar distro internasional.",
  whyTitle3: "Bebas Ongkir Kampus",
  whyDesc3: "Pesan online, ambil langsung di Gazebo FILKOM UB tanpa biaya kirim sepeser pun.",
  whyTitle4: "Pembayaran Instan",
  whyDesc4: "Mendukung pembayaran otomatis QRIS, ShopeePay, GoPay, dan transfer bank via Midtrans.",

  faqQ1: "Apakah produk ini resmi (official) dari FILKOM?",
  faqA1: "Ya, Filkom Merchandise adalah toko merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya yang bekerjasama dengan pihak fakultas dan BEM FILKOM UB.",
  faqQ2: "Bagaimana cara mengambil pesanan saya?",
  faqA2: "Anda dapat memilih metode pengambilan 'Pickup di Kampus' saat checkout. Tim kami akan bersiap di Gazebo FILKOM UB pada jadwal pengambilan yang diinfokan via WhatsApp.",
  faqQ3: "Berapa lama estimasi pengerjaan barang Pre-Order?",
  faqA3: "Proses produksi barang pre-order biasanya memakan waktu 14 hingga 21 hari kerja setelah sesi pemesanan ditutup, tergantung tingkat kerumitan desain dan antrean vendor.",
  faqQ4: "Apakah saya bisa menukar ukuran pakaian jika tidak pas?",
  faqA4: "Penukaran ukuran diperbolehkan maksimal 2 hari setelah barang diterima, dengan syarat tag belum dilepas, belum dicuci, dan stok ukuran pengganti masih tersedia.",
  faqItems: [
    { 
      id: "size", 
      q: "Bara, kalau ukuranku kebesaran bisa ditukar nggak?", 
      a: "Waduh kalau kebesaran, tenang aja bro/sis! Penukaran ukuran boleh maksimal 2 hari setelah barang diterima kok. Syaratnya tag belum dilepas, belum dicuci, dan stok ukuran pengganti masih ada. Aman! 😎" 
    },
    { 
      id: "po", 
      q: "Barang pre-order selesainya kapan nih?", 
      a: "Proses produksi barang PO biasanya sekitar 14-21 hari kerja setelah sesi pemesanan ditutup yaa. Tergantung antrean vendor juga, tapi Bara bakal pastiin secepat mungkin! 🔥" 
    },
    { 
      id: "pickup", 
      q: "Ngambil pesanannya dimana Bar?", 
      a: "Pilih aja 'Pickup di Kampus' pas checkout! Nanti tim Bara bakal nungguin kamu di Gazebo FILKOM UB sesuai jadwal yang dikirim via WhatsApp. Jangan lupa bawa bukti pesanan ya! 🐯" 
    },
    { 
      id: "discount", 
      q: "Dapet diskon mahasiswa gimana caranya?", 
      a: "Gampang! Kamu tinggal login pake email student UB (@student.ub.ac.id) atau masukin NIM di menu Akun. Nanti otomatis dapet potongan harga civitas 5%! Lumayan kan buat beli es teh? 🥤" 
    },
    { 
      id: "payment", 
      q: "Pembayarannya bisa pakai apa aja?", 
      a: "Lengkap bos! Kita pakai Midtrans, jadi bisa QRIS (Gopay, ShopeePay, Dana, dll) atau Transfer Bank (BCA, Mandiri, dll). Praktis abis!" 
    },
    { 
      id: "shipping", 
      q: "Bisa kirim ke luar kota Malang?", 
      a: "Bisa banget! Bara siap anter pesananmu pake JNE, J&T, atau Sicepat ke seluruh penjuru Indonesia. Ongkirnya otomatis kehitung pas checkout ya." 
    },
    { 
      id: "ori", 
      q: "Ini barang ori dari FILKOM UB?", 
      a: "Yoi dong! Filkom Merch itu toko merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya, hasil kolaborasi mantap sama fakultas dan BEM FILKOM UB. 100% Original! ⭐️" 
    }
  ]
});

function AdminHomepageEditorPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [layout, setLayout] = useState<HomepageLayoutConfig>(defaultConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"hero" | "featured" | "why" | "faq">("hero");

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const handleUploadHeroImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.loading("Mengunggah gambar hero...");
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.url) {
        setLayout((prev) => ({
          ...prev,
          heroImage: data.url,
        }));
        toast.success("Gambar hero berhasil diunggah");
      } else {
        toast.error(data.error || "Gagal mengunggah gambar hero");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah gambar hero");
    }
  };

  const handleUploadLimitedImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.loading("Mengunggah gambar limited drop...");
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.url) {
        setLayout((prev) => ({
          ...prev,
          limitedImage: data.url,
        }));
        toast.success("Gambar limited drop berhasil diunggah");
      } else {
        toast.error(data.error || "Gagal mengunggah gambar");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah gambar");
    }
  };

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
              faqItems: parsed.faqItems || defaultConfig().faqItems
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
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider">Editor Tata Letak Beranda</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Sesuaikan konten beranda, countdown pre-order, best seller, FAQ, dan value propositions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="border-2 border-ink text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Reset Default
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-ink hover:bg-brand-orange text-white text-xs font-bold uppercase tracking-widest py-5 px-6 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex flex-wrap gap-2 border-b-2 border-ink pb-2">
        {[
          { id: "hero", label: "Hero & Marquee", icon: Sliders },
          { id: "featured", label: "Featured & Limited", icon: Tag },
          { id: "why", label: "Mengapa Memilih Kami", icon: ShieldCheck },
          { id: "faq", label: "FAQ Q&A", icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-t-2 border-x-2 rounded-t-md cursor-pointer ${
                activeTab === tab.id
                  ? "bg-ink text-cream border-ink"
                  : "bg-transparent text-muted-foreground border-transparent hover:text-ink hover:border-muted/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === "hero" && (
            <div className="space-y-6 animate-fade-in">
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
                      rows={3}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Teks Tombol Hero</Label>
                      <Input
                        value={layout.heroBtnText}
                        onChange={(e) => setLayout({ ...layout, heroBtnText: e.target.value })}
                        placeholder="SHOP THE DROP"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Waktu Countdown Hero (ISO 8601)</Label>
                      <Input
                        type="text"
                        value={layout.heroCountdownEnd}
                        onChange={(e) => setLayout({ ...layout, heroCountdownEnd: e.target.value })}
                        placeholder="YYYY-MM-DDTHH:MM:SS+07:00"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="showHeroCountdown"
                      checked={layout.showHeroCountdown}
                      onChange={(e) => setLayout({ ...layout, showHeroCountdown: e.target.checked })}
                      className="w-4 h-4 rounded border-ink text-brand-orange focus:ring-brand-orange"
                    />
                    <Label htmlFor="showHeroCountdown" className="cursor-pointer font-bold">
                      Tampilkan Countdown Timer di Hero Section
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Gambar Hero Lookbook</Label>
                    {layout.heroImage ? (
                      <div className="relative border-2 border-dashed border-ink/30 rounded-lg p-4 bg-muted/30 flex flex-col items-center gap-3">
                        <img
                          src={layout.heroImage}
                          alt="Hero Lookbook"
                          className="max-h-48 rounded object-cover border border-ink/20"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setLayout({ ...layout, heroImage: "" })}
                          className="text-xs uppercase tracking-wider font-bold animate-fade-in"
                        >
                          Hapus Foto
                        </Button>
                      </div>
                    ) : (
                      <div className="grid w-full items-center gap-1.5">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadHeroImage}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">
                          Pilih file gambar (PNG, JPG, WEBP). Kosongkan untuk menggunakan tampilan bawaan.
                        </p>
                      </div>
                    )}
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
          )}

          {activeTab === "featured" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
                <CardHeader>
                  <CardTitle className="display text-sm tracking-wider text-ink flex items-center gap-2">
                    <Tag className="w-4 h-4 text-brand-orange" /> Featured Collection
                  </CardTitle>
                  <CardDescription>Pilih produk yang ingin ditonjolkan di beranda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Slug Produk Unggulan (Pisahkan dengan koma)</Label>
                    <Input
                      value={layout.featuredProductSlugs}
                      onChange={(e) => setLayout({ ...layout, featuredProductSlugs: e.target.value })}
                      placeholder="varsity-filkom, hoodie-code-run, tshirt-debugging"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contoh slug: `varsity-filkom`, `hoodie-code-run`, dll. Lihat di daftar produk.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
                <CardHeader>
                  <CardTitle className="display text-sm tracking-wider text-ink flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-blue" /> Limited Drop Showcase
                  </CardTitle>
                  <CardDescription>Konfigurasi section countdown khusus pre-order / drop langka</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      type="checkbox"
                      id="showLimitedDrop"
                      checked={layout.showLimitedDrop}
                      onChange={(e) => setLayout({ ...layout, showLimitedDrop: e.target.checked })}
                      className="w-4 h-4 rounded border-ink text-brand-orange focus:ring-brand-orange"
                    />
                    <Label htmlFor="showLimitedDrop" className="cursor-pointer font-bold">
                      Aktifkan Section Limited Drop Showcase
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Judul Utama Drop</Label>
                    <Input
                      value={layout.limitedTitle}
                      onChange={(e) => setLayout({ ...layout, limitedTitle: e.target.value })}
                      placeholder="Varsity FILKOM Edition"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Deskripsi / Sub-judul Drop</Label>
                    <Textarea
                      value={layout.limitedSubtitle}
                      onChange={(e) => setLayout({ ...layout, limitedSubtitle: e.target.value })}
                      placeholder="Detail eksklusivitas drop barang ini..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Slug Produk (Tautan Detail)</Label>
                      <Input
                        value={layout.limitedProductSlug}
                        onChange={(e) => setLayout({ ...layout, limitedProductSlug: e.target.value })}
                        placeholder="varsity-filkom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Waktu Berakhir Countdown (ISO 8601)</Label>
                      <Input
                        value={layout.limitedCountdownEnd}
                        onChange={(e) => setLayout({ ...layout, limitedCountdownEnd: e.target.value })}
                        placeholder="YYYY-MM-DDTHH:MM:SS+07:00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Batas Maksimum Stok (Max Stock)</Label>
                      <Input
                        type="number"
                        value={layout.limitedStockMax}
                        onChange={(e) => setLayout({ ...layout, limitedStockMax: parseInt(e.target.value) || 100 })}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stok Terjual Saat Ini</Label>
                      <Input
                        type="number"
                        value={layout.limitedStockCurrent}
                        onChange={(e) => setLayout({ ...layout, limitedStockCurrent: parseInt(e.target.value) || 0 })}
                        placeholder="80"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Gambar Latar Belakang Limited Drop</Label>
                    {layout.limitedImage ? (
                      <div className="relative border-2 border-dashed border-ink/30 rounded-lg p-4 bg-muted/30 flex flex-col items-center gap-3">
                        <img
                          src={layout.limitedImage}
                          alt="Limited Drop"
                          className="max-h-48 rounded object-cover border border-ink/20"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setLayout({ ...layout, limitedImage: "" })}
                          className="text-xs uppercase tracking-wider font-bold cursor-pointer"
                        >
                          Hapus Foto
                        </Button>
                      </div>
                    ) : (
                      <div className="grid w-full items-center gap-1.5">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLimitedImage}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">
                          Unggah foto untuk limited drop. Kosongkan untuk menggunakan gambar default.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "why" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
                <CardHeader>
                  <CardTitle className="display text-sm tracking-wider text-ink flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-orange" /> Nilai Tambah / Mengapa Memilih Kami
                  </CardTitle>
                  <CardDescription>Sesuaikan 4 pilar alasan berbelanja di FILKOM Merchandise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Prop 1 */}
                  <div className="space-y-2 border-b border-border pb-4">
                    <Label className="font-bold text-brand-orange uppercase text-xs tracking-wider">Pilar 1 — Desain / Orisinalitas</Label>
                    <Input
                      value={layout.whyTitle1}
                      onChange={(e) => setLayout({ ...layout, whyTitle1: e.target.value })}
                      placeholder="Judul Pilar 1"
                      className="font-bold"
                    />
                    <Textarea
                      value={layout.whyDesc1}
                      onChange={(e) => setLayout({ ...layout, whyDesc1: e.target.value })}
                      placeholder="Keterangan singkat..."
                      rows={2}
                    />
                  </div>

                  {/* Prop 2 */}
                  <div className="space-y-2 border-b border-border pb-4">
                    <Label className="font-bold text-brand-orange uppercase text-xs tracking-wider">Pilar 2 — Bahan / Kualitas</Label>
                    <Input
                      value={layout.whyTitle2}
                      onChange={(e) => setLayout({ ...layout, whyTitle2: e.target.value })}
                      placeholder="Judul Pilar 2"
                      className="font-bold"
                    />
                    <Textarea
                      value={layout.whyDesc2}
                      onChange={(e) => setLayout({ ...layout, whyDesc2: e.target.value })}
                      placeholder="Keterangan singkat..."
                      rows={2}
                    />
                  </div>

                  {/* Prop 3 */}
                  <div className="space-y-2 border-b border-border pb-4">
                    <Label className="font-bold text-brand-orange uppercase text-xs tracking-wider">Pilar 3 — Pengiriman / Pickup</Label>
                    <Input
                      value={layout.whyTitle3}
                      onChange={(e) => setLayout({ ...layout, whyTitle3: e.target.value })}
                      placeholder="Judul Pilar 3"
                      className="font-bold"
                    />
                    <Textarea
                      value={layout.whyDesc3}
                      onChange={(e) => setLayout({ ...layout, whyDesc3: e.target.value })}
                      placeholder="Keterangan singkat..."
                      rows={2}
                    />
                  </div>

                  {/* Prop 4 */}
                  <div className="space-y-2">
                    <Label className="font-bold text-brand-orange uppercase text-xs tracking-wider">Pilar 4 — Keamanan / Pembayaran</Label>
                    <Input
                      value={layout.whyTitle4}
                      onChange={(e) => setLayout({ ...layout, whyTitle4: e.target.value })}
                      placeholder="Judul Pilar 4"
                      className="font-bold"
                    />
                    <Textarea
                      value={layout.whyDesc4}
                      onChange={(e) => setLayout({ ...layout, whyDesc4: e.target.value })}
                      placeholder="Keterangan singkat..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "faq" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
                <CardHeader>
                  <CardTitle className="display text-sm tracking-wider text-ink flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-brand-orange" /> Tanya Jawab (FAQ) Tanya Bara
                  </CardTitle>
                  <CardDescription>Sesuaikan daftar FAQ dan jawaban untuk Maskot Bara</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {layout.faqItems.map((item, index) => (
                    <div key={item.id} className="space-y-2 border-b border-border pb-4 relative">
                      <div className="flex justify-between items-center">
                        <Label className="font-semibold">FAQ #{index + 1}</Label>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => {
                            const newFaq = [...layout.faqItems];
                            newFaq.splice(index, 1);
                            setLayout({ ...layout, faqItems: newFaq });
                          }}
                        >
                          Hapus
                        </Button>
                      </div>
                      <Input
                        value={item.q}
                        onChange={(e) => {
                          const newFaq = [...layout.faqItems];
                          newFaq[index].q = e.target.value;
                          setLayout({ ...layout, faqItems: newFaq });
                        }}
                        placeholder="Pertanyaan"
                        className="font-bold"
                      />
                      <Textarea
                        value={item.a}
                        onChange={(e) => {
                          const newFaq = [...layout.faqItems];
                          newFaq[index].a = e.target.value;
                          setLayout({ ...layout, faqItems: newFaq });
                        }}
                        placeholder="Jawaban Bara"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full border-ink text-ink font-bold"
                    onClick={() => {
                      setLayout({
                        ...layout,
                        faqItems: [
                          ...layout.faqItems,
                          { id: Date.now().toString(), q: "", a: "" }
                        ]
                      });
                    }}
                  >
                    + Tambah Pertanyaan
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Live Preview / Browser Mockup Panel (5 cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-4 space-y-4">
            <h2 className="display text-xs tracking-widest text-muted-foreground uppercase font-bold flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" /> Pratinjau Halaman Beranda (Real-time)
            </h2>

            {/* Browser Mockup Frame */}
            <div className="w-full border-4 border-ink rounded-lg shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] bg-background flex flex-col h-[750px] overflow-hidden">
              {/* Browser Window Header */}
              <div className="bg-ink text-cream h-9 px-4 flex items-center justify-between border-b-2 border-ink shrink-0 select-none">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <div className="bg-white/10 text-cream/70 text-[9px] px-6 py-0.5 rounded font-mono truncate max-w-[200px]">
                  filkommerch.com
                </div>
                <div className="w-8" />
              </div>

              {/* Scrollable Browser Body */}
              <div className="flex-1 overflow-y-auto bg-background text-foreground text-left text-[11px] selection:bg-brand-orange">
                
                {/* 1. Announcement Bar */}
                <div className="bg-ink text-cream py-1 px-3 text-[8px] tracking-wider text-center font-bold border-b border-ink/20 truncate">
                  {layout.marqueeText.split("|")[0]?.trim() || "OFFICIAL FILKOM MERCHANDISE"} ✦ {layout.marqueeText.split("|")[1]?.trim() || "FREE ONGKIR"}
                </div>

                {/* Navbar mockup */}
                <div className="bg-background border-b border-ink/10 px-3 py-2 flex items-center justify-between h-10 select-none shrink-0">
                  <div className="flex items-center gap-1.5 font-bold text-[10px] text-ink uppercase">
                    <span className="w-4 h-4 bg-ink rounded-full" /> FILKOM MERCH
                  </div>
                  <div className="flex gap-2 text-[8px] font-bold text-muted-foreground">
                    <span>BERANDA</span>
                    <span>PRODUK</span>
                    <span>PRE-ORDER</span>
                  </div>
                </div>

                {/* 2. Hero Section */}
                <div className="bg-cream border-b border-ink/20 p-4 relative grid grid-cols-12 gap-3 items-center min-h-[160px]">
                  <div className="col-span-8 space-y-2">
                    <div className="text-[7px] text-brand-orange font-bold uppercase tracking-wider">
                      {layout.heroSubLabel || "SUB LABEL"}
                    </div>
                    <h3 className="display text-lg sm:text-xl text-ink leading-tight font-extrabold uppercase whitespace-pre-line">
                      {layout.heroTitle || "Wear Your Faculty."}
                    </h3>
                    <p className="text-[8px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {layout.heroSubtitle}
                    </p>
                    
                    {layout.showHeroCountdown && (
                      <div className="bg-white/90 border border-ink/10 px-1.5 py-0.5 rounded font-mono text-[7px] text-brand-orange w-fit font-bold">
                        ⏱ Countdown target: {layout.heroCountdownEnd.slice(0, 10)}
                      </div>
                    )}
                    
                    <button className="bg-ink text-cream font-bold text-[7px] tracking-widest px-2.5 py-1 uppercase rounded-sm mt-1">
                      {layout.heroBtnText}
                    </button>
                  </div>
                  <div className="col-span-4 bg-brand-blue/20 aspect-[4/5] rounded border border-ink/10 flex items-center justify-center relative overflow-hidden h-full">
                    {layout.heroImage ? (
                      <img src={layout.heroImage} className="w-full h-full object-cover opacity-80" alt="" />
                    ) : (
                      <span className="text-[7px] text-muted-foreground font-mono">Lookbook</span>
                    )}
                  </div>
                </div>

                {/* 3. Featured Collection Section */}
                <div className="p-4 border-b border-ink/10 space-y-3 bg-background">
                  <div className="text-center">
                    <div className="text-[6px] tracking-widest font-extrabold text-brand-orange">RECOMMENDED BY BEM</div>
                    <h4 className="display text-xs text-ink font-bold">Featured Collection</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {layout.featuredProductSlugs.split(",").slice(0, 3).map((slug, idx) => (
                      <div key={idx} className="border border-ink/15 bg-cream p-1.5 rounded flex flex-col justify-between aspect-[3/4]">
                        <div className="bg-neutral-200 aspect-square rounded shrink-0 flex items-center justify-center text-[7px] text-muted-foreground select-none font-bold uppercase truncate px-0.5">
                          {slug.trim() || `Item ${idx+1}`}
                        </div>
                        <div className="text-[6px] font-bold truncate mt-1 text-ink">
                          {slug.trim().split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Artikel"}
                        </div>
                        <div className="text-[6px] font-extrabold text-brand-orange">Rp 150.000</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Categories Section */}
                <div className="p-4 border-b border-ink/10 bg-cream space-y-2">
                  <div className="text-[6px] tracking-widest text-muted-foreground uppercase font-bold">02 — CATEGORIES</div>
                  <h4 className="display text-xs text-ink font-bold">Pick your fit</h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["JACKETS", "HOODIES", "TEES", "ACC"].map((cat, idx) => (
                      <div key={idx} className="bg-ink text-cream aspect-square rounded flex flex-col items-center justify-center p-1 relative border border-ink">
                        <span className="text-[7px] font-bold text-center leading-none">{cat}</span>
                        <span className="text-[5px] text-cream/50 mt-0.5">Items</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Limited Drop Section */}
                {layout.showLimitedDrop && (
                  <div className="p-4 bg-ink text-cream border-b border-ink/20 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-8 space-y-2">
                      <div className="bg-brand-orange text-ink font-mono font-extrabold text-[5px] px-1.5 py-0.5 rounded w-fit uppercase">
                        LIMITED DROP BATCH
                      </div>
                      <h4 className="display text-xs text-cream font-bold truncate">
                        {layout.limitedTitle}
                      </h4>
                      <p className="text-[7px] text-cream/70 line-clamp-2 leading-relaxed">
                        {layout.limitedSubtitle}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[6px] font-bold">
                          <span className="text-brand-orange">CAMPING PROGRESS</span>
                          <span>{layout.limitedStockCurrent}/{layout.limitedStockMax} Pcs</span>
                        </div>
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-orange h-full"
                            style={{ width: `${(layout.limitedStockCurrent / layout.limitedStockMax) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[7px] text-cream/50 font-mono">
                        Countdown: {layout.limitedCountdownEnd.slice(0, 10)}
                      </div>
                    </div>
                    <div className="col-span-4 bg-white/5 aspect-[4/5] rounded border border-white/10 flex items-center justify-center relative overflow-hidden h-full">
                      {layout.limitedImage ? (
                        <img src={layout.limitedImage} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-[6px] text-cream/50 font-mono">Product</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. Why Choose Us Section */}
                <div className="p-4 bg-cream border-b border-ink/10 space-y-3">
                  <div className="text-center">
                    <div className="text-[6px] tracking-widest text-brand-orange font-bold">04 — VALUE PILARS</div>
                    <h4 className="display text-xs text-ink font-bold">Why Choose Us</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/60 p-2 rounded border border-ink/5 space-y-1">
                      <div className="text-[7px] font-bold text-ink">{layout.whyTitle1}</div>
                      <div className="text-[6px] text-muted-foreground line-clamp-2 leading-tight">{layout.whyDesc1}</div>
                    </div>
                    <div className="bg-white/60 p-2 rounded border border-ink/5 space-y-1">
                      <div className="text-[7px] font-bold text-ink">{layout.whyTitle2}</div>
                      <div className="text-[6px] text-muted-foreground line-clamp-2 leading-tight">{layout.whyDesc2}</div>
                    </div>
                    <div className="bg-white/60 p-2 rounded border border-ink/5 space-y-1">
                      <div className="text-[7px] font-bold text-ink">{layout.whyTitle3}</div>
                      <div className="text-[6px] text-muted-foreground line-clamp-2 leading-tight">{layout.whyDesc3}</div>
                    </div>
                    <div className="bg-white/60 p-2 rounded border border-ink/5 space-y-1">
                      <div className="text-[7px] font-bold text-ink">{layout.whyTitle4}</div>
                      <div className="text-[6px] text-muted-foreground line-clamp-2 leading-tight">{layout.whyDesc4}</div>
                    </div>
                  </div>
                </div>

                {/* 7. FAQ Section */}
                <div className="p-4 bg-background border-b border-ink/10 space-y-3">
                  <div className="text-center">
                    <div className="text-[6px] tracking-widest text-muted-foreground font-bold">05 — HELP CENTER</div>
                    <h4 className="display text-xs text-ink font-bold">Tanya Bara</h4>
                  </div>
                  <div className="space-y-1.5 text-[7px] font-bold text-ink">
                    {layout.faqItems.slice(0, 4).map((item, idx) => (
                      <div key={item.id} className="border border-ink/10 rounded p-1.5 bg-cream/30 space-y-1">
                        <div className="flex justify-between items-center text-brand-orange">
                          <span className="truncate">{item.q}</span>
                          <span>-</span>
                        </div>
                        <div className="text-[6px] text-muted-foreground font-medium leading-relaxed line-clamp-2">
                          {item.a}
                        </div>
                      </div>
                    ))}
                    {layout.faqItems.length > 4 && (
                      <div className="text-[6px] text-center text-muted-foreground pt-1 italic">
                        + {layout.faqItems.length - 4} pertanyaan lainnya
                      </div>
                    )}
                  </div>
                </div>

                {/* 8. Footer Section */}
                <div className="bg-ink text-cream p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[9px]">FILKOM MERCH UB</span>
                    <span className="text-[6px] text-cream/50">Made in Malang</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center opacity-60 text-[6px] font-bold font-mono">
                    <span>💳 MIDTRANS SECURED</span>
                    <span>✓ OFFICIAL MERCHANDISE</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

