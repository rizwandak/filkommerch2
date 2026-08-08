import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, User, Users, ShieldCheck, MonitorSmartphone, GraduationCap, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
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
  const { user, loading: authLoading } = useAuth();
  const isCashier = user?.type === "admin" && user.role === "cashier";
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [userNameToDelete, setUserNameToDelete] = useState("");

  const API_BASE_URL = getApiBaseUrl();

  const getAdminRequestHeaders = () => {
    const role = user?.type === "admin" ? user.role : undefined;
    const id = user?.id ? String(user.id) : undefined;
    const name = user?.type === "admin" ? user.username : user?.name;

    const headers: Record<string, string> = {};
    if (role) headers["x-user-role"] = role;
    if (id) headers["x-user-id"] = id;
    if (name) headers["x-user-name"] = name;
    return headers;
  };

  const stats = useMemo(() => {
    const total = users.length;
    let adminCount = 0;
    let cashierCount = 0;
    let customerCount = 0;
    let verifiedCount = 0;

    users.forEach((u) => {
      if (u.role === "admin") adminCount++;
      else if (u.role === "cashier") cashierCount++;
      else if (u.role === "customer") customerCount++;

      if (Number(u.is_filkom_verified) === 1) {
        verifiedCount++;
      }
    });

    return { total, adminCount, cashierCount, customerCount, verifiedCount };
  }, [users]);

  const fetchAdminUsers = async () => {
    const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: "GET",
      headers: getAdminRequestHeaders(),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Gagal memuat pengguna (HTTP ${res.status})`);
    }

    return data as { success: boolean; users: DbUser[]; error?: string };
  };

  const createAdminUser = async (payload: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAdminRequestHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Gagal menyimpan pengguna (HTTP ${res.status})`);
    }

    return data as { success: boolean; error?: string };
  };

  const updateAdminUser = async (payload: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAdminRequestHeaders(),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Gagal menyimpan pengguna (HTTP ${res.status})`);
    }

    return data as { success: boolean; error?: string };
  };

  const deleteAdminUser = async (id: number) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      method: "DELETE",
      headers: getAdminRequestHeaders(),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.error || `Gagal menghapus pengguna (HTTP ${res.status})`);
    }

    return data as { success: boolean; error?: string };
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await fetchAdminUsers();
      if (result.success) {
        setUsers(result.users);
      } else {
        toast.error(result.error || "Gagal memuat pengguna");
      }
    } catch (error: any) {
      toast.error(error?.message || "Gagal memuat daftar pengguna");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void loadUsers();
  }, [authLoading]);

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
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan mengubah pengguna.");
      return;
    }
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
        ? await updateAdminUser(payload)
        : await createAdminUser(payload);

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
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus pengguna.");
      return;
    }
    if (user.id === 1) {
      toast.error("Admin utama tidak dapat dihapus!");
      return;
    }
    setUserToDelete(user.id);
    setUserNameToDelete(user.name);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (isCashier) {
      toast.error("Akses ditolak: Kasir tidak diizinkan menghapus pengguna.");
      return;
    }
    if (!userToDelete) return;
    setSaving(true);
    try {
      const result = await deleteAdminUser(userToDelete);
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
    const matchVerified = !verifiedOnly || Number(u.is_filkom_verified) === 1;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.nim && u.nim.includes(q)) ||
      (u.phone && u.phone.includes(q));

    return matchRole && matchVerified && matchSearch;
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
        {!isCashier && (
          <Button
            onClick={openCreate}
            className="display bg-ink text-white hover:bg-brand-orange transition-all duration-300 text-xs font-bold tracking-widest py-5 px-6 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pengguna
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Semua */}
        <button
          type="button"
          onClick={() => {
            setRoleFilters([]);
            setVerifiedOnly(false);
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${
            roleFilters.length === 0 && !verifiedOnly
              ? "bg-ink text-white border-ink shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] scale-[1.02]"
              : "bg-white text-ink border-ink/30 hover:border-ink hover:shadow-[3px_3px_0px_0px_rgba(27,27,27,0.8)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
              Total Semua
            </span>
            <Users className="w-4 h-4 opacity-70" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.total}
            </span>
            <span className="text-[10px] font-bold block mt-1 opacity-70">
              Semua Pengguna
            </span>
          </div>
        </button>

        {/* Administrator */}
        <button
          type="button"
          onClick={() => {
            setVerifiedOnly(false);
            toggleRoleFilter("admin");
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${
            roleFilters.includes("admin") && roleFilters.length === 1 && !verifiedOnly
              ? "bg-rose-700 text-white border-rose-950 shadow-[4px_4px_0px_0px_rgba(136,19,55,1)] scale-[1.02]"
              : "bg-rose-50/70 text-rose-950 border-rose-200 hover:border-rose-500 hover:shadow-[3px_3px_0px_0px_rgba(244,63,94,0.3)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Administrator
            </span>
            <ShieldCheck className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.adminCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-rose-700">
              Akses Penuh Admin
            </span>
          </div>
        </button>

        {/* Kasir POS */}
        <button
          type="button"
          onClick={() => {
            setVerifiedOnly(false);
            toggleRoleFilter("cashier");
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${
            roleFilters.includes("cashier") && roleFilters.length === 1 && !verifiedOnly
              ? "bg-amber-600 text-white border-amber-950 shadow-[4px_4px_0px_0px_rgba(120,53,15,1)] scale-[1.02]"
              : "bg-amber-50/70 text-amber-950 border-amber-200 hover:border-amber-500 hover:shadow-[3px_3px_0px_0px_rgba(245,158,11,0.3)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Kasir POS
            </span>
            <MonitorSmartphone className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.cashierCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-amber-800">
              Operasional Kasir
            </span>
          </div>
        </button>

        {/* Customer / Mahasiswa */}
        <button
          type="button"
          onClick={() => {
            setVerifiedOnly(false);
            toggleRoleFilter("customer");
          }}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${
            roleFilters.includes("customer") && roleFilters.length === 1 && !verifiedOnly
              ? "bg-blue-600 text-white border-blue-900 shadow-[4px_4px_0px_0px_rgba(30,58,138,1)] scale-[1.02]"
              : "bg-blue-50/70 text-blue-950 border-blue-200 hover:border-blue-500 hover:shadow-[3px_3px_0px_0px_rgba(59,130,246,0.3)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Customer
            </span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.customerCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-blue-700">
              Mahasiswa / Pembeli
            </span>
          </div>
        </button>

        {/* Civitas Verified */}
        <button
          type="button"
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-between relative overflow-hidden ${
            verifiedOnly
              ? "bg-emerald-700 text-white border-emerald-950 shadow-[4px_4px_0px_0px_rgba(6,78,59,1)] scale-[1.02]"
              : "bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:border-emerald-500 hover:shadow-[3px_3px_0px_0px_rgba(16,185,129,0.3)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Verified Civitas
            </span>
            <BadgeCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
              {stats.verifiedCount}
            </span>
            <span className="text-[10px] font-bold block mt-1 text-emerald-700">
              Terverifikasi UB
            </span>
          </div>
        </button>
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
                  {!isCashier && (
                    <th className="p-3 text-right text-xs font-semibold tracking-wider text-ink uppercase">
                      Aksi
                    </th>
                  )}
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
                            {Number(user.is_filkom_verified) === 1 && (
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
                      {!isCashier && (
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
                      )}
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
