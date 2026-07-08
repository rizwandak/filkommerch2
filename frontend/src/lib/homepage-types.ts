export type ElementType =
  | "hero_banner"
  | "marquee"
  | "countdown"
  | "product_grid"
  | "category_showcase"
  | "image_banner"
  | "text_block"
  | "value_props"
  | "faq"
  | "limited_drop";

export type SegmentType = ElementType;

export interface SegmentElement {
  id: string;
  type: ElementType;
  config: any;
}

export interface HomepageSegment {
  id: string;
  title: string;
  enabled: boolean;
  elements: SegmentElement[];
}

export interface HeroBannerConfig {
  title: string;
  subtitle: string;
  subLabel: string;
  btnText: string;
  btnLink?: string;
  image: string;
  showCountdown: boolean;
  countdownEnd: string;
}

export interface MarqueeConfig {
  text: string;
}

export interface CountdownConfig {
  title: string;
  subtitle: string;
  targetDate: string;
  style: "minimal" | "full";
}

export interface ProductGridConfig {
  title: string;
  subtitle: string;
  source: "featured" | "best_seller" | "slugs" | "all";
  slugs: string;
  maxItems: number;
}

export interface CategoryShowcaseConfig {
  title: string;
}

export interface ImageBannerConfig {
  image: string;
  alt: string;
  link: string;
  height: string; // "sm", "md", "lg"
}

export interface TextBlockConfig {
  title: string;
  subtitle: string;
  body: string;
  alignment: "left" | "center" | "right";
}

export interface ValuePropsConfig {
  items: { title: string; description: string }[];
}

export interface FaqConfig {
  items: { id: string; q: string; a: string }[];
}

export interface LimitedDropConfig {
  title: string;
  subtitle: string;
  productSlug: string;
  image: string;
  countdownEnd: string;
  stockMax: number;
  stockCurrent: number;
}

function getTypeName(type: ElementType): string {
  switch (type) {
    case "hero_banner": return "Hero Banner";
    case "marquee": return "Marquee Text";
    case "countdown": return "Countdown";
    case "product_grid": return "Product Grid";
    case "category_showcase": return "Categories";
    case "image_banner": return "Image Banner";
    case "text_block": return "Text Block";
    case "value_props": return "Value Props";
    case "faq": return "FAQ Section";
    case "limited_drop": return "Limited Drop";
    default: return type;
  }
}

export function convertLegacyToSegments(legacy: any): HomepageSegment[] {
  if (Array.isArray(legacy) && legacy.length > 0 && "elements" in legacy[0]) {
    return legacy;
  }

  if (Array.isArray(legacy)) {
    return legacy.map((oldSeg: any) => ({
      id: oldSeg.id || `seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: getTypeName(oldSeg.type),
      enabled: oldSeg.enabled !== undefined ? oldSeg.enabled : true,
      elements: [
        {
          id: `el-${oldSeg.id}`,
          type: oldSeg.type,
          config: oldSeg.config || {}
        }
      ]
    }));
  }

  const legacyFlat = legacy || {};
  const segments: HomepageSegment[] = [];

  // Marquee
  if (legacyFlat.marqueeText) {
    segments.push({
      id: "seg-marquee",
      title: "Marquee Pengumuman",
      enabled: true,
      elements: [
        {
          id: "el-marquee",
          type: "marquee",
          config: { text: legacyFlat.marqueeText }
        }
      ]
    });
  }

  // Hero
  segments.push({
    id: "seg-hero",
    title: "Hero Banner Utama",
    enabled: true,
    elements: [
      {
        id: "el-hero",
        type: "hero_banner",
        config: {
          title: legacyFlat.heroTitle || "Wear\nYour\nFaculty.",
          subtitle: legacyFlat.heroSubtitle || "Koleksi merchandise resmi mahasiswa Fakultas Ilmu Komputer UB. Dibuat oleh mahasiswa, untuk mahasiswa premium, eksklusif, dan limited stock.",
          subLabel: legacyFlat.heroSubLabel || "FILKOM MERCH 2026",
          btnText: legacyFlat.heroBtnText || "SHOP THE DROP",
          btnLink: "",
          image: legacyFlat.heroImage || "",
          showCountdown: legacyFlat.showHeroCountdown !== undefined ? legacyFlat.showHeroCountdown : true,
          countdownEnd: legacyFlat.heroCountdownEnd || "2026-07-15T23:59:59+07:00"
        }
      }
    ]
  });

  // Featured
  segments.push({
    id: "seg-featured",
    title: "Koleksi Unggulan",
    enabled: true,
    elements: [
      {
        id: "el-featured",
        type: "product_grid",
        config: {
          title: "Featured Collection",
          subtitle: "RECOMMENDED BY BEM",
          source: "slugs",
          slugs: legacyFlat.featuredProductSlugs || "varsity-filkom,hoodie-code-run,tshirt-debugging",
          maxItems: 3
        }
      }
    ]
  });

  // Categories
  segments.push({
    id: "seg-categories",
    title: "Kategori Pilihan",
    enabled: true,
    elements: [
      {
        id: "el-categories",
        type: "category_showcase",
        config: {
          title: "Pick your fit"
        }
      }
    ]
  });

  // Limited Drop
  segments.push({
    id: "seg-limited",
    title: "Limited Drop Campaign",
    enabled: legacyFlat.showLimitedDrop !== undefined ? legacyFlat.showLimitedDrop : true,
    elements: [
      {
        id: "el-limited",
        type: "limited_drop",
        config: {
          title: legacyFlat.limitedTitle || "Varsity FILKOM Edition",
          subtitle: legacyFlat.limitedSubtitle || "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
          productSlug: legacyFlat.limitedProductSlug || "varsity-filkom",
          image: legacyFlat.limitedImage || "",
          countdownEnd: legacyFlat.limitedCountdownEnd || "2026-07-10T23:59:59+07:00",
          stockMax: legacyFlat.limitedStockMax || 100,
          stockCurrent: legacyFlat.limitedStockCurrent || 82
        }
      }
    ]
  });

  // Value Props
  segments.push({
    id: "seg-valueprops",
    title: "Pilar Nilai Kami",
    enabled: true,
    elements: [
      {
        id: "el-valueprops",
        type: "value_props",
        config: {
          items: [
            {
              title: legacyFlat.whyTitle1 || "Desain Orisinal",
              description: legacyFlat.whyDesc1 || "Setiap artikel dirancang eksklusif oleh mahasiswa FILKOM demi mewakili identitas kita."
            },
            {
              title: legacyFlat.whyTitle2 || "Kualitas Premium",
              description: legacyFlat.whyDesc2 || "Bahan cotton fleece tebal, sablon presisi tinggi, dan jahitan standar distro internasional."
            },
            {
              title: legacyFlat.whyTitle3 || "Bebas Ongkir Kampus",
              description: legacyFlat.whyDesc3 || "Pesan online, ambil langsung di Gazebo FILKOM UB tanpa biaya kirim sepeser pun."
            },
            {
              title: legacyFlat.whyTitle4 || "Pembayaran Instan",
              description: legacyFlat.whyDesc4 || "Mendukung pembayaran otomatis QRIS, ShopeePay, GoPay, dan transfer bank via Midtrans."
            }
          ]
        }
      }
    ]
  });

  // FAQ
  let faqItems = legacyFlat.faqItems || [];
  if (faqItems.length === 0) {
    if (legacyFlat.faqQ1) faqItems.push({ id: "q1", q: legacyFlat.faqQ1, a: legacyFlat.faqA1 || "" });
    if (legacyFlat.faqQ2) faqItems.push({ id: "q2", q: legacyFlat.faqQ2, a: legacyFlat.faqA2 || "" });
    if (legacyFlat.faqQ3) faqItems.push({ id: "q3", q: legacyFlat.faqQ3, a: legacyFlat.faqA3 || "" });
    if (legacyFlat.faqQ4) faqItems.push({ id: "q4", q: legacyFlat.faqQ4, a: legacyFlat.faqA4 || "" });
  }
  segments.push({
    id: "seg-faq",
    title: "Pertanyaan Umum (FAQ)",
    enabled: true,
    elements: [
      {
        id: "el-faq",
        type: "faq",
        config: {
          items: faqItems
        }
      }
    ]
  });

  return segments;
}

export function getDefaultSegments(): HomepageSegment[] {
  return [
    {
      id: "default-marquee",
      title: "Marquee Pengumuman",
      enabled: true,
      elements: [
        {
          id: "default-el-marquee",
          type: "marquee",
          config: {
            text: "OFFICIAL FILKOM UB MERCHANDISE | FREE ONGKIR KE FILKOM ★ | PRE-ORDER VARSITY '25 OPEN | 100% PRODUK MAHASISWA | CASHBACK 5% MEMBER | DROP BARU TIAP BULAN"
          }
        }
      ]
    },
    {
      id: "default-hero",
      title: "Hero Banner Utama",
      enabled: true,
      elements: [
        {
          id: "default-el-hero",
          type: "hero_banner",
          config: {
            title: "Wear\nYour\nFaculty.",
            subtitle: "Koleksi merchandise resmi mahasiswa Fakultas Ilmu Komputer UB. Dibuat oleh mahasiswa, untuk mahasiswa premium, eksklusif, dan limited stock.",
            subLabel: "FILKOM MERCH 2026",
            btnText: "SHOP THE DROP",
            btnLink: "",
            image: "",
            showCountdown: true,
            countdownEnd: "2026-07-15T23:59:59+07:00"
          }
        }
      ]
    },
    {
      id: "default-featured",
      title: "Koleksi Unggulan",
      enabled: true,
      elements: [
        {
          id: "default-el-featured",
          type: "product_grid",
          config: {
            title: "Featured Collection",
            subtitle: "RECOMMENDED BY BEM",
            source: "slugs",
            slugs: "varsity-filkom,hoodie-code-run,tshirt-debugging",
            maxItems: 3
          }
        }
      ]
    },
    {
      id: "default-categories",
      title: "Kategori Pilihan",
      enabled: true,
      elements: [
        {
          id: "default-el-categories",
          type: "category_showcase",
          config: {
            title: "Pick your fit"
          }
        }
      ]
    },
    {
      id: "default-limited",
      title: "Limited Drop Campaign",
      enabled: true,
      elements: [
        {
          id: "default-el-limited",
          type: "limited_drop",
          config: {
            title: "Varsity FILKOM Edition",
            subtitle: "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
            productSlug: "varsity-filkom",
            image: "",
            countdownEnd: "2026-07-10T23:59:59+07:00",
            stockMax: 100,
            stockCurrent: 82
          }
        }
      ]
    },
    {
      id: "default-valueprops",
      title: "Pilar Nilai Kami",
      enabled: true,
      elements: [
        {
          id: "default-el-valueprops",
          type: "value_props",
          config: {
            items: [
              {
                title: "Desain Orisinal",
                description: "Setiap artikel dirancang eksklusif oleh mahasiswa FILKOM demi mewakili identitas kita."
              },
              {
                title: "Kualitas Premium",
                description: "Bahan cotton fleece tebal, sablon presisi tinggi, dan jahitan standar distro internasional."
              },
              {
                title: "Bebas Ongkir Kampus",
                description: "Pesan online, ambil langsung di Gazebo FILKOM UB tanpa biaya kirim sepeser pun."
              },
              {
                title: "Pembayaran Instan",
                description: "Mendukung pembayaran otomatis QRIS, ShopeePay, GoPay, dan transfer bank via Midtrans."
              }
            ]
          }
        }
      ]
    },
    {
      id: "default-faq",
      title: "Pertanyaan Umum (FAQ)",
      enabled: true,
      elements: [
        {
          id: "default-el-faq",
          type: "faq",
          config: {
            items: [
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
              }
            ]
          }
        }
      ]
    }
  ];
}

export function extractLegacyConfigFromSegments(input: any): any {
  let segments: HomepageSegment[] = [];
  if (Array.isArray(input)) {
    if (input.length > 0 && !("elements" in input[0])) {
      segments = convertLegacyToSegments(input);
    } else {
      segments = input;
    }
  } else if (input && typeof input === "object") {
    if (!("type" in input) && "heroTitle" in input) {
      return input;
    }
    segments = convertLegacyToSegments(input);
  } else {
    segments = getDefaultSegments();
  }

  const legacy: any = {};

  const allElements: { type: ElementType; config: any; enabled: boolean }[] = [];
  segments.forEach(seg => {
    if (seg.enabled && seg.elements) {
      seg.elements.forEach(el => {
        allElements.push({ type: el.type, config: el.config, enabled: seg.enabled });
      });
    }
  });

  const marquee = allElements.find(e => e.type === "marquee");
  if (marquee) {
    legacy.marqueeText = marquee.config?.text;
  }

  const hero = allElements.find(e => e.type === "hero_banner");
  if (hero) {
    legacy.heroTitle = hero.config?.title;
    legacy.heroSubtitle = hero.config?.subtitle;
    legacy.heroSubLabel = hero.config?.subLabel;
    legacy.heroBtnText = hero.config?.btnText;
    legacy.heroImage = hero.config?.image;
    legacy.showHeroCountdown = hero.config?.showCountdown;
    legacy.heroCountdownEnd = hero.config?.countdownEnd;
  }

  const grid = allElements.find(e => e.type === "product_grid");
  if (grid) {
    legacy.featuredProductSlugs = grid.config?.slugs;
  }

  const limited = allElements.find(e => e.type === "limited_drop");
  if (limited) {
    legacy.limitedTitle = limited.config?.title;
    legacy.limitedSubtitle = limited.config?.subtitle;
    legacy.limitedProductSlug = limited.config?.productSlug;
    legacy.limitedImage = limited.config?.image;
    legacy.limitedCountdownEnd = limited.config?.countdownEnd;
    legacy.limitedStockMax = limited.config?.stockMax;
    legacy.limitedStockCurrent = limited.config?.stockCurrent;
    legacy.showLimitedDrop = limited.enabled;
  }

  const valueProps = allElements.find(e => e.type === "value_props");
  if (valueProps && valueProps.config?.items) {
    const items = valueProps.config.items;
    if (items[0]) {
      legacy.whyTitle1 = items[0].title;
      legacy.whyDesc1 = items[0].description;
    }
    if (items[1]) {
      legacy.whyTitle2 = items[1].title;
      legacy.whyDesc2 = items[1].description;
    }
    if (items[2]) {
      legacy.whyTitle3 = items[2].title;
      legacy.whyDesc3 = items[2].description;
    }
    if (items[3]) {
      legacy.whyTitle4 = items[3].title;
      legacy.whyDesc4 = items[3].description;
    }
  }

  const faq = allElements.find(e => e.type === "faq");
  if (faq) {
    legacy.faqItems = faq.config?.items;
  }

  return legacy;
}
