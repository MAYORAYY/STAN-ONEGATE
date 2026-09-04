import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { startSessionCleanupJob } from './jobs/session-cleanup';
import { extractSessions } from './services/session-extraction';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Konfigurasi Kunci Rahasia
const JWT_SECRET = process.env.JWT_SECRET || 'stan-onegate-jwt-secret-key-2026';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : crypto.createHash('sha256').update('onegate-session-secret-key').digest();

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

app.use(express.json());

startSessionCleanupJob();

// Middleware Autentikasi JWT
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded; // Menyisipkan data pengguna ke dalam request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa.' });
  }
};

const loginSchema = z.object({
  nim: z.string().min(1, 'NIM wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

app.post('/identity/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'NIM dan password wajib diisi.' });
  }

  let { nim, password } = parsed.data;

  const user = await prisma.users.findUnique({ where: { nim } });

  if (!user) {
    password = '';
    return res.status(401).json({ error: 'NIM atau password salah.' });
  }

  const sessionResult = await extractSessions(nim, password);
  password = ''; // Kosongkan password segera setelah tidak dipakai

  if (!sessionResult.portalSession && !sessionResult.lmsSession) {
    return res.status(401).json({ error: 'NIM atau password salah.' });
  }

  // IMPLEMENTASI TODO 2.3: Enkripsi sessionResult dan upsert ke linked_accounts
  // IMPLEMENTASI TODO 2.3: Enkripsi sessionResult dan upsert ke linked_accounts
  const encryptedPortal = encryptSession(sessionResult.portalSession);
  const encryptedLms = encryptSession(sessionResult.lmsSession);

  await prisma.linked_accounts.upsert({
    where: { user_id: user.id }, // Diarahkan ke kolom unik user_id
    update: {
      portal_session: encryptedPortal,
      lms_session: encryptedLms,
      // Catatan: updated_at tidak perlu ditulis manual karena sudah ada atribut @updatedAt di skema
    },
    create: {
      user_id: user.id,          // Diarahkan ke relasi user_id
      portal_session: encryptedPortal,
      lms_session: encryptedLms
    }
  });

  // IMPLEMENTASI TODO 2.4: Terbitkan access token (15 menit) + refresh token (7 hari)
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

// Endpoint Terproteksi: Penarikan Sesi Dekripsi
app.get('/identity/sessions', requireAuth, async (req, res) => {
  const nim = (req as any).user.nim;

  const user = await prisma.users.findUnique({
    where: { nim },
    include: { linked_accounts: true } // Menarik data relasi sekaligus
  });

  if (!user || !user.linked_accounts) {
    return res.status(404).json({ error: 'Data sesi tidak ditemukan.' });
  }

  const portalSession = decryptSession(user.linked_accounts.portal_session);
  const lmsSession = decryptSession(user.linked_accounts.lms_session);

  res.status(200).json({
    portalSession,
    lmsSession
  });
});
app.listen(PORT, () => {
  console.log(`🚀 Identity Service berjalan di http://localhost:${PORT}`);
});