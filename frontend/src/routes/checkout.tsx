import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, ArrowLeft, Loader2, QrCode, Copy, Check, CreditCard, ChevronUp, ChevronDown, X, Ticket } from "lucide-react";
import { useState, useEffect } from "react";
import logoFilkom from "@/assets/logo_filkom.png";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createOrderAndPayment, getStoreSettings, validateVoucherServerAction } from "@backend/server-actions";
import { Button } from "@frontend/components/ui/button";
import { resolveImageUrl } from "@/lib/image-resolver";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@frontend/components/ui/card";

export interface CartItem {
  id: string;
  product_id: number;
  product_name: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  variant_id?: number;
  category?: string;
  image_url?: string;
  bundle_selections?: Array<{
    product_id: number;
    variant_id: number;
    quantity: number;
  }>;
}

interface CheckoutStep {
  step: number;
  title: string;
}

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
  head: () => ({
    meta: [
      { title: "Checkout — Filkom Merch UB" },
      { name: "description", content: "Checkout and complete your Filkom Merch purchase" },
    ],
  }),
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState(
    user ? (user.type === "buyer" ? user.name : user.username) : ""
  );
  const [customerEmail, setCustomerEmail] = useState(user ? user.email : "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNim, setCustomerNim] = useState(
    user ? (user.nim || "") : ""
  );
  const [streetAddress, setStreetAddress] = useState("");
  const [rtRw, setRtRw] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "shipping">("pickup");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);
  const [summaryDrawerOpen, setSummaryDrawerOpen] = useState(false);
  const [mayarCheckoutUrl, setMayarCheckoutUrl] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [appliedVoucher, setAppliedVoucher] = useState<{
    id: number;
    code: string;
    discount_amount: number;
    min_purchase: number;
    discount_type: "fixed" | "percentage";
    max_discount: number | null;
  } | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const subtotalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = appliedVoucher ? (
    appliedVoucher.discount_type === "percentage"
      ? Math.min(
          Math.round((subtotalAmount * appliedVoucher.discount_amount) / 100),
          appliedVoucher.max_discount && appliedVoucher.max_discount > 0 ? appliedVoucher.max_discount : Infinity
        )
      : appliedVoucher.discount_amount
  ) : 0;
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);

  // If subtotal drops below minimum purchase due to cart items modifications, remove voucher
  useEffect(() => {
    if (appliedVoucher && subtotalAmount < appliedVoucher.min_purchase) {
      setAppliedVoucher(null);
      toast.warning("Voucher dihapus karena minimal pembelian tidak terpenuhi");
    }
  }, [subtotalAmount, appliedVoucher]);

  const [voucherInput, setVoucherInput] = useState("");

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsValidatingVoucher(true);
    try {
      const res = await validateVoucherServerAction({
        data: {
          code: voucherInput.trim().toUpperCase(),
          subtotal: subtotalAmount,
        },
      });

      if (res?.success && res.voucher) {
        setAppliedVoucher(res.voucher);
        toast.success(`Voucher ${res.voucher.code} berhasil digunakan!`);
      } else {
        toast.error(res?.error || "Gagal menggunakan voucher");
        setAppliedVoucher(null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal memverifikasi voucher");
      setAppliedVoucher(null);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
    toast.info("Voucher dihapus");
  };

  const steps: CheckoutStep[] = [
    { step: 1, title: "Review Cart" },
    { step: 2, title: "Customer Details" },
    { step: 3, title: "Payment" },
    { step: 4, title: "Done" },
  ];

  // Sync profile info if user loaded asynchronously
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.type === "buyer" ? user.name : user.username);
      if (!customerEmail) setCustomerEmail(user.email || "");
      if (user.nim && !customerNim) setCustomerNim(user.nim);
    }
  }, [user]);

  const [storeSettings, setStoreSettings] = useState<any>(null);

  useEffect(() => {
    void getStoreSettings().then((res) => {
      if (res?.settings) {
        setStoreSettings(res.settings);
      }
    });
  }, []);

  // Check auth and load cart
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const buyNowVal = (searchParams.get("buyNow") || "").replace(/"/g, "");
    const isBuyNow = buyNowVal === "true";
    const storageKey = isBuyNow ? "buyNowItem" : "cart";

    // Load cart from localStorage
    const savedCart = localStorage.getItem(storageKey);
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch {
        toast.error("Failed to load cart");
      }
    } else {
      toast.error("Your cart is empty");
    }
  }, [user, authLoading, navigate]);



  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-ink" />
      </div>
    );
  }



  const formattedAddress = [
    streetAddress.trim(),
    rtRw.trim() ? `RT/RW ${rtRw.trim()}` : "",
    kelurahan.trim() ? `Kel. ${kelurahan.trim()}` : "",
    kecamatan.trim() ? `Kec. ${kecamatan.trim()}` : "",
    city.trim(),
    province.trim(),
    postalCode.trim() ? `Kode Pos ${postalCode.trim()}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const searchParams = new URLSearchParams(window.location.search);
    const buyNowVal = (searchParams.get("buyNow") || "").replace(/"/g, "");
    const isBuyNow = buyNowVal === "true";
    const storageKey = isBuyNow ? "buyNowItem" : "cart";

    let updatedCart: CartItem[] = [];
    if (newQuantity <= 0) {
      updatedCart = cartItems.filter((item) => item.id !== itemId);
    } else {
      updatedCart = cartItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item));
    }
    setCartItems(updatedCart);
    localStorage.setItem(storageKey, JSON.stringify(updatedCart));

    if (!isBuyNow) {
      try {
        const indexSaved = localStorage.getItem("indexCart");
        if (indexSaved) {
          let indexCart = JSON.parse(indexSaved);
          if (newQuantity <= 0) {
            indexCart = indexCart.filter((i: any) => i.id !== itemId);
          } else {
            indexCart = indexCart.map((i: any) => i.id === itemId ? { ...i, qty: newQuantity } : i);
          }
          localStorage.setItem("indexCart", JSON.stringify(indexCart));
          window.dispatchEvent(new Event("cart-updated"));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    const buyNowVal = (searchParams.get("buyNow") || "").replace(/"/g, "");
    const isBuyNow = buyNowVal === "true";
    const storageKey = isBuyNow ? "buyNowItem" : "cart";

    const updatedCart = cartItems.filter((item) => item.id !== itemId);
    setCartItems(updatedCart);
    localStorage.setItem(storageKey, JSON.stringify(updatedCart));

    if (!isBuyNow) {
      try {
        const indexSaved = localStorage.getItem("indexCart");
        if (indexSaved) {
          const indexCart = JSON.parse(indexSaved).filter((i: any) => i.id !== itemId);
          localStorage.setItem("indexCart", JSON.stringify(indexCart));
          window.dispatchEvent(new Event("cart-updated"));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const validateStep = (): boolean => {
    if (currentStep === 1) {
      if (cartItems.length === 0) {
        toast.error("Your cart is empty");
        return false;
      }
      // Validasi variant_id untuk mencegah error API
      for (const item of cartItems) {
        if (!item.variant_id || typeof item.variant_id !== "number" || item.variant_id <= 0) {
          toast.error(`Produk "${item.name}" memiliki varian tidak valid. Silakan hapus dan tambahkan kembali ke keranjang.`);
          return false;
        }
      }
    }
    if (currentStep === 2) {
      const finalName = customerName.trim() || (user ? (user.type === "buyer" ? user.name : user.username) : "");
      const finalEmail = customerEmail.trim() || user?.email || "";

      if (!finalName) {
        toast.error("Please enter your name");
        return false;
      }
      if (!finalEmail) {
        toast.error("Please enter your email");
        return false;
      }
      if (!customerPhone.trim()) {
        toast.error("Please enter your phone number");
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalEmail)) {
        toast.error("Please enter a valid email");
        return false;
      }
      if (fulfillmentType === "shipping") {
        if (!streetAddress.trim()) {
          toast.error("Nama Jalan & No Rumah wajib diisi!");
          return false;
        }
        if (!kelurahan.trim()) {
          toast.error("Kelurahan wajib diisi!");
          return false;
        }
        if (!kecamatan.trim()) {
          toast.error("Kecamatan wajib diisi!");
          return false;
        }
        if (!city.trim()) {
          toast.error("Kota/Kabupaten wajib diisi!");
          return false;
        }
        if (!province.trim()) {
          toast.error("Provinsi wajib diisi!");
          return false;
        }
        if (!postalCode.trim()) {
          toast.error("Kode Pos wajib diisi!");
          return false;
        }
      }
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateStep()) return;

    setIsProcessing(true);
    const newOrderId = `FILKOM-${Date.now()}`;
    setOrderId(newOrderId);

    try {
      const parsedId = Number(user?.id);
      const buyerUserId =
        Number.isInteger(parsedId) &&
          parsedId > 0 &&
          parsedId <= 2147483647
          ? parsedId
          : undefined;

      const finalName = customerName.trim() || (user ? (user.type === "buyer" ? user.name : user.username) : "");
      const finalEmail = customerEmail.trim() || user?.email || "";
      const finalNim = customerNim.trim() || (user ? user.nim : "") || "";

      const transactionDetails = {
        orderId: newOrderId,
        grossAmount: totalAmount,
        discountAmount: discountAmount,
        voucherCode: appliedVoucher?.code || undefined,
        customerName: finalName,
        customerNim: finalNim || undefined,
        customerEmail: finalEmail,
        customerPhone: customerPhone.trim(),
        shippingAddress:
          fulfillmentType === "pickup" ? "Ambil di FILKOM Merch (gratis)" : formattedAddress,
        fulfillmentType,
        items: cartItems,
        userId: buyerUserId,
      };

      const isManualQris = storeSettings?.payment_mode === "manual_qris";

      if (isManualQris) {
        // Save to localStorage as a pending order, don't create in database yet
        localStorage.setItem(`pending_order_${newOrderId}`, JSON.stringify(transactionDetails));

        // Clear cart dari localStorage
        const searchParams = new URLSearchParams(window.location.search);
        const buyNowVal = (searchParams.get("buyNow") || "").replace(/"/g, "");
        const isBuyNow = buyNowVal === "true";

        if (isBuyNow) {
          localStorage.removeItem("buyNowItem");
        } else {
          localStorage.removeItem("cart");
          localStorage.removeItem("indexCart");
          window.dispatchEvent(new Event("cart-updated"));
        }

        toast.success("Pesanan berhasil disiapkan! Silakan lakukan pembayaran QRIS.");
        void navigate({ to: "/order-confirmation", search: { orderId: newOrderId } });
      } else {
        // Call server function untuk create order di database dan generate QRIS
        const result = await createOrderAndPayment({ data: transactionDetails });

        if (!result.success) {
          throw new Error(result.error || "Failed to create payment");
        }

        // Clear cart dari localStorage
        const searchParams = new URLSearchParams(window.location.search);
        const buyNowVal = (searchParams.get("buyNow") || "").replace(/"/g, "");
        const isBuyNow = buyNowVal === "true";

        if (isBuyNow) {
          localStorage.removeItem("buyNowItem");
        } else {
          localStorage.removeItem("cart");
          localStorage.removeItem("indexCart");
          window.dispatchEvent(new Event("cart-updated"));
        }

        if (result.checkoutUrl) {
          // Mayar payment — show iframe modal
          setMayarCheckoutUrl(result.checkoutUrl);
          setShowPaymentModal(true);
          setIsProcessing(false);
        } else {
          toast.success("Pesanan berhasil dibuat!");
          void navigate({ to: "/order-confirmation", search: { orderId: newOrderId } });
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0 && !isProcessing) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
          </div>
        </div>

        {/* Empty Cart */}
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">Your cart is empty</h2>
            <p className="mb-6 text-muted-foreground">Add some items to get started</p>
            <Button asChild>
              <a href="/">Continue Shopping</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <a href="/">
                  <ArrowLeft className="h-5 w-5" />
                </a>
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Checkout</h1>
            </div>
            <div className="flex items-center gap-2">
              <img src={logoFilkom} alt="Logo FILKOM" className="h-10 w-10 object-contain" />
              <span className="hidden sm:inline text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Official Store UB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps Indicator Bar */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {steps.map((s, index) => (
              <div key={s.step} className="flex items-center flex-1 min-w-0">
                <div
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-bold shrink-0 ${currentStep >= s.step
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                    }`}
                >
                  {s.step}
                </div>
                <div className="ml-2 hidden text-xs sm:text-sm font-bold sm:block truncate">{s.title}</div>
                {index < steps.length - 1 && (
                  <div
                    className={`ml-1.5 sm:ml-4 h-1 flex-1 rounded-full transition-colors ${currentStep > s.step ? "bg-primary" : "bg-muted"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
          {/* Active step title mobile badge */}
          <div className="mt-2 text-center sm:hidden">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Langkah {currentStep} dari 4:{" "}
              <span className="text-primary font-bold">{steps.find((s) => s.step === currentStep)?.title}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-3.5 sm:px-6 py-6 sm:py-8 pb-36 lg:pb-8 w-full min-w-0">
        <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Left Section */}
          <div className={`${currentStep === 1 ? "lg:col-span-3" : "lg:col-span-2"} min-w-0 pr-1 sm:pr-0`}>
            {currentStep === 1 && (
              <CartReviewStep
                items={cartItems}
                onQuantityChange={handleQuantityChange}
                onRemoveItem={handleRemoveItem}
              />
            )}
            {currentStep === 2 && (
              <CustomerDetailsStep
                name={customerName}
                email={customerEmail}
                phone={customerPhone}
                nim={customerNim}
                streetAddress={streetAddress}
                rtRw={rtRw}
                kelurahan={kelurahan}
                kecamatan={kecamatan}
                city={city}
                province={province}
                postalCode={postalCode}
                fulfillmentType={fulfillmentType}
                onNameChange={setCustomerName}
                onEmailChange={setCustomerEmail}
                onPhoneChange={setCustomerPhone}
                onNimChange={setCustomerNim}
                onStreetAddressChange={setStreetAddress}
                onRtRwChange={setRtRw}
                onKelurahanChange={setKelurahan}
                onKecamatanChange={setKecamatan}
                onCityChange={setCity}
                onProvinceChange={setProvince}
                onPostalCodeChange={setPostalCode}
                onFulfillmentTypeChange={setFulfillmentType}
              />
            )}
            {currentStep === 3 && (
              <PaymentReviewStep
                items={cartItems}
                customer={{
                  name: customerName,
                  nim: customerNim,
                  email: customerEmail,
                  phone: customerPhone,
                  address:
                    fulfillmentType === "pickup"
                      ? "Ambil di FILKOM Merch (gratis)"
                      : formattedAddress,
                }}
              />
            )}
            {currentStep === 4 && qrUrl && (
              <QrCodePaymentStep qrUrl={qrUrl} orderId={orderId} customerName={customerName} />
            )}

            {/* Navigation Buttons (Desktop only, for step 4 or general layout) */}
            <div className="mt-6 sm:mt-8 hidden lg:flex flex-col sm:flex-row gap-3 sm:gap-4">
              {currentStep > 1 && currentStep < 4 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="w-full sm:w-auto h-11 sm:h-10 text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer border-2 border-ink hover:bg-cream"
                >
                  ← Kembali
                </Button>
              )}
              {currentStep < 3 && (
                <Button
                  onClick={() => {
                    if (validateStep()) {
                      setCurrentStep(currentStep + 1);
                    }
                  }}
                  className="w-full sm:flex-1 h-11 sm:h-10 text-xs sm:text-sm font-bold uppercase tracking-wider cursor-pointer bg-ink text-white hover:bg-brand-orange"
                >
                  Lanjut →
                </Button>
              )}
              {currentStep === 3 && (
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full flex-1 h-12 sm:h-10 bg-ink text-white hover:bg-brand-orange font-bold uppercase tracking-wider text-xs sm:text-sm cursor-pointer shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses Pembayaran...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Bayar Sekarang
                    </>
                  )}
                </Button>
              )}
              {currentStep === 4 && (
                <Button asChild className="w-full flex-1 h-11 sm:h-10 font-bold uppercase cursor-pointer">
                  <a href="/">Selesai</a>
                </Button>
              )}
            </div>
          </div>

          {/* Right Section - Order Summary (Desktop Side Column) */}
          {currentStep > 1 && (
            <div className="hidden lg:block lg:col-span-1">
              <Card className="sticky top-4 border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
                <CardHeader className="bg-cream/20 border-b-2 border-ink py-4">
                  <CardTitle className="display text-xs tracking-wider uppercase text-ink">Ringkasan Pesanan</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs font-bold border-b border-muted pb-2 last:border-0 last:pb-0 text-ink gap-2">
                      <span className="truncate flex-1 min-w-0 mr-2 text-left">
                        {item.name} <span className="text-muted-foreground font-normal">× {item.quantity}</span>
                      </span>
                      <span className="shrink-0 font-extrabold text-brand-orange">
                        Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}

                  {/* Voucher Input */}
                  <div className="border-t-2 border-ink pt-4 pb-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-ink uppercase tracking-widest flex items-center gap-1">
                        <Ticket className="w-3 h-3 text-brand-orange" /> Kode Voucher
                      </label>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="Masukkan kode"
                          value={voucherInput}
                          onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                          disabled={!!appliedVoucher}
                          className="h-8 uppercase text-[10px] border-2 border-ink font-bold tracking-wider rounded-lg"
                        />
                        {appliedVoucher ? (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={handleRemoveVoucher}
                            className="h-8 text-[10px] font-bold px-2.5 shrink-0 rounded-lg cursor-pointer"
                          >
                            Hapus
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleApplyVoucher}
                            disabled={!voucherInput.trim() || isValidatingVoucher}
                            className="h-8 text-[10px] font-bold bg-ink text-white hover:bg-brand-orange px-3 shrink-0 rounded-lg cursor-pointer"
                          >
                            {isValidatingVoucher ? "..." : "Pakai"}
                          </Button>
                        )}
                      </div>
                      {appliedVoucher && (
                        <p className="text-[10px] text-emerald-600 font-bold">
                          ✓ Diskon {appliedVoucher.discount_type === "percentage" ? `${appliedVoucher.discount_amount}%` : `Rp ${appliedVoucher.discount_amount.toLocaleString("id-ID")}`} berhasil diterapkan
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t-2 border-ink pt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-semibold">Metode Pengiriman:</span>
                      <span className="font-black text-ink uppercase tracking-wider text-[10px]">
                        {fulfillmentType === "pickup" ? "Ambil Sendiri" : "Diantar Kurir"}
                      </span>
                    </div>
                    {fulfillmentType === "shipping" ? (
                      <div className="flex justify-between text-[11px] text-brand-orange bg-brand-orange/5 p-2.5 rounded-lg border border-brand-orange/20">
                        <span>Ongkir:</span>
                        <span className="font-bold text-right">Info Jarak via WhatsApp</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[11px] text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        <span>Ongkir:</span>
                        <span className="font-bold">GRATIS</span>
                      </div>
                    )}

                    {/* Subtotal + Discount breakdown */}
                    {appliedVoucher && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span className="font-bold text-ink">Rp {subtotalAmount.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                          <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> Voucher ({appliedVoucher.code}):</span>
                          <span className="font-bold">- Rp {discountAmount.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between font-semibold pt-4 border-t border-dashed border-ink/20">
                      <span className="text-xs uppercase font-extrabold text-ink">Total</span>
                      <div className="text-right">
                        <span className="text-lg font-black text-brand-orange">
                          Rp {totalAmount.toLocaleString("id-ID")}
                        </span>
                        {fulfillmentType === "shipping" && (
                          <span className="text-[9px] text-muted-foreground block font-normal italic mt-0.5">
                            (Belum termasuk ongkir)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {currentStep === 3 && (
                    storeSettings?.payment_mode === "manual_qris" ? (
                      <div className="hidden rounded-lg bg-amber-50 p-3 text-xs text-amber-950 border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] space-y-1.5">
                        <p className="font-extrabold uppercase text-[10px] text-amber-900">
                          📷 Pembayaran QRIS Statis (Manual)
                        </p>
                        <p className="text-amber-900/90 leading-relaxed text-[11px]">
                          Scan kode QRIS statis dan upload foto bukti transfer. Pembayaran akan diverifikasi secara manual oleh admin toko.
                        </p>
                      </div>

                    ) : (
                      <div className="rounded-lg bg-[#FCFAF7] p-3 text-xs text-ink border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] space-y-1.5">
                        <p className="font-extrabold uppercase text-[10px] text-brand-orange">
                          💳 Online Payment — Mayar (Otomatis)
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-[11px]">
                          Mendukung pembayaran serba otomatis via Virtual Account Bank (BCA, Mandiri, BRI, BNI), QRIS Dinamis, E-Wallet (GoPay, OVO, Dana, ShopeePay), dan Kartu Kredit.
                        </p>
                      </div>
                    )
                  )}

                  {currentStep === 4 && (
                    <div className="rounded-lg bg-green-50 p-3 text-xs text-green-900">
                      <p className="font-semibold">✓ QR Code Ready</p>
                      <p className="mt-1">Scan dengan aplikasi pembayaran pilihan Anda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Mobile Sticky Bottom Bar (Fixed at screen bottom for Mobile & Tablet <1024px) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t-2 border-ink p-3 shadow-[0px_-4px_16px_rgba(0,0,0,0.15)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            {/* Price & Summary Drawer Toggle */}
            <button
              type="button"
              onClick={() => setSummaryDrawerOpen(true)}
              className="flex flex-col text-left cursor-pointer group pr-2 border-r border-ink/10 shrink-0"
            >
              <div className="flex items-center gap-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider group-hover:text-brand-orange transition-colors">
                <span>Rincian ({cartItems.reduce((s, i) => s + i.quantity, 0)})</span>
                <ChevronUp className="w-3 h-3 text-brand-orange animate-bounce" />
              </div>
              <span className="text-sm sm:text-base font-black text-brand-orange leading-tight">
                Rp {totalAmount.toLocaleString("id-ID")}
              </span>
            </button>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              {currentStep > 1 && currentStep < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="h-10 text-xs font-bold uppercase border-2 border-ink shrink-0 px-2.5 cursor-pointer hover:bg-cream"
                >
                  ←
                </Button>
              )}

              {currentStep < 3 && (
                <Button
                  onClick={() => {
                    if (validateStep()) {
                      setCurrentStep(currentStep + 1);
                    }
                  }}
                  className="flex-1 max-w-[200px] h-10 text-xs font-bold uppercase tracking-wider bg-ink text-white hover:bg-brand-orange shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
                >
                  Lanjut →
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="flex-1 max-w-[220px] h-10 bg-ink text-white hover:bg-brand-orange font-bold uppercase tracking-wider text-xs shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                      Bayar Sekarang
                    </>
                  )}
                </Button>
              )}

              {currentStep === 4 && (
                <Button asChild className="flex-1 max-w-[180px] h-10 font-bold uppercase text-xs cursor-pointer">
                  <a href="/">Selesai</a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Pop-Up Drawer Modal for Order Breakdown */}
        {summaryDrawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
              className="fixed inset-0"
              onClick={() => setSummaryDrawerOpen(false)}
            />
            <div className="relative w-full max-w-lg bg-card rounded-t-2xl border-t-2 border-x-2 border-ink p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <div>
                  <h3 className="display text-xs uppercase tracking-wider text-ink font-bold">Rincian Pesanan</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    {cartItems.reduce((s, i) => s + i.quantity, 0)} produk di keranjang
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSummaryDrawerOpen(false)}
                  className="p-1.5 rounded-full border border-ink/20 hover:bg-muted text-ink cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Cart itemized list */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border-b border-muted pb-2.5 last:border-0 last:pb-0">
                    <div className="w-12 h-14 bg-cream border border-ink rounded overflow-hidden shrink-0">
                      {item.image_url || (item as any).img ? (
                        <img src={resolveImageUrl(item.image_url || (item as any).img)} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-ink leading-tight truncate">{item.name}</p>
                      {item.size && (
                        <span className="inline-block text-[9px] font-bold text-muted-foreground mt-0.5">
                          Ukuran: {item.size}
                        </span>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantity} × Rp {item.price.toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="font-extrabold text-xs text-brand-orange shrink-0">
                      Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Voucher Input (Mobile) */}
              <div className="border-t-2 border-ink pt-3 pb-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-ink uppercase tracking-widest flex items-center gap-1">
                    <Ticket className="w-3 h-3 text-brand-orange" /> Kode Voucher
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Masukkan kode"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      disabled={!!appliedVoucher}
                      className="h-8 uppercase text-[10px] border-2 border-ink font-bold tracking-wider rounded-lg"
                    />
                    {appliedVoucher ? (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleRemoveVoucher}
                        className="h-8 text-[10px] font-bold px-2.5 shrink-0 rounded-lg cursor-pointer"
                      >
                        Hapus
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleApplyVoucher}
                        disabled={!voucherInput.trim() || isValidatingVoucher}
                        className="h-8 text-[10px] font-bold bg-ink text-white hover:bg-brand-orange px-3 shrink-0 rounded-lg cursor-pointer"
                      >
                        {isValidatingVoucher ? "..." : "Pakai"}
                      </Button>
                    )}
                  </div>
                  {appliedVoucher && (
                    <p className="text-[10px] text-emerald-600 font-bold">
                      ✓ Diskon {appliedVoucher.discount_type === "percentage" ? `${appliedVoucher.discount_amount}%` : `Rp ${appliedVoucher.discount_amount.toLocaleString("id-ID")}`} berhasil diterapkan
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery & Total */}
              <div className="border-t-2 border-ink pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Pengiriman:</span>
                  <span className="font-bold text-ink uppercase text-[10px]">
                    {fulfillmentType === "pickup" ? "Ambil di Kampus (Gratis)" : "Kurir (Ada Ongkir)"}
                  </span>
                </div>

                {/* Subtotal + Discount breakdown (Mobile) */}
                {appliedVoucher && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-bold text-ink">Rp {subtotalAmount.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> Voucher ({appliedVoucher.code}):</span>
                      <span className="font-bold">- Rp {discountAmount.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center font-extrabold text-sm pt-2 border-t border-dashed border-ink/20">
                  <span>Total Tagihan</span>
                  <span className="text-base text-brand-orange font-black">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setSummaryDrawerOpen(false)}
                className="w-full h-11 bg-ink text-white font-bold uppercase tracking-wider text-xs rounded-xl cursor-pointer"
              >
                Tutup Rincian
              </Button>
            </div>
          </div>
        )}

        {/* Mayar Payment Gateway Modal */}
        {showPaymentModal && mayarCheckoutUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-2xl bg-card rounded-2xl border-2 border-ink shadow-2xl overflow-hidden mx-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b-2 border-ink bg-cream/20">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-orange" />
                  <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-ink">
                    Pembayaran Online — Mayar
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    toast.warning("Anda menutup popup pembayaran. Silakan selesaikan dari halaman pesanan.");
                    void navigate({ to: "/order-confirmation", search: { orderId: orderId || "" } });
                  }}
                  className="p-1.5 rounded-full border border-ink/20 hover:bg-red-50 hover:border-red-300 text-ink hover:text-red-600 transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Mayar Iframe */}
              <iframe
                src={mayarCheckoutUrl}
                className="w-full h-[600px] sm:h-[650px] border-none"
                title="Mayar Payment Gateway"
                allow="payment"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CartReviewStepProps {
  items: CartItem[];
  onQuantityChange: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
}

function CartReviewStep({ items, onQuantityChange, onRemoveItem }: CartReviewStepProps) {
  return (
    <Card className="border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
      <CardHeader className="bg-cream/20 border-b-2 border-ink py-3.5 sm:py-4 px-4 sm:px-6">
        <CardTitle className="display text-sm tracking-wider uppercase text-ink">Keranjang Belanja</CardTitle>
        <CardDescription className="text-xs">Periksa kembali item belanjaan Anda sebelum melanjutkan</CardDescription>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-6">
        <div className="space-y-3.5 sm:space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border-2 border-ink p-3.5 sm:p-4 gap-3 sm:gap-4 bg-white shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] max-w-full overflow-hidden"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-16 h-20 bg-cream border-2 border-ink rounded overflow-hidden flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(27,27,27,1)]">
                  {item.image_url || (item as any).img ? (
                    <img src={resolveImageUrl(item.image_url || (item as any).img)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-sm text-ink normal-case leading-snug truncate">{item.name}</h3>
                  <p className="text-[10px] uppercase font-bold text-brand-orange tracking-wider mt-1">{item.category}</p>
                  {item.size && (
                    <span className="inline-block text-[10px] font-bold bg-cream border border-ink/20 px-2 py-0.5 rounded-full mt-1.5 text-ink">
                      Ukuran: {item.size}
                    </span>
                  )}
                  <p className="mt-2 font-black text-ink text-sm">
                    Rp {item.price.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="flex items-center gap-2 border-2 border-ink rounded-lg bg-cream/15 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 font-bold border-0 hover:bg-ink hover:text-cream cursor-pointer"
                    onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-bold text-xs text-ink">{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 font-bold border-0 hover:bg-ink hover:text-cream cursor-pointer"
                    onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-xs uppercase cursor-pointer"
                  onClick={() => onRemoveItem(item.id)}
                >
                  Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface CustomerDetailsStepProps {
  name: string;
  nim: string;
  email: string;
  phone: string;
  streetAddress: string;
  rtRw: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postalCode: string;
  fulfillmentType: "pickup" | "shipping";
  onNameChange: (value: string) => void;
  onNimChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onStreetAddressChange: (value: string) => void;
  onRtRwChange: (value: string) => void;
  onKelurahanChange: (value: string) => void;
  onKecamatanChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onFulfillmentTypeChange: (value: "pickup" | "shipping") => void;
}

function CustomerDetailsStep({
  name,
  nim,
  email,
  phone,
  streetAddress,
  rtRw,
  kelurahan,
  kecamatan,
  city,
  province,
  postalCode,
  fulfillmentType,
  onNameChange,
  onNimChange,
  onEmailChange,
  onPhoneChange,
  onStreetAddressChange,
  onRtRwChange,
  onKelurahanChange,
  onKecamatanChange,
  onCityChange,
  onProvinceChange,
  onPostalCodeChange,
  onFulfillmentTypeChange,
}: CustomerDetailsStepProps) {
  const { user } = useAuth();

  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [villages, setVillages] = useState<{ id: string; name: string }[]>([]);

  const [provId, setProvId] = useState("");
  const [cityId, setCityId] = useState("");
  const [distId, setDistId] = useState("");
  const [villId, setVillId] = useState("");

  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingVill, setLoadingVill] = useState(false);

  const [apiFailed, setApiFailed] = useState(false);

  const toTitleCase = (str: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Load provinces on mount/shipping selection
  useEffect(() => {
    if (fulfillmentType === "shipping" && provinces.length === 0) {
      setLoadingProv(true);
      fetch("https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@gh-pages/api/provinces.json")
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          setProvinces(data);
          setApiFailed(false);
        })
        .catch(() => {
          setApiFailed(true);
        })
        .finally(() => {
          setLoadingProv(false);
        });
    }
  }, [fulfillmentType]);

  // Fetch cities when provId changes
  useEffect(() => {
    if (provId) {
      setLoadingCity(true);
      setCities([]);
      setDistricts([]);
      setVillages([]);
      setCityId("");
      setDistId("");
      setVillId("");
      fetch(`https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@gh-pages/api/regencies/${provId}.json`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => setCities(data))
        .catch(() => setApiFailed(true))
        .finally(() => setLoadingCity(false));
    }
  }, [provId]);

  // Fetch districts when cityId changes
  useEffect(() => {
    if (cityId) {
      setLoadingDist(true);
      setDistricts([]);
      setVillages([]);
      setDistId("");
      setVillId("");
      fetch(`https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@gh-pages/api/districts/${cityId}.json`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => setDistricts(data))
        .catch(() => setApiFailed(true))
        .finally(() => setLoadingDist(false));
    }
  }, [cityId]);

  // Fetch villages when distId changes
  useEffect(() => {
    if (distId) {
      setLoadingVill(true);
      setVillages([]);
      setVillId("");
      fetch(`https://cdn.jsdelivr.net/gh/emsifa/api-wilayah-indonesia@gh-pages/api/villages/${distId}.json`)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => setVillages(data))
        .catch(() => setApiFailed(true))
        .finally(() => setLoadingVill(false));
    }
  }, [distId]);

  return (
    <Card className="border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
      <CardHeader className="bg-cream/20 border-b-2 border-ink py-4">
        <CardTitle className="display text-sm tracking-wider uppercase text-ink">
          Informasi Pelanggan
        </CardTitle>
        <CardDescription className="text-xs">
          Lengkapi informasi untuk pengambilan dan pembayaran
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-6 text-ink">
        {/* User Auth Session Info Card */}
        {user && (
          <div className="bg-[#FCFAF7] border-2 border-ink p-4 rounded-xl text-ink text-xs space-y-2 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black uppercase tracking-wider text-[10px] text-emerald-700">
                Akun Terverifikasi
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-ink/10">
              <div>
                <span className="text-muted-foreground font-bold block text-[10px] uppercase">Email Anda</span>
                <span className="font-semibold">{user.email}</span>
              </div>
              {user.nim && (
                <div>
                  <span className="text-muted-foreground font-bold block text-[10px] uppercase">NIM Anda</span>
                  <span className="font-mono font-semibold text-brand-orange">{user.nim}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="font-bold text-xs uppercase">
            Nama Lengkap *
          </Label>
          <Input
            id="name"
            placeholder="Nama Lengkap"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="border-2 border-ink bg-white font-bold text-xs p-5"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="font-bold text-xs uppercase">
            Nomor WhatsApp *
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Contoh: 08123456789"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="border-2 border-ink bg-white font-mono text-xs p-5"
          />
        </div>

        {/* Pilihan Metode Pengambilan / Pengiriman */}
        <div className="space-y-3">
          <Label className="font-bold text-xs uppercase">Metode Pengambilan / Pengiriman *</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onFulfillmentTypeChange("pickup")}
              className={`flex flex-col text-left p-4 rounded-xl border-2 transition cursor-pointer ${fulfillmentType === "pickup"
                ? "border-ink bg-cream/40 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] font-bold"
                : "border-border bg-white hover:border-ink/50 hover:bg-cream/10"
                }`}
            >
              <span className="font-extrabold text-sm text-ink">Ambil di FILKOM Merch</span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase mt-1">GRATIS</span>
              <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
                Ambil langsung di toko fisik FILKOM Merch UB.
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFulfillmentTypeChange("shipping")}
              className={`flex flex-col text-left p-4 rounded-xl border-2 transition cursor-pointer ${fulfillmentType === "shipping"
                ? "border-ink bg-cream/40 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] font-bold"
                : "border-border bg-white hover:border-ink/50 hover:bg-cream/10"
                }`}
            >
              <span className="font-extrabold text-sm text-ink">Diantar (Kurir)</span>
              <span className="text-[10px] text-brand-orange font-bold uppercase mt-1">
                Ada Ongkir (Jarak)
              </span>
              <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
                Kirim ke alamat Anda, info tarif ongkos kirim akan dikomunikasikan via WhatsApp.
              </span>
            </button>
          </div>
        </div>

        {fulfillmentType === "shipping" && (
          <div className="space-y-4 border-2 border-ink bg-[#FCFAF7] p-4 rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] animate-fade-in">
            <h3 className="font-extrabold text-xs uppercase text-brand-orange">
              Alamat Pengiriman Lengkap *
            </h3>
            {apiFailed && (
              <p className="text-[10px] text-red-500 font-bold bg-red-50 border border-red-200 p-2 rounded">
                ⚠️ Sistem wilayah otomatis sedang offline, silakan isi alamat secara manual di bawah ini.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="streetAddress" className="font-bold text-[10px] uppercase text-ink">
                Nama Jalan / No Rumah *
              </Label>
              <Input
                id="streetAddress"
                placeholder="Contoh: Jl. Veteran No. 8"
                value={streetAddress}
                onChange={(e) => onStreetAddressChange(e.target.value)}
                className="border-2 border-ink bg-white font-medium text-xs p-3.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rtRw" className="font-bold text-[10px] uppercase text-ink">
                  RT / RW (Opsional)
                </Label>
                <Input
                  id="rtRw"
                  placeholder="Contoh: 02/04"
                  value={rtRw}
                  onChange={(e) => onRtRwChange(e.target.value)}
                  className="border-2 border-ink bg-white font-medium text-xs p-3.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode" className="font-bold text-[10px] uppercase text-ink">
                  Kode Pos *
                </Label>
                <Input
                  id="postalCode"
                  placeholder="Contoh: 65145"
                  value={postalCode}
                  onChange={(e) => onPostalCodeChange(e.target.value)}
                  className="border-2 border-ink bg-white font-medium text-xs p-3.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province" className="font-bold text-[10px] uppercase text-ink">
                  Provinsi *
                </Label>
                {apiFailed ? (
                  <Input
                    id="province"
                    placeholder="Contoh: Jawa Timur"
                    value={province}
                    onChange={(e) => onProvinceChange(e.target.value)}
                    className="border-2 border-ink bg-white font-medium text-xs p-3.5"
                  />
                ) : (
                  <select
                    id="province"
                    value={provId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setProvId(id);
                      const matched = provinces.find((p) => p.id === id);
                      onProvinceChange(matched ? toTitleCase(matched.name) : "");
                      onCityChange("");
                      onKecamatanChange("");
                      onKelurahanChange("");
                    }}
                    className="w-full border-2 border-ink bg-white font-bold text-xs p-3 rounded-lg focus:outline-none cursor-pointer"
                    disabled={loadingProv}
                  >
                    <option value="">{loadingProv ? "Memuat..." : "-- Pilih Provinsi --"}</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {toTitleCase(p.name)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="font-bold text-[10px] uppercase text-ink">
                  Kota / Kabupaten *
                </Label>
                {apiFailed ? (
                  <Input
                    id="city"
                    placeholder="Contoh: Malang"
                    value={city}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="border-2 border-ink bg-white font-medium text-xs p-3.5"
                  />
                ) : (
                  <select
                    id="city"
                    value={cityId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setCityId(id);
                      const matched = cities.find((c) => c.id === id);
                      onCityChange(matched ? toTitleCase(matched.name) : "");
                      onKecamatanChange("");
                      onKelurahanChange("");
                    }}
                    className="w-full border-2 border-ink bg-white font-bold text-xs p-3 rounded-lg focus:outline-none cursor-pointer"
                    disabled={!provId || loadingCity}
                  >
                    <option value="">{loadingCity ? "Memuat..." : provId ? "-- Pilih Kota/Kabupaten --" : "-- Pilih Provinsi Dulu --"}</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {toTitleCase(c.name)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kecamatan" className="font-bold text-[10px] uppercase text-ink">
                  Kecamatan *
                </Label>
                {apiFailed ? (
                  <Input
                    id="kecamatan"
                    placeholder="Kecamatan"
                    value={kecamatan}
                    onChange={(e) => onKecamatanChange(e.target.value)}
                    className="border-2 border-ink bg-white font-medium text-xs p-3.5"
                  />
                ) : (
                  <select
                    id="kecamatan"
                    value={distId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setDistId(id);
                      const matched = districts.find((d) => d.id === id);
                      onKecamatanChange(matched ? toTitleCase(matched.name) : "");
                      onKelurahanChange("");
                    }}
                    className="w-full border-2 border-ink bg-white font-bold text-xs p-3 rounded-lg focus:outline-none cursor-pointer"
                    disabled={!cityId || loadingDist}
                  >
                    <option value="">{loadingDist ? "Memuat..." : cityId ? "-- Pilih Kecamatan --" : "-- Pilih Kota Dulu --"}</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {toTitleCase(d.name)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="kelurahan" className="font-bold text-[10px] uppercase text-ink">
                  Desa / Kelurahan *
                </Label>
                {apiFailed ? (
                  <Input
                    id="kelurahan"
                    placeholder="Kelurahan"
                    value={kelurahan}
                    onChange={(e) => onKelurahanChange(e.target.value)}
                    className="border-2 border-ink bg-white font-medium text-xs p-3.5"
                  />
                ) : (
                  <select
                    id="kelurahan"
                    value={villId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setVillId(id);
                      const matched = villages.find((v) => v.id === id);
                      onKelurahanChange(matched ? toTitleCase(matched.name) : "");
                    }}
                    className="w-full border-2 border-ink bg-white font-bold text-xs p-3 rounded-lg focus:outline-none cursor-pointer"
                    disabled={!distId || loadingVill}
                  >
                    <option value="">{loadingVill ? "Memuat..." : distId ? "-- Pilih Kelurahan/Desa --" : "-- Pilih Kecamatan Dulu --"}</option>
                    {villages.map((v) => (
                      <option key={v.id} value={v.id}>
                        {toTitleCase(v.name)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PaymentReviewStepProps {
  items: CartItem[];
  customer: {
    name: string;
    nim: string;
    email: string;
    phone: string;
    address: string;
  };
}

function PaymentReviewStep({ items, customer }: PaymentReviewStepProps) {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
        <CardHeader className="bg-cream/20 border-b-2 border-ink py-4">
          <CardTitle className="display text-sm tracking-wider uppercase text-ink">Detail Pesanan Anda</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center justify-between border-b border-muted pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-16 bg-cream border-2 border-ink rounded overflow-hidden flex items-center justify-center shrink-0">
                  {item.image_url || (item as any).img ? (
                    <img src={resolveImageUrl(item.image_url || (item as any).img)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink leading-tight truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {item.quantity} x Rp {item.price.toLocaleString("id-ID")}
                  </p>
                  {item.size && (
                    <span className="inline-block text-[9px] font-bold bg-cream border border-ink/20 px-1.5 py-0.2 rounded-full mt-1 text-ink">
                      Ukuran: {item.size}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-extrabold text-sm text-brand-orange self-end sm:self-center shrink-0 mt-1 sm:mt-0">
                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
        <CardHeader className="bg-cream/20 border-b-2 border-ink py-4">
          <CardTitle className="display text-sm tracking-wider uppercase text-ink">Informasi Pengiriman</CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-6 space-y-3 text-xs text-ink font-medium">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-ink/10 pb-3">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Penerima</span>
              <span className="font-bold text-sm truncate block">{customer.name}</span>
            </div>
            {customer.nim && (
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">NIM</span>
                <span className="font-mono font-bold text-brand-orange truncate block">{customer.nim}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-ink/10 pb-3">
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Email</span>
              <span className="font-semibold truncate block">{customer.email}</span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">WhatsApp</span>
              <span className="font-mono font-semibold truncate block">{customer.phone}</span>
            </div>
          </div>
          {customer.address && (
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">Alamat Tujuan</span>
              <p className="font-bold text-brand-blue leading-relaxed break-words">{customer.address}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface QrCodePaymentStepProps {
  qrUrl: string;
  orderId: string | null;
  customerName: string;
}

function QrCodePaymentStep({ qrUrl, orderId, customerName }: QrCodePaymentStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
        <CardHeader className="bg-cream/20 border-b-2 border-ink py-4">
          <CardTitle className="display text-sm tracking-wider uppercase text-ink">Scan QR Code untuk Membayar</CardTitle>
          <CardDescription className="text-xs">
            Gunakan aplikasi pembayaran apapun (GoPay, Dana, OVO, ShopeePay, dll)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:gap-6 p-4 sm:p-6 text-ink">
          {/* QR Code */}
          <div className="rounded-xl border-2 border-ink p-3 sm:p-6 bg-white shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] max-w-full">
            <img src={qrUrl} alt="QRIS Payment" className="w-44 h-44 sm:w-60 sm:h-60 object-contain max-w-full" />
          </div>

          {/* Order ID */}
          <div className="w-full space-y-1.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-ink block">Order ID Pesanan</label>
            <div className="flex gap-2">
              <Input value={orderId || ""} readOnly className="font-mono text-xs border-2 border-ink font-bold bg-cream/10" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 border-2 border-ink font-bold cursor-pointer hover:bg-cream">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="w-full space-y-2.5 rounded-xl border-2 border-ink bg-[#FCFAF7] p-4 text-xs shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]">
            <p className="font-extrabold uppercase tracking-wider text-brand-orange text-[11px]">Cara Membayar:</p>
            <ol className="space-y-1.5 text-xs text-ink font-medium list-decimal list-inside leading-relaxed">
              <li>Buka aplikasi e-wallet / mobile banking (GoPay, Dana, OVO, BCA, dll)</li>
              <li>Pilih menu <span className="font-bold">"Scan QR Code"</span></li>
              <li>Arahkan kamera ke QR code di atas</li>
              <li>Verifikasi nominal tagihan & selesaikan pembayaran</li>
            </ol>
          </div>

        </CardContent>
      </Card>

      {/* Payment Status */}
      <Card className="border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] sm:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] overflow-hidden">
        <CardHeader className="bg-cream/20 border-b-2 border-ink py-3.5">
          <CardTitle className="display text-xs uppercase tracking-wider text-ink font-bold">Status Pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping shrink-0" />
            <p className="text-xs font-bold text-ink">Menunggu pembayaran dari <span className="text-brand-orange">{customerName}</span>...</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            Halaman ini akan otomatis diperbarui saat pembayaran diterima oleh sistem.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

