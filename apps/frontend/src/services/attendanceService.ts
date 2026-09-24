import { apiClient, getAuthHeaders } from './apiClient';

const ATTENDANCE_API = 'http://localhost:3002/adapter/attendance';

export const fetchJadwalPresensi = async () => {
    try {
        const response = await apiClient.post(ATTENDANCE_API, {}, getAuthHeaders());
        return response.data.data || [];
    } catch (error) {
        console.error('Gagal menarik jadwal presensi:', error);
        return [];
    }
};

export const submitPresensiHadir = async (id: string, link: string) => {
    try {
        const response = await apiClient.post(`${ATTENDANCE_API}/submit`, { id, link }, getAuthHeaders());
        return response.data;
    } catch (error) {
        console.error('Gagal mengeksekusi presensi:', error);
        throw error;
    }
};

export const fetchRiwayatPresensi = async () => {
    try {
        const response = await apiClient.get(`${ATTENDANCE_API}/riwayat`, getAuthHeaders());
        return response.data.data || [];
    } catch (error) {
        console.error('Gagal memuat riwayat presensi:', error);
        throw error;
    }
};