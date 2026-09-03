import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  PackageCheck,
  X,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Check,
  UserCheck,
  ShieldAlert,
  Printer,
  RotateCcw,
  Undo2,
  Camera,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/api-config";
import type { OrderItem } from "@/backend/server-actions";
import { LiveCameraCapture } from "@/components/LiveCameraCapture";
import { resolveImageUrl } from "@/lib/image-resolver";

const getAPI_URL = () => `${getApiBaseUrl()}/api`;

export const isJacketProduct = (productName?: string) => {
  const name = (productName || "").toLowerCase();
  return (
    name.includes("jaket") ||
    name.includes("jacket") ||
    name.includes("varsity") ||
    name.includes("hoodie") ||
    name.includes("bomber")
  );
};

export const getEffectiveItemStatus = (item: OrderItem): "pending" | "ready" | "picked_up" => {
  if (item.pickup_status === "picked_up") return "picked_up";
  if (item.pickup_status === "ready") return "ready";
  if (item.pickup_status === "pending") return "pending";
  // Aturan default:
  // Jaket -> Menyusul (pending)
  // Non-jaket -> Bukan Menyusul (ready)
  return isJacketProduct(item.product_name) ? "pending" : "ready";
};

export interface PartialPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  items: OrderItem[];
  currentUser?: { id?: number; name?: string; role?: string };
  onItemsUpdated?: (updatedItems: OrderItem[]) => void;
  onPrintReceipt?: () => void;
  onOrderCompleted?: (proofUrl: string) => Promise<void> | void;
}

export function PartialPickupModal({
  isOpen,
  onClose,
  order,
  items: initialItems,
  currentUser,
  onItemsUpdated,
  onPrintReceipt,
  onOrderCompleted,
}: PartialPickupModalProps) {
  const [items, setItems] = useState<OrderItem[]>(initialItems || []);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"checklist" | "notification">("checklist");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false);

  // Photo proof handover states
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [handoverTargetItems, setHandoverTargetItems] = useState<OrderItem[]>([]);
  const [handoverProofUrl, setHandoverProofUrl] = useState<string>("");
  const [handoverNotes, setHandoverNotes] = useState<string>("");
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);
  const [isCompletingWholeOrder, setIsCompletingWholeOrder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "auto";
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
          document.body.style.overflow = prevOverflow;
          document.body.style.pointerEvents = "auto";
        };
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && order) {
      setItems(initialItems || []);

      // Default pilih produk yang statusnya siap / non-jaket
      const defaultSelected = (initialItems || [])
        .filter((item) => {
          const effective = getEffectiveItemStatus(item);
          return effective === "ready";
        })
        .map((item) => item.id);

      setSelectedItemIds(
        defaultSelected.length > 0
          ? defaultSelected
          : (initialItems || []).map((i) => i.id),
      );

      generateNotificationMessage(initialItems || [], defaultSelected);
    }
  }, [isOpen, order, initialItems]);

  if (!isOpen || !order) return null;

  const generateNotificationMessage = (
    itemList: OrderItem[],
    selectedIds: number[],
  ) => {
    const readyItems = itemList.filter((i) => selectedIds.includes(i.id));
    const pendingItems = itemList.filter((i) => !selectedIds.includes(i.id));

    const readyListText = readyItems
      .map((i) => {
        const variant = [i.size, i.color]
          .filter(
            (v) => v && v !== "-" && v !== "One Size" && v !== "All Size",
          )
          .join(" / ");
        return `• ${i.product_name}${variant ? ` (${variant})` : ""} - ${i.quantity} pcs`;
      })
      .join("\n");

    const pendingListText = pendingItems
      .map((i) => {
        const variant = [i.size, i.color]
          .filter(
            (v) => v && v !== "-" && v !== "One Size" && v !== "All Size",
          )
          .join(" / ");
        return `• ${i.product_name}${variant ? ` (${variant})` : ""} (Menyusul)`;
      })
      .join("\n");

    setNotifTitle(`📦 Barang Pesanan Siap Diambil (#${order.order_id})`);

    let msg = `Halo Kak ${order.customer_name || "Pembeli"},\n\nSebagian produk pesanan Anda sudah siap untuk diambil di FILKOM Merch:\n\n${readyListText || "• (Item pesanan terpilih)"}\n\n`;

    if (pendingItems.length > 0) {
      msg += `Untuk item berikut masih dalam antrean / proses produksi dan akan diinfokan kembali saat siap:\n${pendingListText}\n\n`;
    }

    msg += `📍 Lokasi Pengambilan: FILKOM Merch (Gedung A Fakultas Ilmu Komputer UB, Lowokwaru, Kota Malang).\nSilakan tunjukkan nomor pesanan / struk saat pengambilan. Terima kasih!`;

    setNotifMessage(msg);
  };

  const toggleItemSelect = (id: number) => {
    const newSelected = selectedItemIds.includes(id)
      ? selectedItemIds.filter((item) => item !== id)
      : [...selectedItemIds, id];
    setSelectedItemIds(newSelected);
    generateNotificationMessage(items, newSelected);
  };

  const selectNonJacketOnly = () => {
    const nonJacketIds = items
      .filter((item) => {
        const name = (item.product_name || "").toLowerCase();
        return (
          !name.includes("jaket") &&
          !name.includes("varsity") &&
          !name.includes("hoodie") &&
          !name.includes("bomber")
        );
      })
      .map((i) => i.id);
    setSelectedItemIds(nonJacketIds);
    generateNotificationMessage(items, nonJacketIds);
    toast.info(`Memilih ${nonJacketIds.length} produk non-jaket`);
  };

  const selectAll = () => {
    const allIds = items.map((i) => i.id);
    setSelectedItemIds(allIds);
    generateNotificationMessage(items, allIds);
  };

  const handleUpdateItemStatus = async (
    targetItems: Array<{
      id: number;
      status: "pending" | "ready" | "picked_up";
      proof_url?: string;
    }>,
    customNotes?: string,
    proofUrl?: string,
  ) => {
    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${getAPI_URL()}/admin/orders/${order.order_id}/items/pickup-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-role": currentUser?.role || "admin",
            "x-user-id": String(currentUser?.id || ""),
            "x-user-name": currentUser?.name || "Admin",
          },
          body: JSON.stringify({
            items: targetItems,
            notes: customNotes || `Update status via Checklist Pengambilan`,
            proof_url: proofUrl,
          }),
        },
      );

      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        if (onItemsUpdated) onItemsUpdated(data.items);
        toast.success(data.message || "Status item berhasil diperbarui");
      } else {
        toast.error(data.error || "Gagal memperbarui status item");
      }
    } catch (err: any) {
      toast.error(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Open Handover & Photo Proof Modal for whole order
  const openCompleteAllModal = () => {
    setIsCompletingWholeOrder(true);
    // Target all items that are not yet picked up, or all items
    const remainingItems = items.filter((i) => i.pickup_status !== "picked_up");
    setHandoverTargetItems(remainingItems.length > 0 ? remainingItems : items);
    setHandoverProofUrl("");
    setHandoverNotes("Seluruh pesanan diambil langsung oleh pembeli");
    setHandoverModalOpen(true);
  };

  // Open Handover & Photo Proof Modal
  const openHandoverModal = (targetList: OrderItem[]) => {
    if (targetList.length === 0) {
      toast.error("Pilih setidaknya 1 item produk");
      return;
    }
    setIsCompletingWholeOrder(false);
    setHandoverTargetItems(targetList);
    setHandoverProofUrl("");
    setHandoverNotes("Diambil langsung oleh pembeli");
    setHandoverModalOpen(true);
  };

  const handleConfirmHandoverWithProof = async () => {
    if (!handoverProofUrl) {
      toast.error("Wajib mengambil atau mengunggah foto bukti serah terima!");
      return;
    }
    const targetPayload = handoverTargetItems.map((item) => ({
      id: item.id,
      status: "picked_up" as const,
      proof_url: handoverProofUrl || undefined,
    }));
    await handleUpdateItemStatus(
      targetPayload,
      handoverNotes || (isCompletingWholeOrder ? "Seluruh pesanan diserahkan ke pembeli" : "Barang diserahkan ke pembeli"),
      handoverProofUrl || undefined,
    );

    // If completing whole order OR all items in the order are now picked up
    const remainingAfterThis = items.filter(
      (it) => it.pickup_status !== "picked_up" && !handoverTargetItems.some((t) => t.id === it.id)
    );
    if ((isCompletingWholeOrder || remainingAfterThis.length === 0) && onOrderCompleted) {
      await onOrderCompleted(handoverProofUrl);
      onClose();
    }

    setHandoverModalOpen(false);
    setHandoverProofUrl("");
    setIsCompletingWholeOrder(false);
  };

  const handleConfirmSendNotification = async () => {
    try {
      setSendingNotif(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${getAPI_URL()}/admin/orders/${order.order_id}/notify-pickup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-role": currentUser?.role || "admin",
            "x-user-id": String(currentUser?.id || ""),
            "x-user-name": currentUser?.name || "Admin",
          },
          body: JSON.stringify({
            readyItemIds: selectedItemIds,
            title: notifTitle,
            message: notifMessage,
          }),
        },
      );

      const data = await res.json();
      if (data.success) {
        setShowDoubleConfirm(false);
        if (data.items) {
          setItems(data.items);
          if (onItemsUpdated) onItemsUpdated(data.items);
        }
        toast.success(
          "Notifikasi in-app & web push berhasil dikirim ke pembeli!",
        );
        setActiveTab("checklist");
      } else {
        toast.error(data.error || "Gagal mengirim notifikasi");
      }
    } catch (err: any) {
      toast.error(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setSendingNotif(false);
    }
  };

  // Stats
  const totalCount = items.length;
  const pickedCount = items.filter(
    (i) => getEffectiveItemStatus(i) === "picked_up",
  ).length;
  const readyCount = items.filter(
    (i) => getEffectiveItemStatus(i) === "ready",
  ).length;
  const pendingCount = items.filter(
    (i) => getEffectiveItemStatus(i) === "pending",
  ).length;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      style={{ pointerEvents: "auto" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 text-left overflow-hidden relative z-10"
        style={{ pointerEvents: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-orange-50/50 to-white dark:from-gray-900 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-orange/10 text-brand-orange rounded-xl shrink-0">
              <PackageCheck className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-gray-900 dark:text-white text-base">
                  Pengambilan &amp; Serah Terima Pesanan
                </h3>
                <span className="text-[11px] font-mono font-bold bg-orange-100 text-brand-orange dark:bg-orange-950/60 dark:text-orange-300 px-2 py-0.5 rounded-md border border-orange-200/60 dark:border-orange-800/40">
                  #{order.order_id}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Pembeli:{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {order.customer_name}
                </span>{" "}
                ({order.customer_phone || order.customer_email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onPrintReceipt && (
              <button
                onClick={onPrintReceipt}
                title="Cetak Struk Kantong / Packaging"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Struk</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar Summary */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-600 dark:text-gray-400">
              Progres Pemenuhan:
            </span>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {pickedCount} Diambil
              </span>
              <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <PackageCheck className="w-3.5 h-3.5" /> {readyCount} Siap
              </span>
              <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {pendingCount} Menyusul
              </span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div
              style={{
                width: `${totalCount ? (pickedCount / totalCount) * 100 : 0}%`,
              }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`${pickedCount} diambil`}
            />
            <div
              style={{
                width: `${totalCount ? (readyCount / totalCount) * 100 : 0}%`,
              }}
              className="bg-blue-500 h-full transition-all duration-300"
              title={`${readyCount} siap diambil`}
            />
            <div
              style={{
                width: `${totalCount ? (pendingCount / totalCount) * 100 : 0}%`,
              }}
              className="bg-amber-400 h-full transition-all duration-300"
              title={`${pendingCount} menyusul`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 px-4 sm:px-6 gap-2">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`py-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "checklist"
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Checklist &amp; Serah Terima
          </button>
          <button
            onClick={() => setActiveTab("notification")}
            className={`py-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "notification"
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Send className="w-4 h-4" /> Notifikasi WhatsApp Pembeli
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === "checklist" ? (
            <div className="space-y-4">
              {/* Top Quick Action Banner: Ambil Semua & Selesaikan */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200">
                      Ambil Semua Barang Sekaligus (Selesaikan Pesanan)
                    </h4>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                      Pembeli mengambil seluruh item pesanan hari ini? Ambil foto bukti serah terima untuk menyelesaikan pesanan.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCompleteAllModal}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Semua &amp; Selesai</span>
                </button>
              </div>

              {/* Quick action bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-orange-50/60 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={selectNonJacketOnly}
                    className="text-[11px] font-bold bg-white dark:bg-gray-800 text-brand-orange border border-orange-200 hover:bg-orange-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    Pilih Non-Jaket (Siap Diambil)
                  </button>
                  <button
                    onClick={selectAll}
                    className="text-[11px] font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      if (selectedItemIds.length === 0) {
                        toast.error("Pilih setidaknya 1 produk");
                        return;
                      }
                      handleUpdateItemStatus(
                        selectedItemIds.map((id) => ({
                          id,
                          status: "ready",
                        })),
                        "Tandai Siap Diambil massal",
                      );
                    }}
                    disabled={updatingStatus || selectedItemIds.length === 0}
                    className="flex items-center gap-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5" /> Tandai Siap
                  </button>
                  <button
                    onClick={() => {
                      const selectedItems = items.filter((i) =>
                        selectedItemIds.includes(i.id),
                      );
                      if (selectedItems.length === 0) {
                        toast.error("Pilih setidaknya 1 produk");
                        return;
                      }
                      openHandoverModal(selectedItems);
                    }}
                    disabled={updatingStatus || selectedItemIds.length === 0}
                    className="flex items-center gap-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" /> Serahkan Terpilih
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {items.map((item) => {
                  const effectiveStatus = getEffectiveItemStatus(item);
                  const isPicked = effectiveStatus === "picked_up";
                  const isReady = effectiveStatus === "ready";
                  const isSelected = selectedItemIds.includes(item.id);
                  const isJacket = (item.product_name || "").toLowerCase().includes("jaket") || (item.product_name || "").toLowerCase().includes("varsity") || (item.product_name || "").toLowerCase().includes("hoodie");

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isPicked
                          ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                          : isReady
                            ? "bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40"
                            : "bg-white border-gray-200 dark:bg-gray-800/80 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelect(item.id)}
                          className="mt-1 rounded text-brand-orange focus:ring-brand-orange cursor-pointer w-4 h-4"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 dark:text-white text-sm">
                              {item.product_name}
                            </span>
                            {isJacket && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-1.5 py-0.5 rounded">
                                Jaket
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                            <span>
                              Qty:{" "}
                              <strong className="text-gray-800 dark:text-gray-200">
                                {item.quantity}
                              </strong>
                            </span>
                            {item.size &&
                              item.size !== "-" &&
                              item.size !== "One Size" && (
                                <span>
                                  Ukuran:{" "}
                                  <strong className="text-gray-800 dark:text-gray-200">
                                    {item.size}
                                  </strong>
                                </span>
                              )}
                          </div>

                          {/* Pickup proof if already taken */}
                          {item.pickup_proof_url && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPreviewPhotoModal(item.pickup_proof_url || null)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 hover:bg-emerald-200 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-800"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Lihat Foto Bukti Pengambilan</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons per item */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {isPicked ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Diambil
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateItemStatus(
                                  [{ id: item.id, status: "ready" }],
                                  `Anulir penyerahan item #${item.id}`,
                                )
                              }
                              title="Batalkan status sudah diambil"
                              className="p-1 text-gray-400 hover:text-amber-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isReady ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-300">
                              <PackageCheck className="w-3.5 h-3.5" /> Siap Diambil
                            </span>
                            <button
                              onClick={() => openHandoverModal([item])}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" /> Serahkan
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateItemStatus(
                                  [{ id: item.id, status: "pending" }],
                                  `Kembalikan ke status menyusul item #${item.id}`,
                                )
                              }
                              title="Kembalikan ke Menyusul"
                              className="p-1 text-gray-400 hover:text-amber-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-300">
                              <Clock className="w-3.5 h-3.5" /> Menyusul
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateItemStatus(
                                  [{ id: item.id, status: "ready" }],
                                  `Tandai item #${item.id} siap diambil`,
                                )
                              }
                              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> Tandai Siap
                            </button>
                            <button
                              onClick={() => openHandoverModal([item])}
                              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" /> Serahkan
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Tab Notifikasi WhatsApp */
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                  Pilih item yang sudah siap diambil di tab Checklist atau tombol di bawah ini. Teks pesan notifikasi WhatsApp akan terisi otomatis dan siap dikirim ke pembeli.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Pilih Produk yang Siap Diambil:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((i) => {
                    const isSelected = selectedItemIds.includes(i.id);
                    const effective = getEffectiveItemStatus(i);
                    return (
                      <div
                        key={i.id}
                        onClick={() => toggleItemSelect(i.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-brand-orange/10 border-brand-orange font-bold text-brand-orange"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-brand-orange"
                          />
                          <span className="truncate max-w-[180px]">
                            {i.product_name}
                          </span>
                        </div>
                        <span className="text-[10px] opacity-75 shrink-0">
                          {effective === "ready" ? "Siap" : effective === "picked_up" ? "Diambil" : "Menyusul"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Judul Notifikasi
                </label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Isi Pesan WhatsApp
                </label>
                <textarea
                  rows={6}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDoubleConfirm(true)}
                  disabled={sendingNotif}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Notifikasi via WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          <p className="text-[11px] text-gray-500">
            *Status pengambilan tersinkronisasi langsung pada halaman lacak pesanan pembeli.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* DOUBLE CONFIRM MODAL FOR NOTIF */}
      {showDoubleConfirm && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDoubleConfirm(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-700 text-left relative z-20"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h4 className="font-black text-gray-900 dark:text-white text-sm">
                Konfirmasi Kirim Notifikasi
              </h4>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Pesan WhatsApp akan dikirimkan langsung ke nomor pembeli{" "}
              <strong>{order.customer_phone}</strong>. Lanjutkan?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDoubleConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSendNotification}
                disabled={sendingNotif}
                className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {sendingNotif ? "Mengirim..." : "Ya, Kirim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HANDOVER & PHOTO PROOF MODAL */}
      {handoverModalOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHandoverModalOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 text-left overflow-hidden relative z-20"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50 to-white dark:from-gray-900 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white text-base">
                    Bukti Serah Terima
                  </h4>
                </div>
              </div>
              <button
                onClick={() => setHandoverModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-gray-500 font-medium">
                  <span>Penerima:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {order.customer_name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-500 font-medium">
                  <span>No. Pesanan:</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                    #{order.order_id}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 mt-1.5">
                  <span className="text-gray-500 font-medium block mb-1">
                    {isCompletingWholeOrder ? "Daftar Barang yang Diambil Semua:" : "Daftar Barang yang Diserahkan Saat Ini:"}
                  </span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {handoverTargetItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between text-gray-700 dark:text-gray-300 font-medium"
                      >
                        <span>• {it.product_name}</span>
                        <span className="font-bold shrink-0">{it.quantity} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <LiveCameraCapture
                value={handoverProofUrl}
                onChange={(url) => setHandoverProofUrl(url)}
                onRemove={() => setHandoverProofUrl("")}
                resolveImageUrl={(url) => resolveImageUrl(url) || url}
                label="Foto Bukti Serah Terima"
              />

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Contoh: Diambil langsung oleh ybs / teman"
                  className="w-full p-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2 shrink-0 bg-gray-50/60 dark:bg-gray-900/60">
              <button
                type="button"
                onClick={() => setHandoverModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmHandoverWithProof}
                disabled={updatingStatus}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
              >
                Selesaikan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW PHOTO LIGHTBOX */}
      {previewPhotoModal && (
        <div
          className="fixed inset-0 z-[100010] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPhotoModal(null);
          }}
        >
          <div
            className="relative max-w-2xl w-full bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col items-center"
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-3.5 bg-gray-900/80 border-b border-gray-800 text-white text-xs font-bold">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Foto Bukti Serah Terima</span>
              </div>
              <button
                onClick={() => setPreviewPhotoModal(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3">
              <img
                src={resolveImageUrl(previewPhotoModal)}
                alt="Foto Bukti"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
