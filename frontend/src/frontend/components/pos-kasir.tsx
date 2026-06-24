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
} from "@backend/server-actions";
import {
  createSale,
  getProducts,
  getCategories,
  getStoreSettings,
  createOrderAndPayment,
} from "@backend/server-actions";
import { bluetoothPrinter, type ReceiptData } from "@frontend/lib/bluetooth-printer";
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
}

type PaymentMethod = "cash" | "online";

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // States for variant selection dialog
  const [activeProductForVariantSelection, setActiveProductForVariantSelection] =
    useState<ProductWithVariants | null>(null);
  const [dialogSelectedSize, setDialogSelectedSize] = useState<string | null>(null);
  const [dialogSelectedColor, setDialogSelectedColor] = useState<string | null>(null);

  const [currentReceiptData, setCurrentReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  const printBrowserReceipt = (data: ReceiptData) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up diperbolehkan di browser Anda.");
      return;
    }

    const itemsHtml = data.items.map(item => `
      <div style="margin-bottom: 6px;">
        <div style="font-weight: bold; word-break: break-word;">${item.name}</div>
        <div style="display: flex; justify-content: space-between; font-size: 9px;">
          <span>${item.qty} x Rp ${item.price.toLocaleString("id-ID")}</span>
          <span>Rp ${item.subtotal.toLocaleString("id-ID")}</span>
        </div>
      </div>
    `).join("");

    const discountHtml = data.discount > 0 ? `
      <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
        <span>Diskon:</span>
        <span>-Rp ${data.discount.toLocaleString("id-ID")}</span>
      </div>
    ` : "";

    const customerHtml = data.customer_name ? `
      <div>Pelanggan: ${data.customer_name}</div>
    ` : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Struk - FM</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              width: 50mm;
              margin: 0 auto;
              padding: 4mm 2mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 10px;
              color: #000;
              background: #fff;
              line-height: 1.3;
            }
            .text-center {
              text-align: center;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .header {
              margin-bottom: 8px;
            }
            .logo {
              font-size: 16px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .info {
              font-size: 9px;
              margin-bottom: 8px;
            }
            .total-section {
              font-weight: bold;
              margin-top: 6px;
            }
            .footer {
              margin-top: 12px;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          <div class="header text-center">
            <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 6px;">
              <img src="${logoFilkom}" style="width: 42px; height: auto; filter: grayscale(100%);" />
              <img src="${logoFM}" style="width: 42px; height: auto; filter: grayscale(100%);" />
            </div>
            <div style="font-size: 9px; font-weight: bold;">FILKOM MERCH</div>
            <div style="font-size: 8px;">Universitas Brawijaya</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="info">
            <div>No: ${data.sale_id}</div>
            <div>Tgl: ${data.date} ${data.time}</div>
            <div>Kasir: ${data.cashier_name}</div>
            ${customerHtml}
            <div>Bayar: ${data.payment_method}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="items">
            ${itemsHtml}
          </div>
          
          <div class="divider"></div>
          
          <div class="total-section">
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
              <span>Subtotal:</span>
              <span>Rp ${data.subtotal.toLocaleString("id-ID")}</span>
            </div>
            ${discountHtml}
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 4px; border-top: 1px dashed #000; padding-top: 4px;">
              <span>TOTAL:</span>
              <span>Rp ${data.total.toLocaleString("id-ID")}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="footer text-center">
            <div>Terima kasih telah membeli!</div>
            <div style="margin-top: 4px; font-style: italic; font-size: 8px;">Wear Your Faculty.</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleCloseReceiptDialog = () => {
    setShowReceiptDialog(false);
    setCurrentReceiptData(null);
    setCart([]);
    setCustomerName("");
    setDiscount(0);
    setNotes("");
    setSearchQuery("");
  };

  const loadData = useCallback(async () => {
    try {
      const [productsResult, categoriesResult, settingsResult] = await Promise.all([
        getProducts(),
        getCategories(),
        getStoreSettings(),
      ]);
      if (productsResult?.products) setProducts(productsResult.products);
      if (categoriesResult?.categories) setCategories(categoriesResult.categories);
      if (settingsResult?.settings) setStoreSettings(settingsResult.settings);
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
    const matchCategory = categoryFilter === "all" || String(p.category_id) === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      p.variants.some((v) => v.size.toLowerCase().includes(q));
    return matchCategory && matchSearch && getTotalStock(p) > 0;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal - discount;

  const handleProductClick = (product: ProductWithVariants) => {
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
          unit_price: product.price,
          discount: 0,
        },
      ]);
    }
    toast.success("Ditambahkan ke keranjang", {
      description: `${product.name} (${variant.color || ""}/${variant.size})`,
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
      const variant = product?.variants.find((v) => v.id === item.variant_id);
      if (variant && newQty > variant.stock) {
        toast.error("Stok tidak cukup");
        return;
      }
    }
    setCart(cart.map((item) => (item.id === itemId ? { ...item, quantity: newQty } : item)));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm("Kosongkan keranjang?")) {
      setCart([]);
      setCustomerName("");
      setDiscount(0);
      setNotes("");
    }
  };
  const handlePayment = async () => {
    if (cart.length === 0) {
      toast.error("Keranjang kosong!");
      return;
    }

    setIsProcessing(true);
    try {
      const saleId = `POS-${Date.now()}`;

      const recordSaleInDatabase = async (actualPaymentMethod?: string) => {
        const saleInput: CreateSaleInput = {
          admin_id,
          cashier_name: admin_name,
          payment_method:
            actualPaymentMethod || (paymentMethod === "cash" ? "Tunai" : "Online Payment"),
          items: cart,
          subtotal,
          discount,
          tax: 0,
          total,
          notes: notes || undefined,
          customer_name: customerName || undefined,
          order_id: paymentMethod === "online" ? saleId : undefined,
        };

        const result = await createSale({ data: saleInput });
        if (!result.success) {
          throw new Error(result.error);
        }

        const paymentMethodLabel =
          actualPaymentMethod || (paymentMethod === "cash" ? "Tunai" : "Online Payment");

        const receiptData: ReceiptData = {
          store_name,
          sale_id: result.sale_id!,
          date: new Date().toLocaleDateString("id-ID"),
          time: new Date().toLocaleTimeString("id-ID"),
          items: cart.map((item) => ({
            name: item.product_name,
            qty: item.quantity,
            price: item.unit_price,
            subtotal: item.unit_price * item.quantity,
          })),
          subtotal,
          discount,
          tax: 0,
          total,
          payment_method: paymentMethodLabel,
          cashier_name: admin_name,
          customer_name: customerName || undefined,
        };

        if (printerConnected) {
          try {
            await bluetoothPrinter.printReceipt(receiptData);
          } catch {
            toast.warning("Transaksi berhasil, cetak struk gagal");
          }
        }

        toast.success(`Transaksi berhasil! ${result.sale_id}`);
        setCurrentReceiptData(receiptData);
        setShowReceiptDialog(true);
        await loadData();
      };

      if (paymentMethod === "online") {
        const transactionDetails = {
          orderId: saleId,
          grossAmount: total,
          customerName: customerName || "Pelanggan POS",
          customerEmail: "pos.cashier@student.ub.ac.id",
          customerPhone: "081234567890",
          channel: "pos" as const,
          items: cart.map((item) => ({
            id: String(item.product_id || item.id),
            variant_id: item.variant_id,
            name: item.product_name,
            price: item.unit_price,
            quantity: item.quantity,
          })),
        };

        const result = await createOrderAndPayment({ data: transactionDetails });

        if (!result.success || !result.token) {
          throw new Error(result.error || "Gagal membuat pembayaran Midtrans");
        }

        if ((window as any).snap) {
          (window as any).snap.pay(result.token, {
            onSuccess: async (snapResult: any) => {
              toast.success("Pembayaran Online Midtrans Berhasil!");
              const finalPaymentMethod = formatPaymentType(snapResult.payment_type, snapResult);
              await recordSaleInDatabase(finalPaymentMethod);
            },
            onPending: (snapResult: any) => {
              toast.info("Pembayaran Online tertunda. Silakan selesaikan pembayaran Anda.");
            },
            onError: (snapResult: any) => {
              toast.error("Pembayaran Online Midtrans Gagal!");
            },
            onClose: () => {
              toast.warning("Popup pembayaran Online ditutup.");
            },
          });
        } else {
          throw new Error("SDK Midtrans Snap gagal dimuat di browser.");
        }
        setIsProcessing(false);
      } else {
        await recordSaleInDatabase("Tunai");
        setIsProcessing(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Transaksi gagal");
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
    <div className="flex h-full bg-background text-foreground">
      {/* Left: Products 70% */}
      <div className="flex w-[70%] flex-col border-r border-border">
        <div className="shrink-0 space-y-3 border-b border-border p-4 bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk / barcode / slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-input bg-background pl-10 text-ink placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition tracking-wide ${
                categoryFilter === "all"
                  ? "bg-brand-blue text-white shadow-sm"
                  : "bg-cream text-ink border border-border hover:bg-accent"
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(String(cat.id))}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition tracking-wide ${
                  categoryFilter === String(cat.id)
                    ? "bg-brand-blue text-white shadow-sm"
                    : "bg-cream text-ink border border-border hover:bg-accent"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => {
              const stock = getTotalStock(product);
              const sizes = product.variants.filter((v) => v.stock > 0).map((v) => v.size);
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:border-brand-blue hover:shadow-md hover:shadow-brand-blue/5 active:scale-[0.98]"
                >
                  <div className="aspect-square overflow-hidden bg-cream border-b border-border">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-xs font-bold leading-snug text-ink uppercase">
                      {product.name}
                    </p>
                    {sizes.length > 0 && (
                      <p className="mt-1 text-[10px] text-muted-foreground truncate">
                        {sizes.join(", ")}
                      </p>
                    )}
                    <p className="mt-auto pt-2 text-sm font-bold text-brand-orange">
                      Rp {Number(product.price).toLocaleString("id-ID")}
                    </p>
                    <Badge
                      variant="outline"
                      className={`mt-1.5 w-fit text-[10px] font-medium ${
                        stock <= 5
                          ? "border-yellow-600 text-yellow-600 bg-yellow-50"
                          : "border-border text-muted-foreground bg-cream"
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
            <p className="py-12 text-center text-muted-foreground">Produk tidak ditemukan</p>
          )}
        </ScrollArea>
      </div>

      {/* Right: Cart 30% */}
      <div className="flex w-[30%] flex-col bg-card border-l border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-cream">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <ShoppingCart className="h-5 w-5 text-brand-orange" />
            <span className="display text-sm tracking-wider">Keranjang</span>
            {cart.length > 0 && (
              <Badge className="bg-brand-blue text-white hover:bg-brand-blue/90">
                {cart.length}
              </Badge>
            )}
          </div>
          <button onClick={clearCart} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="flex-1 px-4">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keranjang kosong</p>
          ) : (
            <div className="space-y-2 py-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-lg bg-background border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink leading-tight">
                      {item.product_name}
                    </p>
                    <button
                      onClick={() => setCart(cart.filter((c) => c.id !== item.id))}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Rp {item.unit_price.toLocaleString("id-ID")}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="rounded bg-secondary p-1 hover:bg-muted text-ink border border-border"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-ink">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="rounded bg-secondary p-1 hover:bg-muted text-ink border border-border"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="ml-auto text-sm font-bold text-brand-blue">
                      Rp {(item.unit_price * item.quantity).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="shrink-0 space-y-3 border-t border-border p-4 bg-cream/50">
          <Input
            placeholder="Nama pelanggan (opsional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="border-input bg-background text-sm text-ink placeholder:text-muted-foreground"
          />
          <Input
            type="number"
            placeholder="Diskon (Rp)"
            value={discount || ""}
            onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
            className="border-input bg-background text-sm text-ink placeholder:text-muted-foreground"
          />
          <Input
            placeholder="Catatan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border-input bg-background text-sm text-ink placeholder:text-muted-foreground"
          />

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Metode Pembayaran
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "cash" as const, label: "TUNAI", icon: Banknote },
                  { key: "online" as const, label: "ONLINE PAYMENT", icon: CreditCard },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={`flex flex-col items-center gap-1 rounded-lg py-2.5 text-[10px] font-bold tracking-wide transition border ${
                    paymentMethod === key
                      ? key === "cash"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/10"
                        : "bg-blue-50 text-blue-800 border-blue-500 ring-2 ring-blue-500/10"
                      : "bg-background text-muted-foreground border-border hover:bg-cream"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 rounded-lg bg-background border border-border p-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs text-yellow-600 font-semibold">
                <span>Diskon</span>
                <span>-Rp {discount.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between text-md font-extrabold text-ink pt-1 border-t border-border mt-1">
              <span className="display tracking-wider text-xs">TOTAL</span>
              <span className="text-brand-orange">Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <button
            onClick={() => void handleConnectPrinter()}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs transition border ${
              printerConnected
                ? "bg-secondary text-brand-blue border-brand-blue/30 font-medium"
                : "border-border text-muted-foreground hover:bg-cream bg-background"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            {printerConnected ? "Printer Terhubung" : "Hubungkan Printer Bluetooth"}
          </button>

          <Button
            onClick={() => void handlePayment()}
            disabled={cart.length === 0 || isProcessing}
            className="display h-14 w-full bg-ink text-white text-md font-bold tracking-widest uppercase hover:bg-brand-orange transition-all duration-300 disabled:opacity-50 rounded-lg"
            size="lg"
          >
            {isProcessing
              ? "Memproses..."
              : paymentMethod === "online"
                ? "BAYAR SEKARANG"
                : "BAYAR & CETAK STRUK"}
          </Button>
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

      {showReceiptDialog && currentReceiptData && (
        <Dialog open={showReceiptDialog} onOpenChange={(open) => !open && handleCloseReceiptDialog()}>
          <DialogContent className="max-w-md bg-white border-2 border-ink">
            <DialogHeader>
              <DialogTitle className="display text-lg tracking-wider text-ink uppercase text-center">
                Transaksi Berhasil!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 flex flex-col items-center">
              {/* Receipt Preview */}
              <div className="bg-white text-black p-4 w-[280px] shadow-sm border border-gray-200 font-mono text-[10px] leading-relaxed select-none">
                <div className="text-center font-bold mb-2 flex flex-col items-center">
                  <div className="flex justify-center items-center gap-3 mb-1.5">
                    <img
                      src={logoFilkom}
                      alt="Logo FILKOM"
                      className="w-11 h-auto grayscale filter brightness-100 contrast-100"
                    />
                    <img
                      src={logoFM}
                      alt="Logo FM"
                      className="w-11 h-auto grayscale filter brightness-100 contrast-100"
                    />
                  </div>
                  <div className="text-[10px]">FILKOM MERCH</div>
                  <div className="text-[9px] font-normal">Universitas Brawijaya</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="space-y-0.5 text-[9px]">
                  <div>No: {currentReceiptData.sale_id}</div>
                  <div>Tgl: {currentReceiptData.date} {currentReceiptData.time}</div>
                  <div>Kasir: {currentReceiptData.cashier_name}</div>
                  {currentReceiptData.customer_name && (
                    <div>Pelanggan: {currentReceiptData.customer_name}</div>
                  )}
                  <div>Bayar: {currentReceiptData.payment_method}</div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="space-y-1.5">
                  {currentReceiptData.items.map((item, idx) => (
                    <div key={idx} className="text-[9px]">
                      <div className="font-bold">{item.name}</div>
                      <div className="flex justify-between text-[8px]">
                        <span>{item.qty} x Rp {item.price.toLocaleString("id-ID")}</span>
                        <span>Rp {item.subtotal.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="space-y-0.5 text-[9px] font-bold">
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
                  <div className="flex justify-between border-t border-dashed border-black mt-1 pt-1 text-xs">
                    <span>TOTAL:</span>
                    <span>Rp {currentReceiptData.total.toLocaleString("id-ID")}</span>
                  </div>
                </div>
                
                <div className="border-t border-dashed border-black my-2"></div>
                
                <div className="text-center text-[9px] space-y-0.5">
                  <div>Terima kasih telah membeli!</div>
                  <div className="text-[8px] italic font-normal text-gray-500">Wear Your Faculty.</div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex w-full justify-between gap-2 sm:justify-between">
              <Button
                variant="outline"
                onClick={handleCloseReceiptDialog}
                className="border-2 border-ink text-xs font-bold uppercase tracking-wider flex-1"
              >
                Tutup
              </Button>
              <Button
                onClick={() => printBrowserReceipt(currentReceiptData)}
                className="bg-ink hover:bg-brand-orange text-white text-xs font-bold uppercase tracking-widest flex-1 py-5 px-6 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
              >
                <Printer className="mr-2 h-4 w-4" /> Cetak Struk
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
