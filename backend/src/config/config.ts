import dotenv from "dotenv";
dotenv.config();

// Environment variables configuration
export const config = {
  // Database
  db: {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "db_filkommerch",
    port: parseInt(process.env.DB_PORT || "3306"),
  },

  // Mayar Payment Gateway
  mayar: {
    apiKey: process.env.MAYAR_API_KEY || "",
    apiUrl: process.env.MAYAR_API_URL || "https://api.mayar.id/hl/v1",
    webhookToken: process.env.MAYAR_WEBHOOK_TOKEN || "",
  },

  // API
  api: {
    url: process.env.VITE_API_URL || "http://localhost:5173/api",
  },
};

// Validate required env vars
export function validateConfig() {
  const recommended = ["DB_HOST", "DB_USER", "DB_NAME"];
  const missing = recommended.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`[Config] Missing environment variables: ${missing.join(", ")}. Using default fallbacks.`);
  }
}
