const fs = require('fs');
const readline = require('readline');

async function test() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let curT = null;

  for await (const l of rl) {
    if (l.startsWith('INSERT INTO `orders`')) curT = 'orders';
    else if (l.startsWith('INSERT INTO') || l.startsWith('CREATE TABLE') || l.startsWith('--')) {
      if (!l.includes('orders')) curT = null;
    }

    if (curT === 'orders' && (l.includes('laylaafifahr24') || l.includes('082232467378') || l.includes('245150301111007'))) {
      console.log('ORDER:', l);
    }
  }
}
test();
