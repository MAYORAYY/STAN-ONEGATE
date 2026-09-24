import dotenv from 'dotenv';
dotenv.config({ path: '.env.development' });
import cors from 'cors';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { startSessionCleanupJob } from './jobs/session-cleanup';
import { extractSessions } from './services/session-extraction';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Konfigurasi Kunci Rahasia (WAJIB diset, tidak ada fallback)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diset di .env. Aplikasi tidak akan berjalan tanpa ini.');
}

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX) {
  throw new Error('ENCRYPTION_KEY wajib diset di .env (64 karakter hex untuk AES-256).');
}
const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY harus persis 32 byte (64 karakter hex) untuk AES-256.');
}

// Fungsi Enkripsi AES-256-CBC
function encryptSession(text: string | null): string | null {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// Fungsi Dekripsi AES-256-CBC
function decryptSession(encryptedText: string | null): string | null {
  if (!encryptedText) return null;
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) return null;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Gagal mendekripsi sesi:', err);
    return null;
  }
}

// Hash untuk refresh token (disimpan di DB, bukan token mentahnya)
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
// KODE PERBAIKAN
app.use(cors({
  origin: true, // Secara dinamis mengizinkan domain apapun (termasuk Vercel Anda)
  credentials: true
}));
app.use(helmet());
app.use(express.json());

startSessionCleanupJob();

// Rate limiter khusus endpoint login (maks 5 percobaan / 15 menit per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware Autentikasi JWT
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa.' });
  }
};

const loginSchema = z.object({
  nim: z.string().min(1, 'NIM wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

app.post('/identity/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'NIM dan password wajib diisi.' });
  }

  const { nim, password } = parsed.data;

  const sessionResult = await extractSessions(nim, password);

  if (!sessionResult.portalSession) {
    return res.status(401).json({ error: 'NIM atau password salah.' });
  }

  // Provisioning otomatis hanya dilakukan setelah kredensial portal valid.
  const user = await prisma.users.upsert({
    where: { nim },
    update: {},
    create: {
      nim,
      nama: nim,
      role: 'mahasiswa'
    }
  });

  const encryptedPortal = encryptSession(sessionResult.portalSession);
  const encryptedLms = encryptSession(sessionResult.lmsSession);

  const existingLinkedAccount = await prisma.linked_accounts.findUnique({
    where: { user_id: user.id }
  });

  await prisma.linked_accounts.upsert({
    where: { user_id: user.id },
    update: {
      portal_session: encryptedPortal,
      lms_session: encryptedLms || existingLinkedAccount?.lms_session || null,
    },
    create: {
      user_id: user.id,
      portal_session: encryptedPortal,
      lms_session: encryptedLms
    }
  });

  const accessToken = jwt.sign(
    { nim: user.nim, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { nim: user.nim },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Simpan hash refresh token ke DB supaya bisa dicabut sewaktu-waktu
  await prisma.refresh_tokens.create({
    data: {
      token_hash: hashToken(refreshToken),
      user_id: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  res.status(200).json({
    message: 'Login berhasil',
    accessToken,
    refreshToken,
    user: {
      nim: user.nim,
      nama: user.nama,
      role: user.role,
      portalConnected: !!sessionResult.portalSession,
      lmsConnected: !!sessionResult.lmsSession,
    }
  });
});

// Endpoint: Tukar refresh token jadi access token baru
app.post('/identity/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token wajib disertakan.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

    const tokenRecord = await prisma.refresh_tokens.findUnique({
      where: { token_hash: hashToken(refreshToken) }
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expires_at < new Date()) {
      return res.status(401).json({ error: 'Refresh token tidak valid, kedaluwarsa, atau sudah dicabut.' });
    }

    const user = await prisma.users.findUnique({ where: { nim: decoded.nim } });
    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const newAccessToken = jwt.sign(
      { nim: user.nim, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Refresh token tidak valid atau kedaluwarsa.' });
  }
});

// Endpoint: Cabut refresh token (logout)
app.post('/identity/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token wajib disertakan.' });
  }

  await prisma.refresh_tokens.updateMany({
    where: { token_hash: hashToken(refreshToken) },
    data: { revoked: true }
  });

  res.status(200).json({ message: 'Logout berhasil.' });
});

// Endpoint Terproteksi: Penarikan Sesi Dekripsi
app.get('/identity/sessions', requireAuth, async (req, res) => {
  const nim = (req as any).user.nim;

  const user = await prisma.users.findUnique({
    where: { nim },
    include: { linked_accounts: true }
  });

  if (!user || !user.linked_accounts) {
    return res.status(404).json({ error: 'Data sesi tidak ditemukan.' });
  }

  const portalSession = decryptSession(user.linked_accounts.portal_session);
  const lmsSession = decryptSession(user.linked_accounts.lms_session);

  if (!portalSession) {
    return res.status(401).json({ error: 'Sesi portal kosong. Silakan login ulang.' });
  }

  res.status(200).json({
    portalSession,
    lmsSession
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Identity Service berjalan di http://localhost:${PORT}`);
});