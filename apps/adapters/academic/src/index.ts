import express, { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';
import * as cheerio from 'cheerio';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const app = express();
const PORT = process.env.PORT || 3003;
const IDENTITY_URL = process.env.IDENTITY_URL;
if (!IDENTITY_URL) {
    throw new Error('IDENTITY_URL wajib diset.');
}

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json());

// Log durasi setiap request
app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} ${Date.now() - t}ms`));
    next();
});

// PORTAL_BASE HANYA SAMPAI /stud (JANGAN ADA /skpmvd DI SINI)
const PORTAL_BASE = 'https://portal.pknstan.ac.id/stud';

const portalHeaders = (ciSession: string, referer = PORTAL_BASE) => ({
    Cookie: ciSession,
    Referer: referer,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate'
});

// ---------- CACHE ----------

// Cache sesi portal (hindari panggil identity di setiap request)
const sessionCache = new Map<string, { at: number; value: string }>();

const getCiSession = async (req: Request): Promise<string | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const hit = sessionCache.get(authHeader);
    if (hit && Date.now() - hit.at < 60_000) return hit.value;

    try {
        const response = await axios.get(`${IDENTITY_URL.replace(/\/+$/, '')}/identity/sessions`, {
            headers: { Authorization: authHeader },
            timeout: 5000
        });
        sessionCache.set(authHeader, { at: Date.now(), value: response.data.portalSession });
        return response.data.portalSession;
    } catch (error) {
        console.error('Gagal mengambil sesi portal:', error);
        return null;
    }
};

// Cache HTML portal; request kembar yang datang bersamaan berbagi satu fetch
const pageStore = new Map<string, { at: number; html: string }>();
const pageInflight = new Map<string, Promise<string>>();

const fetchPortalHtml = async (ciSession: string, endpoint: string, ttlMs = 60_000): Promise<string> => {
    const key = `${ciSession}|${endpoint}`;

    const load = (): Promise<string> => {
        let p = pageInflight.get(key);
        if (!p) {
            p = axios
                .get(endpoint, { headers: portalHeaders(ciSession, endpoint), timeout: 30000 })
                .then(r => {
                    const html = r.data as string;
                    pageStore.set(key, { at: Date.now(), html });
                    return html;
                })
                .finally(() => pageInflight.delete(key));
            pageInflight.set(key, p);
        }
        return p;
    };

    const hit = pageStore.get(key);
    if (hit) {
        if (Date.now() - hit.at > ttlMs) load().catch(() => {}); // segarkan diam-diam
        return hit.html;
    }
    return load();
};

// Hapus cache halaman milik satu sesi (dipanggil setelah data berubah)
const invalidatePages = (ciSession: string) => {
    for (const [k, v] of pageStore) {
        if (k.startsWith(`${ciSession}|`) && Date.now() - v.at > 30 * 60_000) pageStore.delete(k);
    }
};

// 20251 → 20252, 20252 → 20261
const nextPeriode = (p: string): string => {
    const y = Number(p.slice(0, 4));
    const s = Number(p.slice(4));
    return s >= 2 ? `${y + 1}1` : `${y}${s + 1}`;
};

// Periode saat ini = periode terakhir di dashboard SKPM + 1 langkah.
// Halaman dashboard sudah di-cache, jadi biasanya tidak menambah request ke portal.
const getPeriodeTerbaru = async (ciSession: string): Promise<string | null> => {
    const html = await fetchPortalHtml(ciSession, `${PORTAL_BASE}/skpmvd/dashboard`);
    const $ = cheerio.load(html);
    const list = $('#example1 tbody tr')
        .map((_, el) => $(el).find('td').eq(1).text().trim())
        .get()
        .filter(p => /^\d{5}$/.test(p));
    if (list.length === 0) return null;
    const terakhir = list.reduce((a, b) => (a > b ? a : b));
    return terakhir;
};


// ---------- RUTE ----------

// --- RUTE 1: Penarik Data Dropdown (AJAX Proxy) ---
app.get('/skpm/options/:type', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ error: 'Sesi tidak ditemukan' });

    const { type } = req.params;
    const queryString = new URLSearchParams(req.query as any).toString();
    const endpoint = `${PORTAL_BASE}/skpmvd/ajax_${type}/?${queryString}`;

    try {
        const response = await axios.get(endpoint, { headers: portalHeaders(ciSession, endpoint), timeout: 15000 });
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: `Gagal mengambil opsi ${type}` });
    }
});

// --- RUTE 2: Eksekusi Submit SKPM ---
app.post('/skpm/submit', upload.single('file_bukti'), async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    const uploadedFile = (req as any).file;
    const endpoint = `${PORTAL_BASE}/skpmvd/tambahskpm`;

    try {
        const form = new FormData();
        form.append('lingkup', req.body.lingkup_kegiatan);
        form.append('kegiatan', req.body.jenis_kegiatan);
        form.append('tingkat', req.body.tingkat_partisipasi);
        form.append('jabatan', req.body.jabatan);
        form.append('uraian_kegiatan', req.body.uraian_kegiatan);
        form.append('tanggal_kegiatan', req.body.tanggal_kegiatan);

        if (uploadedFile) {
            form.append('bukti_kegiatan', uploadedFile.buffer, uploadedFile.originalname);
        }

        const response = await axios.post(endpoint, form, {
            headers: { ...portalHeaders(ciSession, endpoint), ...form.getHeaders() },
            maxRedirects: 0
        });

        if (response.status === 302 || response.status === 200) {
            invalidatePages(ciSession); // data SKPM berubah, buang cache
            res.json({ success: true, message: 'SKPM berhasil diajukan!' });
        } else {
            res.status(400).json({ success: false, message: 'Gagal diproses portal.' });
        }
    } catch (error: any) {
        if (error.response?.status === 302) {
            invalidatePages(ciSession);
            res.json({ success: true, message: 'SKPM berhasil diajukan!' });
        } else {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
        }
    }
});

// --- RUTE 3: Ekstraksi Profil Akademik ---
app.get('/profil', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        const html = await fetchPortalHtml(ciSession, `${PORTAL_BASE}/profil`);
        const $ = cheerio.load(html);

        const nama = $('h5.card-title').text().trim();
        const nim = $('h6.card-subtitle').text().trim();
        const listItems = $('ul.list-group li.list-group-item');
        const jenisKelamin = $(listItems[0]).text().trim();
        const asalKota = $(listItems[1]).text().trim();
        const tanggalLahir = $(listItems[2]).text().trim();
        const email = $(listItems[3]).find('small').text().trim();
        const info = $('.col-lg-6.col-xl-4');

const prodi = info.eq(0).find('.widget-heading').text().trim();
const kelas = info.eq(0).find('.widget-subheading').text().trim();          // "6 Sisfo-3"
const semester = kelas.match(/^\s*(\d+)/)?.[1] ?? '';                      // "6"

const jumlahMatkul = info.eq(1).find('.widget-heading').text().split(':')[1]?.trim() || '0';
const ipkNum = parseFloat(info.eq(1).find('.widget-subheading').text().split(':')[1] ?? '');
const ipk = Number.isFinite(ipkNum) ? ipkNum.toFixed(2) : '0.00';          // "3.92"

const status = info.eq(2).find('.widget-numbers span').text().trim();
        res.json({ success: true, data: { nama, nim, jenisKelamin, asalKota, tanggalLahir, email, prodi, kelas, jumlahMatkul, semester, ipk, status } });
    } catch (error: any) {
        console.error('Gagal menarik profil:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menarik profil' });
    }
});

// --- RUTE 4: Ekstraksi Transkrip Nilai ---
app.get('/nilai', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        const html = await fetchPortalHtml(ciSession, `${PORTAL_BASE}/nilai`);
        const $ = cheerio.load(html);
        const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

        // Ambil hanya tabel NILAI AKADEMIK (yang punya header "Mata Kuliah")
        const tabel = $('table').filter((_, t) =>
            $(t).find('th').map((_, th) => norm($(th).text())).get().includes('mata kuliah')
        ).first();

        const headerRow = tabel.find('thead tr').first().length
            ? tabel.find('thead tr').first()
            : tabel.find('tr').first();
        const headers = headerRow.find('th, td').map((_, el) => norm($(el).text())).get();
        const idx = (name: string) => headers.indexOf(name);

        const daftarNilai: any[] = [];
        tabel.find('tbody tr').each((_, el) => {
            const cells = $(el).find('th, td');
            if (cells.length < headers.length) return;
            const val = (name: string) => {
                const i = idx(name);
                return i >= 0 ? $(cells[i]).text().replace(/\s+/g, ' ').trim() : '';
            };

            const namaMk = val('mata kuliah');
            if (!namaMk) return;
            const nilaiAngka = val('n. angka');

            daftarNilai.push({
                no: daftarNilai.length + 1,
                namaMk,
                kelompok: val('kelompok'),
                sks: val('sks'),
                uts: val('uts') || '-',
                uas: val('uas') || '-',
                akt: val('akt') || '-',
                nilaiAngka: nilaiAngka || '-',
                nilaiHuruf: val('n. huruf') || '-',
                nilaiIndeks: val('n. indeks') || '-',
                status: Number(nilaiAngka) >= 60 ? 'Lulus' : 'Dalam Proses'
            });
        });

        res.json({ success: true, data: daftarNilai });
    } catch (error: any) {
        console.error('Gagal menarik nilai:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menarik nilai' });
    }
});

// --- RUTE 4b: Ekstraksi Nilai Karakter ---
app.get('/nilai/karakter', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        const html = await fetchPortalHtml(ciSession, `${PORTAL_BASE}/nilai`);
        const $ = cheerio.load(html);
        const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

        // Tabel NILAI KARAKTER dikenali dari header "Sikap perilaku"
        const tabel = $('table').filter((_, t) =>
            $(t).find('th').map((_, th) => norm($(th).text())).get().includes('sikap perilaku')
        ).first();

        if (tabel.length === 0) {
            return res.json({ success: true, data: null });
        }

        const headerRow = tabel.find('thead tr').first().length
            ? tabel.find('thead tr').first()
            : tabel.find('tr').first();
        const headers = headerRow.find('th, td').map((_, el) => norm($(el).text())).get();

        const row = tabel.find('tbody tr').first();
        const cells = row.find('td');
        const val = (name: string) => {
            const i = headers.indexOf(name);
            return i >= 0 && cells[i] ? $(cells[i]).text().replace(/\s+/g, ' ').trim() : '-';
        };

        res.json({
            success: true,
            data: {
                sikapPerilaku: val('sikap perilaku'),
                kehadiran: val('kehadiran'),
                tugas: val('tugas'),
                skp: val('skp'),
                nilaiAngka: val('n. angka'),
                nilaiHuruf: val('n. huruf')
            }
        });
    } catch (error: any) {
        console.error('Gagal menarik nilai karakter:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menarik nilai karakter' });
    }
});

// --- RUTE 5: Ekstraksi Dashboard & Total Poin SKPM ---
app.get('/skpm/dashboard', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        const html = await fetchPortalHtml(ciSession, `${PORTAL_BASE}/skpmvd/dashboard`);
        const $ = cheerio.load(html);

        const totalKegiatan = $('.widget-content.bg-arielle-smile .widget-numbers span').text().trim() || '0';
        const totalNilai = $('.widget-content.bg-grow-early .widget-numbers span').text().trim() || '0';

        const riwayatPeriode: any[] = [];
        $('#example1 tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length >= 3) {
                const no = $(columns[0]).text().trim();
                const periode = $(columns[1]).text().trim();
                const nilaiPeriode = $(columns[2]).text().trim();
                riwayatPeriode.push({ no, periode, totalNilai: nilaiPeriode });
            }
        });

        res.json({ success: true, data: { totalKegiatan, totalNilai, riwayatPeriode } });
    } catch (error: any) {
        console.error('Gagal menarik dasbor SKPM:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menarik dasbor SKPM' });
    }
});

// --- RUTE 6: Ekstraksi Tabel Riwayat Data SKPM ---
app.get('/skpm/data', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    const periodeQuery = req.query.periode ? String(req.query.periode) : '';
const endpoint = periodeQuery
    ? `${PORTAL_BASE}/skpmvd/kelolaskprev?periode=${encodeURIComponent(periodeQuery)}`
    : `${PORTAL_BASE}/skpmvd/kelolaskpm`;
        try {
        const periodeLabel = req.query.periode
            ? String(req.query.periode)
            : (await getPeriodeTerbaru(ciSession).catch(() => null)) ?? 'terbaru';

        const html = await fetchPortalHtml(ciSession, endpoint);
        const $ = cheerio.load(html);
        const daftarSkpm: any[] = [];

        $('.table_umum tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length >= 6) {
                daftarSkpm.push({
                    no: columns.eq(0).text().trim(),
                    namaLingkup: columns.eq(1).text().trim(),
                    namaKegiatan: columns.eq(2).text().trim(),
                    uraianKegiatan: columns.eq(3).text().trim(),
                    periode: periodeLabel,
                    bobot: columns.eq(4).text().trim() || '0',
                    status: columns.eq(5).text().trim() || 'Pending'
                });
            }
        });

        res.json({ success: true, data: daftarSkpm });
    } catch (error: any) {
        console.error('Gagal menarik data SKPM:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menarik data SKPM' });
    }
});

// --- RUTE 7: Ekstraksi Riwayat Perubahan Jadwal ---
app.get('/jadwal/history', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        // TODO: ganti dengan URL asli portal untuk riwayat jadwal
        const endpoint = `${PORTAL_BASE}/url_menu_jadwal_existing`;
        const html = await fetchPortalHtml(ciSession, endpoint, 15_000);
        const $ = cheerio.load(html);

        const jadwalHistory: any[] = [];

        // TODO: sesuaikan selector dengan HTML asli
        $('table.tabel-log-jadwal tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 7) {
                jadwalHistory.push({
                    id: i,
                    waktu: $(cols[0]).text().trim(),
                    prodi: $(cols[1]).text().trim(),
                    mk: $(cols[2]).text().trim(),
                    dosen: $(cols[3]).text().trim(),
                    jadwalAwal: $(cols[4]).find('.awal').text().trim() || $(cols[4]).text().trim(),
                    jadwalPengganti: $(cols[4]).find('.ganti').text().trim(),
                    alasan: $(cols[5]).text().trim(),
                    status: $(cols[6]).text().trim()
                });
            }
        });

        res.json({ success: true, data: jadwalHistory });
    } catch (error: any) {
        console.error('Gagal menarik riwayat jadwal:', error.message);
        res.status(500).json({ success: false, message: 'Gagal menarik data riwayat jadwal' });
    }
});

// app.listen selalu di paling bawah, cukup satu kali
app.listen(PORT, () => {
    console.log(`Academic Adapter berjalan pada port ${PORT}`);
});