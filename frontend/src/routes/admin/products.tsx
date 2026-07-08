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
  const isCashier = user?.role === "cashier";
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
    });
    setDialogOpen(true);
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      toast.loading("Mengunggah foto...");
      const res = await fetch(`${API_BASE_URL}/api/upload-multiple`, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true"
        }
      });
      const data = await res.json();
      toast.dismiss();

      if (data.success && data.urls) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, ...data.urls],
          image_url: prev.image_url || data.urls[0],
        }));
        toast.success(`${data.urls.length} foto berhasil diunggah`);
      } else {
        toast.error(data.error || "Gagal mengunggah foto");
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
        size: v.size,
        color: v.color || null,
        stock: parseInt(v.stock) || 0,
        filkom_price: v.filkom_price ? parseFloat(v.filkom_price) : null,
      })),
      component_ids: form.product_type === "bundle" ? form.component_ids : [],
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
                            src={product.image_url}
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
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          product.is_active
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {product.is_active ? "Aktif" : "Nonaktif"}
                      </span>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori</Label>
              <div className="flex gap-2">
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih kategori" />
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
                  className="shrink-0 h-9 w-9 border-dashed border-2 hover:border-brand-orange hover:text-brand-orange transition-colors"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Harga Utama / Promo (Rp)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="Harga jual"
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Asli / Sebelum Diskon (Rp)</Label>
                <Input
                  type="number"
                  value={form.original_price}
                  onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                  placeholder="Opsional, untuk coret harga"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Harga Civitas FILKOM UB (Rp)</Label>
                <Input
                  type="number"
                  value={form.filkom_price}
                  onChange={(e) => setForm({ ...form, filkom_price: e.target.value })}
                  placeholder="Harga khusus Civitas FILKOM UB"
                />
              </div>
              <div className="space-y-2">
                <Label>Harga Promo Khusus (Rp)</Label>
                <Input
                  type="number"
                  value={form.promo_price}
                  onChange={(e) => setForm({ ...form, promo_price: e.target.value })}
                  placeholder="Harga promo diskon (jika ada)"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipe Produk</Label>
                <Select
                  value={form.product_type}
                  onValueChange={(v) => setForm({ ...form, product_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ready Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready">Ready Stock</SelectItem>
                    <SelectItem value="preorder">Pre-Order</SelectItem>
                    <SelectItem value="bundle">Bundle / Paket</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model Rilis / Label</Label>
                <Select
                  value={form.sale_type || "ready_stock"}
                  onValueChange={(v) => setForm({ ...form, sale_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ready Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready_stock">Ready Stock (Normal)</SelectItem>
                    <SelectItem value="limited_drop">Limited Drop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Batas Stok Menipis</Label>
                <Input
                  type="number"
                  value={form.low_stock_threshold}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })}
                  placeholder="Default 5"
                />
              </div>
            </div>

            {form.product_type === "preorder" && (
              <div className="border border-brand-orange/30 bg-orange-50/20 p-4 rounded-lg space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-orange">
                  Parameter Pre-Order
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Mulai Pre-Order</Label>
                    <Input
                      type="datetime-local"
                      value={form.preorder_start_at}
                      onChange={(e) => setForm({ ...form, preorder_start_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Selesai Pre-Order</Label>
                    <Input
                      type="datetime-local"
                      value={form.preorder_end_at}
                      onChange={(e) => setForm({ ...form, preorder_end_at: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Minimum Order Qty (MOQ)</Label>
                    <Input
                      type="number"
                      placeholder="Kuota minimum"
                      value={form.preorder_moq}
                      onChange={(e) => setForm({ ...form, preorder_moq: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Estimasi Produksi (Hari)</Label>
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
            {form.product_type === "bundle" && (
              <div className="border border-brand-blue/30 bg-blue-50/5 p-4 rounded-lg space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-blue font-bold">
                  Daftar Produk Komponen Paket
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2 border border-border rounded p-2 bg-background">
                  {products
                    .filter((p) => p.id !== form.id && p.product_type !== "bundle")
                    .map((p) => {
                      const isChecked = form.component_ids?.includes(p.id) || false;
                      return (
                        <label
                          key={p.id}
                          className="flex items-center gap-2 text-xs font-medium cursor-pointer hover:bg-muted p-1.5 rounded"
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
                            className="h-3.5 w-3.5 rounded border-border"
                          />
                          <span>
                            {p.name} (Rp {p.price.toLocaleString("id-ID")})
                          </span>
                        </label>
                      );
                    })}
                  {products.filter((p) => p.id !== form.id && p.product_type !== "bundle")
                    .length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Tidak ada produk lain tersedia
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Multiple Product Images Upload */}
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase text-ink">
                Foto Produk (Unggah Langsung) *
              </Label>
              <div className="flex flex-col gap-3">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUploadImages}
                  className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-2 file:border-ink file:text-xs file:font-semibold file:bg-cream file:text-ink hover:file:bg-cream/80 cursor-pointer"
                />

                {/* Image Previews */}
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border-2 border-dashed border-border rounded-lg bg-cream/10">
                    {form.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-16 h-16 rounded overflow-hidden border border-ink/40 group"
                      >
                        <img src={img} alt="preview" className="w-full h-full object-cover" />
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
                          className="absolute inset-0 bg-red-600/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-ink/90 text-white text-[8px] font-extrabold text-center uppercase tracking-wider py-0.5">
                            Utama
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Specifications fields (bahan, asal, aplikasi) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-y py-3 my-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Bahan
                </Label>
                <Input
                  placeholder="Cotton Fleece, dll"
                  value={form.bahan}
                  onChange={(e) => setForm({ ...form, bahan: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Asal
                </Label>
                <Input
                  placeholder="Creative Div, dll"
                  value={form.asal}
                  onChange={(e) => setForm({ ...form, asal: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Aplikasi/Detail
                </Label>
                <Input
                  placeholder="Bordir, DTF, dll"
                  value={form.aplikasi}
                  onChange={(e) => setForm({ ...form, aplikasi: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Size Chart Image Upload */}
            <div className="space-y-2 pb-2">
              <Label className="font-bold text-xs uppercase text-ink">
                Foto Size Chart (Unggah Langsung)
              </Label>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadSizeChart}
                  className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-2 file:border-ink file:text-xs file:font-semibold file:bg-cream file:text-ink hover:file:bg-cream/80 cursor-pointer"
                />

                {form.size_chart_url && (
                  <div className="relative w-32 aspect-[4/3] rounded border border-ink/40 overflow-hidden bg-cream group">
                    <img
                      src={form.size_chart_url}
                      alt="Size Chart Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, size_chart_url: "" })}
                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold"
                    >
                      Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-1">
                <Label className="text-sm font-semibold">Varian & Stok</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [
                        ...form.variants,
                        { size: "", color: "", stock: "0", filkom_price: "" },
                      ],
                    })
                  }
                  className="h-8 text-xs font-bold"
                >
                  + Varian Baru
                </Button>
              </div>
              <div className="space-y-2">
                {form.variants.map((v, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Ukuran (S, M, L, dll)"
                      value={v.size}
                      onChange={(e) => {
                        const variants = [...form.variants];
                        variants[i] = { ...variants[i], size: e.target.value };
                        setForm({ ...form, variants });
                      }}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Warna (Opsional)"
                      value={v.color}
                      onChange={(e) => {
                        const variants = [...form.variants];
                        variants[i] = { ...variants[i], color: e.target.value };
                        setForm({ ...form, variants });
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Stok"
                      value={v.stock}
                      onChange={(e) => {
                        const variants = [...form.variants];
                        variants[i] = { ...variants[i], stock: e.target.value };
                        setForm({ ...form, variants });
                      }}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Harga Filkom"
                      value={v.filkom_price}
                      onChange={(e) => {
                        const variants = [...form.variants];
                        variants[i] = { ...variants[i], filkom_price: e.target.value };
                        setForm({ ...form, variants });
                      }}
                      className="w-28 text-xs"
                    />
                    {form.variants.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-red-50 hover:text-destructive shrink-0"
                        onClick={() => {
                          const variants = form.variants.filter((_, idx) => idx !== i);
                          setForm({ ...form, variants });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
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
