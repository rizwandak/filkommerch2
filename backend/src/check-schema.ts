import { query } from "./config/database";

async function main() {
  try {
    const columns = await query("DESCRIBE products");
    console.log("PRODUCTS COLUMNS:", columns);
    const tables = await query("SHOW TABLES");
    console.log("TABLES:", tables);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

main();
