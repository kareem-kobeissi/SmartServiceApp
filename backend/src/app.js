const cors = require('cors');
const express = require('express');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const providerRoutes = require('./routes/providerRoutes');
const providerRequestRoutes = require('./routes/providerRequestRoutes');
const requestRoutes = require('./routes/requestRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const { realtimeMutationMiddleware } = require('./middleware/realtimeMiddleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(realtimeMutationMiddleware);
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/provider-requests', providerRequestRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tracking', trackingRoutes);

module.exports = app;
