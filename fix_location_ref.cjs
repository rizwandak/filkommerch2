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
    
    // Replace state based hydration logic to cover pathname, search, and hash
    content = content.replace(/const \[pathname, setPathname\] = useState\(""\);\n\s*useEffect\(\(\) => setPathname\(window\.location\.pathname\), \[\]\);\n\s*const search = location\.search\.originalString \|\| "";\n\s*const hash = location\.hash \|\| "";/g, 
`const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);`);

    fs.writeFileSync(file, content);
    console.log('Applied FULL state-based hydration fix to ' + file);
  }
}
