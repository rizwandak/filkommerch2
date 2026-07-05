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
    
    // Convert to simple strings for matching to avoid regex whitespace issues
    content = content.split('\r\n').join('\n'); // normalize to LF
    
    content = content.replace(
      'const [pathname, setPathname] = useState("");\n  useEffect(() => setPathname(window.location.pathname), []);\n  const search = location.search.originalString || "";\n  const hash = location.hash || "";',
      `const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);`
    );

    // Some files might still have the old useRouterState logic if my previous script failed!
    content = content.replace(
      'const { location } = useRouterState();\n  const pathname = location.pathname;\n  const search = location.search.originalString || "";\n  const hash = location.hash || "";',
      `const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, []);`
    );

    fs.writeFileSync(file, content);
    console.log('Applied FULL state-based hydration fix to ' + file);
  }
}
