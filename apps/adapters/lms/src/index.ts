import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET wajib diset di .env.development.');
}
const IDENTITY_SERVICE_URL = 'http://localhost:3001/identity/sessions';
const LMS_BASE_URL = 'https://lms.pknstan.ac.id'; 

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token tidak ditemukan.' });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (err: any) {
        return res.status(401).json({ error: `Token invalid: ${err.message}` });
    }
};

const getLmsSession = async (authHeader: string): Promise<string | null> => {
    try {
        const response = await axios.get(IDENTITY_SERVICE_URL, {
            headers: { Authorization: authHeader }
        });
        return response.data.lmsSession;
    } catch (error) {
        return null;
    }
};

const lmsHeaders = (sessionCookie: string) => ({
    'Cookie': sessionCookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
});

const absoluteUrl = (url: string | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return new URL(url, LMS_BASE_URL).toString();
};

const parseCourseId = (url: string | undefined) => {
    if (!url) return null;
    return new URL(url, LMS_BASE_URL).searchParams.get('id');
};

// --- Rute 1: Ekstraksi Daftar Mata Kuliah ---
app.get('/adapter/lms/courses', requireAuth, async (req: Request, res: Response) => {
    const lmsSession = await getLmsSession(req.headers.authorization as string);
    if (!lmsSession) return res.status(401).json({ success: false, message: 'Sesi LMS kedaluwarsa' });

    try {
        const response = await axios.get(`${LMS_BASE_URL}/my/courses.php`, { headers: lmsHeaders(lmsSession) });
        const $ = cheerio.load(response.data);
        const daftarMk: any[] = [];

        $('.coursebox, .course-listitem, [data-courseid], .rui-course-menu-list-item').each((index, element) => {
            const courseElement = $(element);
            const anchor = courseElement.is('a') ? courseElement : courseElement.find('a[href*="/course/view.php?id="]').first();
            const link = anchor.attr('href');
            const title = courseElement.find('.coursename a, .course-name a, .rui-course-menu-list-text, a[href*="/course/view.php?id="]').first().text().trim() || anchor.text().trim();
            const progressText = courseElement.find('.progress-text, .progress-bar').first().attr('aria-valuenow') || courseElement.find('.progress-text').text().trim();
            
            if (title && link) {
                daftarMk.push({ title, link: absoluteUrl(link), idMk: courseElement.attr('data-courseid') || parseCourseId(link), progress: progressText || null });
            }
        });

        const coursesById = new Map<string, any>();
        for (const course of daftarMk.filter(course => course.idMk)) {
            const existing = coursesById.get(course.idMk);
            coursesById.set(course.idMk, existing ? { ...course, ...existing } : course);
        }
        res.json({ success: true, data: Array.from(coursesById.values()) });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Gagal menarik mata kuliah' });
    }
});

// --- Rute 2: Detail kursus, pertemuan, materi, dan tugas ---
app.get('/adapter/lms/courses/:courseId', requireAuth, async (req: Request, res: Response) => {
    const lmsSession = await getLmsSession(req.headers.authorization as string);
    if (!lmsSession) return res.status(401).json({ success: false, message: 'Sesi LMS kedaluwarsa' });

    try {
        const courseId = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
        const response = await axios.get(`${LMS_BASE_URL}/course/view.php?id=${encodeURIComponent(courseId)}`, { headers: lmsHeaders(lmsSession) });
        const $ = cheerio.load(response.data);
        const baseSections: any[] = [];
        
        // Perekam URL global untuk mencegah duplikasi materi antar section
        const seenUrls = new Set<string>();

        $('ul.topics > li.section, ul.weeks > li.section, .course-section, li.section, li[data-sectionid], .rui-course-section').each((index, element) => {
            const section = $(element);
            const titleLink = section.find('.sectionname a, .section-title a, h3 a, h4 a').first();
            const title = section.find('.sectionname, .section-title, h3, h4').first().text().trim() || (index === 0 ? 'General' : `Pertemuan ${index}`);
            const link = absoluteUrl(titleLink.attr('href')) || `${LMS_BASE_URL}/course/view.php?id=${courseId}&section=${index}`;
            const items: any[] = [];

            // Batasi pencarian hanya di dalam blok section ini
            section.find('a[href*="/mod/"]').each((i, el) => {
                const anchor = $(el);
                const href = anchor.attr('href') || '';
                
                if (href.includes('&action=') || href.includes('modedit.php')) return;

                const rawTitle = anchor.find('.instancename').length ? anchor.find('.instancename').text() : anchor.text();
                const cleanTitle = rawTitle.replace(/\b(Assignment|File|Forum|Quiz|URL|Resource|Page)\b/gi, '').trim();
                const absHref = absoluteUrl(href) || '';
                
                if (cleanTitle && absHref && !seenUrls.has(absHref)) {
                    const type = href.includes('/mod/assign/') ? 'assignment' : 'resource';
                    items.push({ title: cleanTitle, link: absHref, type });
                    seenUrls.add(absHref); // Tandai URL sudah dimasukkan
                }
            });

            baseSections.push({ title, link, items });
        });

        // 3. Brute Force Menelusuri Section yang Kosong (Mengatasi 'One section per page')
        for (const section of baseSections) {
            if (section.items.length === 0 && section.link && section.link.includes('section=')) {
                try {
                    const sectionResponse = await axios.get(section.link, { headers: lmsHeaders(lmsSession) });
                    const sectionPage = cheerio.load(sectionResponse.data);
                    
                    // Batasi pencarian hanya pada area konten utama untuk menghindari sidebar
                    sectionPage('#region-main a[href*="/mod/"], .course-content a[href*="/mod/"]').each((i, el) => {
                        const anchor = sectionPage(el);
                        const href = anchor.attr('href') || '';
                        if (href.includes('&action=') || href.includes('modedit.php')) return;

                        const rawTitle = anchor.find('.instancename').length ? anchor.find('.instancename').text() : anchor.text();
                        const cleanTitle = rawTitle.replace(/\b(Assignment|File|Forum|Quiz|URL|Resource|Page)\b/gi, '').trim();
                        const absHref = absoluteUrl(href) || '';
                        
                        if (cleanTitle && absHref && !seenUrls.has(absHref)) {
                            const type = href.includes('/mod/assign/') ? 'assignment' : 'resource';
                            section.items.push({ title: cleanTitle, link: absHref, type });
                            seenUrls.add(absHref); // Tandai URL sudah dimasukkan
                        }
                    });
                } catch (err) {
                    console.warn(`Gagal fetch section mandiri: ${section.title}`);
                }
            }
        }

        const title = $('.page-header-headings h1, h1').first().text().trim();
        res.json({ success: true, data: { title, sections: baseSections.filter(s => s.title || s.items.length) } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Gagal menarik detail kursus' });
    }
});

// --- Rute 3: Endpoint Baru untuk Ekstraksi Detail Tugas (Assignment) ---
app.get('/adapter/lms/assign/:id', requireAuth, async (req: Request, res: Response) => {
    const lmsSession = await getLmsSession(req.headers.authorization as string);
    if (!lmsSession) return res.status(401).json({ success: false, message: 'Sesi LMS tidak ditemukan' });

    try {
        const assignId = req.params.id;
        const response = await axios.get(`${LMS_BASE_URL}/mod/assign/view.php?id=${assignId}`, { headers: lmsHeaders(lmsSession) });
        const $ = cheerio.load(response.data);

        const title = $('.rui-main-content-title').first().text().trim() || $('h2').first().text().trim();
        
        const datesText = $('.rui-activity-dates').text().replace(/\s+/g, ' ').trim();
        let opened = '-', due = '-';
        if (datesText.includes('Opened:')) {
            opened = datesText.split('Opened:')[1]?.split('Due:')[0]?.trim() || '-';
        }
        if (datesText.includes('Due:')) {
            due = datesText.split('Due:')[1]?.trim() || '-';
        }

        const statusTable: any[] = [];
        $('.generaltable tbody tr').each((i, el) => {
            const key = $(el).find('th').text().trim();
            const val = $(el).find('td').text().trim();
            if (key && val) statusTable.push({ label: key, value: val });
        });

        res.json({ success: true, data: { title, opened, due, statusTable } });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Gagal menarik detail tugas dari LMS' });
    }
});

app.listen(PORT, () => {
    console.log(`📚 LMS Adapter berjalan di http://localhost:${PORT}`);
});