const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function exportSql() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'db_filkommerch',
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    const tables = ['categories', 'products', 'product_variants', 'bundle_items', 'pre_order_campaigns', 'store_settings'];
    let sqlDump = '-- FILKOM MERCH DATABASE DUMP / SEED FILE\n-- Generated automatically for live deployment sync\n\nSET FOREIGN_KEY_CHECKS=0;\n\n';

    for (const table of tables) {
      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      if (rows.length === 0) continue;

      sqlDump += `-- Dumping data for ${table}\n`;
      for (const row of rows) {
        const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
        const values = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return `'${String(v).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
        }).join(', ');

        const updateAssignments = Object.keys(row).map(k => {
          const val = row[k];
          if (val === null || val === undefined) return `\`${k}\`=NULL`;
          if (typeof val === 'number') return `\`${k}\`=${val}`;
          if (val instanceof Date) return `\`${k}\`='${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return `\`${k}\`='${String(val).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
        }).join(', ');

        sqlDump += `INSERT INTO \`${table}\` (${keys}) VALUES (${values}) ON DUPLICATE KEY UPDATE ${updateAssignments};\n`;
      }
      sqlDump += '\n';
    }

    sqlDump += 'SET FOREIGN_KEY_CHECKS=1;\n';
    const outputPath = path.join(__dirname, 'db_sync.sql');
    fs.writeFileSync(outputPath, sqlDump);
    console.log('SQL Export finished successfully to:', outputPath);
    await conn.end();
  } catch (err) {
    console.error("Export error:", err);
  }
}

exportSql();
