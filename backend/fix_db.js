const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: 'db_filkommerch' });
    
    const queries = [
      "ALTER TABLE products ADD COLUMN original_price INT DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN filkom_price INT DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN promo_price INT DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN sale_type VARCHAR(50) DEFAULT 'ready_stock'",
      "ALTER TABLE products ADD COLUMN product_type VARCHAR(50) DEFAULT 'apparel'",
      "ALTER TABLE products ADD COLUMN low_stock_threshold INT DEFAULT 5",
      "ALTER TABLE products ADD COLUMN is_best_seller TINYINT(1) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN is_limited TINYINT(1) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN preorder_start_at DATETIME DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN preorder_end_at DATETIME DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN preorder_moq INT DEFAULT NULL",
      "ALTER TABLE products ADD COLUMN production_eta_days INT DEFAULT NULL"
    ];

    for (let q of queries) {
      try {
        await conn.query(q);
        console.log("Success:", q);
      } catch(e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
           console.log("Skipped (already exists):", q);
        } else {
           console.error("Error on:", q, e.message);
        }
      }
    }
    
    console.log('Database fixed successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
