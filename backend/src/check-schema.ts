import { query } from "./config/database";

async function main() {
  try {
    const users = await query("SELECT id, name, email, role FROM users");
    console.log("USERS:", users);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

main();
