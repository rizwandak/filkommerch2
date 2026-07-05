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
    
    // Replace useRouterState logic with bulletproof state + useEffect
    content = content.replace(/const \{ location \} = useRouterState\(\);\n\s*const pathname = location\.pathname;/g, 
`const [pathname, setPathname] = useState("");
  useEffect(() => setPathname(window.location.pathname), []);`);

    // Remove the useRouterState import if we just removed its usage
    if (!content.includes('useRouterState()')) {
      content = content.replace(/,\s*useRouterState/, '');
    }

    fs.writeFileSync(file, content);
    console.log('Applied state-based hydration fix to ' + file);
  }
}
