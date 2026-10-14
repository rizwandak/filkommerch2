const fs = require('fs');
const readline = require('readline');

async function test() {
  const fileStream = fs.createReadStream('backup_database_live_2_10.sql');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let curT = null;

  for await (const l of rl) {
    if (l.startsWith('INSERT INTO `activity_logs`')) curT = 'activity_logs';
    else if (l.startsWith('INSERT INTO') || l.startsWith('CREATE TABLE') || l.startsWith('--')) {
      if (!l.includes('activity_logs')) curT = null;
    }

    if (curT === 'activity_logs' && (l.includes('FILKOM-1785932016668') || l.includes('LAYLA') || l.includes('layla'))) {
      console.log('LOG:', l);
    }
  }
}
test();
