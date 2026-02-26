import { formatDate } from '@/utils';
import api from '@/api';

export type ScheduleOverrideInfo = {
	id: number;
	at: string;
	mute_all_lessons: boolean;
	mute_lessons: number[];
};

export type ScheduleOverrideCreateRequest = {
	at: string;
	mute_all_lessons: boolean;
	mute_lessons: number[];
};

export const getOverridesByDateRange = async (
	start: Date | string,
	end: Date | string
) => {
	start = typeof start === 'string' ? start : formatDate(start);
	end = typeof end === 'string' ? end : formatDate(end);
	return (
		await api.get<ScheduleOverrideInfo[]>(
			`school/overrides/query?start_date=${encodeURIComponent(
				start
			)}&end_date=${encodeURIComponent(end)}`
		)
	).data;
};

export const createOverride = async (
	req: ScheduleOverrideCreateRequest,
	endDate?: string
) =>
	(
		await api.post(
			'school/overrides' +
				(endDate ? '?end_date=' + encodeURIComponent(endDate) : ''),
			req
		)
	).data;
