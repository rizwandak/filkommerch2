import { createServerFn, getGlobalStartContext } from "@tanstack/react-start";
import { getApiBaseUrl } from "@/lib/api-config";

// Helper to resolve API base URL across SSR, client, and fallback envs
export const getApiUrl = (): string => {
  return getApiBaseUrl();
};

const API_URL = getApiUrl();

const getCookieValue = (cookieHeader: string | undefined, name: string) => {
  if (!cookieHeader) return undefined;

  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
};

// Helper to get auth headers from browser cookies or SSR request cookies
const getAuthHeaders = async () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "Bypass-Tunnel-Reminder": "true",
    "User-Agent": "PostmanRuntime/7.32.3"
  };

  if (typeof window !== "undefined") {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return undefined;
    };
    let role = getCookie("user_role");
    let id = getCookie("user_id");
    let name = getCookie("user_name");

    // Fallback to localStorage if cookies are missing or expired
    if (!role || !id) {
      try {
        const storedUserJson = localStorage.getItem("user");
        if (storedUserJson) {
          const u = JSON.parse(storedUserJson);
          if (u) {
            role = role || (u.type === "admin" ? (u.role || "admin") : "buyer");
            id = id || String(u.id || "");
            name = name || (u.type === "admin" ? u.username : u.name) || "";

            // Re-sync missing cookies for consistency
            if (role) document.cookie = `user_role=${role}; path=/; max-age=604800; SameSite=Lax`;
            if (id) document.cookie = `user_id=${id}; path=/; max-age=604800; SameSite=Lax`;
            if (name) document.cookie = `user_name=${encodeURIComponent(name)}; path=/; max-age=604800; SameSite=Lax`;
          }
        }
      } catch (e) {
        console.warn("Could not parse user from localStorage:", e);
      }
    }

    if (role) headers["x-user-role"] = decodeURIComponent(role);
    if (id) headers["x-user-id"] = decodeURIComponent(id);
    if (name) headers["x-user-name"] = decodeURIComponent(name);
  } else {
    try {
      const cookieHeader = getGlobalStartContext()?.request?.headers.get("cookie") || undefined;
      const role = getCookieValue(cookieHeader, "user_role");
      const id = getCookieValue(cookieHeader, "user_id");
      const name = getCookieValue(cookieHeader, "user_name");

      if (role) headers["x-user-role"] = role;
      if (id) headers["x-user-id"] = id;
      if (name) headers["x-user-name"] = name;
    } catch (e) {
      console.warn("Could not read auth cookies from SSR request:", e);
    }
  }

  return headers;
};

// Wrapper around fetch to automatically include auth headers when executed on server
const serverFetch = async (url: string, init?: RequestInit) => {
  const authHeaders = await getAuthHeaders();
  let finalUrl = url;
  if (url.startsWith("http://127.0.0.1:8080") || url.startsWith("http://localhost:8080")) {
    const baseUrl = getApiUrl();
    const path = url.replace(/^http:\/\/(127\.0\.0\.1|localhost):8080/, "");
    finalUrl = baseUrl ? `${baseUrl}${path}` : path;
  }
  return fetch(finalUrl, {
    ...init,
    headers: {
      ...authHeaders,
      ...init?.headers,
    },
  });
};

const executeApiCall = async (
  endpoint: string,
  method: string = "POST",
  bodyData?: any
) => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullUrl = `${baseUrl}${cleanEndpoint}`;

  try {
    const res = await serverFetch(fullUrl, {
      method,
      headers: bodyData ? { "Content-Type": "application/json" } : undefined,
      body: bodyData ? JSON.stringify(bodyData) : undefined,
    });

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      if (contentType.includes("application/json")) {
        const jsonError = await res.json();
        throw new Error(jsonError.error || jsonError.message || `HTTP Error ${res.status}`);
      } else {
        const rawText = await res.text();
        console.error(`Backend ${fullUrl} returned non-JSON HTTP ${res.status}:`, rawText);
        throw new Error(`Server Backend (cPanel Node.js) tidak merespons (HTTP ${res.status}). Silakan klik 'Restart Application' di cPanel.`);
      }
    }

    if (contentType.includes("application/json")) {
      return await res.json();
    } else {
      const textData = await res.text();
      try {
        return JSON.parse(textData);
      } catch {
        throw new Error(`Respon server tidak valid. Status HTTP: ${res.status}`);
      }
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("<!doctype") || message.includes("This page didn't load") || message.includes("<html")) {
      throw new Error("Server Backend (cPanel Node.js) belum aktif/merespons. Silakan klik 'Restart Application' di cPanel.");
    }
    throw err;
  }
};

// ============ INTERFACES ============

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  filkom_price: number | null;
  promo_price: number | null;
  sale_type: string | null;
  product_type: string | null;
  low_stock_threshold: number;
  is_best_seller: boolean;
  is_featured: boolean;
  is_limited: boolean;
  preorder_start_at: string | null;
  preorder_end_at: string | null;
  preorder_moq: number | null;
  production_eta_days: number | null;
  image_url: string | null;
  is_active: boolean;
  bahan: string | null;
  asal: string | null;
  aplikasi: string | null;
  size_chart_url: string | null;
  images?: string[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string | null;
  size: string;
  stock: number;
  stock_reserved: number;
  reorder_level: number;
  barcode: string | null;
  is_active: boolean;
  color: string | null;
  color_hex: string | null;
  price_override: number | null;
  filkom_price: number | null;
}

export interface ProductWithVariants extends Product {
  category_name?: string | null;
  category_slug?: string | null;
  variants: ProductVariant[];
  bundle_components?: ProductWithVariants[];
}

export interface DbUser {
  id: number;
  name: string;
  nim: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  role: "admin" | "cashier" | "customer";
  is_filkom_verified?: number;
  created_at?: string;
}

export interface DatabaseStatus {
  ok: boolean;
  message: string;
  database?: string;
  result?: number;
  host?: string;
  user?: string;
  port?: number;
  error?: string;
}

export interface Order {
  id: number;
  order_id: string;
  channel: "online" | "pos";
  fulfillment_type: "shipping" | "pickup" | "walk_in";
  fulfillment_status:
    | "unfulfilled"
    | "processing"
    | "ready_for_pickup"
    | "shipped"
    | "completed"
    | "cancelled";
  user_id: number | null;
  cashier_id: number | null;
  customer_name: string;
  customer_nim: string | null;
  customer_email: string;
  customer_phone: string;
  shipping_address: string | null;
  subtotal: number;
  discount_amount: number;
  service_fee: number;
  shipping_cost: number;
  tax_amount: number;
  gross_amount: number;
  payment_status:
    | "unpaid"
    | "pending"
    | "paid"
    | "expired"
    | "failed"
    | "refunded"
    | "partial_refund";
  order_status:
    | "pending_payment"
    | "paid"
    | "processing"
    | "ready_for_pickup"
    | "shipped"
    | "completed"
    | "cancelled"
    | "refunded";
  pickup_code: string | null;
  pickup_location: string | null;
  tracking_number: string | null;
  courier_name: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  payment_type: string | null;
  transaction_status: string;
  midtrans_transaction_id: string | null;
  snap_token: string | null;
  payment_proof_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  price?: number; // fallback untuk kompatibilitas frontend
  discount_amount: number;
  subtotal: number;
  sku_snapshot: string | null;
  created_at?: string;
}

export interface TransactionDetails {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerNim?: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: string;
  fulfillmentType?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    variant_id?: number;
    bundle_selections?: Array<{
      product_id: number;
      variant_id: number;
      quantity: number;
    }>;
  }>;
  userId?: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface CreateSaleInput {
  admin_id: number;
  cashier_name?: string;
  payment_method: string;
  items: Array<{
    product_id: number;
    product_name: string;
    variant_id?: number;
    size?: string;
    quantity: number;
    unit_price: number;
    discount: number;
    bundle_selections?: Array<{
      product_id: number;
      variant_id: number;
      quantity: number;
    }>;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  customer_name?: string;
  order_id?: string;
}

export interface OfflineSale {
  id: number;
  sale_id: string;
  admin_id: number | null;
  cashier_name: string | null;
  customer_name: string | null;
  payment_method: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  source: "offline";
  status: string;
  created_at: string;
}

export interface OfflineSaleItem {
  id: number;
  sale_id: string;
  product_id: number;
  product_name: string;
  variant_id: number | null;
  size: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  address: string | null;
  phone: string | null;
  tax_rate: number;
  qris_static_url: string | null;
  homepage_layout?: string | null;
  payment_mode?: "mayar" | "midtrans" | "manual_qris" | null;
}

export interface CreateProductInput {
  category_id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  original_price?: number | null;
  filkom_price?: number | null;
  promo_price?: number | null;
  sale_type?: string | null;
  product_type?: string | null;
  low_stock_threshold?: number;
  is_best_seller?: boolean;
  is_limited?: boolean;
  preorder_start_at?: string | null;
  preorder_end_at?: string | null;
  preorder_moq?: number | null;
  production_eta_days?: number | null;
  image_url?: string;
  is_active?: boolean;
  bahan?: string | null;
  asal?: string | null;
  aplikasi?: string | null;
  size_chart_url?: string | null;
  images?: string[];
  variants: Array<{
    size: string;
    color?: string | null;
    stock: number;
    filkom_price?: number | null;
  }>;
  component_ids?: number[];
}

export interface UpdateProductInput extends CreateProductInput {
  id: number;
}

export interface DailySummary {
  total_transactions: number;
  total_revenue: number;
  total_discount: number;
  avg_transaction: number;
}

export interface TopProduct {
  id: number;
  name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

export interface InventoryItem {
  id: number;
  product_id: number;
  product_name: string;
  product_price: number;
  stock: number;
  min_stock: number;
  status: "ok" | "low" | "out";
}

// ============ CLIENT API BRIDGE ACTIONS ============

// Get all products
export const getProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ products: ProductWithVariants[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/products`);
      if (!res.ok) throw new Error("Gagal mengambil produk");
      return res.json();
    } catch (error) {
      console.error("Error fetching products:", error);
      return { products: [], error: "Failed to fetch products" };
    }
  },
);

// Check Database Connection
export const checkDatabaseConnection = createServerFn({ method: "GET" }).handler(
  async (): Promise<DatabaseStatus> => {
    try {
      const res = await serverFetch(`${API_URL}/api/db-check`);
      if (!res.ok) throw new Error("Gagal memeriksa koneksi database");
      return res.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to database";
      console.error("Database connection check failed:", error);
      return {
        ok: false,
        message,
        error: error instanceof Error ? error.stack || error.message : String(error),
      };
    }
  },
);

// Create order and payment (Online Checkout)
const createOrderAndPaymentServerFn = createServerFn({ method: "POST" })
  .validator((d: TransactionDetails) => d)
  .handler(async ({ data: details }) => {
    try {
      return await executeApiCall("/api/orders", "POST", details);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error creating order:", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  });

export const createOrderAndPayment = async (opts: { data: TransactionDetails }) => {
  if (typeof window !== "undefined") {
    try {
      return await executeApiCall("/api/orders", "POST", opts.data);
    } catch (e: any) {
      console.warn("Direct client API call failed for createOrderAndPayment, falling back:", e);
    }
  }
  return createOrderAndPaymentServerFn(opts as any);
};

// Regenerate payment token
const regeneratePaymentTokenServerFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string }) => d)
  .handler(async ({ data: input }) => {
    try {
      return await executeApiCall("/api/payment/regenerate-token", "POST", input);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error regenerating payment token:", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  });

export const regeneratePaymentToken = async (opts: { data: { orderId: string } }) => {
  if (typeof window !== "undefined") {
    try {
      return await executeApiCall("/api/payment/regenerate-token", "POST", opts.data);
    } catch (e: any) {
      console.warn("Direct client API call for regeneratePaymentToken failed, falling back:", e);
    }
  }
  return regeneratePaymentTokenServerFn(opts as any);
};

// Get order by ID
const getOrderByIdServerFn = createServerFn({ method: "GET" })
  .validator((orderId: string) => orderId)
  .handler(
    async ({
      data: orderId,
    }): Promise<{ success: boolean; order?: Order; items?: OrderItem[]; error?: string }> => {
      try {
        return await executeApiCall(`/api/orders/${orderId}`, "GET");
      } catch (error) {
        console.error("Error fetching order:", error);
        return { success: false, error: "Failed to fetch order" };
      }
    },
  );

export const getOrderById = async (opts: { data: string }): Promise<{ success: boolean; order?: Order; items?: OrderItem[]; error?: string }> => {
  if (typeof window !== "undefined") {
    try {
      return await executeApiCall(`/api/orders/${opts.data}`, "GET");
    } catch (e: any) {
      console.warn("Direct client API call for getOrderById failed, falling back:", e);
    }
  }
  return getOrderByIdServerFn(opts as any);
};

// Get payment methods
export const getPaymentMethods = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; methods: PaymentMethod[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/payment-methods`);
      if (!res.ok) throw new Error("Failed to fetch payment methods");
      return res.json();
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return { success: false, methods: [], error: "Failed to fetch payment methods" };
    }
  },
);

// Get categories
export const getCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ categories: Category[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    } catch (error) {
      console.error("Error fetching categories:", error);
      return { categories: [], error: "Failed to fetch categories" };
    }
  },
);

// Create category
export const createCategory = createServerFn({ method: "POST" })
  .validator((d: { name: string }) => d)
  .handler(
    async ({
      data: input,
    }): Promise<{
      success: boolean;
      category?: Category;
      error?: string;
    }> => {
      try {
        const res = await serverFetch(`${API_URL}/api/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `HTTP ${res.status}`);
        }
        return res.json();
      } catch (error) {
        console.error("Error creating category:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create category",
        };
      }
    },
  );

// Update category
export const updateCategory = createServerFn({ method: "POST" })
  .validator((d: { id: number; name: string }) => d)
  .handler(
    async ({
      data: input,
    }): Promise<{
      success: boolean;
      category?: Category;
      error?: string;
    }> => {
      try {
        const res = await serverFetch(`${API_URL}/api/categories/${input.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: input.name }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `HTTP ${res.status}`);
        }
        return res.json();
      } catch (error) {
        console.error("Error updating category:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update category",
        };
      }
    },
  );

// Delete category
export const deleteCategory = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(
    async ({
      data: id,
    }): Promise<{
      success: boolean;
      error?: string;
    }> => {
      try {
        const res = await serverFetch(`${API_URL}/api/categories/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `HTTP ${res.status}`);
        }
        return res.json();
      } catch (error) {
        console.error("Error deleting category:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete category",
        };
      }
    },
  );

// Get all products (Admin View)
export const getAllProductsAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ products: ProductWithVariants[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/products`);
      if (!res.ok) throw new Error("Failed to fetch admin products");
      return res.json();
    } catch (error) {
      console.error("Error fetching admin products:", error);
      return { products: [], error: "Failed to fetch products" };
    }
  },
);

// Create product
export const createProduct = createServerFn({ method: "POST" })
  .validator((d: CreateProductInput) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error("Error creating product:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create product",
      };
    }
  });

// Update product
export const updateProduct = createServerFn({ method: "POST" })
  .validator((d: UpdateProductInput) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/products`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error("Error updating product:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update product",
      };
    }
  });

// Delete product
export const deleteProduct = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error("Error deleting product:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete product",
      };
    }
  });

// Create sale (POS Offline)
export const createSale = createServerFn({ method: "POST" })
  .validator((d: CreateSaleInput) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error("Error creating sale:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create sale",
      };
    }
  });

// Get offline sales
export const getOfflineSales = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ sales: OfflineSale[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/sales`);
      if (!res.ok) throw new Error("Failed to fetch offline sales");
      return res.json();
    } catch (error) {
      console.error("Error fetching offline sales:", error);
      return { sales: [], error: "Failed to fetch offline sales" };
    }
  },
);

// Get online orders
export const getOnlineOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ orders: Order[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch online orders");
      return res.json();
    } catch (error) {
      console.error("Error fetching online orders:", error);
      return { orders: [], error: "Failed to fetch orders" };
    }
  },
);

// Get store settings
export const getStoreSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ settings: StoreSettings | null; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/settings`);
      if (!res.ok) throw new Error("Failed to fetch store settings");
      return res.json();
    } catch (error) {
      console.error("Error fetching store settings:", error);
      return { settings: null, error: "Failed to fetch settings" };
    }
  },
);

// Update store settings
export const updateStoreSettings = createServerFn({ method: "POST" })
  .validator(
    (d: {
      store_name: string;
      address?: string;
      phone?: string;
      tax_rate?: number;
      qris_static_url?: string;
      homepage_layout?: string;
      payment_mode?: "mayar" | "midtrans" | "manual_qris";
      userRole?: string;
      userId?: string;
    }) => d,
  )
  .handler(async ({ data: input }) => {
    try {
      const { userRole, userId, ...payload } = input;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (userRole) headers["x-user-role"] = userRole;
      if (userId) headers["x-user-id"] = userId;

      const res = await serverFetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error("Error updating store settings:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update settings",
      };
    }
  });

// Get daily sales summary
export const getDailySalesSummary = createServerFn({ method: "GET" })
  .validator((date: string) => date)
  .handler(async ({ data: date }) => {
    try {
      const res = await serverFetch(
        `${API_URL}/api/analytics/daily?date=${encodeURIComponent(date)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch daily summary");
      return res.json();
    } catch (error) {
      console.error("Error fetching daily summary:", error);
      return { success: false, summary: null, error: "Failed to fetch summary" };
    }
  });

// Get top products
export const getTopProducts = createServerFn({ method: "GET" })
  .validator((d: { limit?: number; days?: number } | undefined) => d)
  .handler(async ({ data }) => {
    try {
      const limit = data?.limit ?? 10;
      const days = data?.days ?? 30;
      const res = await serverFetch(
        `${API_URL}/api/analytics/top-products?limit=${limit}&days=${days}`,
      );
      if (!res.ok) throw new Error("Failed to fetch top products");
      return res.json();
    } catch (error) {
      console.error("Error fetching top products:", error);
      return { success: false, products: [], error: "Failed to fetch products" };
    }
  });

// Get inventory status
export const getInventory = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res = await serverFetch(`${API_URL}/api/analytics/inventory`);
    if (!res.ok) throw new Error("Failed to fetch inventory");
    return res.json();
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return { success: false, inventory: [], error: "Failed to fetch inventory" };
  }
});

// ============ AUTHENTICATION ACTIONS ============

// Register buyer
export const authRegister = createServerFn({ method: "POST" })
  .validator((d: any) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error registering:", error);
      return { success: false, error: error.message || "Failed to register" };
    }
  });

// Login user
export const authLogin = createServerFn({ method: "POST" })
  .validator((d: any) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error logging in:", error);
      return { success: false, error: error.message || "Failed to login" };
    }
  });

// Login Google user
export const authGoogleLogin = createServerFn({ method: "POST" })
  .validator((d: { email: string; name: string }) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error logging in with Google:", error);
      return { success: false, error: error.message || "Failed Google login" };
    }
  });

// Verify FILKOM user using NIM/NIDN
export const verifyFilkomUserAction = createServerFn({ method: "POST" })
  .validator((d: { nimOrNidn: string }) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/auth/verify-filkom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error verifying FILKOM civitas:", error);
      return { success: false, error: error.message || "Gagal melakukan verifikasi" };
    }
  });

// ============ PRODUCT DETAILS ACTIONS ============

// Get product by slug
export const getProductBySlug = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(
    async ({
      data: slug,
    }): Promise<{ success: boolean; product?: ProductWithVariants; error?: string }> => {
      try {
        const res = await serverFetch(`${API_URL}/api/products/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error("Failed to fetch product detail");
        return res.json();
      } catch (error: any) {
        console.error("Error fetching product detail:", error);
        return { success: false, error: error.message || "Failed to fetch product" };
      }
    },
  );

// ============ ADMIN USER CRUD ACTIONS ============

// Get all users admin
export const getUsersAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; users: DbUser[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/users`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Failed to fetch users (HTTP ${res.status})`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error fetching users:", error);
      return { success: false, users: [], error: error.message || "Failed to fetch users" };
    }
  },
);

// Create user admin
export const createUserAdmin = createServerFn({ method: "POST" })
  .validator((d: any) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error creating user:", error);
      return { success: false, error: error.message || "Failed to create user" };
    }
  });

// Update user admin
export const updateUserAdmin = createServerFn({ method: "POST" })
  .validator((d: any) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error updating user:", error);
      return { success: false, error: error.message || "Failed to update user" };
    }
  });

// Delete user admin
export const deleteUserAdmin = createServerFn({ method: "POST" })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/users/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      return { success: false, error: error.message || "Failed to delete user" };
    }
  });

// ============ ADMIN ORDER & TRANSATION ACTIONS ============

// Update order status
export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator((d: { id: string; status: string; shipping_address?: string; notes?: string }) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/orders/${input.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status, shipping_address: input.shipping_address, notes: input.notes }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error updating order status:", error);
      return { success: false, error: error.message || "Failed to update order status" };
    }
  });

// Delete order
export const deleteOrder = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/orders/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error deleting order:", error);
      return { success: false, error: error.message || "Failed to delete order" };
    }
  });

// Get offline sale details by ID
export const getOfflineSaleById = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/sales/${id}`);
      if (!res.ok) throw new Error("Failed to fetch sale details");
      return res.json();
    } catch (error: any) {
      console.error("Error fetching offline sale details:", error);
      return { success: false, error: error.message || "Failed to fetch sale" };
    }
  });

// Delete offline sale
export const deleteOfflineSale = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/sales/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error deleting sale:", error);
      return { success: false, error: error.message || "Failed to delete sale" };
    }
  });
// Get user orders
export const getUserOrders = createServerFn({ method: "GET" })
  .validator((userId: number) => userId)
  .handler(
    async ({ data: userId }): Promise<{ success: boolean; orders: any[]; error?: string }> => {
      try {
        const res = await serverFetch(`${API_URL}/api/orders/user/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch user orders");
        return res.json();
      } catch (error) {
        console.error("Error fetching user orders:", error);
        return { success: false, orders: [], error: "Failed to fetch orders" };
      }
    },
  );

export interface ActivityLog {
  id: number;
  user_id: number | null;
  actor_name_snapshot: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata?: any;
  created_at: string;
}

// Get activity logs (Admin only)
export const getActivityLogs = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ logs: ActivityLog[]; error?: string }> => {
    try {
      const res = await serverFetch(`${API_URL}/api/admin/activity-logs`);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      return { logs: [], error: "Failed to fetch activity logs" };
    }
  },
);

// Submit payment proof
export const submitPaymentProof = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; paymentProofUrl: string }) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await serverFetch(`${API_URL}/api/orders/${input.orderId}/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentProofUrl: input.paymentProofUrl }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error: any) {
      console.error("Error submitting payment proof:", error);
      return { success: false, error: error.message || "Failed to submit payment proof" };
    }
  });

// Server Action for Uploading Multiple Images (Primary API -> Local Backend -> Data URL Fallback)
export const uploadImagesServerAction = createServerFn({ method: "POST" })
  .validator((data: { files: { dataUrl: string; name: string }[] }) => data)
  .handler(async ({ data }) => {
    const base64List = data.files.map((f) => f.dataUrl).filter(Boolean);

    // 1. Try primary configured API URL
    try {
      const baseUrl = getApiUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
      const res = await serverFetch(`${baseUrl}/api/upload-multiple-base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: data.files }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.urls) && json.urls.length > 0) {
          return json;
        }
      }
    } catch (e) {
      console.warn("Upload to primary API failed:", e);
    }

    // 2. Try live fallback backend (https://filkommerch.com)
    try {
      const res = await fetch("https://filkommerch.com/api/upload-multiple-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: data.files }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.urls) && json.urls.length > 0) {
          return json;
        }
      }
    } catch (e) {
      console.warn("Upload to live fallback backend failed:", e);
    }

    // 3. Guaranteed fallback: return the 1:1 cropped Data URLs if both endpoints fail
    return { success: true, urls: base64List, isFallback: true };
  });

// Server Action for Uploading a Single Image (Primary API -> Local Backend -> Data URL Fallback)
export const uploadSingleImageServerAction = createServerFn({ method: "POST" })
  .validator((data: { dataUrl: string; name: string }) => data)
  .handler(async ({ data }) => {
    // 1. Try primary configured API URL
    try {
      const baseUrl = getApiUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
      const res = await serverFetch(`${baseUrl}/api/upload-base64`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.url) {
          return json;
        }
      }
    } catch (e) {
      console.warn("Upload single to primary API failed:", e);
    }

    // 2. Try live fallback backend (https://filkommerch.com)
    try {
      const res = await fetch("https://filkommerch.com/api/upload-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.url) {
          return json;
        }
      }
    } catch (e) {
      console.warn("Upload single to live backend failed:", e);
    }

    // 3. Fallback to Data URL
    return { success: true, url: data.dataUrl, isFallback: true };
  });

// ============ PRE-ORDER CAMPAIGN SERVER ACTIONS ============

export interface PreOrderCampaign {
  id: number;
  batch_name: string;
  start_date: string;
  end_date: string;
  extended_end_date: string | null;
  is_active: number;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

// Fetch All Pre-Order Campaigns
export const getPreOrderCampaignsServerAction = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await serverFetch(`${baseUrl}/api/pre-order-campaigns`);
      if (!res.ok) return { success: false, data: [] };
      return await res.json();
    } catch (e) {
      console.warn("getPreOrderCampaignsServerAction error:", e);
      return { success: false, data: [] };
    }
  });

// Fetch Active Pre-Order Campaign
export const getActivePreOrderCampaignServerAction = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await serverFetch(`${baseUrl}/api/pre-order-campaigns/active`);
      if (!res.ok) return { success: false, data: null };
      return await res.json();
    } catch (e) {
      console.warn("getActivePreOrderCampaignServerAction error:", e);
      return { success: false, data: null };
    }
  });

// Create Pre-Order Campaign
export const createPreOrderCampaignServerAction = createServerFn({ method: "POST" })
  .validator((data: Omit<PreOrderCampaign, "id">) => data)
  .handler(async ({ data }) => {
    try {
      const baseUrl = getApiUrl();
      const res = await serverFetch(`${baseUrl}/api/pre-order-campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (e: any) {
      console.warn("createPreOrderCampaignServerAction error:", e);
      return { success: false, error: e.message || "Failed to create pre-order campaign" };
    }
  });

// Update Pre-Order Campaign
export const updatePreOrderCampaignServerAction = createServerFn({ method: "POST" })
  .validator((data: { id: number } & Partial<PreOrderCampaign>) => data)
  .handler(async ({ data }) => {
    try {
      const baseUrl = getApiUrl();
      const res = await serverFetch(`${baseUrl}/api/pre-order-campaigns/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (e: any) {
      console.warn("updatePreOrderCampaignServerAction error:", e);
      return { success: false, error: e.message || "Failed to update pre-order campaign" };
    }
  });

// Delete Pre-Order Campaign
export const deletePreOrderCampaignServerAction = createServerFn({ method: "POST" })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    try {
      const baseUrl = getApiUrl();
      const res = await serverFetch(`${baseUrl}/api/pre-order-campaigns/${data.id}`, {
        method: "DELETE",
      });
      return await res.json();
    } catch (e: any) {
      console.warn("deletePreOrderCampaignServerAction error:", e);
      return { success: false, error: e.message || "Failed to delete pre-order campaign" };
    }
  });

// Toggle Pre-Order Campaign Active Status
export const togglePreOrderCampaignActiveServerAction = createServerFn({ method: "POST" })
  .validator((data: { id: number; is_active: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const baseUrl = getApiUrl();
      const res = await serverFetch(`${baseUrl}/api/pre-order-campaigns/${data.id}/toggle-active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: data.is_active }),
      });
      return await res.json();
    } catch (e: any) {
      console.warn("togglePreOrderCampaignActiveServerAction error:", e);
      return { success: false, error: e.message || "Failed to toggle pre-order campaign active status" };
    }
  });

