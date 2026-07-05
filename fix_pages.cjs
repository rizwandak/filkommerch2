const fs = require('fs');

const files = [
  'frontend/src/routes/products.tsx',
  'frontend/src/routes/orders.tsx',
  'frontend/src/routes/faq.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add import if not present
    if (!content.includes('HackerModeToggle')) {
      content = content.replace(/(import .*? from "@tanstack\/react-router";)/, "$1\nimport { HackerModeToggle } from \"@/components/HackerModeToggle\";");
    }

    // Insert before <button aria-label="Search"
    if (!content.includes('<HackerModeToggle />')) {
      content = content.replace(/(<button aria-label="Search".*?>)/g, "<HackerModeToggle />\n              $1");
    }

    // In products.tsx, replace bg-white with bg-card
    if (file.includes('products.tsx')) {
      content = content.replace(/bg-white/g, 'bg-card');
      // Fix the "KATALOG RESMI" section bg to use zinc-950 instead of ink so it stays black in both modes
      content = content.replace(/bg-ink text-cream py-16/g, 'bg-zinc-950 text-white py-16');
      content = content.replace(/ring-ink/g, 'ring-border');
    }

    fs.writeFileSync(file, content);
    console.log('Fixed ' + file);
  }
}
