const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGODB_URI is missing. Add it to backend/.env before starting the server.',
    );
  }

  try {
    await mongoose.connect(mongoUri);
    await mongoose.connection.db.admin().ping();
    console.log(
      `MongoDB connected successfully (database: ${mongoose.connection.name})`,
    );
  } catch {
    throw new Error(
      'Unable to connect to MongoDB. Check the configured URI and Atlas network access.',
    );
  }
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

async function getDatabaseStatus() {
  if (mongoose.connection.readyState !== 1) {
    return 'disconnected';
  }

  try {
    await mongoose.connection.db.admin().ping();
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
};
