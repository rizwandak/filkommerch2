const fs = require('fs');
const readline = require('readline');

async function test() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let curT = null;
  let headers = [];

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

  for await (const l of rl) {
    if (l.startsWith('CREATE TABLE `orders`')) curT = 'create_orders';
    else if (curT === 'create_orders') {
      if (l.startsWith(')')) curT = null;
      else {
        const m = l.match(/`([^`]+)`/);
        if (m) headers.push(m[1]);
      }
    }

    if (l.startsWith('INSERT INTO `orders`')) curT = 'orders';
    else if (l.startsWith('INSERT INTO') || l.startsWith('CREATE TABLE') || l.startsWith('--')) {
      if (!l.includes('orders')) curT = null;
    }

    if (curT === 'orders' && l.includes('FILKOM-1785932016668')) {
      const vals = parseRow(l);
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = vals[idx];
      });
      console.log('Layla mapped order:');
      console.log(JSON.stringify(obj, null, 2));
    }
  }
}
test();
