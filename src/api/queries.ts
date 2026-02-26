import api from "@/api";
import { SoundQueryInfo } from "./icoms";

export interface PlaySoundRequest {
	icom_id: string;
	sound_name: string;
	priority: number;
	force: boolean;
}

export async function playSound(req: PlaySoundRequest): Promise<SoundQueryInfo> {
	return (await api.post<SoundQueryInfo>('queries/sound', req)).data;
}
