import { Request, Response } from "express";
import { query, queryOne, execute, getConnection } from "../config/database";
import { config } from "../config/config";
import { snap } from "../config/midtrans";

// Get all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await query<any>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = TRUE
       ORDER BY p.id DESC`
    );

    const productsWithVariants = await Promise.all(
      products.map(async (product: any) => {
        const variants = await query<any>(
          "SELECT * FROM product_variants WHERE product_id = ?",
          [product.id]
        );
        return { ...product, variants };
      })
    );

    return res.json({ products: productsWithVariants });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ products: [], error: "Failed to fetch products" });
  }
};

// Check Database Connection
export const checkDatabaseConnection = async (req: Request, res: Response) => {
  try {
    const result = await queryOne<any>(
      "SELECT 1 AS ok, DATABASE() AS db_name"
    );

    if (!result) {
      return res.json({
        ok: false,
        message: "Database connected, but no result was returned",
      });
    }

    return res.json({
      ok: true,
      message: "MySQL connection OK",
      database: result.db_name,
      result: result.ok,
      host: config.db.host,
      user: config.db.user,
      port: config.db.port,
    });
  } catch (error: any) {
    console.error("Database connection check failed:", error);
    return res.json({
      ok: false,
      message: error.message || "Failed to connect to database",
      host: config.db.host,
      user: config.db.user,
      port: config.db.port,
      error: error.stack || String(error),
    });
  }
};

// Create Order and Payment (Online Checkout)
export const createOrderAndPayment = async (req: Request, res: Response) => {
  try {
    const details = req.body;
    
    // 1. Insert order to database
    console.log("📝 Inserting order into database:", details.orderId);
    await execute(
      `INSERT INTO orders (
        order_id, user_id, customer_name, customer_nim, customer_email,
        customer_phone, shipping_address, gross_amount, transaction_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        details.orderId,
        details.userId || null,
        details.customerName,
        details.customerNim || null,
        details.customerEmail,
        details.customerPhone,
        details.shippingAddress || null,
        details.grossAmount,
        "pending",
      ]
    );

    // 2. Insert order items
    console.log("📦 Inserting order items...");
    for (const item of details.items) {
      let resolvedProductId: number | null = null;
      const rawId = item.product_id || item.id;

      if (rawId) {
        if (Number.isInteger(Number(rawId))) {
          resolvedProductId = Number(rawId);
        } else {
          try {
            const product = await queryOne<any>(
              "SELECT id FROM products WHERE slug = ? LIMIT 1",
              [String(rawId)]
            );
            if (product) {
              resolvedProductId = product.id;
            }
          } catch (e) {
            console.error(`Failed to resolve product ID for slug ${rawId}:`, e);
          }
        }
      }

      await execute(
        `INSERT INTO order_items (
          order_id, product_id, product_name, size, quantity, price, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          details.orderId,
          resolvedProductId,
          item.name || item.product_name,
          item.size || "One Size",
          item.quantity,
          item.price,
          item.price * item.quantity,
        ]
      );
    }

    // 3. Generate QRIS payment via Midtrans Snap Client
    console.log("🔐 Generating QRIS snap transaction...");
    const parameter = {
      transaction_details: {
        order_id: details.orderId,
        gross_amount: Number(details.grossAmount)
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: details.customerName,
        email: details.customerEmail,
        phone: details.customerPhone
      },
      item_details: details.items.map((item: any) => ({
        id: String(item.product_id || item.id || "item-id"),
        price: Number(item.price),
        quantity: Number(item.quantity),
        name: item.name || item.product_name
      }))
    };

    const transaction = await snap.createTransaction(parameter);
    console.log("✅ QRIS token generated");

    // 4. Update order dengan snap token
    await execute(
      "UPDATE orders SET snap_token = ?, payment_type = ? WHERE order_id = ?",
      [transaction.token, "qris", details.orderId]
    );

    return res.json({
      success: true,
      orderId: details.orderId,
      token: transaction.token,
      qrUrl: `https://app.sandbox.midtrans.com/qris/${transaction.token}.png`
    });
  } catch (error: any) {
    console.error("❌ Error creating order:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create order and payment",
    });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await queryOne<any>("SELECT * FROM orders WHERE order_id = ?", [id]);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const items = await query<any>("SELECT * FROM order_items WHERE order_id = ?", [id]);
    return res.json({ success: true, order, items });
  } catch (error: any) {
    console.error("Error fetching order:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch order" });
  }
};

// Get payment methods
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      methods: [
        { id: 1, name: "Cash / Tunai", code: "cash" },
        { id: 2, name: "Debit Card", code: "debit" },
        { id: 3, name: "Credit Card", code: "credit" },
        { id: 4, name: "Bank Transfer", code: "transfer" },
        { id: 5, name: "E-Wallet", code: "e_wallet" },
        { id: 6, name: "QRIS", code: "qris" },
      ],
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, methods: [], error: "Failed to fetch payment methods" });
  }
};

// Get categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await query<any>(
      "SELECT id, name, slug, is_active FROM categories WHERE is_active = TRUE ORDER BY name"
    );
    return res.json({ categories });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ categories: [], error: "Failed to fetch categories" });
  }
};

// Get all products for admin
export const getAllProductsAdmin = async (req: Request, res: Response) => {
  try {
    const products = await query<any>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.id DESC`
    );

    const productsWithVariants = await Promise.all(
      products.map(async (product: any) => {
        const variants = await query<any>(
          "SELECT * FROM product_variants WHERE product_id = ?",
          [product.id]
        );
        return { ...product, variants };
      })
    );

    return res.json({ products: productsWithVariants });
  } catch (error: any) {
    console.error("Error fetching admin products:", error);
    return res.status(500).json({ products: [], error: "Failed to fetch products" });
  }
};

// Create product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const result = await execute(
      `INSERT INTO products (category_id, name, slug, description, price, image_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.category_id,
        input.name,
        input.slug,
        input.description || null,
        input.price,
        input.image_url || null,
        input.is_active ?? true,
      ]
    );

    for (const variant of input.variants) {
      await execute(
        "INSERT INTO product_variants (product_id, size, stock) VALUES (?, ?, ?)",
        [result.insertId, variant.size, variant.stock]
      );
    }

    return res.json({ success: true, product_id: result.insertId });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create product",
    });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const input = req.body;
    await execute(
      `UPDATE products SET category_id = ?, name = ?, slug = ?, description = ?,
       price = ?, image_url = ?, is_active = ? WHERE id = ?`,
      [
        input.category_id,
        input.name,
        input.slug,
        input.description || null,
        input.price,
        input.image_url || null,
        input.is_active ?? true,
        input.id,
      ]
    );

    await execute("DELETE FROM product_variants WHERE product_id = ?", [input.id]);
    for (const variant of input.variants) {
      await execute(
        "INSERT INTO product_variants (product_id, size, stock) VALUES (?, ?, ?)",
        [input.id, variant.size, variant.stock]
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update product",
    });
  }
};

// Delete/deactivate product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute("UPDATE products SET is_active = FALSE WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete product",
    });
  }
};

// Create Sale (POS sale transaction)
export const createSale = async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const saleId = `POS-${Date.now()}`;
    
    const PAYMENT_LABELS: Record<string, string> = {
      cash: "Tunai",
      qris: "QRIS Statis",
      debit: "Debit",
    };
    const paymentLabel = PAYMENT_LABELS[input.payment_method] || input.payment_method;

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        `INSERT INTO offline_sales (
          sale_id, admin_id, cashier_name, customer_name, payment_method,
          subtotal, discount, tax, total, notes, source, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline', 'completed')`,
        [
          saleId,
          input.admin_id || null,
          input.cashier_name || null,
          input.customer_name || null,
          paymentLabel,
          input.subtotal,
          input.discount,
          input.tax,
          input.total,
          input.notes || null,
        ]
      );

      for (const item of input.items) {
        const subtotal = item.unit_price * item.quantity - item.discount;
        await connection.execute(
          `INSERT INTO offline_sale_items (
            sale_id, product_id, product_name, variant_id, size,
            quantity, unit_price, discount, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            item.product_id,
            item.product_name,
            item.variant_id || null,
            item.size || null,
            item.quantity,
            item.unit_price,
            item.discount,
            subtotal,
          ]
        );

        if (item.variant_id) {
          const [stockRows] = await connection.execute(
            "SELECT stock FROM product_variants WHERE id = ? FOR UPDATE",
            [item.variant_id]
          );
          const stockRow = (stockRows as any[])[0];
          if (!stockRow || stockRow.stock < item.quantity) {
            throw new Error(`Stok tidak cukup untuk ${item.product_name}`);
          }
          await connection.execute(
            "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
            [item.quantity, item.variant_id]
          );
        } else {
          const [variants] = await connection.execute(
            "SELECT id, stock FROM product_variants WHERE product_id = ? ORDER BY id LIMIT 1 FOR UPDATE",
            [item.product_id]
          );
          const variant = (variants as any[])[0];
          if (!variant || variant.stock < item.quantity) {
            throw new Error(`Stok tidak cukup untuk ${item.product_name}`);
          }
          await connection.execute(
            "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
            [item.quantity, variant.id]
          );
        }
      }

      await connection.commit();

      const inserted = await queryOne<{ id: number }>(
        "SELECT id FROM offline_sales WHERE sale_id = ?",
        [saleId]
      );

      return res.json({
        success: true,
        sale_id: saleId,
        db_id: inserted?.id ?? 0,
        message: "Sale created successfully",
      });
    } catch (err: any) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create sale",
    });
  }
};

// Get offline sales
export const getOfflineSales = async (req: Request, res: Response) => {
  try {
    const sales = await query<any>(
      "SELECT * FROM offline_sales WHERE source = 'offline' ORDER BY created_at DESC LIMIT 100"
    );
    return res.json({ sales });
  } catch (error: any) {
    console.error("Error fetching offline sales:", error);
    return res.status(500).json({ sales: [], error: "Failed to fetch offline sales" });
  }
};

// Get online orders
export const getOnlineOrders = async (req: Request, res: Response) => {
  try {
    const orders = await query<any>(
      "SELECT * FROM orders ORDER BY created_at DESC LIMIT 100"
    );
    return res.json({ orders });
  } catch (error: any) {
    console.error("Error fetching online orders:", error);
    return res.status(500).json({ orders: [], error: "Failed to fetch orders" });
  }
};

// Get store settings
export const getStoreSettings = async (req: Request, res: Response) => {
  try {
    const settings = await queryOne<any>("SELECT * FROM store_settings LIMIT 1");
    return res.json({
      settings: settings ?? {
        id: 0,
        store_name: "FILKOM Merch",
        address: null,
        phone: null,
        tax_rate: 0,
        qris_static_url: null,
      },
    });
  } catch (error: any) {
    console.error("Error fetching store settings:", error);
    return res.status(500).json({ settings: null, error: "Failed to fetch settings" });
  }
};

// Update store settings
export const updateStoreSettings = async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const existing = await queryOne<{ id: number }>("SELECT id FROM store_settings LIMIT 1");
    if (existing) {
      await execute(
        `UPDATE store_settings SET store_name = ?, address = ?, phone = ?,
         tax_rate = ?, qris_static_url = ? WHERE id = ?`,
        [
          input.store_name,
          input.address || null,
          input.phone || null,
          input.tax_rate ?? 0,
          input.qris_static_url || null,
          existing.id,
        ]
      );
    } else {
      await execute(
        `INSERT INTO store_settings (store_name, address, phone, tax_rate, qris_static_url)
         VALUES (?, ?, ?, ?, ?)`,
        [
          input.store_name,
          input.address || null,
          input.phone || null,
          input.tax_rate ?? 0,
          input.qris_static_url || null,
        ]
      );
    }
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating store settings:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update settings",
    });
  }
};

// Get daily sales summary
export const getDailySalesSummary = async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string;
    const summary = await queryOne<any>(
      `SELECT
        COUNT(*) AS total_transactions,
        COALESCE(SUM(total), 0) AS total_revenue,
        COALESCE(SUM(discount), 0) AS total_discount,
        COALESCE(AVG(total), 0) AS avg_transaction
       FROM offline_sales
       WHERE source = 'offline' AND DATE(created_at) = ?`,
      [date]
    );

    return res.json({
      success: true,
      summary: summary ?? {
        total_transactions: 0,
        total_revenue: 0,
        total_discount: 0,
        avg_transaction: 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching daily summary:", error);
    return res.status(500).json({ success: false, summary: null, error: "Failed to fetch summary" });
  }
};

// Get top products sold
export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 30;
    
    const products = await query<any>(
      `SELECT p.id, p.name,
        COALESCE(SUM(osi.quantity), 0) AS total_quantity_sold,
        COALESCE(SUM(osi.subtotal), 0) AS total_revenue
       FROM offline_sale_items osi
       JOIN products p ON p.id = osi.product_id
       JOIN offline_sales os ON os.sale_id = osi.sale_id
       WHERE os.source = 'offline' AND os.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY p.id, p.name
       ORDER BY total_quantity_sold DESC
       LIMIT ?`,
      [days, limit]
    );

    return res.json({ success: true, products });
  } catch (error: any) {
    console.error("Error fetching top products:", error);
    return res.status(500).json({ success: false, products: [], error: "Failed to fetch products" });
  }
};

// Get low inventory items
export const getInventory = async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT pv.id, pv.product_id, p.name AS product_name, p.price AS product_price, pv.stock
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE p.is_active = TRUE
       ORDER BY p.name, pv.size`
    );

    const inventory = rows.map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      product_name: `${row.product_name}`,
      product_price: Number(row.product_price),
      stock: row.stock,
      min_stock: 5,
      status: row.stock <= 0 ? "out" : row.stock <= 5 ? "low" : "ok",
    }));

    return res.json({ success: true, inventory });
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    return res.status(500).json({ success: false, inventory: [], error: "Failed to fetch inventory" });
  }
};
