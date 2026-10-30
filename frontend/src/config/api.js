// Centralized API and Socket server configuration
const envUrl = import.meta.env.VITE_API_URL;
export const BACKEND_URL = (envUrl && envUrl.trim()) ? envUrl.replace(/\/+$/, '') : (import.meta.env.DEV ? 'http://localhost:5000' : 'https://codetrail-3nvr.onrender.com');
export const API_BASE = `${BACKEND_URL}/api`;
