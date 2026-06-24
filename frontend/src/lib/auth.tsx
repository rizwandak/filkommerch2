import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authLogin, authGoogleLogin, authRegister } from "@backend/server-actions";

export type AdminRole = "admin" | "cashier";

export interface AdminUser {
  type: "admin";
  role: AdminRole;
  username: string;
  email: string;
  id?: number;
}

export interface BuyerUser {
  type: "buyer";
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export type User = AdminUser | BuyerUser;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginAsAdmin: (username: string, password: string) => Promise<void>;
  loginAsGoogle: (userInfo: Omit<BuyerUser, "type">) => void | Promise<void>;
  logout: () => void;
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
      };
      setUser(fallbackUser);
      localStorage.setItem("user", JSON.stringify(fallbackUser));
      return;
    }

    setUser(result.user);
    localStorage.setItem("user", JSON.stringify(result.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
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
      value={{ user, loading, loginAsAdmin, loginAsGoogle, logout, upsertBuyer }}
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
