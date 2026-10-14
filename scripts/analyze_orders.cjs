const fs = require('fs');
const readline = require('readline');

async function analyze() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let mode = null; // 'orders' or 'order_items'
  let orderColumns = [];
  let orderItemColumns = [];

  const orders = new Map(); // order_id -> { order_id, subtotal, gross_amount, customer_name, raw }
  const orderItems = new Map(); // order_id -> [ items ]

  // Helper to split SQL values row
  // e.g. (val1, val2, ...)
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
      if (escaped) {
        cur += c;
        escaped = false;
        continue;
      }
      if (c === '\\') {
        escaped = true;
        cur += c;
        continue;
      }
      if (inQuotes) {
        if (c === quoteChar) {
          if (str[i + 1] === quoteChar) {
            cur += quoteChar;
            i++; // skip escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          cur += c;
        }
      } else {
        if (c === "'" || c === '"') {
          inQuotes = true;
          quoteChar = c;
        } else if (c === ',') {
          values.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
    }
    values.push(cur.trim());
    return values.map(v => {
      if (v === 'NULL') return null;
      if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
        return v.slice(1, -1);
      }
      const num = Number(v);
      return isNaN(num) ? v : num;
    });
  }

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.includes('INSERT INTO `orders`')) {
      mode = 'orders';
      // extract columns
      const match = trimmed.match(/\((`[^`]+`(?:,\s*`[^`]+`)*)\)/);
      if (match) {
        orderColumns = match[1].split(',').map(s => s.trim().replace(/`/g, ''));
      }
      continue;
    } else if (trimmed.includes('INSERT INTO `order_items`')) {
      mode = 'order_items';
      const match = trimmed.match(/\((`[^`]+`(?:,\s*`[^`]+`)*)\)/);
      if (match) {
        orderItemColumns = match[1].split(',').map(s => s.trim().replace(/`/g, ''));
      }
      continue;
    } else if (trimmed.startsWith('INSERT INTO') || trimmed.startsWith('UNLOCK TABLES') || trimmed.startsWith('DROP TABLE')) {
      mode = null;
      continue;
    }

    if (mode === 'orders' && trimmed.startsWith('(')) {
      const vals = parseRow(trimmed);
      const row = {};
      orderColumns.forEach((col, idx) => {
        row[col] = vals[idx];
      });
      orders.set(row.order_id, row);
    } else if (mode === 'order_items' && trimmed.startsWith('(')) {
      const vals = parseRow(trimmed);
      const row = {};
      orderItemColumns.forEach((col, idx) => {
        row[col] = vals[idx];
      });
      if (!orderItems.has(row.order_id)) {
        orderItems.set(row.order_id, []);
      }
      orderItems.get(row.order_id).push(row);
    }
  }

  console.log(`Parsed ${orders.size} orders, ${orderItems.size} orders with items`);
  console.log('Order columns:', orderColumns);
  console.log('Order item columns:', orderItemColumns);

  // Now analyze discrepancies
  const mismatches = [];

  for (const [orderId, order] of orders.entries()) {
    const items = orderItems.get(orderId) || [];
    const itemSubtotalSum = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
    const orderSubtotal = Number(order.subtotal) || 0;
    const grossAmount = Number(order.gross_amount) || 0;
    const shipping = Number(order.shipping_cost) || 0;
    const discount = Number(order.discount_amount) || 0;
    const voucherDiscount = Number(order.voucher_discount) || 0;
    const uniqueCode = Number(order.unique_code) || 0;

    // Expected gross_amount: itemSubtotalSum + shipping - discount - voucherDiscount + uniqueCode
    const expectedGross = itemSubtotalSum + shipping - discount - voucherDiscount + uniqueCode;

    const subtotalDiff = orderSubtotal - itemSubtotalSum;
    const grossDiff = grossAmount - expectedGross;

    if (subtotalDiff !== 0 || grossDiff !== 0) {
      mismatches.push({
        order_id: orderId,
        id: order.id,
        customer_name: order.customer_name,
        created_at: order.created_at,
        channel: order.channel,
        payment_status: order.payment_status,
        orderSubtotal,
        itemSubtotalSum,
        subtotalDiff,
        grossAmount,
        expectedGross,
        grossDiff,
        shipping,
        discount,
        voucherDiscount,
        uniqueCode,
        items: items.map(i => ({
          name: i.product_name,
          size: i.size,
          quantity: i.quantity,
          price: i.price,
          subtotal: i.subtotal,
          type: i.item_type
        }))
      });
    }
  }

  console.log(`\nFound ${mismatches.length} mismatches!`);
  fs.writeFileSync('scripts/mismatches.json', JSON.stringify(mismatches, null, 2));
  mismatches.forEach(m => {
    console.log(`Order: ${m.order_id} (${m.customer_name}) | Subtotal: DB=${m.orderSubtotal} vs ItemsSum=${m.itemSubtotalSum} (diff=${m.subtotalDiff}) | Gross: DB=${m.grossAmount} vs Expected=${m.expectedGross} (diff=${m.grossDiff})`);
  });
}

analyze().catch(console.error);
