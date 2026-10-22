const fs = require('fs');
const readline = require('readline');

async function main() {
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

  let curTable = null;
  for await (const line of rl) {
    if (line.startsWith('INSERT INTO `orders`')) curTable = 'orders';
    else if (line.startsWith('INSERT INTO `order_items`')) curTable = 'order_items';
    else if (line.startsWith('INSERT INTO `offline_sale_items`')) curTable = 'offline_sale_items';
    else if (line.startsWith('INSERT INTO ') || line.startsWith('CREATE TABLE') || line.startsWith('--')) {
      if (!['orders', 'order_items', 'offline_sale_items'].some(t => line.includes('`' + t + '`'))) {
        curTable = null;
      }
    }

    if (curTable && line.trim().startsWith('(')) {
      const row = parseRow(line);
      if (curTable === 'orders') {
        const orderId = row[1];
        orders.set(orderId, {
          orderId,
          channel: row[2],
          customerName: row[7],
          customerEmail: row[9],
          subtotal: Number(row[12]),
          totalAmount: Number(row[17]),
          createdAt: row[33],
          campaignId: row[43] ? Number(row[43]) : null,
        });
      } else if (curTable === 'order_items' || curTable === 'offline_sale_items') {
        orderItems.push({
          orderId: row[1],
          productId: Number(row[2]),
          name: row[4],
          size: row[5],
          quantity: Number(row[6]),
          unitPrice: Number(row[7]),
          subtotal: Number(row[9]),
        });
      }
    }
  }

  // Classify each item
  const tiers = {
    BATCH_1: { filkom: {}, umum: {} },
    BATCH_2: { filkom: {}, umum: {} },
    READY_STOCK: { filkom: {}, umum: {} },
  };

  function getTier(order) {
    if (order.campaignId === 3 || order.orderId.startsWith('IMP-')) return 'BATCH_1';
    if (order.campaignId === 1) return 'BATCH_2';
    const d = order.createdAt ? order.createdAt.substring(0, 10) : '';
    if (d >= '2026-07-03' && d <= '2026-07-15') return 'BATCH_1';
    if (d >= '2026-07-16' && d <= '2026-08-08') return 'BATCH_2';
    return 'READY_STOCK';
  }

  function isFilkom(order) {
    const email = (order.customerEmail || '').toLowerCase();
    return email.endsWith('@student.ub.ac.id') || email.endsWith('@ub.ac.id');
  }

  for (const it of orderItems) {
    const ord = orders.get(it.orderId);
    if (!ord) continue;
    // skip pelunasan DP 0 items
    if (it.unitPrice === 0 && it.name.startsWith('Pelunasan')) continue;

    const tier = getTier(ord);
    const category = isFilkom(ord) ? 'filkom' : 'umum';

    const pName = it.name.toLowerCase().trim();
    const group = tiers[tier][category];
    if (!group[pName]) group[pName] = {};
    if (!group[pName][it.unitPrice]) group[pName][it.unitPrice] = 0;
    group[pName][it.unitPrice] += it.quantity;
  }

  console.log('=== PO BATCH 1 (3 - 12 Juli 2026) ===');
  console.log('FILKOM:', JSON.stringify(tiers.BATCH_1.filkom, null, 2));
  console.log('UMUM:', JSON.stringify(tiers.BATCH_1.umum, null, 2));

  console.log('\n=== PO BATCH 2 (20 Juli - 8 Agustus 2026) ===');
  console.log('FILKOM:', JSON.stringify(tiers.BATCH_2.filkom, null, 2));
  console.log('UMUM:', JSON.stringify(tiers.BATCH_2.umum, null, 2));

  console.log('\n=== READY STOCK (Di Luar Periode PO) ===');
  console.log('FILKOM:', JSON.stringify(tiers.READY_STOCK.filkom, null, 2));
  console.log('UMUM:', JSON.stringify(tiers.READY_STOCK.umum, null, 2));
}

main().catch(console.error);
