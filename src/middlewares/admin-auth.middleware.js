import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { fail } from '../utils/api-response.js';

const cookieName = 'pcpowerlab_admin';
const sessionDurationMs = 2 * 60 * 60 * 1000;
const attemptWindowMs = 15 * 60 * 1000;
const maxAttempts = 5;
const sessions = new Map();
const attempts = new Map();

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    path: env.apiPrefix,
    maxAge: sessionDurationMs
  };
}

function currentToken(req) {
  const cookie = req.headers.cookie?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  const token = cookie?.slice(cookieName.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

function hasSession(req) {
  const token = currentToken(req);
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function requireAdmin(req, res, next) {
  if (!hasSession(req)) return fail(res, 401, 'Acesso não autorizado.');
  return next();
}

export function adminSession(req, res) {
  res.set('Cache-Control', 'no-store');
  return res.status(200).json({ authenticated: hasSession(req) });
}

export function unlockAdmin(req, res) {
  res.set('Cache-Control', 'no-store');
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (value.until <= now) attempts.delete(key);
  }
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= now) sessions.delete(token);
  }

  const key = req.ip;
  const state = attempts.get(key) || { count: 0, until: now + attemptWindowMs };
  if (state.count >= maxAttempts) return fail(res, 429, 'Muitas tentativas. Tente novamente mais tarde.');

  const password = req.body?.password;
  const configured = env.adminPassword;
  if (!configured) return fail(res, 503, 'Acesso administrativo indisponível.');

  const validInput = typeof password === 'string' && password.length > 0 && password.length <= 1024;
  const expected = createHash('sha256').update(configured).digest();
  const received = createHash('sha256').update(validInput ? password : '').digest();
  if (!validInput || !timingSafeEqual(expected, received)) {
    attempts.set(key, { count: state.count + 1, until: state.until });
    return fail(res, 401, 'Senha inválida.');
  }

  attempts.delete(key);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, now + sessionDurationMs);
  res.cookie(cookieName, token, cookieOptions());
  return res.status(200).json({ authenticated: true });
}

export function logoutAdmin(req, res) {
  const token = currentToken(req);
  if (token) sessions.delete(token);
  res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined });
  res.set('Cache-Control', 'no-store');
  return res.status(200).json({ authenticated: false });
}
