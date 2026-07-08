import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authLogin, authGoogleLogin, authRegister } from "@backend/server-actions";

export type AdminRole = "admin" | "cashier";

export interface AdminUser {
  type: "admin";
  role: AdminRole;
  username: string;
  email: string;
  id?: number;
  is_google?: boolean;
  is_filkom_verified?: number;
  nim?: string;
}

export interface BuyerUser {
  type: "buyer";
  id: string;
  email: string;
  name: string;
  picture?: string;
  is_filkom_verified?: number;
  nim?: string;
  is_google?: boolean;
}

export type User = AdminUser | BuyerUser;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginAsAdmin: (username: string, password: string) => Promise<void>;
  loginAsGoogle: (userInfo: Omit<BuyerUser, "type">) => void | Promise<void>;
  logout: () => void;
  upsertBuyer: (buyer: BuyerUser) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to load user:", e);
      }
    }
    setLoading(false);
  }, []);

  // Sync cookies whenever user changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (user) {
      const role = user.type === "admin" ? user.role : "buyer";
      const name = user.type === "admin" ? user.username : user.name;
      const id = String(user.id || "");

      document.cookie = `user_role=${role}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `user_name=${encodeURIComponent(name)}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `user_id=${id}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      document.cookie = "user_role=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "user_name=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "user_id=; path=/; max-age=0; SameSite=Lax";
    }
  }, [user]);

  const loginAsAdmin = async (username: string, password: string) => {
    const result = await authLogin({ data: { username, password } });
    if (!result || !result.success || !result.user) {
      throw new Error(result?.error || "Gagal login. Periksa username dan password Anda.");
    }

    setUser(result.user);
    localStorage.setItem("user", JSON.stringify(result.user));
  };

  const loginAsGoogle = async (userInfo: Omit<BuyerUser, "type">) => {
    const result = await authGoogleLogin({ data: { email: userInfo.email, name: userInfo.name } });
    if (!result || !result.success || !result.user) {
      // Fallback
      const fallbackUser: BuyerUser = {
        type: "buyer",
        ...userInfo,
        is_google: true,
      };
      setUser(fallbackUser);
      localStorage.setItem("user", JSON.stringify(fallbackUser));
      return;
    }

    const updatedUser = {
      ...result.user,
      is_google: true,
    };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  /**
   * Insert a buyer into the local `registeredBuyers` store only if it does not exist.
   */
  const upsertBuyer = (buyer: BuyerUser) => {
    try {
      const saved = localStorage.getItem("registeredBuyers");
      const buyers: BuyerUser[] = saved ? JSON.parse(saved) : [];
      const exists = buyers.some((b) => b.id === buyer.id);
      if (!exists) {
        const updated = [...buyers, buyer];
        localStorage.setItem("registeredBuyers", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to upsert buyer", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginAsAdmin, loginAsGoogle, logout, upsertBuyer, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
