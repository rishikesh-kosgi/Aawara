const DEFAULT_PORT = 5000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_MAX_JSON_SIZE = '1mb';
const DEFAULT_ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function requireEnv(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isProduction() {
  return String(process.env.NODE_ENV || 'development').toLowerCase() === 'production';
}

function getJwtSecret() {
  const secret = requireEnv('JWT_SECRET');
  if (isProduction() && secret === 'change-this-to-a-long-random-secret') {
    throw new Error('JWT_SECRET must be changed before running in production');
  }
  return secret;
}

function getCorsOrigins() {
  return parseList(process.env.CORS_ORIGINS);
}

function getConfig() {
  const production = isProduction();

  return {
    production,
    host: process.env.HOST || DEFAULT_HOST,
    port: parseInteger(process.env.PORT, DEFAULT_PORT),
    trustProxy: parseInteger(process.env.TRUST_PROXY, production ? 1 : 0),
    jwtSecret: getJwtSecret(),
    corsOrigins: getCorsOrigins(),
    uploadsDir: process.env.UPLOADS_DIR || 'uploads',
    uploadsBaseUrl: String(process.env.UPLOADS_BASE_URL || '').trim(),
    bodyLimit: process.env.BODY_LIMIT || DEFAULT_MAX_JSON_SIZE,
    rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitMax: parseInteger(process.env.RATE_LIMIT_MAX, production ? 300 : 2000),
    authRateLimitMax: parseInteger(process.env.AUTH_RATE_LIMIT_MAX, production ? 30 : 500),
    uploadRateLimitMax: parseInteger(process.env.UPLOAD_RATE_LIMIT_MAX, production ? 20 : 200),
    allowedImageMimeTypes: DEFAULT_ALLOWED_IMAGE_MIME_TYPES,
    googleWebClientId: String(process.env.GOOGLE_WEB_CLIENT_ID || '').trim(),
  };
}

module.exports = { getConfig, isProduction };
