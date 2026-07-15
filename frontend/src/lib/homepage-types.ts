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
  | "limited_drop"
  | "bundle_recommendation"
  | "gallery"
  | "testimonial";

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
  images?: string[];
  showCountdown: boolean;
  countdownEnd: string;
  countdownLabel?: string;
  showLookbookBtn?: boolean;
  lookbookBtnText?: string;
  lookbookBtnLink?: string;
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
    case "bundle_recommendation": return "Bundle Recommendation";
    case "gallery": return "Lifestyle Gallery";
    case "testimonial": return "Testimonials";
    default: return type;
  }
}

export function convertLegacyToSegments(legacy: any): HomepageSegment[] {
  if (Array.isArray(legacy) && legacy.length > 0 && "elements" in legacy[0]) {
    return legacy.map((seg: any) => ({
      ...seg,
      elements: seg.elements?.map((el: any) => {
        if (el.type === "hero_banner" && el.config) {
          const images = el.config.images || (el.config.image ? [el.config.image] : []);
          return {
            ...el,
            config: {
              ...el.config,
              images,
            },
          };
        }
        return el;
      }) || [],
    }));
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
          images: legacyFlat.heroImages || (legacyFlat.heroImage ? [legacyFlat.heroImage] : []),
          showCountdown: legacyFlat.showHeroCountdown !== undefined ? legacyFlat.showHeroCountdown : true,
          countdownEnd: legacyFlat.heroCountdownEnd || "2026-07-15T23:59:59+07:00",
          countdownLabel: legacyFlat.heroCountdownLabel || "PRE-ORDER BATCH BERAKHIR DALAM:",
          showLookbookBtn: legacyFlat.showLookbookBtn !== undefined ? legacyFlat.showLookbookBtn : true,
          lookbookBtnText: legacyFlat.lookbookBtnText || "LOOKBOOK",
          lookbookBtnLink: legacyFlat.lookbookBtnLink || "#shop"
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
              description: legacyFlat.whyDesc3 || "Pesan online, ambil langsung di Toko FILKOM Merch tanpa biaya kirim sepeser pun."
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
            text: "🚚 Free Pickup FILKOM UB • Official Merchandise FILKOM UB • PO Batch 2 Open Until 5 August • Limited Stock"
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
            subtitle: "Koleksi merchandise resmi mahasiswa Fakultas Ilmu Komputer UB. Dibuat premium dan limited stock.",
            subLabel: "FILKOM MERCHANDISE 2026",
            btnText: "SHOP THE DROP",
            btnLink: "#shop",
            image: "",
            images: [],
            showCountdown: true,
            countdownEnd: "2026-08-05T23:59:59+07:00",
            countdownLabel: "PRE-ORDER BATCH BERAKHIR DALAM:",
            showLookbookBtn: true,
            lookbookBtnText: "LOOKBOOK",
            lookbookBtnLink: "#shop"
          }
        }
      ]
    },
    {
      id: "default-valueprops",
      title: "Trust Section",
      enabled: true,
      elements: [
        {
          id: "default-el-valueprops",
          type: "value_props",
          config: {
            items: [
              {
                title: "Official Merchandise",
                description: "Produk resmi berlisensi Fakultas Ilmu Komputer Universitas Brawijaya."
              },
              {
                title: "Premium Quality",
                description: "Material cotton combed & fleece pilihan dengan kualitas standar distro."
              },
              {
                title: "Limited Collection",
                description: "Hanya diproduksi terbatas di setiap batch. Tidak rilis ulang."
              },
              {
                title: "Student Designed",
                description: "Dirancang secara kolaboratif oleh talenta kreatif mahasiswa FILKOM."
              }
            ]
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
            subtitle: "CHOOSE YOUR LOOK",
            source: "slugs",
            slugs: "work-jacket,varsity-filkom,half-zip,tumbler-stainless,boneka-bara,tshirt-debugging",
            maxItems: 6
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
            title: "Shop By Categories"
          }
        }
      ]
    },
    {
      id: "default-about",
      title: "Tentang Kami (About FM)",
      enabled: true,
      elements: [
        {
          id: "default-el-about",
          type: "text_block",
          config: {
            title: "More than Merchandise.",
            subtitle: "ABOUT FILKOM MERCHANDISE",
            body: "FILKOM Merchandise (FM) adalah unit resmi merchandise Fakultas Ilmu Komputer Universitas Brawijaya yang dikelola secara profesional oleh mahasiswa. Kami bertekad menjadi wadah kreativitas dan kebanggaan civitas akademika dengan menghadirkan produk eksklusif berkualitas premium, sekaligus mendukung inovasi mahasiswa di lingkungan kampus.",
            alignment: "center"
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
            title: "Varsity Jacket",
            subtitle: "Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.",
            productSlug: "varsity-filkom",
            image: "",
            countdownEnd: "2026-08-05T23:59:59+07:00",
            stockMax: 100,
            stockCurrent: 70
          }
        }
      ]
    },
    {
      id: "default-bundle",
      title: "Rekomendasi Bundling",
      enabled: true,
      elements: [
        {
          id: "default-el-bundle",
          type: "bundle_recommendation",
          config: {
            title: "Exclusive Bundles",
            subtitle: "SPECIAL SAVINGS PACKS",
            items: [
              {
                name: "Freshman Starter Pack",
                price: "Rp 120.000",
                originalPrice: "Rp 145.000",
                image: "",
                description: "Paket lengkap maba untuk tampil keren di kampus baru.",
                itemsList: "Kaos Premium, Totebag Canvas, Sticker Pack",
                link: "/products"
              },
              {
                name: "Premium Varsity Bundle",
                price: "Rp 320.000",
                originalPrice: "Rp 370.000",
                image: "",
                description: "Kombinasi varsity eksklusif dan notebook untuk ngampus.",
                itemsList: "Varsity Jacket, Notebook Exclusive, Tumbler Stainless",
                link: "/products"
              }
            ]
          }
        }
      ]
    },
    {
      id: "default-why",
      title: "Value Proposition",
      enabled: true,
      elements: [
        {
          id: "default-el-why",
          type: "value_props",
          config: {
            items: [
              {
                title: "Designed by Students",
                description: "Setiap detail dirancang untuk merepresentasikan kehidupan perkuliahan di FILKOM."
              },
              {
                title: "Official Merchandise",
                description: "Satu-satunya penyedia merchandise berlisensi resmi di bawah BEM & Fakultas."
              },
              {
                title: "Premium Materials",
                description: "Jaminan bahan nyaman, awet, dan nyaman dipakai harian."
              },
              {
                title: "Support Innovation",
                description: "Seluruh hasil penjualan dialokasikan untuk mendukung kegiatan dan inovasi kemahasiswaan."
              }
            ]
          }
        }
      ]
    },
    {
      id: "default-gallery",
      title: "Lifestyle Gallery",
      enabled: true,
      elements: [
        {
          id: "default-el-gallery",
          type: "gallery",
          config: {
            title: "Campus Lookbook",
            subtitle: "@FILKOMMERCH",
            items: [
              { id: "g1", image: "", caption: "Varsity jacket di gazebo" },
              { id: "g2", image: "", caption: "Ngoding pake hoodie premium" },
              { id: "g3", image: "", caption: "Totebag praktis kuliah" },
              { id: "g4", image: "", caption: "Lifestyle kaos debugging" }
            ]
          }
        }
      ]
    },
    {
      id: "default-testimonial",
      title: "Testimonial Pelanggan",
      enabled: true,
      elements: [
        {
          id: "default-el-testimonial",
          type: "testimonial",
          config: {
            title: "Campus Voices",
            subtitle: "TESTIMONIALS",
            items: [
              {
                id: "t1",
                name: "Rizwan Dak",
                role: "Informatika 2024",
                content: "Varsity-nya tebal banget, bordirannya rapi pol. Nyaman buat dipake kuliah seharian di ruangan AC FILKOM."
              },
              {
                id: "t2",
                name: "Ahmad Jauhari",
                role: "Sistem Informasi 2023",
                content: "Desain kaos debugging-nya relate banget sama kehidupan anak IT. Bahan katun combed-nya adem dan ga gampang melar."
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
                q: "Apakah barang pre-order bisa dikirim ke luar kota?",
                a: "Bisa bro/sis! Kami menyediakan opsi pengiriman reguler J&T/JNE ke seluruh Indonesia selain opsi Ambil di Gazebo FILKOM UB."
              },
              {
                id: "po",
                q: "Berapa lama proses produksi Pre-Order?",
                a: "Proses produksi memakan waktu sekitar 14-21 hari kerja setelah sesi Pre-Order ditutup secara resmi."
              },
              {
                id: "pickup",
                q: "Bagaimana cara memilih ukuran yang pas (sizing)?",
                a: "Setiap halaman produk dilengkapi dengan Size Chart lengkap. Kami merekomendasikan mengukur kaos atau jaket Anda yang biasa dipakai lalu mencocokkannya."
              },
              {
                id: "refund",
                q: "Apakah bisa mengajukan pengembalian (refund)?",
                a: "Refund hanya diperbolehkan apabila terdapat kesalahan pengiriman produk atau cacat produksi major dari vendor kami."
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
    legacy.heroImages = hero.config?.images || [];
    legacy.showHeroCountdown = hero.config?.showCountdown;
    legacy.heroCountdownEnd = hero.config?.countdownEnd;
    legacy.heroCountdownLabel = hero.config?.countdownLabel;
    legacy.showLookbookBtn = hero.config?.showLookbookBtn;
    legacy.lookbookBtnText = hero.config?.lookbookBtnText;
    legacy.lookbookBtnLink = hero.config?.lookbookBtnLink;
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
