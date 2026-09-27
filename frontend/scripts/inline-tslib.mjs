import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "../.output/server");

const tslibReplacement = `
var __assign = Object.assign || function (target) {
  for (var s, i = 1, n = arguments.length; i < n; i++) {
    s = arguments[i];
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) target[p] = s[p];
  }
  return target;
};
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
    t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
}
`;

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== "node_modules") processDir(full);
    } else if (full.endsWith(".mjs") || full.endsWith(".js")) {
      let content = fs.readFileSync(full, "utf8");
      if (content.includes('from "tslib"') || content.includes("from 'tslib'")) {
        console.log("Inlining tslib helpers into:", full);
        content = content.replace(/import\s*\{[^}]*\}\s*from\s*["']tslib["'];?/, tslibReplacement);
        fs.writeFileSync(full, content);
      }
    }
  }
}

if (fs.existsSync(serverDir)) {
  processDir(serverDir);
  console.log("✅ TSLib inline check completed successfully!");
} else {
  console.log("⚠️ Server output dir not found at:", serverDir);
}
