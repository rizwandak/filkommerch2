import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getOrderById, confirmOrderCompletionServerAction, createProductReviewServerAction, submitOrderComplaintServerAction } from "@/backend/server-actions";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, FileText, ShoppingBag, ShieldAlert, Star, X, CheckCircle, Package, Truck, Clock, CheckCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { resolveImageUrl } from "@/lib/image-resolver";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/orders_/$orderId")({
  loader: async ({ params }) => {
    const result = await getOrderById({ data: params.orderId });
    if (!result.success || !result.order) {
      throw new Error(result.error || "Order not found");
    }
    return {
      order: result.order,
      items: result.items || [],
      reviews: result.reviews || []
    };
  },
  component: OrderDetailComponent,
});

function getStatusBadge(order: any) {
  const oStatus = order.order_status;
  const pStatus = order.payment_status;

  if (oStatus === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full border border-red-200">
        <X className="w-3 h-3" /> Dibatalkan
      </span>
    );
  }

  if (pStatus === "unpaid" || pStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
        <Clock className="w-3 h-3 animate-pulse" /> Belum Dibayar
      </span>
    );
  }

  if (oStatus === "ready_for_pickup") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
        <CheckCircle className="w-3 h-3" /> Siap Diambil
      </span>
    );
  }

  if (oStatus === "shipped") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
        <CheckCircle className="w-3 h-3" /> Sedang Diantar
      </span>
    );
  }

  if (oStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
        <CheckCircle className="w-3 h-3" /> Selesai
      </span>
    );
  }

  if (pStatus === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
        <Clock className="w-3 h-3 animate-pulse" /> Sedang Diproses
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-800 px-2.5 py-1 rounded-full border border-gray-200">
      <Clock className="w-3 h-3" /> Menunggu Pembayaran
    </span>
  );
}

function getFulfillmentLabel(type: string) {
  if (type === "pickup") return "Ambil di BEM FILKOM";
  if (type === "shipping") return "Pengiriman (JNE/J&T/dll)";
  if (type === "cod") return "Cash on Delivery";
  return type;
}

function OrderDetailComponent() {
  const { order: initialOrder, items, reviews: initialReviews } = Route.useLoaderData();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<any>(initialOrder);
  const [reviews, setReviews] = useState(initialReviews);

  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  
  const [selectedItemForReview, setSelectedItemForReview] = useState<{ item: any } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMediaFiles, setReviewMediaFiles] = useState<File[]>([]);
  const [reviewMediaPreviews, setReviewMediaPreviews] = useState<{url: string, type: string}[]>([]);

  const isReviewAllowed = (orderObj: any) => {
    if (orderObj.order_status !== "completed") return false;
    if (!orderObj.completed_at) return true;
    const completedDate = new Date(orderObj.completed_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - completedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.8
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let newFiles: File[] = [...reviewMediaFiles];
    let newPreviews: {url: string, type: string}[] = [...reviewMediaPreviews];

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar (Maks 20MB)`);
        continue;
      }

      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      
      const currentVideos = newFiles.filter(f => f.type.startsWith("video/")).length;
      if (isVideo && currentVideos >= 1) {
        toast.error("Hanya diperbolehkan maksimal 1 video.");
        continue;
      }

      const currentImages = newFiles.filter(f => f.type.startsWith("image/")).length;
      if (isImage && currentImages >= 5) {
        toast.error("Hanya diperbolehkan maksimal 5 foto.");
        continue;
      }

      if (isImage) {
        const compressed = await compressImage(file);
        newFiles.push(compressed);
        newPreviews.push({ url: URL.createObjectURL(compressed), type: "image" });
      } else if (isVideo) {
        newFiles.push(file);
        newPreviews.push({ url: URL.createObjectURL(file), type: "video" });
      } else {
        toast.error(`Format file ${file.name} tidak didukung`);
      }
    }

    setReviewMediaFiles(newFiles);
    setReviewMediaPreviews(newPreviews);
  };

  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [complaintNotes, setComplaintNotes] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintMediaFiles, setComplaintMediaFiles] = useState<File[]>([]);
  const [complaintMediaPreviews, setComplaintMediaPreviews] = useState<{url: string, type: string}[]>([]);

  const handleComplaintMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    let newFiles: File[] = [...complaintMediaFiles];
    let newPreviews: {url: string, type: string}[] = [...complaintMediaPreviews];

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`File ${file.name} terlalu besar (Maks 20MB)`);
        continue;
      }

      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      
      const currentVideos = newFiles.filter(f => f.type.startsWith("video/")).length;
      const currentImages = newFiles.filter(f => f.type.startsWith("image/")).length;

      if (isVideo && currentVideos >= 1) {
        toast.error("Maksimal hanya 1 video yang diperbolehkan.");
        continue;
      }
      if (isImage && currentImages >= 5) {
        toast.error("Maksimal hanya 5 foto yang diperbolehkan.");
        continue;
      }

      if (isImage) {
        const compressed = await compressImage(file);
        newFiles.push(compressed);
        newPreviews.push({ url: URL.createObjectURL(compressed), type: "image" });
      } else if (isVideo) {
        newFiles.push(file);
        newPreviews.push({ url: URL.createObjectURL(file), type: "video" });
      } else {
        toast.error(`Format ${file.name} tidak didukung`);
      }
    }

    setComplaintMediaFiles(newFiles);
    setComplaintMediaPreviews(newPreviews);
  };

  const handleConfirmCompletion = async () => {
    setCompletionModalOpen(false);
    setCompletingOrderId(order.order_id);
    try {
      const res = await confirmOrderCompletionServerAction({ data: { orderId: order.order_id } });
      if (res.success) {
        toast.success("Pesanan berhasil diselesaikan!");
        setOrder({ ...order, order_status: "completed" });
      } else {
        toast.error(res.error || "Gagal menyelesaikan pesanan");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan sistem");
    } finally {
      setCompletingOrderId(null);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedItemForReview) return;
    if (reviewRating === 0) {
      toast.error("Silakan berikan rating bintang terlebih dahulu.");
      return;
    }
    if (reviewMediaFiles.length === 0) {
      toast.error("Anda wajib melampirkan foto/video ulasan!");
      return;
    }
    setSubmittingReview(true);
    try {
      let uploadedUrls: string[] = [];
      if (reviewMediaFiles.length > 0) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || "https://filkommerch.com";
        for (const file of reviewMediaFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.url) {
              uploadedUrls.push(uploadData.url);
            }
          }
        }
      }

      const res = await createProductReviewServerAction({
        data: {
          productId: selectedItemForReview.item.product_id,
          orderId: order.order_id,
          userId: user?.id ? Number(user.id) : (order.user_id ? Number(order.user_id) : undefined),
          rating: reviewRating,
          comment: reviewComment,
          variant: [selectedItemForReview.item.size, selectedItemForReview.item.color].filter(Boolean).join(" / "),
          userName: (user as any)?.name || (user as any)?.username || order.customer_name,
          mediaUrl: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : undefined
        }
      });
      if (res.success) {
        toast.success("Ulasan berhasil dikirim! Terima kasih.");
        setReviews([...reviews, { product_id: selectedItemForReview.item.product_id, rating: reviewRating, comment: reviewComment }]);
        setSelectedItemForReview(null);
        setReviewRating(0);
        setReviewComment("");
        setReviewMediaFiles([]);
        setReviewMediaPreviews([]);
      } else {
        toast.error(res.error || "Gagal mengirim ulasan");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintNotes.trim() && complaintMediaFiles.length === 0) {
      toast.error("Harap isi deskripsi komplain atau lampirkan bukti.");
      return;
    }
    setSubmittingComplaint(true);
    try {
      let uploadedUrls: string[] = [];
      if (complaintMediaFiles.length > 0) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || "https://filkommerch.com";
        for (const file of complaintMediaFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.url) {
              uploadedUrls.push(uploadData.url);
            }
          }
        }
      }

      const res = await submitOrderComplaintServerAction({
        data: { orderId: order.order_id, notes: complaintNotes, mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined }
      });
      if (res.success) {
        toast.success("Komplain berhasil dikirim. Admin akan segera menghubungi Anda.");
        setOrder({ ...order, is_complained: 1, complaint_notes: complaintNotes, complaint_media_urls: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null });
        setComplaintModalOpen(false);
        setComplaintNotes("");
        setComplaintMediaFiles([]);
        setComplaintMediaPreviews([]);
      } else {
        toast.error(res.error || "Gagal mengirim komplain");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const itemSubtotal = items?.reduce((sum: number, i: any) => sum + i.subtotal, 0) || order.gross_amount;

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/orders"
            className="p-2 bg-white border-2 border-ink rounded-lg hover:bg-cream active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-ink" />
          </Link>
          <h1 className="text-xl font-black text-ink uppercase tracking-tight">Detail Pesanan</h1>
        </div>

        {/* Order ID & Status Header */}
        <div className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ink/10 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-orange/10 border border-ink/20 rounded-lg text-brand-orange">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-sm text-ink uppercase tracking-wide">ID: {order.order_id}</h2>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) || order.created_at}
                </p>
              </div>
            </div>
            <div>{getStatusBadge(order)}</div>
          </div>

          {/* Order Tracking Timeline */}
          {order.order_status !== "cancelled" && (
            <div className="relative pt-2 pb-4">
              <div className="flex justify-between items-center relative z-10">
                {[
                  { label: "Bayar", icon: Clock },
                  { label: "Diproses", icon: Package },
                  { label: order.fulfillment_type === "pickup" ? "Siap" : "Kirim", icon: Truck },
                  { label: "Selesai", icon: CheckCircle }
                ].map((step, idx) => {
                  let activeStep = 0;
                  if (order.order_status === "completed") activeStep = 3;
                  else if (order.order_status === "ready_for_pickup" || order.order_status === "shipped") activeStep = 2;
                  else if (order.payment_status === "paid") activeStep = 1;
                  else activeStep = 0;

                  const isCompleted = idx < activeStep;
                  const isActive = idx === activeStep;
                  const isPending = idx > activeStep;

                  const Icon = step.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 relative">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-colors z-10 ${
                        isCompleted ? "bg-emerald-500 border-emerald-600 text-white" : 
                        isActive ? "bg-brand-orange border-brand-orange text-white" : 
                        "bg-cream border-ink/20 text-muted-foreground"
                      }`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center ${
                        isCompleted ? "text-emerald-600" :
                        isActive ? "text-brand-orange" :
                        "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Connecting Lines */}
              <div className="absolute top-6 sm:top-7 left-[12.5%] right-[12.5%] h-0.5 bg-ink/10 -z-0">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ 
                    width: order.order_status === "completed" ? "100%" : 
                           (order.order_status === "ready_for_pickup" || order.order_status === "shipped") ? "66%" : 
                           order.payment_status === "paid" ? "33%" : "0%" 
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5">
            <h3 className="font-extrabold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">Informasi Pembeli</h3>
            <p className="font-bold text-ink text-sm">{order.customer_name}</p>
            {order.customer_nim && <p className="text-xs text-muted-foreground mt-0.5">NIM: {order.customer_nim}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">{order.customer_email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{order.customer_phone}</p>
          </div>
          <div className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5">
            <h3 className="font-extrabold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">Informasi Pengiriman</h3>
            <p className="font-bold text-ink text-sm">{getFulfillmentLabel(order.fulfillment_type)}</p>
            {order.fulfillment_type === "shipping" && order.shipping_address && (
              <p className="text-xs text-muted-foreground mt-1">{order.shipping_address}</p>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="mb-6">
          <h3 className="font-black text-xs text-ink uppercase tracking-wider mb-3">Item Yang Dibeli</h3>
          <div className="space-y-3">
            {items?.map((item: any) => {
              const hasReview = reviews?.some((r: any) => Number(r.product_id) === Number(item.product_id));
              return (
                <div key={item.id} className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-16 bg-cream border border-ink rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                      {item.image_url ? (
                        <img src={resolveImageUrl(item.image_url)} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-ink text-sm leading-snug">{item.product_name}</p>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {item.size && <span>Ukuran: {item.size}</span>}
                        {item.color && item.color !== "Default" && <span>Warna: {item.color}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} x Rp {item.unit_price.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <div className="font-extrabold text-ink">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </div>
                    {order.order_status === "completed" && (
                      <div>
                        {hasReview ? (
                          <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">
                            Ulasan Terkirim ✓
                          </span>
                        ) : isReviewAllowed(order) ? (
                          <button 
                            onClick={() => setSelectedItemForReview({ item })}
                            className="text-[10px] px-3 py-1.5 bg-brand-orange text-white font-extrabold uppercase rounded shadow-[1px_1px_0px_0px_rgba(27,27,27,1)] hover:bg-brand-orange/90 transition cursor-pointer"
                          >
                            Beri Ulasan
                          </button>
                        ) : (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded border border-red-200">
                            Masa Ulasan Habis
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rincian Pembayaran */}
        <div className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5 mb-6">
          <h3 className="font-extrabold text-ink uppercase tracking-wider text-xs mb-3 border-b border-ink/20 pb-2">Rincian Pembayaran</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal Produk:</span>
              <span className="font-bold text-ink">Rp {itemSubtotal.toLocaleString("id-ID")}</span>
            </div>
            
            {order.voucher_code && (
              <div className="flex justify-between text-brand-orange font-semibold">
                <span>Voucher ({order.voucher_code}):</span>
                <span>-Rp {Number(order.discount_amount || 0).toLocaleString("id-ID")}</span>
              </div>
            )}

            {!order.voucher_code && order.discount_amount > 0 && (
              <div className="flex justify-between text-brand-orange font-semibold">
                <span>Potongan Diskon Civitas UB:</span>
                <span>-Rp {Number(order.discount_amount).toLocaleString("id-ID")}</span>
              </div>
            )}

            <div className="flex justify-between text-muted-foreground">
              <span>Metode Pengiriman:</span>
              <span className="font-bold text-ink">{getFulfillmentLabel(order.fulfillment_type)}</span>
            </div>

            {order.fulfillment_type === "shipping" && order.shipping_address && (
              <div className="text-[11px] text-muted-foreground border-t border-dashed border-ink/20 pt-1 mt-1">
                <span className="font-bold text-ink">Alamat Kirim: </span>
                {order.shipping_address}
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-extrabold text-ink border-t-2 border-ink pt-2.5 mt-2">
              <span>TOTAL AKHIR:</span>
              <span className="text-brand-orange text-base font-black">
                Rp {order.gross_amount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 justify-end">
          {(order.order_status === "ready_for_pickup" || order.order_status === "shipped" || order.is_complained === 1) && (
            <button
              onClick={() => setComplaintModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-bold uppercase rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer ${order.is_complained === 1 ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              {order.is_complained === 1 ? "Komplain Diajukan" : "Ajukan Komplain"}
            </button>
          )}

          {(order.order_status === "ready_for_pickup" || order.order_status === "shipped") && (
            <button
              onClick={() => setCompletionModalOpen(true)}
              disabled={completingOrderId === order.order_id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-extrabold uppercase bg-emerald-500 text-white hover:bg-emerald-600 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {completingOrderId === order.order_id ? "Memproses..." : "Pesanan Diterima"}
            </button>
          )}

          {/* Contact admin */}
          <a
            href={`https://wa.me/6282287190402?text=${encodeURIComponent("Halo Admin BEM FILKOM, saya ingin mengonfirmasi pesanan saya dengan Order ID: " + order.order_id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border-2 border-ink text-xs font-bold uppercase bg-green-100 hover:bg-green-200 text-green-800 rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer"
          >
            Hubungi Admin
          </a>
        </div>

      </main>

      {/* Review Modal */}
      {selectedItemForReview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white border-2 border-ink rounded-2xl shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] max-w-xl w-full p-6 relative">
            <button
              onClick={() => { setSelectedItemForReview(null); setReviewRating(0); }}
              className="absolute top-4 right-4 p-1.5 text-ink/70 hover:text-ink hover:bg-cream rounded-full border border-ink/20 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-orange/10 border-2 border-ink rounded-full mb-3 text-brand-orange">
                <Star className="w-6 h-6 fill-brand-orange text-brand-orange" />
              </div>
              <h3 className="font-black text-lg text-ink uppercase tracking-wide">Beri Ulasan Produk</h3>
              <p className="text-xs font-bold text-brand-orange mt-1">
                {selectedItemForReview.item.product_name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Varian: {[selectedItemForReview.item.size, selectedItemForReview.item.color].filter(Boolean).join(" / ") || "Standard"}
              </p>
            </div>

            {/* Rating Stars */}
            <div className="mb-6 bg-cream/40 border-2 border-ink rounded-xl p-4 text-center">
              <span className="text-xs font-extrabold uppercase text-ink block mb-2">Pilih Rating Bintang: <span className="text-red-500">*</span></span>
              <div className="flex justify-center items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-115 transition transform cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= reviewRating
                          ? "fill-amber-400 text-amber-500 drop-shadow-xs"
                          : "text-gray-300 fill-gray-100"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-600 mt-2">
                {reviewRating === 5 && "Sangat Memuaskan ⭐⭐⭐⭐⭐"}
                {reviewRating === 4 && "Bagus ⭐⭐⭐⭐"}
                {reviewRating === 3 && "Cukup ⭐⭐⭐"}
                {reviewRating === 2 && "Kurang ⭐⭐"}
                {reviewRating === 1 && "Sangat Buruk ⭐"}
              </p>
            </div>

            {/* Media Upload */}
            <div className="mb-6">
              <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">
                Foto / Video: <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-ink/40 bg-cream/30 hover:bg-cream/60 rounded-xl p-3.5 text-center transition flex flex-col items-center justify-center gap-2">
                <div className="flex flex-wrap gap-2 justify-center w-full">
                  {reviewMediaPreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg border-2 border-ink overflow-hidden shadow-sm shrink-0">
                      {preview.type === "video" ? (
                        <video src={preview.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={preview.url} alt={`Bukti ${idx+1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = [...reviewMediaFiles];
                          const newPreviews = [...reviewMediaPreviews];
                          newFiles.splice(idx, 1);
                          newPreviews.splice(idx, 1);
                          setReviewMediaFiles(newFiles);
                          setReviewMediaPreviews(newPreviews);
                        }}
                        className="absolute top-1 right-1 bg-white border border-ink text-red-600 rounded-full p-0.5 hover:scale-110 transition z-10 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {reviewMediaFiles.length < 6 && (
                    <label className="w-20 h-20 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-ink/40 rounded-lg bg-cream/30 hover:bg-cream/50 transition shrink-0">
                      <Upload className="w-4 h-4 text-ink/60 mb-1" />
                      <span className="text-[8px] font-bold text-ink/70 uppercase">Tambah</span>
                      <input type="file" accept="image/*,video/mp4,video/quicktime" multiple onChange={handleMediaUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  Maksimal 5 foto & 1 video (20MB)
                </span>
              </div>
            </div>

            {/* Review Comment */}
            <div className="mb-6">
              <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">
                Ulasan Teks Pengalaman Anda:
              </label>
              <textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Bagikan pengalaman Anda tentang bahan produk, ukuran, kenyamanan, atau pelayanan..."
                className="w-full p-3 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange bg-cream/10"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedItemForReview(null)}
                className="flex-1 py-2.5 border-2 border-ink text-xs font-bold uppercase bg-cream hover:bg-cream/80 text-ink rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 py-2.5 border-2 border-ink text-xs font-extrabold uppercase bg-brand-orange text-white hover:bg-brand-orange/90 rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer disabled:opacity-50"
              >
                {submittingReview ? "Mengirim..." : "Kirim Ulasan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {complaintModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white border-2 border-ink rounded-2xl shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] max-w-md w-full p-6 relative">
            <button
              onClick={() => setComplaintModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-ink/70 hover:text-ink hover:bg-cream rounded-full border border-ink/20 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {order.is_complained === 1 ? (
              // Read-only Detail View
              <>
                <div className="flex items-center gap-3 mb-4 border-b-2 border-ink pb-3 text-red-600">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="font-black text-base uppercase text-ink">Detail Komplain</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">ID: {order.order_id}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">Keluhan:</label>
                  <div className="w-full p-3 border-2 border-ink rounded-xl text-xs font-medium bg-red-50/30 whitespace-pre-wrap">
                    {order.complaint_notes}
                  </div>
                </div>
                {order.complaint_media_urls && (
                  <div className="mb-6">
                    <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">Bukti Foto / Video:</label>
                    <div className="flex flex-wrap gap-2 p-3 border-2 border-dashed border-ink/40 bg-red-50/30 rounded-xl">
                      {(() => {
                        try {
                          const urls = JSON.parse(order.complaint_media_urls);
                          if (!urls || urls.length === 0) return <span className="text-[10px] text-muted-foreground italic">Tidak ada foto/video terlampir.</span>;
                          return urls.map((url: string, idx: number) => (
                            <div key={idx} className="w-16 h-16 rounded-lg border-2 border-ink overflow-hidden bg-white shrink-0">
                              {url.match(/\.(mp4|mov|webm)$/i) ? (
                                <video src={resolveImageUrl(url)} className="w-full h-full object-cover" controls />
                              ) : (
                                <a href={resolveImageUrl(url)} target="_blank" rel="noreferrer">
                                  <img src={resolveImageUrl(url)} alt={`Bukti ${idx+1}`} className="w-full h-full object-cover hover:scale-105 transition" />
                                </a>
                              )}
                            </div>
                          ));
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setComplaintModalOpen(false)}
                    className="px-6 py-2.5 border-2 border-ink text-xs font-bold uppercase bg-cream hover:bg-cream/80 text-ink rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              // Form View
              <>
                <div className="flex items-center gap-3 mb-4 border-b-2 border-ink pb-3 text-red-600">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="font-black text-base uppercase text-ink">Ajukan Komplain Pesanan</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">ID: {order.order_id}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Silakan tuliskan kendala atau kecacatan barang yang Anda terima. Tim Admin FILKOM Merch akan segera menindaklanjuti laporan Anda.
                </p>

            <div className="mb-6">
              <textarea
                rows={4}
                value={complaintNotes}
                onChange={(e) => setComplaintNotes(e.target.value)}
                placeholder="Jelaskan detail masalah (misal: barang robek, ukuran tidak sesuai nota, dll)..."
                className="w-full p-3 border-2 border-ink rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30 mb-3"
              />

              <label className="block text-xs font-extrabold uppercase text-ink mb-1.5">
                Foto / Video Kendala (Opsional):
              </label>
              <div className="border-2 border-dashed border-ink/40 bg-red-50/30 hover:bg-red-50/60 rounded-xl p-3.5 text-center transition flex flex-col items-center justify-center gap-2">
                <div className="flex flex-wrap gap-2 justify-center w-full">
                  {complaintMediaPreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg border-2 border-ink overflow-hidden shadow-sm shrink-0">
                      {preview.type === "video" ? (
                        <video src={preview.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={preview.url} alt={`Bukti ${idx+1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = [...complaintMediaFiles];
                          const newPreviews = [...complaintMediaPreviews];
                          newFiles.splice(idx, 1);
                          newPreviews.splice(idx, 1);
                          setComplaintMediaFiles(newFiles);
                          setComplaintMediaPreviews(newPreviews);
                        }}
                        className="absolute top-1 right-1 bg-white border border-ink text-red-600 rounded-full p-0.5 hover:scale-110 transition z-10 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {complaintMediaFiles.length < 6 && (
                    <label className="w-16 h-16 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-ink/40 rounded-lg bg-cream/30 hover:bg-cream/50 transition shrink-0">
                      <Upload className="w-4 h-4 text-ink/60 mb-1" />
                      <span className="text-[8px] font-bold text-ink/70 uppercase">Tambah</span>
                      <input type="file" accept="image/*,video/mp4,video/quicktime" multiple onChange={handleComplaintMediaUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  Maksimal 5 foto & 1 video (20MB)
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setComplaintModalOpen(false)}
                className="flex-1 py-2.5 border-2 border-ink text-xs font-bold uppercase bg-cream hover:bg-cream/80 text-ink rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitComplaint}
                disabled={submittingComplaint}
                className="flex-1 py-2.5 border-2 border-ink text-xs font-extrabold uppercase bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer disabled:opacity-50"
              >
                {submittingComplaint ? "Mengirim..." : "Kirim Komplain"}
              </button>
            </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completionModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white border-2 border-ink rounded-2xl shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] max-w-md w-full p-6 relative">
            <button
              onClick={() => setCompletionModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-ink/70 hover:text-ink hover:bg-cream rounded-full border border-ink/20 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b-2 border-ink pb-3 text-emerald-600">
              <CheckCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-black text-base uppercase text-ink">Terima Pesanan</h3>
                <p className="text-[11px] text-muted-foreground font-mono">ID: {order.order_id}</p>
              </div>
            </div>

            <p className="text-xs text-ink/90 mb-6 leading-relaxed font-semibold">
              Apakah Anda yakin telah menerima semua pesanan dengan baik? Setelah klik selesai, Anda tidak dapat lagi mengajukan komplain dan dapat langsung memberikan ulasan produk.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCompletionModalOpen(false)}
                className="flex-1 py-2.5 border-2 border-ink text-xs font-bold uppercase bg-cream hover:bg-cream/80 text-ink rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCompletion}
                className="flex-1 py-2.5 border-2 border-ink text-xs font-extrabold uppercase bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
              >
                Ya, Terima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
