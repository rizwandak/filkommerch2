import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HackerModeToggle } from "@/components/HackerModeToggle";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ShoppingBag,
  ArrowLeft,
  Star,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Share2,
  Minus,
  Plus,
  MessageSquare,
  LogOut,
  User,
  Trash2,
  Menu,
  ArrowRight,
  Search,
  X,
  User as UserIcon,
  LayoutDashboard,
  MonitorSmartphone,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getProductBySlug, getProducts, getProductReviewsServerAction, getActivePreOrderCampaignServerAction } from "@backend/server-actions";
import { isPreOrderOpen } from "@/lib/pre-order-utils";
import { Button } from "@frontend/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import pVarsity from "@/assets/p-varsity.jpg";
import pHoodie from "@/assets/p-hoodie.jpg";
import pTshirt from "@/assets/p-tshirt.jpg";
import pTee2 from "@/assets/p-tee2.jpg";
import { resolveImageUrl } from "@/lib/image-resolver";

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
};

const maskReviewerName = (name: string): string => {
  if (!name) return "***";
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words
    .map((word) => {
      if (!word) return "";
      return word[0] + "*".repeat(Math.max(1, word.length - 1));
    })
    .join(" ");
};

const formatSizeVariant = (variant?: string): string => {
  if (!variant) return "";
  const parts = variant.split("/").map((p) => p.trim());
  const cleanParts = parts.filter(
    (p) => !/^(dp|lunas|dp\s*\d*%?)$/i.test(p)
  );
  return cleanParts.join(" / ");
};


const NAV = [
  { label: "BERANDA", href: "/", isScroll: true, target: "top" },
  { label: "PRODUK", href: "/products" },
  { label: "PRE-ORDER", href: "/pre-order" },
  { label: "TENTANG KAMI", href: "/#about", isScroll: true, target: "about" },
  { label: "FAQ", href: "/faq" },
];

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const [result, productsRes] = await Promise.all([
      getProductBySlug({ data: params.slug }),
      getProducts().catch(() => ({ products: [] })),
    ]);
    return {
      product: result.product || null,
      error: result.error || null,
      allProducts: productsRes?.products || [],
    };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.product
      ? `${loaderData.product.name} — FILKOM Merch`
      : "Detail Produk — FILKOM Merch";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: loaderData?.product?.description || "Detail Produk Merchandise FILKOM UB",
        },
      ],
    };
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { product, error, allProducts = [] } = Route.useLoaderData();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const relatedProducts = useMemo(() => {
    if (!product || !allProducts || allProducts.length === 0) return [];
    
    const otherProducts = allProducts.filter((p: any) => p.id !== product.id && p.slug !== product.slug);
    
    const sameCategory = otherProducts.filter(
      (p: any) => p.category_id === product.category_id || (p.category_name && p.category_name === product.category_name)
    );
    
    const differentCategory = otherProducts.filter(
      (p: any) => p.category_id !== product.category_id && (!p.category_name || p.category_name !== product.category_name)
    );

    return [...sameCategory, ...differentCategory].slice(0, 4);
  }, [product, allProducts]);

  const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const mobileCarouselRef = useRef<HTMLDivElement>(null);

  const [selectedBundleVariants, setSelectedBundleVariants] = useState<Record<number, any>>({});
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Reviews Data State
  const [reviewsData, setReviewsData] = useState<{ reviews: any[]; totalReviews: number; avgRating: number; totalBuyers: number }>({
    reviews: [],
    totalReviews: 0,
    avgRating: 0,
    totalBuyers: 0,
  });
  const [loadingReviews, setLoadingReviews] = useState(true);

  const reviewMediaList = useMemo(() => {
    const list: { url: string; type: string }[] = [];
    reviewsData.reviews.forEach((r) => {
      if (r.media_url) {
        try {
          const urls = r.media_url.startsWith("[") ? JSON.parse(r.media_url) : [r.media_url];
          urls.forEach((url: string) => {
            if (url.match(/\.(mp4|mov|webm)$/i)) {
              list.push({ url, type: "video" });
            } else {
              list.push({ url, type: "image" });
            }
          });
        } catch (e) {
          // ignore
        }
      }
    });
    return list;
  }, [reviewsData.reviews]);

  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [reviewSort, setReviewSort] = useState<"terbaru" | "dengan_foto">("terbaru");

  const reviewVariants = useMemo(() => {
    const vars = new Set<string>();
    vars.add("Semua Varian");
    reviewsData.reviews.forEach((r) => {
      if (r.variant) {
        const fmt = formatSizeVariant(r.variant);
        if (fmt) vars.add(fmt);
      }
    });
    return Array.from(vars);
  }, [reviewsData.reviews]);

  const [reviewFilterVariant, setReviewFilterVariant] = useState<string>("Semua Varian");

  const displayedReviews = useMemo(() => {
    if (!reviewsData.reviews) return [];
    let list = [...reviewsData.reviews];
    
    if (reviewFilterVariant !== "Semua Varian") {
      list = list.filter((r: any) => formatSizeVariant(r.variant) === reviewFilterVariant);
    }

    list.sort((a, b) => new Date(b.created_at || b.date || 0).getTime() - new Date(a.created_at || a.date || 0).getTime());

    if (reviewSort === "dengan_foto") {
      list = list.filter((r) => {
        if (!r.media_url) return false;
        try {
           const parsed = r.media_url.startsWith("[") ? JSON.parse(r.media_url) : [r.media_url];
           return parsed && parsed.length > 0;
        } catch(e) {
           return false;
        }
      });
    }

    return list;
  }, [reviewsData.reviews, reviewSort, reviewFilterVariant]);

  useEffect(() => {
    if (!product?.id) return;
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const res = await getProductReviewsServerAction({ data: { productId: product.id } });
        if (res.reviews) {
          setReviewsData({
            reviews: res.reviews,
            totalReviews: res.totalReviews || 0,
            avgRating: res.avgRating || 0,
            totalBuyers: res.totalBuyers || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching product reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };
    void fetchReviews();
  }, [product?.id]);

  // Size Fit Guide State
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [userHeight, setUserHeight] = useState("");
  const [userWeight, setUserWeight] = useState("");
  const [sizeRecommendation, setSizeRecommendation] = useState<{
    size: string;
    desc: string;
  } | null>(null);

  const calculateSize = () => {
    const h = parseInt(userHeight);
    const w = parseInt(userWeight);
    if (!h || !w) return;

    let recommended = "L";
    let desc = "Nyaman";

    if (h < 160 && w < 55) {
      recommended = "S";
      desc = "Pas badan";
    } else if (h < 165 && w < 65) {
      recommended = "M";
      desc = "Fit ideal";
    } else if (h < 175 && w < 75) {
      recommended = "L";
      desc = "Nyaman";
    } else if (h < 185 && w < 85) {
      recommended = "XL";
      desc = "Sedikit longgar";
    } else {
      recommended = "XXL";
      desc = "Oversized";
    }

    setSizeRecommendation({ size: recommended, desc });
  };



  // Initialize values when product changes
  useEffect(() => {
    if (product) {
      if (product.image_url) {
        setActiveImage(product.image_url);
      }
    }
  }, [product]);

  useEffect(() => {
    if (product && product.product_type === "bundle" && product.bundle_components) {
      const initial: Record<number, any> = {};
      for (const comp of product.bundle_components) {
        const firstAvailable = comp.variants?.find((v) => v.stock > 0) || comp.variants?.[0];
        if (firstAvailable) {
          initial[comp.id] = firstAvailable;
        }
      }
      setSelectedBundleVariants(initial);
    }
  }, [product]);

  // Detect single-variant product (e.g. "One Size" with no color options)
  const isSingleVariant = useMemo(() => {
    if (!product || product.product_type === "bundle") return false;
    if (product.variants.length !== 1) return false;
    const v = product.variants[0];
    const sizeIsGeneric = !v.size || v.size === "One Size" || v.size === "All Size";
    const colorIsEmpty = !v.color;
    return sizeIsGeneric && colorIsEmpty;
  }, [product]);

  // Extract color & size arrays for rendering
  const colors = useMemo(() => {
    if (!product) return [];
    if (isSingleVariant) return [];
    return Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean))) as string[];
  }, [product, isSingleVariant]);

  const sizes = useMemo(() => {
    if (!product) return [];
    if (isSingleVariant) return [];
    return Array.from(new Set(
      product.variants.map((v) => v.size).filter((s) => s && s !== "One Size" && s !== "All Size")
    )) as string[];
  }, [product, isSingleVariant]);

  const { data: activePoRes } = useQuery({
    queryKey: ["activePreOrderCampaign"],
    queryFn: () => getActivePreOrderCampaignServerAction(),
    staleTime: 30 * 1000,
  });
  const activePoCampaign = activePoRes?.data || null;

  const isPreOrder = product?.sale_type === "preorder" || product?.sale_type === "pre_order";
  const isPreOrderClosed = useMemo(() => {
    if (!product || (product.sale_type !== "preorder" && product.sale_type !== "pre_order")) return false;
    return !isPreOrderOpen(activePoCampaign);
  }, [product, activePoCampaign]);

  // Calculate dynamic stock based on selections
  const currentVariant = useMemo(() => {
    if (!product) return null;
    return (
      product.variants.find((v) => {
        const matchColor = !selectedColor || v.color === selectedColor;
        const matchSize = !selectedSize || v.size === selectedSize;
        return matchColor && matchSize;
      }) || null
    );
  }, [product, selectedColor, selectedSize]);

  const currentStock = useMemo(() => {
    if (!product) return 0;

    // Pre-order items do not rely on physical stock count
    if (product.sale_type === "preorder") {
      return isPreOrderClosed ? 0 : 999;
    }

    if (product.product_type === "bundle") {
      if (!product.bundle_components || product.bundle_components.length === 0) return 0;
      let minStock = Infinity;
      for (const comp of product.bundle_components) {
        const selectedVar = selectedBundleVariants[comp.id];
        if (!selectedVar) return 0;
        minStock = Math.min(minStock, selectedVar.stock);
      }
      return minStock === Infinity ? 0 : minStock;
    }

    if (product.variants.length === 0) return 0;

    if (colors.length === 0 && sizes.length === 0) {
      return product.variants[0].stock;
    }

    return currentVariant ? currentVariant.stock : 0;
  }, [product, currentVariant, colors, sizes, selectedBundleVariants]);

  // Dynamic Price computation
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    const isUb = Number(user?.is_filkom_verified) === 1;

    // 1. Determine base price (harga asli)
    let basePrice = Number(product.price);
    if (product.promo_price && Number(product.promo_price) > 0) {
      basePrice = Number(product.promo_price);
    } else if (isUb && product.filkom_price && Number(product.filkom_price) > 0) {
      basePrice = Number(product.filkom_price);
    }

    if (product.product_type === "bundle") {
      let bundleAddon = 0;
      if (product.bundle_components) {
        for (const comp of product.bundle_components) {
          if (!comp.variants || comp.variants.length === 0) continue;
          
          const hasLunas = comp.variants.some((v: any) => v.color?.toUpperCase() === "LUNAS");
          let refVariant = null;
          if (hasLunas) {
            refVariant = comp.variants.find((v: any) => v.color?.toUpperCase() === "LUNAS" && v.size?.toUpperCase() === "S")
              || comp.variants.find((v: any) => v.color?.toUpperCase() === "LUNAS");
          } else {
            refVariant = comp.variants.find((v: any) => v.size?.toUpperCase() === "S")
              || comp.variants[0];
          }

          let refAddon = 0;
          if (refVariant) {
            if (isUb && refVariant.filkom_price && Number(refVariant.filkom_price) > 0) {
              refAddon = Number(refVariant.filkom_price);
            } else if (refVariant.price_override && Number(refVariant.price_override) > 0) {
              refAddon = Number(refVariant.price_override);
            }
          }

          const selectedVar = selectedBundleVariants[comp.id];
          let selectedAddon = 0;
          if (selectedVar) {
            if (isUb && selectedVar.filkom_price && Number(selectedVar.filkom_price) > 0) {
              selectedAddon = Number(selectedVar.filkom_price);
            } else if (selectedVar.price_override && Number(selectedVar.price_override) > 0) {
              selectedAddon = Number(selectedVar.price_override);
            }
          }

          bundleAddon += (selectedAddon - refAddon);
        }
      }
      return basePrice + bundleAddon;
    }

    // 2. Add variant add-on if a variant is matched
    let addon = 0;
    if (selectedSize || selectedColor) {
      const matchingVariant = product.variants?.find(
        (v: any) =>
          v.is_active &&
          (!selectedSize || v.size === selectedSize) &&
          (!selectedColor || v.color === selectedColor),
      );
      if (matchingVariant) {
        if (matchingVariant.filkom_price && Number(matchingVariant.filkom_price) > 0) {
          addon = Number(matchingVariant.filkom_price);
        } else if (matchingVariant.price_override && Number(matchingVariant.price_override) > 0) {
          addon = Number(matchingVariant.price_override);
        }
      }
    }

    return basePrice + addon;
  }, [product, user, selectedSize, selectedColor, selectedBundleVariants]);

  // Dynamic original price (for strike-through display)
  const originalPrice = useMemo(() => {
    if (!product) return null;

    // 1. Determine base original price
    let baseOriginalPrice = null;
    if (product.original_price && Number(product.original_price) > 0) {
      baseOriginalPrice = Number(product.original_price);
    } else {
      const basePrice = Number(product.price);
      if (currentPrice < basePrice) {
        baseOriginalPrice = basePrice;
      }
    }

    if (baseOriginalPrice === null && product.product_type !== "bundle") return null;

    const isUb = Number(user?.is_filkom_verified) === 1;

    if (product.product_type === "bundle") {
      let bundleAddon = 0;
      if (product.bundle_components) {
        for (const comp of product.bundle_components) {
          if (!comp.variants || comp.variants.length === 0) continue;
          
          const hasLunas = comp.variants.some((v: any) => v.color?.toUpperCase() === "LUNAS");
          let refVariant = null;
          if (hasLunas) {
            refVariant = comp.variants.find((v: any) => v.color?.toUpperCase() === "LUNAS" && v.size?.toUpperCase() === "S")
              || comp.variants.find((v: any) => v.color?.toUpperCase() === "LUNAS");
          } else {
            refVariant = comp.variants.find((v: any) => v.size?.toUpperCase() === "S")
              || comp.variants[0];
          }

          let refAddon = 0;
          if (refVariant) {
            if (isUb && refVariant.filkom_price && Number(refVariant.filkom_price) > 0) {
              refAddon = Number(refVariant.filkom_price);
            } else if (refVariant.price_override && Number(refVariant.price_override) > 0) {
              refAddon = Number(refVariant.price_override);
            }
          }

          const selectedVar = selectedBundleVariants[comp.id];
          let selectedAddon = 0;
          if (selectedVar) {
            if (isUb && selectedVar.filkom_price && Number(selectedVar.filkom_price) > 0) {
              selectedAddon = Number(selectedVar.filkom_price);
            } else if (selectedVar.price_override && Number(selectedVar.price_override) > 0) {
              selectedAddon = Number(selectedVar.price_override);
            }
          }

          bundleAddon += (selectedAddon - refAddon);
        }
      }
      
      const finalOriginal = baseOriginalPrice !== null ? baseOriginalPrice : Number(product.price);
      if (currentPrice < (finalOriginal + bundleAddon)) {
        return finalOriginal + bundleAddon;
      }
      return null;
    }

    // 2. Add variant add-on if a variant is matched
    let addon = 0;
    if (selectedSize || selectedColor) {
      const matchingVariant = product.variants?.find(
        (v: any) =>
          v.is_active &&
          (!selectedSize || v.size === selectedSize) &&
          (!selectedColor || v.color === selectedColor),
      );
      if (matchingVariant) {
        if (matchingVariant.filkom_price && Number(matchingVariant.filkom_price) > 0) {
          addon = Number(matchingVariant.filkom_price);
        } else if (matchingVariant.price_override && Number(matchingVariant.price_override) > 0) {
          addon = Number(matchingVariant.price_override);
        }
      }
    }

    return (baseOriginalPrice !== null ? baseOriginalPrice : Number(product.price)) + addon;
  }, [product, user, selectedSize, selectedColor, currentPrice, selectedBundleVariants]);

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FCFAF7] text-ink flex flex-col items-center justify-center p-6">
        <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Produk Tidak Ditemukan</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Sayang sekali produk yang Anda cari tidak tersedia atau dinonaktifkan.
        </p>
        <Link
          to="/"
          className="font-bold text-brand-orange hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // Product images gallery
  const images =
    product.images && product.images.length > 0
      ? product.images
      : ([product.image_url].filter(Boolean) as string[]);

  // Automatically switch active image based on color / variant selection
  useEffect(() => {
    if (!product || images.length <= 1) return;

    // Only query variant if the user has made all necessary selections
    const isSizeSelected = sizes.length === 0 || !!selectedSize;
    const isColorSelected = colors.length === 0 || !!selectedColor;

    if (isSizeSelected && isColorSelected) {
      const matchedVariant = product.variants.find((v) => {
        const sizeMatches = sizes.length === 0 || (v.size || "One Size") === selectedSize;
        const colorMatches = colors.length === 0 || (v.color || "") === selectedColor;
        return sizeMatches && colorMatches && v.is_active;
      });

      if (matchedVariant && matchedVariant.image_url) {
        setActiveImage(matchedVariant.image_url);
        return; // Success, stop here!
      }
    }

    // 2. Fallback to smart color name search
    if (selectedColor) {
      // Normalize color name (e.g. "Navy (DP)" -> "navy")
      const cleanColor = selectedColor.toLowerCase().replace(/\(dp\)|\(lunas\)/gi, "").trim();
      if (cleanColor) {
        const matchedImage = images.find((img) => {
          const filename = img.toLowerCase().split("/").pop() || "";
          return filename.includes(cleanColor) || img.toLowerCase().includes(cleanColor);
        });

        if (matchedImage) {
          setActiveImage(matchedImage);
          return; // Success, stop here!
        }
      }
    }

    // 3. Fallback to main product image if no variant image or color match is found
    if (product.image_url) {
      setActiveImage(product.image_url);
    }
  }, [selectedSize, selectedColor, product, images, sizes, colors]);

  // Auto-scroll mobile carousel to activeImage when variant selection changes
  useEffect(() => {
    if (!activeImage || !mobileCarouselRef.current) return;
    const idx = images.indexOf(activeImage);
    if (idx < 0) return;

    const container = mobileCarouselRef.current;
    const targetChild = container.querySelector(`[data-image-index="${idx}"]`) as HTMLElement | null;
    if (targetChild) {
      const scrollLeft = targetChild.offsetLeft - (container.offsetWidth - targetChild.offsetWidth) / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
    }
  }, [activeImage, images]);

  const handleAddToCart = (buyNow = false) => {
    if (product.product_type !== "bundle" && !isSingleVariant) {
      if (!selectedSize && sizes.length > 0) {
        toast.error("Pilih ukuran terlebih dahulu!");
        return;
      }
      if (!selectedColor && colors.length > 0) {
        toast.error("Pilih warna terlebih dahulu!");
        return;
      }
    } else if (product.product_type === "bundle") {
      if (product.bundle_components) {
        for (const comp of product.bundle_components) {
          if (!selectedBundleVariants[comp.id]) {
            toast.error(`Pilih variasi untuk komponen: ${comp.name}`);
            return;
          }
        }
      }
    }
    if (currentStock <= 0) {
      toast.error("Stok untuk variasi ini habis!");
      return;
    }
    if (quantity > currentStock) {
      toast.error(`Kuantitas melebihi stok yang tersedia (${currentStock} pcs)`);
      return;
    }

    let cartItemName = product.name;
    let selectionsPayload: any[] = [];
    let uniqueSelectionsStr = "";

    if (product.product_type === "bundle") {
      const selectionDetails = (product.bundle_components || [])
        .map((comp) => {
          const variant = selectedBundleVariants[comp.id];
          const variantStr = [variant?.color, variant?.size]
            .filter((v) => v && v !== "One Size" && v !== "All Size")
            .join(" — ");
          return `${comp.name}${variantStr ? `: ${variantStr}` : ""}`;
        })
        .join(", ");
      cartItemName = `${product.name} (${selectionDetails})`;

      selectionsPayload = (product.bundle_components || []).map((comp) => {
        const variant = selectedBundleVariants[comp.id];
        return {
          product_id: comp.id,
          variant_id: variant?.id || 0,
          quantity: 1,
        };
      });
      uniqueSelectionsStr = selectionsPayload
        .map((s) => `${s.product_id}-${s.variant_id}`)
        .sort()
        .join("-");
    } else {
      const variantStr = [selectedColor, selectedSize].filter(Boolean).join(" — ");
      cartItemName = `${product.name}${variantStr ? ` (${variantStr})` : ""}`;
    }

    const cartItemId =
      product.product_type === "bundle"
        ? `online-bundle-${product.id}-${uniqueSelectionsStr}`
        : `online-${product.id}-${selectedColor || ""}-${selectedSize || ""}`;

    // Read indexCart
    let indexCart: any[] = [];
    try {
      const saved = localStorage.getItem("indexCart");
      if (saved) indexCart = JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    // Format for checkout page cart structure
    const checkoutItem = {
      id: cartItemId,
      product_id: product.id,
      product_name: cartItemName,
      name: cartItemName,
      price: currentPrice,
      quantity: quantity,
      size: selectedSize || "One Size",
      color: selectedColor || undefined,
      variant_id: currentVariant?.id || product.variants[0]?.id,
      image_url: product.image_url || "",
      category: product.category_name || "Apparel",
      bundle_selections: selectionsPayload.length > 0 ? selectionsPayload : undefined,
    };

    if (buyNow) {
      // For buy now: only store in buyNowItem, do NOT touch indexCart or cart
      localStorage.setItem("buyNowItem", JSON.stringify([checkoutItem]));
      if (!user) {
        toast.info("Silakan login terlebih dahulu untuk checkout");
        navigate({ to: "/login" });
      } else {
        navigate({ to: "/checkout", search: { buyNow: "true" } });
      }
    } else {
      // Upsert indexCart (for homepage navbar bag)
      const existingIndexIdx = indexCart.findIndex((i) => i.id === cartItemId);
      const itemData = {
        id: cartItemId,
        name: cartItemName,
        price: `Rp ${currentPrice.toLocaleString("id-ID")}`,
        img: product.image_url || "",
        qty: quantity,
        product_id: product.id,
        variant_id: currentVariant?.id || product.variants[0]?.id,
        size: selectedSize || "One Size",
        color: selectedColor || undefined,
        bundle_selections: selectionsPayload.length > 0 ? selectionsPayload : undefined,
      };

      if (existingIndexIdx > -1) {
        indexCart[existingIndexIdx].qty += quantity;
      } else {
        indexCart.push(itemData);
      }
      localStorage.setItem("indexCart", JSON.stringify(indexCart));

      // Save to checkout cart (usually replaces or appends)
      let checkoutCart: any[] = [];
      try {
        const saved = localStorage.getItem("cart");
        if (saved) checkoutCart = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }

      const existingCheckIdx = checkoutCart.findIndex((i) => i.id === cartItemId);
      if (existingCheckIdx > -1) {
        checkoutCart[existingCheckIdx].quantity += quantity;
      } else {
        checkoutCart.push(checkoutItem);
      }
      localStorage.setItem("cart", JSON.stringify(checkoutCart));

      // Dispatch events to notify Navbar component
      window.dispatchEvent(new Event("cart-updated"));
      window.dispatchEvent(new Event("open-cart"));
      toast.success("Berhasil ditambahkan ke Keranjang", {
        description: `${cartItemName} (${quantity} pcs)`,
      });
    }
  };

  const [activeTab, setActiveTab] = useState<"detail" | "spesifikasi" | "panduan">("detail");

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink flex flex-col justify-between">
      {/* Header Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 flex-1 w-full pb-24 md:pb-8">
        {/* 3-Column Layout: Left (Fixed Sticky Photo) | Middle (Details & Tabs) | Right (Fixed Sticky Buy Card) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* COLUMN 1: LEFT STICKY GALLERY (4 Cols - Fixed Anchored) */}
          <div className="md:col-span-4 md:sticky md:top-28 self-start">
            {/* ===== MOBILE: Horizontal Swipe Carousel with Variant Scroll ===== */}
            <div className="md:hidden relative w-full overflow-hidden">
              <div ref={mobileCarouselRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    data-image-index={idx}
                    onClick={() => {
                      setActiveImage(img);
                      setIsZoomOpen(true);
                    }}
                    className={`w-[85%] shrink-0 snap-center aspect-square bg-cream border-2 rounded-2xl overflow-hidden relative cursor-zoom-in group/img transition-all duration-300 ${
                      activeImage === img
                        ? "border-brand-orange shadow-[5px_5px_0px_0px_rgba(234,88,12,0.6)] ring-2 ring-brand-orange/40"
                        : "border-ink shadow-[5px_5px_0px_0px_rgba(27,27,27,1)]"
                    }`}
                  >
                    <img
                      src={resolveImageUrl(img)}
                      alt={`${product.name} - ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                    />
                    {([selectedSize, selectedColor].filter(Boolean).length > 0) && (
                      <div className="absolute bottom-3.5 left-3.5 bg-white text-ink border-2 border-ink px-2.5 py-1 text-[9px] font-black uppercase rounded-lg shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] z-20 animate-fade-in">
                        {[selectedSize, selectedColor].filter(Boolean).join(" - ")}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage(img);
                        setIsZoomOpen(true);
                      }}
                      className="absolute bottom-3.5 right-3.5 p-2 bg-white/95 rounded-full shadow border-2 border-ink hover:scale-105 transition-transform z-10 cursor-pointer"
                      aria-label="Zoom image"
                    >
                      <Search className="w-4 h-4 text-ink" />
                    </button>
                    {images.length > 1 && (
                      <div className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-black/60 border border-white/20 rounded-lg text-[10px] text-white font-bold select-none">
                        {idx + 1} / {images.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ===== DESKTOP: Main Image + Thumbnail Strip ===== */}
            <div className="hidden md:block space-y-3">
              {/* Main Active Image */}
              <div
                onClick={() => setIsZoomOpen(true)}
                className="w-full aspect-square bg-cream border-2 border-ink rounded-2xl overflow-hidden relative cursor-zoom-in group/img shadow-[5px_5px_0px_0px_rgba(27,27,27,1)]"
              >
                {([selectedSize, selectedColor].filter(Boolean).length > 0) && (
                  <div className="absolute bottom-3.5 left-3.5 bg-white text-ink border-2 border-ink px-2.5 py-1 text-[10px] font-black uppercase rounded-lg shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] z-20 animate-fade-in">
                    {[selectedSize, selectedColor].filter(Boolean).join(" - ")}
                  </div>
                )}
                <img
                  src={resolveImageUrl(activeImage || images[0])}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsZoomOpen(true);
                  }}
                  className="absolute bottom-3.5 right-3.5 p-2 bg-white/95 rounded-full shadow border-2 border-ink hover:scale-105 transition-transform z-10 cursor-pointer"
                  aria-label="Zoom image"
                >
                  <Search className="w-4 h-4 text-ink" />
                </button>
                {images.length > 1 && (
                  <div className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-black/60 border border-white/20 rounded-lg text-[10px] text-white font-bold select-none">
                    {images.indexOf(activeImage || images[0]) + 1} / {images.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        (activeImage || images[0]) === img
                          ? "border-brand-orange shadow-[2px_2px_0px_0px_rgba(234,88,12,0.6)] ring-1 ring-brand-orange/40 scale-95"
                          : "border-ink/30 hover:border-ink opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={resolveImageUrl(img)}
                        alt={`${product.name} thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: MIDDLE DETAILS & TABS (5 Cols - Internal Scroll Slider) */}
          <div className="md:col-span-5 space-y-6 md:max-h-[calc(100vh-140px)] md:overflow-y-auto pr-2 md:pr-4">
            {/* Title & Category Header */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] bg-brand-orange text-ink font-mono font-extrabold px-2.5 py-0.5 rounded-full border border-ink uppercase">
                  {product.category_name || "APPAREL"}
                </span>
                {product.sale_type && (
                  <span className="text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase border border-red-200">
                    {product.sale_type}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-ink uppercase tracking-tight leading-tight">
                  {product.name}
                </h1>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: product.name,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Tautan produk berhasil disalin!");
                    }
                  }}
                  className="shrink-0 p-2 rounded-xl border-2 border-ink bg-white hover:bg-cream shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                  aria-label="Bagikan produk"
                >
                  <Share2 className="w-4 h-4 text-ink" />
                </button>
              </div>
            </div>

            {/* Price Section */}
            <div className="p-4 bg-white border-2 border-ink rounded-2xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] space-y-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-brand-orange tracking-tight">
                  Rp {currentPrice.toLocaleString("id-ID")}
                </span>
                {originalPrice && originalPrice > currentPrice && (
                  <span className="text-sm font-extrabold text-red-500 line-through">
                    Rp {originalPrice.toLocaleString("id-ID")}
                  </span>
                )}
              </div>

              {Number(user?.is_filkom_verified) === 1 ? (
                <div className="text-xs font-bold text-brand-orange bg-brand-orange/10 border border-brand-orange/30 rounded-lg p-2.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
                  🎉 Selamat kamu dapat harga khusus mahasiswa FILKOM!
                </div>
              ) : product.filkom_price && Number(product.filkom_price) > 0 ? (
                <div className="text-xs font-medium text-muted-foreground bg-slate-50 border border-slate-200 rounded-lg p-2">
                  {user ? (
                    user.email?.toLowerCase().endsWith("@student.ub.ac.id") ? (
                      <span>
                        💡{" "}
                        <button
                          onClick={() => window.dispatchEvent(new Event("open-verification"))}
                          className="font-bold text-brand-orange hover:underline cursor-pointer"
                        >
                          Verifikasi NIM Anda
                        </button>{" "}
                        untuk klaim diskon Civitas Rp{" "}
                        {Number(product.filkom_price).toLocaleString("id-ID")}
                      </span>
                    ) : (
                      <span>
                        💡 Gunakan akun email <strong>@student.ub.ac.id</strong> &amp; verifikasi NIM untuk harga Civitas Rp{" "}
                        {Number(product.filkom_price).toLocaleString("id-ID")}
                      </span>
                    )
                  ) : (
                    <span>
                      💡 Login dengan email @student.ub.ac.id &amp; verifikasi NIM untuk harga Civitas Rp{" "}
                      {Number(product.filkom_price).toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* REVIEW CARD ACCORDION */}
            <div className="border-2 border-ink rounded-2xl bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] mb-6" id="ulasan-section">
              <button
                onClick={() => setIsReviewsOpen(!isReviewsOpen)}
                className="w-full bg-cream/40 py-4 px-5 flex items-center justify-between cursor-pointer hover:bg-cream transition-colors border-none outline-none"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-sm uppercase tracking-wider text-ink flex items-center gap-2">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    Ulasan ({reviewsData.totalReviews})
                  </h3>
                  <div className="flex items-baseline gap-1 bg-white border border-ink/20 px-2 py-0.5 rounded-md">
                    <span className="font-extrabold text-ink text-xs">{reviewsData.avgRating}</span>
                    <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                  </div>
                  {reviewsData.totalBuyers > 0 && (
                    <div className="flex items-baseline gap-1 bg-cream border border-ink/20 px-2 py-0.5 rounded-md">
                      <span className="font-extrabold text-ink text-xs">{reviewsData.totalBuyers}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">Terjual</span>
                    </div>
                  )}
                </div>
                <div className={`transition-transform duration-300 ${isReviewsOpen ? "rotate-180" : ""}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </button>
              
              {isReviewsOpen && (
                <div className="p-5 border-t-2 border-ink text-xs sm:text-sm bg-white animate-fade-in text-left">
                  {loadingReviews ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Memuat ulasan produk...</p>
                  ) : reviewsData.reviews.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground font-medium">Belum ada ulasan untuk produk ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                          <button
                            onClick={() => setReviewSort("terbaru")}
                            className={`px-3 py-1.5 text-[11px] font-bold border-2 transition rounded-lg shrink-0 cursor-pointer ${
                              reviewSort === "terbaru" ? "bg-brand-orange text-ink border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-white text-ink border-ink hover:bg-cream"
                            }`}
                          >
                            Terbaru
                          </button>
                          <button
                            onClick={() => setReviewSort("dengan_foto")}
                            className={`px-3 py-1.5 text-[11px] font-bold border-2 transition rounded-lg shrink-0 cursor-pointer ${
                              reviewSort === "dengan_foto" ? "bg-brand-orange text-ink border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" : "bg-white text-ink border-ink hover:bg-cream"
                            }`}
                          >
                            Dengan Foto
                          </button>
                          
                          {reviewVariants.length > 1 && (
                            <div className="flex items-center gap-2 border-l-2 border-ink/20 pl-2 ml-1">
                              {reviewVariants.map((v) => (
                                <button
                                  key={v}
                                  onClick={() => setReviewFilterVariant(v)}
                                  className={`px-3 py-1.5 text-[11px] font-bold border-2 transition rounded-lg shrink-0 cursor-pointer ${
                                    reviewFilterVariant === v
                                      ? "bg-brand-orange text-ink border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                                      : "bg-white text-ink border-ink hover:bg-cream"
                                  }`}
                                >
                                  {v}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-border">
                        {displayedReviews.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-4 text-center">Tidak ada ulasan dengan foto.</p>
                        ) : (
                          displayedReviews.map((rev) => (
                            <div key={rev.id} className="py-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-ink">{maskReviewerName(rev.name)}</span>
                                <span className="text-[10px] text-muted-foreground">{rev.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex text-amber-400">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? "fill-amber-400 text-amber-500" : "text-gray-300 fill-gray-100"}`} />
                                  ))}
                                </div>
                                {formatSizeVariant(rev.variant) && (
                                  <span className="text-[10px] font-semibold text-muted-foreground bg-cream border border-ink/10 px-1.5 py-0.5 rounded">
                                    Ukuran: {formatSizeVariant(rev.variant)}
                                  </span>
                                )}
                              </div>
                              {rev.comment && (
                                <p className="text-xs text-ink/90 font-medium leading-relaxed mt-1">"{rev.comment}"</p>
                              )}
                              {rev.media_url && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {(() => {
                                    try {
                                      const urls = rev.media_url.startsWith("[") ? JSON.parse(rev.media_url) : [rev.media_url];
                                      return urls.map((url: string, idx: number) => (
                                        <div key={idx} className="shrink-0">
                                          {url.match(/\.(mp4|mov|webm)$/i) ? (
                                            <video src={resolveImageUrl(url)} className="w-16 h-16 object-cover rounded-lg border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]" controls />
                                          ) : (
                                            <img src={resolveImageUrl(url)} alt={`Bukti Ulasan ${idx+1}`} className="w-16 h-16 object-cover rounded-lg border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-zoom-in hover:scale-105 transition-transform" onClick={() => { setActiveImage(resolveImageUrl(url) || ""); setIsZoomOpen(true); }} />
                                          )}
                                        </div>
                                      ));
                                    } catch (e) {
                                      return null;
                                    }
                                  })()}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Product Variant Selectors */}
            {product.product_type === "bundle" ? (
              <div className="space-y-4 border-2 border-ink p-4 rounded-2xl bg-white shadow-sm">
                <p className="font-extrabold text-ink uppercase text-xs tracking-wider">
                  Pilih Ukuran / Warna Varian Paket Bundle:
                </p>
                {product.bundle_components?.map((comp) => {
                  const selectedVar = selectedBundleVariants[comp.id];
                  const compColors = Array.from(
                    new Set(comp.variants?.map((v) => v.color).filter(Boolean)),
                  ) as string[];
                  const compSizes = Array.from(
                    new Set(comp.variants?.map((v) => v.size).filter(Boolean)),
                  ) as string[];

                  const currentSize = selectedVar?.size || "";
                  const currentColor = selectedVar?.color || null;

                  return (
                    <div
                      key={comp.id}
                      className="p-3.5 bg-cream/30 border border-ink/30 rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-ink text-xs uppercase truncate">
                          {comp.name}
                        </h4>
                        {selectedVar && (
                          <span
                            className={`text-[9px] font-extrabold ${selectedVar.stock <= 3 ? "text-red-600 bg-red-50" : "text-brand-orange bg-brand-orange/10"} px-2 py-0.5 border border-ink/20 rounded`}
                          >
                            Stok: {selectedVar.stock}
                          </span>
                        )}
                      </div>

                      {/* Colors */}
                      {compColors.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                          {compColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                const matched =
                                  comp.variants.find(
                                    (v) => v.color === color && v.size === currentSize,
                                  ) ||
                                  comp.variants.find((v) => v.color === color) ||
                                  comp.variants[0];
                                if (matched) {
                                  setSelectedBundleVariants((prev) => ({
                                    ...prev,
                                    [comp.id]: matched,
                                  }));
                                }
                              }}
                              className={`px-3 py-1 text-[11px] font-bold border-2 transition rounded-lg cursor-pointer ${
                                currentColor === color
                                  ? "bg-brand-orange text-ink border-ink scale-95"
                                  : "bg-white text-ink border-border hover:border-ink"
                              }`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Sizes */}
                      {compSizes.length > 1 && (
                        <div className="flex flex-wrap gap-1.5">
                          {compSizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                const matched =
                                  comp.variants.find(
                                    (v) => v.size === size && v.color === currentColor,
                                  ) ||
                                  comp.variants.find((v) => v.size === size) ||
                                  comp.variants[0];
                                if (matched) {
                                  setSelectedBundleVariants((prev) => ({
                                    ...prev,
                                    [comp.id]: matched,
                                  }));
                                }
                              }}
                              className={`min-w-9 h-8 px-2 flex items-center justify-center text-[11px] font-bold border-2 transition rounded-lg cursor-pointer ${
                                currentSize === size
                                    ? "bg-brand-orange text-ink border-ink scale-95"
                                    : "bg-white text-ink border-border hover:border-ink"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !isSingleVariant && (colors.length > 0 || sizes.length > 0) ? (
              <div className="space-y-4 p-4 bg-white border-2 border-ink rounded-2xl shadow-sm">
                {/* Selection: Colors */}
                {colors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase text-ink">
                      Pilih Warna: <span className="text-brand-orange">{selectedColor || "-"}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-4 py-2 text-xs font-bold border-2 transition rounded-xl cursor-pointer ${
                            selectedColor === color
                              ? "bg-brand-orange text-ink border-ink shadow-sm scale-95 font-black"
                              : "bg-white text-ink border-border hover:border-ink"
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection: Sizes */}
                {sizes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold uppercase text-ink">
                      Pilih Ukuran: <span className="text-brand-orange">{selectedSize || "-"}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-12 h-10 px-4 flex items-center justify-center text-xs font-extrabold border-2 transition rounded-xl cursor-pointer ${
                            selectedSize === size
                              ? "bg-brand-orange text-ink border-ink shadow-sm scale-95 font-black"
                              : "bg-white text-ink border-border hover:border-ink"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Selector + Stock Info (mobile only, desktop uses sidebar) */}
                <div className="md:hidden space-y-2 pt-3 border-t border-border mt-3">
                  <p className="text-xs font-extrabold uppercase text-ink">Jumlah</p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center border-2 border-ink rounded-xl bg-cream/20 overflow-hidden">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 border-r-2 border-ink hover:bg-cream active:scale-95 transition-all cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-12 text-center text-xs font-black">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                        disabled={currentStock <= 0}
                        className="p-2 border-l-2 border-ink hover:bg-cream active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right text-xs">
                      {isPreOrder ? (
                        isPreOrderClosed ? (
                          <span className="text-rose-800 font-black uppercase tracking-wider text-[11px] bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                            🔒 PO Ditutup
                          </span>
                        ) : (
                          <span className="text-brand-orange font-black uppercase tracking-wider text-[11px] bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/30">
                            ⚡ Pre-Order Open
                          </span>
                        )
                      ) : (
                        <>
                          <span className="text-muted-foreground font-bold">Stok: </span>
                          <span className={currentStock <= 3 ? "text-red-600 font-black animate-pulse" : "text-ink font-black"}>
                            {currentStock}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Pre-Order Banner if Preorder product */}
            {product.product_type === "preorder" && (
              <div className="p-4 bg-orange-50 border-2 border-brand-orange rounded-xl text-xs space-y-2 text-ink shadow-sm">
                <div className="flex items-center gap-2 text-brand-orange font-extrabold uppercase tracking-wider text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                  Kampanye Pre-Order Aktif
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <span className="text-muted-foreground">Mulai PO:</span>{" "}
                    <span className="font-bold">
                      {product.preorder_start_at
                        ? new Date(product.preorder_start_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Akhir PO:</span>{" "}
                    <span className="font-bold">
                      {product.preorder_end_at
                        ? new Date(product.preorder_end_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>
                  {product.preorder_moq && (
                    <div>
                      <span className="text-muted-foreground">Kuota MOQ:</span>{" "}
                      <span className="font-bold">{product.preorder_moq} pcs</span>
                    </div>
                  )}
                  {product.production_eta_days && (
                    <div>
                      <span className="text-muted-foreground">Estimasi Produksi:</span>{" "}
                      <span className="font-bold">{product.production_eta_days} Hari</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TABBED CONTENT SECTION (Deskripsi | Spesifikasi | Panduan) */}
            <div className="border-2 border-ink rounded-2xl bg-white overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] mt-8">
              {/* Tab Navigation Headers */}
              <div className="flex border-b-2 border-ink bg-cream/40">
                <button
                  onClick={() => setActiveTab("detail")}
                  className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-r border-ink/20 ${
                    activeTab === "detail"
                      ? "bg-white text-brand-orange border-b-4 border-b-brand-orange font-extrabold"
                      : "text-muted-foreground hover:text-ink hover:bg-cream"
                  }`}
                >
                  Deskripsi
                </button>
                <button
                  onClick={() => setActiveTab("spesifikasi")}
                  className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-r border-ink/20 ${
                    activeTab === "spesifikasi"
                      ? "bg-white text-brand-orange border-b-4 border-b-brand-orange font-extrabold"
                      : "text-muted-foreground hover:text-ink hover:bg-cream"
                  }`}
                >
                  Spesifikasi
                </button>
                <button
                  onClick={() => setActiveTab("panduan")}
                  className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer border-r border-ink/20 ${
                    activeTab === "panduan"
                      ? "bg-white text-brand-orange border-b-4 border-b-brand-orange font-extrabold"
                      : "text-muted-foreground hover:text-ink hover:bg-cream"
                  }`}
                >
                  Panduan Ukuran
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-5 text-xs sm:text-sm space-y-4">
                {activeTab === "detail" && (
                  <div className="space-y-3 leading-relaxed text-ink font-medium whitespace-pre-line">
                    {product.description || ""}
                  </div>
                )}

                {activeTab === "spesifikasi" && (
                  <div className="space-y-2">
                    {product.bahan && (
                      <div className="grid grid-cols-3 gap-2 py-2 border-b border-border">
                        <span className="font-extrabold text-ink uppercase text-[11px]">Bahan kain</span>
                        <span className="col-span-2 text-muted-foreground font-semibold">
                          {product.bahan}
                        </span>
                      </div>
                    )}
                    {product.aplikasi && (
                      <div className="grid grid-cols-3 gap-2 py-2 border-b border-border">
                        <span className="font-extrabold text-ink uppercase text-[11px]">Aplikasi Sablon/Bordir</span>
                        <span className="col-span-2 text-muted-foreground font-semibold">
                          {product.aplikasi}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "panduan" && (
                  <div className="space-y-4">
                    {product.size_chart_url && (
                      <div className="border-2 border-ink rounded-xl overflow-hidden max-w-md bg-cream mx-auto">
                        <img
                          src={resolveImageUrl(product.size_chart_url)}
                          alt="Size Chart"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>



          </div>

          {/* COLUMN 3: RIGHT STICKY CHECKOUT SIDEBAR BOX (3 Cols - Fixed Anchored) */}
          <div className="md:col-span-3 md:sticky md:top-28 self-start hidden md:block">
            <div className="bg-white border-2 border-ink rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(27,27,27,1)]">
              {/* Header */}
              <div className="bg-ink px-5 py-3">
                <h3 className="text-white font-extrabold text-xs uppercase tracking-wider">
                  Atur Jumlah dan Catatan
                </h3>
              </div>

              <div className="p-5 space-y-5">
                {/* Product Mini Card */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 shrink-0 rounded-lg border-2 border-ink/20 overflow-hidden bg-cream">
                    <img
                      src={resolveImageUrl(product.image_url || images[0])}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-ink text-sm truncate uppercase">{product.name}</p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {[selectedColor, selectedSize].filter(Boolean).join(" — ") || "ONE SIZE"}
                    </p>
                  </div>
                </div>

                {/* Quantity + Stock Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center border-2 border-ink rounded-xl bg-cream/20 overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 border-r-2 border-ink hover:bg-cream active:scale-95 transition-all cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-xs font-black">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                      disabled={currentStock <= 0}
                      className="p-2 border-l-2 border-ink hover:bg-cream active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right text-xs">
                    {isPreOrder ? (
                      isPreOrderClosed ? (
                        <span className="text-rose-800 font-black uppercase tracking-wider text-[11px] bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                          🔒 PO Ditutup
                        </span>
                      ) : (
                        <span className="text-brand-orange font-black uppercase tracking-wider text-[11px] bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/30">
                          ⚡ Pre-Order
                        </span>
                      )
                    ) : (
                      <>
                        <span className="text-muted-foreground font-bold">Stok: </span>
                        <span className={currentStock <= 3 ? "text-red-600 font-black animate-pulse" : "text-ink font-black"}>
                          {currentStock}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs font-bold text-muted-foreground">Subtotal</span>
                  <span className="text-xl font-black text-ink tracking-tight">
                    Rp {(currentPrice * quantity).toLocaleString("id-ID")}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5">
                  <button
                    onClick={() => handleAddToCart(false)}
                    disabled={currentStock <= 0 || isPreOrderClosed}
                    className="w-full py-3 px-4 bg-brand-orange hover:bg-brand-orange/90 text-ink font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 dark:disabled:border-zinc-700"
                  >
                    <Plus className="w-4 h-4" /> {currentStock <= 0 ? "Stok Habis" : "+ Keranjang"}
                  </button>
                  <button
                    onClick={() => handleAddToCart(true)}
                    disabled={currentStock <= 0 || isPreOrderClosed}
                    className="w-full py-3 px-4 bg-card hover:bg-secondary text-foreground font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 dark:disabled:border-zinc-700"
                  >
                    {currentStock <= 0 ? "Stok Habis" : (isPreOrder ? "Pesan Sekarang" : "Beli Langsung")}
                  </button>
                </div>

                {/* Share Link */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: product.name, url: window.location.href });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Tautan produk berhasil disalin!");
                    }
                  }}
                  className="w-full text-center text-xs font-bold text-muted-foreground hover:text-ink flex items-center justify-center gap-1.5 transition-colors cursor-pointer pt-1"
                >
                  <Share2 className="w-3.5 h-3.5" /> Bagikan Produk (Share)
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* ===== KAMU MUNGKIN SUKA (RECOMMENDED PRODUCTS) ===== */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 sm:mt-16 pt-8 border-t-2 border-ink/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-brand-orange text-lg">✦</span>
                <h2 className="display text-xl sm:text-2xl font-black text-ink uppercase tracking-wide">
                  Kamu Mungkin Suka
                </h2>
              </div>
              <Link
                to="/products"
                className="text-xs font-extrabold text-brand-orange hover:text-ink transition-colors flex items-center gap-1 uppercase tracking-wider"
              >
                Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
              {relatedProducts.map((p: any) => {
                const displayPrice = p.promo_price && Number(p.promo_price) > 0
                  ? Number(p.promo_price)
                  : Number(p.price || 0);
                const showOriginalPrice = p.original_price && Number(p.original_price) > displayPrice
                  ? Number(p.original_price)
                  : null;

                return (
                  <Link
                    key={p.id}
                    to="/product/$slug"
                    params={{ slug: p.slug || String(p.id) }}
                    className="group flex flex-col bg-cream border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all duration-200 overflow-hidden text-ink h-full"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden bg-secondary border-b-2 border-ink select-none">
                      {p.image_url ? (
                        <img
                          src={resolveImageUrl(p.image_url)}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold bg-cream text-xs">
                          No Photo
                        </div>
                      )}
                      
                      {/* Tag / Badge */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        {p.sale_type === "pre_order" && (
                          <span className="text-[8px] sm:text-[9px] font-black tracking-wider px-2 py-0.5 bg-brand-orange text-cream rounded-full border border-ink shadow-xs uppercase">
                            PO
                          </span>
                        )}
                        {!!p.is_best_seller && (
                          <span className="text-[8px] sm:text-[9px] font-black tracking-wider px-2 py-0.5 bg-emerald-600 text-cream rounded-full border border-ink shadow-xs uppercase">
                            BEST SELLER
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-extrabold text-brand-orange uppercase tracking-wider mb-0.5">
                          {p.category_name || "MERCHANDISE"}
                        </p>
                        <h3 className="font-extrabold text-xs sm:text-sm text-ink group-hover:text-brand-orange transition-colors tracking-tight line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-ink/10 flex items-center justify-between gap-1">
                        <div>
                          <span className="font-black text-xs sm:text-sm text-ink">
                            Rp {displayPrice.toLocaleString("id-ID")}
                          </span>
                          {showOriginalPrice && (
                            <span className="block text-[9px] sm:text-[10px] text-muted-foreground line-through font-bold">
                              Rp {showOriginalPrice.toLocaleString("id-ID")}
                            </span>
                          )}
                        </div>
                        <div className="p-1.5 rounded-lg bg-brand-orange text-cream border-2 border-ink shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] group-hover:bg-cream group-hover:text-ink transition-colors shrink-0">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>



      {/* Lightbox / Zoom Dialog */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out select-none animate-fadeIn"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-4 right-4 bg-white border-2 border-ink p-2 rounded-full shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:scale-105 transition active:scale-95 z-50 cursor-pointer"
            aria-label="Close image view"
          >
            <X className="w-5 h-5 text-ink" />
          </button>
          <img
            src={activeImage}
            alt={product.name}
            className="max-w-full max-h-[90vh] object-contain rounded-lg border-2 border-white/10 shadow-2xl scale-up"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}


      {/* Size Fit Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-2 border-ink rounded-xl shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-cream border-b-2 border-ink p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-ink uppercase tracking-tight flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                Kalkulator Ukuran
              </h3>
              <button
                onClick={() => setIsSizeGuideOpen(false)}
                className="hover:bg-black/10 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink uppercase tracking-wider">
                    Tinggi Badan (cm)
                  </label>
                  <input
                    type="number"
                    value={userHeight}
                    onChange={(e) => setUserHeight(e.target.value)}
                    placeholder="Contoh: 170"
                    className="w-full border-2 border-ink rounded p-2.5 outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-ink uppercase tracking-wider">
                    Berat Badan (kg)
                  </label>
                  <input
                    type="number"
                    value={userWeight}
                    onChange={(e) => setUserWeight(e.target.value)}
                    placeholder="Contoh: 65"
                    className="w-full border-2 border-ink rounded p-2.5 outline-none focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
              </div>
              <button
                onClick={calculateSize}
                className="w-full bg-ink text-white font-bold uppercase tracking-widest py-3 border-2 border-ink hover:bg-brand-orange transition-colors active:scale-95"
              >
                Cek Ukuranku
              </button>

              {sizeRecommendation && (
                <div className="mt-6 bg-green-50 border-2 border-green-500 rounded p-4 text-center animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <p className="text-sm font-semibold text-green-800 mb-1">
                    Ukuran Terbaik Untukmu:
                  </p>
                  <div className="text-4xl font-extrabold text-green-600 tracking-tight my-2">
                    {sizeRecommendation.size}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-100 px-3 py-1 w-fit mx-auto rounded-full">
                    {sizeRecommendation.desc}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Sticky Bottom Dock for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t-2 border-border p-3 md:hidden shadow-[0_-4px_15px_rgba(0,0,0,0.2)]">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleAddToCart(false)}
            disabled={currentStock <= 0 || isPreOrderClosed}
            className="py-3 px-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <ShoppingBag className="w-4 h-4" /> {isPreOrderClosed ? "Ditutup" : (currentStock <= 0 ? "Habis" : "Masuk Bag")}
          </button>
          <button
            onClick={() => handleAddToCart(true)}
            disabled={currentStock <= 0 || isPreOrderClosed}
            className="py-3 px-3 bg-ink text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,0.4)] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <Zap className="w-4 h-4" /> {isPreOrderClosed ? "Ditutup" : (currentStock <= 0 ? "Habis" : (isPreOrder ? "Pesan Sekarang" : "Beli Sekarang"))}
          </button>
        </div>
      </div>
    </div>
  );
}
