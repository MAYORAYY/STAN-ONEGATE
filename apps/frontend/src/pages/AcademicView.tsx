import React, { useState, useEffect } from 'react';
import { 
    GraduationCap, BookOpen, Printer, FileText, Send, 
    CalendarOff, UserCircle, CheckCircle2, Clock, RefreshCw 
} from 'lucide-react';
import { fetchProfilMahasiswa, fetchTranskripNilai, fetchJadwalHistory } from '../services/academicService';

export default function AcademicView() {
    const [activeTab, setActiveTab] = useState('profil');
    
    // State Layanan Akademik Umum
    const [profil, setProfil] = useState<any>(null);
    const [nilaiList, setNilaiList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // State Khusus Tab Jadwal
    const [jadwalSubTab, setJadwalSubTab] = useState<'form' | 'tabel'>('form');
    const [jadwalHistory, setJadwalHistory] = useState<any[]>([]);
    const [isSyncingJadwal, setIsSyncingJadwal] = useState(false);

    // Tarik data profil dan nilai saat komponen pertama kali dimuat
    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const [profilData, nilaiData] = await Promise.all([
                fetchProfilMahasiswa(),
                fetchTranskripNilai()
            ]);
            setProfil(profilData);
            setNilaiList(nilaiData || []);
            setLoading(false);
        }
        loadData();
    }, []);

    // Tarik riwayat jadwal saat user membuka sub-tab tabel
    useEffect(() => {
        if (activeTab === 'jadwal' && jadwalSubTab === 'tabel' && jadwalHistory.length === 0) {
            handleSyncJadwal();
        }
    }, [activeTab, jadwalSubTab]);

    const handleSyncJadwal = async () => {
        setIsSyncingJadwal(true);
        try {
            const history = await fetchJadwalHistory();
            setJadwalHistory(history || []);
        } catch (error) {
            console.error("Gagal menarik data jadwal", error);
        } finally {
            setIsSyncingJadwal(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2540] transition-colors";

    return (
        <div>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <GraduationCap size={18} /> Layanan Akademik Terpadu
                </h2>
                {loading && <span className="flex items-center gap-2 text-xs text-slate-500"><RefreshCw size={12} className="animate-spin" /> Memuat data...</span>}
            </div>

            {/* TAB NAVIGASI UTAMA */}
            <div className="flex gap-1 mb-6 border-b border-slate-200 pb-0 flex-wrap">
                {[
                    { id: 'profil', label: 'Profil Akademik' }, 
                    { id: 'nilai', label: 'Nilai & Mata Kuliah' }, 
                    { id: 'surat', label: 'Pengajuan Surat' }, 
                    { id: 'jadwal', label: 'Pemindahan Jadwal Kuliah' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${activeTab === tab.id ? 'text-[#0a2540] bg-[#0a2540]/5 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
                        {tab.label}
                        {activeTab === tab.id && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-[#0a2540] rounded-t"></span>}
                    </button>
                ))}
            </div>

            {!loading && (
                <>
                    {/* TAB PROFIL */}
                    {activeTab === 'profil' && profil && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                                <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2"><UserCircle size={16} /> Profil & Data Mahasiswa</h3>
                            </div>
                            <div className="flex gap-8 items-start">
                                <div className="w-36 h-48 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                                    <UserCircle size={56} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 flex-1">
                                    <div><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nama Lengkap</p><p className="text-sm font-medium text-slate-800">{profil.nama || '-'}</p></div>
                                    <div><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Nomor Induk Mahasiswa (NIM)</p><p className="text-sm font-medium text-slate-800">{profil.nim || '-'}</p></div>
                                    <div><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Program Studi</p><p className="text-sm font-medium text-slate-800">{profil.prodi || '-'}</p></div>
                                    <div><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Status Mahasiswa</p><span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{profil.status || 'Aktif'}</span></div>
                                    <div><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">IPK Terakhir</p><p className="text-sm font-medium text-slate-800">{profil.ipk || '0.00'}</p></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB NILAI */}
                    {activeTab === 'nilai' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                                <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2"><BookOpen size={16} /> Rekapitulasi Nilai & Mata Kuliah Diikuti</h3>
                                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border bg-transparent text-slate-700 border-slate-200 hover:bg-slate-50 cursor-pointer"><Printer size={13} /> Cetak Transkrip</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">#</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Nama Mata Kuliah</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">SKS</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Nilai Akhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiList.length === 0 ? (
                                            <tr><td colSpan={4} className="text-center py-6 text-slate-400">Belum ada data nilai.</td></tr>
                                        ) : (
                                            nilaiList.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-4 border-b border-slate-100">{item.no}</td>
                                                    <td className="px-4 py-4 border-b border-slate-100">{item.namaMk}</td>
                                                    <td className="px-4 py-4 border-b border-slate-100">{item.sks}</td>
                                                    <td className="px-4 py-4 border-b border-slate-100"><strong>{item.nilaiAngka}</strong></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB SURAT */}
                    {activeTab === 'surat' && (
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-2xl">
                            <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2 mb-5 pb-4 border-b border-slate-100"><FileText size={16} /> Buat Pengajuan Surat Baru</h3>
                            <div className="mb-5"><label className="block text-sm font-medium text-slate-700 mb-2">Jenis Surat</label><select className={inputClass}><option>Surat Keterangan Mahasiswa Aktif</option></select></div>
                            <div className="mb-5"><label className="block text-sm font-medium text-slate-700 mb-2">Tujuan/Keperluan</label><textarea className={inputClass} rows={3} placeholder="Jelaskan keperluan..."></textarea></div>
                            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#0a2540] text-white hover:bg-[#173d6b] cursor-pointer"><Send size={13} /> Ajukan Surat</button>
                        </div>
                    )}

                    {/* TAB PEMINDAHAN JADWAL KULIAH */}
                    {activeTab === 'jadwal' && (
                        <div>
                            {/* Tombol Navigasi Sub-Tab */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex gap-2">
                                    <button onClick={() => setJadwalSubTab('form')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${jadwalSubTab === 'form' ? 'bg-[#0a2540] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        Form Pengajuan
                                    </button>
                                    <button onClick={() => setJadwalSubTab('tabel')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${jadwalSubTab === 'tabel' ? 'bg-[#0a2540] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        Monitoring & Log (Live)
                                    </button>
                                </div>
                                {jadwalSubTab === 'tabel' && (
                                    <button onClick={handleSyncJadwal} disabled={isSyncingJadwal} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 cursor-pointer shadow-sm">
                                        <RefreshCw size={14} className={isSyncingJadwal ? "animate-spin" : ""} />
                                        {isSyncingJadwal ? 'Menarik Data...' : 'Sync Data'}
                                    </button>
                                )}
                            </div>

                            {jadwalSubTab === 'form' ? (
                                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-2xl">
                                    <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                                        <CalendarOff size={16} /> Pengajuan Pindah Jadwal Kuliah
                                    </h3>
                                    <div className="mb-5">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Pilih Mata Kuliah</label>
                                        <select className={inputClass}>
                                            <option>Akuntansi Sektor Publik Lanjutan (ASP401)</option>
                                            <option>Audit Sektor Publik (AUD402)</option>
                                        </select>
                                    </div>
                                    <div className="mb-5">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Jadwal Semula</label>
                                        <input type="text" className={`${inputClass} bg-slate-50 text-slate-500`} value="Kamis, 27 Ags 2026 (08:00 - 10:30)" readOnly />
                                    </div>
                                    <div className="mb-5">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Usulan Jadwal Pengganti</label>
                                        <input type="datetime-local" className={inputClass} />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Alasan Pemindahan</label>
                                        <textarea className={inputClass} rows={3} placeholder="Misal: Dosen berhalangan hadir / bentrok kegiatan wajib kampus..."></textarea>
                                    </div>
                                    <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#0a2540] text-white hover:bg-[#173d6b] cursor-pointer shadow-sm">
                                        <Send size={14} /> Ajukan Pemindahan Jadwal
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-sm">
                                        <span className="text-slate-600 font-medium">Log Permohonan Pemindahan Jadwal Terintegrasi</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-[#0a2540] text-white text-xs">
                                                    <th className="text-left px-4 py-3 font-semibold">WAKTU AJUAN</th>
                                                    <th className="text-left px-4 py-3 font-semibold">MATA KULIAH</th>
                                                    <th className="text-left px-4 py-3 font-semibold">DOSEN</th>
                                                    <th className="text-left px-4 py-3 font-semibold">JADWAL AWAL → PENGGANTI</th>
                                                    <th className="text-left px-4 py-3 font-semibold">STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-xs">
                                                {isSyncingJadwal ? (
                                                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">Sinkronisasi data jadwal...</td></tr>
                                                ) : jadwalHistory.length === 0 ? (
                                                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">Belum ada riwayat perubahan jadwal.</td></tr>
                                                ) : (
                                                    jadwalHistory.map((item, index) => (
                                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-4 text-slate-500 font-mono">{item.waktu}</td>
                                                            <td className="px-4 py-4 font-semibold text-[#0a2540]">{item.mk}</td>
                                                            <td className="px-4 py-4 text-slate-600">{item.dosen}</td>
                                                            <td className="px-4 py-4 text-slate-700">
                                                                <span className="text-red-500 block">Awal: {item.jadwalAwal}</span>
                                                                <span className="text-emerald-600 font-semibold block mt-0.5">Ganti: {item.jadwalPengganti}</span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className={`px-2.5 py-1 rounded-full font-semibold inline-block ${
                                                                    item.status?.toLowerCase().includes('setuju') || item.status?.toLowerCase().includes('selesai') 
                                                                    ? 'bg-emerald-100 text-emerald-700' 
                                                                    : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                    {item.status}
                                                                </span>
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
                    )}
                </>
            )}
        </div>
    );
}