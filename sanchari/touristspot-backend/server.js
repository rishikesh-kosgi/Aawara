require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initializeDatabase } = require('./database');
const { getConfig } = require('./config');

const app = express();
const config = getConfig();
const HOST = config.host;
const PORT = config.port;

function createCorsOptions() {
  const allowedOrigins = new Set(config.corsOrigins);

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.size === 0 && !config.production) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

function createLimiter(maxRequests) {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
}

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
app.use(createLimiter(config.rateLimitMax));
app.use('/uploads', express.static(path.join(__dirname, config.uploadsDir), {
  maxAge: '30d',
  immutable: true,
}));

app.use('/api/auth', createLimiter(config.authRateLimitMax));
app.use('/api/photos', createLimiter(config.uploadRateLimitMax));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/spots', require('./routes/spots'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/groups', require('./routes/groups'));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TouristSpot API running',
    environment: config.production ? 'production' : 'development',
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

async function startServer() {
  try {
    await initializeDatabase();
    const server = app.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });

    const shutdown = signal => {
      console.log(`Received ${signal}. Shutting down backend...`);
      server.close(() => process.exit(0));
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to initialize backend:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
