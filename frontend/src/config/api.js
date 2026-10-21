// Centralized API and Socket server configuration
// Reads VITE_API_URL set in Vercel or falls back to localhost:5000 in local dev
export const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const API_BASE = `${BACKEND_URL}/api`;
