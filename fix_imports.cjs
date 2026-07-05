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
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if imported
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+["']@tanstack\/react-router["']/;
    const match = content.match(importRegex);
    if (match) {
      const imports = match[1];
      if (!imports.includes('useRouterState')) {
        const newImports = match[0].replace(/from/, ', useRouterState } from').replace('}', '');
        content = content.replace(match[0], newImports);
        fs.writeFileSync(file, content);
        console.log('Added useRouterState import to ' + file);
      }
    }
  }
}
