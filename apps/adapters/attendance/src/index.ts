import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import cors from 'cors'; // 1. Impor cors
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const app = express();

// 2. WAJIB LETAKKAN CORS DI SINI (sebelum express.json dan rute)
app.use(cors({
  origin: 'http://localhost:5173', // Mengizinkan akses dari antarmuka React
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET wajib diset di .env. Aplikasi tidak akan berjalan tanpa ini.');
}
const IDENTITY_SERVICE_URL = 'http://localhost:3001/identity/sessions';

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

// Rute Scraping Presensi
app.post('/adapter/attendance', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization as string;
    const sessionRes = await axios.get(IDENTITY_SERVICE_URL, {
      headers: { Authorization: authHeader }
    });
    
    const ciSession = sessionRes.data.portalSession;
    if (!ciSession) throw new Error('Sesi portal tidak ditemukan.');

    const portalRes = await axios.get('https://portal.pknstan.ac.id/stud/jadkul/kulnow', {
      headers: { 
        'Cookie': ciSession,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Referer': 'https://portal.pknstan.ac.id/'
      },
      maxRedirects: 0, 
      validateStatus: (status) => status >= 200 && status < 400 
    });

    const $ = cheerio.load(portalRes.data || '');
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

    const authHeader = req.headers.authorization as string;
    const sessionRes = await axios.get(IDENTITY_SERVICE_URL, {
      headers: { Authorization: authHeader }
    });
    
    const ciSession = sessionRes.data.portalSession;
    if (!ciSession) throw new Error('Sesi portal tidak ditemukan.');

    const formData = new URLSearchParams();
    formData.append('id', id);
    formData.append('link', link);

    const submitRes = await axios.post('https://portal.pknstan.ac.id/stud/jadkul/absenkul', formData.toString(), {
      headers: { 
        'Cookie': ciSession,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://portal.pknstan.ac.id/stud/jadkul/kulnow'
      }
    });

    res.json({
      success: true,
      message: 'Permintaan presensi berhasil dikirim',
      kampusResponse: submitRes.data
    });
  } catch (error: any) {
    res.status(500).json({ error: true, module: 'attendance-submit', message: error.message || 'Gagal mengeksekusi presensi' });
  }
});

// Rute Riwayat Presensi (gabungan dari semua mata kuliah)
app.get('/adapter/attendance/riwayat', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization as string;
    const sessionRes = await axios.get(IDENTITY_SERVICE_URL, {
      headers: { Authorization: authHeader }
    });

    const ciSession = sessionRes.data.portalSession;
    if (!ciSession) throw new Error('Sesi portal tidak ditemukan.');

    const portalHeaders = {
      'Cookie': ciSession,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'Referer': 'https://portal.pknstan.ac.id/'
    };

    // Tahap 1: Ambil daftar link rekap presensi dari halaman KRS
    const krsRes = await axios.get('https://portal.pknstan.ac.id/stud/jadkul/index', {
      headers: portalHeaders,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });

    const $krs = cheerio.load(krsRes.data || '');
    const rekapLinks: string[] = [];

    $krs('a').each((_, el) => {
      const href = $krs(el).attr('href');
      const linkText = `${$krs(el).attr('data-original-title') || ''} ${$krs(el).attr('title') || ''} ${$krs(el).text()} ${href || ''}`;
      if (href && /rekap|presensi/i.test(linkText)) {
        rekapLinks.push(new URL(href, 'https://portal.pknstan.ac.id').toString());
      }
    });

    console.log(`[attendance-riwayat] Link rekap ditemukan: ${rekapLinks.length}`);

    if (rekapLinks.length === 0) {
      return res.json({ success: true, message: 'Tidak ada mata kuliah dengan rekap presensi.', data: [] });
    }

    // Tahap 2: Scrape tiap halaman rekap presensi satu per satu
    const riwayatPresensi: any[] = [];

    for (const link of rekapLinks) {
      try {
        const rekapRes = await axios.get(link, {
          headers: portalHeaders,
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        });

        const $rekap = cheerio.load(rekapRes.data || '');

        $rekap('table tbody tr').each((_, el) => {
          const tds = $rekap(el).find('td');
          if (tds.length < 5) return;

          riwayatPresensi.push({
            no: $rekap(tds[0]).text().trim(),
            mataKuliah: $rekap(tds[1]).text().trim(),
            pengajar: $rekap(tds[2]).text().trim(),
            tanggal: $rekap(tds[3]).text().trim(),
            presensi: $rekap(tds[4]).text().trim()
          });
        });
      } catch (innerError: any) {
        console.error(`Gagal scrape rekap presensi dari ${link}:`, innerError.message);
        // lanjut ke mata kuliah berikutnya meski satu gagal, supaya tidak menggagalkan semuanya
      }
    }

    res.json({
      success: true,
      message: 'Riwayat presensi berhasil diekstrak',
      totalMataKuliah: rekapLinks.length,
      totalRiwayat: riwayatPresensi.length,
      data: riwayatPresensi
    });
  } catch (error: any) {
    res.status(500).json({ error: true, module: 'attendance-riwayat', message: error.message || 'Gagal memproses riwayat presensi' });
  }
});

app.listen(3002, () => console.log('Attendance Adapter berjalan di port 3002'));