import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import axios from "axios";
import proxyRoutes from "./routes/proxy.js"
// Load environment variables FIRST
dotenv.config();

// Import routes
import mediaRoutes from "./routes/media.js";
import userRoutes from "./routes/user.js";
import authRoutes from "./routes/auth.js";
import streamRoutes from "./routes/stream.js";

// Import models
import Watchlist from "./models/Watchlist.js";

const app = express();
const PORT = process.env.PORT || 5000;

//  Middleware 
app.use(cors({ 
  origin: "http://localhost:5173", 
  credentials: true,
  exposedHeaders: ["Content-Range", "Accept-Ranges", "Content-Length"]
}));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    frameguard: false, // 🔧 ADD THIS - Allow iframes
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

const generalLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." }
});
app.use("/api/", generalLimiter);

// ─── HEALTH CHECK ───
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Sinema API running 🎬",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes :-

app.use("/api/media", mediaRoutes);
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/proxy", proxyRoutes);

// TEST ROUTES
app.get('/api/test/db', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({ status: states[state], connected: state === 1 });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/api/test/save', async (req, res) => {
  try {
    const testItem = await Watchlist.findOneAndUpdate(
      { clerkId: 'test_user', mediaId: 'tt_test' },
      { clerkId: 'test_user', mediaId: 'tt_test', mediaType: 'movie', title: 'Test Movie', poster: null },
      { upsert: true, new: true }
    );
    res.json({ success: true, item: testItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test/all', async (req, res) => {
  try {
    const all = await Watchlist.find({}).lean();
    res.json({ count: all.length, items: all });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// GLOBAL ERROR HANDLER 
app.use((err, req, res, next) => {
  console.error("💥 Global Error:", err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

// MONGODB CONNECTION & SERVER START :)
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI is not defined in .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

export default app;