const fs = require('fs');
const readline = require('readline');

async function test() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let curT = null;

  for await (const l of rl) {
    if (l.startsWith('INSERT INTO `product_variants`')) curT = 'variants';
    else if (l.startsWith('INSERT INTO') || l.startsWith('CREATE TABLE') || l.startsWith('--')) {
      if (!l.includes('product_variants')) curT = null;
    }

    if (curT === 'variants' && (l.includes(', 16,') || l.includes(', 19,'))) {
      console.log('VARIANT:', l);
    }
  }
}
test();
