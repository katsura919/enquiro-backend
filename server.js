require("dotenv").config();
const express = require("express");
const http = require("http");
const connectDB = require("./app/lib/db");
const corsMiddleware = require("./app/lib/cors");

const api = require("./app/index");
const setupSocket = require("./app/lib/socket");
const { rateLimiters } = require("./app/middleware/rateLimit");

const app = express();
app.use(express.json({ limit: "10mb" })); // Increase payload limit for file uploads
app.use(express.urlencoded({ limit: "10mb", extended: true })); // For form data
app.use(corsMiddleware);

// Connect to MongoDB first then start server
const startServer = async () => {
  try {
    await connectDB();

    // Global rate limiter for all API endpoints
    app.use("/api", rateLimiters.api);

    app.use("/api", api);

    const server = http.createServer(app);
    const io = setupSocket(server);

    app.set("io", io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
