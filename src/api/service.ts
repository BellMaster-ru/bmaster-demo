import api from "@/api";

export type IServiceInfo = {
	enabled: boolean
}

export async function getServiceInfo(): Promise<IServiceInfo> {
	return (await api.get<IServiceInfo>('auth/service')).data;
}
