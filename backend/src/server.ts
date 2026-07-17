import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { validateConfig } from "./config/config";
import * as apiControllers from "./controllers/api";
import { validateBody, createOrderSchema } from "./middleware/validation";
import { checkRole } from "./middleware/auth";
import { verifyFilkomUser } from "./controllers/verification";
import { runMigration } from "./migrate";
import { cacheMiddleware, clearCache } from "./middleware/cache";

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

// CORS — Konfigurasi fleksibel dan aman untuk dev & production origin
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "https://filkommerch.com",
  "http://filkommerch.com",
];
const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (Postman, curl, server-to-server, Midtrans webhook)
      if (!origin || allowedOrigins.includes(origin) || origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("filkommerch.com")) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(null, true); // Fallback allow to prevent upload blocking
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-role",
      "x-user-id",
      "x-user-name",
      "ngrok-skip-browser-warning",
      "bypass-tunnel-reminder",
      "Bypass-Tunnel-Reminder"
    ],
    credentials: true,
  })
);

// Body Parser Middleware (High limit for base64 image uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "image.jpg") || ".jpg";
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // Maksimal 15MB per file
    files: 20, // Maksimal 20 file per request
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const isImageExt = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext);
    if (!file.mimetype || ALLOWED_MIME_TYPES.includes(file.mimetype) || isImageExt || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error(`Tipe file tidak diizinkan: ${file.mimetype || 'unknown'}. Hanya gambar yang diperbolehkan.`));
    }
  },
});

// Serve static uploaded files
app.use("/uploads", express.static(uploadsDir));

const getPublicHostUrl = (req: express.Request) => {
  const host = req.get("x-forwarded-host") || req.get("host") || "";
  const proto = req.get("x-forwarded-proto") || req.protocol || "http";
  if (!host) {
    return process.env.PUBLIC_URL || "http://127.0.0.1:8080";
  }
  return `${proto}://${host}`;
};

// Upload Endpoints with inline error wrappers to preserve CORS response headers
app.post("/api/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      console.error("Single upload error:", err);
      return res.status(400).json({ success: false, error: err.message || "Gagal mengunggah file" });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "Tidak ada file yang diunggah" });
      }
      const fileUrl = `${getPublicHostUrl(req)}/uploads/${req.file.filename}`;
      return res.json({ success: true, url: fileUrl });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });
});

app.post("/api/upload-multiple", (req, res) => {
  upload.array("files", 20)(req, res, (err) => {
    if (err) {
      console.error("Multiple upload error:", err);
      return res.status(400).json({ success: false, error: err.message || "Gagal mengunggah beberapa file" });
    }
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: "Tidak ada file yang diunggah" });
      }
      const urls = files.map(
        (file) => `${getPublicHostUrl(req)}/uploads/${file.filename}`
      );
      return res.json({ success: true, urls });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });
});

// Server Action Base64 Upload Endpoints (Converts Base64 directly into physical files in /uploads)
app.post("/api/upload-base64", (req, res) => {
  try {
    const { dataUrl, name } = req.body || {};
    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ success: false, error: "Missing dataUrl" });
    }
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: "Invalid dataUrl format" });
    }
    const buffer = Buffer.from(matches[2], "base64");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(name || "image.jpg") || ".jpg";
    const filename = `file-${uniqueSuffix}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    const fileUrl = `${getPublicHostUrl(req)}/uploads/${filename}`;
    return res.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error("upload-base64 error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/upload-multiple-base64", (req, res) => {
  try {
    const { files } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: "No files array provided" });
    }

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const urls: string[] = [];
    for (const fileItem of files) {
      const { dataUrl, name } = fileItem || {};
      if (dataUrl && typeof dataUrl === "string") {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const buffer = Buffer.from(matches[2], "base64");
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = path.extname(name || "image.jpg") || ".jpg";
          const filename = `file-${uniqueSuffix}${ext}`;
          const filePath = path.join(uploadsDir, filename);
          fs.writeFileSync(filePath, buffer);
          urls.push(`${getPublicHostUrl(req)}/uploads/${filename}`);
        }
      }
    }

    return res.json({ success: true, urls });
  } catch (error: any) {
    console.error("upload-multiple-base64 error:", error);
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

// Mayar Webhook endpoint (receives callbacks from Mayar payment gateway server)
app.post("/api/webhook-mayar", apiControllers.handleMayarWebhook);

// Payment regeneration route (Mayar link creation)
app.post("/api/payment/regenerate-token", checkoutLimiter, apiControllers.regeneratePaymentToken);

// Auth API Routes — dilindungi rate limiter
app.post("/api/auth/register", registerLimiter, apiControllers.registerBuyer);
app.post("/api/auth/login", authLimiter, apiControllers.loginUser);
app.post("/api/auth/google", authLimiter, apiControllers.loginGoogleUser);
app.post("/api/auth/verify-filkom", verifyLimiter, verifyFilkomUser);

// Catalog / General API Routes
app.get("/api/products", cacheMiddleware(60), apiControllers.getProducts);
app.get("/api/products/:slug", cacheMiddleware(60), apiControllers.getProductBySlug);
app.get("/api/db-check", apiControllers.checkDatabaseConnection);
app.get("/api/payment-methods", cacheMiddleware(300), apiControllers.getPaymentMethods);


app.get("/api/categories", cacheMiddleware(120), apiControllers.getCategories);
app.post("/api/categories", checkRole(["admin"]), (req, res, next) => { clearCache(); next(); }, apiControllers.createCategory);
app.put("/api/categories/:id", checkRole(["admin"]), (req, res, next) => { clearCache(); next(); }, apiControllers.updateCategory);
app.delete("/api/categories/:id", checkRole(["admin"]), (req, res, next) => { clearCache(); next(); }, apiControllers.deleteCategory);

// Order / Checkout online API Routes — dilindungi rate limiter + validasi Zod
app.post("/api/orders", checkoutLimiter, validateBody(createOrderSchema), (req, res, next) => { clearCache("/api/products"); next(); }, apiControllers.createOrderAndPayment);
app.get("/api/orders/:id", apiControllers.getOrderById);
app.get("/api/orders/user/:userId", apiControllers.getUserOrders);
app.post("/api/orders/:id/payment-proof", apiControllers.submitPaymentProof);

// Offline POS Sales API Routes
app.post("/api/sales", (req, res, next) => { clearCache("/api/products"); next(); }, apiControllers.createSale);
app.get("/api/sales", apiControllers.getOfflineSales);
app.get("/api/sales/:id", apiControllers.getOfflineSaleById);
app.delete("/api/sales/:id", checkRole(["admin"]), apiControllers.deleteOfflineSale);

// Admin Specific API Routes
app.get("/api/admin/products", checkRole(["admin", "cashier"]), apiControllers.getAllProductsAdmin);
app.post("/api/admin/products", checkRole(["admin"]), (req, res, next) => { clearCache(); next(); }, apiControllers.createProduct);
app.put("/api/admin/products", checkRole(["admin"]), (req, res, next) => { clearCache(); next(); }, apiControllers.updateProduct);
app.delete("/api/admin/products/:id", checkRole(["admin"]), (req, res, next) => { clearCache(); next(); }, apiControllers.deleteProduct);
app.get("/api/admin/orders", checkRole(["admin", "cashier"]), apiControllers.getOnlineOrders);
app.put("/api/admin/orders/:id/status", checkRole(["admin", "cashier"]), apiControllers.updateOrderStatus);
app.put("/api/admin/orders/:id/verify-payment", checkRole(["admin", "cashier"]), apiControllers.verifyPaymentProof);
app.delete("/api/admin/orders/:id", checkRole(["admin"]), apiControllers.deleteOrder);
app.get("/api/admin/activity-logs", checkRole(["admin", "cashier"]), apiControllers.getActivityLogs);

// Admin User CRUD API Routes
app.get("/api/admin/users", checkRole(["admin", "cashier"]), apiControllers.getAllUsersAdmin);
app.post("/api/admin/users", checkRole(["admin"]), apiControllers.createUser);
app.put("/api/admin/users", checkRole(["admin"]), apiControllers.updateUser);
app.delete("/api/admin/users/:id", checkRole(["admin"]), apiControllers.deleteUser);

// Store Settings API Routes
app.get("/api/settings", cacheMiddleware(120), apiControllers.getStoreSettings);
app.post("/api/settings", checkRole(["admin"]), (req, res, next) => { clearCache("/api/settings"); next(); }, apiControllers.updateStoreSettings);

// Pre-Order Campaign API Routes
app.get("/api/pre-order-campaigns/active", apiControllers.getActivePreOrderCampaign);
app.get("/api/pre-order-campaigns", apiControllers.getAllPreOrderCampaigns);
app.post("/api/pre-order-campaigns", checkRole(["admin"]), apiControllers.createPreOrderCampaign);
app.put("/api/pre-order-campaigns/:id", checkRole(["admin"]), apiControllers.updatePreOrderCampaign);
app.patch("/api/pre-order-campaigns/:id/toggle-active", checkRole(["admin"]), apiControllers.togglePreOrderCampaignActive);
app.delete("/api/pre-order-campaigns/:id", checkRole(["admin"]), apiControllers.deletePreOrderCampaign);

// Analytics API Routes
app.get("/api/analytics/daily", checkRole(["admin", "cashier"]), apiControllers.getDailySalesSummary);
app.get("/api/analytics/top-products", checkRole(["admin", "cashier"]), apiControllers.getTopProducts);
app.get("/api/analytics/inventory", checkRole(["admin", "cashier"]), apiControllers.getInventory);
app.get("/api/analytics/orders-summary", checkRole(["admin", "cashier"]), apiControllers.getOrdersSummary);

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
