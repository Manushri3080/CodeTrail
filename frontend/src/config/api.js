// Centralized API and Socket server configuration
// Uses VITE_API_URL if configured, otherwise defaults to live Render backend
export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://codetrail-3nvr.onrender.com').replace(/\/+$/, '');
export const API_BASE = `${BACKEND_URL}/api`;
