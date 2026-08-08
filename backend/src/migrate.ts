import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_filkommerch",
  port: parseInt(process.env.DB_PORT || "3306"),
};

export async function runMigration() {
  console.log("Connecting to database:", dbConfig.database, "on", dbConfig.host);
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL successfully!");

    const queries = [
      {
        name: "product_reviews",
        sql: `CREATE TABLE IF NOT EXISTS product_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          order_id VARCHAR(50) NOT NULL,
          user_id INT NOT NULL,
          rating INT NOT NULL,
          comment TEXT DEFAULT NULL,
          variant VARCHAR(100) DEFAULT NULL,
          user_name VARCHAR(100) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_product_order (order_id, product_id, user_id)
        )`
      },
      {
        name: "bundle_items",
        sql: `CREATE TABLE IF NOT EXISTS bundle_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bundle_product_id INT NOT NULL,
          component_product_id INT NOT NULL,
          quantity INT DEFAULT 1,
          FOREIGN KEY (bundle_product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE
        )`
      },
      {
        name: "product_variants.color",
        sql: "ALTER TABLE product_variants ADD COLUMN color varchar(50) DEFAULT NULL"
      },
      {
        name: "order_items.color",
        sql: "ALTER TABLE order_items ADD COLUMN color varchar(50) DEFAULT NULL"
      },
      {
        name: "offline_sale_items.color",
        sql: "ALTER TABLE offline_sale_items ADD COLUMN color varchar(50) DEFAULT NULL"
      },
      {
        name: "store_settings.homepage_layout",
        sql: "ALTER TABLE store_settings ADD COLUMN homepage_layout TEXT DEFAULT NULL"
      },
      {
        name: "categories.is_active",
        sql: "ALTER TABLE categories ADD COLUMN is_active TINYINT(1) DEFAULT 1"
      },
      {
        name: "products.bahan",
        sql: "ALTER TABLE products ADD COLUMN bahan VARCHAR(255) DEFAULT NULL"
      },
      {
        name: "products.asal",
        sql: "ALTER TABLE products ADD COLUMN asal VARCHAR(255) DEFAULT NULL"
      },
      {
        name: "products.aplikasi",
        sql: "ALTER TABLE products ADD COLUMN aplikasi VARCHAR(255) DEFAULT NULL"
      },
      {
        name: "products.size_chart_url",
        sql: "ALTER TABLE products ADD COLUMN size_chart_url VARCHAR(255) DEFAULT NULL"
      },
      {
        name: "users.is_filkom_verified",
        sql: "ALTER TABLE users ADD COLUMN is_filkom_verified TINYINT(1) DEFAULT 0"
      },
      {
        name: "store_settings.payment_mode",
        sql: "ALTER TABLE store_settings ADD COLUMN payment_mode VARCHAR(20) DEFAULT 'midtrans'"
      },
      {
        name: "orders.payment_proof_url",
        sql: "ALTER TABLE orders ADD COLUMN payment_proof_url VARCHAR(255) DEFAULT NULL"
      },
      {
        name: "pre_order_campaigns",
        sql: `CREATE TABLE IF NOT EXISTS pre_order_campaigns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          batch_name VARCHAR(100) NOT NULL,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          extended_end_date DATETIME DEFAULT NULL,
          is_active TINYINT(1) DEFAULT 0,
          description TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
      },
      {
        name: "products.pre_order_campaign_id",
        sql: "ALTER TABLE products ADD COLUMN pre_order_campaign_id INT DEFAULT NULL"
      },
      {
        name: "payments.provider_varchar",
        sql: "ALTER TABLE payments MODIFY COLUMN provider VARCHAR(50) NOT NULL"
      },
      {
        name: "orders.payment_proof_note",
        sql: "ALTER TABLE orders ADD COLUMN payment_proof_note VARCHAR(255) DEFAULT NULL"
      },
      {
        name: "product_variants.image_url",
        sql: "ALTER TABLE product_variants ADD COLUMN image_url VARCHAR(255) DEFAULT NULL"
      },
      {
        name: "vouchers",
        sql: `CREATE TABLE IF NOT EXISTS vouchers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          discount_amount INT NOT NULL,
          min_purchase INT NOT NULL DEFAULT 0,
          stock INT NOT NULL DEFAULT 0,
          start_date DATETIME NOT NULL,
          end_date DATETIME NOT NULL,
          is_active TINYINT(1) DEFAULT 1,
          discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
          max_discount INT DEFAULT NULL,
          target_nim_prefix VARCHAR(10) DEFAULT NULL,
          usage_limit_per_user INT NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
      },
      {
        name: "orders.voucher_code",
        sql: "ALTER TABLE orders ADD COLUMN voucher_code VARCHAR(50) DEFAULT NULL"
      },
      {
        name: "vouchers.discount_type",
        sql: "ALTER TABLE vouchers ADD COLUMN discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed'"
      },
      {
        name: "vouchers.max_discount",
        sql: "ALTER TABLE vouchers ADD COLUMN max_discount INT DEFAULT NULL"
      },
      {
        name: "vouchers.target_nim_prefix",
        sql: "ALTER TABLE vouchers ADD COLUMN target_nim_prefix VARCHAR(10) DEFAULT NULL"
      },
      {
        name: "vouchers.usage_limit_per_user",
        sql: "ALTER TABLE vouchers ADD COLUMN usage_limit_per_user INT NOT NULL DEFAULT 1"
      },
      {
        name: "vendors",
        sql: `CREATE TABLE IF NOT EXISTS vendors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          contact_person VARCHAR(100) DEFAULT NULL,
          phone VARCHAR(20) DEFAULT NULL,
          email VARCHAR(100) DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
      },
      {
        name: "vendor_orders",
        sql: `CREATE TABLE IF NOT EXISTS vendor_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          po_number VARCHAR(50) NOT NULL UNIQUE,
          vendor_id INT NOT NULL,
          status ENUM('draft','sent','in_production','completed','cancelled') DEFAULT 'draft',
          total_cost INT DEFAULT 0,
          notes TEXT DEFAULT NULL,
          deadline DATE DEFAULT NULL,
          sent_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
        )`
      },
      {
        name: "vendor_order_items",
        sql: `CREATE TABLE IF NOT EXISTS vendor_order_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vendor_order_id INT NOT NULL,
          product_id INT NOT NULL,
          size VARCHAR(30) DEFAULT NULL,
          color VARCHAR(50) DEFAULT NULL,
          quantity INT NOT NULL,
          unit_cost INT NOT NULL DEFAULT 0,
          subtotal_cost INT NOT NULL DEFAULT 0,
          notes TEXT DEFAULT NULL,
          FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`
      },
      {
        name: "batch_product_prices",
        sql: `CREATE TABLE IF NOT EXISTS batch_product_prices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          campaign_id INT NOT NULL,
          product_id INT NOT NULL,
          selling_price INT NOT NULL,
          filkom_price INT DEFAULT NULL,
          FOREIGN KEY (campaign_id) REFERENCES pre_order_campaigns(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE KEY unique_batch_product (campaign_id, product_id)
        )`
      },
      {
        name: "orders.batch_source",
        sql: "ALTER TABLE orders ADD COLUMN batch_source ENUM('web','csv_import','manual') DEFAULT 'web'"
      },
      {
        name: "orders.pre_order_campaign_id",
        sql: "ALTER TABLE orders ADD COLUMN pre_order_campaign_id INT DEFAULT NULL"
      },
      {
        name: "products.vendor_cost",
        sql: "ALTER TABLE products ADD COLUMN vendor_cost INT DEFAULT 0"
      },
      {
        name: "fix_pre_order_campaign_batch_name_zero",
        sql: "UPDATE pre_order_campaigns SET batch_name = 'Batch #1' WHERE batch_name = 'Batch #10'"
      },
      {
        name: "fix_pre_order_campaign_batch_name_two_zero",
        sql: "UPDATE pre_order_campaigns SET batch_name = 'Batch #2' WHERE batch_name = 'Batch #20'"
      }
    ];

    for (const q of queries) {
      try {
        console.log(`Running schema migration: ${q.name}...`);
        await connection.query(q.sql);
        console.log(`✅ ${q.name} migrated successfully!`);
      } catch (err: any) {
        // Handle MySQL Duplicate Column Error safely
        if (err.code === "ER_DUP_FIELDNAME" || err.errno === 1060 || err.code === "ER_DUP_COLUMN_NAME") {
          console.log(`ℹ️ Column ${q.name} already exists. Skipping.`);
        } else {
          console.error(`❌ Error migrating ${q.name}:`, err.message);
        }
      }
    }

    // Manage order_items foreign keys to ON DELETE SET NULL
    try {
      console.log("Migrating order_items foreign keys to ON DELETE SET NULL...");
      try {
        await connection.query("ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_2");
      } catch (e: any) {}
      try {
        await connection.query("ALTER TABLE order_items DROP FOREIGN KEY fk_order_items_variant");
      } catch (e: any) {}
      
      await connection.query("ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_2 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL");
      await connection.query("ALTER TABLE order_items ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL");
      console.log("✅ Managed order_items foreign keys successfully!");
    } catch (err: any) {
      console.warn("Notice: order_items foreign keys migration status:", err.message);
    }

    // Backfill historical order voucher_code in production database
    try {
      console.log("Backfilling voucher_code for historical orders...");
      await connection.query(`
        UPDATE orders 
        SET voucher_code = 'AKUMABA100' 
        WHERE discount_amount > 0 AND voucher_code IS NULL AND discount_amount = subtotal * 0.1
      `);
      await connection.query(`
        UPDATE orders 
        SET voucher_code = 'THANKYOU20' 
        WHERE discount_amount > 0 AND voucher_code IS NULL
      `);
      console.log("✅ Managed historical voucher_code backfill successfully!");
    } catch (err: any) {
      console.warn("Notice: voucher_code backfill status:", err.message);
    }

    // Create product_reviews table if it doesn't exist
    try {
      console.log("Creating product_reviews table if not exists...");
      await connection.query(`
        CREATE TABLE IF NOT EXISTS product_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          order_id VARCHAR(100) NOT NULL,
          user_id INT DEFAULT NULL,
          rating TINYINT NOT NULL DEFAULT 5,
          comment TEXT DEFAULT NULL,
          variant VARCHAR(255) DEFAULT NULL,
          user_name VARCHAR(255) DEFAULT 'Pembeli FILKOM',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_review (product_id, order_id)
        )
      `);
      console.log("✅ product_reviews table ready!");
    } catch (err: any) {
      console.warn("Notice: product_reviews table status:", err.message);
    }

    // Auto-fix Keychain variant names in order_items for historical imported CSV items
    try {
      console.log("Fixing Keychain order items variant names...");
      const keychainMapping: Record<string, { color: string; variant_id: number }> = {
        "desain 1": { color: "Bara", variant_id: 120 },
        "desain 2": { color: "Satu hati satu jiwa filkom", variant_id: 121 },
        "desain 3": { color: "filkom buddies", variant_id: 122 },
        "desain 4": { color: "error code", variant_id: 123 },
        "desain 5": { color: "FILKOM", variant_id: 124 },
      };

      for (const [key, target] of Object.entries(keychainMapping)) {
        await connection.query(
          `UPDATE order_items 
           SET color = ?, variant_id = ? 
           WHERE (product_name LIKE '%keychain%' OR product_id = 19) AND LOWER(TRIM(color)) = ?`,
          [target.color, target.variant_id, key]
        );
      }
      console.log("✅ Keychain order items variant names fixed successfully!");
    } catch (err: any) {
      console.warn("Notice: Keychain variant fix status:", err.message);
    }

    // Auto-fix T-Shirt Kaos variant names in order_items for historical imported CSV items
    try {
      console.log("Fixing T-Shirt Kaos order items variant names...");
      const tshirtMapping: Record<string, string> = {
        "desain 1": "COMPUTER SCIENCE",
        "desain 2": "SATU HATI SATU JIWA",
      };

      for (const [key, targetColor] of Object.entries(tshirtMapping)) {
        await connection.query(
          `UPDATE order_items 
           SET color = ? 
           WHERE (product_name LIKE '%Kaos%' OR product_name LIKE '%T-Shirt%' OR product_id = 25) AND LOWER(TRIM(color)) = ?`,
          [targetColor, key]
        );
      }
      console.log("✅ T-Shirt Kaos order items variant names fixed successfully!");
    } catch (err: any) {
      console.warn("Notice: T-Shirt Kaos variant fix status:", err.message);
    }

    // Auto-fix Pin Enamel department normalization
    try {
      console.log("Fixing Pin Enamel order items and variants...");
      const pinEnamelDeptMap: Record<string, string> = {
        "SISTEM INFORMASI": "Sistem Informasi",
        "TEKNIK INFORMATIKA": "Teknik Informatika",
        "TEKNIK KOMPUTER": "Teknik Komputer",
        "TEKNOLOGI INFORMASI": "Teknologi Informasi",
        "PENDIDIKAN TEKNOLOGI INFORMASI": "Pendidikan Teknologi Informasi",
        "FILKOM": "FILKOM",
      };

      const [enamelRows] = await connection.query<any[]>(
        "SELECT id, size, color FROM order_items WHERE (product_id = 16 OR product_name LIKE '%Pin Enamel%')"
      );

      for (const row of enamelRows) {
        const sizeUpper = (row.size || "").trim().toUpperCase();
        const colorUpper = (row.color || "").trim().toUpperCase();

        let targetColor = pinEnamelDeptMap[sizeUpper] || pinEnamelDeptMap[colorUpper] || "FILKOM";
        if (row.size === "Sistem Informasi" || row.color === "Sistem Informasi") targetColor = "Sistem Informasi";
        if (row.size === "Teknik Informatika" || row.color === "Teknik Informatika") targetColor = "Teknik Informatika";
        if (row.size === "Teknik Komputer" || row.color === "Teknik Komputer") targetColor = "Teknik Komputer";
        if (row.size === "Teknologi Informasi" || row.color === "Teknologi Informasi") targetColor = "Teknologi Informasi";
        if (row.size === "Pendidikan Teknologi Informasi" || row.color === "Pendidikan Teknologi Informasi") targetColor = "Pendidikan Teknologi Informasi";
        if (row.size === "FILKOM" || row.color === "FILKOM") targetColor = "FILKOM";

        await connection.query("UPDATE order_items SET size = 'One Size', color = ? WHERE id = ?", [targetColor, row.id]);
      }
      console.log("✅ Pin Enamel order items fixed successfully!");
    } catch (err: any) {
      console.warn("Notice: Pin Enamel variant fix status:", err.message);
    }

    // Auto-fix Pin Tas variant names
    try {
      console.log("Fixing Pin Tas order items and variants...");
      const pinTasMapping: Record<string, string> = {
        "desain 1": "FILKOM Oranye",
        "desain 2": "FILKOM Blue",
        "desain 3": "Let's Stay Connected",
        "desain 4": "It's My First Time Ngoding",
        "desain 5": "I ❤️ Coding",
        "desain 6": "FILKOM Girls",
        "desain 7": "FILKOM Boys",
      };

      for (const [k, v] of Object.entries(pinTasMapping)) {
        await connection.query("UPDATE product_variants SET color = ?, size = 'One Size' WHERE product_id = 17 AND LOWER(TRIM(color)) = ?", [v, k]);
      }

      const [pinTasRows] = await connection.query<any[]>("SELECT id, color FROM order_items WHERE (product_id = 17 OR product_name LIKE '%Pin Tas%')");
      for (const row of pinTasRows) {
        const cLower = (row.color || "").trim().toLowerCase();
        const targetColor = pinTasMapping[cLower] || "FILKOM Oranye";
        await connection.query("UPDATE order_items SET size = 'One Size', color = ? WHERE id = ?", [targetColor, row.id]);
      }
      console.log("✅ Pin Tas order items fixed successfully!");
    } catch (err: any) {
      console.warn("Notice: Pin Tas variant fix status:", err.message);
    }

    // Auto-fix Totebag variant names
    try {
      console.log("Fixing Totebag order items and variants...");
      const totebagMapping: Record<string, string> = {
        "desain 1": "FILKOM BRAWIJAYA Outline",
        "desain 2": "FILKOM BRAWIJAYA Signature",
        "desain 3": "FILKOM 2011 Vintage",
        "desain 4": "FILKOM Bold",
      };

      for (const [k, v] of Object.entries(totebagMapping)) {
        await connection.query("UPDATE product_variants SET color = ?, size = 'One Size' WHERE product_id = 22 AND LOWER(TRIM(color)) = ?", [v, k]);
      }

      const [totebagRows] = await connection.query<any[]>("SELECT id, color FROM order_items WHERE (product_id = 22 OR product_name LIKE '%Totebag%')");
      for (const row of totebagRows) {
        const cLower = (row.color || "").trim().toLowerCase();
        const targetColor = totebagMapping[cLower] || row.color || "FILKOM BRAWIJAYA Outline";
        await connection.query("UPDATE order_items SET size = 'One Size', color = ? WHERE id = ?", [targetColor, row.id]);
      }
      console.log("✅ Totebag order items fixed successfully!");
    } catch (err: any) {
      console.warn("Notice: Totebag variant fix status:", err.message);
    }

    // Auto-fix Batch #1 official product prices
    try {
      console.log("Updating Batch #1 official product prices...");
      const [campaigns] = await connection.query<any[]>("SELECT * FROM pre_order_campaigns ORDER BY id ASC");
      const b1 = campaigns.find((c) => c.batch_name.includes("1"));
      if (b1) {
        const priceMap = [
          { names: ["Pin Enamel"], price: 26000 },
          { names: ["Pin Tas"], price: 4000 },
          { names: ["Sticker Pack"], price: 8000 },
          { names: ["Keychain"], price: 10000 },
          { names: ["Totebag"], price: 40000 },
          { names: ["Topi Baseball", "Topi"], price: 80000 },
          { names: ["T-Shirt Kaos", "Kaos", "T-Shirt"], price: 105000 },
        ];

        const [b1Orders] = await connection.query<any[]>(
          `SELECT DISTINCT o.order_id
           FROM orders o
           JOIN order_items oi ON o.order_id = oi.order_id
           WHERE o.order_status != 'cancelled'
             AND (o.pre_order_campaign_id = ? OR (o.created_at >= ? AND o.created_at <= ?))`,
          [b1.id, b1.start_date, b1.extended_end_date || b1.end_date]
        );

        for (const rule of priceMap) {
          for (const namePattern of rule.names) {
            await connection.query(
              `UPDATE order_items oi
               JOIN orders o ON oi.order_id = o.order_id
               SET oi.unit_price = ?
               WHERE (oi.product_name LIKE ? OR oi.product_id IN (SELECT id FROM products WHERE name LIKE ?))
                 AND (o.pre_order_campaign_id = ? OR (o.created_at >= ? AND o.created_at <= ?))`,
              [rule.price, `%${namePattern}%`, `%${namePattern}%`, b1.id, b1.start_date, b1.extended_end_date || b1.end_date]
            );
          }
        }

        for (const oRow of b1Orders) {
          const [sumRes] = await connection.query<any[]>(
            "SELECT SUM(COALESCE(unit_price, 0) * COALESCE(quantity, 1)) as new_total FROM order_items WHERE order_id = ?",
            [oRow.order_id]
          );
          const newTotal = Number(sumRes[0]?.new_total || 0);
          await connection.query("UPDATE orders SET gross_amount = ? WHERE order_id = ?", [newTotal, oRow.order_id]);
        }
        console.log("✅ Batch #1 official product prices updated successfully!");
      }
    } catch (err: any) {
      console.warn("Notice: Batch #1 price update status:", err.message);
    }

    console.log("Schema migration finished successfully!");
  } catch (err) {
    console.error("Fatal connection error during migration:", err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
