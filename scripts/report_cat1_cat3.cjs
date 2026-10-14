const fs = require('fs');
const readline = require('readline');

function parseRow(line) {
  let str = line.trim();
  if (str.startsWith('(')) str = str.slice(1);
  if (str.endsWith('),') || str.endsWith(');')) str = str.slice(0, -2);
  else if (str.endsWith(')')) str = str.slice(0, -1);
  const values = [];
  let cur = '', inQ = false, esc = false, wasQuoted = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (esc) { cur += c; esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inQ) {
      if (c === "'") { if (str[i + 1] === "'") { cur += "'"; i++; } else inQ = false; }
      else cur += c;
    } else if (c === "'") { inQ = true; wasQuoted = true; }
    else if (c === ',') { values.push({ v: cur.trim(), q: wasQuoted }); cur = ''; wasQuoted = false; }
    else cur += c;
  }
  values.push({ v: cur.trim(), q: wasQuoted });
  return values.map(({ v, q }) => {
    if (q) return v;
    if (v === 'NULL') return null;
    const n = Number(v);
    return isNaN(n) ? v : n;
  });
}

(async () => {
  const rl = readline.createInterface({ input: fs.createReadStream('backup_database_live_2_10.sql'), crlfDelay: Infinity });
  let mode = null, oc = [], ic = [];
  const orders = new Map(), items = new Map();
  for await (const line of rl) {
    const t = line.trim();
    if (t.includes('INSERT INTO `orders`')) { mode = 'o'; oc = t.match(/\((`[^`]+`(?:,\s*`[^`]+`)*)\)/)[1].split(',').map(s => s.trim().replace(/`/g, '')); continue; }
    if (t.includes('INSERT INTO `order_items`')) { mode = 'i'; ic = t.match(/\((`[^`]+`(?:,\s*`[^`]+`)*)\)/)[1].split(',').map(s => s.trim().replace(/`/g, '')); continue; }
    if (t.startsWith('INSERT INTO') || t.startsWith('UNLOCK TABLES') || t.startsWith('DROP TABLE')) { mode = null; continue; }
    if (mode && t.startsWith('(')) {
      const vals = parseRow(t);
      const row = {};
      (mode === 'o' ? oc : ic).forEach((c, i) => (row[c] = vals[i]));
      if (mode === 'o') orders.set(row.order_id, row);
      else { if (!items.has(row.order_id)) items.set(row.order_id, []); items.get(row.order_id).push(row); }
    }
  }

  const rows = [];
  for (const [id, o] of orders) {
    const its = items.get(id) || [];
    if (its.some(i => String(i.product_name).includes('[KOMPONEN BUNDLE]'))) continue; // cat 2
    const sum = its.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const expected = sum - (Number(o.discount_amount) || 0) + (Number(o.shipping_cost) || 0) + (Number(o.service_fee) || 0) + (Number(o.tax_amount) || 0);
    const charged = Number(o.gross_amount) || 0;
    const diff = charged - expected; // + = customer charged MORE than items
    if (diff === 0 && Number(o.subtotal) === sum) continue;
    rows.push({
      order_id: id, name: o.customer_name, phone: o.customer_phone, email: o.customer_email,
      created: o.created_at, pay: o.payment_status, status: o.order_status,
      charged, expected, diff,
      verified: o.payment_proof_verified_amount, match: o.payment_proof_match_status,
      isDp: its.some(i => /DP/i.test(`${i.color} ${i.size} ${i.product_name}`)),
      items: its.map(i => `${i.product_name}${i.size ? ' (' + i.size + ')' : ''} x${i.quantity}=${i.subtotal}`).join('; '),
    });
  }
  fs.writeFileSync('scripts/report_cat1_cat3.json', JSON.stringify(rows, null, 2));
  const fmt = n => Number(n).toLocaleString('id-ID');
  const over = rows.filter(r => r.diff > 0).sort((a, b) => b.diff - a.diff);
  const under = rows.filter(r => r.diff < 0).sort((a, b) => a.diff - b.diff);
  const zero = rows.filter(r => r.diff === 0);
  console.log(`LEBIH (ditagih > item): ${over.length} order, total Rp ${fmt(over.reduce((s, r) => s + r.diff, 0))}`);
  over.forEach(r => console.log(`${r.order_id} | ${r.name} | ${r.phone} | ditagih ${r.charged} | seharusnya ${r.expected} | LEBIH ${r.diff} | bayar:${r.pay} | order:${r.status} | verif:${r.verified} ${r.match} | DP:${r.isDp}`));
  console.log(`\nKURANG (ditagih < item): ${under.length} order, total Rp ${fmt(under.reduce((s, r) => s + r.diff, 0))}`);
  under.forEach(r => console.log(`${r.order_id} | ${r.name} | ${r.phone} | ditagih ${r.charged} | seharusnya ${r.expected} | KURANG ${r.diff} | bayar:${r.pay} | order:${r.status} | verif:${r.verified} ${r.match} | ${r.items}`));
  console.log(`\nTotal sama tapi subtotal beda (tidak ada selisih uang): ${zero.length}`);
  zero.forEach(r => console.log(`${r.order_id} | ${r.name}`));
})();
