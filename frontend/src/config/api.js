// Clean API_URL ensuring no trailing slashes
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
