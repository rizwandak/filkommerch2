const fs = require('fs');
const readline = require('readline');

async function listProducts() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inProducts = false;
  let inVariants = false;

  for await (const line of rl) {
    if (line.includes('INSERT INTO `products`')) {
      inProducts = true;
      inVariants = false;
      continue;
    } else if (line.includes('INSERT INTO `product_variants`')) {
      inVariants = true;
      inProducts = false;
      continue;
    } else if (line.startsWith('INSERT INTO') || line.startsWith('UNLOCK TABLES')) {
      inProducts = false;
      inVariants = false;
    }

    if (inProducts && line.trim().startsWith('(')) {
      console.log('PRODUCT:', line.substring(0, 160));
    }
  }
}
listProducts();
