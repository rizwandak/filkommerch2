const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scripts/batch_pricing_analysis.json', 'utf8'));

// Group order items by product_id and examine all unique unit_price along with dates, campaigns, order numbers
const productPricing = {};

for (const order of data.orders) {
  const cId = order.pre_order_campaign_id;
  const date = order.created_at;
  for (const item of order.items) {
    const pId = item.product_id;
    if (!productPricing[pId]) {
      productPricing[pId] = {
        name: item.product_name,
        prices: {}
      };
    }
    const up = item.unit_price;
    if (!productPricing[pId].prices[up]) {
      productPricing[pId].prices[up] = [];
    }
    productPricing[pId].prices[up].push({
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      date: date,
      campaign_id: cId,
      subtotal: order.subtotal,
      item_subtotal: item.subtotal,
      qty: item.quantity,
      status: order.status
    });
  }
}

for (const [pId, pInfo] of Object.entries(productPricing)) {
  console.log(`\n======================================================`);
  console.log(`Product ID: ${pId} | ${pInfo.name}`);
  console.log(`======================================================`);
  
  // Sort prices ascending
  const sortedPrices = Object.keys(pInfo.prices).map(Number).sort((a,b) => a - b);
  
  for (const price of sortedPrices) {
    const orders = pInfo.prices[price];
    const dates = orders.map(o => o.date).filter(Boolean).sort();
    const campaigns = [...new Set(orders.map(o => o.campaign_id))];
    const minDate = dates[0] ? dates[0].substring(0, 10) : 'N/A';
    const maxDate = dates[dates.length - 1] ? dates[dates.length - 1].substring(0, 10) : 'N/A';
    console.log(`  Rp ${Number(price).toLocaleString('id-ID').padStart(9)} : ${orders.length.toString().padStart(3)} items | Dates: ${minDate} s/d ${maxDate} | Campaign IDs: [${campaigns.join(', ')}]`);
    
    // Sample orders
    const samples = orders.slice(0, 3).map(o => `${o.order_number} (${o.customer_name || 'N/A'}, cId=${o.campaign_id})`).join('; ');
    console.log(`     Sample: ${samples}`);
  }
}
