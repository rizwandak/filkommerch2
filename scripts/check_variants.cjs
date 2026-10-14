const fs = require('fs');
const readline = require('readline');

async function checkAllVariants() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inVariants = false;
  for await (const line of rl) {
    if (line.includes('INSERT INTO `product_variants`')) {
      inVariants = true;
      continue;
    } else if (line.startsWith('INSERT INTO') || line.startsWith('UNLOCK TABLES')) {
      inVariants = false;
    }

    if (inVariants && line.trim().startsWith('(')) {
      if (line.includes(', 16,') || line.includes(', 17,') || line.includes(', 18,') || line.includes(', 19,') || line.includes(', 28,')) {
        console.log(line);
      }
    }
  }
}
checkAllVariants();
