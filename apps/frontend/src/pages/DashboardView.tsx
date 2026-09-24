import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, BarChart3, CalendarDays } from 'lucide-react';

export default function DashboardView() {
    const navigate = useNavigate();

    return (
        <div>
            <div className="rounded-2xl p-8 text-white flex justify-between items-center mb-8 shadow-lg" style={{ background: 'linear-gradient(135deg, #0a2540 0%, #173d6b 100%)' }}>
                <div>
                    <h1 className="text-2xl font-bold mb-3">Selamat Datang di STAN OneGate, Aldy!</h1>
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
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
                        <BellRing size={16} className="text-[#0a2540]" /> Pengumuman Terbaru
                    </h2>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-3 items-start py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded-lg transition-colors">
                            <span className="text-[10px] font-bold w-16 text-center py-0.5 rounded-full mt-0.5 bg-blue-100 text-blue-700">Akademik</span>
                            <div>
                                <p className="text-sm text-slate-700 leading-snug">Jadwal UAS Semester Genap 2025/2026 telah diterbitkan</p>
                                <p className="text-xs text-slate-400 mt-1">27 Ags 2026 • 08:00</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 px-1 rounded-lg transition-colors">
                            <span className="text-[10px] font-bold w-16 text-center py-0.5 rounded-full mt-0.5 bg-amber-100 text-amber-700">UPK</span>
                            <div>
                                <p className="text-sm text-slate-700 leading-snug">Wajib hadir Apel Besar Penutupan TA 2026 — Sabtu, 30 Ags 2026</p>
                                <p className="text-xs text-slate-400 mt-1">25 Ags 2026 • 14:30</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <BarChart3 size={16} className="text-[#0a2540]" /> Evaluasi & Progres Studi
                    </h2>
                    
                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>IPK Berjalan</span>
                            <span className="font-semibold text-slate-800">3.85 / 4.00</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0a2540] rounded-full" style={{ width: '96.25%' }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>SKPM (Kredit Karakter)</span>
                            <span className="font-semibold text-slate-800">125 / 200</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: '62.5%' }}></div>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-slate-400 mb-1">Semester</p>
                            <p className="text-sm font-bold text-slate-800">6 / 8</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-emerald-600 mb-1">Status</p>
                            <p className="text-sm font-bold text-emerald-700">Aktif</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2">
                        <CalendarDays size={16} className="text-slate-400" /> Agenda Hari Ini (27 Ags 2026)
                    </h3>
                    <button onClick={() => navigate('/presensi')} className="text-blue-500 text-xs font-medium border-none bg-transparent cursor-pointer">
                        Buka Absensi
                    </button>
                </div>
                <div className="flex flex-col gap-4">
                    <div className="flex gap-3 items-start">
                        <div className="bg-[#0a2540] text-white min-w-12 rounded-lg flex flex-col items-center justify-center py-2 text-center">
                            <span className="text-[10px] font-semibold uppercase">Ags</span>
                            <span className="text-lg font-bold leading-none mt-0.5">27</span>
                        </div>
                        <div className="pt-0.5">
                            <h4 className="text-sm font-medium text-slate-800 mb-1">Apel Pagi Pembangunan Karakter</h4>
                            <p className="text-xs text-slate-500">06:30 - 07:30 WIB • Lapangan Utama</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}