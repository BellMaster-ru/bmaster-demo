import { api } from '@/api';

export type RoleInfo = {
	id: number;
	name: string;
	permissions: string[];
};

export const getRoles = async () =>
	(await api.get<RoleInfo[]>(`auth/roles`)).data;
