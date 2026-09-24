import React, { useState } from 'react';
import { CircleHelp, BookOpen, Headphones, Send, ChevronDown, ChevronUp, CheckCircle2, Search } from 'lucide-react';

export default function HelpdeskView() {
    const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
    const [ticketCategory, setTicketCategory] = useState('Sistem Error / Bug App');
    const [ticketDesc, setTicketDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const faqs = [
        {
            q: 'Bagaimana cara reset password SSO?',
            a: 'Panduan lengkap untuk mengatur ulang kata sandi Kemenkeu ID dapat dilakukan melalui portal SSO resmi Kemenkeu menggunakan email aktif terdaftar.'
        },
        {
            q: 'Data absensi tidak sinkron',
            a: 'Langkah yang harus dilakukan jika data dari mesin absen tidak muncul adalah memastikan presensi dilakukan pada rentang waktu jadwal aktif, lalu gunakan tombol Sinkronisasi Manual di menu Presensi.'
        },
        {
            q: 'Bagaimana cara mengajukan perubahan jadwal kuliah?',
            a: 'Anda dapat mengakses menu Layanan Akademik -> tab Pemindahan Jadwal Kuliah, lalu isi formulir usulan jadwal pengganti sesuai ketentuan program studi.'
        },
        {
            q: 'Berapa batas minimum poin SKPM untuk kelulusan?',
            a: 'Batas minimum perolehan poin SKPM adalah 100 poin yang mencakup kegiatan wajib, organisasi, penalaran, serta minat dan bakat.'
        }
    ];

    const filteredFaqs = faqs.filter(f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleSubmitTicket = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketDesc.trim()) return;
        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            setSuccessMsg(true);
            setTicketDesc('');
            setTimeout(() => setSuccessMsg(false), 4000);
        }, 800);
    };

    const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#0a2540] transition-colors";

    return (
        <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-5">
                <CircleHelp size={18} /> FAQ & Layanan Pengaduan
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* KOTAK KIRI: KNOWLEDGE BASE (SELF-SERVICE) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100 font-semibold text-[#0a2540]">
                        <div className="flex items-center gap-2">
                            <BookOpen size={16} /> Knowledge Base (Self-Service)
                        </div>
                    </div>

                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari solusi atau panduan..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0a2540]" 
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        {filteredFaqs.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">Tidak ada panduan yang sesuai dengan pencarian.</p>
                        ) : (
                            filteredFaqs.map((faq, index) => {
                                const isOpen = expandedFaq === index;
                                return (
                                    <div key={index} className="border border-slate-200 rounded-xl overflow-hidden transition-all">
                                        <button 
                                            onClick={() => setExpandedFaq(isOpen ? null : index)}
                                            className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 text-left text-sm font-semibold text-slate-800 transition-colors cursor-pointer">
                                            <span>{faq.q}</span>
                                            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {isOpen && (
                                            <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* KOTAK KANAN: BUAT TIKET PENGADUAN */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100 font-semibold text-[#0a2540]">
                        <Headphones size={16} /> Buat Tiket Pengaduan
                    </div>

                    {successMsg && (
                        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                            <CheckCircle2 size={16} /> Tiket pengaduan berhasil dikirim! Tim IT Support akan merespons dalam 1x24 jam.
                        </div>
                    )}

                    <form onSubmit={handleSubmitTicket} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Kategori Kendala</label>
                            <select 
                                value={ticketCategory} 
                                onChange={(e) => setTicketCategory(e.target.value)}
                                className={inputClass}>
                                <option>Sistem Error / Bug App</option>
                                <option>Kendala Akses Akademik</option>
                                <option>Kendala Login / SSO</option>
                                <option>Ketidaksesuaian Nilai / KHS</option>
                                <option>Lainnya</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Deskripsi Masalah</label>
                            <textarea 
                                rows={4} 
                                value={ticketDesc}
                                onChange={(e) => setTicketDesc(e.target.value)}
                                className={inputClass} 
                                placeholder="Jelaskan kendala secara detail..." 
                                required>
                            </textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Lampiran Screenshot / Bukti (Opsional)</label>
                            <input type="file" className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-[#0a2540] hover:file:bg-slate-200 cursor-pointer" />
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-medium bg-[#0a2540] text-white hover:bg-[#173d6b] transition-colors cursor-pointer shadow-sm mt-2">
                            <Send size={15} /> {submitting ? 'Mengirim Tiket...' : 'Kirim Tiket ke IT Support'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}