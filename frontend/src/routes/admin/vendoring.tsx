import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Package,
  DollarSign,
  BarChart3,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  RefreshCw,
  Search,
  X,
  TrendingUp,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import {
  getVendorsServerAction,
  createVendorServerAction,
  updateVendorServerAction,
  deleteVendorServerAction,
  getProductionSummaryServerAction,
  getVendorOrdersServerAction,
  createVendorOrderServerAction,
  updateVendorOrderStatusServerAction,
  deleteVendorOrderServerAction,
  getFinancialOverviewServerAction,
  getPreOrderCampaignsServerAction,
  getAllProductsAdmin,
  type Vendor,
  type VendorOrder,
  type PreOrderCampaign,
} from "@backend/server-actions";
import logoFm from "../../assets/logo_fm_removebg.png";

export const Route = createFileRoute("/admin/vendoring")({
  component: AdminVendoringPage,
  head: () => ({ meta: [{ title: "Fitur Vendoring — Admin Panel" }] }),
});

function AdminVendoringPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"summary" | "vendors" | "orders" | "financials">("summary");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("all");

  // Vendor Modal State
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorNotes, setVendorNotes] = useState("");

  // Vendor PO Modal State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | "">("");
  const [poDeadline, setPoDeadline] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poItems, setPoItems] = useState<Array<{ product_id: number; size: string; color: string; quantity: number; unit_cost: number }>>([]);

  // SPK Vendor Modal State
  const [selectedSpkPo, setSelectedSpkPo] = useState<VendorOrder | null>(null);
  const [isSpkModalOpen, setIsSpkModalOpen] = useState(false);
  const [paymentScheme, setPaymentScheme] = useState<string>("50_50");
  const [customPaymentNotes, setCustomPaymentNotes] = useState<string>("");



  const openSpkModal = (po: VendorOrder) => {
    setSelectedSpkPo(po);
    setIsSpkModalOpen(true);
  };

  const closeSpkModal = () => {
    setIsSpkModalOpen(false);
    setSelectedSpkPo(null);
  };

  const handlePrintSpk = () => {
    window.print();
  };

  const handleExportWordSpk = () => {
    if (!selectedSpkPo) return;

    const items = selectedSpkPo.items || [];
    const totalQty = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
    const totalCost = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);

    const createdDate = selectedSpkPo.created_at
      ? new Date(selectedSpkPo.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";

    const deadlineDate = selectedSpkPo.deadline
      ? new Date(selectedSpkPo.deadline).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "Sesuai Kesepakatan Khusus";

    let paymentHtml = "";
    if (paymentScheme === "50_50") {
      paymentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
          <tr>
            <td style="width: 50%; padding: 8px; border: 1px solid #1b1b1b; background-color: #ffffff;">
              <span style="font-size: 9pt; color: #666; font-weight: bold;">TERMIN 1 (DP 50% AWAL SAAT SPK):</span><br/>
              <strong style="font-size: 11pt; color: #ff5e00;">Rp ${Math.round(totalCost * 0.5).toLocaleString("id-ID")}</strong>
            </td>
            <td style="width: 50%; padding: 8px; border: 1px solid #1b1b1b; background-color: #ffffff;">
              <span style="font-size: 9pt; color: #666; font-weight: bold;">TERMIN 2 (PELUNASAN 50% SAAT SELESAI):</span><br/>
              <strong style="font-size: 11pt; color: #047857;">Rp ${Math.round(totalCost * 0.5).toLocaleString("id-ID")}</strong>
            </td>
          </tr>
        </table>
      `;
    } else if (paymentScheme === "30_20_50") {
      paymentHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
          <tr>
            <td style="width: 33%; padding: 6px; border: 1px solid #1b1b1b; background-color: #ffffff;">
              <span style="font-size: 8pt; color: #666; font-weight: bold;">TERMIN 1 (DP 30%):</span><br/>
              <strong style="font-size: 10pt; color: #ff5e00;">Rp ${Math.round(totalCost * 0.3).toLocaleString("id-ID")}</strong>
            </td>
            <td style="width: 33%; padding: 6px; border: 1px solid #1b1b1b; background-color: #ffffff;">
              <span style="font-size: 8pt; color: #666; font-weight: bold;">TERMIN 2 (PROGRESS 20%):</span><br/>
              <strong style="font-size: 10pt; color: #1d4ed8;">Rp ${Math.round(totalCost * 0.2).toLocaleString("id-ID")}</strong>
            </td>
            <td style="width: 34%; padding: 6px; border: 1px solid #1b1b1b; background-color: #ffffff;">
              <span style="font-size: 8pt; color: #666; font-weight: bold;">TERMIN 3 (PELUNASAN 50%):</span><br/>
              <strong style="font-size: 10pt; color: #047857;">Rp ${Math.round(totalCost * 0.5).toLocaleString("id-ID")}</strong>
            </td>
          </tr>
        </table>
      `;
    } else if (paymentScheme === "100_0") {
      paymentHtml = `
        <div style="padding: 8px; border: 1px solid #1b1b1b; background-color: #ffffff;">
          <span style="font-size: 9pt; color: #666; font-weight: bold;">PEMBAYARAN 100% LUNAS DI AWAL:</span><br/>
          <strong style="font-size: 12pt; color: #047857;">Rp ${totalCost.toLocaleString("id-ID")}</strong>
        </div>
      `;
    } else {
      paymentHtml = `
        <div style="padding: 8px; border: 1px solid #1b1b1b; background-color: #ffffff;">
          <span style="font-size: 9pt; color: #666; font-weight: bold;">KETENTUAN PEMBAYARAN KHUSUS:</span><br/>
          <strong style="font-size: 10pt; color: #1b1b1b;">${customPaymentNotes || "Sesuai Kesepakatan Khusus Antara Kedua Pihak"}</strong>
        </div>
      `;
    }

    const itemsRows = items.map((item: any, idx: number) => {
      const sub = (item.quantity || 0) * (item.unit_cost || 0);
      const spec = [item.size, item.color].filter(Boolean).join(" / ") || "Standard";
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #1b1b1b; padding: 6px;">${idx + 1}</td>
          <td style="font-weight: bold; border: 1px solid #1b1b1b; padding: 6px;">${item.catalog_product_name || `Produk #${item.product_id}`}</td>
          <td style="font-family: 'Courier New', monospace; border: 1px solid #1b1b1b; padding: 6px;">${spec}</td>
          <td style="text-align: center; font-weight: bold; color: #ff5e00; border: 1px solid #1b1b1b; padding: 6px;">${item.quantity} pcs</td>
          <td style="text-align: right; border: 1px solid #1b1b1b; padding: 6px;">Rp ${Number(item.unit_cost || 0).toLocaleString("id-ID")}</td>
          <td style="text-align: right; font-weight: bold; border: 1px solid #1b1b1b; padding: 6px;">Rp ${Number(sub).toLocaleString("id-ID")}</td>
        </tr>
      `;
    }).join("");

    const wordDocHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>SPK ${selectedSpkPo.po_number}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1b1b1b; margin: 20px; }
          h1 { font-size: 16pt; font-weight: bold; color: #1b1b1b; margin: 0; }
          h2 { font-size: 13pt; font-weight: bold; text-decoration: underline; text-align: center; margin-top: 15px; margin-bottom: 5px; }
          h3 { font-size: 11pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; color: #1b1b1b; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; }
          th, td { border: 1px solid #1b1b1b; padding: 6px 8px; text-align: left; font-size: 10pt; }
          th { background-color: #f3f0e6; font-weight: bold; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <!-- KOP SURAT HEADER -->
        <table style="width: 100%; border-bottom: 3px solid #1b1b1b; padding-bottom: 10px; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle; border: none;">
              <h1>FILKOM MERCH UB</h1>
              <div style="font-size: 10pt; color: #555; font-weight: bold;">Fakultas Ilmu Komputer, Universitas Brawijaya</div>
              <div style="font-size: 9pt; color: #777;">Gedung F FILKOM UB, Jl. Veteran, Malang</div>
            </td>
            <td style="text-align: right; vertical-align: middle; border: none;">
              <div style="background-color: #1b1b1b; color: #ffffff; padding: 4px 10px; font-weight: bold; font-size: 10pt; display: inline-block;">DOKUMEN RESMI SPK</div>
              <div style="font-size: 12pt; font-weight: bold; font-family: monospace; margin-top: 4px;">${selectedSpkPo.po_number}</div>
              <div style="font-size: 9pt; color: #555;">Tanggal: ${createdDate}</div>
            </td>
          </tr>
        </table>

        <!-- TITLE -->
        <h2>SURAT PERINTAH KERJA (SPK) PRODUKSI VENDOR</h2>
        <div style="text-align: center; font-size: 10pt; color: #666; margin-bottom: 15px;">Nomor Dokumen: SPK/${selectedSpkPo.po_number}/FM-UB/2026</div>

        <!-- PIHAK KERJASAMA -->
        <table style="width: 100%; border: 2px solid #1b1b1b; background-color: #fbf9f1; margin-bottom: 15px;">
          <tr>
            <td style="width: 50%; vertical-align: top; border: none; padding: 10px;">
              <div style="font-size: 9pt; font-weight: bold; color: #ff5e00;">PIHAK PERTAMA (PEMBERI KERJA)</div>
              <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">FILKOM MERCH UB</div>
              <div style="font-size: 9.5pt; color: #444; margin-top: 4px;">
                Pengelola Merchandise Resmi FILKOM UB<br/>
                Jl. Veteran, Lowokwaru, Malang, Jawa Timur<br/>
                CP: Manajemen Operasional FILKOM Merch
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; border: none; padding: 10px;">
              <div style="font-size: 9pt; font-weight: bold; color: #ff5e00;">PIHAK KEDUA (PELAKSANA VENDOR)</div>
              <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">${selectedSpkPo.vendor_name || "Vendor Mitra"}</div>
              <div style="font-size: 9.5pt; color: #444; margin-top: 4px;">
                PIC: ${selectedSpkPo.contact_person || "-"}<br/>
                No. Telepon / WA: ${selectedSpkPo.vendor_phone || "-"}
              </div>
            </td>
          </tr>
        </table>

        <!-- DEADLINE -->
        <table style="width: 100%; border: 2px solid #1b1b1b; background-color: #f1f5f9; margin-bottom: 15px;">
          <tr>
            <td style="border: none; padding: 8px;">
              <strong>TENGGAT WAKTU SELESAI PRODUKSI (DEADLINE):</strong>
              <div style="color: #ff5e00; font-weight: bold; font-size: 11pt;">${deadlineDate}</div>
            </td>
            <td style="text-align: right; border: none; padding: 8px;">
              <span style="font-size: 9pt; color: #666;">STATUS PO:</span>
              <div style="font-weight: bold; text-transform: uppercase;">${selectedSpkPo.status}</div>
            </td>
          </tr>
        </table>

        <!-- TABLE ITEMS -->
        <h3>RINCIAN PEKERJAAN &amp; SPESIFIKASI PRODUK:</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">No</th>
              <th>Nama Produk</th>
              <th>Ukuran / Varian Spesifikasi</th>
              <th style="text-align: center;">Qty (Pcs)</th>
              <th style="text-align: right;">Biaya Satuan (Rp)</th>
              <th style="text-align: right;">Total Biaya (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr style="background-color: #f3f0e6; font-weight: bold;">
              <td colspan="3" style="text-align: right; border: 1px solid #1b1b1b; padding: 8px;">TOTAL KESELURUHAN BIAYA SPK:</td>
              <td style="text-align: center; color: #ff5e00; border: 1px solid #1b1b1b; padding: 8px;">${totalQty} pcs</td>
              <td colspan="2" style="text-align: right; font-size: 12pt; border: 1px solid #1b1b1b; padding: 8px;">Rp ${totalCost.toLocaleString("id-ID")}</td>
            </tr>
          </tfoot>
        </table>

        <!-- SKEMA PEMBAYARAN -->
        <h3>SKEMA &amp; TERMIN PEMBAYARAN VENDOR:</h3>
        <div style="border: 2px solid #1b1b1b; background-color: #fbf9f1; padding: 10px; margin-bottom: 15px;">
          ${paymentHtml}
        </div>

        <!-- KETENTUAN GARANSI -->
        <h3>KETENTUAN KERJASAMA &amp; GARANSI PRODUKSI:</h3>
        <ol style="font-size: 10pt; line-height: 1.5; color: #333;">
          <li>Pelaksana Pekerjaan (Vendor) berkewajiban menyelesaikan pesanan sesuai spesifikasi bahan, desain, dan standar kualitas sampel yang disepakati.</li>
          <li>Seluruh hasil produksi diserahterimakan kepada FILKOM Merch UB paling lambat pada tanggal deadline yang telah ditentukan.</li>
          <li>Apabila terdapat cacat produksi (defect), kerusakan, atau ketidaksesuaian ukuran/kuantitas, Pihak Vendor berkewajiban melakukan perbaikan atau penggantian tanpa biaya tambahan.</li>
          ${selectedSpkPo.notes ? `<li style="font-weight: bold; color: #ff5e00;">Catatan Khusus SPK: "${selectedSpkPo.notes}"</li>` : ""}
        </ol>

        <!-- TANDA TANGAN -->
        <table style="width: 100%; border: none; margin-top: 40px;">
          <tr>
            <td style="width: 50%; text-align: center; border: none;">
              <div style="font-size: 9pt; color: #666; font-weight: bold;">PIHAK PERTAMA</div>
              <div style="font-weight: bold; margin-top: 2px;">FILKOM MERCH UB</div>
              <div style="height: 60px;"></div>
              <div style="border-top: 2px solid #1b1b1b; width: 180px; margin: 0 auto; padding-top: 4px; font-weight: bold;">
                Manajemen FILKOM Merch UB
              </div>
            </td>
            <td style="width: 50%; text-align: center; border: none;">
              <div style="font-size: 9pt; color: #666; font-weight: bold;">PIHAK KEDUA</div>
              <div style="font-weight: bold; margin-top: 2px;">${selectedSpkPo.vendor_name || "Vendor Mitra"}</div>
              <div style="height: 60px;"></div>
              <div style="border-top: 2px solid #1b1b1b; width: 180px; margin: 0 auto; padding-top: 4px; font-weight: bold;">
                ${selectedSpkPo.contact_person || "Pimpinan / Rep. Vendor"}
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordDocHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SPK_${selectedSpkPo.po_number}_${selectedSpkPo.vendor_name || "Vendor"}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Dokumen SPK Word (.doc) berhasil didownload!");
  };

  // Queries
  const { data: campaignsRes } = useQuery({
    queryKey: ["adminPreOrderCampaigns"],
    queryFn: () => getPreOrderCampaignsServerAction(),
  });
  const campaigns: PreOrderCampaign[] = campaignsRes?.data || [];

  const { data: vendorsRes, refetch: refetchVendors } = useQuery({
    queryKey: ["adminVendors"],
    queryFn: () => getVendorsServerAction(),
  });
  const vendors: Vendor[] = vendorsRes?.data || [];

  const { data: summaryRes, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["productionSummary", selectedBatchFilter],
    queryFn: () => getProductionSummaryServerAction({ data: { batch: selectedBatchFilter } }),
  });
  const summaryList = summaryRes?.data || [];

  const { data: vendorOrdersRes, isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["adminVendorOrders"],
    queryFn: () => getVendorOrdersServerAction(),
  });
  const vendorOrders: VendorOrder[] = vendorOrdersRes?.data || [];

  const { data: financialRes, isLoading: isFinancialLoading, refetch: refetchFinancials } = useQuery({
    queryKey: ["financialOverview", selectedBatchFilter],
    queryFn: () => getFinancialOverviewServerAction({ data: { batch: selectedBatchFilter } }),
  });
  const financialData = financialRes?.data;

  const { data: productsRes } = useQuery({
    queryKey: ["adminAllProducts"],
    queryFn: () => getAllProductsAdmin(),
  });
  const productsList = productsRes?.products || [];

  // Vendor Mutations
  const createVendorMutation = useMutation({
    mutationFn: (data: any) => createVendorServerAction({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("Vendor berhasil ditambahkan");
        queryClient.invalidateQueries({ queryKey: ["adminVendors"] });
        closeVendorModal();
      } else {
        toast.error("Gagal menambah vendor: " + (res?.error || ""));
      }
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: (data: any) => updateVendorServerAction({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("Vendor berhasil diperbarui");
        queryClient.invalidateQueries({ queryKey: ["adminVendors"] });
        closeVendorModal();
      } else {
        toast.error("Gagal update vendor: " + (res?.error || ""));
      }
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: number) => deleteVendorServerAction({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("Vendor berhasil dihapus");
        queryClient.invalidateQueries({ queryKey: ["adminVendors"] });
      } else {
        toast.error("Gagal menghapus vendor: " + (res?.error || ""));
      }
    },
  });

  // Vendor PO Mutations
  const createPoMutation = useMutation({
    mutationFn: (data: any) => createVendorOrderServerAction({ data }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(`Purchase Order ${res.po_number || ""} berhasil dibuat`);
        queryClient.invalidateQueries({ queryKey: ["adminVendorOrders"] });
        queryClient.invalidateQueries({ queryKey: ["financialOverview"] });
        closePoModal();
      } else {
        toast.error("Gagal membuat PO: " + (res?.error || ""));
      }
    },
  });

  const updatePoStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateVendorOrderStatusServerAction({ data: { id, status } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("Status PO berhasil diperbarui");
        queryClient.invalidateQueries({ queryKey: ["adminVendorOrders"] });
        queryClient.invalidateQueries({ queryKey: ["financialOverview"] });
      } else {
        toast.error("Gagal update status PO: " + (res?.error || ""));
      }
    },
  });

  const deletePoMutation = useMutation({
    mutationFn: (id: number) => deleteVendorOrderServerAction({ data: { id } }),
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success("PO Vendor berhasil dihapus");
        queryClient.invalidateQueries({ queryKey: ["adminVendorOrders"] });
        queryClient.invalidateQueries({ queryKey: ["financialOverview"] });
      } else {
        toast.error("Gagal menghapus PO: " + (res?.error || ""));
      }
    },
  });

  // Modal Handlers
  const openCreateVendorModal = () => {
    setEditingVendor(null);
    setVendorName("");
    setVendorContact("");
    setVendorPhone("");
    setVendorEmail("");
    setVendorNotes("");
    setIsVendorModalOpen(true);
  };

  const openEditVendorModal = (v: Vendor) => {
    setEditingVendor(v);
    setVendorName(v.name);
    setVendorContact(v.contact_person || "");
    setVendorPhone(v.phone || "");
    setVendorEmail(v.email || "");
    setVendorNotes(v.notes || "");
    setIsVendorModalOpen(true);
  };

  const closeVendorModal = () => {
    setIsVendorModalOpen(false);
    setEditingVendor(null);
  };

  const handleVendorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      toast.error("Nama vendor wajib diisi");
      return;
    }
    const payload = {
      name: vendorName,
      contact_person: vendorContact,
      phone: vendorPhone,
      email: vendorEmail,
      notes: vendorNotes,
    };
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, ...payload });
    } else {
      createVendorMutation.mutate(payload);
    }
  };

  const openCreatePoModal = () => {
    setSelectedVendorId("");
    setPoDeadline("");
    setPoNotes("");
    setPoItems([
      {
        product_id: productsList[0]?.id || 1,
        size: "All Size",
        color: "",
        quantity: 10,
        unit_cost: (productsList[0] as any)?.cost_price || (productsList[0] as any)?.vendor_cost || 50000,
      },
    ]);
    setIsPoModalOpen(true);
  };

  const closePoModal = () => {
    setIsPoModalOpen(false);
  };

  const handleAddPoItemRow = () => {
    const defaultProd = productsList[0];
    setPoItems((prev) => [
      ...prev,
      {
        product_id: defaultProd?.id || 1,
        size: "M",
        color: "",
        quantity: 10,
        unit_cost: (defaultProd as any)?.cost_price || (defaultProd as any)?.vendor_cost || 50000,
      },
    ]);
  };

  const handleRemovePoItemRow = (idx: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      toast.error("Silakan pilih vendor mitra");
      return;
    }
    if (poItems.length === 0) {
      toast.error("Minimal harus ada 1 item pesanan");
      return;
    }
    createPoMutation.mutate({
      vendor_id: Number(selectedVendorId),
      deadline: poDeadline || null,
      notes: poNotes || null,
      items: poItems,
    });
  };

  const handleExportPoCSV = (po: VendorOrder) => {
    const headers = ["PO Number", "Vendor", "Produk", "Ukuran/Warna", "Qty Dipesan", "Harga Satuan Vendor (Rp)", "Subtotal Cost (Rp)"];
    const rows = (po.items || []).map((item) => [
      `"${po.po_number}"`,
      `"${po.vendor_name || ""}"`,
      `"${item.catalog_product_name || ""}"`,
      `"${[item.size, item.color].filter(Boolean).join("/")}"`,
      `"${item.quantity}"`,
      `"${item.unit_cost}"`,
      `"${(item.unit_cost || 0) * (item.quantity || 0)}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PurchaseOrder_${po.po_number}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case "draft":
        return <span className="bg-neutral-200 text-neutral-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-ink/20">Draft</span>;
      case "sent":
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-blue-300">Sent to Vendor</span>;
      case "in_production":
        return <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-amber-300 animate-pulse">In Production</span>;
      case "completed":
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-emerald-300">Completed</span>;
      case "cancelled":
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-rose-300">Cancelled</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded">{st}</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-brand-orange text-cream text-[10px] font-black rounded uppercase tracking-wider">
              FITUR VENDORING V4
            </span>
          </div>
          <h1 className="display text-3xl text-ink tracking-wider mt-1">Manajemen Vendor &amp; Produksi</h1>
          <p className="text-[11px] text-muted-foreground font-medium">
            Agregasi Pre-Order, SPK Produksi Vendor (PO), HPP/COGS, &amp; Laporan Keuangan Margin.
          </p>
        </div>

        {/* Global Batch Filter Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-ink uppercase shrink-0">Filter Batch:</label>
          <select
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="px-3.5 py-2 border-2 border-ink rounded-xl text-xs font-bold bg-white text-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] cursor-pointer focus:outline-none"
          >
            <option value="all">Semua Batch PO</option>
            {campaigns.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.batch_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b-2 border-ink pb-2">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "summary"
              ? "bg-brand-orange text-cream border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]"
              : "bg-white text-ink border-ink/30 hover:border-ink hover:bg-cream/40"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> 1. Production Summary
        </button>

        <button
          onClick={() => setActiveTab("vendors")}
          className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "vendors"
              ? "bg-brand-orange text-cream border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]"
              : "bg-white text-ink border-ink/30 hover:border-ink hover:bg-cream/40"
          }`}
        >
          <Building className="w-4 h-4" /> 2. Vendors Mitra
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "orders"
              ? "bg-brand-orange text-cream border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]"
              : "bg-white text-ink border-ink/30 hover:border-ink hover:bg-cream/40"
          }`}
        >
          <Package className="w-4 h-4" /> 3. Vendor Orders (PO)
        </button>

        <button
          onClick={() => setActiveTab("financials")}
          className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "financials"
              ? "bg-brand-orange text-cream border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)]"
              : "bg-white text-ink border-ink/30 hover:border-ink hover:bg-cream/40"
          }`}
        >
          <TrendingUp className="w-4 h-4" /> 4. Financial Overview
        </button>
      </div>

      {/* TAB 1: PRODUCTION SUMMARY */}
      {activeTab === "summary" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-cream/40 border-2 border-ink p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-ink uppercase">Kumulasi Kuantitas Pesanan Pre-Order</h3>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Total unit produk yang wajib diproduksi berdasarkan pesanan buyer.
              </p>
            </div>
            <button
              onClick={() => refetchSummary()}
              className="p-2 border-2 border-ink bg-white hover:bg-neutral-200 rounded-lg text-ink font-bold transition-all cursor-pointer shadow-xs"
              title="Refresh Summary"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-background border-2 border-ink rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]">
            {isSummaryLoading ? (
              <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
                Memuat data ringkasan produksi...
              </div>
            ) : summaryList.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-muted-foreground space-y-2">
                <Package className="w-8 h-8 text-brand-orange mx-auto opacity-50" />
                <p>Belum ada data pesanan pre-order untuk batch yang dipilih.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-secondary/40 border-b-2 border-ink text-ink font-extrabold uppercase">
                      <th className="p-3.5">Produk</th>
                      <th className="p-3.5">Ukuran / Warna</th>
                      <th className="p-3.5 text-center">Rincian Per-Batch</th>
                      <th className="p-3.5 text-right font-black">TOTAL UNIT Wajib Produksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {summaryList.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-cream/30 transition-colors">
                        <td className="p-3.5 font-extrabold text-ink text-sm">{row.product_name}</td>
                        <td className="p-3.5 font-bold">
                          <div className="flex flex-wrap gap-1.5">
                            {row.variants_breakdown &&
                            Object.keys(row.variants_breakdown).length === 1 &&
                            ["Standard", "One Size", "Default", "All Size"].includes(Object.keys(row.variants_breakdown)[0]) ? (
                              <span className="text-muted-foreground italic font-mono text-xs font-bold px-1.5">-</span>
                            ) : row.variants_breakdown && Object.keys(row.variants_breakdown).length > 0 ? (
                              Object.entries(row.variants_breakdown).map(([vName, vQty]) => (
                                <span
                                  key={vName}
                                  className="bg-cream border-2 border-ink/30 px-2 py-0.5 rounded font-mono font-bold text-xs text-ink shadow-2xs"
                                >
                                  {vName}: <strong className="text-brand-orange">{String(vQty)} pcs</strong>
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic font-mono text-xs font-bold px-1.5">-</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {Object.entries(row.batch_breakdown || {}).map(([bName, qty]) => (
                              <span key={bName} className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-extrabold">
                                {bName}: {qty as number} pcs
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-black text-sm text-brand-orange">
                          {row.total_qty} pcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VENDORS MITRA */}
      {activeTab === "vendors" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b-2 border-ink pb-4">
            <div>
              <h3 className="font-extrabold text-base text-ink uppercase">Daftar Vendor &amp; Konveksi Mitra</h3>
              <p className="text-xs text-muted-foreground font-medium">Master data penyedia jasa produksi FILKOM Merchandise.</p>
            </div>
            <button
              onClick={openCreateVendorModal}
              className="px-4 py-2.5 bg-brand-orange hover:bg-ink text-cream font-bold text-xs uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> TAMBAH VENDOR MITRA
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="bg-white border-2 border-ink rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] relative"
              >
                <div className="flex items-start justify-between border-b border-ink/10 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-brand-orange uppercase">MITRA VENDOR</span>
                    <h4 className="font-extrabold text-base text-ink leading-tight">{v.name}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditVendorModal(v)}
                      className="p-1.5 rounded-lg border border-ink bg-cream hover:bg-brand-orange hover:text-cream transition-all cursor-pointer"
                      title="Edit Vendor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus vendor "${v.name}"?`)) {
                          deleteVendorMutation.mutate(v.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-ink bg-rose-100 text-rose-800 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                      title="Hapus Vendor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-ink/90 font-medium">
                  {v.contact_person && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground w-20">PIC / Contact:</span>
                      <span className="font-bold text-ink">{v.contact_person}</span>
                    </div>
                  )}
                  {v.phone && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground w-20">No HP / WA:</span>
                      <span className="font-bold text-ink font-mono">{v.phone}</span>
                    </div>
                  )}
                  {v.email && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-muted-foreground w-20">Email:</span>
                      <span className="font-medium text-ink font-mono text-[11px]">{v.email}</span>
                    </div>
                  )}
                  {v.notes && (
                    <div className="mt-2 p-2 bg-cream/50 rounded-lg border border-ink/10 text-[11px] italic">
                      "{v.notes}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VENDOR ORDERS (PO) */}
      {activeTab === "orders" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b-2 border-ink pb-4">
            <div>
              <h3 className="font-extrabold text-base text-ink uppercase">Surat Perintah Kerja / PO Vendor</h3>
              <p className="text-xs text-muted-foreground font-medium">Penerbitan dan pelacakan status Purchase Order ke vendor mitra.</p>
            </div>
            <button
              onClick={openCreatePoModal}
              className="px-4 py-2.5 bg-brand-orange hover:bg-ink text-cream font-bold text-xs uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> BUAT PO VENDOR BARU
            </button>
          </div>

          <div className="space-y-4">
            {isOrdersLoading ? (
              <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
                Memuat data Purchase Order Vendor...
              </div>
            ) : vendorOrders.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-muted-foreground space-y-2 border-2 border-dashed border-ink/30 rounded-2xl">
                <FileText className="w-8 h-8 text-brand-orange mx-auto opacity-50" />
                <p>Belum ada Purchase Order vendor yang dibuat.</p>
              </div>
            ) : (
              vendorOrders.map((po) => (
                <div
                  key={po.id}
                  className="bg-white border-2 border-ink rounded-2xl p-5 space-y-4 shadow-[4px_4px_0px_0px_rgba(27,27,27,1)]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-ink/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-ink">{po.po_number}</span>
                        {statusBadge(po.status)}
                      </div>
                      <p className="text-xs font-extrabold text-brand-orange mt-0.5">
                        Vendor: {po.vendor_name} {po.vendor_phone ? `(${po.vendor_phone})` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={po.status}
                        onChange={(e) =>
                          updatePoStatusMutation.mutate({ id: po.id, status: e.target.value })
                        }
                        className="px-2.5 py-1.5 border border-ink rounded-lg text-xs font-bold bg-cream/50 cursor-pointer"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent to Vendor</option>
                        <option value="in_production">In Production</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        onClick={() => openSpkModal(po)}
                        className="px-3 py-1.5 bg-brand-orange text-cream border-2 border-ink rounded-lg text-xs font-black flex items-center gap-1.5 hover:bg-ink shadow-2xs cursor-pointer transition-all"
                        title="Cetak Surat Perintah Kerja (SPK) Vendor"
                      >
                        <FileText className="w-3.5 h-3.5" /> Cetak SPK
                      </button>

                      <button
                        onClick={() => handleExportPoCSV(po)}
                        className="px-3 py-1.5 bg-secondary text-ink border border-ink rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-neutral-200 cursor-pointer"
                        title="Export PO CSV"
                      >
                        <Download className="w-3.5 h-3.5" /> CSV
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Hapus PO "${po.po_number}"?`)) {
                            deletePoMutation.mutate(po.id);
                          }
                        }}
                        className="p-1.5 bg-rose-100 text-rose-800 border border-ink rounded-lg hover:bg-rose-600 hover:text-white cursor-pointer"
                        title="Hapus PO"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Items List Table */}
                  <div className="overflow-x-auto border border-ink/20 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-cream/60 border-b border-ink/20 text-ink font-bold">
                          <th className="p-2.5">Produk</th>
                          <th className="p-2.5">Ukuran/Warna</th>
                          <th className="p-2.5 text-center">Qty Dipesan</th>
                          <th className="p-2.5 text-right">Harga Satuan Vendor</th>
                          <th className="p-2.5 text-right font-black">Subtotal Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink/10">
                        {(po.items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-ink">{item.catalog_product_name}</td>
                            <td className="p-2.5 font-semibold text-muted-foreground">
                              {[item.size, item.color].filter(Boolean).join(" / ") || "-"}
                            </td>
                            <td className="p-2.5 text-center font-black">{item.quantity} pcs</td>
                            <td className="p-2.5 text-right font-mono">
                              Rp {Number(item.unit_cost || 0).toLocaleString("id-ID")}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-brand-orange">
                              Rp {Number(item.subtotal_cost || (item.unit_cost * item.quantity)).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 font-bold border-t border-ink/10">
                    <span className="text-muted-foreground">
                      Deadline: {po.deadline ? new Date(po.deadline).toLocaleDateString("id-ID") : "-"}
                    </span>
                    <span className="text-sm font-black text-ink">
                      TOTAL BIAYA PRODUCTION COGS:{" "}
                      <span className="text-brand-orange">Rp {Number(po.total_cost || 0).toLocaleString("id-ID")}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL OVERVIEW */}
      {activeTab === "financials" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b-2 border-ink pb-4">
            <div>
              <h3 className="font-extrabold text-base text-ink uppercase">Analisis Margin &amp; Laporan Keuangan</h3>
              <p className="text-xs text-muted-foreground font-medium">Perbandingan Omset Penjualan vs Total HPP/COGS Vendor.</p>
            </div>
            <button
              onClick={() => refetchFinancials()}
              className="p-2 border-2 border-ink bg-white hover:bg-neutral-200 rounded-lg text-ink font-bold transition-all cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isFinancialLoading ? (
            <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse">
              Memuat laporan keuangan...
            </div>
          ) : (
            <div className="space-y-6">
              {/* 4 Summary Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-orange-50/70 border-2 border-brand-orange p-5 rounded-2xl space-y-1 shadow-[3px_3px_0px_0px_rgba(234,88,12,0.4)]">
                  <span className="text-[10px] font-black uppercase text-brand-orange">TOTAL REVENUE (OMSET)</span>
                  <div className="text-2xl font-black text-ink">
                    Rp {Number(financialData?.totalRevenue || 0).toLocaleString("id-ID")}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Dari transaksi terbayar</p>
                </div>

                <div className="bg-rose-50/70 border-2 border-rose-600 p-5 rounded-2xl space-y-1 shadow-[3px_3px_0px_0px_rgba(225,29,72,0.4)]">
                  <span className="text-[10px] font-black uppercase text-rose-700">TOTAL COGS (BIAYA VENDOR)</span>
                  <div className="text-2xl font-black text-ink">
                    Rp {Number(financialData?.totalCogs || 0).toLocaleString("id-ID")}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Total biaya PO ke vendor</p>
                </div>

                <div className="bg-emerald-50/70 border-2 border-emerald-600 p-5 rounded-2xl space-y-1 shadow-[3px_3px_0px_0px_rgba(16,185,129,0.4)]">
                  <span className="text-[10px] font-black uppercase text-emerald-800">GROSS MARGIN (LABA KOTOR)</span>
                  <div className="text-2xl font-black text-ink">
                    Rp {Number(financialData?.grossMargin || 0).toLocaleString("id-ID")}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Revenue dikurangi Total COGS</p>
                </div>

                <div className="bg-blue-50/70 border-2 border-blue-600 p-5 rounded-2xl space-y-1 shadow-[3px_3px_0px_0px_rgba(37,99,235,0.4)]">
                  <span className="text-[10px] font-black uppercase text-blue-800">MARGIN PERCENTAGE</span>
                  <div className="text-2xl font-black text-ink">
                    {financialData?.marginPercent || 0}%
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Persentase keuntungan kotor</p>
                </div>
              </div>

              {/* Product Breakdown Table */}
              <div className="bg-background border-2 border-ink rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] space-y-3 p-4">
                <h4 className="font-extrabold text-sm text-ink uppercase">Rincian Revenue &amp; Margin Per Produk</h4>
                <div className="overflow-x-auto border-2 border-ink/20 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-cream border-b-2 border-ink text-ink font-extrabold uppercase">
                        <th className="p-3">Nama Produk</th>
                        <th className="p-3 text-center">Qty Terjual</th>
                        <th className="p-3 text-right">Revenue (Rp)</th>
                        <th className="p-3 text-right">COGS Unit (Rp)</th>
                        <th className="p-3 text-right">Total COGS (Rp)</th>
                        <th className="p-3 text-right font-black">Margin (Rp)</th>
                        <th className="p-3 text-right font-black">Margin %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {(financialData?.productBreakdown || []).map((row: any) => (
                        <tr key={row.product_id} className="hover:bg-cream/20">
                          <td className="p-3 font-extrabold text-ink">{row.product_name}</td>
                          <td className="p-3 text-center font-bold">{row.qty_sold} pcs</td>
                          <td className="p-3 text-right font-mono font-bold">
                            <div>Rp {Number(row.revenue).toLocaleString("id-ID")}</div>
                            {row.is_dp && (
                              <div className="text-[9px] text-muted-foreground font-semibold mt-0.5">
                                DP Masuk: Rp {Number(row.dp_revenue || 0).toLocaleString("id-ID")}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">
                            Rp {Number(row.unit_cogs).toLocaleString("id-ID")}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-700 font-bold">
                            Rp {Number(row.total_cogs).toLocaleString("id-ID")}
                          </td>
                          <td className={`p-3 text-right font-mono font-black ${row.margin >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            Rp {Number(row.margin).toLocaleString("id-ID")}
                          </td>
                          <td className={`p-3 text-right font-extrabold font-mono ${row.margin_percent >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                            {row.margin_percent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VENDOR MODAL */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs">
          <div className="bg-background border-4 border-ink rounded-2xl w-full max-w-md p-6 space-y-4 shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] relative">
            <h2 className="text-lg font-black text-ink uppercase tracking-wide border-b-2 border-ink pb-2">
              {editingVendor ? "Edit Vendor Mitra" : "Tambah Vendor Mitra Baru"}
            </h2>

            <form onSubmit={handleVendorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-ink uppercase mb-1">Nama Vendor / Konveksi *</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Contoh: Konveksi Apparel Malang"
                  className="w-full px-3 py-2 border-2 border-ink rounded-xl font-bold bg-cream/30 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-ink uppercase mb-1">PIC / Contact Person</label>
                <input
                  type="text"
                  value={vendorContact}
                  onChange={(e) => setVendorContact(e.target.value)}
                  placeholder="Contoh: Mas Budi"
                  className="w-full px-3 py-2 border-2 border-ink rounded-xl bg-cream/30 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink uppercase mb-1">No Phone / WA</label>
                  <input
                    type="text"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full px-3 py-2 border-2 border-ink rounded-xl bg-cream/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink uppercase mb-1">Email Vendor</label>
                  <input
                    type="email"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    placeholder="vendor@mail.com"
                    className="w-full px-3 py-2 border-2 border-ink rounded-xl bg-cream/30 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink uppercase mb-1">Catatan Tambahan</label>
                <textarea
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  placeholder="Spesialisasi bordir, garansi retur, dll..."
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-ink rounded-xl bg-cream/30 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-ink">
                <button
                  type="button"
                  onClick={closeVendorModal}
                  className="px-4 py-2 border-2 border-ink rounded-xl font-bold uppercase hover:bg-neutral-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-orange text-cream font-bold uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-ink"
                >
                  Simpan Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-background border-4 border-ink rounded-2xl w-full max-w-3xl my-8 p-6 space-y-4 shadow-[10px_10px_0px_0px_rgba(27,27,27,1)] relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-black text-ink uppercase tracking-wide border-b-2 border-ink pb-2">
              Buat Purchase Order (PO) Vendor Baru
            </h2>

            <form onSubmit={handlePoSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-ink uppercase mb-1">Pilih Vendor Mitra *</label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 border-2 border-ink rounded-xl font-bold bg-cream/30 focus:outline-none"
                    required
                  >
                    <option value="">-- Pilih Vendor --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-ink uppercase mb-1">Deadline Penyelesaian</label>
                  <input
                    type="date"
                    value={poDeadline}
                    onChange={(e) => setPoDeadline(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-ink rounded-xl bg-cream/30 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* PO Items Table Form */}
              <div className="space-y-2 border-2 border-ink rounded-xl p-3 bg-cream/20">
                <div className="flex items-center justify-between font-extrabold uppercase text-ink">
                  <span>Daftar Item Barang PO:</span>
                  <button
                    type="button"
                    onClick={handleAddPoItemRow}
                    className="px-2.5 py-1 bg-brand-orange text-cream rounded border border-ink font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah Baris Item
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white border border-ink/20 p-2 rounded-lg">
                    <div className="col-span-4">
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const pId = Number(e.target.value);
                          const matchedP = productsList.find((p) => p.id === pId);
                          setPoItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, product_id: pId, unit_cost: (matchedP as any)?.cost_price || (matchedP as any)?.vendor_cost || it.unit_cost } : it
                            )
                          );
                        }}
                        className="w-full p-1.5 border border-ink/40 rounded text-[11px] font-bold"
                      >
                        {productsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Size/Var"
                        value={item.size}
                        onChange={(e) =>
                          setPoItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, size: e.target.value } : it))
                          )
                        }
                        className="w-full p-1.5 border border-ink/40 rounded text-[11px]"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          setPoItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, quantity: Number(e.target.value) } : it))
                          )
                        }
                        className="w-full p-1.5 border border-ink/40 rounded text-[11px] font-bold text-center"
                        min={1}
                      />
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Harga Satuan (Rp)"
                        value={item.unit_cost}
                        onChange={(e) =>
                          setPoItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, unit_cost: Number(e.target.value) } : it))
                          )
                        }
                        className="w-full p-1.5 border border-ink/40 rounded text-[11px] font-bold font-mono"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePoItemRow(idx)}
                          className="p-1 text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-ink uppercase mb-1">Catatan Instruksi PO</label>
                <textarea
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Catatan bahan, spesifikasi sablon/bordir, dll..."
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-ink rounded-xl bg-cream/30 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t-2 border-ink">
                <button
                  type="button"
                  onClick={closePoModal}
                  className="px-4 py-2 border-2 border-ink rounded-xl font-bold uppercase hover:bg-neutral-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createPoMutation.isPending}
                  className="px-5 py-2 bg-brand-orange text-cream font-bold uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-ink cursor-pointer"
                >
                  {createPoMutation.isPending ? "Memuat..." : "Terbitkan PO Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SPK VENDOR PRINTABLE MODAL */}
      {isSpkModalOpen && selectedSpkPo && (
        <div id="spk-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body * {
                visibility: hidden !important;
              }
              #spk-modal-root, #spk-modal-root * {
                visibility: visible !important;
              }
              #spk-modal-root {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              #spk-printable-area {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-height: none !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                background: white !important;
              }
              #spk-doc-body {
                display: block !important;
                overflow: visible !important;
                max-height: none !important;
                padding: 0 !important;
                margin: 0 !important;
                height: auto !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              tr, table, .grid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>
          <div
            id="spk-printable-area"
            data-keep-white="true"
            className="bg-white border-4 border-ink rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] relative overflow-hidden print:max-h-none print:h-auto print:border-none print:shadow-none print:w-full print:p-0"
          >
            
            {/* Top Action Bar (Fixed at top, Hidden during printing) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-ink p-4 sm:p-5 bg-white shrink-0 gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-orange" />
                <h2 className="text-sm sm:text-base font-black text-ink uppercase tracking-wide">
                  Surat Perintah Kerja (SPK) Vendor — {selectedSpkPo.po_number}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportWordSpk}
                  className="px-3.5 py-2 bg-blue-600 text-white font-bold text-xs uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-ink cursor-pointer transition-all flex items-center gap-1.5"
                  title="Export Dokumen Edit Word (.doc)"
                >
                  <Download className="w-4 h-4" /> Export Word (.doc)
                </button>
                <button
                  onClick={handlePrintSpk}
                  className="px-3.5 py-2 bg-brand-orange text-cream font-bold text-xs uppercase rounded-xl border-2 border-ink shadow-[2px_2px_0px_0px_rgba(27,27,27,1)] hover:bg-ink cursor-pointer transition-all flex items-center gap-1.5"
                  title="Cetak PDF / Printer"
                >
                  <Printer className="w-4 h-4" /> Print SPK (PDF)
                </button>
                <button
                  onClick={closeSpkModal}
                  className="p-2 border-2 border-ink rounded-xl bg-cream hover:bg-neutral-200 text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PAYMENT SCHEME SELECTOR CONTROLS (Hidden during printing) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 border-b-2 border-ink/20 py-3 px-4 sm:px-6 bg-cream/40 shrink-0 print:hidden">
              <label className="text-xs font-bold text-ink uppercase shrink-0">Skema Pembayaran Vendor:</label>
              <select
                value={paymentScheme}
                onChange={(e) => setPaymentScheme(e.target.value)}
                className="px-3 py-1.5 border-2 border-ink rounded-xl text-xs font-bold bg-white text-ink cursor-pointer shadow-2xs"
              >
                <option value="50_50">50% - 50% (DP 50% &amp; Pelunasan 50%)</option>
                <option value="30_20_50">30% - 20% - 50% (DP 30%, Progress 20%, Pelunasan 50%)</option>
                <option value="100_0">100% Lunas di Awal</option>
                <option value="custom">Custom / Catatan Khusus</option>
              </select>

              {paymentScheme === "custom" && (
                <input
                  type="text"
                  value={customPaymentNotes}
                  onChange={(e) => setCustomPaymentNotes(e.target.value)}
                  placeholder="Misal: DP 40% awal & Pelunasan 60%..."
                  className="px-3 py-1.5 border-2 border-ink rounded-xl text-xs bg-white font-medium flex-1 focus:outline-none"
                />
              )}
            </div>

            {/* PRINTABLE SPK DOCUMENT BODY (Scrollable inside modal) */}
            <div id="spk-doc-body" className="p-4 sm:p-6 space-y-6 text-ink font-sans text-xs overflow-y-auto flex-1 print:overflow-visible print:p-0 print:text-black">
              {/* KOP SURAT & DOKUMEN TITLE */}
              <div className="space-y-3 pb-3 border-b-2 border-ink print:break-after-avoid">
                {/* KOP SURAT / OFFICIAL HEADER */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={logoFm} alt="FILKOM Merch Logo" className="h-12 w-auto object-contain shrink-0" />
                    <div>
                      <h1 className="font-black text-lg text-ink uppercase tracking-wider">FILKOM MERCH UB</h1>
                      <p className="text-[10px] text-neutral-600 font-bold">
                        Fakultas Ilmu Komputer, Universitas Brawijaya
                      </p>
                      <p className="text-[10px] text-neutral-600 font-medium">
                        Gedung F FILKOM UB, Jl. Veteran, Malang
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="px-2.5 py-0.5 bg-ink text-cream font-mono font-black text-[10px] uppercase rounded">
                      DOKUMEN RESMI SPK
                    </span>
                    <div className="font-mono font-extrabold text-sm text-ink">{selectedSpkPo.po_number}</div>
                    <div className="text-[10px] text-neutral-700 font-bold">
                      Tanggal: {selectedSpkPo.created_at ? new Date(selectedSpkPo.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                    </div>
                  </div>
                </div>

                {/* DOCUMENT TITLE */}
                <div className="text-center pt-2">
                  <h2 className="font-black text-base text-ink uppercase tracking-wider underline">
                    SURAT PERINTAH KERJA (SPK) PRODUKSI VENDOR
                  </h2>
                  <div className="text-xs font-black text-neutral-800 mt-1">
                    Nomor Dokumen: SPK/{selectedSpkPo.po_number}/FM-UB/2026
                  </div>
                </div>
              </div>

              {/* PIHAK KERJASAMA */}
              <div className="grid grid-cols-2 gap-4 border-2 border-ink p-4 rounded-xl bg-cream/30">
                <div className="space-y-1.5">
                  <span className="font-black uppercase text-[10px] text-brand-orange tracking-wider">
                    PIHAK PERTAMA (PEMBERI KERJA)
                  </span>
                  <div className="font-extrabold text-ink">FILKOM MERCH UB</div>
                  <div className="text-[11px] text-neutral-700 leading-relaxed font-medium">
                    Pengelola Merchandise Resmi FILKOM UB<br />
                    Jl. Veteran, Lowokwaru, Malang, Jawa Timur<br />
                    CP: Manajemen Operasional FILKOM Merch
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-black uppercase text-[10px] text-brand-orange tracking-wider">
                    PIHAK KEDUA (PELAKSANA PEKERJAAN / VENDOR)
                  </span>
                  <div className="font-extrabold text-ink">{selectedSpkPo.vendor_name || "Vendor Mitra"}</div>
                  <div className="text-[11px] text-neutral-700 leading-relaxed font-medium">
                    PIC: {selectedSpkPo.contact_person || "-"}<br />
                    No. Telepon / WA: {selectedSpkPo.vendor_phone || "-"}
                  </div>
                </div>
              </div>

              {/* DEADLINE & TARGET BATCH */}
              <div className="bg-secondary/40 border-2 border-ink p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-orange shrink-0" />
                  <div>
                    <span className="font-bold text-ink uppercase text-[10px]">Tenggat Waktu Selesai Produksi (Deadline):</span>
                    <div className="font-black text-xs text-brand-orange">
                      {selectedSpkPo.deadline ? new Date(selectedSpkPo.deadline).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Sesuai Kesepakatan Khusus"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-neutral-700 uppercase">Status PO:</span>
                  <div className="font-black text-xs uppercase text-ink">{selectedSpkPo.status}</div>
                </div>
              </div>

              {/* RINCIAN ITEM PRODUKSI */}
              <div className="space-y-2">
                <h3 className="font-black text-xs uppercase text-ink tracking-wider">
                  RINCIAN PEKERJAAN &amp; SPESIFIKASI PRODUK:
                </h3>
                <div className="border-2 border-ink rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-cream border-b-2 border-ink text-ink font-black uppercase">
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5">Nama Produk</th>
                        <th className="p-2.5">Ukuran / Varian Spesifikasi</th>
                        <th className="p-2.5 text-center">Qty (Pcs)</th>
                        <th className="p-2.5 text-right">Biaya Satuan (Rp)</th>
                        <th className="p-2.5 text-right font-black">Total Biaya (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/20 font-medium">
                      {(selectedSpkPo.items || []).map((item: any, idx: number) => {
                        const sub = (item.quantity || 0) * (item.unit_cost || 0);
                        return (
                          <tr key={idx} className="hover:bg-cream/20">
                            <td className="p-2.5 text-center font-mono font-bold">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-ink">{item.catalog_product_name || `Produk #${item.product_id}`}</td>
                            <td className="p-2.5 font-mono">
                              {[item.size, item.color].filter(Boolean).join(" / ") || "Standard"}
                            </td>
                            <td className="p-2.5 text-center font-bold text-brand-orange">{item.quantity} pcs</td>
                            <td className="p-2.5 text-right font-mono">Rp {Number(item.unit_cost || 0).toLocaleString("id-ID")}</td>
                            <td className="p-2.5 text-right font-mono font-black text-ink">Rp {Number(sub).toLocaleString("id-ID")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-cream border-t-2 border-ink font-black text-ink">
                        <td colSpan={3} className="p-3 uppercase text-right">TOTAL KESELURUHAN BIAYA SPK PRODUKSI:</td>
                        <td className="p-3 text-center text-brand-orange">
                          {(selectedSpkPo.items || []).reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0)} pcs
                        </td>
                        <td colSpan={2} className="p-3 text-right text-base text-ink font-extrabold font-mono">
                          Rp {(selectedSpkPo.items || []).reduce((acc: number, item: any) => acc + ((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0)), 0).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SKEMA & TERMIN PEMBAYARAN VENDOR */}
              {(() => {
                const totalCost = (selectedSpkPo.items || []).reduce(
                  (acc: number, item: any) => acc + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
                  0
                );
                return (
                  <div className="space-y-2">
                    <h3 className="font-black text-xs uppercase text-ink tracking-wider">
                      SKEMA &amp; TERMIN PEMBAYARAN VENDOR:
                    </h3>
                    <div className="border-2 border-ink rounded-xl p-3 bg-cream/30 space-y-2">
                      {paymentScheme === "50_50" && (
                        <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                          <div className="bg-white p-2.5 border border-ink/20 rounded-lg space-y-0.5">
                            <span className="text-[10px] text-neutral-600 uppercase font-extrabold">Termin 1 (DP 50% Awal Saat SPK):</span>
                            <div className="text-sm font-black text-brand-orange">
                              Rp {Math.round(totalCost * 0.5).toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div className="bg-white p-2.5 border border-ink/20 rounded-lg space-y-0.5">
                            <span className="text-[10px] text-neutral-600 uppercase font-extrabold">Termin 2 (Pelunasan 50% Saat Selesai):</span>
                            <div className="text-sm font-black text-emerald-700">
                              Rp {Math.round(totalCost * 0.5).toLocaleString("id-ID")}
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentScheme === "30_20_50" && (
                        <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                          <div className="bg-white p-2 border border-ink/20 rounded-lg space-y-0.5">
                            <span className="text-[9px] text-neutral-600 uppercase font-extrabold">Termin 1 (DP 30% Awal):</span>
                            <div className="text-xs font-black text-brand-orange">
                              Rp {Math.round(totalCost * 0.3).toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div className="bg-white p-2 border border-ink/20 rounded-lg space-y-0.5">
                            <span className="text-[9px] text-neutral-600 uppercase font-extrabold">Termin 2 (Progress 20%):</span>
                            <div className="text-xs font-black text-blue-700">
                              Rp {Math.round(totalCost * 0.2).toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div className="bg-white p-2 border border-ink/20 rounded-lg space-y-0.5">
                            <span className="text-[9px] text-neutral-600 uppercase font-extrabold">Termin 3 (Pelunasan 50%):</span>
                            <div className="text-xs font-black text-emerald-700">
                              Rp {Math.round(totalCost * 0.5).toLocaleString("id-ID")}
                            </div>
                          </div>
                        </div>
                      )}

                      {paymentScheme === "100_0" && (
                        <div className="bg-white p-2.5 border border-ink/20 rounded-lg text-xs font-bold">
                          <span className="text-[10px] text-neutral-600 uppercase font-extrabold">Pembayaran 100% Lunas di Awal:</span>
                          <div className="text-sm font-black text-emerald-700">
                            Rp {totalCost.toLocaleString("id-ID")}
                          </div>
                        </div>
                      )}

                      {paymentScheme === "custom" && (
                        <div className="bg-white p-2.5 border border-ink/20 rounded-lg text-xs font-bold">
                          <span className="text-[10px] text-neutral-600 uppercase font-extrabold">Ketentuan Pembayaran Khusus:</span>
                          <div className="text-xs font-black text-ink">
                            {customPaymentNotes || "Sesuai Kesepakatan Khusus Antara Kedua Pihak"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* SYARAT DAN KETENTUAN KERJASAMA */}
              <div className="space-y-1.5 p-3.5 border-2 border-ink rounded-xl bg-slate-50">
                <h4 className="font-black text-xs uppercase text-ink">KETENTUAN KERJASAMA &amp; GARANSI PRODUKSI:</h4>
                <ol className="list-decimal list-inside text-[11px] text-ink/90 font-medium space-y-1 leading-relaxed">
                  <li>Pelaksana Pekerjaan (Vendor) berkewajiban menyelesaikan pesanan sesuai spesifikasi bahan, desain, dan standar kualitas sampel yang disepakati.</li>
                  <li>Seluruh hasil produksi diserahterimakan kepada FILKOM Merch UB paling lambat pada tanggal deadline yang telah ditentukan.</li>
                  <li>Apabila terdapat cacat produksi (*defect*), kerusakan, atau ketidaksesuaian ukuran/kuantitas, Pihak Vendor berkewajiban melakukan perbaikan atau penggantian tanpa biaya tambahan.</li>
                  {selectedSpkPo.notes && (
                    <li className="font-bold text-brand-orange">Catatan Khusus SPK: "{selectedSpkPo.notes}"</li>
                  )}
                </ol>
              </div>

              {/* TANDA TANGAN 2 PIHAK */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t-2 border-ink text-center print:break-inside-avoid">
                <div className="flex flex-col items-center justify-between h-44">
                  <div>
                    <span className="font-bold text-[10px] uppercase text-neutral-700">PIHAK PERTAMA (PEMBERI KERJA)</span>
                    <div className="font-black text-xs text-ink uppercase mt-0.5">FILKOM MERCH UB</div>
                  </div>
                  <div className="w-56 text-center">
                    <div className="font-extrabold text-xs text-ink border-b-2 border-ink pb-1 uppercase">
                      Manajemen FILKOM Merch UB
                    </div>
                    <div className="text-[10px] text-neutral-600 font-bold mt-1">Tanda Tangan &amp; Stempel Resmi</div>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between h-44">
                  <div>
                    <span className="font-bold text-[10px] uppercase text-neutral-700">PIHAK KEDUA (PELAKSANA VENDOR)</span>
                    <div className="font-black text-xs text-ink uppercase mt-0.5">{selectedSpkPo.vendor_name || "Vendor Mitra"}</div>
                  </div>
                  <div className="w-56 text-center">
                    <div className="font-extrabold text-xs text-ink border-b-2 border-ink pb-1 uppercase">
                      {selectedSpkPo.contact_person || "Pimpinan / Rep. Vendor"}
                    </div>
                    <div className="text-[10px] text-neutral-600 font-bold mt-1">Tanda Tangan &amp; Stempel Vendor</div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
