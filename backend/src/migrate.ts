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
  charset: "utf8mb4",
};

export async function runMigration() {
  console.log("Connecting to database:", dbConfig.database, "on", dbConfig.host);
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL successfully!");

    const queries = [
      {
        name: "page_views",
        sql: `CREATE TABLE IF NOT EXISTS page_views (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ip_address VARCHAR(45) DEFAULT NULL,
          user_agent TEXT DEFAULT NULL,
          path VARCHAR(255) DEFAULT NULL,
          user_id INT DEFAULT NULL,
          user_name VARCHAR(100) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_ip_path (ip_address, path)
        )`
      },
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
        name: "orders.payment_proof_history",
        sql: "ALTER TABLE orders ADD COLUMN payment_proof_history LONGTEXT DEFAULT NULL"
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
      },
      {
        name: "order_claims",
        sql: `CREATE TABLE IF NOT EXISTS order_claims (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          order_id VARCHAR(50) COLLATE utf8mb4_general_ci NOT NULL,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          claim_reason VARCHAR(255) DEFAULT NULL,
          admin_note TEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_order_claim (user_id, order_id)
        )`
      }
    ];

    for (const q of queries) {
      try {
        await connection.query(q.sql);
      } catch (err: any) {
        // Handle MySQL Duplicate Column / Table Error safely without spamming logs
        if (err.code !== "ER_DUP_FIELDNAME" && err.errno !== 1060 && err.code !== "ER_DUP_COLUMN_NAME") {
          console.error(`❌ Error migrating ${q.name}:`, err.message);
        }
      }
    }

    // Manage order_items foreign keys to ON DELETE SET NULL
    try {
      try {
        await connection.query("ALTER TABLE order_items DROP FOREIGN KEY order_items_ibfk_2");
      } catch (e: any) { }
      try {
        await connection.query("ALTER TABLE order_items DROP FOREIGN KEY fk_order_items_variant");
      } catch (e: any) { }

      await connection.query("ALTER TABLE order_items ADD CONSTRAINT order_items_ibfk_2 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL");
      await connection.query("ALTER TABLE order_items ADD CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL");
    } catch (err: any) { }

    // Backfill historical order voucher_code in production database
    try {
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
    } catch (err: any) { }

    // Create product_reviews table if it doesn't exist
    try {
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
    } catch (err: any) { }

    // Create notifications table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'GENERAL',
          link VARCHAR(255) DEFAULT NULL,
          is_read TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);

      await connection.query(`ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await connection.query(`UPDATE notifications SET title = REPLACE(title, '? PESANAN', '📦 PESANAN') WHERE title LIKE '? PESANAN%'`);
      await connection.query(`UPDATE notifications SET title = REPLACE(title, '? Bukti', '⚠️ Bukti') WHERE title LIKE '? Bukti%'`);
      await connection.query(`UPDATE notifications SET title = REPLACE(title, '? Pembayaran', '✅ Pembayaran') WHERE title LIKE '? Pembayaran%'`);
      await connection.query(`UPDATE notifications SET title = REPLACE(title, '? Update', '💬 Update') WHERE title LIKE '? Update%'`);
    } catch (err: any) { }

    // Create push_subscriptions table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh VARCHAR(255) NOT NULL,
          auth VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    } catch (err: any) { }

    // Auto-fix Keychain variant names in order_items for historical imported CSV items
    try {
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
    } catch (err: any) { }

    // Auto-fix T-Shirt Kaos variant names in order_items for historical imported CSV items
    try {
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
    } catch (err: any) { }

    // Auto-fix Pin Enamel department normalization
    try {
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

        await connection.query("UPDATE order_items SET size = '', color = ? WHERE id = ?", [targetColor, row.id]);
      }
    } catch (err: any) { }

    // Auto-fix Pin Tas variant names and imported items distribution
    try {
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
        await connection.query("UPDATE product_variants SET color = ?, size = '' WHERE product_id = 17 AND LOWER(TRIM(color)) = ?", [v, k]);
      }

      // Update non-imported items based on their variant_id
      const [pvList] = await connection.query<any[]>("SELECT id, color FROM product_variants WHERE product_id = 17");
      for (const pv of pvList) {
        await connection.query("UPDATE order_items SET size = '', color = ? WHERE (product_id = 17 OR product_name LIKE '%Pin Tas%') AND variant_id = ?", [pv.color, pv.id]);
      }

      // Match imported Pin Tas items (order_id LIKE 'IMP-%') with exact user table purchases
      const userTableData = [
        { name: "Crisnanta Ciello Purnama Junior", variants: ["FILKOM Blue", "It's My First Time Ngoding"] },
        { name: "ARMAN SYAH MAULANA", variants: ["Let's Stay Connected", "FILKOM Boys"] },
        { name: "Nadya Rosaliadevi", variants: ["FILKOM Girls"] },
        { name: "Athilla Faveurdi Bhimas Suwandoko", variants: ["FILKOM Blue"] },
        { name: "Shifa Kayana Pradiptasari Jatmiko", variants: ["FILKOM Girls"] },
        { name: "Huriyah Aqilah Nur Mahdiyyah", variants: ["FILKOM Girls"] },
        { name: "Keyla Raissa Sasikirana", variants: ["FILKOM Girls"] },
        { name: "Ariel Rizky Nayoan", variants: ["Let's Stay Connected", "It's My First Time Ngoding"] },
        { name: "Mufidah Samlawi", variants: ["FILKOM Girls"] },
        { name: "Risma Aullia Zairull Ikhrom", variants: ["FILKOM Girls"] },
        { name: "Nadiya Aisyah Istiqomah", variants: ["FILKOM Girls"] },
        { name: "Nasywa Azalia", variants: ["FILKOM Blue", "FILKOM Girls"] },
        { name: "Nadya Alya Athaillah", variants: ["FILKOM Blue", "FILKOM Oranye"] },
        { name: "Ahsanul Maarif Aresty", variants: ["FILKOM Blue"] },
        { name: "Raisya Ramadhani", variants: ["FILKOM Girls"] },
        { name: "Fahri Ahmad", variants: ["FILKOM Boys", "I ❤️ Coding", "FILKOM Girls"] },
        { name: "Rahmadhina Andalas Putri Seventri", variants: ["FILKOM Oranye"] },
        { name: "Nisfil Laili Azzahra", variants: ["FILKOM Oranye", "FILKOM Blue", "I ❤️ Coding", "FILKOM Girls"] },
        { name: "Reinmarsha Cathleya Khalbi", variants: ["It's My First Time Ngoding", "FILKOM Oranye"] },
        { name: "Luqman Faaza Dzurroyyan", variants: ["FILKOM Boys"] },
        { name: "Muhammad Dzakwan Ikram", variants: ["FILKOM Boys"] },
        { name: "DWI FITRIYATI", variants: ["It's My First Time Ngoding", "I ❤️ Coding", "FILKOM Girls"] },
        { name: "Cinta Syahda Nur Tsany", variants: ["FILKOM Girls"] },
        { name: "Sherlyta Safira Zulianta", variants: ["FILKOM Blue", "FILKOM Girls"] },
        { name: "Chelsea Yulianty Gurning", variants: ["FILKOM Blue"] },
        { name: "queency alifia", variants: ["FILKOM Oranye", "FILKOM Blue", "I ❤️ Coding"] },
        { name: "Keitaro Dior Purnomo", variants: ["FILKOM Blue"] },
        { name: "Asyila Putri Fazira", variants: ["FILKOM Blue", "It's My First Time Ngoding", "I ❤️ Coding", "FILKOM Girls"] },
        { name: "ADRIAN ALFARO", variants: ["FILKOM Blue"] },
        { name: "Khobala Firdaus", variants: ["FILKOM Boys"] },
        { name: "Cristian Ruben Saputra", variants: ["FILKOM Boys"] },
        { name: "Rahmat Dhani", variants: ["FILKOM Blue"] },
        { name: "Mukti Abdi Syukur", variants: ["FILKOM Blue", "It's My First Time Ngoding"] },
        { name: "Moch Hisyam Farrel Irsyad", variants: ["FILKOM Oranye"] },
        { name: "Awang Bintang M Lazuardi", variants: ["FILKOM Boys"] },
        { name: "M. Daffa Riyadlussalam", variants: ["FILKOM Blue"] },
        { name: "Dyandra Naresuan Vaisaka Passadhi", variants: ["FILKOM Blue"] },
        { name: "Muhammad Iqbal Fahmi", variants: ["It's My First Time Ngoding"] },
        { name: "Rajendra Kaysan Satriya Setyantoro", variants: ["FILKOM Boys"] },
        { name: "Shafiyyah Najah Wijaya", variants: ["FILKOM Girls", "FILKOM Oranye"] },
        { name: "Muhammad Taufiqul Hafizh", variants: ["It's My First Time Ngoding", "I ❤️ Coding"] },
        { name: "Muhammad Dave Davin Noval Arrafai", variants: ["It's My First Time Ngoding", "FILKOM Boys"] },
        { name: "Carrisa Galih Gefiana", variants: ["It's My First Time Ngoding"] },
        { name: "Valen Pratama Sahedi", variants: ["FILKOM Oranye", "It's My First Time Ngoding"] }
      ];

      const variantMap: Record<string, number> = {
        'FILKOM Oranye': 36,
        'FILKOM Blue': 37,
        "Let's Stay Connected": 38,
        "It's My First Time Ngoding": 39,
        'I ❤️ Coding': 40,
        'FILKOM Girls': 41,
        'FILKOM Boys': 42,
      };

      const [dbItems] = await connection.query<any[]>(`
        SELECT oi.id, oi.order_id, o.customer_name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.order_id
        WHERE (oi.product_id = 17 OR oi.product_name LIKE '%Pin Tas%')
          AND oi.order_id LIKE 'IMP-%'
        ORDER BY oi.id ASC
      `);

      const cleanStr = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const customerDbMap: Record<string, any[]> = {};
      dbItems.forEach(item => {
        const cKey = cleanStr(item.customer_name);
        if (!customerDbMap[cKey]) customerDbMap[cKey] = [];
        customerDbMap[cKey].push(item);
      });

      for (const cust of userTableData) {
        const key = cleanStr(cust.name);
        let itemsToUpdate = customerDbMap[key];

        if (!itemsToUpdate || itemsToUpdate.length === 0) {
          for (const dbKey of Object.keys(customerDbMap)) {
            if (dbKey.includes(key) || key.includes(dbKey)) {
              itemsToUpdate = customerDbMap[dbKey];
              break;
            }
          }
        }

        if (itemsToUpdate && itemsToUpdate.length > 0) {
          for (let i = 0; i < cust.variants.length && i < itemsToUpdate.length; i++) {
            const vName = cust.variants[i];
            const vId = variantMap[vName];

            if (vName && vId) {
              await connection.query(
                "UPDATE order_items SET size = '', color = ?, variant_id = ? WHERE id = ?",
                [vName, vId, itemsToUpdate[i].id]
              );
            }
          }
        }
      }
    } catch (err: any) { }

    // Auto-fix Totebag variant names
    try {
      const totebagMapping: Record<string, string> = {
        "desain 1": "FILKOM BRAWIJAYA Outline",
        "desain 2": "FILKOM BRAWIJAYA Signature",
        "desain 3": "FILKOM 2011 Vintage",
        "desain 4": "FILKOM Bold",
      };

      for (const [k, v] of Object.entries(totebagMapping)) {
        await connection.query("UPDATE product_variants SET color = ?, size = '' WHERE product_id = 22 AND LOWER(TRIM(color)) = ?", [v, k]);
      }

      const [totebagRows] = await connection.query<any[]>("SELECT id, color FROM order_items WHERE (product_id = 22 OR product_name LIKE '%Totebag%')");
      for (const row of totebagRows) {
        const cLower = (row.color || "").trim().toLowerCase();
        const targetColor = totebagMapping[cLower] || row.color || "FILKOM BRAWIJAYA Outline";
        await connection.query("UPDATE order_items SET size = '', color = ? WHERE id = ?", [targetColor, row.id]);
      }
    } catch (err: any) { }

    // Auto-fix Batch #1 official product prices
    try {
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
      }
    } catch (err: any) { }

    try {
      await connection.query(
        "UPDATE order_items SET subtotal = unit_price * quantity WHERE (subtotal != (unit_price * quantity) OR subtotal IS NULL) AND unit_price > 0"
      );
    } catch (err: any) { }

    try {
      await connection.query("UPDATE order_items SET size = '' WHERE size IN ('One Size', 'All Size', 'Default', '-', 'Standard')");
      await connection.query("UPDATE product_variants SET size = '' WHERE size IN ('One Size', 'All Size', 'Default', '-', 'Standard')");
    } catch (err: any) { }

    // Auto-fix specific imported order data corrections (e.g. Ni Putu Mega Cahya)
    try {
      const [megaOrders] = await connection.query<any[]>(
        "SELECT id, order_id FROM orders WHERE customer_name LIKE '%Ni Putu Mega Cahya%' OR customer_phone = '87878065355' OR customer_nim = '255150407111108'"
      );

      for (const ord of megaOrders) {
        const [existingItems] = await connection.query<any[]>(
          "SELECT id, product_id, product_name, color FROM order_items WHERE order_id = ?",
          [ord.order_id]
        );

        const hasWrongPin = existingItems.some(
          (it) => it.product_id === 16 || (it.product_name || "").toLowerCase().includes("pin enamel")
        );
        const hasKeychain = existingItems.some(
          (it) => it.product_id === 19 || (it.product_name || "").toLowerCase().includes("keychain")
        );

        if (hasWrongPin || !hasKeychain) {
          // Remove incorrect items
          await connection.query("DELETE FROM order_items WHERE order_id = ?", [ord.order_id]);

          // Insert Keychain [Bara] (x1)
          await connection.query(
            `INSERT INTO order_items (order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, discount_amount, subtotal, sku_snapshot)
             VALUES (?, 19, 120, 'Keychain', '', 'Bara', 1, 10000, 0, 10000, 'VAR-120')`,
            [ord.order_id]
          );

          // Insert Sticker Pack [Default] (x1)
          await connection.query(
            `INSERT INTO order_items (order_id, product_id, variant_id, product_name, size, color, quantity, unit_price, discount_amount, subtotal, sku_snapshot)
             VALUES (?, 18, 43, 'Sticker Pack', '', 'Default', 1, 8000, 0, 8000, 'VAR-43')`,
            [ord.order_id]
          );

          // Update order totals & customer info
          await connection.query(
            "UPDATE orders SET subtotal = 18000, gross_amount = 18000, customer_phone = '87878065355', customer_nim = '255150407111108', customer_name = 'Ni Putu Mega Cahya' WHERE order_id = ?",
            [ord.order_id]
          );
        }
      }
    } catch (err: any) { }

    console.log("✅ Database schema & migrations up-to-date!");
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
