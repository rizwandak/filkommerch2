const fs = require('fs');
const readline = require('readline');

/**
 * Analyze ALL order items to determine if the unit_price used
 * matches the correct price tier (Batch 1 PO, Batch 2 PO, or Ready Stock).
 * 
 * Pre-order campaigns:
 * - campaign_id=1 -> "Batch #2", 2026-07-20 ~ 2026-08-05
 * - campaign_id=3 -> "Batch #1", 2026-07-03 ~ 2026-07-12
 */

async function analyze() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const orders = new Map();
  const orderItems = new Map();
  const products = new Map();
  const batchPrices = new Map();
  const campaigns = new Map();

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
    } else if (line.startsWith('INSERT INTO `batch_product_prices`')) {
      currentInsertTable = 'batch_product_prices';
    } else if (line.startsWith('INSERT INTO `pre_order_campaigns`')) {
      currentInsertTable = 'pre_order_campaigns';
    } else if (line.startsWith('INSERT INTO') || line.startsWith('CREATE TABLE') || line.startsWith('--')) {
      if (!['orders','order_items','products','batch_product_prices','pre_order_campaigns'].some(t => line.includes('`' + t + '`'))) {
        currentInsertTable = null;
      }
    }

    // Parse campaigns
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
        const orderId = vals[1];
        orders.set(orderId, {
          id: parseInt(vals[0]),
          order_id: orderId,
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
        const orderId = vals[1];
        if (!orderItems.has(orderId)) orderItems.set(orderId, []);
        orderItems.get(orderId).push({
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
          name: vals[2],
          price: parseInt(vals[6]),
          filkom_price: parseInt(vals[7]),
          sale_type: vals[9],
          product_type: vals[10],
          original_price: vals[11] ? parseInt(vals[11]) : null,
        });
      }
    }

    if (currentInsertTable === 'batch_product_prices' && line.trim().startsWith('(')) {
      const vals = parseRow(line);
      if (vals.length >= 5) {
        const key = `${vals[1]}:${vals[2]}`;
        batchPrices.set(key, {
          campaign_id: parseInt(vals[1]),
          product_id: parseInt(vals[2]),
          selling_price: parseInt(vals[3]),
          filkom_price: vals[4] ? parseInt(vals[4]) : null
        });
      }
    }
  }

  console.log('=== PARSING RESULTS ===');
  console.log(`Orders: ${orders.size}`);
  console.log(`Order Items (unique order_ids): ${orderItems.size}`);
  console.log(`Products: ${products.size}`);
  console.log(`Batch Prices: ${batchPrices.size}`);
  console.log(`Campaigns: ${campaigns.size}`);
  console.log('');

  console.log('=== PRE-ORDER CAMPAIGNS ===');
  for (const [id, c] of campaigns) {
    console.log(`  Campaign #${id}: "${c.batch_name}" (${c.start_date} ~ ${c.end_date}, extended: ${c.extended_end_date})`);
  }
  console.log('');

  console.log('=== PRODUCT PRICE TIERS ===');
  for (const [id, p] of products) {
    console.log(`  Product #${id} | ${p.name} | RS_Public=${p.price} | RS_FILKOM=${p.filkom_price} | ${p.sale_type}`);
  }
  console.log('');

  console.log('=== BATCH PRODUCT PRICES ===');
  if (batchPrices.size === 0) {
    console.log('  (empty - no batch-specific pricing found in batch_product_prices table)');
    console.log('  => The system likely changed products.price over time for different batches');
    console.log('  => Current prices in products table are the READY STOCK prices');
  } else {
    for (const [key, bp] of batchPrices) {
      const campaign = campaigns.get(bp.campaign_id);
      const product = products.get(bp.product_id);
      console.log(`  ${campaign?.batch_name} | ${product?.name} | selling_price=${bp.selling_price} | filkom_price=${bp.filkom_price}`);
    }
  }
  console.log('');

  // ================================================================
  // MAIN ANALYSIS
  // ================================================================
  console.log('=== DETAILED MISMATCH ANALYSIS ===');
  console.log('');

  const mismatches = [];
  let totalOrdersAnalyzed = 0;

  for (const [orderId, order] of orders) {
    if (order.channel !== 'online') continue;
    if (!['paid', 'pending'].includes(order.payment_status) && order.order_status !== 'completed') continue;
    
    const items = orderItems.get(orderId) || [];
    if (items.length === 0) continue;

    totalOrdersAnalyzed++;

    const itemSum = items.reduce((sum, item) => {
      if (item.product_name.includes('[KOMPONEN BUNDLE]')) return sum;
      return sum + item.subtotal;
    }, 0);

    const diff = order.subtotal - itemSum;

    const itemAnalysis = [];
    for (const item of items) {
      if (item.product_name.includes('[KOMPONEN BUNDLE]')) continue;

      const product = products.get(item.product_id);
      if (!product) {
        itemAnalysis.push({ ...item, matchedTier: 'UNKNOWN_PRODUCT', allPriceTiers: {} });
        continue;
      }

      const priceTiers = {
        ready_stock_public: product.price,
        ready_stock_filkom: product.filkom_price,
      };

      for (const [key, bp] of batchPrices) {
        if (bp.product_id === item.product_id) {
          const campaign = campaigns.get(bp.campaign_id);
          const batchLabel = campaign?.batch_name?.replace(/\s+/g, '_') || `Campaign${bp.campaign_id}`;
          priceTiers[`${batchLabel}_public`] = bp.selling_price;
          if (bp.filkom_price) priceTiers[`${batchLabel}_filkom`] = bp.filkom_price;
        }
      }

      let matchedTier = 'NO_MATCH';
      for (const [tier, price] of Object.entries(priceTiers)) {
        if (item.unit_price === price) { matchedTier = tier; break; }
      }

      if (matchedTier === 'NO_MATCH') {
        for (const [tier, price] of Object.entries(priceTiers)) {
          const dpPrice = Math.round(price / 2);
          if (item.unit_price === dpPrice) { matchedTier = `DP50%_of_${tier}`; break; }
          if (Math.abs(item.unit_price - dpPrice) <= 500 && item.product_name.includes('DP')) {
            matchedTier = `DP50%_approx_${tier} (expected ${dpPrice}, got ${item.unit_price})`;
            break;
          }
        }
      }

      itemAnalysis.push({ ...item, matchedTier, allPriceTiers: priceTiers });
    }

    if (diff !== 0) {
      mismatches.push({
        order_id: orderId,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        created_at: order.created_at,
        payment_status: order.payment_status,
        pre_order_campaign_id: order.pre_order_campaign_id,
        campaign_name: order.pre_order_campaign_id ? campaigns.get(order.pre_order_campaign_id)?.batch_name : null,
        order_subtotal: order.subtotal,
        item_sum: itemSum,
        diff: diff,
        gross_amount: order.gross_amount,
        items: itemAnalysis
      });
    }
  }

  console.log(`Total online orders analyzed: ${totalOrdersAnalyzed}`);
  console.log(`Orders with subtotal mismatches: ${mismatches.length}`);
  console.log('');

  mismatches.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  for (const m of mismatches) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`ORDER: ${m.order_id}`);
    console.log(`Customer: ${m.customer_name} (${m.customer_email})`);
    console.log(`Date: ${m.created_at}`);
    console.log(`Campaign: ${m.campaign_name || 'None (Ready Stock)'} (id=${m.pre_order_campaign_id})`);
    console.log(`Order Subtotal (charged): ${m.order_subtotal}`);
    console.log(`Item Sum (calculated): ${m.item_sum}`);
    console.log(`DIFFERENCE: ${m.diff > 0 ? '+' : ''}${m.diff} (${m.diff > 0 ? 'OVERCHARGED' : 'UNDERCHARGED'})`);
    console.log(`  Items:`);
    for (const item of m.items) {
      console.log(`    - ${item.product_name} (size:${item.size}, color:${item.color})`);
      console.log(`      qty=${item.quantity}, unit_price=${item.unit_price}, subtotal=${item.subtotal}`);
      console.log(`      Matched Tier: ${item.matchedTier}`);
      console.log(`      All Tiers: ${JSON.stringify(item.allPriceTiers)}`);
    }
    console.log('');
  }

  // CASE STUDY: Bayu
  console.log('═══════════════════════════════════════════════════════════');
  console.log('CASE STUDY: BAYU PRIYAMBADHA (FILKOM-1785489190663)');
  console.log('═══════════════════════════════════════════════════════════');
  const bayuOrder = orders.get('FILKOM-1785489190663');
  const bayuItems = orderItems.get('FILKOM-1785489190663') || [];
  if (bayuOrder) {
    console.log(`Customer: ${bayuOrder.customer_name}`);
    console.log(`Date: ${bayuOrder.created_at}`);
    console.log(`Campaign ID: ${bayuOrder.pre_order_campaign_id}`);
    const topiProduct = products.get(24);
    console.log('Topi Baseball (id=24):');
    console.log(`  RS Public: ${topiProduct?.price}`);
    console.log(`  RS FILKOM: ${topiProduct?.filkom_price}`);
    for (const [key, bp] of batchPrices) {
      if (bp.product_id === 24) {
        const campaign = campaigns.get(bp.campaign_id);
        console.log(`  ${campaign?.batch_name} Public: ${bp.selling_price}, FILKOM: ${bp.filkom_price}`);
      }
    }
    console.log('Order items:');
    for (const item of bayuItems) {
      console.log(`  ${item.product_name}: unit_price=${item.unit_price}, subtotal=${item.subtotal}`);
    }
    console.log(`Charged: ${bayuOrder.subtotal}, Gross: ${bayuOrder.gross_amount}`);
  }

  // SUMMARY
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  
  let overcharged = 0, undercharged = 0, totalOverDiff = 0, totalUnderDiff = 0;
  for (const m of mismatches) {
    if (m.diff > 0) { overcharged++; totalOverDiff += m.diff; }
    else { undercharged++; totalUnderDiff += Math.abs(m.diff); }
  }

  console.log(`Overcharged: ${overcharged} orders (total: +Rp ${totalOverDiff.toLocaleString()})`);
  console.log(`Undercharged: ${undercharged} orders (total: -Rp ${totalUnderDiff.toLocaleString()})`);

  // Price tier diff matching
  const tierDiffMatches = [];
  for (const m of mismatches) {
    for (const item of m.items) {
      const tiers = item.allPriceTiers;
      const tierNames = Object.keys(tiers);
      for (let i = 0; i < tierNames.length; i++) {
        for (let j = i + 1; j < tierNames.length; j++) {
          const tierDiff = tiers[tierNames[i]] - tiers[tierNames[j]];
          if (Math.abs(tierDiff) === Math.abs(m.diff)) {
            tierDiffMatches.push({
              order_id: m.order_id,
              customer: m.customer_name,
              diff: m.diff,
              product: item.product_name,
              cause: `${tierNames[i]}(${tiers[tierNames[i]]}) vs ${tierNames[j]}(${tiers[tierNames[j]]})`
            });
          }
        }
      }
    }
  }

  if (tierDiffMatches.length > 0) {
    console.log('');
    console.log('Cases where diff matches a known price tier difference:');
    for (const t of tierDiffMatches) {
      console.log(`  ${t.order_id} | ${t.customer} | diff=${t.diff} | ${t.product}`);
      console.log(`    => ${t.cause}`);
    }
  }

  fs.writeFileSync('scripts/batch_pricing_analysis.json', JSON.stringify({
    campaigns: Object.fromEntries(campaigns),
    products: Object.fromEntries([...products].map(([id, p]) => [id, { name: p.name, price: p.price, filkom_price: p.filkom_price, sale_type: p.sale_type }])),
    batchPrices: Object.fromEntries(batchPrices),
    mismatches
  }, null, 2));
  console.log('\nFull analysis saved to scripts/batch_pricing_analysis.json');
}

analyze().catch(console.error);
