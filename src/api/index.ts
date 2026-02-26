import axios from 'axios';
import { z } from 'zod';
import { mockAxiosAdapter } from './mockBackend';

const apiErrorSchema = z.object({
	detail: z.string()
});

type ApiError = z.infer<typeof apiErrorSchema>;

export let ORIGIN = 'localhost:8000';

export let SECURED = false;
export const MOCK_API_ENABLED = true;

if (typeof window !== 'undefined') {
	SECURED = window.location.protocol === 'https:';

	if (import.meta.env.DEV) {
		// DEV MODE
		ORIGIN = `${window.location.hostname}:8000`;
	} else {
		// PRODUCTION MODE
		ORIGIN = '';
	}
}

const protocolHttp = SECURED ? 'https' : 'http';
const protocolWs = SECURED ? 'wss' : 'ws';
const currentHost = typeof window !== 'undefined' ? window.location.host : ORIGIN;
const resolvedHost = ORIGIN === '' ? currentHost : ORIGIN;

export const HTTP_BASE_URL =
	import.meta.env.VITE_HTTP_BASE_URL || `${protocolHttp}://${resolvedHost}`;
export const WS_BASE_URL =
	import.meta.env.VITE_WS_BASE_URL || `${protocolWs}://${resolvedHost}`;

export const api = axios.create({
	baseURL: `${HTTP_BASE_URL}/api`,
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
