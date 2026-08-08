require('dotenv').config();

const http = require('http');

const app = require('./app');
const { connectDatabase } = require('./config/database');
const { setSocketServer } = require('./realtime/realtimeEvents');
const { configureSocketServer } = require('./realtime/socketServer');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();

    const httpServer = http.createServer(app);
    const io = configureSocketServer(httpServer);
    setSocketServer(io);

    httpServer.listen(PORT, () => {
      console.log(`Smart Service API is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
