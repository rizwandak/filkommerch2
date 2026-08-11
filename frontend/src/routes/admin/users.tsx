import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, Fragment } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  User,
  Users,
  ShieldCheck,
  MonitorSmartphone,
  GraduationCap,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api-config";
import { resolveImageUrl } from "@/lib/image-resolver";
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

const getPaymentBadge = (order: any) => {
  const pStatus = order.payment_status;
  const oStatus = order.order_status;
  if (oStatus === "cancelled" || oStatus === "cancel") {
    return { text: "Dibatalkan", color: "bg-red-100 text-red-800 border-red-200" };
  }
  if (
    pStatus === "paid" ||
    pStatus === "settlement" ||
    oStatus === "completed" ||
    oStatus === "capture"
  ) {
    return { text: "Lunas", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  }
  if (pStatus === "pending" || pStatus === "unpaid") {
    return { text: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200" };
  }
  return { text: pStatus || oStatus || "-", color: "bg-slate-100 text-slate-800 border-slate-200" };
};

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

  // Expandable Rows State & Orders Map
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [userOrdersMap, setUserOrdersMap] = useState<Record<number, any[]>>({});
  const [loadingOrdersMap, setLoadingOrdersMap] = useState<Record<number, boolean>>({});

  // Sorting State
  const [sortField, setSortField] = useState<"total_spent" | "total_orders" | "name" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

  const toggleUserExpand = async (userId: number) => {
    const isCurrentlyExpanded = !!expandedRows[userId];
    setExpandedRows((prev) => ({ ...prev, [userId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !userOrdersMap[userId] && !loadingOrdersMap[userId]) {
      setLoadingOrdersMap((prev) => ({ ...prev, [userId]: true }));
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/orders`, {
          headers: getAdminRequestHeaders(),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setUserOrdersMap((prev) => ({ ...prev, [userId]: data.orders || [] }));
        } else {
          toast.error(data?.error || "Gagal memuat riwayat transaksi");
        }
      } catch {
        toast.error("Gagal terhubung ke server untuk memuat transaksi");
      } finally {
        setLoadingOrdersMap((prev) => ({ ...prev, [userId]: false }));
      }
    }
  };

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

  const handleSort = (field: "total_spent" | "total_orders" | "name") => {
    if (sortField === field) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else {
        setSortField(null);
        setSortDirection("desc");
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
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

  const sortedAndFilteredUsers = useMemo(() => {
    const list = [...filteredUsers];
    if (!sortField) return list;

    return list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortField === "total_spent") {
        valA = Number(a.total_spent || 0);
        valB = Number(b.total_spent || 0);
      } else if (sortField === "total_orders") {
        valA = Number(a.total_orders || 0);
        valB = Number(b.total_orders || 0);
      } else if (sortField === "name") {
        valA = (a.name || "").toLowerCase();
        valB = (b.name || "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortDirection]);

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
              <thead className="bg-cream border-b border-border">
                <tr>
                  <th className="p-3 text-center text-xs font-bold tracking-wider text-ink uppercase w-12">
                    No
                  </th>
                  <th
                    className="p-3 text-left text-xs font-bold tracking-wider text-ink uppercase cursor-pointer hover:bg-black/5 select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nama</span>
                      {sortField === "name" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-brand-orange" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-brand-orange" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider text-ink uppercase">
                    Email
                  </th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider text-ink uppercase">
                    Telepon
                  </th>
                  <th className="p-3 text-center text-xs font-bold tracking-wider text-ink uppercase">
                    Peran
                  </th>
                  <th
                    className="p-3 text-center text-xs font-bold tracking-wider text-ink uppercase cursor-pointer hover:bg-black/5 select-none"
                    onClick={() => handleSort("total_orders")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Jumlah Transaksi</span>
                      {sortField === "total_orders" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-brand-orange" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-brand-orange" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    className="p-3 text-right text-xs font-bold tracking-wider text-ink uppercase cursor-pointer hover:bg-black/5 select-none"
                    onClick={() => handleSort("total_spent")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Pembelian</span>
                      {sortField === "total_spent" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-brand-orange" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-brand-orange" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Pengguna tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredUsers.map((userItem, idx) => {
                    const isExpanded = !!expandedRows[userItem.id];
                    const userOrders = userOrdersMap[userItem.id] || [];
                    const isLoadingUserOrders = !!loadingOrdersMap[userItem.id];

                    return (
                      <Fragment key={userItem.id}>
                        <tr className="border-t border-border hover:bg-cream/30 transition-colors">
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-muted font-bold"
                              onClick={() => void toggleUserExpand(userItem.id)}
                              title={isExpanded ? "Tutup rincian" : "Lihat transaksi"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-brand-orange" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-ink" />
                              )}
                            </Button>
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-ink uppercase text-xs tracking-wide">
                                  {userItem.name}
                                </p>
                                {Number(userItem.is_filkom_verified) === 1 && (
                                  <span className="bg-emerald-100 text-emerald-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase border border-emerald-300">
                                    VERIFIED
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {userItem.nim || "Non-Mahasiswa"}
                              </p>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">{userItem.email}</td>
                          <td className="p-3 text-muted-foreground text-xs">{userItem.phone || "-"}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                userItem.role === "admin"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : userItem.role === "cashier"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {userItem.role}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => void toggleUserExpand(userItem.id)}
                              className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3 text-slate-500" />
                              {Number(userItem.total_orders || 0)} Transaksi
                            </button>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-mono font-black text-xs text-ink">
                              Rp {Number(userItem.total_spent || 0).toLocaleString("id-ID")}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Row Content Dropdown */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-4 bg-amber-50/40 border-t border-b border-border">
                              <div className="space-y-4">
                                {/* Sub-Table for User Transactions */}
                                <div className="bg-white border-2 border-ink/20 rounded-xl overflow-hidden shadow-xs">
                                  <div className="p-3 bg-cream/70 border-b border-ink/10 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase text-ink tracking-wider flex items-center gap-2">
                                      <ShoppingBag className="w-4 h-4 text-brand-orange" />
                                      Daftar Transaksi Pengguna
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono font-bold">
                                      {userOrders.length} Transaksi Ditemukan
                                    </span>
                                  </div>

                                  {isLoadingUserOrders ? (
                                    <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                                      Memuat riwayat transaksi...
                                    </div>
                                  ) : userOrders.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-muted-foreground">
                                      Pengguna ini belum pernah melakukan transaksi.
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                          <tr>
                                            <th className="p-2.5 text-center w-10">No</th>
                                            <th className="p-2.5 text-left">ID Transaksi</th>
                                            <th className="p-2.5 text-left">Produk yang Dibeli</th>
                                            <th className="p-2.5 text-right">Nominal Pembelian</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {userOrders.map((order, orderIdx) => {
                                            const pBadge = getPaymentBadge(order);
                                            return (
                                              <tr
                                                key={order.order_id || order.id}
                                                className="hover:bg-slate-50/80 transition-colors"
                                              >
                                                <td className="p-2.5 text-center font-mono text-muted-foreground font-bold">
                                                  {orderIdx + 1}
                                                </td>
                                                <td className="p-2.5">
                                                  <div className="space-y-1">
                                                    <div className="font-mono font-bold text-ink flex items-center gap-2">
                                                      <span>{order.order_id}</span>
                                                      <span
                                                        className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${pBadge.color}`}
                                                      >
                                                        {pBadge.text}
                                                      </span>
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">
                                                      {new Date(order.created_at).toLocaleString("id-ID")} •{" "}
                                                      <span className="uppercase">{order.channel || "online"}</span>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="p-2.5">
                                                  {order.items && order.items.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                      {order.items.map((item: any, itemIdx: number) => (
                                                        <div key={itemIdx} className="flex items-center gap-2 text-[11px]">
                                                          <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden bg-slate-100 flex-shrink-0">
                                                            {item.image_url || item.catalog_product_name ? (
                                                              <img
                                                                src={resolveImageUrl(item.image_url)}
                                                                alt={item.product_name}
                                                                className="w-full h-full object-cover"
                                                              />
                                                            ) : (
                                                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                <ShoppingBag className="w-4 h-4" />
                                                              </div>
                                                            )}
                                                          </div>
                                                          <div>
                                                            <p className="font-bold text-ink line-clamp-1">
                                                              {item.product_name}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                              {item.variant_name ? `${item.variant_name} • ` : ""}
                                                              {item.quantity}x @ Rp{" "}
                                                              {Number(item.price || item.unit_price || 0).toLocaleString(
                                                                "id-ID",
                                                              )}
                                                            </p>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <span className="text-muted-foreground italic text-[10px]">
                                                      Detail produk tidak tersedia
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="p-2.5 text-right align-top">
                                                  <div className="space-y-1">
                                                    <span className="font-mono font-black text-ink text-xs block">
                                                      Rp{" "}
                                                      {Number(
                                                        order.grand_total || order.gross_amount || 0,
                                                      ).toLocaleString("id-ID")}
                                                    </span>
                                                    <Link
                                                      to="/admin/transactions"
                                                      search={{ search: order.order_id }}
                                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-blue hover:underline"
                                                    >
                                                      Lihat di Transaksi <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>

                                {/* Actions Edit & Hapus (Below Table) */}
                                {!isCashier && (
                                  <div className="grid grid-cols-2 gap-3 mt-4">
                                    <Button
                                      variant="outline"
                                      onClick={() => openEdit(userItem)}
                                      className="w-full text-xs font-bold border-ink/30 hover:bg-slate-50 bg-white text-ink h-10"
                                    >
                                      <Pencil className="h-4 w-4 mr-2 text-slate-600" />
                                      Edit Pengguna
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      disabled={userItem.id === 1}
                                      onClick={() => openDeleteConfirm(userItem)}
                                      className="w-full text-xs font-bold h-10"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Hapus
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
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
