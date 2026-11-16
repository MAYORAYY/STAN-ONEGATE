import axios from 'axios';
import { API_BASE_URL } from './apiClient';

const LMS_API = `${API_BASE_URL}/adapter/lms`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('onegate_token') || '';
    return {
        headers: { 'Authorization': `Bearer ${token}` }
    };
};

export const fetchDaftarMkLms = async () => {
    const response = await axios.get(`${LMS_API}/courses`, getAuthHeaders());
    return response.data.data || [];
};

export const fetchDetailMkLms = async (courseId: string) => {
    const response = await axios.get(`${LMS_API}/courses/${encodeURIComponent(courseId)}`, getAuthHeaders());
    return response.data.data || null;
};

export const fetchDaftarTugasLms = async () => {
    const response = await axios.get(`${LMS_API}/assignments`, getAuthHeaders());
    return response.data.data || [];
};