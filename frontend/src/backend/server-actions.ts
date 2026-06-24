import { createServerFn } from "@tanstack/react-start";

// Check environment variables at runtime
const API_URL = (typeof process !== "undefined" ? process.env.VITE_API_URL : undefined) || import.meta.env.VITE_API_URL || "http://localhost:8080";

// ============ INTERFACES ============

export interface Product {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size: string;
  stock: number;
}

export interface ProductWithVariants extends Product {
  category_name?: string | null;
  category_slug?: string | null;
  variants: ProductVariant[];
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
  user_id: number | null;
  customer_name: string;
  customer_nim: string | null;
  customer_email: string;
  customer_phone: string;
  shipping_address: string | null;
  gross_amount: number;
  payment_type: string | null;
  transaction_status: string;
  midtrans_transaction_id: string | null;
  snap_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_name: string;
  size: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface TransactionDetails {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerNim?: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
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
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  customer_name?: string;
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
}

export interface CreateProductInput {
  category_id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  image_url?: string;
  is_active?: boolean;
  variants: Array<{ size: string; stock: number }>;
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
      const res = await fetch(`${API_URL}/api/products`);
      if (!res.ok) throw new Error("Gagal mengambil produk");
      return res.json();
    } catch (error) {
      console.error("Error fetching products:", error);
      return { products: [], error: "Failed to fetch products" };
    }
  }
);

// Check Database Connection
export const checkDatabaseConnection = createServerFn({ method: "GET" }).handler(
  async (): Promise<DatabaseStatus> => {
    try {
      const res = await fetch(`${API_URL}/api/db-check`);
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
  }
);

// Create order and payment (Online Checkout)
export const createOrderAndPayment = createServerFn({ method: "POST" })
  .validator((d: TransactionDetails) => d)
  .handler(async ({ data: details }) => {
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(details),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error creating order:", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  });

// Get order by ID
export const getOrderById = createServerFn({ method: "GET" })
  .validator((orderId: string) => orderId)
  .handler(
    async ({
      data: orderId,
    }): Promise<{ success: boolean; order?: Order; items?: OrderItem[]; error?: string }> => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Failed to fetch order");
        return res.json();
      } catch (error) {
        console.error("Error fetching order:", error);
        return { success: false, error: "Failed to fetch order" };
      }
    }
  );

// Get payment methods
export const getPaymentMethods = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; methods: PaymentMethod[]; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/payment-methods`);
      if (!res.ok) throw new Error("Failed to fetch payment methods");
      return res.json();
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return { success: false, methods: [], error: "Failed to fetch payment methods" };
    }
  }
);

// Get categories
export const getCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ categories: Category[]; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    } catch (error) {
      console.error("Error fetching categories:", error);
      return { categories: [], error: "Failed to fetch categories" };
    }
  }
);

// Get all products (Admin View)
export const getAllProductsAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ products: ProductWithVariants[]; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/products`);
      if (!res.ok) throw new Error("Failed to fetch admin products");
      return res.json();
    } catch (error) {
      console.error("Error fetching admin products:", error);
      return { products: [], error: "Failed to fetch products" };
    }
  }
);

// Create product
export const createProduct = createServerFn({ method: "POST" })
  .validator((d: CreateProductInput) => d)
  .handler(async ({ data: input }) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/products`, {
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
      const res = await fetch(`${API_URL}/api/admin/products`, {
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
      const res = await fetch(`${API_URL}/api/admin/products/${id}`, {
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
      const res = await fetch(`${API_URL}/api/sales`, {
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
      const res = await fetch(`${API_URL}/api/sales`);
      if (!res.ok) throw new Error("Failed to fetch offline sales");
      return res.json();
    } catch (error) {
      console.error("Error fetching offline sales:", error);
      return { sales: [], error: "Failed to fetch offline sales" };
    }
  }
);

// Get online orders
export const getOnlineOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ orders: Order[]; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch online orders");
      return res.json();
    } catch (error) {
      console.error("Error fetching online orders:", error);
      return { orders: [], error: "Failed to fetch orders" };
    }
  }
);

// Get store settings
export const getStoreSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ settings: StoreSettings | null; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      if (!res.ok) throw new Error("Failed to fetch store settings");
      return res.json();
    } catch (error) {
      console.error("Error fetching store settings:", error);
      return { settings: null, error: "Failed to fetch settings" };
    }
  }
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
    }) => d
  )
  .handler(async ({ data: input }) => {
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
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
      const res = await fetch(`${API_URL}/api/analytics/daily?date=${encodeURIComponent(date)}`);
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
      const res = await fetch(`${API_URL}/api/analytics/top-products?limit=${limit}&days=${days}`);
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
    const res = await fetch(`${API_URL}/api/analytics/inventory`);
    if (!res.ok) throw new Error("Failed to fetch inventory");
    return res.json();
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return { success: false, inventory: [], error: "Failed to fetch inventory" };
  }
});
