require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const http = require('http');
const { initSocket } = require('./app/lib/socket');

// All routes united under /api
const api = require("./app/index");

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

// Unite all routes under /api
app.use('/api', api);

const server = http.createServer(app);
initSocket(server, allowedOrigins);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});