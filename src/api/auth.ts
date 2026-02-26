import api from '@/api';

export function isAuthed(): boolean {
	const token = localStorage.getItem('bmaster.auth.token');
	return token != null;
}

export interface UserLocalInfo {
	type: string;
}

export interface AccountLocalInfo extends UserLocalInfo {
	type: 'account';
	id: number;
	name: string;
	permissions: string[];
}

export async function getLocalUser(): Promise<UserLocalInfo> {
	return (await api.get<UserLocalInfo>('auth/me')).data;
}

export interface Token {
	access_token: string;
	token_type: string;
}

export interface LoginRequest {
	username: string;
	password: string;
}

export async function login(req: LoginRequest): Promise<Token> {
	return (await api.post<Token>('auth/login', req)).data;
}
