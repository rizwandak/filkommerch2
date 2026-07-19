import { Request, Response } from "express";
import { query, queryOne, execute, getConnection } from "../config/database";
import { config } from "../config/config";
import bcrypt from "bcryptjs";


// ============ GENERAL HELPERS & DYNAMIC PRICING ============

/**
 * Checks if a given email belongs to the UB (Universitas Brawijaya) domain.
 * Configured via UB_DOMAINS env variable.
 */
export const isUbEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const domains = (process.env.UB_DOMAINS || "student.ub.ac.id,ub.ac.id")
    .split(",")
    .map(d => d.trim().toLowerCase());
  const emailDomain = email.split("@")[1]?.toLowerCase();
  return domains.includes(emailDomain);
};

/**
 * Determines the correct dynamic price for a product/variant based on user context.
 * Priority: promo_price -> filkom_price (if UB email) -> fallback price (variant override or base product price).
 */
export const determinePrice = (variant: any, isFilkomVerified: boolean): number => {
  // 1. Determine base price (harga asli)
  let basePrice = Number(variant.product_price);
  if (variant.product_promo_price !== undefined && variant.product_promo_price !== null && Number(variant.product_promo_price) > 0) {
    basePrice = Number(variant.product_promo_price);
  } else if (isFilkomVerified) {
    if (variant.product_filkom_price !== undefined && variant.product_filkom_price !== null && Number(variant.product_filkom_price) > 0) {
      basePrice = Number(variant.product_filkom_price);
    }
  }

  // 2. Determine variant add-on price
  let addon = 0;
  if (variant.filkom_price !== undefined && variant.filkom_price !== null && Number(variant.filkom_price) > 0) {
    addon = Number(variant.filkom_price);
  } else if (variant.price_override !== undefined && variant.price_override !== null && Number(variant.price_override) > 0) {
    addon = Number(variant.price_override);
  }

  return basePrice + addon;
};

/**
 * Helper to write a log entry to activity_logs table.
 */
export const logActivity = async (
  userId: number | null,
  actorName: string | null,
  actorRole: string | null,
  action: string,
  entityType: string | null,
  entityId: string | number | null,
  description: string,
  ipAddress?: string | null,
  userAgent?: string | null
) => {
  try {
    await execute(
      `INSERT INTO activity_logs (user_id, actor_name_snapshot, actor_role, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        actorName,
        actorRole,
        action,
        entityType,
        entityId ? String(entityId) : null,
        description,
        ipAddress || null,
        userAgent || null
      ]
    );
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};


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
          nim: dbUser.nim,
          is_filkom_verified: dbUser.is_filkom_verified || 0,
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
          is_filkom_verified: dbUser.is_filkom_verified || 0,
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

    if (dbUser.role === "admin" || dbUser.role === "cashier") {
      return res.json({
        success: true,
        user: {
          type: "admin",
          role: dbUser.role,
          username: dbUser.name,
          email: dbUser.email,
          id: dbUser.id,
          nim: dbUser.nim,
          is_filkom_verified: dbUser.is_filkom_verified || 0,
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
          is_filkom_verified: dbUser.is_filkom_verified || 0,
        }
      });
    }
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
      "SELECT id, name, nim, email, phone, address, role, is_filkom_verified, created_at FROM users ORDER BY role, name"
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
    const { name, email, password, nim, phone, address, role, is_filkom_verified } = req.body;
    const actorId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const actorName = req.header("x-user-name") || null;
    const actorRole = req.header("x-user-role") || null;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: "Nama, username/email, password, dan peran wajib diisi" });
    }

    const existingEmail = await queryOne<any>("SELECT id FROM users WHERE email = ?", [email]);
    if (existingEmail) {
      return res.status(400).json({ success: false, error: "Username atau Email sudah terdaftar" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await execute(
      `INSERT INTO users (name, email, password_hash, nim, phone, address, role, is_filkom_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hash, nim || null, phone || null, address || null, role, is_filkom_verified ? 1 : 0]
    );

    await logActivity(
      actorId,
      actorName,
      actorRole,
      "create_user",
      "user",
      result.insertId,
      `Pengguna "${name}" (${role}) dibuat oleh ${actorName || 'Sistem'}`
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
    const { id, name, email, password, nim, phone, address, role, is_filkom_verified } = req.body;
    const actorId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const actorName = req.header("x-user-name") || null;
    const actorRole = req.header("x-user-role") || null;

    if (!id || !name || !email || !role) {
      return res.status(400).json({ success: false, error: "ID, nama, username/email, dan peran wajib diisi" });
    }

    const existing = await queryOne<any>("SELECT id FROM users WHERE email = ? AND id != ?", [email, id]);
    if (existing) {
      return res.status(400).json({ success: false, error: "Username atau Email sudah digunakan pengguna lain" });
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await execute(
        `UPDATE users SET name = ?, email = ?, password_hash = ?, nim = ?, phone = ?, address = ?, role = ?, is_filkom_verified = ? WHERE id = ?`,
        [name, email, hash, nim || null, phone || null, address || null, role, is_filkom_verified ? 1 : 0, id]
      );
    } else {
      await execute(
        `UPDATE users SET name = ?, email = ?, nim = ?, phone = ?, address = ?, role = ?, is_filkom_verified = ? WHERE id = ?`,
        [name, email, nim || null, phone || null, address || null, role, is_filkom_verified ? 1 : 0, id]
      );
    }

    await logActivity(
      actorId,
      actorName,
      actorRole,
      "update_user",
      "user",
      id,
      `Pengguna "${name}" (${role}) diperbarui oleh ${actorName || 'Sistem'}`
    );

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
    const actorId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const actorName = req.header("x-user-name") || null;
    const actorRole = req.header("x-user-role") || null;

    if (Number(id) === 1) {
      return res.status(400).json({ success: false, error: "Admin utama tidak dapat dihapus" });
    }

    // 1. Delete associated user addresses (NOT NULL foreign key)
    await execute("DELETE FROM user_addresses WHERE user_id = ?", [id]);

    // 2. Set nullable user_id to NULL in activity_logs
    await execute("UPDATE activity_logs SET user_id = NULL WHERE user_id = ?", [id]);

    // 3. Set nullable created_by to NULL in stock_movements
    await execute("UPDATE stock_movements SET created_by = NULL WHERE created_by = ?", [id]);

    // 4. Set nullable user_id/cashier_id to NULL in orders
    await execute("UPDATE orders SET user_id = NULL WHERE user_id = ?", [id]);
    await execute("UPDATE orders SET cashier_id = NULL WHERE cashier_id = ?", [id]);

    // 5. Delete shifts associated with cashiers (NOT NULL cashier_id)
    await execute("DELETE FROM cashier_shifts WHERE cashier_id = ?", [id]);

    // 6. Finally delete the user
    await execute("DELETE FROM users WHERE id = ?", [id]);

    await logActivity(
      actorId,
      actorName,
      actorRole,
      "delete_user",
      "user",
      id,
      `Pengguna ID ${id} dihapus oleh ${actorName || 'Sistem'}`
    );

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
          "SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE",
          [product.id]
        );
        let bundle_components: any[] = [];
        if (product.product_type === "bundle") {
          const comps = await query<any>(
            `SELECT p.* FROM products p
             JOIN bundle_items bi ON bi.component_product_id = p.id
             WHERE bi.bundle_product_id = ? AND p.is_active = TRUE`,
            [product.id]
          );
          bundle_components = await Promise.all(
            comps.map(async (comp: any) => {
              const compVariants = await query<any>(
                "SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE",
                [comp.id]
              );
              return { ...comp, variants: compVariants };
            })
          );
        }
        return { ...product, variants, bundle_components };
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
      "SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE",
      [product.id]
    );

    const images = await query<any>(
      "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
      [product.id]
    );

    const imageUrls = images.length > 0 ? images.map((img: any) => img.image_url) : [product.image_url].filter(Boolean);

    let bundle_components: any[] = [];
    if (product.product_type === "bundle") {
      const comps = await query<any>(
        `SELECT p.* FROM products p
         JOIN bundle_items bi ON bi.component_product_id = p.id
         WHERE bi.bundle_product_id = ? AND p.is_active = TRUE`,
        [product.id]
      );
      bundle_components = await Promise.all(
        comps.map(async (comp: any) => {
          const compVariants = await query<any>(
            "SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE",
            [comp.id]
          );
          return { ...comp, variants: compVariants };
        })
      );
    }

    return res.json({ success: true, product: { ...product, variants, images: imageUrls, bundle_components } });
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
// CATATAN KEAMANAN: Input sudah divalidasi oleh Zod middleware (createOrderSchema) di server.ts
// sebelum handler ini dipanggil. Validasi manual di bawah ini berfungsi sebagai defense-in-depth.
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
    // Check if the user is verified as FILKOM civitas in our database
    let isFilkomVerified = false;
    if (details.userId) {
      const [userRows] = await connection.execute(
        "SELECT is_filkom_verified FROM users WHERE id = ?",
        [details.userId]
      );
      const userRow = (userRows as any[])[0];
      if (userRow && userRow.is_filkom_verified === 1) {
        isFilkomVerified = true;
      }
    }

    for (const item of details.items) {
      const variantId = item.variant_id;
      if (!variantId) {
        throw new Error(`Variant ID wajib diisi untuk item: ${item.name || item.product_name}`);
      }

      // Query variant details joined with product info
      const [rows] = await connection.execute(
        `SELECT pv.*, p.name AS product_name, p.price AS product_price, p.sku_prefix,
                p.filkom_price AS product_filkom_price, p.promo_price AS product_promo_price
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
      if (variant.product_type !== 'bundle') {
        const availableStock = variant.stock - variant.stock_reserved;
        if (availableStock < item.quantity) {
          throw new Error(`Stok tidak cukup untuk ${variant.product_name} (${variant.size}${variant.color ? ` / ${variant.color}` : ""}). Tersedia: ${availableStock}`);
        }
      }

      // Determine correct price based on verified status
      const price = determinePrice(variant, isFilkomVerified);
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
        skuSnapshot: skuSnapshot,
        bypassStockReservation: variant.product_type === 'bundle'
      });

      // Resolve bundle component selections
      if (variant.product_type === 'bundle') {
        if (!item.bundle_selections || !Array.isArray(item.bundle_selections)) {
          throw new Error(`Pilihan komponen wajib disertakan untuk produk bundel: ${variant.product_name}`);
        }

        for (const selection of item.bundle_selections) {
          const [compRows] = await connection.execute(
            `SELECT pv.*, p.name AS product_name, p.price AS product_price, p.sku_prefix, p.product_type
             FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             WHERE pv.id = ? AND pv.is_active = TRUE FOR UPDATE`,
            [selection.variant_id]
          );
          const compVariant = (compRows as any[])[0];
          if (!compVariant) {
            throw new Error(`Komponen varian ID ${selection.variant_id} tidak ditemukan`);
          }

          const compAvailableStock = compVariant.stock - compVariant.stock_reserved;
          const requiredQty = (selection.quantity || 1) * item.quantity;
          if (compAvailableStock < requiredQty) {
            throw new Error(`Stok komponen ${compVariant.product_name} (${compVariant.size}${compVariant.color ? ` / ${compVariant.color}` : ""}) tidak cukup. Tersedia: ${compAvailableStock}`);
          }

          const compSku = compVariant.sku || (compVariant.sku_prefix ? `${compVariant.sku_prefix}-${compVariant.id}` : `VAR-${compVariant.id}`);
          resolvedItems.push({
            product_id: compVariant.product_id,
            variant_id: compVariant.id,
            product_name: `[KOMPONEN BUNDLE] ${compVariant.product_name}`,
            size: compVariant.size,
            color: compVariant.color || "Default",
            quantity: requiredQty,
            price: 0,
            subtotal: 0,
            skuSnapshot: compSku,
            bypassStockReservation: false
          });
        }
      }
    }

    // Validate voucher if provided
    let verifiedDiscountAmount = 0;
    let verifiedVoucherCode = null;

    if (details.voucherCode) {
      const normalizedCode = String(details.voucherCode).trim().toUpperCase();
      const [vRows] = await connection.execute(
        "SELECT * FROM vouchers WHERE code = ? FOR UPDATE",
        [normalizedCode]
      );
      const voucher = (vRows as any[])[0];

      if (!voucher) {
        throw new Error("Kode voucher tidak ditemukan atau tidak valid");
      }
      if (voucher.is_active !== 1) {
        throw new Error("Voucher ini sedang tidak aktif");
      }
      const now = new Date();
      const start = new Date(voucher.start_date);
      const end = new Date(voucher.end_date);
      if (now < start || now > end) {
        throw new Error("Voucher berada di luar periode masa berlaku");
      }
      if (voucher.stock <= 0) {
        throw new Error("Stok voucher ini telah habis");
      }
      if (calculatedSubtotal < voucher.min_purchase) {
        throw new Error(`Minimal pembelian untuk menggunakan voucher ini adalah Rp ${voucher.min_purchase.toLocaleString("id-ID")}`);
      }

      if (voucher.target_nim_prefix) {
        const orderUserId = details.userId;
        if (!orderUserId) {
          throw new Error("Login dibutuhkan untuk menggunakan voucher ini");
        }

        const [uRows] = await connection.execute(
          "SELECT is_filkom_verified, nim FROM users WHERE id = ?",
          [orderUserId]
        );
        const user = (uRows as any[])[0];

        if (!user || user.is_filkom_verified !== 1) {
          throw new Error("Voucher ini khusus untuk mahasiswa FILKOM yang sudah terverifikasi");
        }

        const cleanNim = (user.nim || "").trim();
        if (!cleanNim.startsWith(voucher.target_nim_prefix)) {
          throw new Error(`Voucher ini hanya berlaku untuk mahasiswa angkatan 20${voucher.target_nim_prefix}`);
        }
      }

      if (voucher.usage_limit_per_user && voucher.usage_limit_per_user > 0) {
        const orderUserId = details.userId;
        if (orderUserId) {
          const [usageRows] = await connection.execute(
            "SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND voucher_code = ? AND order_status != 'cancelled'",
            [orderUserId, voucher.code]
          );
          const usageCount = (usageRows as any[])[0]?.count || 0;
          if (usageCount >= voucher.usage_limit_per_user) {
            throw new Error(`Anda sudah melebihi batas penggunaan voucher ini (Maks ${voucher.usage_limit_per_user} kali)`);
          }
        }
      }

      if (voucher.discount_type === "percentage") {
        let calcDiscount = Math.round((calculatedSubtotal * voucher.discount_amount) / 100);
        if (voucher.max_discount !== null && voucher.max_discount > 0) {
          calcDiscount = Math.min(calcDiscount, voucher.max_discount);
        }
        verifiedDiscountAmount = Math.min(calcDiscount, calculatedSubtotal);
      } else {
        verifiedDiscountAmount = Math.min(voucher.discount_amount, calculatedSubtotal);
      }
      verifiedVoucherCode = voucher.code;

      // Decrement stock
      await connection.execute(
        "UPDATE vouchers SET stock = stock - 1 WHERE id = ?",
        [voucher.id]
      );
    }

    const shippingCost = Number(details.shippingCost) || 0;
    const serviceFee = Number(details.serviceFee) || 0;
    const taxAmount = Number(details.taxAmount) || 0;
    const discountAmount = verifiedVoucherCode ? verifiedDiscountAmount : (Number(details.discountAmount) || 0);
    const grossAmount = calculatedSubtotal - discountAmount + shippingCost + serviceFee + taxAmount;

    // 1. Insert order to database
    await connection.execute(
      `INSERT INTO orders (
        order_id, channel, fulfillment_type, fulfillment_status, user_id, customer_name,
        customer_nim, customer_email, customer_phone, shipping_address, subtotal,
        discount_amount, service_fee, shipping_cost, tax_amount, gross_amount,
        payment_status, order_status, notes, transaction_status, voucher_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        "pending",
        verifiedVoucherCode
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
      if (!item.bypassStockReservation && item.variant_id) {
        await reserveVariantStock(connection, item.variant_id, item.quantity, details.orderId, details.userId);
      }
    }

    // 3. Check payment mode from store settings
    const [storeSettingsRows] = await connection.execute("SELECT payment_mode, qris_static_url FROM store_settings LIMIT 1");
    const storeSettings = (storeSettingsRows as any[])[0];
    const paymentMode = storeSettings?.payment_mode ?? "mayar";

    let checkoutUrl: string | null = null;
    let qrUrl: string | null = null;

    if (paymentMode === "manual_qris") {
      console.log("ℹ️ Manual QRIS mode active, skipping Midtrans transaction generation");
      qrUrl = storeSettings?.qris_static_url || "";
      
      // Update order to set payment_type
      await connection.execute(
        "UPDATE orders SET payment_type = ? WHERE order_id = ?",
        ["manual_qris", details.orderId]
      );
    } else if (paymentMode === "mayar") {
      // ============ MAYAR INVOICE CREATION ============
      console.log("💳 Generating Mayar invoice for:", details.orderId);

      const mayarItems = resolvedItems
        .filter((item: any) => Number(item.price) > 0)
        .map((item: any) => ({
          description: `${item.product_name}${item.size ? ` (${item.size})` : ""}`.substring(0, 100),
          quantity: Number(item.quantity),
          rate: Number(item.price),
        }));

      if (shippingCost > 0) {
        mayarItems.push({ description: "Ongkos Kirim", quantity: 1, rate: shippingCost });
      }
      if (serviceFee > 0) {
        mayarItems.push({ description: "Biaya Layanan", quantity: 1, rate: serviceFee });
      }

      // Determine redirect URL preferring HTTPS domain (Ngrok or Production) to prevent Chrome PNA (Private Network Access) local block
      const origin = req.get("origin") || req.get("referer") || "";
      const forwardedHost = req.get("x-forwarded-host");
      let frontendUrl = "https://filkommerch.com";

      if (origin.startsWith("https://")) {
        frontendUrl = origin.replace(/\/$/, "");
      } else if (forwardedHost) {
        frontendUrl = `https://${forwardedHost}`;
      } else if (process.env.FRONTEND_URL) {
        const urls = process.env.FRONTEND_URL.split(",");
        const httpsUrl = urls.find((u) => u.trim().startsWith("https://"));
        if (httpsUrl) {
          frontendUrl = httpsUrl.trim();
        }
      }
      const redirectUrl = `${frontendUrl}/order-confirmation?orderId=${details.orderId}`;

      const mayarPayload = {
        name: details.customerName,
        email: details.customerEmail,
        mobile: details.customerPhone || "081200000000",
        redirectUrl,
        description: `Pesanan FILKOM Merch #${details.orderId}`,
        items: mayarItems,
        extraData: {
          orderId: details.orderId,
        },
      };

      const mayarResponse = await fetch(`${config.mayar.apiUrl}/invoice/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.mayar.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mayarPayload),
      });

      if (!mayarResponse.ok) {
        const errBody = await mayarResponse.text();
        console.error("❌ Mayar API error:", mayarResponse.status, errBody);
        throw new Error(`Gagal membuat invoice Mayar: ${mayarResponse.status}`);
      }

      const mayarResult = (await mayarResponse.json()) as { statusCode: number; messages: string; data?: { id?: string; link?: string; transactionId?: string } };
      console.log("✅ Mayar invoice created:", mayarResult.data?.id);

      checkoutUrl = mayarResult.data?.link || null;
      const mayarInvoiceId = mayarResult.data?.id || null;

      // Store Mayar checkout URL in snap_token column so continuation does not hit Mayar 429 rate limit
      await connection.execute(
        "UPDATE orders SET snap_token = ?, payment_type = ? WHERE order_id = ?",
        [checkoutUrl || mayarInvoiceId, "mayar", details.orderId]
      );
    } else {
      // Fallback: unknown payment mode — just proceed without gateway
      console.warn("⚠️ Unknown payment_mode:", paymentMode, "— skipping payment gateway");
    }

    // Record activity log
    await logActivity(
      details.userId || null,
      details.customerName || null,
      "customer",
      "create_order",
      "order",
      details.orderId,
      `Pesanan online dibuat untuk ${details.customerName} (${details.orderId})`
    );

    await connection.commit();

    return res.json({
      success: true,
      orderId: details.orderId,
      checkoutUrl: checkoutUrl,
      qrUrl: qrUrl,
      paymentMode: paymentMode
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

    const items = await query<any>(
      `SELECT oi.*, p.image_url 
       FROM order_items oi 
       LEFT JOIN products p ON p.id = oi.product_id 
       WHERE oi.order_id = ?`,
      [id]
    );
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
    const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const userName = req.header("x-user-name") || null;
    const userRole = req.header("x-user-role") || null;

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

    await logActivity(
      userId,
      userName,
      userRole,
      "create_category",
      "category",
      result.insertId,
      `Kategori "${name.trim()}" ditambahkan oleh ${userName || 'Sistem'}`
    );

    return res.json({ success: true, category: { id: result.insertId, name: name.trim(), slug, is_active: true } });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to create category" });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const userName = req.header("x-user-name") || null;
    const userRole = req.header("x-user-role") || null;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Nama kategori wajib diisi" });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const existing = await queryOne<any>("SELECT id FROM categories WHERE slug = ? AND id != ?", [slug, id]);
    if (existing) {
      return res.status(400).json({ success: false, error: "Kategori dengan nama serupa sudah ada" });
    }

    await execute(
      "UPDATE categories SET name = ?, slug = ? WHERE id = ?",
      [name.trim(), slug, id]
    );

    await logActivity(
      userId,
      userName,
      userRole,
      "update_category",
      "category",
      id,
      `Kategori "${name.trim()}" diperbarui oleh ${userName || 'Sistem'}`
    );

    return res.json({ success: true, category: { id: parseInt(id), name: name.trim(), slug } });
  } catch (error: any) {
    console.error("Error updating category:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update category" });
  }
};

// Delete category (soft delete)
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const userName = req.header("x-user-name") || null;
    const userRole = req.header("x-user-role") || null;
    
    // Soft delete by updating is_active to false
    await execute(
      "UPDATE categories SET is_active = FALSE WHERE id = ?",
      [id]
    );

    await logActivity(
      userId,
      userName,
      userRole,
      "delete_category",
      "category",
      id,
      `Kategori ID ${id} dinonaktifkan oleh ${userName || 'Sistem'}`
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete category" });
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
          "SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE",
          [product.id]
        );
        const images = await query<any>(
          "SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC",
          [product.id]
        );
        const imageUrls = images.length > 0 ? images.map((img: any) => img.image_url) : [product.image_url].filter(Boolean);
        
        let bundle_components: any[] = [];
        if (product.product_type === "bundle") {
          const comps = await query<any>(
            `SELECT p.* FROM products p
             JOIN bundle_items bi ON bi.component_product_id = p.id
             WHERE bi.bundle_product_id = ?`,
            [product.id]
          );
          bundle_components = await Promise.all(
            comps.map(async (comp: any) => {
              const compVariants = await query<any>(
                "SELECT * FROM product_variants WHERE product_id = ? AND is_active = TRUE",
                [comp.id]
              );
              return { ...comp, variants: compVariants };
            })
          );
        }
        
        return { ...product, variants, images: imageUrls, bundle_components };
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
    const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const userName = req.header("x-user-name") || null;
    const userRole = req.header("x-user-role") || null;
    
    // Set the first image from images array as main image_url if provided
    const mainImageUrl = input.images && input.images.length > 0 ? input.images[0] : (input.image_url || null);

    const result = await execute(
      `INSERT INTO products (
        category_id, name, slug, description, price, original_price, filkom_price, promo_price,
        sale_type, product_type, low_stock_threshold, is_best_seller, is_limited,
        preorder_start_at, preorder_end_at, preorder_moq, production_eta_days,
        image_url, is_active, bahan, asal, aplikasi, size_chart_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.category_id,
        input.name,
        input.slug,
        input.description || null,
        input.price,
        input.original_price || null,
        input.filkom_price || null,
        input.promo_price || null,
        input.sale_type || 'ready_stock',
        input.product_type || 'apparel',
        input.low_stock_threshold ?? 5,
        input.is_best_seller ? 1 : 0,
        input.is_limited ? 1 : 0,
        input.preorder_start_at || null,
        input.preorder_end_at || null,
        input.preorder_moq || null,
        input.production_eta_days || null,
        mainImageUrl,
        input.is_active ?? true,
        input.bahan || null,
        input.asal || null,
        input.aplikasi || null,
        input.size_chart_url || null,
      ]
    );

    const productId = result.insertId;

    // Insert variants
    for (const variant of input.variants) {
      await execute(
        "INSERT INTO product_variants (product_id, size, color, stock, filkom_price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        [productId, variant.size || "One Size", variant.color || "", variant.stock || 0, variant.filkom_price || null, variant.image_url || null]
      );
    }

    // Insert multiple product images
    if (input.images && Array.isArray(input.images)) {
      for (let i = 0; i < input.images.length; i++) {
        await execute(
          `INSERT INTO product_images (product_id, image_url, sort_order, is_primary, alt_text)
           VALUES (?, ?, ?, ?, ?)`,
          [productId, input.images[i], i, i === 0 ? 1 : 0, input.name]
        );
      }
    }

    // Insert bundle components
    if (input.product_type === 'bundle' && input.component_ids && Array.isArray(input.component_ids)) {
      for (const compId of input.component_ids) {
        await execute(
          "INSERT INTO bundle_items (bundle_product_id, component_product_id, quantity) VALUES (?, ?, 1)",
          [productId, compId]
        );
      }
    }

    await logActivity(
      userId,
      userName,
      userRole,
      "create_product",
      "product",
      productId,
      `Produk "${input.name}" ditambahkan oleh ${userName || 'Sistem'}`
    );

    return res.json({ success: true, product_id: productId });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create product",
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const userName = req.header("x-user-name") || null;
    const userRole = req.header("x-user-role") || null;
    
    // Set the first image from images array as main image_url if provided
    const mainImageUrl = input.images && input.images.length > 0 ? input.images[0] : (input.image_url || null);

    await execute(
      `UPDATE products 
       SET category_id = ?, name = ?, slug = ?, description = ?, price = ?, original_price = ?, filkom_price = ?, promo_price = ?,
           sale_type = ?, product_type = ?, low_stock_threshold = ?, is_best_seller = ?, is_limited = ?,
           preorder_start_at = ?, preorder_end_at = ?, preorder_moq = ?, production_eta_days = ?,
           image_url = ?, is_active = ?, bahan = ?, asal = ?, aplikasi = ?, size_chart_url = ? 
       WHERE id = ?`,
      [
        input.category_id,
        input.name,
        input.slug,
        input.description || null,
        input.price,
        input.original_price || null,
        input.filkom_price || null,
        input.promo_price || null,
        input.sale_type || 'ready_stock',
        input.product_type || 'apparel',
        input.low_stock_threshold ?? 5,
        input.is_best_seller ? 1 : 0,
        input.is_limited ? 1 : 0,
        input.preorder_start_at || null,
        input.preorder_end_at || null,
        input.preorder_moq || null,
        input.production_eta_days || null,
        mainImageUrl,
        input.is_active ?? true,
        input.bahan || null,
        input.asal || null,
        input.aplikasi || null,
        input.size_chart_url || null,
        input.id,
      ]
    );

    // Synchronize variants rather than DELETE + INSERT to avoid foreign key restrict failures on stock_movements
    await execute("UPDATE product_variants SET is_active = FALSE WHERE product_id = ?", [input.id]);
    
    for (const variant of input.variants) {
      const existing = await queryOne<any>(
        "SELECT id FROM product_variants WHERE product_id = ? AND size = ? AND COALESCE(color, '') = COALESCE(?, '') LIMIT 1",
        [input.id, variant.size || "One Size", variant.color || ""]
      );

      if (existing) {
        await execute(
          "UPDATE product_variants SET stock = ?, filkom_price = ?, image_url = ?, is_active = TRUE WHERE id = ?",
          [variant.stock || 0, variant.filkom_price || null, variant.image_url || null, existing.id]
        );
      } else {
        await execute(
          "INSERT INTO product_variants (product_id, size, color, stock, filkom_price, image_url, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)",
          [input.id, variant.size || "One Size", variant.color || "", variant.stock || 0, variant.filkom_price || null, variant.image_url || null]
        );
      }
    }

    // Synchronize product images
    if (input.images && Array.isArray(input.images)) {
      // Clear old images first
      await execute("DELETE FROM product_images WHERE product_id = ?", [input.id]);
      
      // Insert new images
      for (let i = 0; i < input.images.length; i++) {
        await execute(
          `INSERT INTO product_images (product_id, image_url, sort_order, is_primary, alt_text)
           VALUES (?, ?, ?, ?, ?)`,
          [input.id, input.images[i], i, i === 0 ? 1 : 0, input.name]
        );
      }
    }

    // Sync bundle components
    await execute("DELETE FROM bundle_items WHERE bundle_product_id = ?", [input.id]);
    if (input.product_type === 'bundle' && input.component_ids && Array.isArray(input.component_ids)) {
      for (const compId of input.component_ids) {
        await execute(
          "INSERT INTO bundle_items (bundle_product_id, component_product_id, quantity) VALUES (?, ?, 1)",
          [input.id, compId]
        );
      }
    }

    await logActivity(
      userId,
      userName,
      userRole,
      "update_product",
      "product",
      input.id,
      `Produk "${input.name}" diperbarui oleh ${userName || 'Sistem'}`
    );

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
    const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const userName = req.header("x-user-name") || null;
    const userRole = req.header("x-user-role") || null;

    await execute("UPDATE products SET is_active = FALSE WHERE id = ?", [id]);

    await logActivity(
      userId,
      userName,
      userRole,
      "delete_product",
      "product",
      id,
      `Produk ID ${id} dinonaktifkan oleh ${userName || 'Sistem'}`
    );

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
    const { status, shipping_address, notes } = req.body;

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

    const isNowPaid = status === "settlement" || status === "completed" || status === "ready_for_pickup" || status === "shipped";
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
    } else if (status === "ready_for_pickup") {
      paymentStatus = "paid";
      orderStatus = "ready_for_pickup";
      fulfillmentStatus = "ready_for_pickup";
    } else if (status === "shipped") {
      paymentStatus = "paid";
      orderStatus = "shipped";
      fulfillmentStatus = "shipped";
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

    const updateFields: string[] = ["transaction_status = ?", "payment_status = ?", "order_status = ?", "fulfillment_status = ?"];
    const updateParams: any[] = [status, paymentStatus, orderStatus, fulfillmentStatus];

    if (shipping_address !== undefined) {
      updateFields.push("shipping_address = ?");
      updateParams.push(shipping_address);
    }
    if (notes !== undefined) {
      updateFields.push("notes = ?");
      updateParams.push(notes);
    }

    updateParams.push(id);
    await connection.execute(
      `UPDATE orders SET ${updateFields.join(", ")} WHERE order_id = ?`,
      updateParams
    );

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

// Verify QRIS payment proof (Admin)
export const verifyPaymentProof = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const { id } = req.params;
    const { isAccepted, note } = req.body;
    const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const userName = req.header("x-user-name") || null;
    const userRole = req.header("x-user-role") || null;

    await connection.beginTransaction();

    // Lock the order for update
    const [orderRows] = await connection.execute(
      "SELECT payment_status, order_status, fulfillment_status FROM orders WHERE order_id = ? FOR UPDATE",
      [id]
    );
    const order = (orderRows as any[])[0];

    if (!order) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Order tidak ditemukan" });
    }

    if (isAccepted) {
      const wasUnpaid = order.payment_status !== "paid";

      await connection.execute(
        `UPDATE orders 
         SET transaction_status = 'settlement', 
             payment_status = 'paid', 
             order_status = 'processing', 
             fulfillment_status = 'processing',
             payment_proof_note = NULL 
         WHERE order_id = ?`,
        [id]
      );

      // Trigger stock deduction if transitioning to paid manually
      if (wasUnpaid) {
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
               VALUES (?, 'reservation_release', ?, ?, ?, 'order', ?, 'Pelepasan reservasi stok (verifikasi QRIS)')`,
              [item.variant_id, -item.quantity, curStock, curStock, id]
            );
            await connection.execute(
              `INSERT INTO stock_movements (variant_id, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, notes) 
               VALUES (?, 'sale', ?, ?, ?, 'order', ?, 'Penjualan selesai (verifikasi QRIS)')`,
              [item.variant_id, -item.quantity, curStock + item.quantity, curStock, id]
            );
          }
        }
      }

      await logActivity(
        userId,
        userName,
        userRole,
        "verify_payment_accept",
        "order",
        id,
        `Pembayaran QRIS untuk Order ID ${id} diterima dan pesanan mulai diproses oleh ${userName || 'Sistem'}`
      );
    } else {
      // Reject: set payment status to unpaid, order status to pending_payment, clear payment_proof_url, and set payment_proof_note
      await connection.execute(
        `UPDATE orders 
         SET transaction_status = 'pending', 
             payment_status = 'pending', 
             order_status = 'pending_payment', 
             payment_proof_url = NULL, 
             payment_proof_note = ? 
         WHERE order_id = ?`,
        [note || "Bukti pembayaran tidak sesuai", id]
      );

      await logActivity(
        userId,
        userName,
        userRole,
        "verify_payment_reject",
        "order",
        id,
        `Pembayaran QRIS untuk Order ID ${id} ditolak dengan catatan: "${note}" oleh ${userName || 'Sistem'}`
      );
    }

    await connection.commit();
    return res.json({ success: true });
  } catch (error: any) {
    await connection.rollback();
    console.error("Error verifying payment proof:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to verify payment proof" });
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
    const customerEmail = input.customer_email || "pos@filkommerch.com";
    let isUb = isUbEmail(customerEmail);
    if (input.customer_email) {
      const [userRows] = await connection.execute(
        "SELECT is_filkom_verified FROM users WHERE email = ?",
        [input.customer_email]
      );
      const userRow = (userRows as any[])[0];
      if (userRow && userRow.is_filkom_verified === 1) {
        isUb = true;
      }
    }

    for (const item of input.items) {
      const variantId = item.variant_id;
      if (!variantId) {
        throw new Error(`Variant ID wajib diisi untuk item: ${item.product_name}`);
      }

      // Query variant joined with product info
      const [rows] = await connection.execute(
        `SELECT pv.*, p.name AS product_name, p.price AS product_price, p.sku_prefix,
                p.filkom_price AS product_filkom_price, p.promo_price AS product_promo_price
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
      if (variant.product_type !== 'bundle') {
        const availableStock = variant.stock - variant.stock_reserved;
        if (availableStock < item.quantity) {
          throw new Error(`Stok tidak cukup untuk ${variant.product_name}. Tersedia: ${availableStock}`);
        }
      }

      const price = determinePrice(variant, isUb);
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
        skuSnapshot: skuSnapshot,
        bypassStockDeduction: variant.product_type === 'bundle'
      });

      // If it is a bundle, resolve and validate stock for component variants
      if (variant.product_type === 'bundle') {
        if (!item.bundle_selections || !Array.isArray(item.bundle_selections)) {
          throw new Error(`Detail pilihan komponen wajib disertakan untuk bundel: ${variant.product_name}`);
        }

        for (const selection of item.bundle_selections) {
          const [compRows] = await connection.execute(
            `SELECT pv.*, p.name AS product_name, p.price AS product_price, p.sku_prefix, p.product_type
             FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             WHERE pv.id = ? AND pv.is_active = TRUE FOR UPDATE`,
            [selection.variant_id]
          );
          const compVariant = (compRows as any[])[0];
          if (!compVariant) {
            throw new Error(`Komponen varian ID ${selection.variant_id} tidak ditemukan`);
          }

          const compAvailableStock = compVariant.stock - compVariant.stock_reserved;
          const requiredQty = (selection.quantity || 1) * item.quantity;
          if (compAvailableStock < requiredQty) {
            throw new Error(`Stok komponen ${compVariant.product_name} (${compVariant.size}${compVariant.color ? ` / ${compVariant.color}` : ""}) tidak cukup. Tersedia: ${compAvailableStock}`);
          }

          const compSku = compVariant.sku || (compVariant.sku_prefix ? `${compVariant.sku_prefix}-${compVariant.id}` : `VAR-${compVariant.id}`);
          resolvedItems.push({
            product_id: compVariant.product_id,
            variant_id: compVariant.id,
            product_name: `[KOMPONEN BUNDLE] ${compVariant.product_name}`,
            size: compVariant.size,
            color: compVariant.color || "Default",
            quantity: requiredQty,
            price: 0,
            subtotal: 0,
            skuSnapshot: compSku,
            bypassStockDeduction: false
          });
        }
      }
    }

    const discountAmount = Number(input.discount) || 0;
    const taxAmount = Number(input.tax) || 0;
    const grossAmount = calculatedSubtotal - discountAmount + taxAmount;

    // 1. Create order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        order_id, channel, fulfillment_type, fulfillment_status, cashier_id, customer_name,
        customer_email, customer_phone, subtotal, discount_amount, tax_amount, gross_amount,
        payment_status, order_status, notes, transaction_status
      ) VALUES (?, 'pos', 'walk_in', 'completed', ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'completed', ?, 'settlement')`,
      [
        saleId,
        input.admin_id || null,
        input.customer_name || "Pelanggan POS",
        customerEmail,
        input.customer_phone || "081234567890",
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

      if (!item.bypassStockDeduction) {
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

    // Record activity log for POS sale
    await logActivity(
      input.admin_id || null,
      "Kasir POS",
      "cashier",
      "create_sale",
      "order",
      saleId,
      `Transaksi POS langsung dibuat oleh Kasir (${saleId})`
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
        payment_mode: "midtrans",
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
    const actorId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
    const actorName = req.header("x-user-name") || null;
    const actorRole = req.header("x-user-role") || null;

    const existing = await queryOne<any>("SELECT * FROM store_settings LIMIT 1");
    const homepageLayoutToSave =
      input.homepage_layout !== undefined
        ? input.homepage_layout
        : existing?.homepage_layout ?? null;

    if (existing) {
      await execute(
        `UPDATE store_settings SET store_name = ?, address = ?, phone = ?,
         tax_rate = ?, qris_static_url = ?, homepage_layout = ?, payment_mode = ? WHERE id = ?`,
        [
          input.store_name !== undefined ? input.store_name : existing.store_name,
          input.address !== undefined ? (input.address || null) : existing.address,
          input.phone !== undefined ? (input.phone || null) : existing.phone,
          input.tax_rate !== undefined ? input.tax_rate : existing.tax_rate,
          input.qris_static_url !== undefined ? (input.qris_static_url || null) : existing.qris_static_url,
          homepageLayoutToSave,
          input.payment_mode !== undefined ? (input.payment_mode || "midtrans") : existing.payment_mode,
          existing.id,
        ]
      );
    } else {
      await execute(
        `INSERT INTO store_settings (store_name, address, phone, tax_rate, qris_static_url, homepage_layout, payment_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.store_name || "FILKOM Merch",
          input.address || null,
          input.phone || null,
          input.tax_rate ?? 0,
          input.qris_static_url || null,
          homepageLayoutToSave,
          input.payment_mode || "midtrans",
        ]
      );
    }

    await logActivity(
      actorId,
      actorName,
      actorRole,
      "update_settings",
      "settings",
      existing ? existing.id : 1,
      `Pengaturan toko diperbarui oleh ${actorName || 'Sistem'}`
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating store settings:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update settings",
    });
  }
};

// Get activity logs (Admin only)
export const getActivityLogs = async (req: Request, res: Response) => {
  try {
    const logs = await query<any>(
      `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 500`
    );
    return res.json({ success: true, logs });
  } catch (error: any) {
    console.error("Error getting activity logs:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch activity logs" });
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
    const limit = Number.isFinite(Number(req.query.limit)) ? Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10))) : 10;
    const days = Number.isFinite(Number(req.query.days)) ? Math.max(1, Math.min(365, parseInt(req.query.days as string, 10))) : 30;
    
    const products = await query<any>(
      `SELECT p.id, p.name,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
        COALESCE(SUM(oi.subtotal), 0) AS total_revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.order_id = oi.order_id
       WHERE o.payment_status = 'paid' AND o.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
       GROUP BY p.id, p.name
       ORDER BY total_quantity_sold DESC
       LIMIT ${limit}`
    );

    return res.json({ success: true, products });
  } catch (error: any) {
    console.error("Error fetching top products:", error);
    return res.status(500).json({
      success: false,
      products: [],
      error: error.message || "Failed to fetch products",
    });
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
      `SELECT oi.*, p.image_url 
       FROM order_items oi 
       LEFT JOIN products p ON p.id = oi.product_id 
       WHERE oi.order_id IN (${placeholders})`,
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

// Submit payment proof
export const submitPaymentProof = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentProofUrl } = req.body;

    if (!paymentProofUrl) {
      return res.status(400).json({ success: false, error: "Bukti pembayaran wajib diunggah" });
    }

    await execute(
      "UPDATE orders SET payment_proof_url = ?, transaction_status = 'pending', payment_status = 'pending', payment_proof_note = NULL WHERE order_id = ?",
      [paymentProofUrl, id]
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error submitting payment proof:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to submit payment proof" });
  }
};

// ============ PRE-ORDER CAMPAIGNS ============

export const getPreOrderCampaigns = async (req: Request, res: Response) => {
  try {
    const campaigns = await query("SELECT * FROM pre_order_campaigns ORDER BY created_at DESC");
    return res.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error("Error fetching pre-order campaigns:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllPreOrderCampaigns = async (req: Request, res: Response) => {
  try {
    const campaigns = await query("SELECT * FROM pre_order_campaigns ORDER BY id DESC");
    return res.json({ success: true, data: campaigns || [] });
  } catch (error: any) {
    console.error("Error fetching pre-order campaigns:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getActivePreOrderCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await queryOne("SELECT * FROM pre_order_campaigns WHERE is_active = 1 ORDER BY id DESC LIMIT 1");
    return res.json({ success: true, data: campaign || null });
  } catch (error: any) {
    console.error("Error fetching active pre-order campaign:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createPreOrderCampaign = async (req: Request, res: Response) => {
  try {
    const { batch_name, start_date, end_date, extended_end_date, is_active, description } = req.body;
    if (!batch_name || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: "Nama batch, tanggal mulai, dan tanggal selesai wajib diisi" });
    }

    if (is_active) {
      await execute("UPDATE pre_order_campaigns SET is_active = 0");
    }

    const result = await execute(
      `INSERT INTO pre_order_campaigns (batch_name, start_date, end_date, extended_end_date, is_active, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [batch_name, start_date, end_date, extended_end_date || null, is_active ? 1 : 0, description || null]
    );

    return res.json({ success: true, id: (result as any).insertId, message: "Campaign Pre-Order berhasil dibuat" });
  } catch (error: any) {
    console.error("Error creating pre-order campaign:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePreOrderCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { batch_name, start_date, end_date, extended_end_date, is_active, description } = req.body;

    if (!batch_name || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: "Nama batch, tanggal mulai, dan tanggal selesai wajib diisi" });
    }

    if (is_active) {
      await execute("UPDATE pre_order_campaigns SET is_active = 0 WHERE id != ?", [id]);
    }

    await execute(
      `UPDATE pre_order_campaigns 
       SET batch_name = ?, start_date = ?, end_date = ?, extended_end_date = ?, is_active = ?, description = ?
       WHERE id = ?`,
      [batch_name, start_date, end_date, extended_end_date || null, is_active ? 1 : 0, description || null, id]
    );

    return res.json({ success: true, message: "Campaign Pre-Order berhasil diperbarui" });
  } catch (error: any) {
    console.error("Error updating pre-order campaign:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const togglePreOrderCampaignActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    if (is_active) {
      await execute("UPDATE pre_order_campaigns SET is_active = 0 WHERE id != ?", [id]);
    }
    await execute("UPDATE pre_order_campaigns SET is_active = ? WHERE id = ?", [is_active ? 1 : 0, id]);
    return res.json({ success: true, message: "Status batch berhasil diubah" });
  } catch (error: any) {
    console.error("Error toggling pre-order campaign active status:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePreOrderCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute("DELETE FROM pre_order_campaigns WHERE id = ?", [id]);
    return res.json({ success: true, message: "Campaign Pre-Order berhasil dihapus" });
  } catch (error: any) {
    console.error("Error deleting pre-order campaign:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============ MAYAR WEBHOOK HANDLER ============

export const handleMayarWebhook = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const payload = req.body;
    console.log("🔔 Mayar webhook received:", JSON.stringify(payload).substring(0, 500));

    // 1. Verify webhook token
    const webhookToken = config.mayar.webhookToken;
    const receivedToken = req.headers["x-callback-token"] || req.headers["x-mayar-token"] || payload?.token;

    if (webhookToken && receivedToken !== webhookToken) {
      console.error("❌ [SECURITY] Invalid Mayar webhook token");
      return res.status(403).json({ error: "Invalid webhook token" });
    }

    // 2. Check event type — accept all variations of successful payment events
    const event = (payload?.event || payload?.type || "").toLowerCase();
    const status = (payload?.data?.status || payload?.status || "").toUpperCase();
    const isPaidEvent =
      event.includes("payment.received") ||
      event.includes("payment.success") ||
      event.includes("invoice.paid") ||
      event.includes("paid") ||
      status === "PAID" ||
      status === "SUCCESS" ||
      status === "SETTLEMENT";

    if (!isPaidEvent) {
      console.log(`ℹ️ Ignoring non-payment Mayar webhook event: ${event}, status: ${status}`);
      return res.status(200).json({ success: true, message: "Event ignored" });
    }

    // 3. Extract order info from Mayar payload
    const invoiceData = payload?.data || payload;
    if (!invoiceData) {
      console.warn("⚠️ No data in Mayar webhook payload");
      return res.status(200).json({ success: true, message: "No data" });
    }

    const orderIdFromPayload = invoiceData?.extraData?.orderId || payload?.extraData?.orderId;
    const mayarInvoiceId = invoiceData?.id || null;
    const mayarLink = invoiceData?.link || null;
    const transactionId = invoiceData?.transactionId || invoiceData?.transaction?.id || invoiceData?.id || null;

    await connection.beginTransaction();

    let order: any = null;

    // Search 1: via extraData orderId
    if (orderIdFromPayload) {
      const [rows] = await connection.execute(
        "SELECT id, order_id, user_id, channel, fulfillment_status, payment_status, order_status FROM orders WHERE order_id = ? FOR UPDATE",
        [orderIdFromPayload]
      );
      order = (rows as any[])[0];
    }

    // Search 2: via snap_token exact match or substring
    if (!order && mayarInvoiceId) {
      const [rows] = await connection.execute(
        "SELECT id, order_id, user_id, channel, fulfillment_status, payment_status, order_status FROM orders WHERE snap_token = ? OR snap_token = ? OR (snap_token IS NOT NULL AND snap_token LIKE ?) FOR UPDATE",
        [mayarInvoiceId, mayarLink, `%${mayarInvoiceId}%`]
      );
      order = (rows as any[])[0];
    }

    // Search 3: via description regex matching (e.g. #FILKOM-12345678)
    if (!order) {
      const desc = invoiceData?.description || payload?.description || "";
      const match = desc.match(/FILKOM-\d+/);
      if (match) {
        const extractedOrderId = match[0];
        const [rows] = await connection.execute(
          "SELECT id, order_id, user_id, channel, fulfillment_status, payment_status, order_status FROM orders WHERE order_id = ? FOR UPDATE",
          [extractedOrderId]
        );
        order = (rows as any[])[0];
      }
    }

    if (!order) {
      console.warn("⚠️ Order not found for Mayar invoice:", mayarInvoiceId);
      await connection.rollback();
      return res.status(200).json({ success: true, message: "Order not found, skipped" });
    }

    const orderId = order.order_id;

    // Check if already paid
    if (order.payment_status === "paid") {
      console.log(`ℹ️ Order ${orderId} already marked as paid, skipping.`);
      await connection.rollback();
      return res.status(200).json({ success: true, message: "Already processed" });
    }

    // 4. Update payments table
    const [existingPaymentRows] = await connection.execute(
      "SELECT id, status FROM payments WHERE order_id = ? AND provider = 'mayar' LIMIT 1 FOR UPDATE",
      [orderId]
    );
    const existingPayment = (existingPaymentRows as any[])[0];
    const paidAt = new Date();

    if (existingPayment) {
      await connection.execute(
        `UPDATE payments SET 
          status = 'paid', provider_transaction_id = ?, paid_at = ?, raw_callback_json = ?, updated_at = NOW()
         WHERE id = ?`,
        [transactionId, paidAt, JSON.stringify(payload), existingPayment.id]
      );
    } else {
      await connection.execute(
        `INSERT INTO payments (
          order_id, provider, payment_method, amount, status, provider_transaction_id, paid_at, raw_callback_json
        ) VALUES (?, 'mayar', 'mayar', ?, 'paid', ?, ?, ?)`,
        [orderId, invoiceData?.amount || 0, transactionId, paidAt, JSON.stringify(payload)]
      );
    }

    // 5. Update orders table
    let orderStatus = 'paid';
    let fulfillmentStatus = order.fulfillment_status;
    if (order.channel === 'pos') {
      orderStatus = 'completed';
      fulfillmentStatus = 'completed';
    }

    await connection.execute(
      `UPDATE orders SET 
        payment_status = 'paid', order_status = ?, fulfillment_status = ?, payment_type = 'mayar',
        transaction_status = 'settlement', midtrans_transaction_id = ?, updated_at = NOW()
       WHERE order_id = ?`,
      [orderStatus, fulfillmentStatus, transactionId, orderId]
    );

    // 6. Handle stock — release reservations + deduct physical stock
    const [items] = await connection.execute(
      "SELECT variant_id, quantity FROM order_items WHERE order_id = ?",
      [orderId]
    );
    const orderItemsList = items as any[];

    for (const item of orderItemsList) {
      if (item.variant_id) {
        // Deduct physical stock
        await connection.execute(
          "UPDATE product_variants SET stock = stock - ? WHERE id = ?",
          [item.quantity, item.variant_id]
        );
        // Release stock reservation
        await connection.execute(
          "UPDATE product_variants SET stock_reserved = GREATEST(0, CAST(stock_reserved AS SIGNED) - ?) WHERE id = ?",
          [item.quantity, item.variant_id]
        );

        // Log stock movements
        const [vRows] = await connection.execute(
          "SELECT stock FROM product_variants WHERE id = ?",
          [item.variant_id]
        );
        const curStock = (vRows as any[])[0]?.stock || 0;
        await connection.execute(
          `INSERT INTO stock_movements (
            variant_id, movement_type, quantity_change, stock_before, stock_after,
            reference_type, reference_id, created_by, notes
          ) VALUES (?, 'sale', ?, ?, ?, 'order', ?, NULL, 'Pembayaran Mayar berhasil')`,
          [item.variant_id, -item.quantity, curStock + item.quantity, curStock, orderId]
        );
      }
    }

    await connection.commit();
    console.log(`✅ Mayar webhook processed: Order ${orderId} marked as PAID`);
    return res.status(200).json({ success: true, message: "Payment processed successfully" });

  } catch (error: any) {
    await connection.rollback();
    console.error("❌ Error processing Mayar webhook:", error);
    return res.status(500).json({ error: error.message || "Webhook processing failed" });
  } finally {
    connection.release();
  }
};

// ============ REGENERATE PAYMENT TOKEN / MAYAR INVOICE ============

export const regeneratePaymentToken = async (req: Request, res: Response) => {
  const connection = await getConnection();
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "Order ID wajib diisi" });
    }

    console.log("🔄 Regenerating Mayar payment link for order:", orderId);

    const [orderRows] = await connection.execute(
      "SELECT * FROM orders WHERE order_id = ?",
      [orderId]
    );
    const order = (orderRows as any[])[0];

    if (!order) {
      return res.status(404).json({ success: false, error: "Pesanan tidak ditemukan" });
    }

    if (order.payment_status === "paid") {
      return res.status(400).json({ success: false, error: "Pesanan ini sudah dibayar" });
    }

    // Reuse existing valid Mayar checkout URL if already generated to avoid hitting 429 rate limit
    if (order.snap_token && (order.snap_token.startsWith("http://") || order.snap_token.startsWith("https://"))) {
      console.log("⚡ Returning existing cached Mayar checkout URL for order:", orderId);
      return res.json({
        success: true,
        token: order.snap_token,
        checkoutUrl: order.snap_token,
        redirectUrl: order.snap_token,
      });
    }

    // Fetch order items to create a fresh invoice if needed
    const [itemRows] = await connection.execute(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId]
    );
    const items = itemRows as any[];

    const mayarItems = items.map((item: any) => ({
      description: `${item.product_name}${item.size ? ` (${item.size})` : ""}`.substring(0, 100),
      quantity: Number(item.quantity),
      rate: Number(item.unit_price),
    }));

    if (Number(order.shipping_cost) > 0) {
      mayarItems.push({ description: "Ongkos Kirim", quantity: 1, rate: Number(order.shipping_cost) });
    }
    if (Number(order.service_fee) > 0) {
      mayarItems.push({ description: "Biaya Layanan", quantity: 1, rate: Number(order.service_fee) });
    }

    const origin = req.get("origin") || req.get("referer") || "";
    const forwardedHost = req.get("x-forwarded-host");
    let frontendUrl = "https://filkommerch.com";

    if (origin.startsWith("https://")) {
      frontendUrl = origin.replace(/\/$/, "");
    } else if (forwardedHost) {
      frontendUrl = `https://${forwardedHost}`;
    } else if (process.env.FRONTEND_URL) {
      const urls = process.env.FRONTEND_URL.split(",");
      const httpsUrl = urls.find((u) => u.trim().startsWith("https://"));
      if (httpsUrl) {
        frontendUrl = httpsUrl.trim();
      }
    }
    const redirectUrl = `${frontendUrl}/order-confirmation?orderId=${orderId}`;

    const mayarPayload = {
      name: order.customer_name,
      email: order.customer_email,
      mobile: order.customer_phone || "081200000000",
      redirectUrl,
      description: `Pesanan FILKOM Merch #${orderId}`,
      items: mayarItems,
      extraData: {
        orderId,
      },
    };

    let mayarResponse: globalThis.Response;
    try {
      mayarResponse = await fetch(`${config.mayar.apiUrl}/invoice/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.mayar.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mayarPayload),
      });
    } catch (e: any) {
      if (order.snap_token && (order.snap_token.startsWith("http://") || order.snap_token.startsWith("https://"))) {
        return res.json({ success: true, token: order.snap_token, checkoutUrl: order.snap_token });
      }
      throw e;
    }

    if (!mayarResponse.ok) {
      const errBody = await mayarResponse.text();
      console.error("❌ Mayar API error in regenerateToken:", mayarResponse.status, errBody);

      // Handle 429 Rate Limit gracefully if we have any fallback
      if (mayarResponse.status === 429 && order.snap_token) {
        console.warn("⚠️ Mayar rate limited (429), returning stored snap_token fallback");
        return res.json({
          success: true,
          token: order.snap_token,
          checkoutUrl: order.snap_token,
          redirectUrl: order.snap_token,
        });
      }

      throw new Error(
        mayarResponse.status === 429
          ? "Terlalu banyak permintaan pembayaran dalam waktu singkat. Silakan tunggu 1-2 menit lalu coba lagi."
          : `Gagal membuat invoice Mayar: ${mayarResponse.status}`
      );
    }

    const mayarResult = (await mayarResponse.json()) as any;
    const checkoutUrl = mayarResult.data?.link || null;
    const mayarInvoiceId = mayarResult.data?.id || null;

    if (!checkoutUrl) {
      throw new Error("Tautan pembayaran tidak diterima dari server Mayar");
    }

    // Update order with new Mayar checkout URL
    await connection.execute(
      "UPDATE orders SET snap_token = ?, payment_type = 'mayar' WHERE order_id = ?",
      [checkoutUrl, orderId]
    );

    return res.json({
      success: true,
      token: checkoutUrl,
      checkoutUrl: checkoutUrl,
      redirectUrl: checkoutUrl,
    });
  } catch (error: any) {
    console.error("❌ Error regenerating Mayar invoice:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Gagal membuat tautan pembayaran Mayar",
    });
  } finally {
    connection.release();
  }
};

// Get unified orders summary for dashboard (sales, products, variants, sizes, buyers)
export const getOrdersSummary = async (req: Request, res: Response) => {
  try {
    const days = req.query.days as string || "30";
    
    let dateConstraint = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    
    if (days === "today") {
      dateConstraint = "created_at >= CURDATE()";
    } else if (days === "7") {
      dateConstraint = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } else if (days === "30") {
      dateConstraint = "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    } else if (days === "365") {
      dateConstraint = "created_at >= DATE_SUB(NOW(), INTERVAL 365 DAY)";
    } else if (days === "all") {
      dateConstraint = "1=1";
    }

    // 1. General financial and order summary
    const summary = await queryOne<any>(
      `SELECT 
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS total_orders,
        COUNT(CASE WHEN payment_status = 'paid' AND channel = 'online' THEN 1 END) AS online_orders,
        COUNT(CASE WHEN payment_status = 'paid' AND channel = 'pos' THEN 1 END) AS pos_orders,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN gross_amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' AND channel = 'online' THEN gross_amount ELSE 0 END), 0) AS online_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' AND channel = 'pos' THEN gross_amount ELSE 0 END), 0) AS pos_revenue,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN discount_amount ELSE 0 END), 0) AS total_discount,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN tax_amount ELSE 0 END), 0) AS total_tax,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN subtotal ELSE 0 END), 0) AS total_subtotal
       FROM orders
       WHERE ${dateConstraint}`
    );

    // 2. Product and Variant Sales Breakdown
    const productRows = await query<any>(
      `SELECT 
        oi.product_id,
        oi.product_name,
        oi.variant_id,
        oi.size,
        oi.color,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.subtotal) AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.order_id = oi.order_id
       WHERE o.payment_status = 'paid' AND o.${dateConstraint}
       GROUP BY oi.product_id, oi.product_name, oi.variant_id, oi.size, oi.color
       ORDER BY total_quantity DESC`
    );

    // Group product breakdown in JavaScript
    const productMap = new Map();
    for (const row of productRows) {
      const pid = row.product_id || 0;
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          product_id: pid,
          product_name: row.product_name || "Produk Tidak Dikenal",
          total_quantity: 0,
          total_revenue: 0,
          variants: [],
          sizes: {},
          colors: {}
        });
      }
      const prod = productMap.get(pid);
      prod.total_quantity += Number(row.total_quantity);
      prod.total_revenue += Number(row.total_revenue);

      prod.variants.push({
        variant_id: row.variant_id,
        size: row.size,
        color: row.color || "Default",
        quantity: Number(row.total_quantity),
        revenue: Number(row.total_revenue)
      });

      if (row.size) {
        prod.sizes[row.size] = (prod.sizes[row.size] || 0) + Number(row.total_quantity);
      }
      if (row.color) {
        prod.colors[row.color] = (prod.colors[row.color] || 0) + Number(row.total_quantity);
      }
    }
    const productsSummary = Array.from(productMap.values());

    // 3. Buyer Purchase Summary
    const buyerRows = await query<any>(
      `SELECT 
        customer_name,
        customer_email,
        customer_phone,
        customer_nim,
        COUNT(id) AS total_orders,
        SUM(gross_amount) AS total_spent
       FROM orders
       WHERE payment_status = 'paid' AND ${dateConstraint}
       GROUP BY customer_email, customer_name, customer_phone, customer_nim
       ORDER BY total_spent DESC`
    );

    const buyerItemRows = await query<any>(
      `SELECT 
        o.customer_email,
        o.customer_name,
        oi.product_name,
        oi.size,
        oi.color,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.subtotal) AS total_spent
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.payment_status = 'paid' AND o.${dateConstraint}
       GROUP BY o.customer_email, o.customer_name, oi.product_name, oi.size, oi.color`
    );

    const buyerMap = new Map();
    for (const row of buyerRows) {
      const email = row.customer_email || "guest@filkommerch.com";
      const name = row.customer_name || "Pelanggan";
      const key = `${email.toLowerCase()}_${name.toLowerCase()}`;
      buyerMap.set(key, {
        customer_name: name,
        customer_email: email,
        customer_phone: row.customer_phone,
        customer_nim: row.customer_nim,
        total_orders: Number(row.total_orders),
        total_spent: Number(row.total_spent),
        items: []
      });
    }

    for (const row of buyerItemRows) {
      const email = row.customer_email || "guest@filkommerch.com";
      const name = row.customer_name || "Pelanggan";
      const key = `${email.toLowerCase()}_${name.toLowerCase()}`;
      if (buyerMap.has(key)) {
        buyerMap.get(key).items.push({
          product_name: row.product_name,
          size: row.size,
          color: row.color,
          quantity: Number(row.total_quantity),
          total_spent: Number(row.total_spent)
        });
      }
    }
    const buyersSummary = Array.from(buyerMap.values());

    // 4. Sales Trend (grouped by Date)
    let trendRows: any[] = [];
    if (days === "today") {
      trendRows = await query<any>(
        `SELECT 
          HOUR(created_at) AS hour,
          DATE_FORMAT(created_at, '%H:00') AS label,
          COALESCE(SUM(gross_amount), 0) AS revenue,
          COUNT(id) AS orders_count
         FROM orders
         WHERE payment_status = 'paid' AND created_at >= CURDATE()
         GROUP BY HOUR(created_at), DATE_FORMAT(created_at, '%H:00')
         ORDER BY hour ASC`
      );
    } else {
      trendRows = await query<any>(
        `SELECT 
          DATE(created_at) AS date,
          DATE_FORMAT(created_at, '%d %b') AS label,
          COALESCE(SUM(gross_amount), 0) AS revenue,
          COUNT(id) AS orders_count
         FROM orders
         WHERE payment_status = 'paid' AND ${dateConstraint}
         GROUP BY DATE(created_at), DATE_FORMAT(created_at, '%d %b')
         ORDER BY date ASC`
      );
    }

    return res.json({
      success: true,
      summary: {
        total_orders: summary?.total_orders || 0,
        online_orders: summary?.online_orders || 0,
        pos_orders: summary?.pos_orders || 0,
        total_revenue: Number(summary?.total_revenue || 0),
        online_revenue: Number(summary?.online_revenue || 0),
        pos_revenue: Number(summary?.pos_revenue || 0),
        total_discount: Number(summary?.total_discount || 0),
        total_tax: Number(summary?.total_tax || 0),
        total_subtotal: Number(summary?.total_subtotal || 0),
      },
      products: productsSummary,
      buyers: buyersSummary,
      sales_trend: trendRows.map(row => ({
        label: row.label,
        revenue: Number(row.revenue),
        orders_count: Number(row.orders_count)
      }))
    });
  } catch (error: any) {
    console.error("Error fetching orders summary:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch orders summary" });
  }
};

// Create Pelunasan (balance payment) order automatically linked to a DP order (Zero DB Schema change)
export const createPelunasanOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Original Order ID

    // 1. Fetch original order
    const originalOrder = await queryOne<any>("SELECT * FROM orders WHERE order_id = ?", [id]);
    if (!originalOrder) {
      return res.status(404).json({ success: false, error: "Pesanan asal tidak ditemukan" });
    }

    // Check if already paid
    if (originalOrder.payment_status !== "paid") {
      return res.status(400).json({ success: false, error: "Pesanan asal belum lunas DP" });
    }

    // Check if pelunasan order already exists (not cancelled)
    const existingPelunasan = await queryOne<any>(
      "SELECT order_id FROM orders WHERE notes LIKE ? AND order_status != 'cancelled' LIMIT 1",
      [`%Pelunasan untuk Order: ${id}%`]
    );
    if (existingPelunasan) {
      return res.status(400).json({
        success: false,
        error: "Pesanan pelunasan untuk order ini sudah dibuat sebelumnya",
        orderId: existingPelunasan.order_id
      });
    }

    // 2. Fetch original order items
    const originalItems = await query<any>("SELECT * FROM order_items WHERE order_id = ?", [id]);
    if (!originalItems || originalItems.length === 0) {
      return res.status(400).json({ success: false, error: "Item pesanan asal tidak ditemukan" });
    }

    let calculatedSubtotal = 0;
    const resolvedItems: any[] = [];

    // 3. Process each item to find Lunas counterpart and calculate sisa
    for (const item of originalItems) {
      const product = await queryOne<any>("SELECT * FROM products WHERE id = ?", [item.product_id]);
      if (!product) {
        return res.status(404).json({ success: false, error: `Produk ID ${item.product_id} tidak ditemukan` });
      }

      // Try to find the matching 'Lunas' variant
      const lunasColor = (item.color || "").replace(/\bDP\b/i, "Lunas");
      let lunasVariant = await queryOne<any>(
        "SELECT * FROM product_variants WHERE product_id = ? AND size = ? AND color = ? AND is_active = 1 LIMIT 1",
        [item.product_id, item.size, lunasColor]
      );

      if (!lunasVariant) {
        // Fallback to any variant with the same size and 'Lunas' in the color name
        lunasVariant = await queryOne<any>(
          "SELECT * FROM product_variants WHERE product_id = ? AND size = ? AND color LIKE '%Lunas%' AND is_active = 1 LIMIT 1",
          [item.product_id, item.size]
        );
      }

      let lunasUnitPrice = product.price;
      if (lunasVariant) {
        const isUb = isUbEmail(originalOrder.customer_email);
        let basePrice = Number(product.price);
        if (product.promo_price && Number(product.promo_price) > 0) {
          basePrice = Number(product.promo_price);
        } else if (isUb && product.filkom_price && Number(product.filkom_price) > 0) {
          basePrice = Number(product.filkom_price);
        }

        let addon = 0;
        if (lunasVariant.filkom_price !== undefined && lunasVariant.filkom_price !== null && Number(lunasVariant.filkom_price) > 0) {
          addon = Number(lunasVariant.filkom_price);
        } else if (lunasVariant.price_override !== undefined && lunasVariant.price_override !== null && Number(lunasVariant.price_override) > 0) {
          addon = Number(lunasVariant.price_override);
        }

        lunasUnitPrice = basePrice + addon;
      }

      const sisa = Math.max(0, lunasUnitPrice - item.unit_price);
      // Fallback if price calculation resolves to 0
      const finalSisa = sisa > 0 ? sisa : item.unit_price;

      const subtotal = finalSisa * item.quantity;
      calculatedSubtotal += subtotal;

      resolvedItems.push({
        item,
        sisa: finalSisa,
        subtotal,
        lunasVariantId: lunasVariant ? lunasVariant.id : item.variant_id,
        lunasColor: lunasVariant ? lunasVariant.color : lunasColor,
      });
    }

    // 4. Create new order ID
    const newOrderId = `LNS-${id}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. Insert new order (Pelunasan)
    await execute(
      `INSERT INTO orders (
        order_id, channel, fulfillment_type, fulfillment_status, user_id, customer_name,
        customer_nim, customer_email, customer_phone, shipping_address, subtotal,
        discount_amount, service_fee, shipping_cost, tax_amount, gross_amount,
        payment_status, order_status, notes, transaction_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, 'unpaid', 'pending_payment', ?, 'pending')`,
      [
        newOrderId,
        originalOrder.channel || "online",
        originalOrder.fulfillment_type || "pickup",
        "unfulfilled",
        originalOrder.user_id || null,
        originalOrder.customer_name,
        originalOrder.customer_nim || null,
        originalOrder.customer_email,
        originalOrder.customer_phone,
        originalOrder.shipping_address || null,
        calculatedSubtotal,
        calculatedSubtotal, // gross_amount
        `Pelunasan untuk Order: ${id}`,
      ]
    );

    // 6. Insert order items
    for (const resItem of resolvedItems) {
      const orig = resItem.item;
      await execute(
        `INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, size, color, quantity,
          unit_price, discount_amount, subtotal, sku_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, '')`,
        [
          newOrderId,
          orig.product_id,
          resItem.lunasVariantId,
          `Pelunasan — ${orig.product_name}`,
          orig.size,
          resItem.lunasColor,
          orig.quantity,
          resItem.sisa,
          resItem.subtotal
        ]
      );
    }

    return res.json({ success: true, orderId: newOrderId });
  } catch (error: any) {
    console.error("Error creating pelunasan order:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to create pelunasan order" });
  }
};

// ============ VOUCHER CRUD CONTROLLERS ============

export const getAllVouchers = async (req: Request, res: Response) => {
  try {
    const vouchers = await query(
      `SELECT v.*, 
              COUNT(CASE WHEN o.order_status != 'cancelled' THEN o.id END) AS usage_count,
              COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.discount_amount END), 0) AS total_discount_given
       FROM vouchers v
       LEFT JOIN orders o ON v.code COLLATE utf8mb4_general_ci = o.voucher_code COLLATE utf8mb4_general_ci
       GROUP BY v.id
       ORDER BY v.id DESC`
    );
    return res.json({ success: true, data: vouchers || [] });
  } catch (error: any) {
    console.error("Error fetching vouchers:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createVoucher = async (req: Request, res: Response) => {
  try {
    const { code, discount_amount, min_purchase, stock, start_date, end_date, is_active, discount_type, max_discount, target_nim_prefix, usage_limit_per_user } = req.body;
    if (!code || discount_amount === undefined || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: "Kode, nominal diskon, tanggal mulai, dan tanggal selesai wajib diisi" });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    // Check if code already exists
    const existing = await queryOne<any>("SELECT id FROM vouchers WHERE code = ?", [normalizedCode]);
    if (existing) {
      return res.status(400).json({ success: false, error: "Kode voucher sudah digunakan" });
    }

    const result = await execute(
      `INSERT INTO vouchers (code, discount_amount, min_purchase, stock, start_date, end_date, is_active, discount_type, max_discount, target_nim_prefix, usage_limit_per_user)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedCode,
        Number(discount_amount) || 0,
        Number(min_purchase) || 0,
        Number(stock) || 0,
        start_date,
        end_date,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        discount_type || "fixed",
        max_discount !== undefined && max_discount !== null ? Number(max_discount) : null,
        target_nim_prefix ? String(target_nim_prefix).trim() : null,
        usage_limit_per_user !== undefined ? Number(usage_limit_per_user) : 1
      ]
    );

    return res.json({ success: true, id: (result as any).insertId, message: "Voucher berhasil dibuat" });
  } catch (error: any) {
    console.error("Error creating voucher:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, discount_amount, min_purchase, stock, start_date, end_date, is_active, discount_type, max_discount, target_nim_prefix, usage_limit_per_user } = req.body;

    if (!code || discount_amount === undefined || !start_date || !end_date) {
      return res.status(400).json({ success: false, error: "Kode, nominal diskon, tanggal mulai, dan tanggal selesai wajib diisi" });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    // Check if code already exists in other rows
    const existing = await queryOne<any>("SELECT id FROM vouchers WHERE code = ? AND id != ?", [normalizedCode, id]);
    if (existing) {
      return res.status(400).json({ success: false, error: "Kode voucher sudah digunakan oleh voucher lain" });
    }

    await execute(
      `UPDATE vouchers 
       SET code = ?, discount_amount = ?, min_purchase = ?, stock = ?, start_date = ?, end_date = ?, is_active = ?, discount_type = ?, max_discount = ?, target_nim_prefix = ?, usage_limit_per_user = ?
       WHERE id = ?`,
      [
        normalizedCode,
        Number(discount_amount) || 0,
        Number(min_purchase) || 0,
        Number(stock) || 0,
        start_date,
        end_date,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        discount_type || "fixed",
        max_discount !== undefined && max_discount !== null ? Number(max_discount) : null,
        target_nim_prefix ? String(target_nim_prefix).trim() : null,
        usage_limit_per_user !== undefined ? Number(usage_limit_per_user) : 1,
        id
      ]
    );

    return res.json({ success: true, message: "Voucher berhasil diperbarui" });
  } catch (error: any) {
    console.error("Error updating voucher:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await execute("DELETE FROM vouchers WHERE id = ?", [id]);
    return res.json({ success: true, message: "Voucher berhasil dihapus" });
  } catch (error: any) {
    console.error("Error deleting voucher:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const validateVoucher = async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: "Kode voucher wajib diisi" });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const orderSubtotal = Number(subtotal) || 0;

    const voucher = await queryOne<any>("SELECT * FROM vouchers WHERE code = ?", [normalizedCode]);
    if (!voucher) {
      return res.status(404).json({ success: false, error: "Kode voucher tidak valid atau tidak ditemukan" });
    }

    if (voucher.is_active !== 1) {
      return res.status(400).json({ success: false, error: "Voucher ini sedang tidak aktif" });
    }

    const now = new Date();
    const startDate = new Date(voucher.start_date);
    const endDate = new Date(voucher.end_date);

    if (now < startDate) {
      return res.status(400).json({ success: false, error: "Voucher ini belum mulai berlaku" });
    }

    if (now > endDate) {
      return res.status(400).json({ success: false, error: "Voucher ini sudah kadaluarsa" });
    }

    if (voucher.stock <= 0) {
      return res.status(400).json({ success: false, error: "Stok voucher ini telah habis" });
    }

    if (orderSubtotal < voucher.min_purchase) {
      return res.status(400).json({ 
        success: false, 
        error: `Minimal pembelian untuk menggunakan voucher ini adalah Rp ${voucher.min_purchase.toLocaleString("id-ID")}` 
      });
    }

    // Validate target nim prefix if applicable
    if (voucher.target_nim_prefix) {
      const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Silakan login terlebih dahulu untuk menggunakan voucher khusus ini" });
      }

      const user = await queryOne<any>("SELECT is_filkom_verified, nim FROM users WHERE id = ?", [userId]);
      if (!user || user.is_filkom_verified !== 1) {
        return res.status(400).json({ success: false, error: "Voucher ini khusus untuk mahasiswa FILKOM yang sudah terverifikasi" });
      }

      const cleanNim = (user.nim || "").trim();
      if (!cleanNim.startsWith(voucher.target_nim_prefix)) {
        return res.status(400).json({ 
          success: false, 
          error: `Voucher ini hanya berlaku untuk mahasiswa angkatan 20${voucher.target_nim_prefix}` 
        });
      }
    }

    // Validate usage limit per user
    if (voucher.usage_limit_per_user && voucher.usage_limit_per_user > 0) {
      const userId = req.header("x-user-id") ? parseInt(req.header("x-user-id")!) : null;
      if (userId) {
        const usageRow = await queryOne<any>(
          "SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND voucher_code = ? AND order_status != 'cancelled'",
          [userId, voucher.code]
        );
        const usageCount = usageRow?.count || 0;
        if (usageCount >= voucher.usage_limit_per_user) {
          return res.status(400).json({ 
            success: false, 
            error: `Anda sudah melebihi batas penggunaan voucher ini (Maks ${voucher.usage_limit_per_user} kali)` 
          });
        }
      }
    }

    return res.json({
      success: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_amount: voucher.discount_amount,
        min_purchase: voucher.min_purchase,
        discount_type: voucher.discount_type,
        max_discount: voucher.max_discount,
        target_nim_prefix: voucher.target_nim_prefix,
        usage_limit_per_user: voucher.usage_limit_per_user
      }
    });
  } catch (error: any) {
    console.error("Error validating voucher:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get voucher usage history
export const getVoucherHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const voucher = await queryOne<any>("SELECT code FROM vouchers WHERE id = ?", [id]);
    if (!voucher) {
      return res.status(404).json({ success: false, error: "Voucher tidak ditemukan" });
    }

    const usages = await query<any>(
      `SELECT o.order_id, o.customer_name, o.customer_email, o.customer_phone, o.discount_amount, o.created_at, o.order_status, o.payment_status
       FROM orders o
       WHERE o.voucher_code = ?
       ORDER BY o.created_at DESC`,
      [voucher.code]
    );

    return res.json({ success: true, data: usages || [] });
  } catch (error: any) {
    console.error("Error fetching voucher history:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


