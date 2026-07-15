import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import logo from "@/assets/logo-fm.jpg";
import logoFmRemoveBg from "@/assets/logo_fm_removebg.png";
import logoFilkom from "@/assets/logo_filkom.png";
import logoSge from "@/assets/logo_sge.png";
import logoCe from "@/assets/CE.png";

export function Footer() {
  return (
    <footer className="bg-background border-t-2 border-ink text-ink">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-12 lg:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Brand Info & Logos */}
        <div className="lg:col-span-4 space-y-4">
          {/* Side-by-side logos: FILKOM UB, SGE FILKOM, Creative Enterprise, Filkom Merch */}
          <div className="flex flex-wrap items-center gap-3">
            <img src={logoFilkom} alt="FILKOM UB logo" className="h-9 w-auto object-contain" />
            <img src={logoSge} alt="SGE FILKOM logo" className="h-9 w-auto object-contain" />
            <img src={logoCe} alt="Creative Enterprise logo" className="h-9 w-auto object-contain" />
            <img
              src={logoFmRemoveBg}
              alt="Filkom Merch logo"
              className="h-9 w-auto object-contain"
            />
          </div>

          <div className="space-y-1">
            <span className="display text-lg text-ink font-bold block">Filkom Merch</span>
            <span className="text-[10px] font-black tracking-widest text-brand-orange uppercase block">
              FILKOM Merch oleh Creative Enterprise Ministry SGE FILKOM 2026
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-sm">
            Official store merchandise resmi mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya. Dikelola oleh Creative Enterprise Ministry SGE FILKOM 2026.
          </p>

          {/* Social Media Links */}
          <div className="pt-1">
            <div className="text-[10px] font-extrabold tracking-widest text-ink uppercase mb-2">
              FOLLOW KAMI
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://instagram.com/merchfilkomub"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ink/20 bg-secondary/60 hover:bg-ink hover:text-cream text-xs font-bold transition-all cursor-pointer"
              >
                <Instagram className="w-4 h-4 text-brand-orange shrink-0" />
                <span>@merchfilkomub</span>
              </a>
              <a
                href="https://tiktok.com/@filkommerch"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ink/20 bg-secondary/60 hover:bg-ink hover:text-cream text-xs font-bold transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-brand-orange shrink-0" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V6.84a8.16 8.16 0 0 0 4.76 1.5V4.89a4.85 4.85 0 0 1-1.00-.20z" />
                </svg>
                <span>@filkommerch</span>
              </a>
            </div>
          </div>
        </div>

        {/* Catalog Links (Hidden on smartphone < sm) */}
        <div className="hidden sm:block lg:col-span-3 space-y-3">
          <div className="text-xs font-extrabold tracking-[0.2em] text-ink uppercase">
            KATALOG PRODUK
          </div>
          <ul className="space-y-2 text-xs font-medium text-muted-foreground">
            <li>
              <Link to="/products" className="hover:text-brand-orange transition-colors">
                Semua Produk Merchandise
              </Link>
            </li>
            <li>
              <Link to="/pre-order" className="hover:text-brand-orange transition-colors font-bold text-brand-orange">
                Open Pre-Order Batch
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-brand-orange transition-colors">
                Varsity &amp; Outerwear
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-brand-orange transition-colors">
                Heavyweight Hoodies
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-brand-orange transition-colors">
                T-Shirts &amp; Oversized Tees
              </Link>
            </li>
            <li>
              <Link to="/products" className="hover:text-brand-orange transition-colors">
                Caps, Totebags &amp; Lanyards
              </Link>
            </li>
          </ul>
        </div>

        {/* Information & Navigation (Hidden on smartphone < sm) */}
        <div className="hidden sm:block lg:col-span-2 space-y-3">
          <div className="text-xs font-extrabold tracking-[0.2em] text-ink uppercase">
            NAVIGASI &amp; FAQ
          </div>
          <ul className="space-y-2 text-xs font-medium text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-brand-orange transition-colors">
                Beranda Utama
              </Link>
            </li>
            <li>
              <a href="/#about" className="hover:text-brand-orange transition-colors">
                Tentang Kami
              </a>
            </li>
            <li>
              <Link to="/faq" className="hover:text-brand-orange transition-colors">
                Pertanyaan Umum (FAQ)
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-brand-orange transition-colors">
                Pesanan Saya
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-brand-orange transition-colors">
                Sign In / Akun UB
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Support */}
        <div className="lg:col-span-3 space-y-3">
          <div className="text-xs font-extrabold tracking-[0.2em] text-ink uppercase">
            LOKASI &amp; WA SUPPORT
          </div>
          <ul className="space-y-2.5 text-xs text-muted-foreground">
            <li>
              <a
                href="https://wa.me/6282235526105?text=Halo%20Admin%20Aliya,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-brand-orange hover:font-bold transition-all text-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                Admin Aliya (Tanya Produk &amp; Ukuran)
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/6282287190402?text=Halo%20Admin%20Puty,%20saya%20ingin%20bertanya%20tentang%20produk%20Filkom%20Merch"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-brand-orange hover:font-bold transition-all text-xs"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                Admin Puty (Keluhan &amp; Custom Order)
              </a>
            </li>
            <li className="pt-1 text-[11px] text-muted-foreground leading-relaxed">
              📍 <strong className="text-ink">Pickup Point:</strong> FILKOM Merch, Gedung A FILKOM UB.
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border bg-secondary/30">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-4 flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <div>© 2026 FILKOM Merch oleh Creative Enterprise Ministry SGE FILKOM 2026.</div>
          <div>Official Merchandise Fakultas Ilmu Komputer Universitas Brawijaya.</div>
        </div>
      </div>
    </footer>
  );
}
