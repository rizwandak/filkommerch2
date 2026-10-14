const fs = require('fs');
const readline = require('readline');

async function test() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let curT = null;
  let headers = [];

  for await (const l of rl) {
    if (l.startsWith('CREATE TABLE `orders`')) {
      curT = 'create_orders';
    } else if (curT === 'create_orders') {
      if (l.startsWith(')')) curT = null;
      else {
        const m = l.match(/`([^`]+)`/);
        if (m) headers.push(m[1]);
      }
    }
  }

  console.log('Orders headers count:', headers.length);
  console.log(headers);
}
test();
