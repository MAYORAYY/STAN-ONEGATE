import { API_BASE_URL, apiClient, getAuthHeaders } from './apiClient';

const API_GATEWAY = `${API_BASE_URL}/adapter/academic`;

export const fetchProfilMahasiswa = async () => {
    try {
        const response = await apiClient.get(`${API_GATEWAY}/profil`, getAuthHeaders());
        return response.data.data;
    } catch (error) {
        console.error('Gagal memuat profil:', error);
        return null;
    }
};

export const fetchTranskripNilai = async () => {
    try {
        const response = await apiClient.get(`${API_GATEWAY}/nilai`, getAuthHeaders());
        return response.data.data;
    } catch (error) {
        console.error('Gagal memuat nilai:', error);
        return null;
    }
};

export const fetchNilaiKarakter = async () => {
    try {
        const response = await apiClient.get(`${API_GATEWAY}/nilai/karakter`, getAuthHeaders());
        return response.data.data;
    } catch (error) {
        console.error('Gagal memuat nilai karakter:', error);
        return null;
    }
};


export const fetchSkpmDashboard = async () => {
    try {
        const response = await apiClient.get(`${API_GATEWAY}/skpm/dashboard`, getAuthHeaders());
        return response.data.data;
    } catch (error) {
        console.error('Gagal memuat dashboard SKPM:', error);
        return null;
    }
};

export const fetchDataSkpm = async (periode?: string) => {
    try {
        const url = periode ? `${API_GATEWAY}/skpm/data?periode=${periode}` : `${API_GATEWAY}/skpm/data`;
        const response = await apiClient.get(url, getAuthHeaders());
        return response.data.data;
    } catch (error) {
        console.error('Gagal memuat data SKPM:', error);
        return [];
    }
};

// Tambahan: Ekstraksi Riwayat Jadwal
export const fetchJadwalHistory = async () => {
    try {
        const response = await apiClient.get(`${API_GATEWAY}/jadwal/history`, getAuthHeaders());
        return response.data.data || [];
    } catch (error) {
        console.error('Gagal memuat riwayat jadwal:', error);
        return [];
    }
};

// Tambahan: Submit Pengajuan SKPM dengan Form Data
export const submitSkpm = async (data: {
    lingkup_kegiatan: string;
    jenis_kegiatan: string;
    tingkat_partisipasi: string;
    jabatan: string;
    uraian_kegiatan: string;
    tanggal_kegiatan: string;
    file_bukti?: File;
}) => {
    try {
        const formData = new FormData();
        formData.append('lingkup_kegiatan', data.lingkup_kegiatan);
        formData.append('jenis_kegiatan', data.jenis_kegiatan);
        formData.append('tingkat_partisipasi', data.tingkat_partisipasi);
        formData.append('jabatan', data.jabatan);
        formData.append('uraian_kegiatan', data.uraian_kegiatan);
        formData.append('tanggal_kegiatan', data.tanggal_kegiatan);

        if (data.file_bukti) {
            formData.append('file_bukti', data.file_bukti);
        }

        const authConfig = getAuthHeaders();
        const response = await apiClient.post(`${API_GATEWAY}/skpm/submit`, formData, {
            ...authConfig,
            headers: {
                ...authConfig.headers,
                'Content-Type': 'multipart/form-data'
            }
        });
        
        return response.data;
    } catch (error: any) {
        console.error('Gagal submit SKPM:', error);
        throw new Error(error.response?.data?.message || 'Terjadi kesalahan saat submit SKPM');
    }
};