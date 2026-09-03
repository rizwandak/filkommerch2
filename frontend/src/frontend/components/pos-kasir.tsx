import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  X,
  ShoppingCart,
  Banknote,
  QrCode,
  CreditCard,
  UserCheck,
  User,
  UserPlus,
  CheckCircle2,
  Calculator,
  Coins,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import { Badge } from "@frontend/components/ui/badge";
import { ScrollArea } from "@frontend/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@frontend/components/ui/dialog";
import type {
  CreateSaleInput,
  ProductWithVariants,
  ProductVariant,
  Category,
  StoreSettings,
  DbUser,
} from "@backend/server-actions";
import {
  createSale,
  getProducts,
  getCategories,
  getStoreSettings,
  createOrderAndPayment,
  getUsersAdmin,
} from "@backend/server-actions";
import { bluetoothPrinter, type ReceiptData } from "@frontend/lib/bluetooth-printer";
import { cleanProductName, cleanVariantPart, printBrowserReceipt } from "@frontend/lib/receipt-printer";
import { resolveImageUrl } from "@/lib/image-resolver";
import logoFilkom from "@/assets/logo_filkom.png";
import logoFM from "@/assets/logo-fm.jpg";

interface CartItem {
  id: string;
  product_id: number;
  product_name: string;
  variant_id?: number;
  size?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  bundle_selections?: Array<{
    product_id: number;
    variant_id: number;
    quantity: number;
  }>;
}

type PaymentMethod = "cash" | "qris";

const formatPaymentType = (type: string, result: any): string => {
  if (!type) return "Online Payment";

  const paymentTypeLower = type.toLowerCase();

  if (paymentTypeLower === "qris") return "QRIS";
  if (paymentTypeLower === "gopay") return "GoPay";
  if (paymentTypeLower === "shopeepay") return "ShopeePay";
  if (paymentTypeLower === "credit_card") return "Kartu Kredit";

  if (paymentTypeLower === "bank_transfer") {
    if (result?.va_numbers && result.va_numbers.length > 0) {
      const bank = result.va_numbers[0].bank || "";
      return `VA ${bank.toUpperCase()}`;
    }
    if (result?.permata_va_number) {
      return "VA Permata";
    }
    return "Virtual Account";
  }

  if (paymentTypeLower === "cstore") {
    const store = result?.store || "";
    if (store.toLowerCase() === "indomaret") return "Indomaret";
    if (store.toLowerCase() === "alfamart") return "Alfamart";
    return "Gerai Retail";
  }

  if (paymentTypeLower === "echannel") {
    return "Mandiri Bill";
  }

  return type.charAt(0).toUpperCase() + type.slice(1);
};

interface POSKasirProps {
  admin_id: number;
  admin_name: string;
  store_name: string;
}

export function POSKasir({ admin_id, admin_name, store_name }: POSKasirProps) {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // States for registered user selection in POS
  const [registeredUsers, setRegisteredUsers] = useState<DbUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);

  const getItemUnitPrice = (
    product: ProductWithVariants,
    variant: ProductVariant,
    isFilkom: boolean
  ): number => {
    let basePrice = product.price;
    if (
      product.promo_price !== undefined &&
      product.promo_price !== null &&
      Number(product.promo_price) > 0
    ) {
      basePrice = Number(product.promo_price);
    } else if (isFilkom) {
      if (
        product.filkom_price !== undefined &&
        product.filkom_price !== null &&
        Number(product.filkom_price) > 0
      ) {
        basePrice = Number(product.filkom_price);
      }
    }

    let addon = 0;
    if (
      variant.filkom_price !== undefined &&
      variant.filkom_price !== null &&
      Number(variant.filkom_price) > 0
    ) {
      addon = Number(variant.filkom_price);
    } else if (
      variant.price_override !== undefined &&
      variant.price_override !== null &&
      Number(variant.price_override) > 0
    ) {
      addon = Number(variant.price_override);
    }

    return basePrice + addon;
  };

  const handleSelectCustomer = (user: DbUser | null) => {
    setSelectedUser(user);
    if (user) {
      setCustomerName(user.name);
      const isFilkom = Boolean(user.is_filkom_verified);
      setCart((prevCart) =>
        prevCart.map((item) => {
          const prod = products.find((p) => p.id === item.product_id);
          const variant = prod?.variants.find((v) => v.id === item.variant_id);
          if (prod && variant && prod.product_type !== "bundle") {
            const newUnitPrice = getItemUnitPrice(prod, variant, isFilkom);
            return { ...item, unit_price: newUnitPrice };
          }
          return item;
        })
      );
      toast.success(`Pelanggan dipilih: ${user.name}`, {
        description: isFilkom
          ? "✓ Status: Civitas FILKOM (Harga Khusus FILKOM)"
          : "Status: Pelanggan Umum (Harga Reguler)",
      });
    } else {
      setCustomerName("");
      setCart((prevCart) =>
        prevCart.map((item) => {
          const prod = products.find((p) => p.id === item.product_id);
          const variant = prod?.variants.find((v) => v.id === item.variant_id);
          if (prod && variant && prod.product_type !== "bundle") {
            const newUnitPrice = getItemUnitPrice(prod, variant, false);
            return { ...item, unit_price: newUnitPrice };
          }
          return item;
        })
      );
    }
  };

  // States for variant selection dialog
  const [activeProductForVariantSelection, setActiveProductForVariantSelection] =
    useState<ProductWithVariants | null>(null);
  const [dialogSelectedSize, setDialogSelectedSize] = useState<string | null>(null);
  const [dialogSelectedColor, setDialogSelectedColor] = useState<string | null>(null);

  // States for bundle variant selection dialog
  const [activeBundleForSelection, setActiveBundleForSelection] =
    useState<ProductWithVariants | null>(null);
  const [selectedBundleVariants, setSelectedBundleVariants] = useState<
    Record<number, ProductVariant>
  >({});

  const [currentReceiptData, setCurrentReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [cashReceived, setCashReceived] = useState<number | string>("");
  const [showQrisModal, setShowQrisModal] = useState(false);

  const handleCloseReceiptDialog = () => {
    setShowReceiptDialog(false);
    setCurrentReceiptData(null);
    setCart([]);
    setCustomerName("");
    setSelectedUser(null);
    setDiscount(0);
    setNotes("");
    setCashReceived("");
    setSearchQuery("");
  };

  const loadData = useCallback(async () => {
    try {
      const [productsResult, categoriesResult, settingsResult, usersResult] = await Promise.all([
        getProducts(),
        getCategories(),
        getStoreSettings(),
        getUsersAdmin().catch(() => ({ success: false, users: [] })),
      ]);
      if (productsResult?.products) setProducts(productsResult.products);
      if (categoriesResult?.categories) setCategories(categoriesResult.categories);
      if (settingsResult?.settings) setStoreSettings(settingsResult.settings);
      if (usersResult?.success && usersResult.users) setRegisteredUsers(usersResult.users);
    } catch {
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Load Midtrans Snap script dynamically for POS
  useEffect(() => {
    const snapScriptUrl = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = "Mid-client-xBEPEMQRGEXHq99n";

    const script = document.querySelector(`script[src="${snapScriptUrl}"]`);
    if (!script) {
      const newScript = document.createElement("script");
      newScript.src = snapScriptUrl;
      newScript.setAttribute("data-client-key", clientKey);
      document.body.appendChild(newScript);
    }
  }, []);

  const getTotalStock = (product: ProductWithVariants) =>
    product.variants.reduce((sum, v) => sum + v.stock, 0);

  const filteredProducts = products.filter((p) => {
    // POS hanya melayani produk Ready Stock (bukan Pre-Order)
    const isReadyStock = p.sale_type !== "preorder" && p.sale_type !== "pre_order";
    const matchCategory = categoryFilter === "all" || String(p.category_id) === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      p.variants.some((v) => v.size.toLowerCase().includes(q));
    return isReadyStock && matchCategory && matchSearch && getTotalStock(p) > 0;
  });

  const filteredRegisteredUsers = registeredUsers.filter((u) => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.nim && u.nim.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal - discount;

  const handleProductClick = (product: ProductWithVariants) => {
    if (product.product_type === "bundle") {
      if (!product.bundle_components || product.bundle_components.length === 0) {
        toast.error("Paket ini tidak memiliki produk komponen!");
        return;
      }
      setActiveBundleForSelection(product);
      const initialSelections: Record<number, ProductVariant> = {};
      for (const comp of product.bundle_components) {
        const firstAvailable = comp.variants.find((v) => v.stock > 0) || comp.variants[0];
        if (firstAvailable) {
          initialSelections[comp.id] = firstAvailable;
        }
      }
      setSelectedBundleVariants(initialSelections);
      return;
    }

    const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size).filter(Boolean)));
    const uniqueColors = Array.from(new Set(product.variants.map((v) => v.color).filter(Boolean)));

    if (uniqueSizes.length <= 1 && uniqueColors.length === 0) {
      const onlyVariant = product.variants[0];
      if (onlyVariant) {
        addToCart(product, onlyVariant);
      }
    } else {
      setActiveProductForVariantSelection(product);
      const firstAvailable = product.variants.find((v) => v.stock > 0) || product.variants[0];
      setDialogSelectedSize(firstAvailable?.size || null);
      setDialogSelectedColor(firstAvailable?.color || null);
    }
  };

  const addToCart = (product: ProductWithVariants, variant: ProductVariant, customQty = 1) => {
    if (!variant || variant.stock <= 0) {
      toast.error("Stok habis");
      return;
    }

    const existing = cart.find(
      (item) => item.product_id === product.id && item.variant_id === variant.id,
    );

    if (existing) {
      if (existing.quantity + customQty > variant.stock) {
        toast.error("Stok tidak cukup");
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + customQty } : item,
        ),
      );
    } else {
      const variantStr = [variant.color, variant.size]
        .filter((v) => v && v !== "One Size" && v !== "All Size")
        .join(" — ");

      const unitPrice = getItemUnitPrice(
        product,
        variant,
        Boolean(selectedUser?.is_filkom_verified)
      );

      setCart([
        ...cart,
        {
          id: `cart-${Date.now()}`,
          product_id: product.id,
          product_name: `${product.name}${variantStr ? ` (${variantStr})` : ""}`,
          variant_id: variant.id,
          size: variant.size,
          color: variant.color || undefined,
          quantity: customQty,
          unit_price: unitPrice,
          discount: 0,
        },
      ]);
    }
    toast.success("Ditambahkan ke keranjang", {
      description: `${product.name} (${variant.color || ""}/${variant.size})`,
    });
  };

  const addBundleToCart = (
    product: ProductWithVariants,
    parentVariant: ProductVariant,
    selections: Record<number, ProductVariant>,
    customQty = 1,
  ) => {
    // Validate stock for all component variants
    for (const comp of product.bundle_components || []) {
      const selectedVar = selections[comp.id];
      if (!selectedVar) {
        toast.error(`Pilih varian untuk komponen: ${comp.name}`);
        return;
      }

      const requiredQty = customQty;
      const cartQuantity = cart.reduce((sum, item) => {
        if (item.bundle_selections) {
          const foundSel = item.bundle_selections.find((s) => s.variant_id === selectedVar.id);
          if (foundSel) {
            return sum + foundSel.quantity * item.quantity;
          }
        }
        if (item.variant_id === selectedVar.id) {
          return sum + item.quantity;
        }
        return sum;
      }, 0);

      if (cartQuantity + requiredQty > selectedVar.stock) {
        toast.error(`Stok komponen ${comp.name} tidak mencukupi!`);
        return;
      }
    }

    const selectionDetails = (product.bundle_components || [])
      .map((comp) => {
        const variant = selections[comp.id];
        const variantStr = [variant?.color, variant?.size]
          .filter((v) => v && v !== "One Size" && v !== "All Size")
          .join(" — ");
        return `${comp.name}${variantStr ? `: ${variantStr}` : ""}`;
      })
      .join(", ");
    const compositeName = `${product.name} (${selectionDetails})`;

    const selectionsPayload = (product.bundle_components || []).map((comp) => {
      const variant = selections[comp.id];
      return {
        product_id: comp.id,
        variant_id: variant.id,
        quantity: 1,
      };
    });

    const stringifySelections = (payload: typeof selectionsPayload) =>
      payload
        .map((s) => `${s.product_id}-${s.variant_id}`)
        .sort()
        .join("|");

    const existing = cart.find(
      (item) =>
        item.product_id === product.id &&
        item.bundle_selections &&
        stringifySelections(item.bundle_selections) === stringifySelections(selectionsPayload),
    );

    if (existing) {
      for (const comp of product.bundle_components || []) {
        const selectedVar = selections[comp.id];
        const totalReqQty = existing.quantity + customQty;
        const cartQuantity = cart.reduce((sum, item) => {
          if (item.id === existing.id) return sum;
          if (item.bundle_selections) {
            const foundSel = item.bundle_selections.find((s) => s.variant_id === selectedVar.id);
            if (foundSel) {
              return sum + foundSel.quantity * item.quantity;
            }
          }
          if (item.variant_id === selectedVar.id) {
            return sum + item.quantity;
          }
          return sum;
        }, 0);

        if (cartQuantity + totalReqQty > selectedVar.stock) {
          toast.error(`Stok komponen ${comp.name} tidak mencukupi!`);
          return;
        }
      }

      setCart(
        cart.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + customQty } : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          id: `cart-${Date.now()}`,
          product_id: product.id,
          product_name: compositeName,
          variant_id: parentVariant.id,
          size: parentVariant.size,
          color: parentVariant.color || undefined,
          quantity: customQty,
          unit_price: product.price,
          discount: 0,
          bundle_selections: selectionsPayload,
        },
      ]);
    }

    toast.success("Paket ditambahkan ke keranjang", {
      description: product.name,
    });
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((item) => item.id !== itemId));
      return;
    }
    const item = cart.find((i) => i.id === itemId);
    if (item) {
      const product = products.find((p) => p.id === item.product_id);

      if (product?.product_type === "bundle" && item.bundle_selections) {
        for (const sel of item.bundle_selections) {
          const compProduct = products.find((p) => p.id === sel.product_id);
          const compVar = compProduct?.variants.find((v) => v.id === sel.variant_id);
          if (compProduct && compVar) {
            const otherCartQuantity = cart.reduce((sum, c) => {
              if (c.id === itemId) return sum;
              if (c.bundle_selections) {
                const s = c.bundle_selections.find((x) => x.variant_id === compVar.id);
                if (s) return sum + s.quantity * c.quantity;
              }
              if (c.variant_id === compVar.id) return sum + c.quantity;
              return sum;
            }, 0);

            const totalRequired = otherCartQuantity + sel.quantity * newQty;
            if (totalRequired > compVar.stock) {
              toast.error(`Stok komponen ${compProduct.name} tidak mencukupi untuk jumlah ini`);
              return;
            }
          }
        }
      } else {
        const variant = product?.variants.find((v) => v.id === item.variant_id);
        if (variant && newQty > variant.stock) {
          toast.error("Stok tidak cukup");
          return;
        }
      }
    }
    setCart(cart.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item)));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Kosongkan keranjang?")) {
      setCart([]);
      setCustomerName("");
      setSelectedUser(null);
      setDiscount(0);
      setNotes("");
    }
  };
  const recordSaleInDatabase = async (actualPaymentMethod?: string) => {
    const isCash = (actualPaymentMethod || paymentMethod) === "Tunai" || paymentMethod === "cash";
    const paymentMethodLabel =
      actualPaymentMethod || (paymentMethod === "cash" ? "Tunai" : "QRIS Statis");

    const saleInput: CreateSaleInput = {
      admin_id,
      cashier_name: admin_name,
      payment_method: paymentMethodLabel,
      items: cart,
      subtotal,
      discount,
      tax: 0,
      total,
      notes: notes || undefined,
      customer_name: selectedUser ? selectedUser.name : (customerName || undefined),
      customer_email: selectedUser ? selectedUser.email : undefined,
      customer_phone: selectedUser ? (selectedUser.phone || undefined) : undefined,
      customer_nim: selectedUser ? (selectedUser.nim || undefined) : undefined,
      user_id: selectedUser ? selectedUser.id : undefined,
      is_filkom_verified: selectedUser ? Boolean(selectedUser.is_filkom_verified) : undefined,
      order_id: !isCash ? `POS-${Date.now()}` : undefined,
    };

    const result = await createSale({ data: saleInput });
    if (!result.success) {
      throw new Error(result.error);
    }

    const receiptData: ReceiptData = {
      store_name,
      sale_id: result.sale_id!,
      date: new Date().toLocaleDateString("id-ID"),
      time: new Date().toLocaleTimeString("id-ID"),
      items: cart.map((item) => {
        const cleanName = cleanProductName(item.product_name);
        const variantParts = [cleanVariantPart(item.size), cleanVariantPart(item.color)].filter(Boolean);
        const variantInfo = variantParts.join(" / ");
        const displayName = variantInfo ? `${cleanName} (${variantInfo})` : cleanName;
        return {
          name: displayName,
          qty: item.quantity,
          price: item.unit_price,
          subtotal: item.unit_price * item.quantity,
        };
      }),
      subtotal,
      discount,
      tax: 0,
      total,
      payment_method: paymentMethodLabel,
      cashier_name: admin_name,
      customer_name: selectedUser ? selectedUser.name : (customerName || undefined),
    };

    if (printerConnected) {
      try {
        await bluetoothPrinter.printReceipt(receiptData);
      } catch {
        // Bluetooth printer optional
      }
    }

    toast.success(`Transaksi berhasil! #${result.sale_id}`);
    setCurrentReceiptData(receiptData);
    setShowReceiptDialog(true);
    await loadData();
  };

  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong!");
      return;
    }

    if (paymentMethod === "qris") {
      setShowQrisModal(true);
      return;
    }

    // Cash validation:
    const cashNum = typeof cashReceived === "number" ? cashReceived : Number(cashReceived) || 0;
    if (cashNum > 0 && cashNum < total) {
      toast.error(`Uang diterima (Rp ${cashNum.toLocaleString("id-ID")}) kurang dari total tagihan (Rp ${total.toLocaleString("id-ID")})`);
      return;
    }

    setIsProcessing(true);
    try {
      await recordSaleInDatabase("Tunai");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transaksi gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmQrisPayment = async () => {
    setIsProcessing(true);
    try {
      await recordSaleInDatabase("QRIS Statis");
      setShowQrisModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transaksi gagal");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConnectPrinter = async () => {
    try {
      const devices = await bluetoothPrinter.scanDevices();
      if (devices.length === 0) {
        toast.error("Tidak ada printer ditemukan");
        return;
      }
      await bluetoothPrinter.connect(devices[0].id);
      setPrinterConnected(true);
      toast.success("Printer terhubung!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal hubungkan printer");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground bg-background">
        Memuat produk...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground overflow-hidden relative">
      {/* Mobile/Tablet Tab Switcher */}
      <div className="flex lg:hidden shrink-0 border-b border-border bg-card">
        <button
          onClick={() => setActiveTab("products")}
          className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center justify-center gap-2 ${
            activeTab === "products"
              ? "border-brand-blue text-brand-blue bg-brand-blue/5"
              : "border-transparent text-muted-foreground hover:bg-muted"
          }`}
        >
          Daftar Produk ({filteredProducts.length})
        </button>
        <button
          onClick={() => setActiveTab("cart")}
          className={`flex-1 py-3 text-center text-xs sm:text-sm font-bold transition-all border-b-2 relative flex items-center justify-center gap-2 ${
            activeTab === "cart"
              ? "border-brand-blue text-brand-blue bg-brand-blue/5"
              : "border-transparent text-muted-foreground hover:bg-muted"
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Keranjang Belanja
          {cart.length > 0 && (
            <Badge className="bg-brand-orange text-white hover:bg-brand-orange/90 ml-1 h-5 min-w-5 flex items-center justify-center px-1 py-0.5 rounded-full text-[10px] font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          )}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Products column */}
        <div
          className={`flex-col border-r border-border h-full w-full lg:w-[65%] xl:w-[70%] ${
            activeTab === "products" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="shrink-0 space-y-3 border-b border-border p-4 bg-card shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari produk / barcode / slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-input bg-background pl-10 pr-4 text-ink placeholder:text-muted-foreground focus-visible:ring-brand-blue h-10 rounded-lg"
                autoFocus
              />
            </div>
            {/* Horizontal scrollable categories */}
            <div
              className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none -mx-4 px-4 mask-gradient lg:flex-wrap lg:overflow-x-visible lg:pb-0 lg:mx-0 lg:px-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <button
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 tracking-wide shrink-0 hover:scale-105 active:scale-95 ${
                  categoryFilter === "all"
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/15"
                    : "bg-cream/70 text-ink border border-border/80 hover:bg-muted hover:border-ink/20"
                }`}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(String(cat.id))}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 tracking-wide shrink-0 hover:scale-105 active:scale-95 ${
                    categoryFilter === String(cat.id)
                      ? "bg-brand-blue text-white shadow-md shadow-brand-blue/15"
                      : "bg-cream/70 text-ink border border-border/80 hover:bg-muted hover:border-ink/20"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 p-3 sm:p-4 bg-background/50">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5">
              {filteredProducts.map((product) => {
                const stock = getTotalStock(product);
                const sizes = product.variants.filter((v) => v.stock > 0).map((v) => v.size);

                const hasPromo = product.promo_price && Number(product.promo_price) > 0;
                const displayPrice = hasPromo ? Number(product.promo_price) : Number(product.price);
                const strikePrice = hasPromo
                  ? product.original_price
                    ? Number(product.original_price)
                    : Number(product.price)
                  : product.original_price
                    ? Number(product.original_price)
                    : null;

                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-300 hover:border-brand-blue hover:shadow-lg hover:shadow-brand-blue/8 hover:-translate-y-0.5 active:scale-[0.97] relative"
                  >
                    {/* Catalog Badges Overlay */}
                    <div className="absolute left-2 top-2 flex flex-col gap-1 z-10 pointer-events-none">
                      {product.product_type === "bundle" && (
                        <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm uppercase border-0">
                          Paket
                        </Badge>
                      )}
                      {product.is_featured === true && (
                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm uppercase border-0">
                          Featured
                        </Badge>
                      )}
                      {product.is_best_seller === true && (
                        <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm uppercase border-0">
                          Best Seller
                        </Badge>
                      )}
                      {product.is_limited === true && (
                        <Badge className="bg-red-600 hover:bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-sm uppercase border-0">
                          Limited
                        </Badge>
                      )}
                    </div>

                    {/* Hover Plus Button Overlay */}
                    <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-brand-blue text-white p-1.5 rounded-full shadow-md z-10 hidden sm:block">
                      <Plus className="h-3 w-3" />
                    </div>

                    <div className="aspect-square overflow-hidden bg-cream/30 border-b border-border/60 relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-medium">
                          Tidak Ada Gambar
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                      <p className="line-clamp-2 text-[11px] sm:text-xs font-bold leading-snug text-ink uppercase tracking-tight">
                        {product.name}
                      </p>
                      {sizes.length > 0 && (
                        <p className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground truncate">
                          Ukuran: {sizes.join(", ")}
                        </p>
                      )}

                      <div className="mt-auto pt-2 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-extrabold text-brand-orange">
                          Rp {displayPrice.toLocaleString("id-ID")}
                        </span>
                        {strikePrice && strikePrice > displayPrice && (
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground line-through decoration-muted-foreground/60">
                            Rp {strikePrice.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className={`mt-1.5 w-fit text-[9px] sm:text-[10px] font-semibold px-2 py-0.2 rounded-md ${
                          stock <= 5
                            ? "border-amber-500 text-amber-700 bg-amber-50"
                            : "border-border/60 text-muted-foreground bg-cream/45"
                        }`}
                      >
                        Stok: {stock}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredProducts.length === 0 && (
              <p className="py-12 text-center text-muted-foreground text-sm font-medium">
                Produk tidak ditemukan
              </p>
            )}
          </ScrollArea>
        </div>

        {/* Right: Cart column */}
        <div
          className={`flex-col bg-card border-l border-border h-full w-full lg:w-[35%] xl:w-[30%] ${
            activeTab === "cart" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-cream/40">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <ShoppingCart className="h-4 w-4 text-brand-orange" />
              <span className="display text-xs sm:text-sm tracking-wider uppercase font-bold">
                Keranjang Belanja
              </span>
              {cart.length > 0 && (
                <Badge className="bg-brand-blue text-white hover:bg-brand-blue/90 h-5 px-1.5 py-0 rounded-full text-[10px] font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 transition flex items-center gap-1 bg-red-50 hover:bg-red-100/80 px-2.5 py-1 rounded-md active:scale-95"
              >
                <Trash2 className="h-3 w-3" />
                <span>KOSONGKAN</span>
              </button>
            )}
          </div>

          <ScrollArea className="flex-1 px-3 sm:px-4">
            {cart.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center text-muted-foreground gap-3">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/40 stroke-[1.5]" />
                <p className="text-sm font-medium">Belum ada item di keranjang</p>
              </div>
            ) : (
              <div className="space-y-2.5 py-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-background border border-border/80 p-3 sm:p-3.5 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold text-ink leading-snug">
                        {item.product_name}
                      </p>
                      <button
                        onClick={() => setCart(cart.filter((c) => c.id !== item.id))}
                        className="shrink-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors active:scale-90"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">
                      Rp {item.unit_price.toLocaleString("id-ID")}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-8 w-8 rounded-lg bg-secondary hover:bg-muted text-ink border border-border/80 flex items-center justify-center active:scale-90 transition-transform duration-100"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-xs sm:text-sm font-bold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 rounded-lg bg-secondary hover:bg-muted text-ink border border-border/80 flex items-center justify-center active:scale-90 transition-transform duration-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="ml-auto text-xs sm:text-sm font-extrabold text-brand-blue">
                        Rp {(item.unit_price * item.quantity).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="shrink-0 space-y-3 border-t border-border p-3 sm:p-4 bg-cream/15">
            {/* Customer Selector & Details */}
            <div className="space-y-2">
              {selectedUser ? (
                <div className="p-2.5 bg-background border-2 border-ink rounded-lg shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-extrabold text-xs text-ink truncate">
                        {selectedUser.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(null)}
                      className="text-[10px] font-bold text-red-600 hover:underline shrink-0"
                    >
                      [Ganti]
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    {Boolean(selectedUser.is_filkom_verified) ? (
                      <span className="font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded">
                        ✓ Civitas FILKOM (Harga Khusus)
                      </span>
                    ) : (
                      <span className="font-semibold bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.5 rounded">
                        Pelanggan Umum (Harga Reguler)
                      </span>
                    )}
                    {selectedUser.email && (
                      <span className="text-muted-foreground truncate max-w-[150px]">
                        • {selectedUser.email}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUserModal(true)}
                    className="w-full h-9 text-xs font-bold border-2 border-ink bg-white hover:bg-cream/40 text-ink flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4 text-brand-orange" />
                    Pilih Pelanggan Terdaftar
                  </Button>
                  <p className="text-[10px] text-muted-foreground bg-amber-50/80 border border-amber-200 p-2 rounded-md leading-tight">
                    💡 Pelanggan baru? Arahkan mendaftar/login di web <strong>filkommerch.com</strong> via Google Login (1-click) agar transaksi masuk ke akun mereka &amp; dapat Harga FILKOM.
                  </p>
                </div>
              )}

              <div className="relative flex items-center">
                <span className="absolute left-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wide pointer-events-none">
                  Pelanggan
                </span>
                <Input
                  placeholder="Nama Pembeli (opsional)"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (selectedUser && e.target.value !== selectedUser.name) {
                      setSelectedUser(null);
                    }
                  }}
                  className="border-input bg-background text-xs sm:text-sm text-ink pl-24 focus-visible:ring-brand-blue h-9 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wide pointer-events-none">
                    Diskon
                  </span>
                  <Input
                    type="number"
                    placeholder="Rp"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                    className="border-input bg-background text-xs sm:text-sm text-ink pl-16 focus-visible:ring-brand-blue h-9 rounded-md"
                  />
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wide pointer-events-none">
                    Catatan
                  </span>
                  <Input
                    placeholder="Keterangan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="border-input bg-background text-xs sm:text-sm text-ink pl-18 focus-visible:ring-brand-blue h-9 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Metode Pembayaran
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "cash" as const, label: "TUNAI (CASH)", icon: Banknote },
                    { key: "qris" as const, label: "QRIS STATIS", icon: QrCode },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPaymentMethod(key)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg py-2.5 text-[10px] font-bold tracking-wider transition-all duration-300 border cursor-pointer ${
                      paymentMethod === key
                        ? key === "cash"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm font-extrabold"
                          : "bg-amber-50 text-amber-900 border-amber-500 ring-2 ring-amber-500/20 shadow-sm font-extrabold"
                        : "bg-background text-muted-foreground border-border hover:bg-cream/40"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Cash Calculator & Change Section */}
              {paymentMethod === "cash" && (
                <div className="space-y-2 rounded-xl bg-emerald-50/60 border border-emerald-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-emerald-900 flex items-center gap-1 uppercase">
                      <Calculator className="w-3.5 h-3.5 text-emerald-700" /> Kalkulator Uang Tunai
                    </span>
                    {typeof cashReceived === "number" || (typeof cashReceived === "string" && cashReceived !== "") ? (
                      <button
                        type="button"
                        onClick={() => setCashReceived("")}
                        className="text-[9px] text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-[10px] font-bold text-emerald-700 pointer-events-none">
                      Rp
                    </span>
                    <Input
                      type="number"
                      placeholder="Masukkan Uang Diterima..."
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value ? parseInt(e.target.value) || 0 : "")}
                      className="border-emerald-300 bg-white text-xs sm:text-sm text-ink pl-8 font-bold focus-visible:ring-emerald-500 h-9 rounded-md"
                    />
                  </div>

                  {/* Quick Cash Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCashReceived(total)}
                      className="text-[9px] px-2 py-1 bg-white border border-emerald-300 text-emerald-800 rounded font-bold hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Uang Pas (Rp {total.toLocaleString("id-ID")})
                    </button>
                    {[20000, 50000, 100000, 200000, 500000]
                      .filter((nom) => nom > total)
                      .slice(0, 3)
                      .map((nom) => (
                        <button
                          key={nom}
                          type="button"
                          onClick={() => setCashReceived(nom)}
                          className="text-[9px] px-2 py-1 bg-white border border-emerald-300 text-emerald-800 rounded font-bold hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Rp {nom.toLocaleString("id-ID")}
                        </button>
                      ))}
                  </div>

                  {/* Kembalian / Kekurangan Display */}
                  {(typeof cashReceived === "number" ? cashReceived : Number(cashReceived) || 0) >= total ? (
                    <div className="p-2.5 bg-emerald-600 text-white rounded-lg flex justify-between items-center shadow-sm">
                      <span className="text-[10px] font-bold tracking-wider uppercase">KEMBALIAN:</span>
                      <span className="text-sm sm:text-base font-black">
                        Rp {((typeof cashReceived === "number" ? cashReceived : Number(cashReceived) || 0) - total).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ) : (typeof cashReceived === "number" ? cashReceived : Number(cashReceived) || 0) > 0 ? (
                    <div className="p-2 bg-red-100 text-red-800 border border-red-300 rounded-lg flex justify-between items-center text-[10px] font-bold">
                      <span>UANG KURANG:</span>
                      <span className="font-extrabold text-xs">
                        -Rp {(total - (typeof cashReceived === "number" ? cashReceived : Number(cashReceived) || 0)).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* QRIS Statis Info */}
              {paymentMethod === "qris" && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-[11px]">
                    <QrCode className="w-3.5 h-3.5 text-amber-700" /> Pembayaran QRIS Statis
                  </div>
                  <p className="text-[10px] text-amber-800 leading-tight">
                    Klik tombol di bawah untuk memunculkan QRIS toko dan konfirmasi jika pembeli sudah membayar.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1 rounded-xl bg-background border border-border p-3">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Subtotal</span>
                <span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-amber-600 font-semibold">
                  <span>Diskon</span>
                  <span>-Rp {discount.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm sm:text-base font-extrabold text-ink pt-2 border-t border-dashed border-border mt-1.5">
                <span className="display tracking-wider text-xs uppercase text-muted-foreground">
                  TOTAL AKHIR
                </span>
                <span className="text-brand-orange text-md sm:text-lg">
                  Rp {total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <Button
              onClick={() => void handlePayment()}
              disabled={cart.length === 0 || isProcessing}
              className={`display h-12 sm:h-14 w-full text-white text-xs sm:text-sm font-bold tracking-widest uppercase transition-all duration-300 disabled:opacity-50 rounded-lg cursor-pointer active:scale-[0.98] ${
                paymentMethod === "qris"
                  ? "bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/20"
                  : "bg-ink hover:bg-brand-orange shadow-md shadow-brand-orange/20"
              }`}
              size="lg"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  MEMPROSES...
                </span>
              ) : paymentMethod === "qris" ? (
                "📱 BUKA QRIS & KONFIRMASI BAYAR"
              ) : (
                "💵 PROSES BAYAR TUNAI"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog Pemilihan Varian POS */}
      {activeProductForVariantSelection && (
        <Dialog
          open={!!activeProductForVariantSelection}
          onOpenChange={(open) => !open && setActiveProductForVariantSelection(null)}
        >
          <DialogContent className="max-w-md bg-white border-2 border-ink">
            <DialogHeader>
              <DialogTitle className="display text-lg tracking-wider text-ink uppercase">
                Pilih Varian Produk
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex gap-4">
                {activeProductForVariantSelection.image_url ? (
                  <img
                    src={activeProductForVariantSelection.image_url}
                    alt={activeProductForVariantSelection.name}
                    className="w-20 h-20 rounded object-cover border border-ink"
                  />
                ) : (
                  <div className="w-20 h-20 bg-cream rounded border border-ink" />
                )}
                <div>
                  <h3 className="font-bold text-ink uppercase leading-snug">
                    {activeProductForVariantSelection.name}
                  </h3>
                  <p className="text-brand-orange font-bold text-md mt-1">
                    Rp {activeProductForVariantSelection.price.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Unique Colors */}
              {(() => {
                const uniqueColors = Array.from(
                  new Set(
                    activeProductForVariantSelection.variants.map((v) => v.color).filter(Boolean),
                  ),
                ) as string[];
                if (uniqueColors.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Warna
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setDialogSelectedColor(color)}
                          className={`rounded px-3 py-1.5 text-xs font-semibold border-2 transition ${
                            dialogSelectedColor === color
                              ? "bg-ink text-white border-ink shadow-sm scale-95"
                              : "bg-background text-ink border-border hover:border-ink"
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Unique Sizes */}
              {(() => {
                const uniqueSizes = Array.from(
                  new Set(
                    activeProductForVariantSelection.variants.map((v) => v.size).filter(Boolean),
                  ),
                ) as string[];
                if (uniqueSizes.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Ukuran
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueSizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setDialogSelectedSize(size)}
                          className={`rounded w-11 h-10 flex items-center justify-center text-xs font-bold border-2 transition ${
                            dialogSelectedSize === size
                              ? "bg-ink text-white border-ink shadow-sm scale-95"
                              : "bg-background text-ink border-border hover:border-ink"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Stock Indicator */}
              {(() => {
                const matched = activeProductForVariantSelection.variants.find((v) => {
                  const matchColor = !dialogSelectedColor || v.color === dialogSelectedColor;
                  const matchSize = !dialogSelectedSize || v.size === dialogSelectedSize;
                  return matchColor && matchSize;
                });
                const stock = matched ? matched.stock : 0;
                return (
                  <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
                    <span className="text-xs text-muted-foreground">Ketersediaan Stok:</span>
                    <span
                      className={`text-sm font-bold ${stock <= 3 ? "text-red-600" : "text-ink"}`}
                    >
                      {stock} pcs
                    </span>
                  </div>
                );
              })()}
            </div>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setActiveProductForVariantSelection(null)}
                className="border-2 border-ink text-xs font-bold uppercase tracking-wider hover:bg-cream"
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  const matched = activeProductForVariantSelection.variants.find((v) => {
                    const matchColor = !dialogSelectedColor || v.color === dialogSelectedColor;
                    const matchSize = !dialogSelectedSize || v.size === dialogSelectedSize;
                    return matchColor && matchSize;
                  });
                  if (!matched) {
                    toast.error("Varian tidak valid");
                    return;
                  }
                  addToCart(activeProductForVariantSelection, matched);
                  setActiveProductForVariantSelection(null);
                }}
                className="bg-ink hover:bg-brand-orange text-white text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
              >
                Pilih Varian
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog QRIS Statis */}
      <Dialog open={showQrisModal} onOpenChange={setShowQrisModal}>
        <DialogContent className="sm:max-w-md w-[95vw] bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5">
          <DialogHeader>
            <DialogTitle className="display text-lg tracking-wider text-ink uppercase text-center flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-brand-orange" />
              Pembayaran QRIS Statis Toko
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 flex flex-col items-center">
            {/* QR Image Box */}
            <div className="bg-cream border-2 border-ink p-3 rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex flex-col items-center justify-center">
              {storeSettings?.qris_static_url ? (
                <img
                  src={resolveImageUrl(storeSettings.qris_static_url)}
                  alt="QRIS Toko"
                  className="w-56 h-56 object-contain rounded-lg bg-white p-2"
                />
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground bg-white rounded-lg">
                  <QrCode className="w-16 h-16 text-muted-foreground mb-2" />
                  <span className="font-semibold text-ink">QRIS Statis Belum Diunggah</span>
                  <span className="text-[10px] text-muted-foreground mt-1">Unggah gambar QRIS di Pengaturan Website Admin.</span>
                </div>
              )}
            </div>

            {/* Total tagihan */}
            <div className="text-center w-full bg-amber-50 border border-amber-200 p-3.5 rounded-xl">
              <div className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider">
                Total Tagihan Pembeli
              </div>
              <div className="text-2xl sm:text-3xl font-black text-ink mt-0.5">
                Rp {total.toLocaleString("id-ID")}
              </div>
              <p className="text-[11px] text-amber-900 mt-1 font-medium">
                Minta pembeli memindai QRIS di atas dan memasukkan nominal yang tertera.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full shrink-0 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowQrisModal(false)}
              className="border-2 border-ink text-xs font-bold uppercase tracking-wider w-full h-11 cursor-pointer"
            >
              Batal / Tutup
            </Button>
            <Button
              onClick={() => void handleConfirmQrisPayment()}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest w-full h-11 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  MEMPROSES...
                </span>
              ) : (
                "✅ SUDAH BAYAR (SELESAIKAN)"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showReceiptDialog && currentReceiptData && (
        <Dialog
          open={showReceiptDialog}
          onOpenChange={(open) => !open && handleCloseReceiptDialog()}
        >
          <DialogContent className="sm:max-w-md w-[95vw] max-h-[92vh] flex flex-col bg-white border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-4 sm:p-5 overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle className="display text-lg tracking-wider text-ink uppercase text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Transaksi Sukses!
              </DialogTitle>
            </DialogHeader>

            <div className="py-2 flex-1 overflow-y-auto flex flex-col items-center">
              {/* Receipt Preview - Exact 50mm Thermal Paper Roll (Vertical & Slender) */}
              <div className="bg-[#ede8dc]/50 border border-ink/10 rounded-xl p-3 sm:p-5 flex justify-center w-full overflow-x-auto">
                <div className="w-[50mm] min-w-[50mm] max-w-[50mm] bg-white text-black pl-[0.5mm] pr-[4.5mm] py-[5mm] shadow-md border border-gray-300 font-mono text-[7.5px] leading-[1.3] select-none rounded-xs space-y-2">
                  {/* Header */}
                  <div className="text-center font-bold flex flex-col items-center">
                    <div className="flex justify-center items-center gap-1.5 mb-1.5">
                      <img
                        src={logoFilkom}
                        alt="Logo FILKOM"
                        className="w-[24px] h-auto grayscale filter brightness-100 contrast-100"
                      />
                      <img
                        src={logoFM}
                        alt="Logo FM"
                        className="w-[24px] h-auto grayscale filter brightness-100 contrast-100"
                      />
                    </div>
                    <div className="text-[10px] font-black tracking-widest uppercase">FILKOM MERCH</div>
                    <div className="text-[7.5px] font-bold text-black mt-0.5">Universitas Brawijaya</div>
                    <div className="text-[6.5px] font-normal leading-tight text-gray-700 mt-1 max-w-[40mm]">
                      Gedung A FILKOM UB<br />Lowokwaru, Kota Malang
                    </div>
                  </div>

                  <div className="border-t border-dashed border-black"></div>

                  {/* Info */}
                  <div className="space-y-0.5 text-[7px] leading-snug">
                    <div><span className="font-bold">No:</span> {currentReceiptData.sale_id}</div>
                    <div><span className="font-bold">Tgl:</span> {currentReceiptData.date} {currentReceiptData.time}</div>
                    <div><span className="font-bold">Kasir:</span> {currentReceiptData.cashier_name}</div>
                    {currentReceiptData.payment_method && (
                      <div><span className="font-bold">Metode:</span> {currentReceiptData.payment_method}</div>
                    )}
                    {currentReceiptData.customer_name && (
                      <div><span className="font-bold">Pelanggan:</span> {currentReceiptData.customer_name}</div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-black"></div>

                  {/* Items */}
                  <div className="space-y-2">
                    {currentReceiptData.items.map((item, idx) => (
                      <div key={idx} className="text-[7.5px]">
                        <div className="font-bold leading-tight break-words">{item.name}</div>
                        <div className="flex justify-between text-[7px] mt-0.5 text-gray-800">
                          <span>{item.qty}x @Rp {item.price.toLocaleString("id-ID")}</span>
                          <span className="font-black text-black">Rp {item.subtotal.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-black"></div>

                  {/* Totals */}
                  <div className="space-y-1 text-[7.5px] font-bold">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rp {currentReceiptData.subtotal.toLocaleString("id-ID")}</span>
                    </div>
                    {currentReceiptData.discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Diskon:</span>
                        <span>-Rp {currentReceiptData.discount.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-dashed border-black pt-1 mt-1 text-[9.5px] font-black">
                      <span>TOTAL:</span>
                      <span>Rp {currentReceiptData.total.toLocaleString("id-ID")}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-black"></div>

                  {/* Footer */}
                  <div className="text-center text-[7px] space-y-1 pt-0.5">
                    <div className="font-black tracking-wider">*** TERIMA KASIH ***</div>
                    <div className="italic font-normal text-gray-500 text-[6.5px]">
                      Wear Your Faculty.
                    </div>
                    <div className="text-[6.5px] text-gray-600 font-normal leading-tight pt-0.5">
                      <div>filkommerch.com</div>
                      <div>IG &amp; TikTok: @filkommerchub</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full shrink-0 pt-2">
              <Button
                variant="outline"
                onClick={handleCloseReceiptDialog}
                className="border-2 border-ink text-xs font-bold uppercase tracking-wider w-full h-11 hover:bg-gray-100 cursor-pointer"
              >
                Selesai (Tanpa Struk)
              </Button>
              <Button
                onClick={() => printBrowserReceipt(currentReceiptData)}
                className="bg-ink hover:bg-brand-orange text-white text-xs font-bold uppercase tracking-widest w-full h-11 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
              >
                <Printer className="mr-2 h-4 w-4" /> Cetak Struk (50mm)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog Pemilihan Varian Komponen Paket Bundel */}
      {activeBundleForSelection && (
        <Dialog
          open={!!activeBundleForSelection}
          onOpenChange={(open) => !open && setActiveBundleForSelection(null)}
        >
          <DialogContent className="max-w-md bg-white border-2 border-ink max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="p-4 sm:p-6 border-b border-border bg-cream/20">
              <DialogTitle className="display text-base sm:text-lg tracking-wider text-ink uppercase">
                Konfigurasi Varian Paket
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                Pilih ukuran & warna untuk tiap produk komponen
              </p>
            </DialogHeader>

            <ScrollArea className="flex-1 p-4 sm:p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Bundle Info */}
                <div className="flex gap-4 p-3 bg-cream/30 rounded-xl border border-border/80">
                  {activeBundleForSelection.image_url ? (
                    <img
                      src={activeBundleForSelection.image_url}
                      alt={activeBundleForSelection.name}
                      className="w-16 h-16 rounded object-cover border border-ink"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-cream rounded border border-ink flex items-center justify-center text-[10px] text-muted-foreground">
                      No Image
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-ink uppercase leading-snug text-xs sm:text-sm">
                      {activeBundleForSelection.name}
                    </h3>
                    <p className="text-brand-orange font-extrabold text-sm mt-1">
                      Rp {activeBundleForSelection.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {/* Component Products Selectors */}
                {activeBundleForSelection.bundle_components?.map((comp) => {
                  const selectedVar = selectedBundleVariants[comp.id];

                  // Extract unique colors and sizes for this component product
                  const compColors = Array.from(
                    new Set(comp.variants.map((v) => v.color).filter(Boolean)),
                  ) as string[];
                  const compSizes = Array.from(
                    new Set(comp.variants.map((v) => v.size).filter(Boolean)),
                  ) as string[];

                  // Find matched variant based on current selections for size/color
                  const currentSize = selectedVar?.size || "";
                  const currentColor = selectedVar?.color || null;

                  return (
                    <div
                      key={comp.id}
                      className="space-y-3.5 border-b border-dashed border-border pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-ink text-xs uppercase tracking-tight">
                          {comp.name}
                        </h4>
                        {selectedVar && (
                          <span
                            className={`text-[10px] font-bold ${selectedVar.stock <= 3 ? "text-red-600 bg-red-50" : "text-emerald-700 bg-emerald-50"} px-2 py-0.5 rounded border border-current/25`}
                          >
                            Stok: {selectedVar.stock} pcs
                          </span>
                        )}
                      </div>

                      {/* Colors Selector */}
                      {compColors.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            Pilih Warna
                          </p>
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
                                className={`rounded px-2.5 py-1 text-[11px] font-semibold border-2 transition ${
                                  currentColor === color
                                    ? "bg-ink text-white border-ink scale-95"
                                    : "bg-background text-ink border-border hover:border-ink"
                                }`}
                              >
                                {color}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sizes Selector */}
                      {compSizes.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            Pilih Ukuran
                          </p>
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
                                className={`rounded w-9 h-8 flex items-center justify-center text-[11px] font-bold border-2 transition ${
                                  currentSize === size
                                    ? "bg-ink text-white border-ink scale-95"
                                    : "bg-background text-ink border-border hover:border-ink"
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 sm:p-6 border-t border-border bg-cream/10 gap-2 flex sm:gap-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => setActiveBundleForSelection(null)}
                className="border-2 border-ink text-xs font-bold uppercase tracking-wider hover:bg-cream/40 flex-1 sm:flex-none"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const parentVariant = activeBundleForSelection.variants[0];
                  if (!parentVariant) {
                    toast.error("Varian utama bundel tidak ditemukan");
                    return;
                  }

                  for (const comp of activeBundleForSelection.bundle_components || []) {
                    if (!selectedBundleVariants[comp.id]) {
                      toast.error(`Pilih varian untuk komponen: ${comp.name}`);
                      return;
                    }
                  }

                  addBundleToCart(activeBundleForSelection, parentVariant, selectedBundleVariants);
                  setActiveBundleForSelection(null);
                }}
                className="bg-ink hover:bg-brand-orange text-white text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] flex-1 sm:flex-none"
              >
                Tambah Ke Keranjang
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Dialog for Customer Selection */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] flex flex-col bg-white text-ink border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-4 sm:p-5 overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-base font-extrabold uppercase flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand-orange" />
              Pilih Pelanggan Terdaftar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan Nama, Email, atau NIM..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9 text-xs sm:text-sm border-2 border-ink rounded-lg focus-visible:ring-brand-orange w-full"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1.5 p-1 rounded-lg border border-border w-full">
              {filteredRegisteredUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold">Pelanggan tidak ditemukan.</p>
                  <p className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 p-2.5 rounded-lg inline-block text-left leading-relaxed">
                    💡 <strong>Pelanggan Belum Terdaftar?</strong><br />
                    Minta pelanggan mendaftar/login di web <strong>filkommerch.com</strong> via Google Login (1-click) terlebih dahulu agar transaksi ini tercatat di akun mereka &amp; otomatis mendapat Harga Civitas FILKOM.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 w-full">
                  {filteredRegisteredUsers.map((u) => {
                    const isFilkom = Boolean(u.is_filkom_verified);
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          handleSelectCustomer(u);
                          setShowUserModal(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 hover:bg-cream/40 cursor-pointer ${
                          isSelected
                            ? "border-brand-orange bg-brand-orange/10 ring-1 ring-brand-orange"
                            : "border-border/80 bg-background"
                        }`}
                      >
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-ink truncate">
                              {u.name}
                            </span>
                            {isFilkom ? (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded shrink-0">
                                ✓ FILKOM
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 px-1.5 py-0.2 rounded shrink-0">
                                Umum
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                          {u.nim && (
                            <p className="text-[10px] text-muted-foreground/80 font-mono">
                              NIM: {u.nim}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "ghost"}
                          className={`h-7 text-xs shrink-0 ${
                            isSelected ? "bg-brand-orange text-white" : ""
                          }`}
                        >
                          {isSelected ? "Terpilih" : "Pilih"}
                        </Button>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-3 w-full shrink-0">
            <p className="text-[10px] text-muted-foreground">
              * Transaksi akan otomatis terhubung ke akun pelanggan.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUserModal(false)}
              className="text-xs font-bold border-ink cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
