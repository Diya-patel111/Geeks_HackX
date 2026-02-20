require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Attach Socket.io
initSocket(server);

// Connect DB then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[SERVER] CivicPulse running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
  process.exit(1);
});
