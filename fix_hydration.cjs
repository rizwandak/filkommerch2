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
  let changed = false;

  if (content.includes('typeof window !== "undefined" ? window.location.pathname : ""')) {
    content = content.replace(/const pathname = typeof window !== "undefined" \? window\.location\.pathname : "";/g, 'const { location } = useRouterState();\n  const pathname = location.pathname;');
    changed = true;
  }
  
  if (content.includes('typeof window !== "undefined" ? window.location.search : ""')) {
    content = content.replace(/const search = typeof window !== "undefined" \? window\.location\.search : "";/g, 'const search = location.search.originalString || "";');
    changed = true;
  }

  if (content.includes('typeof window !== "undefined" ? window.location.hash : ""')) {
    content = content.replace(/const hash = typeof window !== "undefined" \? window\.location\.hash : "";/g, 'const hash = location.hash || "";');
    changed = true;
  }

  if (changed) {
    if (!content.includes('useRouterState')) {
      content = content.replace(/import \{ (.*?) \} from "@tanstack\/react-router";/, 'import { $1, useRouterState } from "@tanstack/react-router";');
    }
    fs.writeFileSync(file, content);
    console.log('Fixed hydration mismatch in ' + file);
  }
}
