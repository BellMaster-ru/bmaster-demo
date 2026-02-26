import api from "@/api";


export interface SoundSpecs {
	duration: number;
}

export interface SoundInfo {
	name: string;
	size: number;
	sound_specs?: SoundSpecs;
}

export async function getSoundInfo(): Promise<SoundInfo[]> {
	return (await api.get<SoundInfo[]>('sounds/info')).data;
}

export const uploadSound = async (file: File) => {
	const form = new FormData();
	form.append('file', file);
	await api.post('sounds/file', form);
}

export const deleteSound = async (sound_name: string) => 
	await api.delete(`sounds/file/${sound_name}`);

