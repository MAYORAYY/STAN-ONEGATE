import React, { useEffect, useState } from 'react';
import { 
    Fingerprint, CalendarDays, CalendarRange, RefreshCw, CheckCircle2, 
    XCircle, Filter, Clock, MapPin, BookOpen, 
    AlertCircle, Check, ClipboardList, CheckSquare
} from 'lucide-react';
import { fetchJadwalPresensi, submitPresensiHadir, fetchRiwayatPresensi } from '../services/attendanceService';

export default function AttendanceView() {
    const [activeTab, setActiveTab] = useState('hari-ini');
    const [jadwalList, setJadwalList] = useState<any[]>([]);
    const [riwayatList, setRiwayatList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRiwayat, setLoadingRiwayat] = useState(false);
    const [riwayatError, setRiwayatError] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedMatkul, setSelectedMatkul] = useState<string>('Semua');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchJadwalPresensi();
            setJadwalList(data);
        } catch (error) {
            console.error("Gagal menarik jadwal presensi", error);
        }
        setLoading(false);
    };

    const loadRiwayat = async () => {
        setLoadingRiwayat(true);
        setRiwayatError(false);
        try {
            setRiwayatList(await fetchRiwayatPresensi());
            setSelectedMatkul('Semua'); 
        } catch {
            setRiwayatList([]);
            setRiwayatError(true);
        }
        setLoadingRiwayat(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeTab === 'rekap-krs' && riwayatList.length === 0 && !loadingRiwayat) {
            loadRiwayat();
        }
    }, [activeTab]);

    const handleAbsen = async (id: string, link: string) => {
        if (!window.confirm('Kirim presensi hadir untuk kelas ini?')) return;
        setProcessingId(id);
        try {
            await submitPresensiHadir(id, link);
            await loadData(); 
            alert('Presensi berhasil dikirim!'); // Tambahkan umpan balik sukses
        } catch (error) {
            console.error("Gagal melakukan absen:", error);
            alert('Gagal mengirim presensi. Sesi portal mungkin habis atau di luar jam presensi.');
        } finally {
            setProcessingId(null);
        }
    };

    const isToday = (waktuStr: string) => {
        if (!waktuStr) return false;
        
        const now = new Date();
        const d = String(now.getDate());
        const dZero = d.padStart(2, '0');
        const y = now.getFullYear();
        
        const monthsID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const monthsEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const mID = monthsID[now.getMonth()];
        const mEN = monthsEN[now.getMonth()];
        
        const formats = [
            `${dZero} ${mID} ${y}`, `${d} ${mID} ${y}`,
            `${dZero} ${mEN} ${y}`, `${d} ${mEN} ${y}`
        ];

        return formats.some(format => waktuStr.includes(format)) || waktuStr.toLowerCase().includes("hari ini");
    };

    const getStatusJadwal = (item: any) => {
        // 1. Sudah Recorded
        const isAlreadyRecorded = item.statusHadir?.toLowerCase().includes('hadir') || item.statusHadir?.toLowerCase().includes('v');
        if (isAlreadyRecorded) {
            return {
                mode: 'recorded',
                badgeText: 'Kehadiran Terekam',
                badgeStyle: 'bg-emerald-100 text-emerald-700',
                buttonText: 'Recorded',
                iconStyle: 'bg-emerald-50 text-emerald-600',
                lineStyle: 'bg-emerald-400',
                buttonComponent: (
                    <div className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckSquare size={16} /> Recorded
                    </div>
                )
            };
        }

        // 2. Presensi Dibuka (Tersedia Tombol)
        if (item.presensiTersedia && item.payloadPresensi) {
            return {
                mode: 'active',
                badgeText: 'Presensi Dibuka',
                badgeStyle: 'bg-amber-100 text-amber-700',
                buttonText: 'Absen Sekarang',
                iconStyle: 'bg-amber-50 text-amber-600',
                lineStyle: 'bg-amber-400',
                buttonComponent: (
                    <button 
                        onClick={() => handleAbsen(item.payloadPresensi.id, item.payloadPresensi.link)} 
                        disabled={processingId === item.payloadPresensi.id} 
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0a2540] text-white hover:bg-[#173d6b] hover:-translate-y-0.5 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:hover:translate-y-0"
                    >
                        {processingId === item.payloadPresensi.id ? <RefreshCw size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                        {processingId === item.payloadPresensi.id ? 'Memproses...' : 'Absen Sekarang'}
                    </button>
                )
            };
        }

        // 3. Logika Menunggu vs Selesai
        let isPast = false; // Realtime > Jam Selesai
        let isWaiting = false; // Realtime < Jam Mulai
        
        try {
            const timeMatch = item.waktu.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
            if (timeMatch && isToday(item.waktu)) {
                const startHour = parseInt(timeMatch[1], 10);
                const startMin = parseInt(timeMatch[2], 10);
                const endHour = parseInt(timeMatch[3], 10);
                const endMin = parseInt(timeMatch[4], 10);
                
                const now = new Date();
                const currentHour = now.getHours();
                const currentMin = now.getMinutes();

                const currentMinutesTotal = (currentHour * 60) + currentMin;
                const startMinutesTotal = (startHour * 60) + startMin;
                const endMinutesTotal = (endHour * 60) + endMin;

                if (currentMinutesTotal > endMinutesTotal) {
                    isPast = true;
                } else if (currentMinutesTotal < startMinutesTotal) {
                    isWaiting = true;
                }
            } else if (item.waktu && !isToday(item.waktu)) {
                // Untuk hari lain di tab minggu ini
                const itemDateStr = item.waktu.split(' ').slice(0, 3).join(' ');
                const itemDateObj = new Date(itemDateStr);
                const todayObj = new Date();
                todayObj.setHours(0,0,0,0);
                
                if (itemDateObj < todayObj) {
                    isPast = true; 
                } else if (itemDateObj > todayObj) {
                    isWaiting = true;
                }
            }
        } catch (e) {
            console.error("Gagal parsing waktu", e);
        }

        if (isPast) {
            return {
                mode: 'past',
                badgeText: 'Sesi Selesai',
                badgeStyle: 'bg-slate-100 text-slate-500',
                iconStyle: 'bg-slate-50 text-slate-400',
                lineStyle: 'bg-slate-300',
                buttonComponent: (
                    <div className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        <Check size={16} /> Selesai
                    </div>
                )
            };
        }

        if (isWaiting) {
            return {
                mode: 'upcoming',
                badgeText: 'Menunggu Sesi',
                badgeStyle: 'bg-blue-50 text-blue-600',
                iconStyle: 'bg-blue-50 text-blue-500',
                lineStyle: 'bg-blue-300',
                buttonComponent: (
                    <button disabled className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed">
                        <Clock size={16} /> Belum Tersedia
                    </button>
                )
            };
        }

        // Jika bukan isPast dan bukan isWaiting (sedang berlangsung tapi presensi ditutup dari server)
        return {
            mode: 'ongoing_unavailable',
            badgeText: 'Sesi Berlangsung',
            badgeStyle: 'bg-purple-50 text-purple-600',
            iconStyle: 'bg-purple-50 text-purple-500',
            lineStyle: 'bg-purple-300',
            buttonComponent: (
                <button disabled className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed">
                    <XCircle size={16} /> Absen Ditutup
                </button>
            )
        };
    };

    const jadwalHariIni = jadwalList.filter(item => isToday(item.waktu));
    const jadwalMingguIni = jadwalList; 

    const uniqueMatkul = ['Semua', ...Array.from(new Set(riwayatList.map(item => item.mataKuliah)))];
    const filteredRiwayat = selectedMatkul === 'Semua' 
        ? riwayatList 
        : riwayatList.filter(item => item.mataKuliah === selectedMatkul);

    const renderJadwalCardList = (list: any[], tabId: string) => {
        if (loading) return (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 border-dashed">
                <RefreshCw className="animate-spin text-slate-300 mb-3" size={32} />
                <p className="text-slate-500 font-medium">Memuat jadwal presensi...</p>
            </div>
        );
        
        if (list.length === 0) return (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm text-center px-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    {tabId === 'hari-ini' ? <CalendarDays className="text-slate-300" size={32} /> : <CalendarRange className="text-slate-300" size={32} />}
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Tidak Ada Jadwal</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                    {tabId === 'hari-ini' 
                        ? 'Anda tidak memiliki jadwal perkuliahan atau presensi untuk hari ini.' 
                        : 'Belum ada jadwal perkuliahan yang dirilis untuk minggu ini.'}
                </p>
            </div>
        );

        return (
            <div className="grid grid-cols-1 gap-4">
                {list.map((item, idx) => {
                    const statusUI = getStatusJadwal(item);

                    return (
                        <div key={idx} className="group bg-white rounded-2xl border border-slate-200 p-5 md:p-6 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-6 justify-between md:items-center relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusUI.lineStyle}`}></div>
                            
                            <div className="flex gap-4 md:gap-5 items-start pl-2">
                                <div className={`p-3 rounded-xl shrink-0 mt-1 ${statusUI.iconStyle}`}>
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusUI.badgeStyle}`}>
                                            {statusUI.badgeText}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-base md:text-lg mb-1 leading-snug">{item.mataKuliah} <span className="text-slate-400 font-medium text-sm">({item.kelas})</span></h4>
                                    
                                    <div className="flex flex-wrap items-center gap-3 gap-y-2 text-xs font-medium text-slate-500 mt-2">
                                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100"><Clock size={14} className="text-slate-400"/> {item.waktu}</span>
                                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100"><MapPin size={14} className="text-slate-400"/> {item.ruang || 'Sesuai Jadwal'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pl-2 md:pl-0 w-full md:w-auto shrink-0">
                                {statusUI.buttonComponent}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto pb-10 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#0a2540] flex items-center gap-2">
                        <Fingerprint className="text-[#0a2540]" size={24} /> Absensi & Kehadiran
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola kehadiran dan pantau riwayat presensi perkuliahan Anda.</p>
                </div>
            </div>

            {/* 3 Tabs Modern */}
            <div className="flex flex-col sm:flex-row p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl w-full sm:w-fit mb-8 shadow-inner border border-slate-200/60 overflow-x-auto">
                {[
                    {id:'hari-ini', label:'Kegiatan Hari Ini', icon: CalendarDays}, 
                    {id:'minggu-ini', label:'Kegiatan Minggu Ini', icon: CalendarRange},
                    {id:'rekap-krs', label:'Rekap KRS', icon: ClipboardList}
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap ${
                                isActive 
                                ? 'bg-white text-[#0a2540] shadow-sm ring-1 ring-slate-200/50' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                        >
                            <Icon size={16} className={isActive ? "text-amber-500" : "text-slate-400"} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content: Hari Ini & Minggu Ini */}
            {(activeTab === 'hari-ini' || activeTab === 'minggu-ini') && (
                <div className="space-y-4">
                    {renderJadwalCardList(activeTab === 'hari-ini' ? jadwalHariIni : jadwalMingguIni, activeTab)}
                </div>
            )}

            {/* Tab Content: Rekap KRS (Riwayat) */}
            {activeTab === 'rekap-krs' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <ClipboardList size={18} className="text-[#0a2540]" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Detail Rekap KRS</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Riwayat kehadiran pada seluruh mata kuliah Anda.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {riwayatList.length > 0 && !loadingRiwayat && (
                                <div className="relative flex-1 sm:flex-none">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Filter size={14} className="text-slate-400" />
                                    </div>
                                    <select 
                                        value={selectedMatkul} 
                                        onChange={(e) => setSelectedMatkul(e.target.value)}
                                        className="w-full sm:w-auto appearance-none pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0a2540]/20 focus:border-[#0a2540] transition-colors cursor-pointer shadow-sm"
                                    >
                                        {uniqueMatkul.map((matkul, idx) => (
                                            <option key={idx} value={matkul}>{matkul.length > 35 ? matkul.substring(0, 35) + '...' : matkul}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            )}
                            <button 
                                onClick={loadRiwayat} 
                                disabled={loadingRiwayat} 
                                className="shrink-0 inline-flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#0a2540] disabled:opacity-50 transition-colors shadow-sm"
                                title="Sinkronisasi Data"
                            >
                                <RefreshCw size={16} className={loadingRiwayat ? 'animate-spin' : ''} /> 
                                <span className="hidden sm:inline">{loadingRiwayat ? 'Menyinkronkan...' : 'Sinkron'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-0">
                        {loadingRiwayat ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <RefreshCw className="animate-spin text-slate-300 mb-4" size={32} />
                                <p className="text-slate-500 font-medium">Menyinkronkan data KRS dari portal akademik...</p>
                            </div>
                        ) : riwayatError ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                    <AlertCircle className="text-red-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Gagal Memuat Data</h3>
                                <p className="text-slate-500 text-sm max-w-sm mb-6">Terjadi kendala saat menarik data KRS. Pastikan koneksi stabil dan sesi portal masih aktif.</p>
                                <button onClick={loadRiwayat} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm">
                                    Coba Lagi
                                </button>
                            </div>
                        ) : riwayatList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <ClipboardList className="text-slate-300" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-1">Belum Ada Rekap KRS</h3>
                                <p className="text-slate-500 text-sm">Data rekapitulasi kehadiran mata kuliah Anda masih kosong.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100">#</th>
                                            {selectedMatkul === 'Semua' && (
                                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100">Mata Kuliah</th>
                                            )}
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100">Pengajar</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100">Tanggal</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredRiwayat.map((item, idx) => {
                                            const isHadir = item.presensi.toUpperCase() === 'HDR' || item.presensi.toLowerCase().includes('hadir');
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
                                                        {item.no}
                                                    </td>
                                                    {selectedMatkul === 'Semua' && (
                                                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                                                            {item.mataKuliah}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                        {item.pengajar}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-500">
                                                        {item.tanggal}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                            isHadir 
                                                            ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' 
                                                            : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                                                        }`}>
                                                            {isHadir ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                            {isHadir ? 'Hadir' : item.presensi}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}