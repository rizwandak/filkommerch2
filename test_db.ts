import { query } from './backend/src/db';

async function test() {
  const res = await query(`
    SELECT oi.product_id, p.name, oi.quantity, o.payment_status, o.order_status 
    FROM order_items oi 
    JOIN orders o ON o.order_id = oi.order_id 
    JOIN products p ON oi.product_id = p.id 
    WHERE p.name LIKE '%Topi%'
  `);
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}

test();
