// Simple in-memory session store.
// This is intentionally lightweight (no JWT libraries) since the project
// spec asks for simple, non-complicated authentication.
// Format: token -> { id, name, phone, createdAt }
const sessions = new Map();

function createSession(user) {
  const token = `tok_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  sessions.set(token, { ...user, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
}

function destroySession(token) {
  sessions.delete(token);
}

// Express middleware: protects routes that require login.
// Expects header: Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }

  const user = getSession(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }

  req.user = user;
  req.token = token;
  next();
}

module.exports = { createSession, getSession, destroySession, requireAuth };
