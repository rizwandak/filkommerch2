import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, User } from "lucide-react";
import { toast } from "sonner";
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
  getUsersAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  type DbUser,
} from "@backend/server-actions";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  head: () => ({ meta: [{ title: "Pengguna — Admin Panel" }] }),
});

interface UserForm {
  id?: number;
  name: string;
  email: string;
  password?: string;
  nim: string;
  phone: string;
  address: string;
  role: "admin" | "cashier" | "customer";
  is_filkom_verified?: boolean;
}

const emptyForm = (): UserForm => ({
  name: "",
  email: "",
  password: "",
  nim: "",
  phone: "",
  address: "",
  role: "customer",
  is_filkom_verified: false,
});

function AdminUsersPage() {
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [userNameToDelete, setUserNameToDelete] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsersAdmin();
      if (result.success) {
        setUsers(result.users);
      } else {
        toast.error(result.error || "Gagal memuat pengguna");
      }
    } catch {
      toast.error("Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (user: DbUser) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "", // password left empty for update unless changed
      nim: user.nim || "",
      phone: user.phone || "",
      address: user.address || "",
      role: user.role,
      is_filkom_verified: user.is_filkom_verified === 1,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.role) {
      toast.error("Nama, username, dan peran wajib diisi!");
      return;
    }
    if (!form.id && !form.password) {
      toast.error("Password wajib diisi untuk pengguna baru!");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id,
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        nim: form.nim || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        role: form.role,
        is_filkom_verified: form.is_filkom_verified ? 1 : 0,
      };

      const result = form.id
        ? await updateUserAdmin({ data: payload })
        : await createUserAdmin({ data: payload });

      if (result.success) {
        toast.success(
          form.id ? "Data pengguna berhasil diperbarui" : "Pengguna baru berhasil ditambahkan",
        );
        setDialogOpen(false);
        await loadUsers();
      } else {
        toast.error(result.error || "Gagal menyimpan data");
      }
    } catch (e: any) {
      toast.error(e.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (user: DbUser) => {
    if (user.id === 1) {
      toast.error("Admin utama tidak dapat dihapus!");
      return;
    }
    setUserToDelete(user.id);
    setUserNameToDelete(user.name);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setSaving(true);
    try {
      const result = await deleteUserAdmin({ data: userToDelete });
      if (result.success) {
        toast.success("Pengguna berhasil dihapus");
        setDeleteConfirmOpen(false);
        await loadUsers();
      } else {
        toast.error(result.error || "Gagal menghapus pengguna");
      }
    } catch {
      toast.error("Gagal melakukan penghapusan");
    } finally {
      setSaving(false);
      setUserToDelete(null);
    }
  };

  const toggleRoleFilter = (role: string) => {
    setRoleFilters((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const filteredUsers = users.filter((u) => {
    const matchRole = roleFilters.length === 0 || roleFilters.includes(u.role);
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.nim && u.nim.includes(q)) ||
      (u.phone && u.phone.includes(q));

    return matchRole && matchSearch;
  });

  if (loading && users.length === 0) {
    return (
      <div className="p-8 text-muted-foreground bg-background min-h-screen">
        Memuat data pengguna...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl text-ink tracking-wider">Manajemen Pengguna</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            Kelola data mahasiswa dan tim operasional (Admin & Kasir)
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="display bg-ink text-white hover:bg-brand-orange transition-all duration-300 text-xs font-bold tracking-widest py-5 px-6 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 bg-card border border-border p-4 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan nama, username, NIM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peran:</span>
          {[
            { value: "admin", label: "Administrator" },
            { value: "cashier", label: "Kasir POS" },
            { value: "customer", label: "Customer" },
          ].map((role) => (
            <label
              key={role.value}
              className={`flex items-center gap-1.5 cursor-pointer select-none rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                roleFilters.includes(role.value)
                  ? role.value === "admin"
                    ? "bg-red-50 text-red-700 border-red-300"
                    : role.value === "cashier"
                      ? "bg-amber-50 text-amber-700 border-amber-300"
                      : "bg-blue-50 text-blue-700 border-blue-300"
                  : "bg-white text-muted-foreground border-border hover:border-slate-400"
              }`}
            >
              <input
                type="checkbox"
                checked={roleFilters.includes(role.value)}
                onChange={() => toggleRoleFilter(role.value)}
                className="sr-only"
              />
              {role.label}
            </label>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="display text-sm tracking-wider text-ink">Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                    Nama / NIM
                  </th>
                  <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                    Username
                  </th>
                  <th className="p-3 text-left text-xs font-semibold tracking-wider text-ink uppercase">
                    Telepon
                  </th>
                  <th className="p-3 text-center text-xs font-semibold tracking-wider text-ink uppercase">
                    Peran
                  </th>
                  <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Pengguna tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t border-border">
                      <td className="p-3">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-ink uppercase text-xs tracking-wide">
                              {user.name}
                            </p>
                            {user.is_filkom_verified === 1 && (
                              <span className="bg-green-100 text-green-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">
                                VERIFIED
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {user.nim || "Non-Mahasiswa"}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{user.email}</td>
                      <td className="p-3 text-muted-foreground text-xs">{user.phone || "-"}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            user.role === "admin"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : user.role === "cashier"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(user)}
                            className="hover:bg-muted text-ink"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={user.id === 1}
                            className="text-destructive hover:bg-red-50 disabled:opacity-30"
                            onClick={() => openDeleteConfirm(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* dialog modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Data Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>Username *</Label>
              <Input
                type="text"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Masukkan username"
              />
            </div>

            <div className="space-y-2">
              <Label>Peran / Role *</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer (Mahasiswa)</SelectItem>
                  <SelectItem value="cashier">Kasir POS</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>NIM (Opsional)</Label>
              <Input
                value={form.nim}
                onChange={(e) => setForm({ ...form, nim: e.target.value })}
                placeholder="2351502xxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label>Password {form.id ? "(Isi jika ingin diubah)" : "*"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="081234567890"
              />
            </div>

            <div className="space-y-2">
              <Label>Alamat Lengkap</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Jl. MT Haryono No. 167..."
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="is_filkom_verified"
                checked={!!form.is_filkom_verified}
                onChange={(e) => setForm({ ...form, is_filkom_verified: e.target.checked })}
                className="h-4.5 w-4.5 rounded border-gray-300 text-brand-orange focus:ring-brand-orange cursor-pointer"
              />
              <Label
                htmlFor="is_filkom_verified"
                className="cursor-pointer font-bold text-xs uppercase text-ink"
              >
                Verifikasi Civitas FILKOM UB (Aktifkan Diskon)
              </Label>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-lg text-ink">Konfirmasi Hapus Pengguna</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Apakah Anda yakin ingin menghapus pengguna <span className="font-bold text-ink uppercase">{userNameToDelete}</span> secara permanen? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={saving}>
              {saving ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
