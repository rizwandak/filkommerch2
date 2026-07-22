import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

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
        name: "seed_bundle_category",
        sql: "INSERT IGNORE INTO categories (name, slug) VALUES ('Bundle', 'bundle')"
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
        name: "link_existing_preorder_products_to_active_campaign",
        sql: "UPDATE products SET pre_order_campaign_id = (SELECT id FROM pre_order_campaigns WHERE is_active = 1 LIMIT 1) WHERE sale_type = 'pre_order' AND (pre_order_campaign_id IS NULL OR pre_order_campaign_id = 0)"
      },
      {
        name: "payments.provider_varchar",
        sql: "ALTER TABLE payments MODIFY COLUMN provider VARCHAR(50) NOT NULL"
      },
      {
        name: "update_payment_mode_mayar",
        sql: "UPDATE store_settings SET payment_mode = 'mayar' WHERE payment_mode = 'midtrans' OR payment_mode IS NULL"
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
      }
    ];

    for (const q of queries) {
      try {
        console.log(`Running: ${q.name}...`);
        await connection.query(q.sql);
        console.log(`✅ Column ${q.name} added successfully!`);
      } catch (err: any) {
        if (err.code === "ER_DUP_COLUMN_NAME") {
          console.log(`ℹ️ Column ${q.name} already exists. Skipping.`);
        } else {
          console.error(`❌ Error adding column ${q.name}:`, err.message);
        }
      }
    }

    // Ensure homepage_layout is updated with the default config if empty
    try {
      const [rows] = await connection.query("SELECT id, homepage_layout FROM store_settings LIMIT 1") as any[];
      const defaultLayout = `[{"id":"default-marquee","title":"Marquee Pengumuman","enabled":true,"elements":[{"id":"default-el-marquee","type":"marquee","config":{"text":"OFFICIAL MERCHANDISE FILKOM UB|PRE-ORDER BATCH #2 STARTING SOON!|KESEMPATAN EMAS DAPAT HARGA MIRING"}}]},{"id":"default-hero","title":"Hero Banner Utama","enabled":true,"elements":[{"id":"default-el-hero","type":"hero_banner","config":{"title":"SHOW YOUR\\nFILKOM PRIDE!","subtitle":"Dapatkan kesempatan membeli dan mendapatkan produk FILKOM Merchandise lebih awal dengan harga diskon up to 30%.","subLabel":"PRE-ORDER BATCH #2","btnText":"KE HALAMAN PRE-ORDER","btnLink":"/pre-order","image":"/uploads/file-1783771681395-509614541.jpg","images":["/uploads/file-1783771681395-509614541.jpg","/uploads/file-1783771692985-152913621.jpg","/uploads/file-1783771704458-72271194.jpg","/uploads/file-1783771822171-440294417.jpg","/uploads/file-1783771831573-600610850.jpg"],"showCountdown":true,"countdownEnd":"2026-07-20T00:00:00","showLookbookBtn":false,"countdownLabel":"PRE-ORDER AKAN DIBUKA DALAM","lookbookBtnText":""}}]},{"id":"default-featured","title":"Koleksi Unggulan","enabled":true,"elements":[{"id":"default-el-featured","type":"product_grid","config":{"title":"OUR MAIN HERO","subtitle":"CHOOSE YOUR LOOK","source":"slugs","slugs":"work-jacket,half-zip,tumbler-stainless,boneka-bara,w,wwswe","maxItems":6}}]},{"id":"default-categories","title":"Kategori Pilihan","enabled":true,"elements":[{"id":"default-el-categories","type":"category_showcase","config":{"title":"Shop By Categories"}}]},{"id":"default-about","title":"Tentang Kami (About FM)","enabled":true,"elements":[{"id":"default-el-about","type":"text_block","config":{"title":"More than Merchandise.","subtitle":"ABOUT FILKOM MERCHANDISE","body":"FILKOM Merchandise (FM) adalah unit resmi merchandise Fakultas Ilmu Komputer Universitas Brawijaya yang dikelola secara profesional oleh mahasiswa. Kami bertekad menjadi wadah kreativitas dan kebanggaan civitas akademika dengan menghadirkan produk eksklusif berkualitas premium, sekaligus mendukung inovasi mahasiswa di lingkungan kampus.","alignment":"center"}}]},{"id":"default-limited","title":"Limited Drop Campaign","enabled":true,"elements":[{"id":"default-el-limited","type":"limited_drop","config":{"title":"Varsity Jacket","subtitle":"Varsity premium dengan bordir logo FILKOM eksklusif, diproduksi terbatas hanya untuk batch ini.","productSlug":"varsity-filkom","image":"","countdownEnd":"2026-08-05T23:59:59+07:00","stockMax":100,"stockCurrent":70}}]},{"id":"default-bundle","title":"Rekomendasi Bundling","enabled":true,"elements":[{"id":"default-el-bundle","type":"bundle_recommendation","config":{"title":"Exclusive Bundles","subtitle":"SPECIAL SAVINGS PACKS","items":[{"name":"Freshman Starter Pack","price":"Rp 120.000","originalPrice":"Rp 145.000","image":"","description":"Paket lengkap maba untuk tampil keren di kampus baru.","itemsList":"Kaos Premium, Totebag Canvas, Sticker Pack","link":"/products"},{"name":"Premium Varsity Bundle","price":"Rp 320.000","originalPrice":"Rp 370.000","image":"","description":"Kombinasi varsity eksklusif dan notebook untuk ngampus.","itemsList":"Varsity Jacket, Notebook Exclusive, Tumbler Stainless","link":"/products"}]}}]},{"id":"default-why","title":"Value Proposition","enabled":true,"elements":[{"id":"default-el-why","type":"value_props","config":{"items":[{"title":"Designed by Students","description":"Setiap detail dirancang untuk merepresentasikan kehidupan perkuliahan di FILKOM."},{"title":"Official Merchandise","description":"Satu-satunya penyedia merchandise berlisensi resmi di bawah BEM & Fakultas."},{"title":"Premium Materials","description":"Jaminan bahan nyaman, awet, dan nyaman dipakai harian."},{"title":"Support Innovation","description":"Seluruh hasil penjualan dialokasikan untuk mendukung kegiatan dan inovasi kemahasiswaan."}]}}]},{"id":"default-gallery","title":"Lifestyle Gallery","enabled":true,"elements":[{"id":"default-el-gallery","type":"gallery","config":{"title":"Campus Lookbook","subtitle":"@FILKOMMERCH","items":[{"id":"g1","image":"","caption":"Varsity jacket di gazebo"},{"id":"g2","image":"","caption":"Ngoding pake hoodie premium"},{"id":"g3","image":"","caption":"Totebag praktis kuliah"},{"id":"g4","image":"","caption":"Lifestyle kaos debugging"}]}}]},{"id":"default-testimonial","title":"Testimonial Pelanggan","enabled":true,"elements":[{"id":"default-el-testimonial","type":"testimonial","config":{"title":"Campus Voices","subtitle":"TESTIMONIALS","items":[{"id":"t1","name":"Rizwan Dak","role":"Informatika 2024","content":"Varsity-nya tebal banget, bordirannya rapi pol. Nyaman buat dipake kuliah seharian di ruangan AC FILKOM."},{"id":"t2","name":"Ahmad Jauhari","role":"Sistem Informasi 2023","content":"Desain kaos debugging-nya relate banget sama kehidupan anak IT. Bahan katun combed-nya adem dan ga gampang melar."}]}}]},{"id":"default-faq","title":"Pertanyaan Umum (FAQ)","enabled":true,"elements":[{"id":"default-el-faq","type":"faq","config":{"items":[{"id":"size","q":"Apakah barang pre-order bisa dikirim ke luar kota?","a":"Bisa bro/sis! Kami menyediakan opsi pengiriman reguler J&T/JNE ke seluruh Indonesia selain opsi Ambil di Gazebo FILKOM UB."},{"id":"po","q":"Berapa lama proses produksi Pre-Order?","a":"Proses produksi memakan waktu sekitar 14-21 hari kerja setelah sesi Pre-Order ditutup secara resmi."},{"id":"pickup","q":"Bagaimana cara memilih ukuran yang pas (sizing)?","a":"Setiap halaman produk dilengkapi dengan Size Chart lengkap. Kami merekomendasikan mengukur kaos atau jaket Anda yang biasa dipakai lalu mencocokkannya."},{"id":"refund","q":"Apakah bisa mengajukan pengembalian (refund)?","a":"Refund hanya diperbolehkan apabila terdapat kesalahan pengiriman produk atau cacat produksi major dari vendor kami."}]}}]}]`;
      if (rows && rows.length > 0) {
        if (!rows[0].homepage_layout) {
          console.log("Updating empty homepage_layout with default config...");
          await connection.query("UPDATE store_settings SET homepage_layout = ? WHERE id = ?", [defaultLayout, rows[0].id]);
          console.log("✅ homepage_layout updated successfully in store_settings!");
        }
      } else {
        console.log("No store_settings row found. Creating one with default config...");
        await connection.query(
          "INSERT INTO store_settings (store_name, address, phone, tax_rate, homepage_layout) VALUES (?, ?, ?, ?, ?)",
          ["FILKOM Merch", "FILKOM UB", "081234567890", 0, defaultLayout]
        );
        console.log("✅ store_settings created and populated successfully!");
      }
    } catch (err: any) {
      console.error("Error seeding homepage_layout:", err.message);
    }

    // Drop old foreign keys on order_items if they exist and re-create them with ON DELETE SET NULL
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

    // Automatically execute db_sync.sql seed file if available
    try {
      const syncFilePath = path.join(__dirname, "../db_sync.sql");
      const altSyncPath = path.join(__dirname, "db_sync.sql");
      const targetSyncPath = fs.existsSync(syncFilePath) ? syncFilePath : fs.existsSync(altSyncPath) ? altSyncPath : null;

      if (targetSyncPath) {
        console.log("Found db_sync.sql! Synchronizing database records...");
        const sqlContent = fs.readFileSync(targetSyncPath, "utf-8");
        const statements = sqlContent
          .split(";")
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith("--"));

        for (const statement of statements) {
          try {
            await connection.query(statement);
          } catch (err: any) {
            console.error("Error executing sync statement:", err.message);
          }
        }
        console.log("✅ Database records synchronized successfully from db_sync.sql!");
      }
    } catch (syncErr: any) {
      console.error("Error running db_sync.sql:", syncErr.message);
    }

    console.log("Migration finished successfully!");
  } catch (err) {
    console.error("Fatal connection error:", err);
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
