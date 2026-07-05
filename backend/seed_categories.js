const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: 'db_filkommerch' });
    await conn.query("INSERT IGNORE INTO categories (name, slug, is_active) VALUES ('Aksesoris', 'aksesoris', 1), ('Apparel Casual', 'apparel-casual', 1), ('Fungsional', 'fungsional', 1)");
    console.log('Categories seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
