import axios from 'axios';
import { z } from 'zod';
import { mockAxiosAdapter } from './mockBackend';

const apiErrorSchema = z.object({
	detail: z.string()
});

const normalizePath = (path: string): string => {
	if (!path) {
		return '/';
	}
	return path.startsWith('/') ? path : `/${path}`;
};

export const buildApiAssetUrl = (path: string): string => {
	return normalizePath(path);
};

export const buildWsUrl = (path: string, search?: URLSearchParams): string => {
	const normalizedPath = normalizePath(path);
	const isSecure =
		typeof window !== 'undefined' && window.location.protocol === 'https:';
	const protocol = isSecure ? 'wss' : 'ws';
	const host =
		typeof window !== 'undefined' ? window.location.host : 'mock.local';
	const url = new URL(`${protocol}://${host}${normalizedPath}`);
	if (search) {
		url.search = search.toString();
	}
	return url.toString();
};

export const api = axios.create({
	baseURL: '/api',
	adapter: mockAxiosAdapter
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('bmaster.auth.token');
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		const res = error.response;
		if (res) {
			try {
				const error = apiErrorSchema.parse(res.data);
				if (error.detail === 'bmaster.auth.invalid_token') {
					localStorage.removeItem('bmaster.auth.token');
					window.location.href = '/';
				}
			} catch {}
		}
		return Promise.reject(error);
	}
);

export default api;
