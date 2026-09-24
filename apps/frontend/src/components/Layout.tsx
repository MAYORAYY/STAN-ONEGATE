import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, GraduationCap, Fingerprint, BookOpen, 
    Building2, Medal, CircleHelp, Search, Bell, Menu, LogOut, ChevronDown, User
} from 'lucide-react';
import { logout } from '../services/apiClient';

export default function Layout({ children }: { children: React.ReactNode }) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const location = useLocation();

    // MENU PROFIL SUDAH DITAMBAHKAN DI SINI
    const menuItems = [
        { id: '/dashboard', label: 'Dashboard Utama', icon: <LayoutDashboard size={18} /> },
        { id: '/akademik', label: 'Layanan Akademik', icon: <GraduationCap size={18} /> },
        { id: '/presensi', label: 'Presensi & Kehadiran', icon: <Fingerprint size={18} /> },
        { id: '/lms', label: 'LMS Integration', icon: <BookOpen size={18} /> },
        { id: '/aset', label: 'Peminjaman Aset & Ruang', icon: <Building2 size={18} /> },
        { id: '/karakter', label: 'Karakter (MPK/UPK)', icon: <Medal size={18} /> },
        { id: '/profil', label: 'Profil Saya', icon: <User size={18} /> },
        { id: '/helpdesk', label: 'FAQ & Helpdesk', icon: <CircleHelp size={18} /> }
    ];

    return (
        <div className="flex h-full bg-slate-50 font-['Inter']">
            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
            )}
            {isProfileOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
            )}

            <aside className={`bg-[#0a2540] text-white flex flex-col fixed left-0 top-0 h-full z-50 shadow-xl transition-all duration-300 ease-in-out ${isMobileOpen ? 'w-56 translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:w-56`}>
                <div className="flex items-center justify-between px-3 py-4 border-b border-white/10 min-h-[70px]">
                    <div className="overflow-hidden transition-all duration-300">
                        <h2 className="text-base font-bold tracking-wide text-white whitespace-nowrap leading-tight">STAN OneGate</h2>
                        <p className="text-[10px] text-slate-400 whitespace-nowrap leading-tight mt-0.5">PKN STAN</p>
                    </div>
                </div>
                
                <nav className="flex flex-col gap-1 px-1.5 py-3 flex-1 overflow-y-auto overflow-x-hidden">
                    {menuItems.map(item => (
                        <Link 
                            key={item.id} 
                            to={item.id} 
                            className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 group relative ${location.pathname.startsWith(item.id) ? 'bg-[#173d6b] text-white border-l-4 border-white' : 'text-slate-400 hover:bg-[#173d6b] hover:text-white'}`}
                        >
                            <span className="shrink-0">{item.icon}</span>
                            <span className="truncate whitespace-nowrap">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            <div className="lg:ml-56 flex-1 flex flex-col min-h-full min-w-0 w-full overflow-x-hidden">
                <header className="bg-white h-[70px] flex justify-between items-center px-4 sm:px-6 shadow-sm sticky top-0 z-40">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600">
                            <Menu size={18} />
                        </button>
                        <div className="relative w-48 sm:w-72 hidden sm:block">
                            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Cari layanan, panduan, atau jadwal..." className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-[#0a2540] focus:bg-white transition-all" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">
                            <Bell size={20} />
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </div>
                        <div className="relative">
                            <div 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                            >
                                <div className="w-9 h-9 bg-[#173d6b] text-white rounded-full flex items-center justify-center font-semibold text-sm shrink-0">AH</div>
                                <div className="hidden sm:block">
                                    <h4 className="text-sm font-semibold text-slate-800 leading-tight">Aldy Hermansyah</h4>
                                    <p className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5">SSO Aktif</p>
                                </div>
                                <ChevronDown size={16} className="hidden sm:block text-slate-400" />
                            </div>

                            {isProfileOpen && (
                                <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-slate-100 z-50 py-1">
                                    {/* TAMBAHAN: Tombol cepat ke Profil */}
                                    <Link to="/profil" className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setIsProfileOpen(false)}>
                                        <User size={16} /> Profil Saya
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                                    >
                                        <LogOut size={16} /> Keluar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}