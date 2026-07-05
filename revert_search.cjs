const fs = require('fs');

const files = [
  'frontend/src/routes/index.tsx',
  'frontend/src/routes/products.tsx',
  'frontend/src/routes/pre-order.tsx',
  'frontend/src/routes/faq.tsx',
  'frontend/src/routes/orders.tsx',
  'frontend/src/routes/product.$slug.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/const search = location\.search\.originalString \|\| "";/g, 'const search = typeof window !== "undefined" ? window.location.search : "";');
  content = content.replace(/const hash = location\.hash \|\| "";/g, 'const hash = typeof window !== "undefined" ? window.location.hash : "";');

  fs.writeFileSync(file, content);
  console.log('Reverted search and hash in ' + file);
}
