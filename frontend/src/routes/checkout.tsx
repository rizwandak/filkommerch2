import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, ArrowLeft, Loader2, QrCode, Copy, Check, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import logoFilkom from "@/assets/logo_filkom.png";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { createOrderAndPayment } from "@backend/server-actions";
import { Button } from "@frontend/components/ui/button";
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
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState(user?.type === "buyer" ? user.name : "");
  const [customerEmail, setCustomerEmail] = useState(user?.type === "buyer" ? user.email : "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNim, setCustomerNim] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "shipping">("pickup");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [copiedPaymentLink, setCopiedPaymentLink] = useState(false);

  const steps: CheckoutStep[] = [
    { step: 1, title: "Review Cart" },
    { step: 2, title: "Customer Details" },
    { step: 3, title: "Payment" },
    { step: 4, title: "Done" },
  ];

  // Check auth and load cart
  useEffect(() => {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }

    // Load cart from localStorage
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch {
        toast.error("Failed to load cart");
      }
    } else {
      toast.error("Your cart is empty");
    }
  }, [user, navigate]);

  // Load Midtrans Snap script dynamically
  useEffect(() => {
    const snapScriptUrl = "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = "Mid-client-xBEPEMQRGEXHq99n";

    let script = document.querySelector(`script[src="${snapScriptUrl}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = snapScriptUrl;
      script.setAttribute("data-client-key", clientKey);
      document.body.appendChild(script);
    }
  }, []);

  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(cartItems.filter((item) => item.id !== itemId));
    } else {
      setCartItems(
        cartItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item)),
      );
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  const validateStep = (): boolean => {
    if (currentStep === 2) {
      if (!customerName.trim()) {
        toast.error("Please enter your name");
        return false;
      }
      if (!customerEmail.trim()) {
        toast.error("Please enter your email");
        return false;
      }
      if (!customerPhone.trim()) {
        toast.error("Please enter your phone number");
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        toast.error("Please enter a valid email");
        return false;
      }
      if (fulfillmentType === "shipping" && !shippingAddress.trim()) {
        toast.error("Alamat pengiriman wajib diisi untuk metode Diantar!");
        return false;
      }
    }
    if (currentStep === 1 && cartItems.length === 0) {
      toast.error("Your cart is empty");
      return false;
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
        user?.type === "buyer" &&
        Number.isInteger(parsedId) &&
        parsedId > 0 &&
        parsedId <= 2147483647
          ? parsedId
          : undefined;

      const transactionDetails = {
        orderId: newOrderId,
        grossAmount: totalAmount,
        customerName,
        customerNim: customerNim.trim() || undefined,
        customerEmail,
        customerPhone,
        shippingAddress:
          fulfillmentType === "pickup" ? "Ambil di FILKOM Merch (gratis)" : shippingAddress.trim(),
        fulfillmentType,
        items: cartItems,
        userId: buyerUserId,
      };

      // Call server function untuk create order di database dan generate QRIS
      const result = await createOrderAndPayment({ data: transactionDetails });

      if (!result.success || !result.token) {
        throw new Error(result.error || "Failed to create payment");
      }

      // Clear cart dari localStorage
      localStorage.removeItem("cart");

      // Trigger Midtrans Snap popup
      if ((window as any).snap) {
        (window as any).snap.pay(result.token, {
          onSuccess: (snapResult: any) => {
            toast.success("Pembayaran berhasil!");
            void navigate({ to: "/order-confirmation", search: { orderId: newOrderId } });
          },
          onPending: (snapResult: any) => {
            toast.info("Pembayaran tertunda. Silakan selesaikan pembayaran Anda.");
            void navigate({ to: "/order-confirmation", search: { orderId: newOrderId } });
          },
          onError: (snapResult: any) => {
            toast.error("Pembayaran gagal!");
            setIsProcessing(false);
          },
          onClose: () => {
            toast.warning("Anda menutup popup pembayaran sebelum menyelesaikan transaksi.");
            void navigate({ to: "/order-confirmation", search: { orderId: newOrderId } });
          },
        });
      } else {
        // Fallback to QRIS screen if Snap fails to load
        setQrUrl(result.qrUrl);
        setCurrentStep(4);
        toast.success("Pesanan berhasil dibuat! Silakan scan QRIS untuk membayar.");
        setIsProcessing(false);
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

      {/* Steps */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.step} className="flex items-center flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    currentStep >= s.step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.step}
                </div>
                <div className="ml-3 hidden text-sm font-medium sm:block">{s.title}</div>
                {index < steps.length - 1 && (
                  <div
                    className={`ml-4 h-1 flex-1 ${currentStep > s.step ? "bg-primary" : "bg-muted"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Section */}
          <div className="lg:col-span-2">
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
                address={shippingAddress}
                fulfillmentType={fulfillmentType}
                onNameChange={setCustomerName}
                onEmailChange={setCustomerEmail}
                onPhoneChange={setCustomerPhone}
                onNimChange={setCustomerNim}
                onAddressChange={setShippingAddress}
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
                      : shippingAddress,
                }}
              />
            )}
            {currentStep === 4 && qrUrl && (
              <QrCodePaymentStep qrUrl={qrUrl} orderId={orderId} customerName={customerName} />
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              {currentStep > 1 && currentStep < 4 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                  Back
                </Button>
              )}
              {currentStep < 3 && (
                <Button
                  onClick={() => {
                    if (validateStep()) {
                      setCurrentStep(currentStep + 1);
                    }
                  }}
                >
                  Next
                </Button>
              )}
              {currentStep === 3 && (
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="flex-1 bg-ink text-white hover:bg-brand-orange font-bold uppercase tracking-wider text-xs sm:text-sm"
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
                <Button asChild className="flex-1">
                  <a href="/">Done</a>
                </Button>
              )}
            </div>
          </div>

          {/* Right Section - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Metode Pengiriman:</span>
                    <span className="font-semibold text-ink">
                      {fulfillmentType === "pickup" ? "Ambil di FILKOM Merch" : "Diantar (Kurir)"}
                    </span>
                  </div>
                  {fulfillmentType === "shipping" ? (
                    <div className="flex justify-between text-[11px] text-brand-orange bg-brand-orange/5 p-2.5 rounded border border-brand-orange/20">
                      <span>Ongkir:</span>
                      <span className="font-bold text-right">Info Jarak via WhatsApp</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[11px] text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-200">
                      <span>Ongkir:</span>
                      <span className="font-bold">GRATIS</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-2 border-t border-dashed">
                    <span>Total</span>
                    <div className="text-right font-bold">
                      <span className="text-lg text-primary block">
                        Rp {totalAmount.toLocaleString("id-ID")}
                      </span>
                      {fulfillmentType === "shipping" && (
                        <span className="text-[10px] text-muted-foreground block font-normal italic">
                          (Belum termasuk ongkir)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {currentStep === 3 && (
                  <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200">
                    <p className="font-bold">ℹ️ Midtrans Secure Payment</p>
                    <p className="mt-1">
                      Klik "Bayar Sekarang" untuk memilih metode pembayaran (Virtual Account, QRIS,
                      Kartu Kredit, dll.)
                    </p>
                  </div>
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
        </div>
      </div>
    </div>
  );
}

interface CartReviewStepProps {
  items: CartItem[];
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}

function CartReviewStep({ items, onQuantityChange, onRemoveItem }: CartReviewStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Your Items</CardTitle>
        <CardDescription>Check your cart before proceeding</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border p-3 sm:p-4 gap-3"
            >
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.category}</p>
                <p className="mt-1 font-semibold text-foreground">
                  Rp {item.price.toLocaleString("id-ID")}
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                  >
                    +
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemoveItem(item.id)}>
                  Remove
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
  address: string;
  fulfillmentType: "pickup" | "shipping";
  onNameChange: (value: string) => void;
  onNimChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onFulfillmentTypeChange: (value: "pickup" | "shipping") => void;
}

function CustomerDetailsStep({
  name,
  nim,
  email,
  phone,
  address,
  fulfillmentType,
  onNameChange,
  onNimChange,
  onEmailChange,
  onPhoneChange,
  onAddressChange,
  onFulfillmentTypeChange,
}: CustomerDetailsStepProps) {
  return (
    <Card className="border-2 border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
      <CardHeader className="bg-cream/20 border-b-2 border-ink py-4">
        <CardTitle className="display text-sm tracking-wider uppercase text-ink">
          Informasi Pelanggan
        </CardTitle>
        <CardDescription className="text-xs">
          Lengkapi informasi untuk pengambilan dan pembayaran
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6 text-ink">
        <div className="space-y-2">
          <Label htmlFor="name" className="font-bold text-xs uppercase">
            Nama Lengkap *
          </Label>
          <Input
            id="name"
            placeholder="Nama Lengkap"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="border-2 border-ink bg-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="font-bold text-xs uppercase">
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="border-2 border-ink bg-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nim" className="font-bold text-xs uppercase">
            NIM
          </Label>
          <Input
            id="nim"
            placeholder="NIM Mahasiswa (opsional)"
            value={nim}
            onChange={(e) => onNimChange(e.target.value)}
            className="border-2 border-ink bg-white"
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
            className="border-2 border-ink bg-white"
          />
        </div>

        {/* Pilihan Metode Pengambilan / Pengiriman */}
        <div className="space-y-3">
          <Label className="font-bold text-xs uppercase">Metode Pengambilan / Pengiriman *</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onFulfillmentTypeChange("pickup")}
              className={`flex flex-col text-left p-4 rounded-xl border-2 transition cursor-pointer ${
                fulfillmentType === "pickup"
                  ? "border-ink bg-cream/40 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
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
              className={`flex flex-col text-left p-4 rounded-xl border-2 transition cursor-pointer ${
                fulfillmentType === "shipping"
                  ? "border-ink bg-cream/40 shadow-[2px_2px_0px_0px_rgba(27,27,27,1)]"
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
          <div className="space-y-2 animate-fade-in">
            <Label htmlFor="address" className="font-bold text-xs uppercase text-brand-orange">
              Alamat Pengiriman Lengkap *
            </Label>
            <Input
              id="address"
              placeholder="Tulis alamat pengiriman secara detail..."
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              className="border-2 border-ink bg-white"
            />
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span className="text-muted-foreground">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium">
                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delivery To</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{customer.name}</p>
          {customer.nim && <p className="text-sm text-muted-foreground">NIM: {customer.nim}</p>}
          <p className="text-sm text-muted-foreground">{customer.email}</p>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
          {customer.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code untuk Membayar</CardTitle>
          <CardDescription>
            Gunakan aplikasi pembayaran apapun (GoPay, Dana, OVO, dll)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {/* QR Code */}
          <div className="rounded-lg border-4 border-primary p-6 bg-white">
            <img src={qrUrl} alt="QRIS Payment" className="w-64 h-64 object-contain" />
          </div>

          {/* Order ID */}
          <div className="w-full">
            <label className="text-sm font-semibold text-foreground mb-2 block">Order ID</label>
            <div className="flex gap-2">
              <Input value={orderId || ""} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="w-full space-y-3 rounded-lg bg-blue-50 p-4">
            <p className="font-semibold text-blue-900">Cara Membayar:</p>
            <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
              <li>Buka aplikasi pembayaran Anda (GoPay, Dana, OVO, LinkAja, dsb)</li>
              <li>Pilih menu "Scan QR Code"</li>
              <li>Arahkan kamera ke QR code di atas</li>
              <li>Verifikasi jumlah pembayaran</li>
              <li>Masukkan PIN/password Anda</li>
              <li>Pembayaran berhasil! Anda akan mendapat notifikasi</li>
            </ol>
          </div>

          {/* Payment Methods */}
          <div className="w-full">
            <p className="text-xs font-semibold text-muted-foreground mb-3">
              Metode Pembayaran yang Diterima:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["GoPay", "OVO", "Dana", "LinkAja", "AlfaBank", "Jago"].map((method) => (
                <div
                  key={method}
                  className="rounded border border-border p-2 text-center text-xs font-medium text-foreground"
                >
                  {method}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
            <p className="text-sm">Menunggu pembayaran dari {customerName}...</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Halaman ini akan otomatis diperbarui saat pembayaran diterima
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Global type for Midtrans Snap
declare global {
  type MidtransSnapResult = {
    transaction_id?: string;
    order_id?: string;
    transaction_status?: string;
    [key: string]: unknown;
  };

  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: MidtransSnapResult) => void;
          onPending?: (result: MidtransSnapResult) => void;
          onError?: (result: MidtransSnapResult) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}
