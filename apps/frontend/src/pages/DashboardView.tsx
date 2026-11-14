import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, BarChart3, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchProfilMahasiswa, fetchSkpmDashboard } from '../services/academicService';
import { fetchJadwalPresensi } from '../services/attendanceService';
import { fetchPengumuman } from '../services/dashboardService';

// Target SKPM dan total semester belum ada sumbernya di portal; sesuaikan dengan ketentuan
const SKPM_TARGET = 200;
const TOTAL_SEMESTER = 8;

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const labelOf = (d: Date) => `${HARI_PANJANG[d.getDay()]}, ${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;

type CalEvent = { date: string; title: string; time?: string; place?: string };

export default function DashboardView() {
    const navigate = useNavigate();
    const today = useMemo(() => new Date(), []);
    const todayKey = keyOf(today);

    const [profil, setProfil] = useState<any>(null);
    const [skpm, setSkpm] = useState<any>(null);
    const [agenda, setAgenda] = useState<any[]>([]);
    const [pengumuman, setPengumuman] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [calView, setCalView] = useState<'minggu' | 'bulan'>('bulan');
    const [cursor, setCursor] = useState<Date>(today);
    const [selectedKey, setSelectedKey] = useState(todayKey);

    useEffect(() => {
        (async () => {
            setLoading(true);
            // allSettled: satu sumber gagal tidak menghalangi yang lain
            const [p, s, a, n] = await Promise.allSettled([
                fetchProfilMahasiswa(),
                fetchSkpmDashboard(),
                fetchJadwalPresensi(),
                fetchPengumuman()
            ]);
            if (p.status === 'fulfilled') setProfil(p.value);
            if (s.status === 'fulfilled') setSkpm(s.value);
            if (a.status === 'fulfilled') setAgenda(a.value || []);
            if (n.status === 'fulfilled') setPengumuman(n.value || []);
            setLoading(false);
        })();
    }, []);

    // ---------- Data turunan ----------
    const namaDepan = (() => {
        const w = (profil?.nama || '').trim().split(/\s+/)[0] || '';
        return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
    })();

    const ipk = Number(profil?.ipk) || 0;
    const ipkPct = Math.min(100, (ipk / 4) * 100);
    const skpmNilai = Number(skpm?.totalNilai) || 0;
    const skpmPct = Math.min(100, (skpmNilai / SKPM_TARGET) * 100);
    const semester = profil?.semester || '-';

    // Event kalender. Saat ini hanya jadwal hari ini (halaman kulnow).
    // Untuk minggu/bulan, gabungkan hasil endpoint jadwal lain ke array ini.
    const events: CalEvent[] = useMemo(
        () => agenda.map(a => ({ date: todayKey, title: a.mataKuliah, time: a.waktu, place: a.ruang })),
        [agenda, todayKey]
    );
    const eventsByDate = useMemo(() => {
        const m = new Map<string, CalEvent[]>();
        events.forEach(e => m.set(e.date, [...(m.get(e.date) || []), e]));
        return m;
    }, [events]);

    // ---------- Kalender ----------
    const cells: Date[] = (() => {
        if (calView === 'minggu') {
            const start = new Date(cursor);
            start.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // mulai Senin
            return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
        }
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const offset = (first.getDay() + 6) % 7;
        return Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i));
    })();

    const geser = (dir: 1 | -1) => {
        setCursor(c => calView === 'minggu'
            ? new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7 * dir)
            : new Date(c.getFullYear(), c.getMonth() + dir, 1));
    };

    const judulKalender = calView === 'bulan'
        ? `${BULAN[cursor.getMonth()]} ${cursor.getFullYear()}`
        : `${cells[0]!.getDate()} ${BULAN_PENDEK[cells[0]!.getMonth()]} – ${cells[6]!.getDate()} ${BULAN_PENDEK[cells[6]!.getMonth()]} ${cells[6]!.getFullYear()}`;

    const selectedEvents = eventsByDate.get(selectedKey) || [];
    const selectedDate = cells.find(c => keyOf(c) === selectedKey) ?? today;

    const badgeKategori = (k: string) =>
        /upk|mpk|karakter/i.test(k) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';

    return (
        <div>
            {/* HERO */}
            <div className="rounded-2xl p-8 text-white flex justify-between items-center mb-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #0a2540 0%, #173d6b 100%)' }}>
                <div>
                    <h1 className="text-2xl font-bold mb-3">Selamat Datang di STAN OneGate{namaDepan ? `, ${namaDepan}` : ''}!</h1>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                        Sistem ini mengintegrasikan seluruh akses layanan portal akademik, aset, absensi, hingga pengembangan karakter (MPK/UPK) dalam satu identitas terpadu.
                    </p>
                </div>
                <svg width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 hidden md:block">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 mb-8">
                {/* PENGUMUMAN */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <BellRing size={16} className="text-[#0a2540]" /> Pengumuman Terbaru
                    </h2>
                    {pengumuman.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">
                            {loading ? 'Memuat pengumuman...' : 'Belum ada pengumuman.'}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {pengumuman.map((p, i) => (
                                <div key={i} className="flex gap-3 items-start py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded-lg transition-colors">
                                    <span className={`text-[10px] font-bold w-16 text-center py-0.5 rounded-full mt-0.5 shrink-0 ${badgeKategori(p.kategori || '')}`}>{p.kategori}</span>
                                    <div>
                                        <p className="text-sm text-slate-700 leading-snug">{p.judul}</p>
                                        <p className="text-xs text-slate-400 mt-1">{p.waktu}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* EVALUASI & PROGRES STUDI */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <BarChart3 size={16} className="text-[#0a2540]" /> Evaluasi & Progres Studi
                    </h2>

                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>IPK Berjalan</span>
                            <span className="font-semibold text-slate-800">{ipk ? ipk.toFixed(2) : '-'} / 4.00</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0a2540] rounded-full" style={{ width: `${ipkPct}%` }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>SKPM (Kredit Karakter)</span>
                            <span className="font-semibold text-slate-800">{skpm ? skpmNilai : '-'} / {SKPM_TARGET}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${skpmPct}%` }}></div>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Semester</p>
                            <p className="text-sm font-bold text-slate-800">{semester} / {TOTAL_SEMESTER}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-emerald-600 mb-1">Status</p>
                            <p className="text-sm font-bold text-emerald-700">{profil?.status || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AGENDA (kiri) + KALENDER (kanan), masing-masing setengah lebar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AGENDA HARI INI */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                        <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2">
                            <CalendarDays size={16} className="text-slate-400" /> Agenda Hari Ini ({today.getDate()} {BULAN_PENDEK[today.getMonth()]} {today.getFullYear()})
                        </h3>
                        <button onClick={() => navigate('/presensi')} className="text-blue-500 text-xs font-medium border-none bg-transparent cursor-pointer">
                            Buka Absensi
                        </button>
                    </div>
                    {loading ? (
                        <p className="text-sm text-slate-400 py-6 text-center">Memuat agenda...</p>
                    ) : agenda.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">Tidak ada agenda hari ini.</p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {agenda.map((a, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <div className="bg-[#0a2540] text-white min-w-12 rounded-lg flex flex-col items-center justify-center py-2 text-center">
                                        <span className="text-[10px] font-semibold uppercase">{BULAN_PENDEK[today.getMonth()]}</span>
                                        <span className="text-lg font-bold leading-none mt-0.5">{today.getDate()}</span>
                                    </div>
                                    <div className="pt-0.5 min-w-0 flex-1">
                                        <h4 className="text-sm font-medium text-slate-800 mb-1">{a.mataKuliah}</h4>
                                        <p className="text-xs text-slate-500">{[a.waktu, a.ruang].filter(Boolean).join(' • ')}</p>
                                    </div>
                                    {a.presensiTersedia ? (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">Absen dibuka</span>
                                    ) : a.statusHadir ? (
                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 shrink-0">{a.statusHadir}</span>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* KALENDER */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <h3 className="text-base font-semibold text-[#0a2540]">{judulKalender}</h3>
                        <div className="flex items-center gap-2">
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                                {(['minggu', 'bulan'] as const).map(v => (
                                    <button key={v} onClick={() => setCalView(v)}
                                        className={`px-3 py-1.5 cursor-pointer ${calView === v ? 'bg-[#0a2540] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                                        {v === 'minggu' ? 'Minggu' : 'Bulan'}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => geser(-1)} className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer"><ChevronLeft size={14} /></button>
                            <button onClick={() => { setCursor(today); setSelectedKey(todayKey); }} className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs hover:bg-slate-50 cursor-pointer">Hari ini</button>
                            <button onClick={() => geser(1)} className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer"><ChevronRight size={14} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 text-center text-xs text-slate-400 mb-1">
                        {HARI.map(h => <div key={h} className="py-1">{h}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {cells.map(d => {
                            const k = keyOf(d);
                            const luarBulan = calView === 'bulan' && d.getMonth() !== cursor.getMonth();
                            const adaEvent = eventsByDate.has(k);
                            const isToday = k === todayKey;
                            const isSel = k === selectedKey;
                            return (
                                <button key={k} onClick={() => setSelectedKey(k)}
                                    className={`relative h-10 rounded-lg text-sm cursor-pointer transition-colors
                                        ${isSel ? 'bg-[#0a2540] text-white' : isToday ? 'bg-[#0a2540]/10 text-[#0a2540] font-semibold' : 'hover:bg-slate-50'}
                                        ${luarBulan && !isSel ? 'text-slate-300' : ''}`}>
                                    {d.getDate()}
                                    {adaEvent && <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-emerald-500'}`} />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-2">{labelOf(selectedDate)}</p>
                        {selectedEvents.length === 0 ? (
                            <p className="text-xs text-slate-400">Tidak ada jadwal.</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedEvents.map((e, i) => (
                                    <div key={i} className="text-sm">
                                        <p className="font-medium text-slate-800">{e.title}</p>
                                        <p className="text-xs text-slate-500">{[e.time, e.place].filter(Boolean).join(' • ')}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}