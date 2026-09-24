import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, ChevronDown, Search, FileText } from 'lucide-react';
import { fetchDaftarMkLms, fetchDetailMkLms } from '../services/lmsService';
import { useNavigate } from 'react-router-dom';

export default function LmsView() {
    const navigate = useNavigate();
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [courseDetail, setCourseDetail] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            setError('');
            try {
                setCourses(await fetchDaftarMkLms());
            } catch (loadError) {
                console.error('Gagal menarik mata kuliah LMS:', loadError);
                setError('Mata kuliah LMS tidak dapat dimuat. Silakan login ulang atau coba lagi.');
            }
            setLoading(false);
        }
        loadData();
    }, []);

    const openCourse = async (course: any) => {
        setSelectedCourse(course);
        setCourseDetail(null);
        if (!course.idMk) return;
        
        setDetailLoading(true);
        try {
            setCourseDetail(await fetchDetailMkLms(course.idMk));
        } catch (detailError) {
            console.error('Gagal menarik detail kursus LMS:', detailError);
        } finally {
            setDetailLoading(false);
        }
    };

    // Fungsi untuk mencegah browser membuka tab baru jika item adalah Tugas (assignment)
    const handleItemClick = (e: React.MouseEvent, item: any) => {
        if (item.type === 'assignment') {
            e.preventDefault(); 
            try {
                const url = new URL(item.link);
                const assignId = url.searchParams.get('id');
                
                if (assignId) {
                    navigate(`/lms/assign/${assignId}`);
                }
            } catch (err) {
                console.error("URL Tugas tidak valid", err);
            }
        }
    };

    if (loading) return <div className="p-6 text-center text-slate-500">Memuat LMS...</div>;

    return (
        <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-5">
                <BookOpen size={18} /> Learning Management System (LMS)
            </h2>

            {selectedCourse ? (
                <div>
                    <button onClick={() => { setSelectedCourse(null); setCourseDetail(null); }} className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer">
                        Kembali ke Daftar MK
                    </button>
                    
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
                        <h3 className="text-xl font-bold text-[#0a2540] mb-1">{courseDetail?.title || selectedCourse.title}</h3>
                        <p className="text-sm text-slate-500 mb-6">{selectedCourse.dosen || 'Dosen Pengampu'}</p>
                        
                        {detailLoading && <p className="text-sm text-slate-500">Memuat materi kursus...</p>}
                        
                        {!detailLoading && courseDetail?.sections?.map((section: any) => (
                            <div key={section.title} className="border border-slate-200 rounded-xl mb-4 overflow-hidden">
                                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                                    <h4 className="font-semibold text-slate-800">{section.title}</h4>
                                </div>
                                <div className="p-5 space-y-2">
                                    {section.items.map((item: any) => (
                                        <a 
                                            key={item.link || item.title} 
                                            href={item.link} 
                                            target={item.type === 'resource' ? "_blank" : undefined}
                                            rel="noreferrer" 
                                            onClick={(e) => handleItemClick(e, item)}
                                            className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 cursor-pointer"
                                        >
                                            <FileText size={16} className="text-red-500" /> 
                                            {item.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                        
                        {!detailLoading && courseDetail && !courseDetail.sections?.length && (
                            <p className="text-sm text-slate-500">Belum ada materi yang tersedia untuk kursus ini.</p>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-end mb-5">
                        <p className="text-sm text-slate-500">Pilih mata kuliah untuk melihat daftar pertemuan, materi, dan pengumpulan tugas.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-4">
                        {courses.map((course, idx) => (
                            <div key={course.idMk || idx} onClick={() => openCourse(course)} className="bg-white border border-slate-200 rounded-xl p-5 cursor-pointer min-w-0 hover:-translate-y-1 hover:shadow-md hover:border-[#0a2540] transition-all duration-300">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-11 h-11 bg-slate-100 text-[#0a2540] rounded-lg flex items-center justify-center"><BookOpen size={20} /></div>
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-bold">Aktif</span>
                                </div>
                                <h3 className="font-semibold text-slate-800 text-sm mb-1 break-words">{course.title}</h3>
                                <p className="text-xs text-slate-400">{course.dosen ? `${course.dosen} • ` : ''}{course.code || 'LMS'}</p>
                                {(course.pct !== undefined || course.progress) && <>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${((course.pct ?? parseInt(course.progress, 10)) || 0)}%` }}></div>
                                    </div>
                                    <p className="text-xs text-right text-slate-400 mt-1">{course.pct ?? course.progress}{typeof course.progress === 'string' && course.pct === undefined ? '' : '%'} Selesai</p>
                                </>}
                            </div>
                        ))}
                        {!courses.length && <p className="text-sm text-slate-500">{error || 'Belum ada mata kuliah dari LMS.'}</p>}
                    </div>

                    {/* Perpustakaan Digital */}
                    <div className="mt-10 pt-8 border-t border-slate-200">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><BookOpen size={18} /> Perpustakaan Digital (Materi & Modul)</h3>
                            <div className="relative w-56">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Cari e-book atau modul..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-[#0a2540]" />
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">Materi digital tersedia di dalam detail masing-masing mata kuliah.</p>
                    </div>
                </>
            )}
        </div>
    );
}