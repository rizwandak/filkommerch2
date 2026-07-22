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
      }
    ];

    for (const q of queries) {
      try {
        console.log(`Running schema migration: ${q.name}...`);
        await connection.query(q.sql);
        console.log(`✅ ${q.name} migrated successfully!`);
      } catch (err: any) {
        if (err.code === "ER_DUP_COLUMN_NAME") {
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
