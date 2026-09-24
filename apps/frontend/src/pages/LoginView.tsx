import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, AlertCircle, Eye, EyeOff, Loader2, ArrowRight, Shield } from 'lucide-react';

export default function LoginView() {
    const [nim, setNim] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const response = await axios.post('http://localhost:3001/identity/login', { 
                nim: nim, 
                password: password 
            });

            if (response.data.accessToken && response.data.refreshToken) {
                localStorage.setItem('onegate_token', response.data.accessToken);
                localStorage.setItem('onegate_refresh_token', response.data.refreshToken);
                
                window.location.href = '/akademik'; 
            } else {
                setErrorMsg('Autentikasi berhasil, namun token sesi tidak ditemukan. Hubungi Administrator.');
            }
        } catch (error: any) {
            console.error('Gagal login:', error);
            setErrorMsg(error.response?.data?.error || 'Kredensial tidak valid. Periksa kembali NIM dan Kata Sandi Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 font-['Inter']">
            {/* Panel Kiri - Branding (Disembunyikan di layar kecil) */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0a2540] relative overflow-hidden flex-col justify-between p-12">
                {/* Elemen Dekoratif */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-400/30 to-transparent blur-3xl"></div>
                    <div className="absolute bottom-[10%] -left-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-400/20 to-transparent blur-3xl"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 text-white mb-8">
                        {/* LOGO VERSI DEKSTOP */}
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-1 shadow-lg border border-white/20 overflow-hidden">
                            <img src="/stan_onegate_logo.png" alt="Logo STAN OneGate" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-wide">STAN OneGate</h1>
                    </div>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                        Gerbang Utama <br/>
                        <span className="text-blue-300">Sistem Akademik Terpadu</span>
                    </h2>
                    <p className="text-slate-300 text-lg leading-relaxed">
                        Akses seluruh layanan administrasi, pembelajaran (LMS), dan presensi PKN STAN melalui satu sistem identitas tunggal yang aman.
                    </p>
                </div>

                <div className="relative z-10 text-slate-400 text-sm flex items-center gap-2">
                    <Shield size={16} /> Dilindungi oleh Enkripsi SSO Institusi
                </div>
            </div>

            {/* Panel Kanan - Form Login */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    {/* Header Form Mobile */}
                    <div className="lg:hidden flex flex-col items-center mb-8 text-center">
                        {/* LOGO VERSI MOBILE */}
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-md border border-slate-100 overflow-hidden">
                            <img src="/stan_onegate_logo.png" alt="Logo STAN OneGate" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">STAN OneGate</h2>
                        <p className="text-slate-500 text-sm mt-1">Masuk dengan kredensial SSO Anda</p>
                    </div>

                    <div className="hidden lg:block mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">Selamat Datang</h2>
                        <p className="text-slate-500 text-sm mt-1">Silakan masuk untuk melanjutkan ke dasbor.</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3 animate-in shake">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span className="leading-relaxed font-medium">{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 ml-1">Nomor Induk Mahasiswa (NIM)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <User size={18} className="text-slate-400" />
                                </div>
                                <input 
                                    type="text" 
                                    value={nim}
                                    onChange={(e) => setNim(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a2540]/20 focus:border-[#0a2540] transition-all"
                                    placeholder="Masukkan NIM Anda"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-slate-700">Kata Sandi</label>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock size={18} className="text-slate-400" />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0a2540]/20 focus:border-[#0a2540] transition-all"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={loading || !nim || !password}
                                className="w-full group relative flex items-center justify-center gap-2 bg-[#0a2540] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#173d6b] transition-all disabled:opacity-70 disabled:hover:bg-[#0a2540] disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Memverifikasi...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Masuk Sistem</span>
                                        <ArrowRight size={18} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-500">
                            Gunakan kredensial SSO portal mahasiswa Anda. Jika mengalami kendala, hubungi <a href="#" className="font-semibold text-[#0a2540] hover:underline">Helpdesk Pusintek</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}