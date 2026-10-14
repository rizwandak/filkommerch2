const fs = require('fs');
const readline = require('readline');

async function test() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const orders = new Map();
  const orderItems = [];

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

  let curT = null;
  for await (const l of rl) {
    if (l.startsWith('INSERT INTO `orders`')) curT = 'orders';
    else if (l.startsWith('INSERT INTO `order_items`')) curT = 'order_items';
    else if (l.startsWith('INSERT INTO') || l.startsWith('CREATE TABLE') || l.startsWith('--')) {
      if (!['orders','order_items'].some(t => l.includes('`' + t + '`'))) curT = null;
    }

    if (curT === 'orders' && l.trim().startsWith('(')) {
      const v = parseRow(l);
      if (v.length >= 44) orders.set(v[1], {
        order_number: v[1],
        customer_name: v[7],
        subtotal: parseInt(v[12]),
        discount: parseInt(v[13]),
        shipping: parseInt(v[15]),
        gross: parseInt(v[17]),
        payment_status: v[18],
        created_at: v[33],
        campaign_id: v[43] ? parseInt(v[43]) : null
      });
    }
    if (curT === 'order_items' && l.trim().startsWith('(')) {
      const v = parseRow(l);
      if (v.length >= 10) orderItems.push({
        order_id: v[1],
        product_id: parseInt(v[2]),
        name: v[4],
        size: v[5],
        qty: parseInt(v[6]),
        unit_price: parseInt(v[7]),
        subtotal: parseInt(v[9])
      });
    }
  }

  const bayu = orders.get('FILKOM-1785489190663');
  const bayuItems = orderItems.filter(i => i.order_id === 'FILKOM-1785489190663');
  console.log('Bayu Priyambadha Order:');
  console.log(JSON.stringify(bayu, null, 2));
  console.log('Bayu Priyambadha Items:');
  console.log(JSON.stringify(bayuItems, null, 2));
}

test().catch(console.error);
