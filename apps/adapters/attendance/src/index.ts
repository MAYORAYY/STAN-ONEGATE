import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // preflight cukup sekali per hari
}));

app.use(express.json());

// Log durasi setiap request
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} ${Date.now() - t}ms`));
  next();
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diset di .env. Aplikasi tidak akan berjalan tanpa ini.');
}
const IDENTITY_SERVICE_URL = 'http://localhost:3001/identity/sessions';
const PORTAL = 'https://portal.pknstan.ac.id';

// ---------- HELPER ----------

// Cache berbasis promise: request kembar yang datang bersamaan berbagi satu pekerjaan
const memoStore = new Map<string, { at: number; promise: Promise<any> }>();

const memo = <T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  keep: (v: T) => boolean = () => true
): Promise<T> => {
  const hit = memoStore.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;

  const promise = loader();
  memoStore.set(key, { at: Date.now(), promise });
  promise
    .then(v => { if (!keep(v)) memoStore.delete(key); })
    .catch(() => memoStore.delete(key)); // jangan cache kegagalan
  return promise;
};

// Buang semua cache milik satu sesi portal
const invalidate = (ciSession: string) => {
  for (const key of memoStore.keys()) {
    if (key.startsWith(`${ciSession}|`)) memoStore.delete(key);
  }
};

// Bersihkan entri lama tiap 5 menit supaya memori tidak membengkak
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoStore) if (now - v.at > 15 * 60_000) memoStore.delete(k);
}, 5 * 60_000).unref();

// Jalankan fn untuk tiap item dengan maksimal `limit` sekaligus; urutan hasil tetap
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  });
  await Promise.all(workers);
  return results;
}

const portalHeaders = (ciSession: string, referer = `${PORTAL}/`) => ({
  Cookie: ciSession,
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  Referer: referer
});

// Sesi portal dari identity service (di-cache 60 detik per token)
const getCiSession = (authHeader: string): Promise<string> =>
  memo(`session|${authHeader}`, 60_000, async () => {
    const r = await axios.get(IDENTITY_SERVICE_URL, {
      headers: { Authorization: authHeader },
      timeout: 5000
    });
    if (!r.data.portalSession) throw new Error('Sesi portal tidak ditemukan.');
    return r.data.portalSession as string;
  });

// Ambil HTML halaman portal (di-cache per sesi + URL)
const fetchHtml = (ciSession: string, url: string, ttlMs: number): Promise<string> =>
  memo(`${ciSession}|html|${url}`, ttlMs, async () => {
    const r = await axios.get(url, {
      headers: portalHeaders(ciSession),
      maxRedirects: 0,
      validateStatus: s => s >= 200 && s < 400,
      timeout: 20000
    });
    if (r.status >= 300) throw new Error('Sesi portal kedaluwarsa (dialihkan ke halaman login).');
    return (r.data as string) || '';
  });

// Middleware Verifikasi JWT
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: true, module: 'attendance', message: 'Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: true, module: 'attendance', message: 'Format token tidak valid.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: true, module: 'attendance', message: `Token invalid: ${err.message}` });
  }
};

// ---------- RUTE ----------

// Rute Scraping Presensi (jadwal kuliah hari ini)
app.post('/adapter/attendance', requireAuth, async (req, res) => {
  try {
    const ciSession = await getCiSession(req.headers.authorization as string);

    // TTL pendek (10 detik): cukup untuk membuang request kembar, tetap segar untuk tombol absen
    const html = await fetchHtml(ciSession, `${PORTAL}/stud/jadkul/kulnow`, 10_000);
    const $ = cheerio.load(html);
    const jadwalList: any[] = [];

    $('table.table tbody tr').each((index, element) => {
      const tds = $(element).find('td');
      if (tds.length < 5) return;

      const absenBtn = $(tds[5]).find('.absenkul');
      let presensiData = null;

      if (absenBtn.length > 0) {
        presensiData = {
          id: absenBtn.attr('id'),
          link: absenBtn.attr('data-links')
        };
      }

      jadwalList.push({
        no: $(tds[0]).text().trim(),
        kelas: $(tds[1]).text().replace(/\s+/g, ' ').trim(),
        mataKuliah: $(tds[2]).text().replace(/\s+/g, ' ').trim(),
        waktu: $(tds[3]).text().trim(),
        ruang: $(tds[4]).text().replace(/\s+/g, ' ').trim(),
        statusHadir: $(tds[5]).text().trim(),
        presensiTersedia: absenBtn.length > 0,
        payloadPresensi: presensiData
      });
    });

    res.json({
      success: true,
      message: 'Jadwal berhasil diekstrak',
      totalJadwal: jadwalList.length,
      data: jadwalList
    });
  } catch (error: any) {
    res.status(500).json({ error: true, module: 'attendance', message: error.message || 'Gagal memproses presensi' });
  }
});

// Rute Eksekusi Presensi (Klik Tombol Hadir)
app.post('/adapter/attendance/submit', requireAuth, async (req, res) => {
  try {
    const { id, link } = req.body;

    if (!id || !link) {
      return res.status(400).json({ error: true, message: 'Parameter id dan link presensi wajib disertakan' });
    }

    const ciSession = await getCiSession(req.headers.authorization as string);

    const formData = new URLSearchParams();
    formData.append('id', id);
    formData.append('link', link);

    const submitRes = await axios.post(`${PORTAL}/stud/jadkul/absenkul`, formData.toString(), {
      headers: {
        Cookie: ciSession,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${PORTAL}/stud/jadkul/kulnow`
      },
      timeout: 20000
    });

    invalidate(ciSession); // data presensi berubah, buang cache

    res.json({
      success: true,
      message: 'Permintaan presensi berhasil dikirim',
      kampusResponse: submitRes.data
    });
  } catch (error: any) {
    res.status(500).json({ error: true, module: 'attendance-submit', message: error.message || 'Gagal mengeksekusi presensi' });
  }
});

// Ambil semua rekap presensi (KRS → tiap mata kuliah), paralel terbatas
const loadRiwayat = async (ciSession: string) => {
  const t0 = Date.now();

  // Tahap 1: daftar link rekap dari halaman KRS
  const krsHtml = await fetchHtml(ciSession, `${PORTAL}/stud/jadkul/index`, 60_000);
  const $krs = cheerio.load(krsHtml);
  const linkSet = new Set<string>();

  $krs('a').each((_, el) => {
    const href = $krs(el).attr('href');
    const linkText = `${$krs(el).attr('data-original-title') || ''} ${$krs(el).attr('title') || ''} ${$krs(el).text()} ${href || ''}`;
    if (href && /rekap|presensi/i.test(linkText)) {
      linkSet.add(new URL(href, PORTAL).toString());
    }
  });
  const rekapLinks = [...linkSet];

  console.log(`[attendance-riwayat] Link rekap ditemukan: ${rekapLinks.length}`);

  // Tahap 2: ambil tiap halaman rekap, maksimal 4 sekaligus
  let gagal = 0;
  const pages = await mapLimit(rekapLinks, 4, async (link) => {
    const t = Date.now();
    try {
      const html = await fetchHtml(ciSession, link, 10 * 60_000);
      const $ = cheerio.load(html);
      const rows: any[] = [];

      $('table tbody tr').each((_, el) => {
        const tds = $(el).find('td');
        if (tds.length < 5) return;
        rows.push({
          no: $(tds[0]).text().trim(),
          mataKuliah: $(tds[1]).text().trim(),
          pengajar: $(tds[2]).text().trim(),
          tanggal: $(tds[3]).text().trim(),
          presensi: $(tds[4]).text().trim()
        });
      });

      console.log(`[attendance-riwayat] ${link} → ${Date.now() - t}ms (${rows.length} baris)`);
      return rows;
    } catch (e: any) {
      gagal++;
      console.error(`[attendance-riwayat] Gagal ${link} (${Date.now() - t}ms):`, e.message);
      return [] as any[];
    }
  });

  console.log(`[attendance-riwayat] Selesai dalam ${Date.now() - t0}ms, gagal: ${gagal}`);

  return {
    totalMataKuliah: rekapLinks.length,
    gagal,
    data: ([] as any[]).concat(...pages)
  };
};

// Rute Riwayat Presensi (gabungan dari semua mata kuliah)
// Tambahkan ?refresh=1 untuk melewati cache
app.get('/adapter/attendance/riwayat', requireAuth, async (req, res) => {
  try {
    const ciSession = await getCiSession(req.headers.authorization as string);
    if (req.query.refresh === '1') invalidate(ciSession);

    // Cache 10 menit; tidak disimpan kalau ada mata kuliah yang gagal diambil
    const hasil = await memo(`${ciSession}|riwayat`, 10 * 60_000, () => loadRiwayat(ciSession), v => v.gagal === 0);

    if (hasil.totalMataKuliah === 0) {
      return res.json({ success: true, message: 'Tidak ada mata kuliah dengan rekap presensi.', data: [] });
    }

    res.json({
      success: true,
      message: hasil.gagal > 0
        ? `Riwayat presensi diekstrak sebagian (${hasil.gagal} mata kuliah gagal diambil)`
        : 'Riwayat presensi berhasil diekstrak',
      totalMataKuliah: hasil.totalMataKuliah,
      totalRiwayat: hasil.data.length,
      gagal: hasil.gagal,
      data: hasil.data
    });
  } catch (error: any) {
    res.status(500).json({ error: true, module: 'attendance-riwayat', message: error.message || 'Gagal memproses riwayat presensi' });
  }
});

app.listen(3002, () => console.log('Attendance Adapter berjalan di port 3002'));