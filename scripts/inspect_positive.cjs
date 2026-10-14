const fs = require('fs');
const mismatches = JSON.parse(fs.readFileSync('scripts/mismatches.json'));

const positive = mismatches.filter(m => m.subtotalDiff > 0);
console.log('Positive mismatches count:', positive.length);

positive.forEach(m => {
  console.log(`\n=== Order ${m.order_id} (${m.customer_name}) ===`);
  console.log(`DB Subtotal: ${m.orderSubtotal}, Items Sum: ${m.itemSubtotalSum}, Diff: +${m.subtotalDiff}`);
  console.log('Items:');
  m.items.forEach(i => {
    console.log(`  - ${i.name} [Size: ${i.size}]: subtotal=${i.subtotal}, price=${i.price}, qty=${i.quantity}`);
  });
});
