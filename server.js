require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./app/lib/db');
const corsMiddleware = require('./app/lib/cors');

// All routes united under /api
const api = require("./app/index");

const app = express();
app.use(express.json());

// CORS 
app.use(corsMiddleware);

// Connect to MongoDB first then start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.use('/api', api);

    const server = http.createServer(app);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();