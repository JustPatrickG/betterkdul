import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './db';

const SESSION_COOKIE_NAME = 'bkdul_session';
const SESSION_DAYS = 30;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60; // seconds

async function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

async function createSession(accountId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, accountId, expiresAt } });
  return { token, expiresAt };
}

async function destroySessionByToken(token) {
  if (!token) return;
  await prisma.session.delete({ where: { token } }).catch(() => {});
}

// Reads the session cookie and returns the full Account row, or null.
async function getSessionAccount() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { account: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.account;
}

async function requireAdmin() {
  const account = await getSessionAccount();
  if (!account || !account.isAdmin) return null;
  return account;
}

function publicAccount(account) {
  if (!account) return null;
  const { passwordHash, ...rest } = account;
  return rest;
}

export {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  hashPassword,
  verifyPassword,
  createSession,
  destroySessionByToken,
  getSessionAccount,
  requireAdmin,
  publicAccount,
};
