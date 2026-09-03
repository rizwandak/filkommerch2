import React, { useState, useEffect } from "react";
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
    if (isOpen && order) {
      setItems(initialItems || []);

      // Auto-select items that are non-jacket or pending/ready
      const defaultSelected = (initialItems || [])
        .filter((item) => {
          const name = (item.product_name || "").toLowerCase();
          const isJacket =
            name.includes("jaket") ||
            name.includes("varsity") ||
            name.includes("hoodie") ||
            name.includes("bomber");
          return !isJacket;
        })
        .map((item) => item.id);

      // If no non-jacket found, select all
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
    (i) => i.pickup_status === "picked_up",
  ).length;
  const readyCount = items.filter((i) => i.pickup_status === "ready").length;
  const pendingCount = items.filter(
    (i) => !i.pickup_status || i.pickup_status === "pending",
  ).length;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 text-left overflow-hidden">
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
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-medium text-gray-600 dark:text-gray-300">
            <span>Status Pengambilan:</span>
            <div className="flex items-center gap-1 font-bold">
              <span className="text-emerald-600">{pickedCount} Diambil</span>
              <span>•</span>
              <span className="text-blue-600">{readyCount} Siap</span>
              <span>•</span>
              <span className="text-amber-600">{pendingCount} Menyusul</span>
            </div>
          </div>

          <div className="w-24 sm:w-32 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(pickedCount / (totalCount || 1)) * 100}%` }}
              title="Sudah Diambil"
            />
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${(readyCount / (totalCount || 1)) * 100}%` }}
              title="Siap Diambil"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-5 pt-2 gap-2 text-xs font-bold bg-white dark:bg-gray-900">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`pb-2.5 px-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "checklist"
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <PackageCheck className="w-4 h-4" /> Checklist Produk (
            {items.length})
          </button>
          <button
            onClick={() => setActiveTab("notification")}
            className={`pb-2.5 px-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "notification"
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Send className="w-4 h-4" /> Kirim Notifikasi Pengambilan
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              {/* Opsi 1: Selesaikan Seluruh Pesanan Sekaligus */}
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 rounded-2xl border-2 border-emerald-500/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-emerald-600 text-white rounded-md flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <span className="font-black text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                      Ambil Semua Barang (Selesaikan Pesanan)
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300">
                    Pembeli mengambil seluruh barang sekaligus? Klik tombol di samping untuk foto serah terima dan selesaikan pesanan secara langsung.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCompleteAllModal}
                  disabled={updatingStatus}
                  className="self-start sm:self-center shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ambil Semua &amp; Selesai</span>
                </button>
              </div>

              {/* Pemisah visual */}
              <div className="flex items-center gap-2 pt-1">
                <span className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                  Atau Pengambilan Bertahap / Parsial per Item
                </span>
                <span className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></span>
              </div>

              {/* Quick action bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-orange-50/60 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/40">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={selectNonJacketOnly}
                    className="text-[11px] font-bold bg-white dark:bg-gray-800 text-brand-orange border border-orange-200 hover:bg-orange-50 px-2.5 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    Pilih Non-Jaket (Ready)
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
                    <Camera className="w-3.5 h-3.5" /> Serahkan Terpilih (Foto)
                  </button>
                  <button
                    onClick={() => {
                      if (selectedItemIds.length === 0) {
                        toast.error("Pilih setidaknya 1 produk");
                        return;
                      }
                      handleUpdateItemStatus(
                        selectedItemIds.map((id) => ({
                          id,
                          status: "pending",
                        })),
                        "Anulir massal ke status Menyusul",
                      );
                    }}
                    disabled={updatingStatus || selectedItemIds.length === 0}
                    className="flex items-center gap-1 text-[11px] font-bold bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 px-2.5 py-1.5 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    title="Anulir item terpilih kembali ke status Menyusul"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Anulir Terpilih
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {items.map((item) => {
                  const isPicked = item.pickup_status === "picked_up";
                  const isReady = item.pickup_status === "ready";
                  const isPending =
                    !item.pickup_status || item.pickup_status === "pending";
                  const isSelected = selectedItemIds.includes(item.id);
                  const isJacket =
                    (item.product_name || "").toLowerCase().includes("jaket") ||
                    (item.product_name || "")
                      .toLowerCase()
                      .includes("varsity") ||
                    (item.product_name || "")
                      .toLowerCase()
                      .includes("hoodie");

                  return (
                    <div
                      key={item.id}
                      className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isPicked
                          ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                          : isReady
                            ? "bg-blue-50/40 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40"
                            : isJacket
                              ? "bg-amber-50/30 border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/30"
                              : "bg-white border-gray-200 dark:bg-gray-800/80 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelect(item.id)}
                          className="mt-1 w-4 h-4 rounded text-brand-orange focus:ring-brand-orange border-gray-300 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                              {item.product_name}
                            </span>
                            {isJacket && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300/60">
                                🧥 Jaket/Varsity
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>
                              {[item.size, item.color]
                                .filter(
                                  (v) =>
                                    v &&
                                    v !== "-" &&
                                    v !== "One Size" &&
                                    v !== "All Size",
                                )
                                .join(" / ") || "Standar"}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {item.quantity} pcs
                            </span>
                            <span>•</span>
                            <span>
                              Rp{" "}
                              {Number(
                                item.subtotal || item.unit_price,
                              ).toLocaleString("id-ID")}
                            </span>
                          </div>

                          {/* Pickup metadata & Photo proof button */}
                          {isPicked && (
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {item.picked_up_at && (
                                <div className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  Diambil pada{" "}
                                  {new Date(item.picked_up_at).toLocaleString(
                                    "id-ID",
                                  )}{" "}
                                  {item.picked_up_by_name
                                    ? `(Oleh: ${item.picked_up_by_name})`
                                    : ""}
                                </div>
                              )}
                              {item.pickup_proof_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewPhotoModal(item.pickup_proof_url!)
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                  title="Lihat Foto Bukti Serah Terima"
                                >
                                  <Camera className="w-3 h-3 text-emerald-700" />
                                  Foto Bukti
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openHandoverModal([item])}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                                  title="Ambil / Upload Foto Bukti"
                                >
                                  <Camera className="w-3 h-3" />
                                  + Foto Bukti
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Badges & Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                        {isPicked ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-300/70">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />{" "}
                              Sudah Diambil
                            </span>
                            {/* Anulir buttons */}
                            <button
                              onClick={() =>
                                handleUpdateItemStatus(
                                  [{ id: item.id, status: "ready" }],
                                  "Anulir pengambilan: dikembalikan ke Siap Diambil",
                                )
                              }
                              disabled={updatingStatus}
                              className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Batalkan serah terima, ubah kembali ke Siap Diambil"
                            >
                              <RotateCcw className="w-3 h-3" /> Anulir ke Siap
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateItemStatus(
                                  [{ id: item.id, status: "pending" }],
                                  "Anulir pengambilan: dikembalikan ke Menyusul",
                                )
                              }
                              disabled={updatingStatus}
                              className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-50 text-gray-600 hover:text-red-700 hover:bg-red-50 border border-gray-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Batalkan dan kembalikan ke status Menyusul"
                            >
                              <Undo2 className="w-3 h-3" /> ke Menyusul
                            </button>
                          </div>
                        ) : isReady ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-300/70">
                              <PackageCheck className="w-3.5 h-3.5 text-blue-600" />{" "}
                              Siap Diambil
                            </span>
                            <button
                              onClick={() => openHandoverModal([item])}
                              disabled={updatingStatus}
                              className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" /> Serahkan
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateItemStatus(
                                  [{ id: item.id, status: "pending" }],
                                  "Anulir kesiapan: dikembalikan ke Menyusul",
                                )
                              }
                              disabled={updatingStatus}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Anulir status siap, kembalikan ke Menyusul"
                            >
                              <RotateCcw className="w-3 h-3" /> Anulir ke Menyusul
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-300/70">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />{" "}
                              Menyusul
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateItemStatus(
                                  [{ id: item.id, status: "ready" }],
                                  "Item ditandai siap diambil",
                                )
                              }
                              disabled={updatingStatus}
                              className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            >
                              Set Siap
                            </button>
                            <button
                              onClick={() => openHandoverModal([item])}
                              disabled={updatingStatus}
                              className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" /> Diambil
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATION COMPOSER */}
          {activeTab === "notification" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/80 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Notifikasi Pengambilan Parsial</p>
                  <p className="mt-0.5 text-blue-800/80 dark:text-blue-300 text-[11px] leading-relaxed">
                    Notifikasi akan otomatis dikirimkan ke{" "}
                    <strong>In-App Lonceng</strong> dan{" "}
                    <strong>Web Push (HP/Browser)</strong> milik pembeli. Anda
                    dapat mengedit judul & isi pesan di bawah.
                  </p>
                </div>
              </div>

              {/* Items Selected Summary */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                  Barang yang diinfokan sudah siap ({selectedItemIds.length}{" "}
                  item):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((i) => {
                    const isSel = selectedItemIds.includes(i.id);
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => toggleItemSelect(i.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-all ${
                          isSel
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {isSel ? "✓ " : "+ "}
                        {i.product_name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Message inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                    Judul Notifikasi
                  </label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-orange/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                    Isi Pesan Notifikasi (Dapat Disesuaikan)
                  </label>
                  <textarea
                    rows={6}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-orange/40 resize-none font-sans"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDoubleConfirm(true)}
                  disabled={selectedItemIds.length === 0 || !notifTitle.trim()}
                  className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Kirim Notifikasi ke Pembeli
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Total {items.length} item dalam pesanan ini
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 rounded-xl transition-colors shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* DOUBLE CONFIRMATION NOTIF MODAL */}
      {showDoubleConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-700 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base">
                  Konfirmasi Pengiriman Notifikasi
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pastikan rincian berikut sudah sesuai sebelum dikirim.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs space-y-2 border border-gray-200/80 dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Penerima:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {order.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">No. Pesanan:</span>
                <span className="font-mono font-bold text-brand-orange">
                  #{order.order_id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Item Ready:</span>
                <span className="font-bold text-emerald-600">
                  {selectedItemIds.length} Produk
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Apakah Anda yakin ingin mengirim notifikasi kesiapan pengambilan
              ini ke pembeli sekarang?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDoubleConfirm(false)}
                disabled={sendingNotif}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSendNotification}
                disabled={sendingNotif}
                className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {sendingNotif ? (
                  <>Mengirim...</>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Ya, Kirim Notifikasi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HANDOVER & PHOTO PROOF MODAL */}
      {handoverModalOpen && (
        <div className="fixed inset-0 z-[1150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 text-left overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-50 to-white dark:from-gray-900 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white text-base">
                    {isCompletingWholeOrder ? "Bukti Pengambilan Seluruh Pesanan" : "Bukti Serah Terima Barang"}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isCompletingWholeOrder
                      ? "Ambil foto bukti serah terima untuk menyelesaikan seluruh pesanan ini"
                      : "Ambil foto langsung kamera atau upload file bukti pengambilan"}
                  </p>
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
              {/* Recipient & Items info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-gray-500 font-medium">
                  <span>Penerima:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {order.customer_name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-500 font-medium">
                  <span>No. Pesanan:</span>
                  <span className="font-mono font-bold text-brand-orange">
                    #{order.order_id}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Barang yang Diserahkan ({handoverTargetItems.length} produk):
                  </span>
                  <div className="space-y-1">
                    {handoverTargetItems.map((it) => (
                      <div
                        key={it.id}
                        className="flex justify-between items-center font-medium text-gray-700 dark:text-gray-300"
                      >
                        <span>• {it.product_name}</span>
                        <span className="font-bold shrink-0">{it.quantity} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Camera & File Upload Capture */}
              <div>
                <LiveCameraCapture
                  value={handoverProofUrl}
                  onChange={(url) => setHandoverProofUrl(url)}
                  onRemove={() => setHandoverProofUrl("")}
                  resolveImageUrl={resolveImageUrl}
                  label="Foto Bukti Serah Terima (Kamera / Upload)"
                />
              </div>

              {/* Notes input */}
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                  Catatan Serah Terima (Opsional)
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Contoh: Diambil langsung oleh pemesan / Diwakilkan teman"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setHandoverModalOpen(false)}
                disabled={updatingStatus}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmHandoverWithProof}
                disabled={updatingStatus}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {updatingStatus
                  ? "Menyimpan..."
                  : isCompletingWholeOrder
                    ? "✓ Selesaikan Pesanan (Semua Diambil)"
                    : "✓ Selesaikan Serah Terima"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW PHOTO LIGHTBOX */}
      {previewPhotoModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative max-w-2xl w-full bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col items-center">
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
            <div className="p-3 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={resolveImageUrl(previewPhotoModal)}
                alt="Foto Bukti Serah Terima"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
