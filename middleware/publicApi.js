function publicApiKey(req, res, next) {
  const expected = process.env.PUBLIC_API_KEY;
  if (!expected) return next();
  const provided = req.headers['x-api-key'];
  if (provided !== expected) {
    return res.status(401).json({ error: { message: 'Invalid API key', code: 'UNAUTHORIZED' } });
  }
  next();
}

const hits = new Map();

function rateLimit({ windowMs = 60000, max = 300 } = {}) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const rec = hits.get(key) || { count: 0, start: now };
    if (now - rec.start > windowMs) {
      rec.count = 0;
      rec.start = now;
    }
    rec.count += 1;
    hits.set(key, rec);
    if (rec.count > max) {
      return res.status(429).json({ error: { message: 'Too many requests', code: 'RATE_LIMIT' } });
    }
    next();
  };
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'SERVER_ERROR';
  const publicMessage = status >= 500 ? 'Something went wrong' : err.message;
  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', message: 'unhandled_error', route: req.originalUrl, code }));
  }
  res.status(status).json({ error: { message: publicMessage, code } });
}

module.exports = { publicApiKey, rateLimit, errorHandler };
