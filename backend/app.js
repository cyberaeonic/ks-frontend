const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const cors = require("cors");
const fileUpload = require("express-fileupload");

// Import Routers
const productsRouter = require("./routes/products");
const categoryRouter = require("./routes/category");
const orderRouter = require("./routes/customer_orders");
const settingsRouter = require("./routes/settings");
const faqsRouter = require("./routes/faqs");
const enquiriesRouter = require("./routes/enquiries");
const uploadRouter = require("./routes/upload");

const app = express();

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(fileUpload({ createParentPath: true }));

// REST API Endpoints
app.use("/api/products", productsRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/orders", orderRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/faqs", faqsRouter);
app.use("/api/enquiries", enquiriesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/images", uploadRouter);
app.use("/api/main-image", uploadRouter);

// Serve static assets (images, uploads, Pics)
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/Pics", express.static(path.join(__dirname, "..", "Pics")));
app.use("/Pics", express.static(path.join(__dirname, "public", "Pics")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "Krishika Store & Handicrafts API Engine",
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend files (index.html, admin.html, styles.css, app.js, admin.js)
app.use(express.static(path.join(__dirname, "..")));

// Fallback to index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "admin.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("API Server Error:", err);
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Krishika Store Unified Full-Stack Server running on port ${PORT}`);
  console.log(`🛒 Storefront: http://localhost:${PORT}/`);
  console.log(`🛠️ Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`📡 API Health: http://localhost:${PORT}/health`);
});

module.exports = app;
