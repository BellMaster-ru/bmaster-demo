import api from '@/api';

export interface Lesson {
	enabled: boolean;
	start_at: string;
	start_sound?: string;
	end_at: string;
	end_sound?: string;
}

export interface LessonWeekdays {
	monday: boolean;
	tuesday: boolean;
	wednesday: boolean;
	thursday: boolean;
	friday: boolean;
	saturday: boolean;
	sunday: boolean;
}

export interface BellsSettings {
	lessons: Lesson[];
	enabled: boolean;
	weekdays: LessonWeekdays;
}

export const getBellsSettings = async () =>
	(await api.get<BellsSettings>('lite/bells')).data;

export const patchBellsSettings = async (req: {
	lessons?: Lesson[];
	enabled?: boolean;
	weekdays?: LessonWeekdays;
}) => await api.patch('lite/bells', req);

export const patchLesson = async (
	id: number,
	req: {
		enabled?: boolean;
	}
) => await api.patch(`lite/bells/lessons/${id}`, req);
