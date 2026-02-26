import api from '@/api';

export interface AnnouncementsSettings {
	ring_sound?: string;
}


export const getAnnouncementsSettings = async () =>
	(await api.get<AnnouncementsSettings>('lite/announcements')).data;

export const patchAnnouncementsSettings = async (req: {
	ring_sound?: string;
}) => await api.patch('lite/announcements', req);
