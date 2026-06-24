import { Request, Response } from "express";
import { query, queryOne, execute, getConnection } from "../config/database";
import { config } from "../config/config";
import { snap } from "../config/midtrans";
import bcrypt from "bcryptjs";


// ============ STOCK MANAGEMENT HELPERS ============

/**
 * Logs a stock movement in the stock_movements table.
 * Assumes the connection/client is part of an active transaction.
 */
export const logStockMovement = async (
  connection: any,
  variantId: number,
  movementType: 'initial' | 'sale' | 'reservation' | 'reservation_release' | 'restock' | 'adjustment_in' | 'adjustment_out' | 'return' | 'refund',
  quantityChange: number,
  referenceType: 'order' | 'stock_opname' | 'purchase' | 'return' | 'manual',
  referenceId?: string | null,
  createdBy?: number | null,
  notes?: string | null
) => {
  // Get current variant stock to record before/after snapshot (locked FOR UPDATE)
  const [rows] = await connection.execute(
    "SELECT stock FROM product_variants WHERE id = ? FOR UPDATE",
    [variantId]
  );
  const currentStock = (rows as any[])[0]?.stock || 0;
  const stockBefore = currentStock;
  
  // Only actual stock changing movements change stock_after snapshot
  let stockAfter = currentStock;
  const isStockChanging = ['sale', 'restock', 'initial', 'adjustment_in', 'adjustment_out', 'return', 'refund'].includes(movementType);
  if (isStockChanging) {
    stockAfter = currentStock + quantityChange;
  }

  console.log(`[Stock Movement] Var ${variantId}: type=${movementType}, change=${quantityChange}, before=${stockBefore}, after=${stockAfter}`);

  await connection.execute(
    `INSERT INTO stock_movements (
      variant_id, movement_type, quantity_change, stock_before, stock_after,
      reference_type, reference_id, created_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      variantId,
      movementType,
      quantityChange,
      stockBefore,
      stockAfter,
      referenceType,
      referenceId || null,
      createdBy || null,
      notes || null
    ]
  );
};

/**
 * Reserves stock for an online order (increments stock_reserved).
 */
export const reserveVariantStock = async (
  connection: any,
  variantId: number,
  quantity: number,
  orderId: string,
  userId?: number | null
) => {
  await connection.execute(
    "UPDATE product_variants SET stock_reserved = stock_reserved + ? WHERE id = ?",
    [quantity, variantId]
  );
  await logStockMovement(
    connection,
    variantId,
    'reservation',
    quantity,
    'order',
    orderId,
    userId || null,
    'Reservasi stok pesanan online pending'
  );
};

/**
 * Releases reserved stock (decrements stock_reserved).
 */
export const releaseVariantReservation = async (
  connection: any,
  variantId: number,
  quantity: number,
  orderId: string,
  userId?: number | null
) => {
  await connection.execute(
    "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
    [quantity, variantId]
  );
  await logStockMovement(
    connection,
    variantId,
    'reservation_release',
    -quantity,
    'order',
    orderId,
    userId || null,
    'Pelepasan reservasi stok pesanan'
  );
};

/**
 * Executes a variant sale (decrements physical stock).
 */
export const executeVariantSale = async (
  connection: any,
  variantId: number,
  quantity: number,
  orderId: string,
  userId?: number | null
) => {
  await connection.execute(
    "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
    [quantity, variantId]
  );
  await logStockMovement(
    connection,
    variantId,
    'sale',
    -quantity,
    'order',
    orderId,
    userId || null,
    'Pengurangan stok untuk transaksi penjualan selesai'
  );
};

// ============ USER AUTHENTICATION ENDPOINTS ============

// Register Buyer
export const registerBuyer = async (req: Request, res: Response) => {
  try {
    const { name, username, email, password, nim, phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Nama, email, dan password wajib diisi" });
    }

    const existingEmail = await queryOne<any>("SELECT id FROM users WHERE email = ?", [email]);
    if (existingEmail) {
      return res.status(400).json({ success: false, error: "Email sudah terdaftar" });
    }

    if (nim) {
      const existingNim = await queryOne<any>("SELECT id FROM users WHERE nim = ?", [nim]);
      if (existingNim) {
        return res.status(400).json({ success: false, error: "NIM sudah terdaftar" });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await execute(
      `INSERT INTO users (name, email, password_hash, nim, phone, address, role)
       VALUES (?, ?, ?, ?, ?, ?, 'customer')`,
      [name, email, hash, nim || null, phone || null, address || null]
    );

    return res.json({ success: true, user_id: result.insertId });
  } catch (error: any) {
    console.error("Error registering buyer:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal registrasi" });
  }
};

// Login User
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username/Email dan password wajib diisi" });
    }

    // Cari user di database
    let dbUser = await queryOne<any>(
      "SELECT * FROM users WHERE email = ? OR nim = ?",
      [username, username]
    );

    // Fallback pencarian manual nama admin/kasir (adminfm, kasirfm)
    if (!dbUser) {
      if (username === "adminfm") {
        dbUser = await queryOne<any>("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
      } else if (username === "kasirfm") {
        dbUser = await queryOne<any>("SELECT * FROM users WHERE role = 'cashier' LIMIT 1");
      }
    }

    if (!dbUser) {
      return res.status(401).json({ success: false, error: "Pengguna tidak ditemukan" });
    }

    const isValid = await bcrypt.compare(password, dbUser.password_hash);
    if (!isValid) {
      const isHardcodedAdmin = username === "adminfm" && password === "Filkommerch123_wkwk" && dbUser.role === "admin";
      const isHardcodedCashier = username === "kasirfm" && password === "Kasir123_wkwk" && dbUser.role === "cashier";
      if (!isHardcodedAdmin && !isHardcodedCashier) {
        return res.status(401).json({ success: false, error: "Password salah" });
      }
    }

    if (dbUser.role === "admin" || dbUser.role === "cashier") {
      return res.json({
        success: true,
        user: {
          type: "admin",
          role: dbUser.role,
          username: dbUser.name,
          email: dbUser.email,
          id: dbUser.id,
        }
      });
    } else {
      return res.json({
        success: true,
        user: {
          type: "buyer",
          id: String(dbUser.id),
          email: dbUser.email,
          name: dbUser.name,
          nim: dbUser.nim,
          phone: dbUser.phone,
          address: dbUser.address,
        }
      });
    }
  } catch (error: any) {
    console.error("Error logging in:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal login" });
  }
};

// Login or Register Google User
export const loginGoogleUser = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, error: "Email dan nama wajib diisi" });
    }

    let dbUser = await queryOne<any>("SELECT * FROM users WHERE email = ?", [email]);
    if (!dbUser) {
      // Create user automatically
      const hash = await bcrypt.hash("google_auth_" + Math.random().toString(36), 10);
      const result = await execute(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES (?, ?, ?, 'customer')`,
        [name, email, hash]
      );
      dbUser = await queryOne<any>("SELECT * FROM users WHERE id = ?", [result.insertId]);
    }

    return res.json({
      success: true,
      user: {
        type: "buyer",
        id: String(dbUser.id),
        email: dbUser.email,
        name: dbUser.name,
        nim: dbUser.nim,
        phone: dbUser.phone,
        address: dbUser.address,
      }
    });
  } catch (error: any) {
    console.error("Error with Google auth:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed Google auth" });
  }
};

// ============ USER CRUD ENDPOINTS (ADMIN) ============

// Get all users
export const getAllUsersAdmin = async (req: Request, res: Response) => {
  try {
    const users = await query<any>(
      "SELECT id, name, nim, email, phone, address, role, created_at FROM users ORDER BY role, name"
    );
    return res.json({ success: true, users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, error: "Gagal memuat daftar pengguna" });
  }
};

// Create user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, nim, phone, address, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: "Nama, email, password, dan peran wajib diisi" });
    }

    const existingEmail = await queryOne<any>("SELECT id FROM users WHERE email = ?", [email]);
    if (existingEmail) {
      return res.status(400).json({ success: false, error: "Email sudah terdaftar" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await execute(
      `INSERT INTO users (name, email, password_hash, nim, phone, address, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hash, nim || null, phone || null, address || null, role]
    );

    return res.json({ success: true, user_id: result.insertId });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal menambahkan pengguna" });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id, name, email, password, nim, phone, address, role } = req.body;
    if (!id || !name || !email || !role) {
      return res.status(400).json({ success: false, error: "ID, nama, email, dan peran wajib diisi" });
    }

    const existing = await queryOne<any>("SELECT id FROM users WHERE email = ? AND id != ?", [email, id]);
    if (existing) {
      return res.status(400).json({ success: false, error: "Email sudah digunakan pengguna lain" });
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await execute(
        `UPDATE users SET name = ?, email = ?, password_hash = ?, nim = ?, phone = ?, address = ?, role = ? WHERE id = ?`,
        [name, email, hash, nim || null, phone || null, address || null, role, id]
      );
    } else {
      await execute(
        `UPDATE users SET name = ?, email = ?, nim = ?, phone = ?, address = ?, role = ? WHERE id = ?`,
        [name, email, nim || null, phone || null, address || null, role, id]
      );
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal memperbarui pengguna" });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (Number(id) === 1) {
      return res.status(400).json({ success: false, error: "Admin utama tidak dapat dihapus" });
    }
    await execute("DELETE FROM users WHERE id = ?", [id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ success: false, error: error.message || "Gagal menghapus pengguna" });
  }
};

// ============ PRODUCTS CATALOG ENDPOINTS ============

// Get all active products with variants
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

// Get single product by slug
export const getProductBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const product = await queryOne<any>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.is_active = TRUE`,
      [slug]
    );

    if (!product) {
      return res.status(404).json({ success: false, error: "Produk tidak ditemukan" });
    }

    const variants = await query<any>(
      "SELECT * FROM product_variants WHERE product_id = ?",
      [product.id]
    );

    return res.json({ success: true, product: { ...product, variants } });
  } catch (error: any) {
    console.error("Error fetching product by slug:", error);
    return res.status(500).json({ success: false, error: "Gagal mengambil data produk" });
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

// ============ ORDERS AND PAYMENTS (ONLINE CHECKOUT) ============

// Create Order and Payment
export const createOrderAndPayment = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const details = req.body;
    if (!details.orderId || !details.items || details.items.length === 0) {
      return res.status(400).json({ success: false, error: "Pesanan atau item kosong" });
    }

    console.log("📝 Processing order with transaction locks:", details.orderId);

    // Resolve items and prices from database using variant_id (locking rows)
    const resolvedItems: any[] = [];
    let calculatedSubtotal = 0;

    for (const item of details.items) {
      const variantId = item.variant_id;
      if (!variantId) {
        throw new Error(`Variant ID wajib diisi untuk item: ${item.name || item.product_name}`);
      }

      // Query variant details joined with product info
      const [rows] = await connection.execute(
        `SELECT pv.*, p.name AS product_name, p.price AS product_price, p.sku_prefix
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = ? AND pv.is_active = TRUE FOR UPDATE`,
        [variantId]
      );

      const variant = (rows as any[])[0];
      if (!variant) {
        throw new Error(`Produk/Varian dengan ID ${variantId} tidak ditemukan atau tidak aktif`);
      }

      // Check stock availability (physical stock minus reserved stock)
      const availableStock = variant.stock - variant.stock_reserved;
      if (availableStock < item.quantity) {
        throw new Error(`Stok tidak cukup untuk ${variant.product_name} (${variant.size}${variant.color ? ` / ${variant.color}` : ""}). Tersedia: ${availableStock}`);
      }

      // Determine correct price: override takes priority
      const price = variant.price_override !== null ? variant.price_override : variant.product_price;
      const subtotalItem = price * item.quantity;
      calculatedSubtotal += subtotalItem;

      // Construct SKU snapshot
      const skuSnapshot = variant.sku || (variant.sku_prefix ? `${variant.sku_prefix}-${variant.id}` : `VAR-${variant.id}`);

      resolvedItems.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        product_name: variant.product_name,
        size: variant.size,
        color: variant.color || "Default",
        quantity: item.quantity,
        price: price,
        subtotal: subtotalItem,
        skuSnapshot: skuSnapshot
      });
    }

    const shippingCost = Number(details.shippingCost) || 0;
    const serviceFee = Number(details.serviceFee) || 0;
    const taxAmount = Number(details.taxAmount) || 0;
    const discountAmount = Number(details.discountAmount) || 0;
    const grossAmount = calculatedSubtotal - discountAmount + shippingCost + serviceFee + taxAmount;

    // 1. Insert order to database
    await connection.execute(
      `INSERT INTO orders (
        order_id, channel, fulfillment_type, fulfillment_status, user_id, customer_name,
        customer_nim, customer_email, customer_phone, shipping_address, subtotal,
        discount_amount, service_fee, shipping_cost, tax_amount, gross_amount,
        payment_status, order_status, notes, transaction_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        details.orderId,
        details.channel || "online",
        details.fulfillmentType || "shipping",
        "unfulfilled",
        details.userId || null,
        details.customerName,
        details.customerNim || null,
        details.customerEmail,
        details.customerPhone,
        details.shippingAddress || null,
        calculatedSubtotal,
        discountAmount,
        serviceFee,
        shippingCost,
        taxAmount,
        grossAmount,
        "unpaid",
        "pending_payment",
        details.notes || null,
        "pending"
      ]
    );

    // 2. Insert order items & reserve stock
    for (const item of resolvedItems) {
      await connection.execute(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, size, color, quantity,
          unit_price, discount_amount, subtotal, sku_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          details.orderId,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.size,
          item.color,
          item.quantity,
          item.price,
          0,
          item.subtotal,
          item.skuSnapshot
        ]
      );

      // Reserve stock in database
      await reserveVariantStock(connection, item.variant_id, item.quantity, details.orderId, details.userId);
    }

    // 3. Generate QRIS payment via Midtrans Snap Client
    console.log("🔐 Generating QRIS snap transaction for:", details.orderId);
    const parameter = {
      transaction_details: {
        order_id: details.orderId,
        gross_amount: grossAmount
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: details.customerName,
        email: details.customerEmail,
        phone: details.customerPhone
      },
      item_details: resolvedItems.map((item: any) => ({
        id: String(item.variant_id),
        price: Number(item.price),
        quantity: Number(item.quantity),
        name: item.product_name.substring(0, 50)
      }))
    };

    if (shippingCost > 0) {
      parameter.item_details.push({
        id: "shipping-cost",
        price: shippingCost,
        quantity: 1,
        name: "Shipping Cost"
      });
    }
    if (serviceFee > 0) {
      parameter.item_details.push({
        id: "service-fee",
        price: serviceFee,
        quantity: 1,
        name: "Service Fee"
      });
    }

    const transaction = await snap.createTransaction(parameter);
    console.log("✅ QRIS token generated successfully");

    // 4. Update order dengan snap token
    await connection.execute(
      "UPDATE orders SET snap_token = ?, payment_type = ? WHERE order_id = ?",
      [transaction.token, "qris", details.orderId]
    );

    await connection.commit();

    return res.json({
      success: true,
      orderId: details.orderId,
      token: transaction.token,
      qrUrl: `https://app.sandbox.midtrans.com/qris/${transaction.token}.png`
    });
  } catch (error: any) {
    await connection.rollback();
    console.error("❌ Error creating order:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create order and payment",
    });
  } finally {
    connection.release();
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

// Create category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Nama kategori wajib diisi" });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const existing = await queryOne<any>("SELECT id FROM categories WHERE slug = ?", [slug]);
    if (existing) {
      return res.status(400).json({ success: false, error: "Kategori dengan nama serupa sudah ada" });
    }

    const result = await execute(
      "INSERT INTO categories (name, slug, is_active) VALUES (?, ?, TRUE)",
      [name.trim(), slug]
    );

    return res.json({ success: true, category: { id: result.insertId, name: name.trim(), slug, is_active: true } });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to create category" });
  }
};

// ============ ADMIN MANAGEMENT (PRODUCTS, ORDERS, SETTINGS) ============

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
        "INSERT INTO product_variants (product_id, size, color, stock) VALUES (?, ?, ?, ?)",
        [result.insertId, variant.size, variant.color || null, variant.stock]
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

    // Synchronize variants rather than DELETE + INSERT to avoid foreign key restrict failures on stock_movements
    await execute("UPDATE product_variants SET is_active = FALSE WHERE product_id = ?", [input.id]);
    
    for (const variant of input.variants) {
      const existing = await queryOne<any>(
        "SELECT id FROM product_variants WHERE product_id = ? AND size = ? AND COALESCE(color, '') = COALESCE(?, '') LIMIT 1",
        [input.id, variant.size, variant.color || null]
      );

      if (existing) {
        await execute(
          "UPDATE product_variants SET stock = ?, is_active = TRUE WHERE id = ?",
          [variant.stock, existing.id]
        );
      } else {
        await execute(
          "INSERT INTO product_variants (product_id, size, color, stock, is_active) VALUES (?, ?, ?, ?, TRUE)",
          [input.id, variant.size, variant.color || null, variant.stock]
        );
      }
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

// Get online orders
export const getOnlineOrders = async (req: Request, res: Response) => {
  try {
    const orders = await query<any>(
      "SELECT * FROM orders WHERE channel = 'online' ORDER BY created_at DESC LIMIT 100"
    );
    return res.json({ orders });
  } catch (error: any) {
    console.error("Error fetching online orders:", error);
    return res.status(500).json({ orders: [], error: "Failed to fetch orders" });
  }
};

// Update order status/details (Admin)
export const updateOrderStatus = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;
    const { status, shipping_address } = req.body;

    await connection.beginTransaction();

    const [orderRows] = await connection.execute(
      "SELECT payment_status, order_status, fulfillment_status FROM orders WHERE order_id = ? FOR UPDATE",
      [id]
    );
    const order = (orderRows as any[])[0];

    if (!order) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Order tidak ditemukan" });
    }

    const isNowPaid = status === "settlement" || status === "completed";
    const wasUnpaid = order.payment_status !== "paid";

    let paymentStatus = order.payment_status;
    let orderStatus = order.order_status;
    let fulfillmentStatus = order.fulfillment_status;

    if (status === "pending") {
      paymentStatus = "pending";
      orderStatus = "pending_payment";
    } else if (status === "settlement" || status === "capture") {
      paymentStatus = "paid";
      orderStatus = "paid";
    } else if (status === "completed") {
      paymentStatus = "paid";
      orderStatus = "completed";
      fulfillmentStatus = "completed";
    } else if (status === "expire") {
      paymentStatus = "expired";
      orderStatus = "cancelled";
    } else if (status === "cancel") {
      paymentStatus = "failed";
      orderStatus = "cancelled";
    }

    if (shipping_address !== undefined) {
      await connection.execute(
        `UPDATE orders SET 
          transaction_status = ?, payment_status = ?, order_status = ?, fulfillment_status = ?, shipping_address = ? 
         WHERE order_id = ?`,
        [status, paymentStatus, orderStatus, fulfillmentStatus, shipping_address, id]
      );
    } else {
      await connection.execute(
        `UPDATE orders SET 
          transaction_status = ?, payment_status = ?, order_status = ?, fulfillment_status = ? 
         WHERE order_id = ?`,
        [status, paymentStatus, orderStatus, fulfillmentStatus, id]
      );
    }

    // Trigger stock deduction if transitioning to paid manually
    if (isNowPaid && wasUnpaid) {
      const [items] = await connection.execute(
        "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
        [id]
      );
      for (const item of items as any[]) {
        if (item.variant_id) {
          // Deduct stock, release reservation, log movements
          await connection.execute(
            "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          await connection.execute(
            "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          // Log movements manually using locks
          const [vRows] = await connection.execute(
            "SELECT stock FROM product_variants WHERE id = ? FOR UPDATE",
            [item.variant_id]
          );
          const curStock = (vRows as any)[0]?.stock || 0;
          await connection.execute(
            `INSERT INTO stock_movements (variant_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, notes) 
             VALUES (?, 'reservation_release', ?, ?, ?, 'order', ?, 'Pelepasan reservasi stok (manual)')`,
            [item.variant_id, -item.quantity, curStock, curStock, id]
          );
          await connection.execute(
            `INSERT INTO stock_movements (variant_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, notes) 
             VALUES (?, 'sale', ?, ?, ?, 'order', ?, 'Penjualan selesai (manual)')`,
            [item.variant_id, -item.quantity, curStock + item.quantity, curStock, id]
          );
        }
      }
    }

    await connection.commit();
    return res.json({ success: true });
  } catch (error: any) {
    await connection.rollback();
    console.error("Error updating order status:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update order status" });
  } finally {
    connection.release();
  }
};

// Delete order (Admin)
export const deleteOrder = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [orderRows] = await connection.execute(
      "SELECT payment_status FROM orders WHERE order_id = ? FOR UPDATE",
      [id]
    );
    const order = (orderRows as any[])[0];

    if (order && (order.payment_status === "pending" || order.payment_status === "unpaid")) {
      // Release reservations
      const [items] = await connection.execute(
        "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
        [id]
      );
      for (const item of items as any[]) {
        if (item.variant_id) {
          await connection.execute(
            "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          const [vRows] = await connection.execute(
            "SELECT stock FROM product_variants WHERE id = ?",
            [item.variant_id]
          );
          const curStock = (vRows as any)[0]?.stock || 0;
          await connection.execute(
            `INSERT INTO stock_movements (variant_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, notes) 
             VALUES (?, 'reservation_release', ?, ?, ?, 'order', ?, 'Pelepasan reservasi stok (order deleted)')`,
            [item.variant_id, -item.quantity, curStock, curStock, id]
          );
        }
      }
    }

    await connection.execute("DELETE FROM orders WHERE order_id = ?", [id]);
    await connection.commit();
    return res.json({ success: true });
  } catch (error: any) {
    await connection.rollback();
    console.error("Error deleting order:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete order" });
  } finally {
    connection.release();
  }
};

// ============ OFFLINE POS SALES ENDPOINTS ============

// Create Sale (POS sale transaction)
export const createSale = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const input = req.body;
    await connection.beginTransaction();

    const PAYMENT_LABELS: Record<string, string> = {
      cash: "Tunai",
      qris: "QRIS",
      debit: "Debit",
    };
    const paymentLabel = PAYMENT_LABELS[input.payment_method?.toLowerCase()] || input.payment_method || "Tunai";

    // CASE 1: If order already exists (meaning it was created via createOrderAndPayment for online POS payment)
    if (input.order_id) {
      console.log("ℹ️ Finalizing existing POS online order in database:", input.order_id);
      
      const [orderRows] = await connection.execute(
        "SELECT id, order_id, payment_status FROM orders WHERE order_id = ? FOR UPDATE",
        [input.order_id]
      );
      const order = (orderRows as any[])[0];

      if (!order) {
        throw new Error(`Order ${input.order_id} tidak ditemukan`);
      }

      // If it wasn't already marked as paid
      if (order.payment_status !== "paid") {
        // Update order status to paid, completed
        await connection.execute(
          `UPDATE orders SET 
            payment_status = 'paid', order_status = 'completed', fulfillment_status = 'completed', 
            payment_type = ?, transaction_status = 'settlement', updated_at = NOW() 
           WHERE order_id = ?`,
          [paymentLabel, input.order_id]
        );

        // Check if payment row exists
        const [paymentRows] = await connection.execute(
          "SELECT id FROM payments WHERE order_id = ? AND provider = 'midtrans' LIMIT 1 FOR UPDATE",
          [input.order_id]
        );
        const existingPayment = (paymentRows as any[])[0];

        if (existingPayment) {
          await connection.execute(
            "UPDATE payments SET status = 'paid', paid_at = NOW(), raw_callback_json = ? WHERE id = ?",
            [JSON.stringify({ note: "Finalized via cashier screen" }), existingPayment.id]
          );
        } else {
          await connection.execute(
            `INSERT INTO payments (order_id, provider, payment_method, amount, status, paid_at, raw_callback_json) 
             VALUES (?, 'midtrans', ?, ?, 'paid', NOW(), ?)`,
            [input.order_id, paymentLabel, input.total, JSON.stringify({ note: "Finalized via cashier screen" })]
          );
        }

        // Fetch order items to release reservations and deduct stock
        const [items] = await connection.execute(
          "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
          [input.order_id]
        );

        for (const item of items as any[]) {
          if (item.variant_id) {
            // Decrement physical stock
            await connection.execute(
              "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
              [item.quantity, item.variant_id]
            );
            // Decrement reserved stock
            await connection.execute(
              "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
              [item.quantity, item.variant_id]
            );
            // Log movements
            await logStockMovement(connection, item.variant_id, 'reservation_release', -item.quantity, 'order', input.order_id, input.admin_id, 'Rilis reservasi POS online');
            await logStockMovement(connection, item.variant_id, 'sale', -item.quantity, 'order', input.order_id, input.admin_id, 'Penjualan POS online sukses');
          }
        }
      }

      await connection.commit();
      return res.json({
        success: true,
        sale_id: input.order_id,
        db_id: order.id,
        message: "Sale finalized successfully",
      });
    }

    // CASE 2: Cash/Debit POS Sale (No existing order)
    console.log("ℹ️ Creating new cash/debit POS sale in database");
    const saleId = `POS-${Date.now()}`;
    const resolvedItems: any[] = [];
    let calculatedSubtotal = 0;

    for (const item of input.items) {
      const variantId = item.variant_id;
      if (!variantId) {
        throw new Error(`Variant ID wajib diisi untuk item: ${item.product_name}`);
      }

      // Query variant joined with product info
      const [rows] = await connection.execute(
        `SELECT pv.*, p.name AS product_name, p.price AS product_price, p.sku_prefix
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = ? AND pv.is_active = TRUE FOR UPDATE`,
        [variantId]
      );

      const variant = (rows as any[])[0];
      if (!variant) {
        throw new Error(`Produk/Varian dengan ID ${variantId} tidak ditemukan atau tidak aktif`);
      }

      // Check stock availability (available stock = stock - stock_reserved)
      const availableStock = variant.stock - variant.stock_reserved;
      if (availableStock < item.quantity) {
        throw new Error(`Stok tidak cukup untuk ${variant.product_name}. Tersedia: ${availableStock}`);
      }

      const price = variant.price_override !== null ? variant.price_override : variant.product_price;
      const subtotalItem = price * item.quantity;
      calculatedSubtotal += subtotalItem;

      const skuSnapshot = variant.sku || (variant.sku_prefix ? `${variant.sku_prefix}-${variant.id}` : `VAR-${variant.id}`);

      resolvedItems.push({
        product_id: variant.product_id,
        variant_id: variant.id,
        product_name: variant.product_name,
        size: variant.size,
        color: variant.color || "Default",
        quantity: item.quantity,
        price: price,
        subtotal: subtotalItem,
        skuSnapshot: skuSnapshot
      });
    }

    const discountAmount = Number(input.discount) || 0;
    const taxAmount = Number(input.tax) || 0;
    const grossAmount = calculatedSubtotal - discountAmount + taxAmount;

    // 1. Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        order_id, channel, fulfillment_type, fulfillment_status, cashier_id, customer_name,
        subtotal, discount_amount, tax_amount, gross_amount, payment_status, order_status, notes, transaction_status
      ) VALUES (?, 'pos', 'walk_in', 'completed', ?, ?, ?, ?, ?, ?, 'paid', 'completed', ?, 'settlement')`,
      [
        saleId,
        input.admin_id || null,
        input.customer_name || "Pelanggan POS",
        calculatedSubtotal,
        discountAmount,
        taxAmount,
        grossAmount,
        input.notes || null
      ]
    );

    const insertedOrderId = (orderResult as any).insertId;

    // 2. Insert items and decrement stock directly
    for (const item of resolvedItems) {
      await connection.execute(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, size, color, quantity,
          unit_price, discount_amount, subtotal, sku_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.size,
          item.color,
          item.quantity,
          item.price,
          0,
          item.subtotal,
          item.skuSnapshot
        ]
      );

      // Decrement physical stock (No reservation needed for instant cashier cash sale)
      await connection.execute(
        "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
        [item.quantity, item.variant_id]
      );

      // Log movement in stock_movements
      await logStockMovement(
        connection,
        item.variant_id,
        'sale',
        -item.quantity,
        'order',
        saleId,
        input.admin_id,
        'Penjualan POS langsung selesai'
      );
    }

    // 3. Create payments record
    const paymentProvider = input.payment_method?.toLowerCase() === "debit" ? "debit" : "cash";
    await connection.execute(
      `INSERT INTO payments (
        order_id, provider, payment_method, amount, status, paid_at
      ) VALUES (?, ?, ?, ?, 'paid', NOW())`,
      [
        saleId,
        paymentProvider,
        paymentLabel,
        grossAmount
      ]
    );

    await connection.commit();

    const inserted = await queryOne<{ id: number }>(
      "SELECT id FROM orders WHERE order_id = ?",
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
    console.error("Error creating POS sale:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to create POS sale" });
  } finally {
    connection.release();
  }
};

// Get offline sales
export const getOfflineSales = async (req: Request, res: Response) => {
  try {
    const sales = await query<any>(
      `SELECT o.*, o.order_id AS sale_id, o.cashier_id AS admin_id, u.name AS cashier_name,
              o.discount_amount AS discount, o.tax_amount AS tax, o.gross_amount AS total,
              'offline' AS source, o.order_status AS status
       FROM orders o
       LEFT JOIN users u ON u.id = o.cashier_id
       WHERE o.channel = 'pos'
       ORDER BY o.created_at DESC LIMIT 100`
    );
    return res.json({ sales });
  } catch (error: any) {
    console.error("Error fetching offline sales:", error);
    return res.status(500).json({ sales: [], error: "Failed to fetch offline sales" });
  }
};

// Get offline sale by ID with items
export const getOfflineSaleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sale = await queryOne<any>(
      `SELECT o.*, o.order_id AS sale_id, o.cashier_id AS admin_id, u.name AS cashier_name,
              o.discount_amount AS discount, o.tax_amount AS tax, o.gross_amount AS total,
              'offline' AS source, o.order_status AS status
       FROM orders o
       LEFT JOIN users u ON u.id = o.cashier_id
       WHERE o.order_id = ? AND o.channel = 'pos' LIMIT 1`,
      [id]
    );
    if (!sale) {
      return res.status(404).json({ success: false, error: "Penjualan offline tidak ditemukan" });
    }
    const items = await query<any>(
      "SELECT *, unit_price AS price FROM order_items WHERE order_id = ?",
      [id]
    );
    return res.json({ success: true, sale, items });
  } catch (error: any) {
    console.error("Error fetching offline sale by ID:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch sale details" });
  }
};

// Delete offline sale
export const deleteOfflineSale = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;
    await connection.beginTransaction();

    const [orderRows] = await connection.execute(
      "SELECT payment_status FROM orders WHERE order_id = ? AND channel = 'pos' FOR UPDATE",
      [id]
    );
    const order = (orderRows as any[])[0];

    if (order && order.payment_status === "paid") {
      // Return stock back to inventory
      const [items] = await connection.execute(
        "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
        [id]
      );
      for (const item of items as any[]) {
        if (item.variant_id) {
          await connection.execute(
            "UPDATE product_variants SET stock = stock + ? WHERE id = ?",
            [item.quantity, item.variant_id]
          );
          const [vRows] = await connection.execute(
            "SELECT stock FROM product_variants WHERE id = ?",
            [item.variant_id]
          );
          const curStock = (vRows as any)[0]?.stock || 0;
          await connection.execute(
            `INSERT INTO stock_movements (variant_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, notes) 
             VALUES (?, 'return', ?, ?, ?, 'order', ?, 'Pengembalian stok (penjualan POS dihapus)')`,
            [item.variant_id, item.quantity, curStock - item.quantity, curStock, id]
          );
        }
      }
    }

    await connection.execute("DELETE FROM orders WHERE order_id = ? AND channel = 'pos'", [id]);
    await connection.commit();
    return res.json({ success: true });
  } catch (error: any) {
    await connection.rollback();
    console.error("Error deleting offline sale:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete sale" });
  } finally {
    connection.release();
  }
};

// ============ STORE SETTINGS AND ANALYTICS ENDPOINTS ============

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
        homepage_layout: null,
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
         tax_rate = ?, qris_static_url = ?, homepage_layout = ? WHERE id = ?`,
        [
          input.store_name,
          input.address || null,
          input.phone || null,
          input.tax_rate ?? 0,
          input.qris_static_url || null,
          input.homepage_layout || null,
          existing.id,
        ]
      );
    } else {
      await execute(
        `INSERT INTO store_settings (store_name, address, phone, tax_rate, qris_static_url, homepage_layout)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          input.store_name,
          input.address || null,
          input.phone || null,
          input.tax_rate ?? 0,
          input.qris_static_url || null,
          input.homepage_layout || null,
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
        COALESCE(SUM(gross_amount), 0) AS total_revenue,
        COALESCE(SUM(discount_amount), 0) AS total_discount,
        COALESCE(AVG(gross_amount), 0) AS avg_transaction
       FROM orders
       WHERE payment_status = 'paid' AND DATE(created_at) = ?`,
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
        COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
        COALESCE(SUM(oi.subtotal), 0) AS total_revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.order_id = oi.order_id
       WHERE o.payment_status = 'paid' AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
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

// Get user orders (Track Order)
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Fetch orders
    const orders = await query<any>(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    if (orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    // Fetch items for all these orders
    const orderIds = orders.map((o) => o.order_id);
    const placeholders = orderIds.map(() => "?").join(",");
    const items = await query<any>(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
      orderIds
    );

    // Map items to their respective orders
    const ordersWithItems = orders.map((order) => {
      const orderItems = items.filter((item) => item.order_id === order.order_id);
      return {
        ...order,
        items: orderItems,
      };
    });

    return res.json({ success: true, orders: ordersWithItems });
  } catch (error: any) {
    console.error("Error fetching user orders:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch user orders" });
  }
};
