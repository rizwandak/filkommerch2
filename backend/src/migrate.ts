import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_filkommerch",
  port: parseInt(process.env.DB_PORT || "3306"),
};

console.log("Connecting to database:", dbConfig.database, "on", dbConfig.host);

async function run() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log("Connected to MySQL successfully!");

    const queries = [
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

    console.log("Migration finished successfully!");
  } catch (err) {
    console.error("Fatal connection error:", err);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();
