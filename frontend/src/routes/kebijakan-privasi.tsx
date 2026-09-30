import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  ShieldCheck,
  Lock,
  Mail,
  UserCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Printer,
  ChevronRight,
  Database,
  EyeOff,
  UserX,
  History,
  Building2,
  PhoneCall,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/kebijakan-privasi")({
  head: () => ({
    meta: [
      { title: "Kebijakan Privasi — FILKOM Merch UB" },
      {
        name: "description",
        content:
          "Kebijakan Privasi resmi FILKOM Merch (https://filkommerch.com). Ketentuan perlindungan data pribadi dan penggunaan Google OAuth untuk layanan merchandise resmi FILKOM UB.",
      },
      {
        name: "robots",
        content: "index, follow",
      },
    ],
  }),
  component: KebijakanPrivasiPage,
});

function KebijakanPrivasiPage() {
  const handlePrint = () => {
    window.print();
  };

  const sections = [
    { id: "informasi-dikumpulkan", label: "1. Informasi yang Kami Kumpulkan" },
    { id: "penggunaan-informasi", label: "2. Penggunaan Informasi Anda" },
    { id: "pembagian-data", label: "3. Pembagian Data Pihak Ketiga" },
    { id: "keamanan-data", label: "4. Keamanan Data & HTTPS" },
    { id: "penghapusan-data", label: "5. Penghapusan Data Pengguna" },
    { id: "perubahan-kebijakan", label: "6. Perubahan Kebijakan Privasi" },
    { id: "kontak-dukungan", label: "7. Kontak & Entitas Pengelola" },
  ];

  return (
    <div className="min-h-screen bg-[#FCFAF7] dark:bg-background text-ink font-sans flex flex-col selection:bg-brand-orange selection:text-cream">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6"
        >
          <Link to="/" className="hover:text-brand-orange transition-colors">
            Beranda
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="text-ink dark:text-foreground">Kebijakan Privasi</span>
        </nav>

        {/* Hero Header Card */}
        <div className="bg-white dark:bg-card border-3 sm:border-4 border-ink rounded-2xl p-6 sm:p-10 shadow-[6px_6px_0px_0px_rgba(27,27,27,1)] relative overflow-hidden mb-8 sm:mb-12">
          {/* Decorative accent element */}
          <div className="absolute top-0 right-0 w-32 sm:w-48 h-32 sm:h-48 bg-brand-orange/10 rounded-bl-full pointer-events-none -mr-6 -mt-6" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-orange text-cream border-2 border-ink text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]">
              <ShieldCheck className="w-4 h-4" />
              Perlindungan Data &amp; Privasi Pengguna
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-ink dark:text-foreground leading-tight">
              Kebijakan Privasi <br className="hidden sm:inline" />
              <span className="text-brand-orange">FILKOM Merch</span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
              Selamat datang di <strong className="text-ink dark:text-foreground">FILKOM Merch</strong> (
              <a
                href="https://filkommerch.com"
                target="_blank"
                rel="noreferrer"
                className="text-brand-blue dark:text-blue-400 underline font-semibold hover:text-brand-orange"
              >
                https://filkommerch.com
              </a>
              ). Kami sangat menghargai privasi Anda dan berkomitmen untuk melindungi Data Pribadi Anda.
              Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi
              informasi Anda saat Anda menggunakan layanan kami, termasuk saat masuk menggunakan akun
              Google Anda (Google OAuth).
            </p>

            {/* Metadata Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cream/70 dark:bg-secondary rounded-lg border border-ink/30 text-ink dark:text-foreground">
                <History className="w-3.5 h-3.5 text-brand-orange" />
                Terakhir Diperbarui: 30 September 2026
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Status: Berlaku &amp; Terverifikasi
              </span>
              <button
                type="button"
                onClick={handlePrint}
                className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ink text-cream hover:bg-brand-orange transition-colors rounded-lg border border-ink text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] active:translate-y-0.5 active:shadow-none"
                title="Cetak atau simpan halaman ini"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Dokumen
              </button>
            </div>
          </div>
        </div>

        {/* Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-card border-2 border-ink p-4 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-orange/15 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm uppercase tracking-tight text-ink dark:text-foreground">
              Profil Dasar Saja
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hanya mengakses Nama Lengkap, Email, dan Foto Profil dari akun Google Anda.
            </p>
          </div>

          <div className="bg-white dark:bg-card border-2 border-ink p-4 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm uppercase tracking-tight text-ink dark:text-foreground">
              Zero Data Sensitif
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              TIDAK pernah meminta password Google, data kontak, ataupun berkas Google Drive.
            </p>
          </div>

          <div className="bg-white dark:bg-card border-2 border-ink p-4 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-blue/15 border border-brand-blue/40 flex items-center justify-center text-brand-blue dark:text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm uppercase tracking-tight text-ink dark:text-foreground">
              Enkripsi Standar HTTPS
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Semua komunikasi dan penyimpanan data terproteksi dengan protokol enkripsi modern.
            </p>
          </div>

          <div className="bg-white dark:bg-card border-2 border-ink p-4 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex flex-col gap-2">
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <UserX className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm uppercase tracking-tight text-ink dark:text-foreground">
              Hak Hapus Data
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda berhak penuh meminta penghapusan akun dan data Google OAuth kapan saja.
            </p>
          </div>
        </div>

        {/* 2-Columns Layout: Sidebar & Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Table of Contents & Quick Contact (Sticky) */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white dark:bg-card border-2 border-ink rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <FileText className="w-4 h-4 text-brand-orange" />
                <h2 className="font-black text-xs uppercase tracking-wider text-ink dark:text-foreground">
                  Daftar Isi Kebijakan
                </h2>
              </div>
              <ul className="space-y-1.5 text-xs font-bold">
                {sections.map((sec) => (
                  <li key={sec.id}>
                    <a
                      href={`#${sec.id}`}
                      className="block p-2 rounded-lg text-muted-foreground hover:text-ink dark:hover:text-foreground hover:bg-cream/60 dark:hover:bg-secondary/60 transition-colors"
                    >
                      {sec.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Contact Box */}
            <div className="bg-brand-orange text-cream border-2 border-ink rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-cream" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  Butuh Bantuan Privasi?
                </h3>
              </div>
              <p className="text-xs text-cream/90 font-medium leading-relaxed">
                Ingin mengajukan penghapusan akun atau punya pertanyaan seputar data Anda? Hubungi email resmi kami:
              </p>
              <a
                href="mailto:rizwandakeysha@student.ub.ac.id?subject=Pertanyaan%20Kebijakan%20Privasi%20FILKOM%20Merch"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-white text-ink font-black text-xs uppercase tracking-wider rounded-lg border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-cream transition-all active:translate-y-0.5 active:shadow-none"
              >
                <span>rizwandakeysha@student.ub.ac.id</span>
              </a>
            </div>

            {/* Trust Guarantee Box */}
            <div className="border-2 border-ink bg-white dark:bg-card p-5 rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-2 text-xs">
              <div className="font-black uppercase tracking-wider flex items-center gap-2 text-ink dark:text-foreground">
                <Building2 className="w-4 h-4 text-brand-orange" />
                Dikelola Resmi Oleh
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Creative Enterprise Ministry SGE FILKOM UB 2026. Beroperasi di bawah naungan Fakultas Ilmu Komputer Universitas Brawijaya.
              </p>
            </div>
          </aside>

          {/* Right Column: Detailed Clauses */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1 */}
            <section
              id="informasi-dikumpulkan"
              className="bg-white dark:bg-card border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink text-cream font-black text-sm flex items-center justify-center shrink-0">
                  1
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink dark:text-foreground">
                  Informasi yang Kami Kumpulkan
                </h2>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Saat Anda menggunakan fitur <strong>&quot;Login dengan Google&quot;</strong> di website kami, kami meminta akses ke informasi profil dasar Anda melalui Google OAuth API. Informasi yang kami kumpulkan meliputi:
              </p>

              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-lg border-2 border-ink/20 bg-cream/30 dark:bg-secondary/40 flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-orange mt-1.5 shrink-0" />
                  <div>
                    <h3 className="font-black text-sm text-ink dark:text-foreground">Nama Lengkap</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Digunakan untuk menampilkan profil dan mempersonalisasi layanan di akun Anda.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border-2 border-ink/20 bg-cream/30 dark:bg-secondary/40 flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                  <div>
                    <h3 className="font-black text-sm text-ink dark:text-foreground">Alamat Email</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sebagai identifikasi unik akun Anda, keperluan verifikasi transaksi, serta pengiriman notifikasi terkait pesanan merchandise Anda.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border-2 border-ink/20 bg-cream/30 dark:bg-secondary/40 flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <h3 className="font-black text-sm text-ink dark:text-foreground">Foto Profil (Opsional)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Untuk ditampilkan pada avatar dan halaman dasbor akun pengguna Anda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Crucial Negative Scope Warning (Google Verification Compliance) */}
              <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-medium leading-relaxed flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-black uppercase tracking-wider block text-emerald-950 dark:text-emerald-100 mb-1">
                    Jaminan Non-Akses Data Sensitif:
                  </strong>
                  Kami <strong>TIDAK</strong> meminta atau mengakses data sensitif lainnya seperti kata sandi (password) Google Anda, kontak pribadi, file atau dokumen di Google Drive Anda, maupun hak akses akun Google lainnya.
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section
              id="penggunaan-informasi"
              className="bg-white dark:bg-card border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink text-cream font-black text-sm flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink dark:text-foreground">
                  Bagaimana Kami Menggunakan Informasi Anda
                </h2>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Informasi yang kami peroleh dari Google Account Anda hanya digunakan untuk keperluan internal layanan FILKOM Merch, antara lain:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="p-4 border-2 border-ink/20 rounded-xl bg-background space-y-1.5">
                  <div className="flex items-center gap-2 text-brand-orange font-black text-xs uppercase tracking-wider">
                    <UserCheck className="w-4 h-4" />
                    Manajemen Akun
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Menyediakan, mengoperasikan, dan mengelola akun pengguna Anda di platform FILKOM Merch.
                  </p>
                </div>

                <div className="p-4 border-2 border-ink/20 rounded-xl bg-background space-y-1.5">
                  <div className="flex items-center gap-2 text-brand-blue font-black text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    Pemrosesan Pesanan
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Memproses transaksi pemesanan merchandise, verifikasi status pembayaran, dan penerbitan bukti invoice.
                  </p>
                </div>

                <div className="p-4 border-2 border-ink/20 rounded-xl bg-background space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider">
                    <Mail className="w-4 h-4" />
                    Komunikasi &amp; Update
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Berkomunikasi dengan Anda mengenai pembaruan status pesanan, jadwal pengambilan barang, atau kendala teknis.
                  </p>
                </div>

                <div className="p-4 border-2 border-ink/20 rounded-xl bg-background space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-600 font-black text-xs uppercase tracking-wider">
                    <Lock className="w-4 h-4" />
                    Keamanan &amp; Anti-Penipuan
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Mencegah aktivitas penipuan, duplikasi akun tidak sah, serta menjaga keamanan integritas platform kami.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section
              id="pembagian-data"
              className="bg-white dark:bg-card border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink text-cream font-black text-sm flex items-center justify-center shrink-0">
                  3
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink dark:text-foreground">
                  Pembagian Data dengan Pihak Ketiga
                </h2>
              </div>

              <div className="p-4 sm:p-5 rounded-xl border-2 border-ink bg-brand-orange/5 space-y-3">
                <p className="text-sm font-semibold text-ink dark:text-foreground leading-relaxed">
                  Kami berkomitmen untuk <strong>tidak menjual, memperjualbelikan, menyewakan, atau membagikan</strong> data pribadi yang diperoleh dari Google OAuth kepada pihak ketiga mana pun untuk tujuan pemasaran atau iklan, kecuali jika diwajibkan oleh hukum yang berlaku.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold">
                  <span className="px-2.5 py-1 rounded bg-white dark:bg-card border border-ink/30 text-ink dark:text-foreground">
                    🚫 Tidak Ada Penjualan Data
                  </span>
                  <span className="px-2.5 py-1 rounded bg-white dark:bg-card border border-ink/30 text-ink dark:text-foreground">
                    🚫 Tidak Ada Iklan Pihak Ketiga
                  </span>
                  <span className="px-2.5 py-1 rounded bg-white dark:bg-card border border-ink/30 text-ink dark:text-foreground">
                    ⚖️ Kepatuhan Regulasi Hukum
                  </span>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section
              id="keamanan-data"
              className="bg-white dark:bg-card border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink text-cream font-black text-sm flex items-center justify-center shrink-0">
                  4
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink dark:text-foreground">
                  Keamanan Data
                </h2>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami menerapkan langkah-langkah keamanan teknis dan organisasional yang sesuai untuk melindungi data pribadi Anda dari akses, perubahan, pengungkapan, atau penghancuran yang tidak sah. Data Anda disimpan dengan aman di server kami yang menggunakan protokol enkripsi standar industri (<strong>HTTPS</strong>).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 bg-cream/40 dark:bg-secondary/40 rounded-lg border border-ink/20">
                  <strong className="block font-black text-ink dark:text-foreground mb-1">
                    🔒 Protokol HTTPS
                  </strong>
                  Semua lalu lintas data antara peramban Anda dan server dienkripsi dengan sertifikat SSL/TLS.
                </div>
                <div className="p-3 bg-cream/40 dark:bg-secondary/40 rounded-lg border border-ink/20">
                  <strong className="block font-black text-ink dark:text-foreground mb-1">
                    🛡️ Proteksi Database
                  </strong>
                  Akses database internal dibatasi hanya untuk server resmi dengan autentikasi berjenjang.
                </div>
                <div className="p-3 bg-cream/40 dark:bg-secondary/40 rounded-lg border border-ink/20">
                  <strong className="block font-black text-ink dark:text-foreground mb-1">
                    👥 Otorisasi Terbatas
                  </strong>
                  Hanya staf administrator resmi FILKOM Merch yang memiliki akses administratif terbatas.
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section
              id="penghapusan-data"
              className="bg-white dark:bg-card border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink text-cream font-black text-sm flex items-center justify-center shrink-0">
                  5
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink dark:text-foreground">
                  Penghapusan Data Pengguna
                </h2>
              </div>

              <div className="p-4 sm:p-6 rounded-xl border-2 border-brand-orange bg-brand-orange/5 space-y-4">
                <p className="text-sm font-medium text-ink dark:text-foreground leading-relaxed">
                  Anda memiliki hak penuh atas data Anda. Jika di kemudian hari Anda ingin menghapus akun dan seluruh data yang terhubung dengan Google OAuth di FILKOM Merch, Anda dapat menghubungi kami melalui email dukungan pelanggan kami di:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a
                    href="mailto:rizwandakeysha@student.ub.ac.id?subject=Permintaan%20Penghapusan%20Data%20Akun%20FILKOM%20Merch&body=Halo%20Tim%20FILKOM%20Merch,%0A%0ASaya%20ingin%20mengajukan%20penghapusan%20akun%20dan%20seluruh%20data%20pribadi%20saya%20yang%20terhubung%20dengan%20Google%20OAuth%20di%20FILKOM%20Merch.%0A%0AEmail%20Akun:%20%0ANama%20Lengkap:%20%0A%0ATerima%20kasih."
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-brand-orange text-cream font-black text-xs uppercase tracking-wider rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:bg-brand-orange/90 transition-all active:translate-y-0.5 active:shadow-none"
                  >
                    <Mail className="w-4 h-4" />
                    <span>rizwandakeysha@student.ub.ac.id</span>
                  </a>

                  <span className="text-xs text-muted-foreground font-medium text-center sm:text-left">
                    Sertakan email Google UB yang terdaftar pada subjek pesan.
                  </span>
                </div>

                <div className="pt-2 border-t border-ink/10 text-xs text-muted-foreground space-y-1">
                  <strong className="text-ink dark:text-foreground block font-bold">Proses Penghapusan Data:</strong>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Tim kami akan memverifikasi kepemilikan akun dalam 1–3 hari kerja.</li>
                    <li>Setelah verifikasi berhasil, seluruh riwayat sesi OAuth dan profil akan dihapus secara permanen dari basis data aktif kami.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section
              id="perubahan-kebijakan"
              className="bg-white dark:bg-card border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-4"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink text-cream font-black text-sm flex items-center justify-center shrink-0">
                  6
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink dark:text-foreground">
                  Perubahan pada Kebijakan Privasi Ini
                </h2>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu seiring dengan pengembangan fitur baru atau penyesuaian regulasi hukum yang berlaku. Setiap perubahan akan dipublikasikan di halaman ini dengan memperbarui tanggal <strong>&quot;Terakhir Diperbarui&quot;</strong> di bagian atas.
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kami menganjurkan Anda untuk meninjau halaman ini secara berkala guna mengetahui informasi terbaru mengenai perlindungan privasi Anda di FILKOM Merch.
              </p>
            </section>

            {/* Section 7 */}
            <section
              id="kontak-dukungan"
              className="bg-white dark:bg-card border-2 border-ink rounded-xl p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-5"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-ink text-cream font-black text-sm flex items-center justify-center shrink-0">
                  7
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-ink dark:text-foreground">
                  Kontak &amp; Dukungan Pelanggan
                </h2>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Jika Anda memiliki pertanyaan, saran, atau kekhawatiran terkait Kebijakan Privasi ini maupun pengelolaan data Anda di platform kami, jangan ragu untuk menghubungi tim pengelola resmi kami:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl border-2 border-ink bg-cream/30 dark:bg-secondary/30 space-y-2">
                  <div className="font-black text-xs uppercase tracking-wider text-ink dark:text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-orange" />
                    Kantor Pengelola
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-bold text-ink dark:text-foreground">FILKOM Merch Official</p>
                    <p>Creative Enterprise Ministry SGE FILKOM UB 2026</p>
                    <p>Gedung A Fakultas Ilmu Komputer, Universitas Brawijaya</p>
                    <p>Jl. Veteran No. 8, Ketawanggede, Lowokwaru, Malang, Jawa Timur 65145</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border-2 border-ink bg-cream/30 dark:bg-secondary/30 space-y-2">
                  <div className="font-black text-xs uppercase tracking-wider text-ink dark:text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4 text-brand-orange" />
                    Kontak Resmi
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1.5">
                    <div>
                      <span className="font-bold text-ink dark:text-foreground block">Email Dukungan &amp; Privasi:</span>
                      <a
                        href="mailto:rizwandakeysha@student.ub.ac.id"
                        className="text-brand-blue hover:text-brand-orange underline font-semibold"
                      >
                        rizwandakeysha@student.ub.ac.id
                      </a>
                    </div>
                    <div>
                      <span className="font-bold text-ink dark:text-foreground block">Website Resmi:</span>
                      <a
                        href="https://filkommerch.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-blue hover:text-brand-orange underline font-semibold"
                      >
                        https://filkommerch.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Return Button */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-brand-orange transition-colors"
                >
                  &larr; Kembali ke Beranda
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-cream hover:bg-brand-orange rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] active:translate-y-0.5 active:shadow-none"
                >
                  Halaman Masuk / Login
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
