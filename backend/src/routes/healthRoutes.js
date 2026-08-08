const express = require('express');

const { getDatabaseStatus } = require('../config/database');

const router = express.Router();

router.get('/', async (request, response) => {
  const database = await getDatabaseStatus();
  const isConnected = database === 'connected';

  response.status(isConnected ? 200 : 503).json({
    success: isConnected,
    message: 'Smart Service API is running',
    database,
  });
});

module.exports = router;
