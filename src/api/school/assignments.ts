import { formatDate } from '@/utils';
import api from '@/api';

export type ScheduleWeekdays = {
	monday?: number | null;
	tuesday?: number | null;
	wednesday?: number | null;
	thursday?: number | null;
	friday?: number | null;
	saturday?: number | null;
	sunday?: number | null;
};

export type ScheduleAssignmentInfo = {
	id: number;
	start_date: string;
} & ScheduleWeekdays;

export type ScheduleAssignmentCreateRequest = {
	start_date: string;
} & ScheduleWeekdays;

export type ScheduleAssignmentUpdateRequest = {
	start_date?: string;
} & ScheduleWeekdays;

export const getAssignmentsByDateRange = async (
	start: Date | string,
	end: Date | string
) => {
	start = typeof start === 'string' ? start : formatDate(start);
	end = typeof end === 'string' ? end : formatDate(end);
	return (
		await api.get<ScheduleAssignmentInfo[]>(
			`school/assignments/query?start_date=${encodeURIComponent(
				start
			)}&end_date=${encodeURIComponent(end)}`
		)
	).data;
};

export const createAssignment = async (req: ScheduleAssignmentCreateRequest) =>
	(await api.post('school/assignments', req)).data;

export const updateAssignment = async (
	id: number,
	req: ScheduleAssignmentUpdateRequest
) => (await api.patch(`school/assignments/${id}`, req)).data;

export const deleteAssignment = async (id: number) =>
	(await api.delete(`school/assignments/${id}`)).data;

export const getActiveAssignment = async (at: string | undefined) =>
	(
		await api.get<ScheduleAssignmentInfo | null>(
			'school/assignments/active' + (at ? '?at=' + at : '')
		)
	).data;
