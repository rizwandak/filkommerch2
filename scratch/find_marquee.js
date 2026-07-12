import fs from 'fs';
const content = fs.readFileSync('c:/Users/rizwa/OneDrive/Gambar/web/filkommerch/web_filkom_merch/frontend/src/routes/index.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('layout.') || line.includes('<section')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
