import React, { useState, useEffect } from 'react';
import { Medal, FileUp, Eye, Send, RefreshCw, Search, CheckCircle2 } from 'lucide-react';
import { fetchSkpmDashboard, fetchDataSkpm, submitSkpm } from '../services/academicService';

const dedupeSkpm = (items: any[]) => Array.from(new Map(
    items.map(item => [
        `${item.namaLingkup || ''}|${item.namaKegiatan || ''}|${item.uraianKegiatan || ''}`.toLowerCase().trim(),
        item
    ])
).values());

export default function KarakterView() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'wajib' | 'input' | 'history'>('dashboard');
    
    // State Integrasi Data
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [fullHistory, setFullHistory] = useState<any[]>([]); // Menyimpan agregasi SELURUH tahun untuk grafik proporsi
    const [historyList, setHistoryList] = useState<any[]>([]); // Menyimpan data tabel (bisa difilter)
    
    const [isLoading, setIsLoading] = useState(true);
    const [isAggregating, setIsAggregating] = useState(false); // Status tarikan background seluruh periode
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State Filter & Form
    const [filterPeriode, setFilterPeriode] = useState('semua');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [formData, setFormData] = useState({ 
        jenis_kegiatan: '', 
        lingkup_kegiatan: 'Organisasi dan Kepemimpinan', 
        tingkat_partisipasi: 'Internal Kampus',
        jabatan: 'Peserta / Partisipan',
        uraian_kegiatan: '',
        tanggal_kegiatan: ''
    });
    const [fileBukti, setFileBukti] = useState<File | null>(null);

    // 1. Efek: Tarik Dashboard & Agregasi Semua History di Background
    useEffect(() => {
        let isMounted = true;
        
        async function fetchAllTimeData() {
            try {
                // Tarik data dashboard
                const dashRes = await fetchSkpmDashboard();
                if (dashRes && isMounted) setDashboardData(dashRes);

                setIsAggregating(true);
                
                // Tarik data periode saat ini (default)
                const currentRes = await fetchDataSkpm();
                let aggregated = [...(currentRes || [])];
                if (isMounted) setFullHistory(dedupeSkpm(aggregated));

                // Daftar periode dari dropdown
                const periodsToFetch = ['20251', '20242', '20241', '20232', '20231'];
                
                // Tarik data dari seluruh semester yang lalu satu per satu
                for (const p of periodsToFetch) {
                    try {
                        const hist = await fetchDataSkpm(p);
                        if (hist && hist.length > 0) {
                            aggregated = [...aggregated, ...hist];
                            if (isMounted) {
                                setFullHistory(dedupeSkpm(aggregated));
                            }
                        }
                    } catch (e) {
                        console.error(`Gagal menarik history periode ${p}`);
                    }
                }
            } catch (error) {
                console.error("Gagal agregasi data SKPM:", error);
            } finally {
                if (isMounted) setIsAggregating(false);
            }
        }
        
        fetchAllTimeData();
        return () => { isMounted = false; };
    }, []);

    // 2. Efek: Handle perubahan filter pada Tabel History
    useEffect(() => {
        async function loadTable() {
            setIsLoading(true);
            if (filterPeriode === 'semua') {
                setHistoryList(fullHistory);
                setIsLoading(false);
            } else {
                try {
                    const histRes = await fetchDataSkpm(filterPeriode);
                    setHistoryList(histRes || []);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            }
        }
        loadTable();
    }, [filterPeriode, fullHistory.length]);

    // Kalkulasi Data Grafik Batang
    const riwayatPeriode = dashboardData?.riwayatPeriode || [];
    const maxNilai = Math.max(...riwayatPeriode.map((r: any) => parseFloat(r.totalNilai) || 0), 1);
    
    // Kalkulasi Dinamis Proporsi Kategori Murni dari FULL HISTORY (Seluruh Tahun)
    const breakdownMap: Record<string, number> = {};
    fullHistory.forEach(item => {
        const lingkup = item.namaLingkup || 'Lainnya';
        const bobot = parseFloat(item.bobot) || 0;
        breakdownMap[lingkup] = (breakdownMap[lingkup] || 0) + bobot;
    });
    
    const totalHistoryBobot = Object.values(breakdownMap).reduce((a, b) => a + b, 0);
    const breakdownColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'];
    const breakdownData = Object.entries(breakdownMap)
        .filter(([_, points]) => points > 0)
        .map(([category, points], idx) => ({
            category,
            points,
            percentage: totalHistoryBobot > 0 ? Math.round((points / totalHistoryBobot) * 100) : 0,
            color: breakdownColors[idx % breakdownColors.length]
        }))
        .sort((a, b) => b.points - a.points);

    const filteredHistory = historyList.filter(item =>
        (item.namaKegiatan?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.namaLingkup?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (item.uraianKegiatan?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const handleSubmitSkpm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await submitSkpm({ ...formData, file_bukti: fileBukti || undefined });
            alert('Pengajuan Poin SKPM berhasil dikirim untuk divalidasi!');
            setFormData({
                jenis_kegiatan: '',
                lingkup_kegiatan: 'Organisasi dan Kepemimpinan',
                tingkat_partisipasi: 'Internal Kampus',
                jabatan: 'Peserta / Partisipan',
                uraian_kegiatan: '',
                tanggal_kegiatan: ''
            });
            setFileBukti(null);
            setActiveTab('history');
            const histRes = await fetchDataSkpm(filterPeriode !== 'semua' ? filterPeriode : undefined);
            if (histRes) setHistoryList(histRes);
        } catch (err: any) {
            alert(err.message || 'Gagal mengirim pengajuan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2540] transition-colors";

    return (
        <div>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Medal size={18} /> Manajemen Pembangunan Karakter (MPK) & SKPM
                </h2>
                {isAggregating && <span className="flex items-center gap-2 text-xs text-slate-500"><RefreshCw size={12} className="animate-spin" /> Menghitung data seluruh tahun...</span>}
            </div>

            <div className="flex gap-1 mb-6 border-b border-slate-200 pb-0 flex-wrap">
                {[
                    { id: 'dashboard', label: 'Dashboard SKPM' },
                    { id: 'wajib', label: 'Kegiatan Wajib' },
                    { id: 'input', label: 'Input SKPM' },
                    { id: 'history', label: 'History SKPM' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`relative px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${activeTab === tab.id ? 'text-[#0a2540] bg-[#0a2540]/5 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
                        {tab.label}
                        {activeTab === tab.id && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-[#0a2540] rounded-t"></span>}
                    </button>
                ))}
            </div>

            {/* TAB 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl p-6 text-white shadow-sm flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-90">Kegiatan</p>
                                <p className="text-sm opacity-90 mt-0.5">Total Kegiatan Keseluruhan</p>
                            </div>
                            <span className="text-4xl font-extrabold">{dashboardData?.totalKegiatan || '0'}</span>
                        </div>
                        <div className="bg-gradient-to-r from-emerald-400 to-teal-600 rounded-xl p-6 text-white shadow-sm flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider opacity-90">Nilai</p>
                                <p className="text-sm opacity-90 mt-0.5">Total Nilai / Poin SKPM</p>
                            </div>
                            <span className="text-4xl font-extrabold">{dashboardData?.totalNilai || '0'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start border-t border-slate-100 pt-6">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-4">Grafik Tren Perolehan Nilai SKPM per Semester</h4>
                            <div className="h-64 flex items-end gap-4 border-l-2 border-b-2 border-slate-300 p-4 relative">
                                {riwayatPeriode.map((bar: any, i: number) => {
                                    const heightPct = maxNilai > 0 ? (parseFloat(bar.totalNilai) / maxNilai) * 100 : 0;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                                            <span className="text-[10px] text-slate-500 mb-1 font-semibold">{bar.totalNilai}</span>
                                            <div className="w-full bg-cyan-200 group-hover:bg-cyan-400 rounded-t transition-all" style={{ height: `${heightPct}%` }}></div>
                                            <span className="text-xs text-slate-600 mt-2 font-mono whitespace-nowrap text-center overflow-hidden w-full text-ellipsis">{bar.periode}</span>
                                        </div>
                                    );
                                })}
                                {riwayatPeriode.length === 0 && !isAggregating && (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">Data grafik belum tersedia</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-4">Proporsi Poin Berdasarkan Lingkup Kegiatan</h4>
                            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200 min-h-[16rem]">
                                {breakdownData.map((item: any, index: number) => (
                                    <div key={index}>
                                        <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                                            <span>{item.category}</span>
                                            <span className="font-bold text-[#0a2540]">{item.points} Poin ({item.percentage}%)</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.percentage}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                                {breakdownData.length === 0 && (
                                    <div className="flex h-full items-center justify-center text-slate-400 text-xs mt-10">
                                        {isAggregating ? 'Menghitung proporsi dari seluruh periode...' : 'Belum ada data kegiatan.'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: KEGIATAN WAJIB */}
            {activeTab === 'wajib' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-700 font-semibold text-sm">
                        <span></span> Status Kegiatan Karakter Wajib Mahasiswa
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-slate-700">Progres Penyelesaian Kegiatan Wajib</span>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">2 dari 4 Selesai</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0a2540] rounded-full" style={{ width: '50%' }}></div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                                    <th className="text-left px-4 py-3 font-semibold">Nama Kegiatan Wajib</th>
                                    <th className="text-left px-4 py-3 font-semibold">Target Semester</th>
                                    <th className="text-left px-4 py-3 font-semibold">Syarat Kelulusan</th>
                                    <th className="text-left px-4 py-3 font-semibold">Status Penyelesaian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                <tr>
                                    <td className="px-4 py-4 font-medium text-slate-800">Latihan Dasar Kepemimpinan (LDK)</td>
                                    <td className="px-4 py-4 text-slate-500">Semester 1</td>
                                    <td className="px-4 py-4 text-slate-500">Wajib lulus LDK & Sertifikat</td>
                                    <td className="px-4 py-4"><span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">Sudah Selesai</span></td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-4 font-medium text-slate-800">Capacity Building & Character Building</td>
                                    <td className="px-4 py-4 text-slate-500">Semester 3</td>
                                    <td className="px-4 py-4 text-slate-500">Kehadiran 100% (3 Hari)</td>
                                    <td className="px-4 py-4"><span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-semibold">Sudah Selesai</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: INPUT SKPM */}
            {activeTab === 'input' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-2xl">
                    <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                        <FileUp size={16} /> Formulir Pengajuan / Input Poin SKPM Baru
                    </h3>
                    <form onSubmit={handleSubmitSkpm} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Jenis Kegiatan (Nama Kegiatan) *</label>
                            <input type="text" required value={formData.jenis_kegiatan} onChange={e => setFormData({...formData, jenis_kegiatan: e.target.value})} className={inputClass} placeholder="Contoh: Panitia Dies Natalis PKN STAN" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Lingkup Kegiatan (Kategori) *</label>
                            <select value={formData.lingkup_kegiatan} onChange={e => setFormData({...formData, lingkup_kegiatan: e.target.value})} className={inputClass}>
                                <option value="Organisasi dan Kepemimpinan">Organisasi dan Kepemimpinan</option>
                                <option value="Penalaran dan Keilmuan">Penalaran dan Keilmuan</option>
                                <option value="Minat, Bakat, dan Kegemaran">Minat, Bakat, dan Kegemaran</option>
                                <option value="Pengabdian kepada Masyarakat">Pengabdian kepada Masyarakat</option>
                                <option value="Kegiatan Lainnya">Kegiatan Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Tingkat Partisipasi (Tingkat) *</label>
                            <select value={formData.tingkat_partisipasi} onChange={e => setFormData({...formData, tingkat_partisipasi: e.target.value})} className={inputClass}>
                                <option>Internasional</option>
                                <option>Nasional</option>
                                <option>Provinsi / Regional</option>
                                <option>Kabupaten / Kota</option>
                                <option>Internal Kampus</option>
                                <option>Internal Jurusan / Program Studi</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Jabatan (Peran) *</label>
                            <select value={formData.jabatan} onChange={e => setFormData({...formData, jabatan: e.target.value})} className={inputClass}>
                                <option>Ketua / Koordinator Utama</option>
                                <option>Wakil Ketua</option>
                                <option>Sekretaris / Bendahara</option>
                                <option>Kepala Divisi / Koordinator Bidang</option>
                                <option>Anggota Divisi / Staf / Panitia Aktif</option>
                                <option>Peserta / Partisipan</option>
                                <option>Juara 1 (Gold)</option>
                                <option>Juara 2 (Silver)</option>
                                <option>Juara 3 (Bronze)</option>
                                <option>Finalis / Juara Harapan</option>
                                <option>Peserta Lomba</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Uraian Kegiatan (Deskripsi) *</label>
                            <textarea required value={formData.uraian_kegiatan} onChange={e => setFormData({...formData, uraian_kegiatan: e.target.value})} className={`${inputClass} min-h-24 resize-y`} placeholder="Contoh: Bertanggung jawab menyusun proposal dan mencari sponsor kegiatan" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Tanggal Kegiatan *</label>
                            <input type="date" required value={formData.tanggal_kegiatan} onChange={e => setFormData({...formData, tanggal_kegiatan: e.target.value})} className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Unggah Sertifikat / Bukti Pendukung (PDF) *</label>
                            <input type="file" accept="application/pdf" required onChange={e => setFileBukti(e.target.files ? e.target.files[0] : null)} className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-[#0a2540] hover:file:bg-slate-200 cursor-pointer" />
                        </div>
                        <button disabled={isSubmitting} type="submit" className="px-5 py-2.5 bg-[#0a2540] text-white rounded-lg text-sm font-medium hover:bg-[#173d6b] transition-colors cursor-pointer flex items-center gap-2 mt-2 disabled:opacity-50">
                            {isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} 
                            {isSubmitting ? 'Mengirim Data...' : 'Kirim Pengajuan Poin SKPM'}
                        </button>
                    </form>
                </div>
            )}

            {/* TAB 4: HISTORY SKPM */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-xs font-medium text-slate-600">Filter API:</span>
                            <select 
                                value={filterPeriode} 
                                onChange={(e) => setFilterPeriode(e.target.value)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0a2540]">
                                <option value="semua">Semua Periode / Tahun</option>
                                <option value="20251">Genap 2025</option>
                                <option value="20242">Ganjil 2024</option>
                                <option value="20241">Genap 2024</option>
                                <option value="20232">Ganjil 2023</option>
                                <option value="20231">Genap 2023</option>
                            </select>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari di tabel..." 
                                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0a2540]" 
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                                    <th className="text-left px-4 py-3 font-semibold">No.</th>
                                    <th className="text-left px-4 py-3 font-semibold">Periode</th>
                                    <th className="text-left px-4 py-3 font-semibold">Nama Lingkup</th>
                                    <th className="text-left px-4 py-3 font-semibold">Nama Kegiatan</th>
                                    <th className="text-left px-4 py-3 font-semibold">Uraian Kegiatan</th>
                                    <th className="text-left px-4 py-3 font-semibold">Bobot</th>
                                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                                    <th className="text-center px-4 py-3 font-semibold">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {isLoading ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">Menarik data dari server...</td></tr>
                                ) : filteredHistory.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">Tidak ada data kegiatan yang ditemukan.</td></tr>
                                ) : (
                                    filteredHistory.map((item, index) => (
                                        <tr key={item.id || index} className="hover:bg-slate-50">
                                            <td className="px-4 py-3.5 text-slate-500">{item.no || index + 1}</td>
                                            <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold">{item.periode}</td>
                                            <td className="px-4 py-3.5 text-slate-700 font-medium">{item.namaLingkup}</td>
                                            <td className="px-4 py-3.5 text-[#0a2540] font-semibold">{item.namaKegiatan}</td>
                                            <td className="px-4 py-3.5 text-slate-500">{item.uraianKegiatan}</td>
                                            <td className="px-4 py-3.5 font-bold text-slate-800">{item.bobot || '0'}</td>
                                            <td className="px-4 py-3.5">
                                                <span className={`px-3 py-1 rounded-full font-semibold ${item.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <button className="p-1.5 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors cursor-pointer" title="Lihat Detail Sertifikat">
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}