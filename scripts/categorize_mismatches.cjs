const fs = require('fs');
const mismatches = JSON.parse(fs.readFileSync('scripts/mismatches.json'));

console.log(`Total mismatched orders: ${mismatches.length}`);

// Categories:
// 1. Positive diff (Order subtotal > items sum)
// 2. Negative diff due to bundle component duplication in order_items
// 3. Other negative diffs

const bundleDuplications = [];
const orderSubtotalHigher = [];
const otherMismatches = [];

for (const m of mismatches) {
  const hasBundleComponentsWithPrice = m.items.some(i => 
    i.name && i.name.includes('[KOMPONEN BUNDLE]') && Number(i.subtotal) > 0
  );

  if (hasBundleComponentsWithPrice) {
    bundleDuplications.push(m);
  } else if (m.subtotalDiff > 0) {
    orderSubtotalHigher.push(m);
  } else {
    otherMismatches.push(m);
  }
}

console.log(`\n1. Positive Diff (Order Subtotal > Items Sum) [like Fahri]: ${orderSubtotalHigher.length}`);
orderSubtotalHigher.forEach(m => {
  console.log(`  - [${m.order_id}] ${m.customer_name} (Created: ${m.created_at})`);
  console.log(`    DB Subtotal: Rp ${m.orderSubtotal.toLocaleString('id-ID')} | Items Sum: Rp ${m.itemSubtotalSum.toLocaleString('id-ID')} | Selisih: +Rp ${m.subtotalDiff.toLocaleString('id-ID')}`);
  console.log(`    DB Gross: Rp ${m.grossAmount.toLocaleString('id-ID')} | Expected Gross: Rp ${m.expectedGross.toLocaleString('id-ID')}`);
  console.log(`    Items: ${m.items.map(i => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity} = Rp ${i.subtotal.toLocaleString('id-ID')}`).join(', ')}`);
});

console.log(`\n2. Bundle Components Duplicated in order_items: ${bundleDuplications.length}`);
bundleDuplications.forEach(m => {
  console.log(`  - [${m.order_id}] ${m.customer_name} | DB Subtotal: ${m.orderSubtotal} | Items Sum: ${m.itemSubtotalSum} | Diff: ${m.subtotalDiff}`);
});

console.log(`\n3. Other Mismatches: ${otherMismatches.length}`);
otherMismatches.forEach(m => {
  console.log(`  - [${m.order_id}] ${m.customer_name} | DB Subtotal: ${m.orderSubtotal} | Items Sum: ${m.itemSubtotalSum} | Diff: ${m.subtotalDiff}`);
});
