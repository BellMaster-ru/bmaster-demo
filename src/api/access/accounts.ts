import { api } from '@/api';

export type AccountInfo = {
	type: 'account';
	id: number;
	name: string;
	deleted: boolean;
	role_ids: number[];
};

export const getAccounts = async () =>
	(await api.get<AccountInfo[]>(`auth/accounts`)).data;

export type CreateAccountRequest = {
	name: string;
	password: string;
	role_ids: number[];
};

export const createAccount = async (req: CreateAccountRequest) =>
	(await api.post<AccountInfo>(`auth/accounts`, req)).data;

export type UpdateAccountRequest = {
	name?: string;
	password?: string;
	role_ids?: number[];
};

export const updateAccount = async (id: number, req: UpdateAccountRequest) =>
	(await api.patch<AccountInfo>(`auth/accounts/${id}`, req)).data;

export const deleteAccount = async (id: number) =>
	(await api.delete<AccountInfo>(`auth/accounts/${id}`)).data;
