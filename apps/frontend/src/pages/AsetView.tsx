import React, { useState } from 'react';
import { Building2, Calendar, History, Send, CheckCircle2, Clock } from 'lucide-react';

export default function AsetView() {
    const [activeTab, setActiveTab] = useState('pinjam');

    const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2540] transition-colors";

    return (
        <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-5">
                <Building2 size={18} /> Peminjaman Aset & Ruangan
            </h2>

            {/* TAB NAVIGASI */}
            <div className="flex gap-1 mb-6 border-b border-slate-200 pb-0 flex-wrap">
                {[{id:'pinjam', label:'Form Peminjaman'}, {id:'riwayat', label:'Riwayat Peminjaman'}].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id ? 'text-[#0a2540] bg-[#0a2540]/5 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
                        {tab.label}
                        {activeTab === tab.id && <span className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-[#0a2540] rounded-t"></span>}
                    </button>
                ))}
            </div>

            {activeTab === 'pinjam' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* FORM PEMINJAMAN */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                            <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2"><Calendar size={16} /> Form Peminjaman Baru</h3>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Kategori Aset</label>
                            <select className={inputClass}>
                                <option>Ruang Kelas / Diskusi</option>
                                <option>Peralatan Elektronik (Proyektor, Mic)</option>
                            </select>
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Jadwal Pemakaian</label>
                            <input type="datetime-local" className={inputClass} />
                        </div>
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Kegiatan</label>
                            <input type="text" className={inputClass} placeholder="Tuliskan tujuan peminjaman..." />
                        </div>
                        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[#0a2540] text-white hover:bg-[#173d6b] cursor-pointer">
                            <Send size={13} /> Ajukan Peminjaman
                        </button>
                    </div>

                    {/* TIMELINE APPROVAL */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                            <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2"><Clock size={16} /> Approval Berjenjang & Status</h3>
                        </div>
                        <h4 className="text-sm font-medium text-slate-700 mb-4">Peminjaman Ruang Rapat Lt. 2</h4>
                        <div className="relative pl-8">
                            <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200"></div>
                            
                            <div className="relative mb-5">
                                <div className="absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full border-2 bg-emerald-500 border-emerald-500"></div>
                                <h4 className="text-sm font-medium text-slate-800">Pengajuan Dibuat</h4>
                                <p className="text-xs text-slate-400 mt-0.5">25 Ags 2026 oleh Aldy Hermansyah</p>
                            </div>
                            <div className="relative mb-5">
                                <div className="absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full border-2 bg-amber-400 border-amber-400"></div>
                                <h4 className="text-sm font-medium text-slate-800">Persetujuan Subbagian Umum/Aset</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Menunggu persetujuan Admin (SLA: 1x24 Jam)</p>
                            </div>
                            <div className="relative mb-5">
                                <div className="absolute -left-[1.4rem] top-1 w-4 h-4 rounded-full border-2 bg-white border-slate-300"></div>
                                <h4 className="text-sm font-medium text-slate-800">Konfirmasi & Notifikasi Peminjaman</h4>
                                <p className="text-xs text-slate-400 mt-0.5">Menunggu persetujuan sebelumnya</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'riwayat' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                        <h3 className="text-base font-semibold text-[#0a2540] flex items-center gap-2"><History size={16} /> Riwayat Peminjaman Aset</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Aset / Ruangan</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Kegiatan</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Jadwal</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 border-b border-slate-100 font-medium">Ruang Rapat Lt. 2 Gedung G</td>
                                    <td className="px-4 py-4 border-b border-slate-100">Rapat Koordinasi BEM</td>
                                    <td className="px-4 py-4 border-b border-slate-100">27 Ags 2026 • 10:00–12:00</td>
                                    <td className="px-4 py-4 border-b border-slate-100"><span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">Menunggu Persetujuan</span></td>
                                </tr>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 border-b border-slate-100 font-medium">Proyektor Portable #3</td>
                                    <td className="px-4 py-4 border-b border-slate-100">Presentasi Tugas Kelompok ASP</td>
                                    <td className="px-4 py-4 border-b border-slate-100">25 Ags 2026 • 13:00–15:00</td>
                                    <td className="px-4 py-4 border-b border-slate-100"><span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Disetujui</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}