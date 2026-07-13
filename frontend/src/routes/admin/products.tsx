import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FolderPlus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@frontend/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@frontend/components/ui/card";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { Textarea } from "@frontend/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@frontend/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select";
import {
  getAllProductsAdmin,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  type ProductWithVariants,
  type Category,
} from "@backend/server-actions";
import { resolveImageUrl } from "@/lib/image-resolver";

export const Route = createFileRoute("/admin/products")({
  component: AdminProductsPage,
  head: () => ({ meta: [{ title: "Produk — Admin Panel" }] }),
});

interface ProductForm {
  id?: number;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  original_price: string;
  filkom_price: string;
  promo_price: string;
  sale_type: string;
  product_type: string;
  low_stock_threshold: string;
  preorder_start_at: string;
  preorder_end_at: string;
  preorder_moq: string;
  production_eta_days: string;
  image_url: string;
  bahan: string;
  asal: string;
  aplikasi: string;
  size_chart_url: string;
  images: string[];
  variants: Array<{ size: string; color: string; stock: string; filkom_price: string }>;
  component_ids: number[];
  is_active: boolean;
}

const emptyForm = (): ProductForm => ({
  category_id: "",
  name: "",
  slug: "",
  description: "",
  price: "",
  original_price: "",
  filkom_price: "",
  promo_price: "",
  sale_type: "ready_stock",
  product_type: "ready",
  low_stock_threshold: "5",
  preorder_start_at: "",
  preorder_end_at: "",
  preorder_moq: "",
  production_eta_days: "",
  image_url: "",
  bahan: "",
  asal: "",
  aplikasi: "",
  size_chart_url: "",
  images: [],
  variants: [{ size: "One Size", color: "", stock: "0", filkom_price: "" }],
  component_ids: [],
  is_active: true,
});

const formatDateForInput = (dateVal: any) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    return "";
  }
};

function AdminProductsPage() {
  const { user } = useAuth();
  const isCashier = user?.type === "admin" && user.role === "cashier";
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const getApiBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || "https://filkommerch.com";
    url = url.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return url;
  };
  const API_BASE_URL = getApiBaseUrl();

  const loadProducts = async () => {
    const [productsRes, categoriesRes] = await Promise.all([
      getAllProductsAdmin(),
      getCategories(),
    ]);
    setProducts(productsRes.products);
    setCategories(categoriesRes.categories);
  };

  useEffect(() => {
    void loadProducts().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (product: ProductWithVariants) => {
    setForm({
      id: product.id,
      category_id: String(product.category_id),
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      price: String(product.price),
      original_price: product.original_price ? String(product.original_price) : "",
      filkom_price: product.filkom_price ? String(product.filkom_price) : "",
      promo_price: product.promo_price ? String(product.promo_price) : "",
      sale_type: product.sale_type === "limited_drop" ? "limited_drop" : "ready_stock",
      product_type:
        product.product_type === "bundle"
          ? "bundle"
          : product.sale_type === "pre_order"
            ? "preorder"
            : "ready",
      low_stock_threshold: product.low_stock_threshold ? String(product.low_stock_threshold) : "5",
      preorder_start_at: formatDateForInput(product.preorder_start_at),
      preorder_end_at: formatDateForInput(product.preorder_end_at),
      preorder_moq: product.preorder_moq ? String(product.preorder_moq) : "",
      production_eta_days: product.production_eta_days ? String(product.production_eta_days) : "",
      image_url: product.image_url || "",
      bahan: product.bahan || "",
      asal: product.asal || "",
      aplikasi: product.aplikasi || "",
      size_chart_url: product.size_chart_url || "",
      images: product.images || (product.image_url ? [product.image_url] : []),
      variants: product.variants.map((v) => ({
        size: v.size,
        color: v.color || "",
        stock: String(v.stock),
        filkom_price: v.filkom_price ? String(v.filkom_price) : "",
      })),
      component_ids: product.bundle_components ? product.bundle_components.map((c) => c.id) : [],
      is_active: product.is_active !== false,
    });
    setDialogOpen(true);
  };

  const cropToSquare = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const offsetX = (img.width - size) / 2;
            const offsetY = (img.height - size) / 2;
            ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
          }
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const targetName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                const croppedFile = new File([blob], targetName, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(croppedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.92
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      toast.loading("Memproses & Mengunggah foto (Auto Crop 1:1)...");
      const croppedFiles = await Promise.all(
        Array.from(files).map((f) => cropToSquare(f))
      );

      let newUploadedUrls: string[] = [];

      // Try batch upload via /api/upload-multiple
      try {
        const formData = new FormData();
        for (let i = 0; i < croppedFiles.length; i++) {
          formData.append("files", croppedFiles[i]);
        }

        const res = await fetch(`${API_BASE_URL}/api/upload-multiple`, {
          method: "POST",
          body: formData,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.urls && Array.isArray(data.urls)) {
            newUploadedUrls = data.urls;
          }
        }
      } catch (err) {
        console.warn("Batch upload failed, falling back to sequential upload:", err);
      }

      // Fallback: upload each file individually via /api/upload if batch upload didn't return URLs
      if (newUploadedUrls.length === 0) {
        for (const file of croppedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const singleRes = await fetch(`${API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData,
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          });
          const singleData = await singleRes.json();
          if (singleData.success && singleData.url) {
            newUploadedUrls.push(singleData.url);
          }
        }
      }

      toast.dismiss();

      if (newUploadedUrls.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...newUploadedUrls],
          image_url: prev.image_url || newUploadedUrls[0],
        }));
        toast.success(`${newUploadedUrls.length} foto 1:1 berhasil diunggah`);
      } else {
        toast.error("Gagal mengunggah foto. Periksa koneksi atau format file.");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah foto");
    }
  };

  const handleUploadSizeChart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.loading("Mengunggah foto size chart...");
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.url) {
        setForm((prev) => ({
          ...prev,
          size_chart_url: data.url,
        }));
        toast.success("Foto size chart berhasil diunggah");
      } else {
        toast.error(data.error || "Gagal mengunggah size chart");
      }
    } catch (err) {
      toast.dismiss();
      console.error(err);
      toast.error("Gagal mengunggah size chart");
    }
  };

  const handleSave = async () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah produk.");
      return;
    }
    if (!form.category_id || !form.name || !form.slug || !form.price) {
      toast.error("Lengkapi data produk");
      return;
    }

    setSaving(true);
    const payload = {
      category_id: parseInt(form.category_id),
      name: form.name,
      slug: form.slug,
      description: form.description,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      filkom_price: form.filkom_price ? parseFloat(form.filkom_price) : null,
      promo_price: form.promo_price ? parseFloat(form.promo_price) : null,
      sale_type:
        form.product_type === "preorder"
          ? "pre_order"
          : form.sale_type === "limited_drop"
            ? "limited_drop"
            : "ready_stock",
      product_type: form.product_type === "bundle" ? "bundle" : "apparel",
      low_stock_threshold: form.low_stock_threshold ? parseInt(form.low_stock_threshold) : 5,
      preorder_start_at: form.preorder_start_at || null,
      preorder_end_at: form.preorder_end_at || null,
      preorder_moq: form.preorder_moq ? parseInt(form.preorder_moq) : null,
      production_eta_days: form.production_eta_days ? parseInt(form.production_eta_days) : null,
      image_url: form.image_url || undefined,
      bahan: form.bahan || undefined,
      asal: form.asal || undefined,
      aplikasi: form.aplikasi || undefined,
      size_chart_url: form.size_chart_url || undefined,
      images: form.images,
      variants: form.variants.map((v) => ({
        size: v.size || "One Size",
        color: v.color || "",
        stock: parseInt(v.stock) || 0,
        filkom_price: v.filkom_price ? parseFloat(v.filkom_price) : null,
      })),
      component_ids: form.product_type === "bundle" ? form.component_ids : [],
      is_active: form.is_active,
    };

    const result = form.id
      ? await updateProduct({ data: { ...payload, id: form.id } })
      : await createProduct({ data: payload });

    setSaving(false);

    if (result.success) {
      toast.success(form.id ? "Produk diperbarui" : "Produk ditambahkan");
      setDialogOpen(false);
      await loadProducts();
    } else {
      toast.error(result.error || "Gagal menyimpan produk");
    }
  };

  const toggleProductActive = async (product: ProductWithVariants) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah status produk.");
      return;
    }
    const newStatus = !product.is_active;
    const tid = toast.loading(newStatus ? "Mengaktifkan produk..." : "Menyembunyikan produk...");

    try {
      const result = await updateProduct({
        data: {
          id: product.id,
          category_id: product.category_id,
          name: product.name,
          slug: product.slug,
          description: product.description || "",
          price: product.price,
          original_price: product.original_price,
          filkom_price: product.filkom_price,
          promo_price: product.promo_price,
          sale_type: product.sale_type,
          product_type: product.product_type,
          low_stock_threshold: product.low_stock_threshold,
          preorder_start_at: product.preorder_start_at,
          preorder_end_at: product.preorder_end_at,
          preorder_moq: product.preorder_moq,
          production_eta_days: product.production_eta_days,
          image_url: product.image_url || undefined,
          bahan: product.bahan || undefined,
          asal: product.asal || undefined,
          aplikasi: product.aplikasi || undefined,
          size_chart_url: product.size_chart_url || undefined,
          images: product.images || [],
          is_active: newStatus,
          variants: product.variants.map((v) => ({
            size: v.size,
            color: v.color || null,
            stock: v.stock,
            filkom_price: v.filkom_price,
          })),
          component_ids: product.bundle_components ? product.bundle_components.map((c) => c.id) : [],
        }
      });
      toast.dismiss(tid);
      if (result.success) {
        toast.success(newStatus ? "Produk diaktifkan" : "Produk disembunyikan");
        await loadProducts();
      } else {
        toast.error(result.error || "Gagal mengubah status produk");
      }
    } catch (err: any) {
      toast.dismiss(tid);
      toast.error(err.message || "Gagal mengubah status produk");
    }
  };

  const handleDelete = async (id: number) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus produk.");
      return;
    }
    if (!window.confirm("Nonaktifkan produk ini?")) return;
    const result = await deleteProduct({ data: id });
    if (result.success) {
      toast.success("Produk dinonaktifkan");
      await loadProducts();
    } else {
      toast.error(result.error || "Gagal menghapus produk");
    }
  };

  const handleCreateCategory = async () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan membuat kategori.");
      return;
    }
    if (!newCategoryName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    setSavingCategory(true);
    const result = await createCategory({ data: { name: newCategoryName.trim() } });
    setSavingCategory(false);
    if (result.success && result.category) {
      toast.success(`Kategori "${result.category.name}" berhasil ditambahkan`);
      setCategories((prev) =>
        [...prev, result.category!].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setForm({ ...form, category_id: String(result.category.id) });
      setNewCategoryName("");
    } else {
      toast.error(result.error || "Gagal membuat kategori");
    }
  };

  const handleUpdateCategory = async (id: number, newName: string) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah kategori.");
      return;
    }
    try {
      const result = await updateCategory({ data: { id, name: newName } });
      if (result.success && result.category) {
        toast.success("Kategori berhasil diperbarui");
        setCategories((prev) =>
          prev
            .map((c) => (c.id === id ? result.category! : c))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else {
        toast.error(result.error || "Gagal memperbarui kategori");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui kategori");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus kategori.");
      return;
    }
    if (
      !window.confirm(
        "Hapus kategori ini? Produk yang menggunakan kategori ini tidak akan dihapus.",
      )
    )
      return;
    try {
      const result = await deleteCategory({ data: id });
      if (result.success) {
        toast.success("Kategori berhasil dihapus");
        setCategories((prev) => prev.filter((c) => c.id !== id));
        if (form.category_id === String(id)) {
          setForm((prev) => ({ ...prev, category_id: "" }));
        }
      } else {
        toast.error(result.error || "Gagal menghapus kategori");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus kategori");
    }
  };

  const totalStock = (p: ProductWithVariants) => p.variants.reduce((sum, v) => sum + v.stock, 0);

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground bg-background min-h-screen">Memuat produk...</div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider">Manajemen Produk</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            CRUD produk — stok tersinkron dengan POS
          </p>
        </div>
        {!isCashier && (
          <Button
            onClick={openCreate}
            className="display bg-ink text-white hover:bg-brand-orange transition-all duration-300 text-xs font-bold tracking-widest py-5 px-6"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Produk
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="display text-sm tracking-wider text-ink">Daftar Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                    Produk
                  </th>
                  <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                    Kategori
                  </th>
                  <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                    Harga
                  </th>
                  <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                    Stok Total
                  </th>
                  <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">
                    Status
                  </th>
                  {!isCashier && (
                    <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={resolveImageUrl(product.image_url)}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-cream border border-border shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-ink uppercase text-xs tracking-wide">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{product.slug}</p>
                          {product.variants && product.variants.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 max-w-md">
                              {product.variants.map((v, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] bg-cream border border-border px-1.5 py-0.5 rounded text-muted-foreground font-medium"
                                >
                                  {v.size}
                                  {v.color ? ` (${v.color})` : ""}: {v.stock}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {product.category_name || "-"}
                    </td>
                    <td className="p-3 text-right font-bold text-ink">
                      Rp {Number(product.price).toLocaleString("id-ID")}
                    </td>
                    <td className="p-3 text-right font-bold text-brand-blue">
                      {totalStock(product)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => void toggleProductActive(product)}
                        disabled={isCashier}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-100 disabled:cursor-default disabled:hover:scale-100 cursor-pointer ${
                          product.is_active
                            ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                        title={isCashier ? undefined : (product.is_active ? "Klik untuk sembunyikan produk" : "Klik untuk tampilkan produk")}
                      >
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    {!isCashier && (
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(product)}
                            className="hover:bg-muted text-ink"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-red-50"
                            onClick={() => void handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl sm:max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 border-2 border-ink rounded-2xl shadow-[8px_8px_0px_0px_rgba(27,27,27,1)] bg-background">
          <DialogHeader className="border-b border-border pb-3">
            <DialogTitle className="display text-xl sm:text-2xl text-ink uppercase tracking-wide flex items-center justify-between">
              <span>{form.id ? "Edit Produk Merchandise" : "Tambah Produk Baru"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Top Toggle: Status Aktif (Tampilkan Produk) */}
            <div className="flex items-center justify-between border-2 border-ink p-4 rounded-xl bg-cream/40 shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`w-3.5 h-3.5 rounded-full ${form.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                <div>
                  <Label htmlFor="top_is_active_toggle" className="text-xs font-black text-ink uppercase tracking-wider cursor-pointer flex items-center gap-2">
                    TAMPILKAN PRODUK (STATUS AKTIF)
                  </Label>
                  <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    {form.is_active ? "Produk aktif dan ditampilkan di beranda, katalog, serta POS kasir." : "Produk disembunyikan dari beranda, katalog, dan kasir POS."}
                  </p>
                </div>
              </div>
              <input
                id="top_is_active_toggle"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-5 w-5 rounded border-2 border-ink bg-background cursor-pointer accent-brand-orange"
              />
            </div>

            {/* Section 1: Categories & Product Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-extrabold text-xs uppercase text-ink">Kategori Produk</Label>
                <div className="flex gap-2">
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setForm({ ...form, category_id: v })}
                  >
                    <SelectTrigger className="flex-1 border-2 border-ink/40">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCategoryDialogOpen(true)}
                    title="Kelola Kategori"
                    className="shrink-0 h-10 w-10 border-2 border-dashed border-ink hover:border-brand-orange hover:text-brand-orange transition-colors"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-extrabold text-xs uppercase text-ink">Tipe Penjualan Produk</Label>
                <Select
                  value={form.product_type}
                  onValueChange={(v) => setForm({ ...form, product_type: v })}
                >
                  <SelectTrigger className="border-2 border-ink/40">
                    <SelectValue placeholder="Ready Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready">Ready Stock (Normal)</SelectItem>
                    <SelectItem value="preorder">Pre-Order Campaign</SelectItem>
                    <SelectItem value="bundle">Bundle / Paket Hemat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section 2: Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7 space-y-2">
                <Label className="font-extrabold text-xs uppercase text-ink">Nama Produk *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="Contoh: FILKOM Varsity Jacket 2026 Edition"
                  className="border-2 border-ink/40"
                />
              </div>
              <div className="sm:col-span-5 space-y-2">
                <Label className="font-extrabold text-xs uppercase text-ink">URL Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="filkom-varsity-jacket-2026"
                  className="border-2 border-ink/40"
                />
              </div>
            </div>

            {/* Section 3: Pricing Scheme (Skema Harga) */}
            <div className="p-4 border-2 border-ink rounded-xl bg-white space-y-3 shadow-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-brand-orange flex items-center gap-2">
                💰 SKEMA PENGATURAN HARGA PRODUK
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase text-ink">
                    Harga Umum (Rp) *
                  </Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="Harga reguler"
                    className="border-2 border-ink/40 font-extrabold text-ink"
                  />
                  <p className="text-[9px] text-muted-foreground">Harga standar untuk umum</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase text-brand-orange">
                    Harga Civitas FILKOM (Rp)
                  </Label>
                  <Input
                    type="number"
                    value={form.filkom_price}
                    onChange={(e) => setForm({ ...form, filkom_price: e.target.value })}
                    placeholder="Harga mahasiswa FILKOM"
                    className="border-2 border-brand-orange/40 font-extrabold text-brand-orange"
                  />
                  <p className="text-[9px] text-muted-foreground">Khusus civitas terverifikasi</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase text-red-600">
                    Harga Promo Khusus (Rp)
                  </Label>
                  <Input
                    type="number"
                    value={form.promo_price}
                    onChange={(e) => setForm({ ...form, promo_price: e.target.value })}
                    placeholder="Opsional promo"
                    className="border-2 border-red-500/40 text-red-600 font-bold"
                  />
                  <p className="text-[9px] text-muted-foreground">Harga event/flash sale</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-extrabold uppercase text-muted-foreground">
                    Harga Coret / Asli (Rp)
                  </Label>
                  <Input
                    type="number"
                    value={form.original_price}
                    onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                    placeholder="Opsional harga asal"
                    className="border-2 border-border"
                  />
                  <p className="text-[9px] text-muted-foreground">Untuk tampilan harga dicoret</p>
                </div>
              </div>
            </div>

            {/* Conditional Parameters: Pre-Order */}
            {form.product_type === "preorder" && (
              <div className="border-2 border-brand-orange bg-orange-50/30 p-4 rounded-xl space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-brand-orange">
                  🔥 PARAMETER PRE-ORDER CAMPAIGN
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Tanggal Mulai PO</Label>
                    <Input
                      type="datetime-local"
                      value={form.preorder_start_at}
                      onChange={(e) => setForm({ ...form, preorder_start_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Tanggal Selesai PO</Label>
                    <Input
                      type="datetime-local"
                      value={form.preorder_end_at}
                      onChange={(e) => setForm({ ...form, preorder_end_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Kuota Minimum Order (MOQ)</Label>
                    <Input
                      type="number"
                      placeholder="Contoh: 50 pcs"
                      value={form.preorder_moq}
                      onChange={(e) => setForm({ ...form, preorder_moq: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Estimasi Waktu Produksi (Hari)</Label>
                    <Input
                      type="number"
                      placeholder="Contoh: 14 hari"
                      value={form.production_eta_days}
                      onChange={(e) => setForm({ ...form, production_eta_days: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Conditional Parameters: Bundle */}
            {form.product_type === "bundle" && (
              <div className="border-2 border-brand-blue bg-blue-50/20 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-brand-blue">
                  📦 DAFTAR PRODUK DALAM PAKET BUNDLE
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2 border-2 border-border rounded-xl p-3 bg-background">
                  {products
                    .filter((p) => p.id !== form.id && p.product_type !== "bundle")
                    .map((p) => {
                      const isChecked = form.component_ids?.includes(p.id) || false;
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2.5 text-xs font-bold cursor-pointer hover:bg-cream/40 p-2 rounded-lg border border-transparent hover:border-ink/20"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const currentIds = form.component_ids || [];
                              const nextIds = e.target.checked
                                ? [...currentIds, p.id]
                                : currentIds.filter((id) => id !== p.id);
                              setForm({ ...form, component_ids: nextIds });
                            }}
                            className="h-4 w-4 rounded border-2 border-ink accent-brand-orange"
                          />
                          <span>
                            {p.name} — <strong className="text-brand-orange">Rp {Number(p.price).toLocaleString("id-ID")}</strong>
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Section 4: Product Image Uploads & Main Cover Selector */}
            <div className="space-y-3 border-2 border-ink p-4 rounded-xl bg-white shadow-xs">
              <div className="flex items-center justify-between">
                <Label className="font-black text-xs uppercase text-ink">
                  📷 FOTO PRODUK (AUTO CROP 1:1 SQUARE) *
                </Label>
                <span className="text-[10px] text-brand-orange font-mono font-extrabold uppercase">
                  Klik foto untuk set Sampul Utama
                </span>
              </div>

              <div className="space-y-3">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUploadImages}
                  className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-ink file:text-xs file:font-extrabold file:bg-cream file:text-ink hover:file:bg-brand-orange hover:file:text-white cursor-pointer"
                />

                {/* Uploaded Image Cards Grid */}
                {form.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-3 border-2 border-dashed border-border rounded-xl bg-cream/10">
                    {form.images.map((img, idx) => {
                      const isMainCover = form.image_url === img || (idx === 0 && !form.image_url);
                      return (
                        <div
                          key={idx}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group bg-cream flex flex-col justify-between ${
                            isMainCover ? "border-brand-orange ring-4 ring-brand-orange/30 shadow-md" : "border-ink/40"
                          }`}
                        >
                          <img src={resolveImageUrl(img)} alt="preview" className="w-full h-full object-cover" />

                          {/* Action Overlay */}
                          <div className="absolute inset-0 bg-ink/75 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center">
                            {!isMainCover && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Set as main cover image (move to front of images array)
                                  const filtered = form.images.filter((_, i) => i !== idx);
                                  const reordered = [img, ...filtered];
                                  setForm({
                                    ...form,
                                    images: reordered,
                                    image_url: img,
                                  });
                                  toast.success("Foto diatur sebagai Sampul Utama!");
                                }}
                                className="w-full py-1 px-2 bg-brand-orange text-ink font-black text-[9px] rounded uppercase border border-ink hover:scale-105 transition-transform cursor-pointer"
                              >
                                Set Utama
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = form.images.filter((_, i) => i !== idx);
                                setForm({
                                  ...form,
                                  images: newImages,
                                  image_url: newImages.length > 0 ? newImages[0] : "",
                                });
                              }}
                              className="w-full py-1 px-2 bg-red-600 text-white font-bold text-[9px] rounded uppercase hover:bg-red-700 cursor-pointer flex items-center justify-center gap-1"
                            >
                              <X className="w-3 h-3" /> Hapus
                            </button>
                          </div>

                          {/* Main Badge */}
                          {isMainCover && (
                            <span className="absolute top-1 left-1 bg-brand-orange text-ink text-[8px] font-black px-2 py-0.5 rounded-full border border-ink shadow-xs uppercase tracking-wider">
                              ⭐ Utama
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Specifications & Size Chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold uppercase text-ink">Bahan Kain / Material</Label>
                  <Input
                    placeholder="Contoh: Heavyweight Cotton 330GSM"
                    value={form.bahan}
                    onChange={(e) => setForm({ ...form, bahan: e.target.value })}
                    className="border-2 border-ink/40 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-extrabold uppercase text-ink">Aplikasi Sablon / Bordir</Label>
                  <Input
                    placeholder="Contoh: High Precision Bordir Timbul"
                    value={form.aplikasi}
                    onChange={(e) => setForm({ ...form, aplikasi: e.target.value })}
                    className="border-2 border-ink/40 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-extrabold text-xs uppercase text-ink">Foto Size Chart (Unggah)</Label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadSizeChart}
                    className="text-xs file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-2 file:border-ink file:text-xs file:font-semibold file:bg-cream file:text-ink hover:file:bg-cream/80 cursor-pointer"
                  />

                  {form.size_chart_url && (
                    <div className="relative w-36 aspect-[4/3] rounded-xl border-2 border-ink overflow-hidden bg-cream group">
                      <img
                        src={form.size_chart_url}
                        alt="Size Chart Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, size_chart_url: "" })}
                        className="absolute inset-0 bg-red-600/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
                      >
                        Hapus Size Chart
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="font-extrabold text-xs uppercase text-ink">Deskripsi Lengkap Produk</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tuliskan detail deskripsi keunggulan merchandise..."
                rows={3}
                className="border-2 border-ink/40 text-xs"
              />
            </div>

            {/* Section 6: Variants & Subvariants Management */}
            <div className="space-y-3 border-2 border-ink p-4 rounded-xl bg-white shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-2">
                    🏷️ PENGATURAN VARIAN &amp; SUBVARIAN STOK
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    Atur Varian 1 (Warna), Subvarian 2 (Ukuran), Stok, &amp; Penambahan Harga (Rp) dari harga utama. Jika tanpa varian, biarkan 1 baris standar.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [
                        ...form.variants,
                        { size: "S", color: "", stock: "10", filkom_price: "" },
                      ],
                    })
                  }
                  className="bg-cream hover:bg-brand-orange hover:text-white border-2 border-ink font-black text-xs px-3 py-1.5 h-auto uppercase cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Varian Baru
                </Button>
              </div>

              <div className="space-y-2.5">
                {/* Variant Column Headers */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-muted-foreground px-1">
                  <div className="col-span-3">Varian 1 (mis. Warna)</div>
                  <div className="col-span-3">Subvarian 2 (mis. Ukuran)</div>
                  <div className="col-span-2">Stok (Pcs)</div>
                  <div className="col-span-3">Penambahan Harga / Add-on (Rp)</div>
                  <div className="col-span-1 text-center">Hapus</div>
                </div>

                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-cream/20 p-2 rounded-xl border border-ink/20">
                    <div className="col-span-3">
                      <Input
                        placeholder="Navy, Black, dll"
                        value={v.color}
                        onChange={(e) => {
                          const variants = [...form.variants];
                          variants[i] = { ...variants[i], color: e.target.value };
                          setForm({ ...form, variants });
                        }}
                        className="text-xs border-ink/30"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        placeholder="S, M, L, XL, All Size"
                        value={v.size}
                        onChange={(e) => {
                          const variants = [...form.variants];
                          variants[i] = { ...variants[i], size: e.target.value };
                          setForm({ ...form, variants });
                        }}
                        className="text-xs border-ink/30"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Stok"
                        value={v.stock}
                        onChange={(e) => {
                          const variants = [...form.variants];
                          variants[i] = { ...variants[i], stock: e.target.value };
                          setForm({ ...form, variants });
                        }}
                        className="text-xs border-ink/30 text-center font-extrabold"
                      />
                    </div>
                    <div className="col-span-3">
                      <Input
                        type="number"
                        placeholder="+0 (mis. 10000 untuk XXL)"
                        value={v.filkom_price}
                        onChange={(e) => {
                          const variants = [...form.variants];
                          variants[i] = { ...variants[i], filkom_price: e.target.value };
                          setForm({ ...form, variants });
                        }}
                        className="text-xs border-ink/30 font-bold"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-red-50 hover:text-destructive h-8 w-8 rounded-lg cursor-pointer"
                        onClick={() => {
                          const variants = form.variants.filter((_, idx) => idx !== i);
                          setForm({ ...form, variants: variants.length > 0 ? variants : [{ size: "One Size", color: "", stock: "0", filkom_price: "" }] });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-border flex flex-row gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-2 border-ink font-bold text-xs uppercase px-5 py-2.5 h-auto rounded-xl hover:bg-cream"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-ink hover:bg-brand-orange text-white font-extrabold text-xs uppercase px-6 py-2.5 h-auto rounded-xl border-2 border-ink shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
            >
              {saving ? "Menyimpan..." : "Simpan Produk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola Kategori</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Form Tambah Kategori Baru */}
            <div className="flex gap-2 items-center border-b pb-4">
              <Input
                placeholder="Nama kategori baru..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreateCategory();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={() => void handleCreateCategory()}
                disabled={savingCategory}
                className="bg-ink hover:bg-brand-orange text-white"
              >
                Tambah
              </Button>
            </div>

            {/* Daftar Kategori */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Daftar Kategori Terdaftar
              </Label>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada kategori</p>
              ) : (
                <div className="divide-y divide-border border rounded-lg p-2 bg-cream/10 max-h-[40vh] overflow-y-auto">
                  {categories.map((c) => (
                    <CategoryListItem
                      key={c.id}
                      category={c}
                      onUpdate={handleUpdateCategory}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryListItem({
  category,
  onUpdate,
  onDelete,
}: {
  category: Category;
  onUpdate: (id: number, newName: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Nama kategori tidak boleh kosong");
      return;
    }
    setSaving(true);
    await onUpdate(category.id, editName.trim());
    setIsEditing(false);
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-between py-2 gap-2 border-b last:border-b-0 animate-fade-in">
      {isEditing ? (
        <div className="flex gap-1.5 items-center flex-1">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 py-1 px-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
            }}
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setIsEditing(false);
              setEditName(category.name);
            }}
            disabled={saving}
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <span className="text-sm font-medium text-ink flex-1 truncate">{category.name}</span>
          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void onDelete(category.id)}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
