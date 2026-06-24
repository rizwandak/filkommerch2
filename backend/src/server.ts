import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { validateConfig } from "./config/config";
import paymentRoutes from "./routes/payment";
import * as apiControllers from "./controllers/api";

// Initialize environment variables
dotenv.config();

// Validate config
validateConfig();

const app = express();
const port = process.env.PORT || 8080;

// Enable CORS
app.use(
  cors({
    origin: "*", // Mengizinkan semua origin untuk kemudahan integrasi dengan Vercel & lokal
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Root API Check
app.get("/api", (req, res) => {
  res.json({ message: "FILKOM Merch API Server is running!" });
});

// payment routes (Integrasi Midtrans Client)
app.use("/api/payment", paymentRoutes);

// Catalog / General API Routes
app.get("/api/products", apiControllers.getProducts);
app.get("/api/db-check", apiControllers.checkDatabaseConnection);
app.get("/api/payment-methods", apiControllers.getPaymentMethods);
app.get("/api/categories", apiControllers.getCategories);

// Order / Checkout online API Routes
app.post("/api/orders", apiControllers.createOrderAndPayment);
app.get("/api/orders/:id", apiControllers.getOrderById);

// Offline POS Sales API Routes
app.post("/api/sales", apiControllers.createSale);
app.get("/api/sales", apiControllers.getOfflineSales);

// Admin Specific API Routes
app.get("/api/admin/products", apiControllers.getAllProductsAdmin);
app.post("/api/admin/products", apiControllers.createProduct);
app.put("/api/admin/products", apiControllers.updateProduct);
deleteProduct: app.delete("/api/admin/products/:id", apiControllers.deleteProduct);
app.get("/api/admin/orders", apiControllers.getOnlineOrders);

// Store Settings API Routes
app.get("/api/settings", apiControllers.getStoreSettings);
app.post("/api/settings", apiControllers.updateStoreSettings);

// Analytics API Routes
app.get("/api/analytics/daily", apiControllers.getDailySalesSummary);
app.get("/api/analytics/top-products", apiControllers.getTopProducts);
app.get("/api/analytics/inventory", apiControllers.getInventory);

// Start server
app.listen(port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Server backend berjalan di http://localhost:${port}`);
  console.log(`====================================================`);
});
