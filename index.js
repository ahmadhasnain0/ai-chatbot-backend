require("dotenv").config();
const express = require("express");
const app = express();

// use cors middleware
const cors = require("cors")
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
// Middleware
app.use(express.json());
// Parse cookies sent in requests (needed to read HttpOnly token cookie)
const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Public routes
app.get("/", (req, res) => {
  res.json({ 
    success: true,
    message: "AI Chatbot Backend Server is Running",
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/chat", require("./src/routes/chatRoutes"));
app.use("/api/dashboard", require("./src/routes/homeRoutes"));

// 404 Handler - FIXED VERSION
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});