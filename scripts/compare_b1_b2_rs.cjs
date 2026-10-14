const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const orders = new Map();
  const orderItems = [];
  const products = new Map();

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

  let currentInsertTable = null;

  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `orders`')) {
      currentInsertTable = 'orders';
    } else if (line.startsWith('INSERT INTO `order_items`')) {
      currentInsertTable = 'order_items';
    } else if (line.startsWith('INSERT INTO `products`')) {
      currentInsertTable = 'products';
    } else if (line.startsWith('INSERT INTO') || line.startsWith('CREATE TABLE') || line.startsWith('--')) {
      if (!['orders','order_items','products'].some(t => line.includes('`' + t + '`'))) {
        currentInsertTable = null;
      }
    }

    if (currentInsertTable === 'orders' && line.trim().startsWith('(')) {
      const vals = parseRow(line);
      if (vals.length >= 44) {
        const orderNum = vals[1];
        orders.set(orderNum, {
          db_id: parseInt(vals[0]),
          order_number: orderNum,
          customer_name: vals[7],
          customer_email: vals[9],
          subtotal: parseInt(vals[12]) || 0,
          created_at: vals[33],
          batch_source: vals[42],
          pre_order_campaign_id: vals[43] ? parseInt(vals[43]) : null
        });
      }
    }

    if (currentInsertTable === 'order_items' && line.trim().startsWith('(')) {
      const vals = parseRow(line);
      if (vals.length >= 10) {
        orderItems.push({
          order_id: vals[1],
          product_id: parseInt(vals[2]),
          product_name: vals[4],
          size: vals[5],
          quantity: parseInt(vals[6]),
          unit_price: parseInt(vals[7]),
          subtotal: parseInt(vals[9])
        });
      }
    }

    if (currentInsertTable === 'products' && line.trim().startsWith('(')) {
      const vals = parseRow(line);
      if (vals.length >= 11) {
        products.set(parseInt(vals[0]), {
          id: parseInt(vals[0]),
          name: vals[2],
          price: parseInt(vals[6]),
          filkom_price: vals[7] ? parseInt(vals[7]) : null
        });
      }
    }
  }

  // Check how many orders are in Batch 1 (campaign_id = 3 or IMP-*) vs Batch 2 (campaign_id = 1 or dates)
  let b1Orders = 0, b2Orders = 0, nullCampaignOrders = 0;
  const b1Items = [];
  const b2Items = [];
  const rsItems = [];

  for (const item of orderItems) {
    const ord = orders.get(item.order_id);
    if (!ord) continue;
    
    // Determine batch
    let batch = 'UNKNOWN';
    if (ord.pre_order_campaign_id === 3 || ord.order_number.startsWith('IMP-')) {
      batch = 'BATCH_1';
      b1Items.push({ ...item, order: ord });
    } else if (ord.pre_order_campaign_id === 1) {
      batch = 'BATCH_2';
      b2Items.push({ ...item, order: ord });
    } else {
      // By date
      const d = ord.created_at ? ord.created_at.substring(0, 10) : '';
      if (d >= '2026-07-01' && d <= '2026-07-15') {
        batch = 'BATCH_1';
        b1Items.push({ ...item, order: ord });
      } else if (d >= '2026-07-16' && d <= '2026-08-08') {
        batch = 'BATCH_2';
        b2Items.push({ ...item, order: ord });
      } else {
        batch = 'READY_STOCK';
        rsItems.push({ ...item, order: ord });
      }
    }
  }

  console.log(`Classified items: B1=${b1Items.length}, B2=${b2Items.length}, RS=${rsItems.length}`);

  // Product price summary across the 3 categories
  const summary = {};

  function record(items, category) {
    for (const it of items) {
      const pId = it.product_id;
      if (!summary[pId]) {
        const prod = products.get(pId);
        summary[pId] = {
          name: prod ? prod.name : it.product_name,
          current_rs_filkom: prod ? prod.filkom_price : null,
          current_rs_public: prod ? prod.price : null,
          BATCH_1: new Set(),
          BATCH_2: new Set(),
          READY_STOCK: new Set()
        };
      }
      summary[pId][category].add(it.unit_price);
    }
  }

  record(b1Items, 'BATCH_1');
  record(b2Items, 'BATCH_2');
  record(rsItems, 'READY_STOCK');

  console.log('\n========================================================================================');
  console.log('EXACT COMPARISON: BATCH 1 vs BATCH 2 vs READY STOCK PER PRODUCT');
  console.log('========================================================================================');
  for (const [pId, info] of Object.entries(summary)) {
    const b1Str = info.BATCH_1.size > 0 ? [...info.BATCH_1].map(p => 'Rp ' + p.toLocaleString('id-ID')).join(', ') : '(Tidak dijual di Batch 1)';
    const b2Str = info.BATCH_2.size > 0 ? [...info.BATCH_2].map(p => 'Rp ' + p.toLocaleString('id-ID')).join(', ') : '(Tidak dijual di Batch 2)';
    const rsStr = info.READY_STOCK.size > 0 ? [...info.READY_STOCK].map(p => 'Rp ' + p.toLocaleString('id-ID')).join(', ') : '(Belum ada di RS)';
    
    console.log(`\nProduct [${pId}] ${info.name}:`);
    console.log(`  Katalog Saat Ini (RS): FILKOM Rp ${info.current_rs_filkom?.toLocaleString('id-ID') || '-'} | Umum Rp ${info.current_rs_public?.toLocaleString('id-ID') || '-'}`);
    console.log(`  -> PO BATCH 1 : ${b1Str}`);
    console.log(`  -> PO BATCH 2 : ${b2Str}`);
    console.log(`  -> READY STOCK: ${rsStr}`);
  }

  // Only print summary table

}

run().catch(console.error);
