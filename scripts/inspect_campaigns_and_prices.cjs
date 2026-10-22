const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const campaigns = [];
  const batchPrices = [];
  const products = [];

  function parseRow(line) {
    let str = line.trim();
    if (str.startsWith('(')) str = str.slice(1);
    if (str.endsWith('),') || str.endsWith(');')) str = str.slice(0, -2);
    else if (str.endsWith(')')) str = str.slice(0, -1);

    const values = [];
    let cur = '';
    let inQuotes = false;
    let quoteChar = '';
    let escaped = false;

    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (escaped) { cur += c; escaped = false; continue; }
      if (c === '\\') { escaped = true; cur += c; continue; }
      if (inQuotes) {
        if (c === quoteChar) {
          if (str[i + 1] === quoteChar) { cur += quoteChar; i++; }
          else { inQuotes = false; }
        } else { cur += c; }
      } else {
        if (c === '\'' || c === '"') { inQuotes = true; quoteChar = c; }
        else if (c === ',') { values.push(cur.trim()); cur = ''; }
        else { cur += c; }
      }
    }
    values.push(cur.trim());
    return values.map(v => v === 'NULL' ? null : v);
  }

  let curTable = null;
  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `pre_order_campaigns`')) curTable = 'pre_order_campaigns';
    else if (line.startsWith('INSERT INTO `batch_product_prices`')) curTable = 'batch_product_prices';
    else if (line.startsWith('INSERT INTO `products`')) curTable = 'products';
    else if (line.startsWith('INSERT INTO ') || line.startsWith('CREATE TABLE') || line.startsWith('--')) {
      if (!['pre_order_campaigns', 'batch_product_prices', 'products'].some(t => line.includes('`' + t + '`'))) {
        curTable = null;
      }
    }

    if (curTable && line.trim().startsWith('(')) {
      const row = parseRow(line);
      if (curTable === 'pre_order_campaigns') campaigns.push(row);
      else if (curTable === 'batch_product_prices') batchPrices.push(row);
      else if (curTable === 'products') products.push(row);
    }
  }

  console.log('=== PRE-ORDER CAMPAIGNS ===');
  console.log(JSON.stringify(campaigns, null, 2));

  console.log('\n=== BATCH PRODUCT PRICES ===');
  console.log(JSON.stringify(batchPrices, null, 2));

  console.log('\n=== PRODUCTS (MASTER / READY STOCK CATALOG) ===');
  products.forEach(p => {
    console.log(`ID: ${p[0]} | Name: ${p[2]} | Public Price: ${p[6]} | FILKOM Price: ${p[7]}`);
  });
}

main().catch(console.error);
