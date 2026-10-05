require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const sequelize = require('./config/connection');
const routes = require('./controllers');
const { errorHandler } = require('./middleware/publicApi');
const { logInfo, logError } = require('./utils/logger');

require('./models');

const app = express();
const PORT = process.env.PORT || 3005;

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'drimplant-api' });
});

app.use(routes);
app.use(errorHandler);

const server = http.createServer(app);

async function boot() {
  await sequelize.authenticate();
  server.listen(PORT, () => {
    logInfo('listening', { route: `port ${PORT}` });
    console.log(`drimplant-api listening on port ${PORT}`);
  });
}

boot().catch((err) => {
  logError('boot_failed', { code: 'BOOT' });
  console.error('Failed to start drimplant-api:', err.message);
  process.exit(1);
});
