import axios from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const IDENTITY_URL = `${API_BASE_URL}/identity`;

export const apiClient = axios.create();

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('onegate_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('onegate_token');
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${IDENTITY_URL}/refresh`, { refreshToken });
        const newAccessToken = refreshResponse.data.accessToken;

        localStorage.setItem('onegate_token', newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('onegate_token');
        localStorage.removeItem('onegate_refresh_token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const getAuthHeaders = () => {
    const token = localStorage.getItem('onegate_token') || '';
    return {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
};

export const logout = async () => {
    const refreshToken = localStorage.getItem('onegate_refresh_token');

    try {
        if (refreshToken) {
            await axios.post(`${IDENTITY_URL}/logout`, { refreshToken });
        }
    } catch (error) {
        console.error('Gagal mencabut sesi di server:', error);
    } finally {
        localStorage.removeItem('onegate_token');
        localStorage.removeItem('onegate_refresh_token');
        window.location.href = '/login';
    }
};