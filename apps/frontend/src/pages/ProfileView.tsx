import React, { useState, useEffect } from 'react';
import { User, Mail, BookOpen, Shield, Key, MapPin, BadgeCheck, Phone, BellRing } from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';

// --- FUNGSI UTILITAS UNTUK VAPID PUSH NOTIFICATION ---
const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export default function ProfileView() {
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubscribing, setIsSubscribing] = useState(false);
    
    // State untuk form edit nomor HP
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');

    // State untuk form edit Alamat
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressInput, setAddressInput] = useState('');

    useEffect(() => {
        // Simulasi fetch data dari API
        setTimeout(() => {
            setUserData({
                nama: "Aldy Hermansyah",
                nim: "4131230066",
                email: "aldy_4131230066@pknstan.ac.id",
                prodi: "D4 Akuntansi Sektor Publik",
                semester: "Semester 6",
                kelas: "6 Sisfo 3",
                status: "Mahasiswa Aktif",
                telepon: "", // Dikosongkan
                alamat: ""   // Dikosongkan
            });
            setIsLoading(false);
        }, 800);
    }, []);

    // --- FUNGSI SIMPAN NOMOR HP ---
    const handleSavePhone = async () => {
        if (!phoneInput.trim()) {
            setIsEditingPhone(false);
            return;
        }
        setUserData({ ...userData, telepon: phoneInput });
        setIsEditingPhone(false);
    };

    // --- FUNGSI SIMPAN ALAMAT ---
    const handleSaveAddress = async () => {
        if (!addressInput.trim()) {
            setIsEditingAddress(false);
            return;
        }
        setUserData({ ...userData, alamat: addressInput });
        setIsEditingAddress(false);
    };

    // --- FUNGSI AKTIVASI NOTIFIKASI ---
    const subscribeToNotifications = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert('Browser Anda tidak mendukung push notification.');
            return;
        }

        setIsSubscribing(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('Izin notifikasi ditolak. Anda harus mengizinkannya di pengaturan browser.');
                setIsSubscribing(false);
                return;
            }

            // Daftarkan service worker
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            
            // Public Key VAPID Anda
            const publicVapidKey = "BEnxnbi0PM_gKCQAXUayQoe9o-eSi35NgRhks0wLy8YI5pdQqBtQrkoa8KwuT81jpmy2N_d1YZOEwC4zqNSTuUo"; 

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // Kirim objek subscription ke backend Identity Service
            const token = localStorage.getItem('onegate_token') || localStorage.getItem('accessToken');
            const response = await fetch(`${API_BASE_URL}/identity/notifications/subscribe`, {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                alert('Berhasil mengaktifkan notifikasi absensi dan tugas!');
            } else {
                alert('Gagal menyimpan pengaturan notifikasi ke server.');
            }
        } catch (error) {
            console.error('Gagal mengaktifkan notifikasi:', error);
            alert('Terjadi kesalahan saat mengaktifkan notifikasi.');
        } finally {
            setIsSubscribing(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Memuat data profil...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto pb-10">
            <h2 className="text-xl font-bold text-[#0a2540] flex items-center gap-2 mb-6">
                <User size={22} /> Profil Mahasiswa
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Kolom Kiri: Kartu Identitas Utama */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-[#0a2540] rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md">
                            {userData.nama.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">{userData.nama}</h3>
                        <p className="text-sm font-mono text-slate-500 mt-1">{userData.nim}</p>
                        <span className="mt-3 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold flex items-center gap-1">
                            <BadgeCheck size={14} /> {userData.status}
                        </span>
                    </div>

                    {/* Pengaturan Cepat */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-semibold text-slate-800 text-sm">Pengaturan Akun</h4>
                        </div>
                        <div className="p-2 flex flex-col gap-1">
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#0a2540] rounded-lg transition-colors cursor-pointer">
                                <Key size={16} className="text-slate-400" /> Ganti Kata Sandi
                            </button>
                            
                            {/* TOMBOL AKTIVASI NOTIFIKASI */}
                            <button 
                                onClick={subscribeToNotifications}
                                disabled={isSubscribing}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <BellRing size={16} className={isSubscribing ? "text-slate-400 animate-pulse" : "text-blue-500"} /> 
                                {isSubscribing ? 'Mengaktifkan...' : 'Aktifkan Notifikasi Push'}
                            </button>
                            
                            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#0a2540] rounded-lg transition-colors cursor-pointer">
                                <Shield size={16} className="text-slate-400" /> Autentikasi Dua Faktor
                            </button>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Detail Informasi */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                            <BookOpen size={18} className="text-[#0a2540]" />
                            <h4 className="font-bold text-[#0a2540]">Informasi Akademik</h4>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                 <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">Kelas</p>
                                    <p className="text-sm font-semibold text-slate-800">{userData.kelas}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">Program Studi</p>
                                    <p className="text-sm font-semibold text-slate-800">{userData.prodi}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">Semester Berjalan</p>
                                    <p className="text-sm font-semibold text-slate-800">{userData.semester}</p>
                                </div>
                            
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                            <User size={18} className="text-[#0a2540]" />
                            <h4 className="font-bold text-[#0a2540]">Data Pribadi & Kontak</h4>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                                <div className="flex items-start gap-3">
                                    <Mail size={16} className="text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-slate-500 mb-1">Email Kampus</p>
                                        <p className="text-sm font-semibold text-slate-800">{userData.email}</p>
                                    </div>
                                </div>

                                {/* BLOK NOMOR TELEPON DINAMIS */}
                                <div className="flex items-start gap-3">
                                    <Phone size={16} className="text-slate-400 mt-0.5" />
                                    <div className="w-full">
                                        <p className="text-xs font-medium text-slate-500 mb-1">Nomor Telepon</p>
                                        {isEditingPhone ? (
                                            <div className="flex items-center gap-2 mt-1">
                                                <input
                                                    type="text"
                                                    value={phoneInput}
                                                    onChange={(e) => setPhoneInput(e.target.value)}
                                                    placeholder="Contoh: 081234..."
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#0a2540]"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSavePhone}
                                                    className="px-3 py-1.5 bg-[#0a2540] text-white text-xs font-medium rounded-md hover:bg-[#173d6b] transition-colors shrink-0"
                                                >
                                                    Simpan
                                                </button>
                                            </div>
                                        ) : userData.telepon ? (
                                            <div className="flex items-center justify-between group">
                                                <p className="text-sm font-semibold text-slate-800">{userData.telepon}</p>
                                                <button
                                                    onClick={() => { setPhoneInput(userData.telepon); setIsEditingPhone(true); }}
                                                    className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium bg-blue-50 px-2 py-0.5 rounded"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditingPhone(true)}
                                                className="text-xs text-blue-600 font-medium hover:text-blue-800 mt-0.5"
                                            >
                                                + Isi Nomor Telepon
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* BLOK ALAMAT TINGGAL DINAMIS */}
                                <div className="flex items-start gap-3 md:col-span-2">
                                    <MapPin size={16} className="text-slate-400 mt-0.5" />
                                    <div className="w-full">
                                        <p className="text-xs font-medium text-slate-500 mb-1">Alamat Tinggal</p>
                                        {isEditingAddress ? (
                                            <div className="flex items-start gap-2 mt-1">
                                                <textarea
                                                    value={addressInput}
                                                    onChange={(e) => setAddressInput(e.target.value)}
                                                    placeholder="Contoh: Gedung A Asrama, Jl. Bintaro Utama Raya..."
                                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[#0a2540] min-h-[60px] resize-y"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleSaveAddress}
                                                    className="px-3 py-1.5 bg-[#0a2540] text-white text-xs font-medium rounded-md hover:bg-[#173d6b] transition-colors shrink-0 mt-1"
                                                >
                                                    Simpan
                                                </button>
                                            </div>
                                        ) : userData.alamat ? (
                                            <div className="flex items-start justify-between group">
                                                <p className="text-sm font-semibold text-slate-800 pr-4">{userData.alamat}</p>
                                                <button
                                                    onClick={() => { setAddressInput(userData.alamat); setIsEditingAddress(true); }}
                                                    className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium bg-blue-50 px-2 py-0.5 rounded mt-0.5 shrink-0"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setIsEditingAddress(true)}
                                                className="text-xs text-blue-600 font-medium hover:text-blue-800 mt-0.5"
                                            >
                                                + Isi Alamat Tinggal
                                            </button>
                                        )}
                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}