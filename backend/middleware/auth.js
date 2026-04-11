import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {return res.status(401).json({ error: 'Missing token' });}
  const token = auth.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, role: payload.role, email: payload.email };
    // If admin, check if super
    if (payload.role === 'admin') {
      // We need to query DB here, but since it's middleware, we need to make it async
      // For now, we'll handle it in controllers where needed, or modify to async
      // Actually, to keep it simple, we'll query in controllers
    }
    return next();
  // eslint-disable-next-line no-unused-vars
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {return res.status(401).json({ error: 'Unauthorized' });}
    if (!roles.includes(req.user.role)) {return res.status(403).json({ error: 'Forbidden' });}
    next();
  };
}
