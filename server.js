require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./app/lib/db');
const corsMiddleware = require('./app/lib/cors');


const api = require("./app/index");
const setupSocket = require('./app/lib/socket');

const app = express();
app.use(express.json());
app.use(corsMiddleware);

// Connect to MongoDB first then start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.use('/api', api);

    const server = http.createServer(app);
    const io = setupSocket(server);
    
    app.set('io', io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();