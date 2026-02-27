import { isAxiosError } from 'axios';
import api, { buildApiAssetUrl } from '@/api';
import { formatDate } from '@/utils';

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

export type IServiceInfo = {
	enabled: boolean;
};

export async function getServiceInfo(): Promise<IServiceInfo> {
	return (await api.get<IServiceInfo>('auth/service')).data;
}

export enum QueryStatus {
	Waiting = 'waiting',
	Playing = 'playing',
	Finished = 'finished',
	Cancelled = 'cancelled'
}

export interface QueryAuthor {
	type: string;
	name: string;
	label: string;
}

export interface QueryInfo {
	id: string;
	type: string;
	icom: string;
	priority: number;
	force: boolean;
	duration?: number;
	status: QueryStatus;
	author?: QueryAuthor;
}

export interface SoundQueryInfo extends QueryInfo {
	sound_name: string;
}

export interface IcomInfo {
	id: string;
	name: string;
	playing?: QueryInfo;
	queue: QueryInfo[];
	paused: boolean;
}

export type IcomInfoMap = { [key: string]: IcomInfo };

export async function getIcoms(): Promise<IcomInfoMap> {
	return (await api.get<IcomInfoMap>('icoms')).data;
}

export async function getIcom(id: string): Promise<IcomInfo | undefined> {
	try {
		return (await api.get<IcomInfo>(`icoms/${id}`)).data;
	} catch (err) {
		if (isAxiosError(err) && err.response?.status === 404) {
			return undefined;
		}
		throw err;
	}
}

export async function getQuery(id: string): Promise<QueryInfo | undefined> {
	try {
		return (await api.get<QueryInfo>(`queries/${id}`)).data;
	} catch (err) {
		if (isAxiosError(err) && err.response?.status === 404) {
			return undefined;
		}
		throw err;
	}
}

export async function cancelQuery(id: string): Promise<QueryInfo> {
	return (await api.delete<QueryInfo>(`queries/${id}`)).data;
}

export interface PlaySoundRequest {
	icom_id: string;
	sound_name: string;
	priority: number;
	force: boolean;
}

export async function playSound(req: PlaySoundRequest): Promise<SoundQueryInfo> {
	return (await api.post<SoundQueryInfo>('queries/sound', req)).data;
}

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
};

export const deleteSound = async (sound_name: string) =>
	await api.delete(`sounds/file/${sound_name}`);

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

export type RoleInfo = {
	id: number;
	name: string;
	permissions: string[];
};

export const getRoles = async () =>
	(await api.get<RoleInfo[]>(`auth/roles`)).data;

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

export interface AnnouncementsSettings {
	ring_sound?: string;
}

export const getAnnouncementsSettings = async () =>
	(await api.get<AnnouncementsSettings>('lite/announcements')).data;

export const patchAnnouncementsSettings = async (req: {
	ring_sound?: string;
}) => await api.patch('lite/announcements', req);

export type ScheduleLesson = {
	start_at: string;
	start_sound: string;
	end_at: string;
	end_sound: string;
};

export type ScheduleInfo = {
	id: number;
	name: string;
	lessons: ScheduleLesson[];
};

export type ScheduleCreateRequest = {
	name: string;
	lessons: ScheduleLesson[];
};

export type ScheduleUpdateRequest = {
	name?: string;
	lessons?: ScheduleLesson[];
};

export const getSchedules = async (): Promise<ScheduleInfo[]> =>
	(await api.get<ScheduleInfo[]>('school/schedules')).data;

export const createSchedule = async (
	req: ScheduleCreateRequest
): Promise<ScheduleInfo> =>
	(await api.post<ScheduleInfo>('school/schedules', req)).data;

export const updateSchedule = async (
	id: number,
	req: ScheduleUpdateRequest
): Promise<ScheduleInfo> =>
	(await api.patch<ScheduleInfo>(`school/schedules/${id}`, req)).data;

export const deleteSchedule = async (id: number): Promise<ScheduleInfo> =>
	(await api.delete<ScheduleInfo>(`school/schedules/${id}`)).data;

export const dupeSchedule = async (id: number): Promise<ScheduleInfo> =>
	(await api.post<ScheduleInfo>(`school/schedules/dupe/${id}`)).data;

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

export type SchoolSettingsExportOptions = {
	schedules: boolean;
	assignments: boolean;
	overrides: boolean;
};

const toBooleanParam = (value: boolean) => (value ? 'true' : 'false');

export const getSchoolSettingsExportUrl = (
	options: SchoolSettingsExportOptions
) => {
	const params = new URLSearchParams({
		schedules: toBooleanParam(options.schedules),
		assignments: toBooleanParam(options.assignments),
		overrides: toBooleanParam(options.overrides)
	});

	return `${buildApiAssetUrl('/api/settings/settings')}?${params.toString()}`;
};

export const importSchoolSettingsFile = async (file: File) => {
	const form = new FormData();
	form.append('file', file);
	return (await api.post('settings/settings', form)).data;
};

export const exportSchoolSettingsFile = async (
	options: SchoolSettingsExportOptions
) =>
	(
		await api.get('settings/settings', {
			params: {
				schedules: options.schedules,
				assignments: options.assignments,
				overrides: options.overrides
			},
			responseType: 'blob'
		})
	).data as Blob;

const getFilenameFromContentDisposition = (headerValue?: string) => {
	if (!headerValue) {
		return undefined;
	}

	const encodedFilenameMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
	if (encodedFilenameMatch?.[1]) {
		try {
			return decodeURIComponent(
				encodedFilenameMatch[1].trim().replace(/["']/g, '')
			);
		} catch {
			// If decoding fails, try plain filename extraction.
		}
	}

	const filenameMatch = headerValue.match(/filename="?([^";]+)"?/i);
	return filenameMatch?.[1]?.trim();
};

export const downloadSchoolCertificate = async () => {
	const response = await api.get('certs/download', { responseType: 'blob' });
	const contentDisposition = response.headers?.['content-disposition'];

	return {
		blob: response.data as Blob,
		fileName: getFilenameFromContentDisposition(contentDisposition)
	};
};

export const setSchoolVolume = async (volume: number) =>
	(await api.put('settings/volume', { volume })).data;

export type SettingsVolumeResponse = {
	ok: boolean;
	volume: number;
};

export const getSettingsVolume = async () =>
	(await api.get('settings/volume')).data;

export const checkSchoolUpdates = async () => {
	return (await api.get<CheckSchoolUpdatesResponse>('settings/check_updates'))
		.data;
};

export type CheckSchoolUpdatesResponse = {
	status?: string;
	has_updates?: boolean;
	backend_has_updates?: boolean;
	frontend_has_updates?: boolean;
};

export type UpdateSchoolSoftwareResponse = {
	ok?: boolean;
	status?: string;
	detail?: string;
};

export const updateSchoolSoftware = async () => {
	return (await api.post<UpdateSchoolSoftwareResponse>('settings/update')).data;
};

export type SchoolHealthResponse = {
	ok?: boolean;
};

export type SchoolHealthOptions = {
	timeoutMs?: number;
};

export const getSchoolHealth = async (options?: SchoolHealthOptions) => {
	return (
		await api.get<SchoolHealthResponse>('health', {
			timeout: options?.timeoutMs
		})
	).data;
};

export const rebootSchoolDevice = async () => {
	return (await api.post('settings/reboot')).data;
};
