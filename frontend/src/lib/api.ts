import axios from 'axios';

export const API_BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('posh_token');
      if (token) {
        if (config.headers && typeof (config.headers as any).set === 'function') {
          (config.headers as any).set('Authorization', `Bearer ${token}`);
        } else if (config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Safe fallback if localStorage is blocked by browser policy
    }
  }
  return config;
});
