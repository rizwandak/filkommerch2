const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const orders = new Map();
  const orderItems = [];
  const products = new Map();
  const campaigns = new Map();
  const activityLogs = [];

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
    } else if (line.startsWith('INSERT INTO `pre_order_campaigns`')) {
      currentInsertTable = 'pre_order_campaigns';
    } else if (line.startsWith('INSERT INTO `activity_logs`')) {
      currentInsertTable = 'activity_logs';
    } else if (line.startsWith('INSERT INTO') || line.startsWith('CREATE TABLE') || line.startsWith('--')) {
      if (!['orders','order_items','products','pre_order_campaigns','activity_logs'].some(t => line.includes('`' + t + '`'))) {
        currentInsertTable = null;
      }
    }

    if (currentInsertTable === 'pre_order_campaigns' && line.includes('(')) {
      const rows = line.replace(/^INSERT INTO `pre_order_campaigns`[^V]*VALUES\s*/i, '');
      const rowSplits = rows.split(/\),\s*\(/);
      for (let raw of rowSplits) {
        if (raw.startsWith('(')) raw = raw.slice(1);
        if (raw.endsWith(');')) raw = raw.slice(0, -2);
        if (raw.endsWith(')')) raw = raw.slice(0, -1);
        const vals = parseRow('(' + raw + ')');
        if (vals.length >= 5) {
          campaigns.set(parseInt(vals[0]), {
            batch_name: vals[1],
            start_date: vals[2],
            end_date: vals[3],
            extended_end_date: vals[4]
          });
        }
      }
    }

    if (currentInsertTable === 'orders' && line.trim().startsWith('(')) {
      const vals = parseRow(line);
      if (vals.length >= 44) {
        const orderId = vals[1]; // order_number or id
        orders.set(orderId, {
          db_id: parseInt(vals[0]),
          order_number: orderId,
          channel: vals[2],
          customer_name: vals[7],
          customer_email: vals[9],
          subtotal: parseInt(vals[12]) || 0,
          discount_amount: parseInt(vals[13]) || 0,
          shipping_cost: parseInt(vals[15]) || 0,
          gross_amount: parseInt(vals[17]) || 0,
          payment_status: vals[18],
          order_status: vals[19],
          created_at: vals[33],
          pre_order_campaign_id: vals[43] ? parseInt(vals[43]) : null,
          voucher_code: vals[37]
        });
      }
    }

    if (currentInsertTable === 'order_items' && line.trim().startsWith('(')) {
      const vals = parseRow(line);
      if (vals.length >= 10) {
        orderItems.push({
          id: parseInt(vals[0]),
          order_id: vals[1],
          product_id: parseInt(vals[2]),
          variant_id: parseInt(vals[3]),
          product_name: vals[4],
          size: vals[5],
          quantity: parseInt(vals[6]),
          unit_price: parseInt(vals[7]),
          discount_amount: parseInt(vals[8]) || 0,
          subtotal: parseInt(vals[9]),
          color: vals[10]
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
          filkom_price: vals[7] ? parseInt(vals[7]) : null,
          sale_type: vals[10],
          pre_order_campaign_id: vals[11] ? parseInt(vals[11]) : null
        });
      }
    }

    if (currentInsertTable === 'activity_logs' && line.trim().startsWith('(')) {
      const vals = parseRow(line);
      if (vals.length >= 10) {
        // action, description, entity_type, old_data, new_data
        activityLogs.push({
          action: vals[4],
          description: vals[5],
          entity_type: vals[6],
          entity_id: vals[7],
          old_data: vals[8],
          new_data: vals[9],
          created_at: vals[12]
        });
      }
    }
  }

  console.log(`Campaigns: ${campaigns.size}`);
  for (const [id, c] of campaigns) {
    console.log(`  Campaign #${id}: ${c.batch_name} (${c.start_date} to ${c.end_date}, ext: ${c.extended_end_date})`);
  }
  console.log(`Orders: ${orders.size}`);
  console.log(`Order Items: ${orderItems.length}`);
  console.log(`Products: ${products.size}`);
  console.log(`Activity Logs: ${activityLogs.length}`);

  // Check activity logs related to products or pricing or batch
  const priceLogs = activityLogs.filter(l => 
    (l.description && (l.description.includes('price') || l.description.includes('harga') || l.description.includes('batch'))) ||
    l.entity_type === 'product' || l.entity_type === 'campaign' || l.action.includes('price') || l.action.includes('product')
  );
  console.log(`\nPrice/Product related activity logs: ${priceLogs.length}`);
  for (const l of priceLogs.slice(0, 10)) {
    console.log(`  [${l.created_at}] Action: ${l.action} | Desc: ${l.description} | Old: ${l.old_data} | New: ${l.new_data}`);
  }

  // Now group order_items by product_id and see price distribution
  const pPricing = {};
  for (const item of orderItems) {
    const pId = item.product_id;
    const ord = orders.get(item.order_id);
    if (!pPricing[pId]) {
      const prod = products.get(pId);
      pPricing[pId] = {
        name: prod ? prod.name : item.product_name,
        rs_filkom: prod ? prod.filkom_price : null,
        rs_public: prod ? prod.price : null,
        prices: {}
      };
    }
    const up = item.unit_price;
    if (!pPricing[pId].prices[up]) {
      pPricing[pId].prices[up] = [];
    }
    pPricing[pId].prices[up].push({
      order_id: item.order_id,
      customer: ord ? ord.customer_name : 'unknown',
      date: ord ? ord.created_at : null,
      campaign_id: ord ? ord.pre_order_campaign_id : null,
      qty: item.quantity,
      subtotal: item.subtotal,
      ord_subtotal: ord ? ord.subtotal : null
    });
  }

  console.log('\n======================================================');
  console.log('PRICE TIERS PER PRODUCT FROM ORDER_ITEMS:');
  console.log('======================================================');

  for (const [pId, pInfo] of Object.entries(pPricing)) {
    console.log(`\nProduct [${pId}] ${pInfo.name}`);
    console.log(`  Current RS FILKOM: ${pInfo.rs_filkom?.toLocaleString('id-ID')} | RS Public: ${pInfo.rs_public?.toLocaleString('id-ID')}`);
    
    const sortedPrices = Object.keys(pInfo.prices).map(Number).sort((a,b) => a - b);
    for (const pr of sortedPrices) {
      const list = pInfo.prices[pr];
      const dates = list.map(x => x.date).filter(Boolean).sort();
      const minDate = dates[0] ? dates[0].substring(0, 10) : 'N/A';
      const maxDate = dates[dates.length - 1] ? dates[dates.length - 1].substring(0, 10) : 'N/A';
      
      // Categorize dates into:
      // Batch 1: 2026-07-03 to 2026-07-12
      // Batch 2: 2026-07-20 to 2026-08-05
      // Ready stock / later: after 2026-08-05
      let b1Count = 0, b2Count = 0, rsCount = 0, otherCount = 0;
      for (const d of dates) {
        const dt = d.substring(0, 10);
        if (dt >= '2026-07-01' && dt <= '2026-07-15') b1Count++;
        else if (dt >= '2026-07-16' && dt <= '2026-08-10') b2Count++;
        else rsCount++;
      }
      
      const campaigns = [...new Set(list.map(x => x.campaign_id))];
      console.log(`  -> Rp ${pr.toLocaleString('id-ID').padStart(9)}: ${list.length} items | Date: ${minDate} to ${maxDate} | B1: ${b1Count}, B2: ${b2Count}, Later: ${rsCount} | Campaigns: [${campaigns.join(', ')}]`);
    }
  }
}

run().catch(console.error);
