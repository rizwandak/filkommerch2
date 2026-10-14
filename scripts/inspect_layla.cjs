const fs = require('fs');
const readline = require('readline');

async function test() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let curT = null;

  for await (const l of rl) {
    if (l.startsWith('INSERT INTO `orders`')) curT = 'orders';
    else if (l.startsWith('INSERT INTO `order_items`')) curT = 'order_items';
    else if (l.startsWith('INSERT INTO') || l.startsWith('CREATE TABLE') || l.startsWith('--')) {
      if (!['orders','order_items'].some(t => l.includes('`' + t + '`'))) curT = null;
    }

    if (curT === 'orders' && l.includes('FILKOM-1785932016668')) {
      console.log('ORDER ROW:', l);
    }
    if (curT === 'order_items' && l.includes('FILKOM-1785932016668')) {
      console.log('ITEM ROW:', l);
    }
  }
}
test();
