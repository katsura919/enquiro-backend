require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const http = require('http');
const { initSocket } = require('./lib/socket');

//Routes
const askRoutes = require("./routes/askRoutes");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const userRoutes = require("./routes/userRoutes");
const escalationRoutes = require("./routes/escalationRoutes");
const businessRoutes = require("./routes/businessRoutes");
const activityRoutes = require("./routes/activityRoutes");

const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:3000",
  "https://admin-codey.vercel.app",
  "https://enquiro.vercel.app",
];

// ✅ Allow CORS for frontend
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy violation"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, 
  })
);

// Connect to MongoDB
mongoose.connect(`mongodb+srv://katsuragik919:gUxW6bdC56s2bgQE@csbackend.frzm8.mongodb.net/?retryWrites=true&w=majority&appName=CSBackend`)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Use Routes
app.use("/auth", authRoutes);
app.use("/knowledge", knowledgeRoutes);
app.use("/ask", askRoutes);
app.use("/chat", chatRoutes);
app.use("/category", categoryRoutes);
app.use("/session", sessionRoutes);
app.use("/user", userRoutes);
app.use("/escalation", escalationRoutes);
app.use("/business", businessRoutes);
app.use("/activity", activityRoutes);

const server = http.createServer(app);
initSocket(server, allowedOrigins);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});