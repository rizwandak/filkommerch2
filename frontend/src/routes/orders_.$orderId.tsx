import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  getOrderById,
  getUserOrders,
  createPelunasanOrderServerAction,
  confirmOrderCompletionServerAction,
  createProductReviewServerAction,
  submitOrderComplaintServerAction,
  submitPaymentProof,
} from "@/backend/server-actions";
import { Navbar } from "@/components/Navbar";
import {
  ArrowLeft,
  FileText,
  ShoppingBag,
  ShieldAlert,
  Star,
  X,
  CheckCircle,
  Package,
  Truck,
  Clock,
  CheckCheck,
  Upload,
  AlertTriangle,
  CreditCard,
  Copy,
  Check,
  Eye,
  RefreshCw,
  Plus,
  Loader2,
  User as UserIcon,
} from "lucide-react";
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
      reviews: result.reviews || [],
    };
  },
  component: OrderDetailComponent,
});

const isPelunasanOrder = (order: any) => {
  if (!order) return false;
  return (
    String(order.order_id || "").startsWith("LNS-") ||
    (order.notes && String(order.notes).includes("Pelunasan untuk Order:"))
  );
};

const isDpOrder = (order: any, linkedLns?: any) => {
  if (isPelunasanOrder(order)) return false;
  if (linkedLns) return true;
  if (!order.items || order.items.length === 0) return false;

  return order.items.some((item: any) => {
    const colorStr = String(item.color || "").toUpperCase().trim();
    const sizeStr = String(item.size || "").toUpperCase().trim();

    const isExplicitLunas =
      colorStr.includes("LUNAS") ||
      sizeStr.includes("LUNAS") ||
      colorStr.includes("FULL");

    if (isExplicitLunas) {
      return false;
    }

    return colorStr.includes("DP") || sizeStr.includes("DP");
  });
};

const getSizeSurcharge = (sizeStr: string): number => {
  const s = String(sizeStr || "").toUpperCase().trim();
  if (s === "XXL" || s === "2XL") return 10000;
  if (s === "XXXL" || s === "3XL") return 20000;
  if (s === "XXXXL" || s === "4XL") return 30000;
  if (s === "XXXXXL" || s === "5XL") return 40000;
  return 0;
};

function getPelunasanStatusBadge(lns: any) {
  if (!lns) return null;
  const pStatus = lns.payment_status;
  const oStatus = lns.order_status;

  if (oStatus === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
        <X className="w-3 h-3" /> Dibatalkan
      </span>
    );
  }

  if (pStatus === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
        <CheckCircle className="w-3 h-3 text-emerald-600" /> Pelunasan Lunas
      </span>
    );
  }

  if (lns.payment_proof_note && pStatus !== "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200 animate-pulse">
        <AlertTriangle className="w-3 h-3" /> Bukti Pelunasan Ditolak
      </span>
    );
  }

  if (lns.payment_proof_url) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
        <Clock className="w-3 h-3 animate-pulse text-blue-600" /> Verifikasi Pelunasan
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
      <Clock className="w-3 h-3 animate-pulse text-amber-600" /> Menunggu Pelunasan
    </span>
  );
}

function getStatusBadge(order: any, linkedLns?: any) {
  const oStatus = order.order_status;
  const pStatus = order.payment_status;

  if (oStatus === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full border border-red-200">
        <X className="w-3 h-3" /> Dibatalkan
      </span>
    );
  }

  if (oStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
        <CheckCircle className="w-3 h-3 text-emerald-600" /> Selesai
      </span>
    );
  }

  if (order.payment_proof_note && pStatus !== "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded-full border border-red-200">
        <AlertTriangle className="w-3 h-3" /> Bukti DP Ditolak
      </span>
    );
  }

  if (order.payment_proof_url && (pStatus === "unpaid" || pStatus === "pending")) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
        <Clock className="w-3 h-3 animate-pulse" /> Verifikasi Pembayaran DP
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

  if (pStatus === "paid" && isDpOrder(order, linkedLns)) {
    if (linkedLns && linkedLns.payment_status === "paid") {
      if (oStatus === "ready_for_pickup") {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full border border-teal-200">
            <CheckCircle className="w-3 h-3" /> Siap Diambil (Lunas)
          </span>
        );
      }
      if (oStatus === "shipped") {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
            <CheckCircle className="w-3 h-3" /> Siap Diantar (Lunas)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600" /> Lunas Terbayar
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
    return (
      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
        <Clock className="w-3 h-3 animate-pulse" /> Sedang Diproses
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

  return (
    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
      <Clock className="w-3 h-3 animate-pulse" /> Sedang Diproses
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
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);

  const [linkedPelunasan, setLinkedPelunasan] = useState<any>(null);
  const [creatingPelunasan, setCreatingPelunasan] = useState(false);
  const [pelunasanProofFile, setPelunasanProofFile] = useState<File | null>(null);
  const [uploadingPelunasanProof, setUploadingPelunasanProof] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLinkedPelunasan = async () => {
    if (!order || isPelunasanOrder(order)) return;
    try {
      const targetUserId = user?.id ? Number(user.id) : (order.user_id ? Number(order.user_id) : undefined);
      if (!targetUserId) return;
      const res = await getUserOrders({ data: targetUserId });
      if (res.success && res.orders) {
        const found = res.orders.find(
          (o: any) =>
            o.order_status !== "cancelled" &&
            ((o.notes && o.notes.includes(`Pelunasan untuk Order: ${order.order_id}`)) ||
              String(o.order_id || "").startsWith(`LNS-${order.order_id}`))
        );
        if (found) {
          setLinkedPelunasan(found);
        }
      }
    } catch (err) {
      console.error("Error fetching linked pelunasan:", err);
    }
  };

  useEffect(() => {
    void fetchLinkedPelunasan();
  }, [order?.order_id, user?.id]);

  const handleCopyId = (id: string) => {
    void navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("ID disalin ke clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreatePelunasanDetail = async () => {
    try {
      setCreatingPelunasan(true);
      const res = await createPelunasanOrderServerAction({ data: { originalOrderId: order.order_id } });
      if (res.success && res.orderId) {
        toast.success("Pesanan pelunasan berhasil dibuat!");
        await fetchLinkedPelunasan();
        navigate({ to: "/order-confirmation", search: { orderId: res.orderId } });
      } else {
        toast.error(res.error || "Gagal membuat pesanan pelunasan");
      }
    } catch (err: any) {
      toast.error("Gagal memproses pelunasan");
    } finally {
      setCreatingPelunasan(false);
    }
  };

  const handlePelunasanProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar (maksimal 20MB)");
      return;
    }
    if (file.type.startsWith("image/")) {
      const compressed = await compressImage(file);
      setPelunasanProofFile(compressed);
    } else {
      setPelunasanProofFile(file);
    }
  };

  const handleUploadPelunasanProof = async () => {
    if (!pelunasanProofFile || !linkedPelunasan) return;
    setUploadingPelunasanProof(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://filkommerch.com";
      const formData = new FormData();
      formData.append("file", pelunasanProofFile);

      const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || "Gagal mengunggah gambar ke server");
      }

      const res = await submitPaymentProof({
        data: {
          orderId: linkedPelunasan.order_id,
          paymentProofUrl: uploadData.url,
        },
      });

      if (res.success) {
        toast.success("Bukti pelunasan berhasil dikirim! Menunggu verifikasi admin.");
        setPelunasanProofFile(null);
        await fetchLinkedPelunasan();
      } else {
        toast.error(res.error || "Gagal menyimpan bukti pelunasan");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem");
    } finally {
      setUploadingPelunasanProof(false);
    }
  };

  const handlePaymentProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar (maksimal 20MB)");
      return;
    }

    if (file.type.startsWith("image/")) {
      const compressed = await compressImage(file);
      setPaymentProofFile(compressed);
    } else {
      setPaymentProofFile(file);
    }
  };

  const handleUploadPaymentProof = async () => {
    if (!paymentProofFile) {
      toast.error("Pilih file bukti pembayaran terlebih dahulu");
      return;
    }

    setUploadingPaymentProof(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://filkommerch.com";
      const formData = new FormData();
      formData.append("file", paymentProofFile);

      const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Gagal mengunggah gambar ke server");
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || "Gagal mendapatkan URL gambar");
      }

      const proofUrl = uploadData.url;
      const res = await submitPaymentProof({
        data: {
          orderId: order.order_id,
          paymentProofUrl: proofUrl,
        },
      });

      if (res.success) {
        toast.success("Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.");
        setOrder({
          ...order,
          payment_proof_url: proofUrl,
          payment_proof_note: null,
          order_status: "pending_payment",
          payment_status: "pending",
        });
        setPaymentProofFile(null);
      } else {
        toast.error(res.error || "Gagal menyimpan bukti pembayaran");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan sistem saat unggah bukti");
    } finally {
      setUploadingPaymentProof(false);
    }
  };
  
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

  const fullOrder = { ...order, items };
  const isDp = isDpOrder(fullOrder, linkedPelunasan);

  const pelunasanAmount = linkedPelunasan
    ? Number(linkedPelunasan.gross_amount)
    : items
    ? items
        .filter((item: any) => {
          const c = String(item.color || "").toUpperCase();
          const s = String(item.size || "").toUpperCase();
          return (c.includes("DP") || s.includes("DP")) && !c.includes("LUNAS") && !s.includes("LUNAS");
        })
        .reduce((sum: number, item: any) => {
          const baseSubtotal = Number(item.subtotal || item.unit_price * item.quantity || 0);
          const sizeAddon = getSizeSurcharge(item.size) * Number(item.quantity || 1);
          return sum + baseSubtotal + sizeAddon;
        }, 0)
    : Number(order.gross_amount);

  const totalSizeSurcharge = items?.reduce((sum: number, i: any) => sum + getSizeSurcharge(i.size) * Number(i.quantity || 1), 0) || 0;
  const grandTotalProduct = Number(order.gross_amount) + (isDp ? pelunasanAmount : 0);

  return (
    <div className="min-h-screen bg-[#FCFAF7] text-ink font-sans">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-5 lg:px-10 py-6 space-y-6">

        {/* Parent Order Banner if current order is a Pelunasan order */}
        {isPelunasanOrder(fullOrder) && (
          <div className="bg-amber-50 border-2 border-ink rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 border border-ink/20 rounded-lg text-amber-800 shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-xs text-amber-900 uppercase block">Transaksi Pelunasan</span>
                <p className="text-xs text-muted-foreground">
                  Ini adalah transaksi pelunasan sisa tagihan untuk pesanan DP utama.
                </p>
              </div>
            </div>
            {order.notes && order.notes.includes("Pelunasan untuk Order:") && (
              <button
                onClick={() => {
                  const match = order.notes.match(/Pelunasan untuk Order:\s*([A-Za-z0-9-]+)/);
                  if (match?.[1]) {
                    navigate({ to: "/orders/$orderId", params: { orderId: match[1] } });
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-cream text-ink font-bold border-2 border-ink rounded-lg text-xs shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer shrink-0"
              >
                Lihat Pesanan DP Utama →
              </button>
            )}
          </div>
        )}

        {/* Top Header Bar: Clean & Open Layout */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-ink/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              to="/orders"
              className="p-2 bg-white border-2 border-ink rounded-lg hover:bg-cream active:scale-95 transition-all shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-ink" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-ink uppercase tracking-tight">ID PESANAN: {order.order_id}</h1>
                {isDp && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold border border-amber-300 rounded text-[10px] uppercase">
                    DP 50%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dibuat pada: {new Date(order.created_at).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) || order.created_at}
              </p>
            </div>
          </div>
          <div>{getStatusBadge(fullOrder, linkedPelunasan)}</div>
        </div>

        {/* Status & Rincian Pelunasan Box for DP Orders */}
        {isDp && order.order_status !== "cancelled" && (
          <div className="bg-amber-50/70 border-2 border-amber-300 rounded-xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(217,119,6,0.25)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-amber-200/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-brand-orange text-white rounded-md border border-ink/20">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-xs text-ink uppercase tracking-wider">
                    STATUS &amp; RINCIAN PELUNASAN
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Pelunasan wajib diselesaikan sebelum atau saat pengambilan barang
                  </p>
                </div>
              </div>
              {linkedPelunasan ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-white border border-amber-300 px-2 py-0.5 rounded font-bold text-ink">
                    {linkedPelunasan.order_id}
                  </span>
                  {getPelunasanStatusBadge(linkedPelunasan)}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full border border-amber-300">
                  <Clock className="w-3 h-3 animate-pulse" /> Menunggu Pelunasan
                </span>
              )}
            </div>

            {/* If Pelunasan proof was rejected by admin */}
            {linkedPelunasan && linkedPelunasan.payment_proof_note && linkedPelunasan.payment_status !== "paid" && (
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-3 text-xs text-red-900 font-medium mb-4 space-y-1">
                <span className="font-extrabold text-red-900 block flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Catatan Penolakan Pelunasan dari Admin:
                </span>
                <p className="italic">"{linkedPelunasan.payment_proof_note}"</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block">
                  Nominal Pelunasan (Sisa Kurang):
                </span>
                <span className="font-black text-brand-orange text-lg">
                  Rp {pelunasanAmount > 0 ? pelunasanAmount.toLocaleString("id-ID") : "—"}
                </span>
                <p className="text-[11px] text-muted-foreground font-medium mt-1">
                  * DP Terbayar: Rp {Number(order.gross_amount).toLocaleString("id-ID")}
                  {pelunasanAmount > 0 && ` • Total Harga Produk: Rp ${(Number(order.gross_amount) + pelunasanAmount).toLocaleString("id-ID")}`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
                {linkedPelunasan ? (
                  linkedPelunasan.payment_status === "paid" ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300 rounded-lg text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Pelunasan Lunas Terbayar
                    </span>
                  ) : linkedPelunasan.payment_proof_url ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => window.open(resolveImageUrl(linkedPelunasan.payment_proof_url), "_blank")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg text-xs transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Lihat Bukti
                      </button>
                      <button
                        onClick={() => navigate({ to: "/order-confirmation", search: { orderId: linkedPelunasan.order_id } })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-cream text-ink font-bold border-2 border-ink rounded-lg text-xs shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-brand-orange" />
                        Ganti Bukti
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate({ to: "/order-confirmation", search: { orderId: linkedPelunasan.order_id } })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold border-2 border-ink rounded-lg text-xs uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload Bukti Pelunasan
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleCreatePelunasanDetail}
                    disabled={creatingPelunasan}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-extrabold border-2 border-ink rounded-lg text-xs uppercase shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] active:translate-x-[1px] active:translate-y-[1px] transition cursor-pointer disabled:opacity-50"
                  >
                    {creatingPelunasan ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        BAYAR PELUNASAN
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Embedded Direct Upload Box for Pelunasan QRIS if linked & unpaid */}
            {linkedPelunasan && linkedPelunasan.payment_status !== "paid" && (
              <div className="mt-4 pt-3 border-t border-amber-300/60">
                <label className="block text-xs font-extrabold text-ink uppercase mb-1.5">
                  {linkedPelunasan.payment_proof_url ? "Unggah Ulang Bukti Transfer Pelunasan:" : "Unggah Bukti Transfer Pelunasan (QRIS):"}
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePelunasanProofFileChange}
                    className="text-xs w-full sm:w-auto text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-2 file:border-ink file:text-xs file:font-bold file:bg-white file:text-ink hover:file:bg-brand-orange hover:file:text-cream cursor-pointer"
                  />
                  {pelunasanProofFile && (
                    <button
                      onClick={handleUploadPelunasanProof}
                      disabled={uploadingPelunasanProof}
                      className="w-full sm:w-auto px-4 py-1.5 bg-brand-orange text-white border-2 border-ink font-bold text-xs uppercase rounded-lg shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] hover:bg-brand-orange/90 transition cursor-pointer disabled:opacity-50"
                    >
                      {uploadingPelunasanProof ? "Mengunggah..." : "Kirim Bukti Pelunasan"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 1. Admin Rejected Payment Proof Alert */}
        {order.payment_proof_note && order.payment_status !== "paid" && order.order_status !== "cancelled" && (
          <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)] animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 border border-red-300 rounded-lg text-red-600 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-black text-sm text-red-900 uppercase tracking-wide">
                    Bukti Pembayaran Ditolak Admin
                  </h3>
                  <span className="text-[10px] font-bold bg-red-200 text-red-900 px-2 py-0.5 rounded border border-red-300 uppercase">
                    Perlu Unggah Ulang
                  </span>
                </div>

                <div className="bg-white/90 border border-red-200 rounded-lg p-3 text-xs text-red-800 font-medium leading-relaxed">
                  <span className="font-extrabold text-red-900 block mb-0.5">Catatan/Alasan dari Admin:</span>
                  "{order.payment_proof_note}"
                </div>

                {/* Show Old Rejected Proof Thumbnail */}
                {order.payment_proof_url && (
                  <div className="bg-white/90 border border-red-300 rounded-lg p-3">
                    <span className="text-[11px] font-extrabold text-red-900 uppercase block mb-1.5">
                      Foto Bukti Transfer yang Ditolak:
                    </span>
                    <div className="flex items-center gap-3">
                      <a
                        href={resolveImageUrl(order.payment_proof_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-20 h-20 border-2 border-red-400 rounded-lg overflow-hidden bg-cream shrink-0 group relative cursor-pointer"
                      >
                        <img
                          src={resolveImageUrl(order.payment_proof_url)}
                          alt="Bukti Transfer Ditolak"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-red-900/30 flex items-center justify-center">
                          <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Ditolak</span>
                        </div>
                      </a>
                      <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                        Foto di atas adalah bukti transfer sebelumnya yang dinilai tidak valid oleh admin. Silakan periksa kembali dan unggah bukti baru yang jelas di bawah.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. Order Cancelled Alert */}
        {order.order_status === "cancelled" && (
          <div className="bg-red-50 border-2 border-ink rounded-xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 border border-ink/20 rounded-lg text-red-600 shrink-0 mt-0.5">
                <X className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-ink uppercase tracking-wide">
                  Pesanan Dibatalkan
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {order.payment_status === "expired"
                    ? "Pesanan ini otomatis dibatalkan oleh sistem karena pembayaran tidak diselesaikan sesuai batas waktu."
                    : order.notes
                    ? `Alasan Pembatalan / Catatan Admin: "${order.notes}"`
                    : "Pesanan ini telah dibatalkan oleh Admin / Sistem. Jika Anda telah melakukan pembayaran, silakan hubungi tim Admin FILKOM Merch via WhatsApp."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. General Admin Notes Notice (for non-cancelled orders) */}
        {order.notes && order.order_status !== "cancelled" && (
          <div className="bg-blue-50 border-2 border-ink rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 border border-ink/20 rounded-lg text-blue-700 shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">Catatan dari Admin</h4>
                <p className="text-xs font-medium text-blue-900 mt-1">{order.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Buyer & Shipping Info (Model Loss) + Items Cards */}
          <div className="lg:col-span-2 space-y-6">

            {/* Buyer & Shipping Info - Clean Loss Model (No heavy nested cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/70 border border-ink/15 rounded-xl p-4 sm:p-5">
              <div>
                <h3 className="font-black text-xs text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-brand-orange" /> Informasi Pembeli
                </h3>
                <p className="font-extrabold text-ink text-sm">{order.customer_name}</p>
                {order.customer_nim && <p className="text-xs text-muted-foreground mt-0.5">NIM: {order.customer_nim}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{order.customer_email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{order.customer_phone}</p>
              </div>
              
              <div className="border-t sm:border-t-0 sm:border-l border-ink/15 pt-4 sm:pt-0 sm:pl-6">
                <h3 className="font-black text-xs text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-brand-orange" /> Informasi Pengiriman
                </h3>
                <p className="font-extrabold text-ink text-sm">{getFulfillmentLabel(order.fulfillment_type)}</p>
                {order.fulfillment_type === "shipping" && order.shipping_address && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{order.shipping_address}</p>
                )}
              </div>
            </div>

            {/* Items List (Cards) */}
            <div>
              <h3 className="font-black text-xs text-ink uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-brand-orange" /> Item Yang Dibeli ({items?.length || 0})
              </h3>
              <div className="space-y-3">
                {items?.map((item: any) => {
                  const hasReview = reviews?.some((r: any) => Number(r.product_id) === Number(item.product_id));
                  return (
                    <div key={item.id} className="bg-white border-2 border-ink rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                            ) : isReviewAllowed(fullOrder) ? (
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

            {/* Payment Proof Upload & Status Box (for Unpaid / Pending verification orders) */}
            {order.order_status !== "cancelled" && order.payment_status !== "paid" && (
              <div className="bg-white border-2 border-ink rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] p-5">
                <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h3 className="font-black text-xs text-ink uppercase tracking-wider">
                      {order.payment_proof_url ? "Status Bukti Pembayaran QRIS" : "Unggah Bukti Pembayaran QRIS"}
                    </h3>
                  </div>
                  {order.payment_proof_url && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                      Menunggu Verifikasi Admin
                    </span>
                  )}
                </div>

                {order.payment_proof_url ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4 bg-cream/30 border border-ink/20 rounded-xl p-3.5">
                      <a
                        href={resolveImageUrl(order.payment_proof_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-24 h-24 border-2 border-ink rounded-lg overflow-hidden bg-white shrink-0 group relative cursor-pointer"
                      >
                        <img
                          src={resolveImageUrl(order.payment_proof_url)}
                          alt="Bukti Transfer Terkirim"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </a>
                      <div className="text-xs text-ink space-y-1 flex-1">
                        <p className="font-extrabold text-amber-900">Bukti Pembayaran Sudah Terunggah</p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          Bukti pembayaran Anda sudah masuk ke sistem dan sedang dicek oleh Admin. Verifikasi biasanya membutuhkan waktu beberapa saat saat jam operasional.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-ink uppercase mb-2">
                        Ingin Mengganti / Unggah Ulang Bukti Pembayaran?
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentProofFileChange}
                          className="text-xs w-full sm:w-auto text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-ink file:text-xs file:font-bold file:bg-cream file:text-ink hover:file:bg-brand-orange hover:file:text-cream cursor-pointer"
                        />
                        {paymentProofFile && (
                          <button
                            onClick={handleUploadPaymentProof}
                            disabled={uploadingPaymentProof}
                            className="w-full sm:w-auto px-4 py-2 bg-brand-orange text-white border-2 border-ink font-bold text-xs uppercase rounded shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-brand-orange/90 transition cursor-pointer disabled:opacity-50"
                          >
                            {uploadingPaymentProof ? "Mengunggah..." : "Kirim Bukti Baru"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Silakan bayar atau transfer via QRIS BEM FILKOM, lalu unggah foto/screenshot bukti transfer di bawah ini:
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePaymentProofFileChange}
                        className="text-xs w-full sm:w-auto text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-2 file:border-ink file:text-xs file:font-bold file:bg-cream file:text-ink hover:file:bg-brand-orange hover:file:text-cream cursor-pointer"
                      />
                      {paymentProofFile && (
                        <button
                          onClick={handleUploadPaymentProof}
                          disabled={uploadingPaymentProof}
                          className="w-full sm:w-auto px-5 py-2.5 bg-brand-orange text-white border-2 border-ink font-extrabold text-xs uppercase rounded-lg shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-brand-orange/90 transition cursor-pointer disabled:opacity-50"
                        >
                          {uploadingPaymentProof ? "Mengunggah..." : "Unggah Bukti Transfer"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Fulfillment Proof Uploaded by Admin */}
            {order.fulfillment_proof_url && (
              <div className="bg-white border-2 border-ink rounded-xl shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] p-5">
                <h3 className="font-extrabold text-ink uppercase tracking-wider text-xs mb-3 border-b border-ink/20 pb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Bukti Serah Terima / Pengiriman dari Admin
                </h3>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <a
                    href={resolveImageUrl(order.fulfillment_proof_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-28 h-28 border-2 border-ink rounded-lg overflow-hidden bg-cream shrink-0 hover:opacity-90 transition group relative cursor-pointer"
                  >
                    <img
                      src={resolveImageUrl(order.fulfillment_proof_url)}
                      alt="Bukti Serah Terima Admin"
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </a>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-bold text-ink text-xs">Foto Penyerahan / Bukti Pengiriman Terlampir</p>
                    <p className="leading-relaxed">
                      Admin telah mengunggah foto bukti fisik penyerahan barang atau resi pengiriman. Silakan klik gambar di samping untuk melihat dalam ukuran penuh.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Rincian Pembayaran & Action Buttons */}
          <div className="space-y-4 lg:sticky lg:top-24">
            
            {/* Rincian Pembayaran */}
            <div className="bg-white border-2 border-ink rounded-xl shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] p-5 space-y-3">
              <h3 className="font-extrabold text-ink uppercase tracking-wider text-xs border-b border-ink/20 pb-2">
                Rincian Pembayaran
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal Produk ({isDp ? "DP 50%" : "Full Payment"}):</span>
                  <span className="font-bold text-ink">Rp {Number(order.gross_amount).toLocaleString("id-ID")}</span>
                </div>

                {totalSizeSurcharge > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tambahan Ukuran di atas XL:</span>
                    <span className="font-bold text-ink">+Rp {totalSizeSurcharge.toLocaleString("id-ID")}</span>
                  </div>
                )}
                
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

                {isDp && (
                  <>
                    <div className="flex justify-between text-emerald-700 font-semibold border-t border-dashed border-ink/20 pt-2 mt-2">
                      <span>DP Terbayar Sekarang:</span>
                      <span>Rp {Number(order.gross_amount).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex justify-between text-brand-orange font-semibold">
                      <span>Nominal Pelunasan (Sisa Kurang):</span>
                      <span>Rp {pelunasanAmount.toLocaleString("id-ID")}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center text-sm font-extrabold text-ink border-t-2 border-ink pt-2.5 mt-2">
                  <span>{isDp ? "TOTAL ESTIMASI HARGA PRODUK:" : "TOTAL AKHIR:"}</span>
                  <span className="text-brand-orange text-base font-black">
                    Rp {grandTotalProduct.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {(order.order_status === "ready_for_pickup" || order.order_status === "shipped" || order.is_complained === 1) && (
                <button
                  onClick={() => setComplaintModalOpen(true)}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border-2 border-ink text-xs font-bold uppercase rounded-lg shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer ${order.is_complained === 1 ? "bg-red-600 text-white hover:bg-red-700" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {order.is_complained === 1 ? "Komplain Diajukan" : "Ajukan Komplain"}
                </button>
              )}

              {(order.order_status === "ready_for_pickup" || order.order_status === "shipped") && (
                <button
                  onClick={() => setCompletionModalOpen(true)}
                  disabled={completingOrderId === order.order_id}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border-2 border-ink text-xs font-extrabold uppercase bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {completingOrderId === order.order_id ? "Memproses..." : "Pesanan Diterima"}
                </button>
              )}

              {/* Contact admin */}
              <a
                href="https://wa.me/6282287190402"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border-2 border-ink text-xs font-bold uppercase bg-green-100 hover:bg-green-200 text-green-800 rounded-lg shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer"
              >
                Hubungi Admin
              </a>
            </div>

          </div>
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
