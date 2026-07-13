import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { validateConfig } from "./config/config";
import paymentRoutes from "./routes/payment";
import * as apiControllers from "./controllers/api";
import { validateBody, createOrderSchema } from "./middleware/validation";
import { checkRole } from "./middleware/auth";
import { verifyFilkomUser } from "./controllers/verification";
import { runMigration } from "./migrate";

// Initialize environment variables
dotenv.config();

// Validate config
validateConfig();

const app = express();
app.set("trust proxy", true);
const port = process.env.PORT || 8080;

// ============ SECURITY MIDDLEWARE ============

// Helmet — Mengamankan HTTP headers (X-Content-Type-Options, X-Frame-Options, HSTS, dll.)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS — Konfigurasi ketat, hanya menerima request dari origin frontend yang diizinkan
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (Postman, curl, server-to-server, Midtrans webhook)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "ngrok-skip-browser-warning",
      "bypass-tunnel-reminder",
      "Bypass-Tunnel-Reminder"
    ],
    credentials: true,
  })
);

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ RATE LIMITERS ============

// Rate limiter untuk endpoint autentikasi (login) — anti brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 percobaan per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.",
  },
});

// Rate limiter untuk registrasi — anti spam akun
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // Maksimal 5 registrasi per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak percobaan registrasi. Silakan coba lagi dalam 15 menit.",
  },
});

// Rate limiter untuk checkout/order — anti spam transaksi
const checkoutLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5, // Maksimal 5 transaksi per IP per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak transaksi. Silakan coba lagi dalam 1 menit.",
  },
});

// Rate limiter untuk verifikasi NIM/NIDN
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maksimal 10 verifikasi per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Terlalu banyak percobaan verifikasi. Silakan coba lagi dalam 15 menit.",
  },
});

// ============ FILE UPLOAD (MULTER) ============

import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Daftar MIME types yang diizinkan
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/octet-stream",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Maksimal 10MB per file
    files: 15, // Maksimal 15 file per request
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImageExt = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext);
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || isImageExt || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak diizinkan: ${file.mimetype}. Hanya gambar yang diperbolehkan.`));
    }
  },
});

// Serve static uploaded files
app.use("/uploads", express.static(uploadsDir));

// Upload Endpoints
app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Tidak ada file yang diunggah" });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    return res.json({ success: true, url: fileUrl });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/upload-multiple", upload.array("files", 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: "Tidak ada file yang diunggah" });
    }
    const urls = files.map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );
    return res.json({ success: true, urls });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

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

// Auth API Routes — dilindungi rate limiter
app.post("/api/auth/register", registerLimiter, apiControllers.registerBuyer);
app.post("/api/auth/login", authLimiter, apiControllers.loginUser);
app.post("/api/auth/google", authLimiter, apiControllers.loginGoogleUser);
app.post("/api/auth/verify-filkom", verifyLimiter, verifyFilkomUser);

// Catalog / General API Routes
app.get("/api/products", apiControllers.getProducts);
app.get("/api/products/:slug", apiControllers.getProductBySlug);
app.get("/api/db-check", apiControllers.checkDatabaseConnection);
app.get("/api/payment-methods", apiControllers.getPaymentMethods);


app.get("/api/categories", apiControllers.getCategories);
app.post("/api/categories", checkRole(["admin"]), apiControllers.createCategory);
app.put("/api/categories/:id", checkRole(["admin"]), apiControllers.updateCategory);
app.delete("/api/categories/:id", checkRole(["admin"]), apiControllers.deleteCategory);

// Order / Checkout online API Routes — dilindungi rate limiter + validasi Zod
app.post("/api/orders", checkoutLimiter, validateBody(createOrderSchema), apiControllers.createOrderAndPayment);
app.get("/api/orders/:id", apiControllers.getOrderById);
app.get("/api/orders/user/:userId", apiControllers.getUserOrders);
app.post("/api/orders/:id/payment-proof", apiControllers.submitPaymentProof);

// Offline POS Sales API Routes
app.post("/api/sales", apiControllers.createSale);
app.get("/api/sales", apiControllers.getOfflineSales);
app.get("/api/sales/:id", apiControllers.getOfflineSaleById);
app.delete("/api/sales/:id", checkRole(["admin"]), apiControllers.deleteOfflineSale);

// Admin Specific API Routes
app.get("/api/admin/products", checkRole(["admin", "cashier"]), apiControllers.getAllProductsAdmin);
app.post("/api/admin/products", checkRole(["admin"]), apiControllers.createProduct);
app.put("/api/admin/products", checkRole(["admin"]), apiControllers.updateProduct);
app.delete("/api/admin/products/:id", checkRole(["admin"]), apiControllers.deleteProduct);
app.get("/api/admin/orders", checkRole(["admin", "cashier"]), apiControllers.getOnlineOrders);
app.put("/api/admin/orders/:id/status", checkRole(["admin", "cashier"]), apiControllers.updateOrderStatus);
app.delete("/api/admin/orders/:id", checkRole(["admin"]), apiControllers.deleteOrder);
app.get("/api/admin/activity-logs", checkRole(["admin", "cashier"]), apiControllers.getActivityLogs);

// Admin User CRUD API Routes
app.get("/api/admin/users", checkRole(["admin", "cashier"]), apiControllers.getAllUsersAdmin);
app.post("/api/admin/users", checkRole(["admin"]), apiControllers.createUser);
app.put("/api/admin/users", checkRole(["admin"]), apiControllers.updateUser);
app.delete("/api/admin/users/:id", checkRole(["admin"]), apiControllers.deleteUser);

// Store Settings API Routes
app.get("/api/settings", apiControllers.getStoreSettings);
app.post("/api/settings", checkRole(["admin"]), apiControllers.updateStoreSettings);

// Analytics API Routes
app.get("/api/analytics/daily", checkRole(["admin", "cashier"]), apiControllers.getDailySalesSummary);
app.get("/api/analytics/top-products", checkRole(["admin", "cashier"]), apiControllers.getTopProducts);
app.get("/api/analytics/inventory", checkRole(["admin", "cashier"]), apiControllers.getInventory);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Error Handler]", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// Start server
const startServer = async () => {
  try {
    await runMigration();
  } catch (err) {
    console.error("Migration failed on startup:", err);
  }

  app.listen(port, () => {
    console.log(`====================================================`);
    console.log(`🚀 Server backend berjalan di http://localhost:${port}`);
    console.log(`🔒 Helmet: HTTP security headers aktif`);
    console.log(`🌐 CORS: Hanya menerima dari ${allowedOrigins.join(", ")}`);
    console.log(`⏱️  Rate Limiting: Aktif pada auth & checkout endpoints`);
    console.log(`====================================================`);
  });
};

startServer();
