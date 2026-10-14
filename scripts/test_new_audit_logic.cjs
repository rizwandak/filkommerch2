const fs = require('fs');
const readline = require('readline');

// Master price mapping based on user's reference table
const BATCH_1_FILKOM = {
  kaos: 105000,
  topi: 80000,
  totebag: 40000,
  keychain: 10000,
  sticker: 8000,
  pin_tas: 4000,
  pin_enamel: 26000
};

const BATCH_2_FILKOM = {
  work_jacket: 249000,
  varsity: 329000,
  half_zip: 179000,
  kaos: 89000,
  topi: 80000,
  tumbler: 79000,
  totebag: 40000,
  notebook: 25000,
  pulpen: 10000,
  keychain: 13000,
  sticker: 13000,
  pin_tas: 6000,
  pin_enamel: 32000,
  // Bundles
  brand_new_days: 27000,
  starter_pack: 99000,
  explorer: 319000,
  proud_to_be_filkom: 349000
};

const RS_FILKOM = {
  work_jacket: 259000,
  varsity: 349000,
  half_zip: 189000,
  kaos: 95000,
  topi: 89000,
  tumbler: 85000,
  totebag: 45000,
  notebook: 27000,
  pulpen: 12000,
  keychain: 15000,
  sticker: 15000,
  pin_tas: 6000,
  pin_enamel: 36000
};

const RS_UMUM = {
  work_jacket: 269000,
  varsity: 359000,
  half_zip: 199000,
  kaos: 99000,
  topi: 95000,
  tumbler: 95000,
  totebag: 49000,
  notebook: 29000,
  pulpen: 12000,
  keychain: 15000,
  sticker: 20000,
  pin_tas: 8000,
  pin_enamel: 40000
};

function normalizeProductKey(name) {
  if (!name) return '';
  const n = String(name).toLowerCase();
  if (n.includes('work jacket')) return 'work_jacket';
  if (n.includes('varsity')) return 'varsity';
  if (n.includes('half zip') || n.includes('halfzip') || n.includes('half-zip')) return 'half_zip';
  if (n.includes('kaos') || n.includes('t-shirt') || n.includes('tee')) return 'kaos';
  if (n.includes('topi')) return 'topi';
  if (n.includes('tumbler') || n.includes('botol')) return 'tumbler';
  if (n.includes('totebag') || n.includes('tote')) return 'totebag';
  if (n.includes('notebook') || n.includes('buku')) return 'notebook';
  if (n.includes('pulpen') || n.includes('pen')) return 'pulpen';
  if (n.includes('keychain') || n.includes('gantungan')) return 'keychain';
  if (n.includes('sticker') || n.includes('stiker')) return 'sticker';
  if (n.includes('pin enamel')) return 'pin_enamel';
  if (n.includes('pin tas') || n.includes('pin 44')) return 'pin_tas';
  if (n.includes('brand new days')) return 'brand_new_days';
  if (n.includes('starter pack')) return 'starter_pack';
  if (n.includes('explorer')) return 'explorer';
  if (n.includes('proud to be filkom')) return 'proud_to_be_filkom';
  return '';
}

function getUpsizeCost(productName, sizeStr) {
  const s = String(sizeStr || '').toUpperCase().trim();
  const n = String(productName || '').toLowerCase();
  if (s === 'XXL' || s === '2XL') return 10000;
  if (s === 'XXXL' || s === '3XL') {
    if (n.includes('varsity')) return 20000;
    return 15000;
  }
  if (s === 'XXXXL' || s === '4XL') return 30000;
  if (s === 'XXXXXL' || s === '5XL') return 40000;
  return 0;
}

function determineOrderBatch(order) {
  const cId = order.pre_order_campaign_id;
  const num = String(order.order_number || order.order_id || '');
  if (cId === 3 || num.startsWith('IMP-')) return 'BATCH_1';
  if (cId === 1) return 'BATCH_2';
  
  const d = order.created_at ? order.created_at.substring(0, 10) : '';
  if (d && d >= '2026-07-01' && d <= '2026-07-15') return 'BATCH_1';
  if (d && d >= '2026-07-16' && d <= '2026-08-08') return 'BATCH_2';
  return 'READY_STOCK';
}

function isFilkomUser(order) {
  const email = String(order.customer_email || '').toLowerCase().trim();
  const nim = String(order.customer_nim || '').trim();
  return email.endsWith('@student.ub.ac.id') || email.endsWith('@ub.ac.id') || nim.length > 0;
}

function isDp(item) {
  const c = String(item.color || '').toUpperCase();
  const s = String(item.size || '').toUpperCase();
  const n = String(item.name || item.product_name || '').toUpperCase();
  if (c.includes('LUNAS') || s.includes('LUNAS') || n.includes('LUNAS') || n.includes('PELUNASAN')) return false;
  return c.includes('DP') || s.includes('DP') || n.includes('DP');
}

function isPelunasan(item) {
  const n = String(item.name || item.product_name || '').toUpperCase();
  const c = String(item.color || '').toUpperCase();
  return n.includes('PELUNASAN') || c.includes('PELUNASAN');
}

function getExpectedItemUnitPrice(item, order) {
  const name = item.name || item.product_name;
  if (String(name).includes('[KOMPONEN BUNDLE]')) return 0;
  
  const key = normalizeProductKey(name);
  const batch = determineOrderBatch(order);
  const filkom = isFilkomUser(order);

  // Check pelunasan
  if (isPelunasan(item)) {
    // 50% of normal price
    if (key === 'work_jacket') return 124500;
    if (key === 'half_zip') return 89500;
    if (key === 'varsity') return 164500;
    if (key === 'proud_to_be_filkom') return 164500;
  }

  // Base price lookup
  let basePrice = 0;
  if (batch === 'BATCH_1') {
    basePrice = BATCH_1_FILKOM[key] || item.unit_price;
  } else if (batch === 'BATCH_2') {
    basePrice = BATCH_2_FILKOM[key] || item.unit_price;
  } else {
    // Ready stock
    basePrice = filkom ? (RS_FILKOM[key] || item.unit_price) : (RS_UMUM[key] || item.unit_price);
  }

  // Jacket DP check
  if (isDp(item)) {
    const upsize = getUpsizeCost(name, item.size);
    const halfBase = Math.floor(basePrice / 2);
    return halfBase + upsize;
  }

  return basePrice;
}

async function run() {
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
        customer_email: v[9],
        customer_nim: v[8],
        subtotal: parseInt(v[12]) || 0,
        discount_amount: parseInt(v[13]) || 0,
        shipping_cost: parseInt(v[15]) || 0,
        gross_amount: parseInt(v[17]) || 0,
        created_at: v[33],
        pre_order_campaign_id: v[43] ? parseInt(v[43]) : null
      });
    }
    if (curT === 'order_items' && l.trim().startsWith('(')) {
      const v = parseRow(l);
      if (v.length >= 10) orderItems.push({
        order_id: v[1],
        product_id: parseInt(v[2]),
        name: v[4],
        size: v[5],
        color: v[10],
        quantity: parseInt(v[6]) || 1,
        unit_price: parseInt(v[7]) || 0,
        subtotal: parseInt(v[9]) || 0
      });
    }
  }

  console.log(`Checking ${orders.size} orders with NEW AUDIT LOGIC...`);

  // Test Bayu and Layla specifically
  const bayu = orders.get('FILKOM-1785489190663');
  const bayuItems = orderItems.filter(i => i.order_id === 'FILKOM-1785489190663');
  const layla = orders.get('FILKOM-1785932016668');
  const laylaItems = orderItems.filter(i => i.order_id === 'FILKOM-1785932016668');

  function auditOrder(ord, items) {
    const batch = determineOrderBatch(ord);
    let expectedSubtotal = 0;
    const itemAudits = [];
    for (const it of items) {
      const expUnitPrice = getExpectedItemUnitPrice(it, ord);
      const expSubtotal = expUnitPrice * it.quantity;
      expectedSubtotal += expSubtotal;
      itemAudits.push({
        name: it.name,
        qty: it.quantity,
        db_unit: it.unit_price,
        exp_unit: expUnitPrice,
        db_sub: it.subtotal,
        exp_sub: expSubtotal
      });
    }
    const diff = ord.subtotal - expectedSubtotal;
    return {
      order_number: ord.order_number,
      customer: ord.customer_name,
      batch: batch,
      db_subtotal: ord.subtotal,
      expectedSubtotal: expectedSubtotal,
      diff: diff,
      isMismatch: diff !== 0,
      items: itemAudits
    };
  }

  console.log('\n--- BAYU PRIYAMBADHA ---');
  console.log(JSON.stringify(auditOrder(bayu, bayuItems), null, 2));

  console.log('\n--- LAYLA AFIFAH ---');
  console.log(JSON.stringify(auditOrder(layla, laylaItems), null, 2));

  let totalMismatches = 0;
  const mismatchList = [];
  for (const [num, ord] of orders) {
    const items = orderItems.filter(i => i.order_id === num);
    if (items.length === 0) continue;
    const a = auditOrder(ord, items);
    if (a.isMismatch) {
      totalMismatches++;
      mismatchList.push(a);
    }
  }

  console.log(`\nTOTAL MISMATCHED ORDERS WITH NEW BATCH MATRIX: ${totalMismatches}`);
  console.log('\nSample remaining mismatches:');
  for (const m of mismatchList.slice(0, 10)) {
    console.log(`  ${m.order_number} | ${m.customer} | Batch: ${m.batch} | DB: Rp ${m.db_subtotal.toLocaleString()} vs Expected: Rp ${m.expectedSubtotal.toLocaleString()} (diff: ${m.diff > 0 ? '+' : ''}${m.diff.toLocaleString()})`);
  }
}

run().catch(console.error);
