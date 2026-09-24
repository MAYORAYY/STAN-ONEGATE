import express, { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import multer from 'multer';
import * as cheerio from 'cheerio';
import cors from 'cors'; // 1. Impor cors ditambahkan

const app = express();
const PORT = process.env.PORT || 3003;

// 2. Middleware CORS wajib diletakkan sebelum rute
app.use(cors({
    origin: 'http://localhost:5173', // Mengizinkan akses dari frontend web Anda
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const upload = multer({ storage: multer.memoryStorage() });
app.use(express.json());

const getCiSession = async (req: Request): Promise<string | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    try {
        const response = await axios.get('http://localhost:3001/identity/sessions', {
            headers: { Authorization: authHeader }
        });
        return response.data.portalSession;
    } catch (error) {
        console.error('Gagal mengambil sesi portal:', error);
        return null;
    }
};

// 1. PORTAL_BASE HANYA SAMPAI /stud (JANGAN ADA /skpmvd DI SINI)
const PORTAL_BASE = 'https://portal.pknstan.ac.id/stud';

// 2. Tambahan Accept-Encoding agar axios tidak bingung membaca respons kampus
const portalHeaders = (ciSession: string, referer = PORTAL_BASE) => ({
    Cookie: ciSession,
    Referer: referer,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate' 
});

// --- RUTE 1: Penarik Data Dropdown (AJAX Proxy) ---
app.get('/skpm/options/:type', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ error: 'Sesi tidak ditemukan' });

    const { type } = req.params;
    const queryString = new URLSearchParams(req.query as any).toString();
    const endpoint = `${PORTAL_BASE}/skpmvd/ajax_${type}/?${queryString}`; // skpmvd disisipkan di sini

    try {
        const response = await axios.get(endpoint, { headers: portalHeaders(ciSession, endpoint) });
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
    const endpoint = `${PORTAL_BASE}/skpmvd/tambahskpm`; // skpmvd disisipkan di sini

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
            res.json({ success: true, message: 'SKPM berhasil diajukan!' });
        } else {
            res.status(400).json({ success: false, message: 'Gagal diproses portal.' });
        }
    } catch (error: any) {
        if (error.response?.status === 302) {
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
        const endpoint = `${PORTAL_BASE}/profil`; // Sudah benar: /stud/profil
        const response = await axios.get(endpoint, { headers: portalHeaders(ciSession, endpoint) });
        const $ = cheerio.load(response.data);

        const nama = $('h5.card-title').text().trim();
        const nim = $('h6.card-subtitle').text().trim();
        const listItems = $('ul.list-group li.list-group-item');
        const jenisKelamin = $(listItems[0]).text().trim();
        const asalKota = $(listItems[1]).text().trim();
        const tanggalLahir = $(listItems[2]).text().trim();
        const email = $(listItems[3]).find('small').text().trim();
        const prodi = $('.widget-heading').first().text().trim();
        const kelas = $('.widget-subheading').first().text().trim();
        const infoAkademikText = $('.col-lg-6.col-xl-4').eq(1).find('.widget-heading').text().trim();
        const jumlahMatkul = infoAkademikText.split(':')[1]?.trim() || '0';
        const ipkText = $('.col-lg-6.col-xl-4').eq(1).find('.widget-subheading').text().trim();
        const ipk = ipkText.split(':')[1]?.trim() || '0.0';
        const status = $('.col-lg-6.col-xl-4').eq(2).find('.widget-numbers span').text().trim();

        res.json({ success: true, data: { nama, nim, jenisKelamin, asalKota, tanggalLahir, email, prodi, kelas, jumlahMatkul, ipk, status } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Gagal menarik profil' });
    }
});

// --- RUTE 4: Ekstraksi Transkrip Nilai ---
app.get('/nilai', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        const endpoint = `${PORTAL_BASE}/nilai`; // Sudah benar: /stud/nilai
        const response = await axios.get(endpoint, { headers: portalHeaders(ciSession, endpoint) });
        const $ = cheerio.load(response.data);
        const daftarNilai: any[] = [];

        $('.table-responsive table.table tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length > 0) {
                const namaMk = $(columns[0]).text().trim();
                const kelompok = $(columns[1]).text().trim();
                const sks = $(columns[2]).text().trim();
                const nilaiAngka = $(columns[3]).text().trim();

                daftarNilai.push({
                    no: index + 1, namaMk, kelompok, sks,
                    nilaiAngka: nilaiAngka || '-',
                    status: Number(nilaiAngka) >= 60 ? 'Lulus' : 'Dalam Proses'
                });
            }
        });

        res.json({ success: true, data: daftarNilai });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Gagal menarik nilai' });
    }
});

// --- RUTE 5: Ekstraksi Dashboard & Total Poin SKPM ---
app.get('/skpm/dashboard', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        const endpoint = `${PORTAL_BASE}/skpmvd/dashboard`; // skpmvd disisipkan di sini
        const response = await axios.get(endpoint, { headers: portalHeaders(ciSession, endpoint) });
        const $ = cheerio.load(response.data);

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
        res.status(500).json({ success: false, message: 'Gagal menarik dasbor SKPM' });
    }
});

// --- RUTE 6: Ekstraksi Tabel Riwayat Data SKPM ---
app.get('/skpm/data', async (req: Request, res: Response) => {
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    const periode = req.query.periode ? `?periode=${req.query.periode}` : '';
    const endpoint = periode ? `${PORTAL_BASE}/skpmvd/kelolaskprev` : `${PORTAL_BASE}/skpmvd/kelolaskpm`; // skpmvd disisipkan di sini

    try {
        const response = await axios.get(endpoint, { headers: portalHeaders(ciSession, endpoint) });
        const $ = cheerio.load(response.data);
        const daftarSkpm: any[] = [];

        $('.table_umum tbody tr').each((index, element) => {
            const columns = $(element).find('td');
            if (columns.length >= 6) {
                const no = $(columns[0]).text().trim();
                const namaLingkup = $(columns[1]).text().trim();
                const namaKegiatan = $(columns[2]).text().trim();
                const uraianKegiatan = $(columns[3]).text().trim();
                const bobot = $(columns[4]).text().trim();
                const status = $(columns[5]).text().trim();

                daftarSkpm.push({
                    no, namaLingkup, namaKegiatan, uraianKegiatan,
                    periode: req.query.periode || 'terbaru',
                    bobot: bobot || '0', status: status || 'Pending'
                });
            }
        });

        res.json({ success: true, data: daftarSkpm });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Gagal menarik data SKPM' });
    }
});

// --- RUTE 7: Ekstraksi Riwayat Perubahan Jadwal ---
app.get('/jadwal/history', async (req: Request, res: Response) => {
    // 1. Gunakan helper getCiSession yang sudah standar di file Anda
    const ciSession = await getCiSession(req);
    if (!ciSession) return res.status(401).json({ success: false, message: 'Sesi tidak ditemukan' });

    try {
        // 2. Sesuaikan endpoint dengan URL asli portal untuk riwayat jadwal
        const endpoint = `${PORTAL_BASE}/url_menu_jadwal_existing`; 
        
        // 3. Gunakan portalHeaders agar Accept-Encoding dll tetap ikut
        const response = await axios.get(endpoint, { headers: portalHeaders(ciSession, endpoint) });
        const $ = cheerio.load(response.data);

        const jadwalHistory: any[] = [];
        
        // Parsing tabel log perubahan jadwal (Sesuaikan selector dengan HTML asli)
        $('table.tabel-log-jadwal tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 7) {
                jadwalHistory.push({
                    id: i,
                    waktu: $(cols[0]).text().trim(),
                    prodi: $(cols[1]).text().trim(),
                    mk: $(cols[2]).text().trim(),
                    dosen: $(cols[3]).text().trim(),
                    jadwalAwal: $(cols[4]).find('.awal').text().trim() || $(cols[4]).text().trim(), // Fallback jika tidak ada class .awal
                    jadwalPengganti: $(cols[4]).find('.ganti').text().trim(),
                    alasan: $(cols[5]).text().trim(),
                    status: $(cols[6]).text().trim()
                });
            }
        });

        res.json({ success: true, data: jadwalHistory });
    } catch (error: any) {
        console.error('Gagal menarik riwayat jadwal:', error.message);
        res.status(500).json({ success: false, message: 'Gagals menarik data riwayat jadwal' });
    }
});

// Pastikan app.listen selalu berada di paling bawah file
app.listen(PORT, () => {
    console.log(`🎓 Academic Adapter berjalan di http://localhost:${PORT}`);
});

app.listen(PORT, () => {
    console.log(`🎓 Academic Adapter berjalan di http://localhost:${PORT}`);
});

// Di dalam adapter-academic/src/index.ts yang sudah ada

