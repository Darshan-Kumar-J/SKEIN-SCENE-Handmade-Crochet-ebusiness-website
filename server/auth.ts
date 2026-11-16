import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getDb, sanitizeUser, type StoredUser } from './db.ts';

const SESSION_COOKIE = 'skein_session';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('skein-scene-bengaluru-session-key-v1').digest('hex');

export const PAYMENT_WEBHOOK_SECRET =
  process.env.RAZORPAY_KEY_SECRET || 'skein_scene_rzp_test_hmac_secret_2026';

export interface AuthRequest extends Request {
  authUser?: StoredUser;
}

interface SessionPayload {
  uid: string;
  role: 'customer' | 'admin';
  exp: number;
}

export function signSessionToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

export function setSessionCookie(res: Response, user: StoredUser): void {
  const token = signSessionToken({
    uid: user.id,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function attachOptionalUser(req: AuthRequest, _res: Response, next: NextFunction): void {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (token) {
    const payload = verifySessionToken(token);
    if (payload) {
      const db = getDb();
      const user = db.users.find((u) => u.id === payload.uid);
      if (user) {
        req.authUser = user;
      }
    }
  }
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Administrator sign-in required.' });
    return;
  }
  if (req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
    return;
  }
  next();
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(body).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createRazorpaySignature(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

export function publicUserResponse(user: StoredUser) {
  return sanitizeUser(user);
}
