import type {
	AxiosAdapter,
	AxiosResponse,
	InternalAxiosRequestConfig,
	ResponseType
} from 'axios';
import { AxiosError } from 'axios';

import {
	clearSoundBlobStore,
	deleteSoundBlob,
	getSoundBlobRecord,
	putSoundBlob
} from './mockSoundsStorage';

const MOCK_STATE_KEY = 'bmaster.mock.state.v1';
const QUERY_HISTORY_LIMIT = 400;
const SOUND_NAME_PATTERN = /^[a-zA-Zа-яА-Я\d_\- ]+\.[a-z\d]+$/u;
const DEFAULT_ROOT_PASSWORD = 'bmaster';
const SCHEDULER_TICK_MS = 1000;
const SCHEDULER_CATCH_UP_WINDOW_MS = 5 * 60 * 1000;
const SCHEDULER_QUEUE_PRIORITY = 1;

const WEEKDAY_KEYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
] as const;

type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

type QueryStatus = 'waiting' | 'playing' | 'finished' | 'cancelled';

type QueryAuthor = {
	type: string;
	name: string;
	label: string;
};

type RuntimeQuery = {
	id: string;
	type: string;
	icom: string;
	priority: number;
	force: boolean;
	status: QueryStatus;
	author?: QueryAuthor;
	duration?: number;
	sound_name?: string;
	created_at: number;
	updated_at: number;
	auto_finish_ms?: number;
	lifecycle?: QueryLifecycle;
};

type QueryLifecycle = {
	onWaiting?: () => void;
	onPlaying?: () => void;
	onStopped?: () => void;
};

type RuntimeIcomQueue = {
	playing_id?: string;
	queue_ids: string[];
};

type StreamStats = {
	bytes: number;
	chunks: number;
	buffers: ArrayBuffer[];
};

type ActiveSoundPlayback = {
	audio: HTMLAudioElement;
	object_url: string;
	on_ended: () => void;
	on_error: () => void;
};

type SessionType = 'root' | 'account';

type AccountRecord = {
	type: 'account';
	id: number;
	name: string;
	deleted: boolean;
	role_ids: number[];
	password: string;
};

type RoleRecord = {
	id: number;
	name: string;
	permissions: string[];
};

type AuthSession = {
	token: string;
	type: SessionType;
	account_id?: number;
	created_at: number;
};

type SoundMeta = {
	name: string;
	size: number;
	mime: string;
	sound_specs?: {
		duration: number;
	} | null;
};

type ScheduleLesson = {
	start_at: string;
	start_sound: string;
	end_at: string;
	end_sound: string;
};

type ScheduleRecord = {
	id: number;
	name: string;
	lessons: ScheduleLesson[];
};

type AssignmentRecord = {
	id: number;
	start_date: string;
	monday?: number | null;
	tuesday?: number | null;
	wednesday?: number | null;
	thursday?: number | null;
	friday?: number | null;
	saturday?: number | null;
	sunday?: number | null;
};

type OverrideRecord = {
	id: number;
	at: string;
	mute_all_lessons: boolean;
	mute_lessons: number[];
};

type BellsSettings = {
	enabled: boolean;
	weekdays: {
		monday: boolean;
		tuesday: boolean;
		wednesday: boolean;
		thursday: boolean;
		friday: boolean;
		saturday: boolean;
		sunday: boolean;
	};
	lessons: Array<{
		enabled: boolean;
		start_at: string;
		start_sound?: string;
		end_at: string;
		end_sound?: string;
	}>;
};

type AnnouncementsSettings = {
	ring_sound?: string;
};

type ScriptRecord = {
	id: number;
	name: string;
	script: {
		commands: Array<Record<string, unknown>>;
	};
};

type TaskRecord = {
	id: number;
	script_id: number;
	tags: string[];
};

type IcomRecord = {
	id: string;
	name: string;
	paused: boolean;
};

type AuthState = {
	service_enabled: boolean;
	root_password: string;
	roles: RoleRecord[];
	accounts: AccountRecord[];
	sessions: AuthSession[];
};

type SchoolState = {
	schedules: ScheduleRecord[];
	assignments: AssignmentRecord[];
	overrides: OverrideRecord[];
};

type LiteState = {
	bells: BellsSettings;
	announcements: AnnouncementsSettings;
};

type SettingsState = {
	volume: number;
};

type ScriptingState = {
	scripts: ScriptRecord[];
	tasks: TaskRecord[];
};

type CertState = {
	file_name: string;
	content: string;
};

type MockState = {
	version: 1;
	auth: AuthState;
	icoms: {
		items: IcomRecord[];
	};
	sounds: {
		meta: SoundMeta[];
	};
	school: SchoolState;
	lite: LiteState;
	settings: SettingsState;
	scripting: ScriptingState;
	certs: CertState;
};

type AuthIdentity =
	| {
			type: 'root';
	  }
	| {
			type: 'account';
			account: AccountRecord;
			permissions: string[];
	  };

type RuntimeState = {
	queries: Map<string, RuntimeQuery>;
	icom_queues: Map<string, RuntimeIcomQueue>;
	query_timers: Map<string, number>;
	stream_stats: Map<string, StreamStats>;
	sound_playback: Map<string, ActiveSoundPlayback>;
};

type MockResponse = {
	status: number;
	data: unknown;
	headers?: Record<string, string>;
};

type RequestContext = {
	method: string;
	path: string;
	segments: string[];
	query: URLSearchParams;
	body: unknown;
	config: InternalAxiosRequestConfig;
	identity: AuthIdentity | null;
};

type StreamSessionTransport = {
	send: (data: string | ArrayBuffer | Blob) => void;
	close: (code?: number, reason?: string) => void;
};

type StreamSessionHandle = {
	onClientData: (data: unknown) => void;
	onClientClose: () => void;
};

type StreamSessionState = {
	id: string;
	transport: StreamSessionTransport;
	identity: AuthIdentity;
	query_id?: string;
	closed: boolean;
};

const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const ensureArray = <T>(value: T[] | undefined | null): T[] =>
	Array.isArray(value) ? value : [];

const todayIsoDate = () => {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const shiftIsoDate = (base: string, days: number): string => {
	const date = new Date(`${base}T00:00:00`);
	date.setDate(date.getDate() + days);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const normalizeDate = (value: unknown): string | null => {
	if (typeof value !== 'string') {
		return null;
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const normalized = `${year}-${month}-${day}`;
	return normalized === value ? normalized : null;
};

const iterateDateRange = (start: string, end: string): string[] => {
	const startDate = new Date(`${start}T00:00:00`);
	const endDate = new Date(`${end}T00:00:00`);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
		return [];
	}
	if (startDate > endDate) {
		return [];
	}

	const result: string[] = [];
	const cursor = new Date(startDate);
	while (cursor <= endDate) {
		const year = cursor.getFullYear();
		const month = String(cursor.getMonth() + 1).padStart(2, '0');
		const day = String(cursor.getDate()).padStart(2, '0');
		result.push(`${year}-${month}-${day}`);
		cursor.setDate(cursor.getDate() + 1);
	}
	return result;
};

const defaultBellsSettings = (): BellsSettings => ({
	enabled: true,
	weekdays: {
		monday: true,
		tuesday: true,
		wednesday: true,
		thursday: true,
		friday: true,
		saturday: false,
		sunday: false
	},
	lessons: [
		{
			enabled: true,
			start_at: '08:30',
			start_sound: 'lesson-start.wav',
			end_at: '09:15',
			end_sound: 'lesson-end.wav'
		},
		{
			enabled: true,
			start_at: '09:25',
			start_sound: 'lesson-start.wav',
			end_at: '10:10',
			end_sound: 'lesson-end.wav'
		},
		{
			enabled: true,
			start_at: '10:25',
			start_sound: 'lesson-start.wav',
			end_at: '11:10',
			end_sound: 'lesson-end.wav'
		},
		{
			enabled: true,
			start_at: '11:20',
			start_sound: 'lesson-start.wav',
			end_at: '12:05',
			end_sound: 'lesson-end.wav'
		}
	]
});

const makeSeedState = (): MockState => {
	const today = todayIsoDate();
	const weekStart = shiftIsoDate(today, -3);
	const weekNext = shiftIsoDate(today, 4);

	return {
		version: 1,
		auth: {
			service_enabled: true,
			root_password: DEFAULT_ROOT_PASSWORD,
			roles: [
				{
					id: 1,
					name: 'Оператор',
					permissions: [
						'bmaster.icoms.read',
						'bmaster.icoms.queue.manage',
						'bmaster.sounds.manage'
					]
				},
				{
					id: 2,
					name: 'Администратор',
					permissions: [
						'bmaster.settings.volume',
						'bmaster.settings.updates',
						'bmaster.settings.reboot',
						'bmaster.scripting.manage'
					]
				}
			],
			accounts: [
				{
					type: 'account',
					id: 1,
					name: 'operator',
					password: 'operator',
					deleted: false,
					role_ids: [1]
				},
				{
					type: 'account',
					id: 2,
					name: 'admin',
					password: 'admin123',
					deleted: false,
					role_ids: [1, 2]
				}
			],
			sessions: []
		},
		icoms: {
			items: [
				{ id: 'main', name: 'Главный холл', paused: false },
				{ id: 'gym', name: 'Спортзал', paused: false },
				{ id: 'canteen', name: 'Столовая', paused: false }
			]
		},
		sounds: {
			meta: []
		},
		school: {
			schedules: [
				{
					id: 1,
					name: 'Основное расписание',
					lessons: [
						{
							start_at: '08:30',
							start_sound: 'lesson-start.wav',
							end_at: '09:15',
							end_sound: 'lesson-end.wav'
						},
						{
							start_at: '09:25',
							start_sound: 'lesson-start.wav',
							end_at: '10:10',
							end_sound: 'lesson-end.wav'
						},
						{
							start_at: '10:25',
							start_sound: 'lesson-start.wav',
							end_at: '11:10',
							end_sound: 'lesson-end.wav'
						}
					]
				},
				{
					id: 2,
					name: 'Короткие уроки',
					lessons: [
						{
							start_at: '08:45',
							start_sound: 'lesson-start.wav',
							end_at: '09:20',
							end_sound: 'lesson-end.wav'
						},
						{
							start_at: '09:30',
							start_sound: 'lesson-start.wav',
							end_at: '10:05',
							end_sound: 'lesson-end.wav'
						}
					]
				}
			],
			assignments: [
				{
					id: 1,
					start_date: weekStart,
					monday: 1,
					tuesday: 1,
					wednesday: 1,
					thursday: 1,
					friday: 1,
					saturday: 2,
					sunday: 2
				},
				{
					id: 2,
					start_date: weekNext,
					monday: 2,
					tuesday: 2,
					wednesday: 1,
					thursday: 1,
					friday: 2,
					saturday: 2,
					sunday: 2
				}
			],
			overrides: [
				{
					id: 1,
					at: today,
					mute_all_lessons: false,
					mute_lessons: [2]
				}
			]
		},
		lite: {
			bells: defaultBellsSettings(),
			announcements: {
				ring_sound: 'ring.wav'
			}
		},
		settings: {
			volume: 65
		},
		scripting: {
			scripts: [
				{
					id: 1,
					name: 'Утренняя проверка',
					script: {
						commands: [
							{
								type: 'queries.sound',
								sound_name: 'lesson-start.wav',
								icom: 'main',
								priority: 1,
								force: false
							}
						]
					}
				}
			],
			tasks: [
				{
					id: 1,
					script_id: 1,
					tags: ['demo', 'morning']
				}
			]
		},
		certs: {
			file_name: 'bmaster-cert.cer',
			content:
				'-----BEGIN CERTIFICATE-----\nTU9DS19CRU1BU1RFUl9DRVJUSUZJQ0FURQ==\n-----END CERTIFICATE-----\n'
		}
	};
};

const parseStoredState = (raw: string | null): MockState | null => {
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw) as MockState;
		if (parsed?.version !== 1) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
};

const randomToken = () => {
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		const bytes = new Uint8Array(16);
		crypto.getRandomValues(bytes);
		const part = Array.from(bytes)
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join('');
		return `mock.${part}`;
	}
	return `mock.${Math.random().toString(36).slice(2)}.${Date.now().toString(36)}`;
};

const randomId = () => {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `id.${Math.random().toString(36).slice(2)}.${Date.now().toString(36)}`;
};

const toNumber = (value: unknown, fallback: number) => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === 'string') {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return fallback;
};

const clamp = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(max, value));

const getHeaderValue = (
	config: InternalAxiosRequestConfig,
	headerName: string
): string | undefined => {
	const headers = config.headers;
	if (!headers) {
		return undefined;
	}

	if (typeof (headers as any).get === 'function') {
		return (headers as any).get(headerName) as string | undefined;
	}

	const direct = (headers as Record<string, unknown>)[headerName];
	if (typeof direct === 'string') {
		return direct;
	}

	const lower = (headers as Record<string, unknown>)[headerName.toLowerCase()];
	if (typeof lower === 'string') {
		return lower;
	}

	return undefined;
};

const parseJsonIfString = (value: unknown) => {
	if (typeof value !== 'string') {
		return value;
	}
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
};

const normalizePath = (rawPathname: string): string => {
	let path = rawPathname;
	if (path.startsWith('/')) {
		path = path.slice(1);
	}
	if (path.startsWith('api/')) {
		path = path.slice(4);
	}
	if (path.endsWith('/')) {
		path = path.slice(0, -1);
	}
	return path;
};

const mergeQueryParams = (
	urlSearchParams: URLSearchParams,
	params: unknown
): URLSearchParams => {
	const merged = new URLSearchParams(urlSearchParams);
	if (!params || typeof params !== 'object') {
		return merged;
	}

	for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
		if (value === undefined || value === null) {
			continue;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				merged.append(key, String(item));
			}
			continue;
		}
		merged.set(key, String(value));
	}

	return merged;
};

const dateSortAsc = (a: string, b: string) => {
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}
	return 0;
};

const formatDateFromDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const dayStartMs = (date: Date): number => {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const parseTimeToSeconds = (value: string): number | null => {
	if (typeof value !== 'string') {
		return null;
	}

	const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (!match) {
		return null;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = Number(match[3] || 0);
	if (
		!Number.isInteger(hours) ||
		!Number.isInteger(minutes) ||
		!Number.isInteger(seconds)
	) {
		return null;
	}
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
		return null;
	}

	return hours * 3600 + minutes * 60 + seconds;
};

const computeAudioDuration = async (blob: Blob): Promise<number | undefined> => {
	if (typeof window === 'undefined') {
		return undefined;
	}

	const AudioContextClass: typeof AudioContext | undefined =
		(window as any).AudioContext || (window as any).webkitAudioContext;
	if (!AudioContextClass) {
		return undefined;
	}

	let context: AudioContext | undefined;
	try {
		const buffer = await blob.arrayBuffer();
		context = new AudioContextClass();
		const audioBuffer = await context.decodeAudioData(buffer.slice(0));
		const duration = Number(audioBuffer.duration.toFixed(3));
		if (!Number.isFinite(duration) || duration <= 0) {
			return undefined;
		}
		return duration;
	} catch {
		return undefined;
	} finally {
		try {
			if (context) {
				await context.close();
			}
		} catch {}
	}
};

class MockBackend {
	private state: MockState;
	private runtime: RuntimeState;
	private streamSessions = new Map<string, StreamSessionState>();
	private schedulerIntervalId: number | null = null;
	private schedulerLastTickMs = 0;
	private schedulerDay = '';
	private schedulerFiredKeys = new Set<string>();

	constructor() {
		const stored =
			typeof window !== 'undefined'
				? parseStoredState(window.localStorage.getItem(MOCK_STATE_KEY))
				: null;
		this.state = stored ?? makeSeedState();
		this.runtime = this.createEmptyRuntime();
		this.initializeIcomRuntime();
		this.resetSchedulerState(Date.now());
		this.persistState();
	}

	private createEmptyRuntime(): RuntimeState {
		return {
			queries: new Map(),
			icom_queues: new Map(),
			query_timers: new Map(),
			stream_stats: new Map(),
			sound_playback: new Map()
		};
	}

	private initializeIcomRuntime(): void {
		this.runtime.icom_queues.clear();
		for (const icom of this.state.icoms.items) {
			this.runtime.icom_queues.set(icom.id, {
				playing_id: undefined,
				queue_ids: []
			});
		}
	}

	private persistState(): void {
		if (typeof window === 'undefined') {
			return;
		}
		window.localStorage.setItem(MOCK_STATE_KEY, JSON.stringify(this.state));
	}

	private resetSchedulerState(nowMs: number): void {
		const day = formatDateFromDate(new Date(nowMs));
		this.schedulerLastTickMs = nowMs;
		this.schedulerDay = day;
		this.schedulerFiredKeys.clear();
	}

	private startScheduler(): void {
		if (typeof window === 'undefined') {
			return;
		}
		if (this.schedulerIntervalId !== null) {
			return;
		}
		this.resetSchedulerState(Date.now());
		this.schedulerIntervalId = window.setInterval(() => {
			this.runSchedulerTick();
		}, SCHEDULER_TICK_MS);
	}

	private stopScheduler(): void {
		if (typeof window === 'undefined') {
			return;
		}
		if (this.schedulerIntervalId === null) {
			return;
		}
		window.clearInterval(this.schedulerIntervalId);
		this.schedulerIntervalId = null;
	}

	private getSchedulerIcomId(): string | undefined {
		if (this.state.icoms.items.length === 0) {
			return undefined;
		}
		const mainIcom = this.state.icoms.items.find((item) => item.id === 'main');
		if (mainIcom) {
			return mainIcom.id;
		}
		return this.state.icoms.items[0].id;
	}

	private getActiveAssignmentForDate(dateIso: string): AssignmentRecord | null {
		const sorted = this.state.school.assignments
			.slice()
			.sort((a, b) => dateSortAsc(a.start_date, b.start_date));
		let active: AssignmentRecord | null = null;
		for (const assignment of sorted) {
			if (assignment.start_date <= dateIso) {
				active = assignment;
				continue;
			}
			break;
		}
		return active;
	}

	private getScheduleForDate(date: Date): ScheduleRecord | null {
		const day = formatDateFromDate(date);
		const activeAssignment = this.getActiveAssignmentForDate(day);
		if (!activeAssignment) {
			return null;
		}

		const weekdayKey = WEEKDAY_KEYS[date.getDay()] as WeekdayKey;
		const scheduleId = activeAssignment[weekdayKey];
		if (typeof scheduleId !== 'number') {
			return null;
		}

		return (
			this.state.school.schedules.find((schedule) => schedule.id === scheduleId) || null
		);
	}

	private getDateMuteState(day: string): { mute_all: boolean; muted_lessons: Set<number> } {
		const overrides = this.state.school.overrides.filter((item) => item.at === day);
		const muteAll = overrides.some((item) => item.mute_all_lessons);
		const mutedLessons = new Set<number>();
		for (const override of overrides) {
			for (const lessonIndex of override.mute_lessons || []) {
				if (Number.isInteger(lessonIndex) && lessonIndex >= 0) {
					mutedLessons.add(lessonIndex);
				}
			}
		}
		return { mute_all: muteAll, muted_lessons: mutedLessons };
	}

	private resolveSchedulerSoundName(
		lesson: ScheduleLesson,
		lessonIndex: number,
		type: 'start' | 'end'
	): string | undefined {
		const bellsLesson = this.state.lite.bells.lessons[lessonIndex];
		if (bellsLesson && bellsLesson.enabled === false) {
			return undefined;
		}

		const scheduleSound =
			type === 'start' ? lesson.start_sound : lesson.end_sound;
		const bellsFallback =
			type === 'start' ? bellsLesson?.start_sound : bellsLesson?.end_sound;
		const selected = (scheduleSound || bellsFallback || '').trim();
		return selected || undefined;
	}

	private enqueueSchedulerSound(soundName: string, eventKey: string): void {
		if (this.schedulerFiredKeys.has(eventKey)) {
			return;
		}

		const icomId = this.getSchedulerIcomId();
		if (!icomId) {
			return;
		}

		this.schedulerFiredKeys.add(eventKey);
		const sound = this.state.sounds.meta.find((item) => item.name === soundName);
		const duration = sound?.sound_specs?.duration;
		const query: RuntimeQuery = {
			id: randomId(),
			type: 'sounds.sound',
			icom: icomId,
			priority: SCHEDULER_QUEUE_PRIORITY,
			force: false,
			sound_name: soundName,
			status: 'waiting',
			duration,
			author: {
				type: 'service',
				name: 'scheduler',
				label: 'School Scheduler'
			},
			created_at: Date.now(),
			updated_at: Date.now(),
			auto_finish_ms: Math.max(500, Math.floor((duration ?? 2) * 1000))
		};

		this.enqueueQuery(query);
	}

	private runSchedulerTick(): void {
		if (typeof window === 'undefined') {
			return;
		}

		const nowMs = Date.now();
		const now = new Date(nowMs);
		const day = formatDateFromDate(now);

		if (day !== this.schedulerDay) {
			this.schedulerDay = day;
			this.schedulerFiredKeys.clear();
		}

		const fromMs =
			this.schedulerLastTickMs <= 0
				? nowMs
				: Math.max(this.schedulerLastTickMs, nowMs - SCHEDULER_CATCH_UP_WINDOW_MS);
		this.schedulerLastTickMs = nowMs;

		if (!this.state.lite.bells.enabled) {
			return;
		}

		const weekdayKey = WEEKDAY_KEYS[now.getDay()] as WeekdayKey;
		if (this.state.lite.bells.weekdays[weekdayKey] === false) {
			return;
		}

		const schedule = this.getScheduleForDate(now);
		if (!schedule) {
			return;
		}

		const muteState = this.getDateMuteState(day);
		if (muteState.mute_all) {
			return;
		}

		const baseMs = dayStartMs(now);
		for (let lessonIndex = 0; lessonIndex < schedule.lessons.length; lessonIndex += 1) {
			if (muteState.muted_lessons.has(lessonIndex)) {
				continue;
			}

			const lesson = schedule.lessons[lessonIndex];
			for (const eventType of ['start', 'end'] as const) {
				const eventTime = eventType === 'start' ? lesson.start_at : lesson.end_at;
				const eventSeconds = parseTimeToSeconds(eventTime);
				if (eventSeconds === null) {
					continue;
				}

				const soundName = this.resolveSchedulerSoundName(
					lesson,
					lessonIndex,
					eventType
				);
				if (!soundName) {
					continue;
				}

				const eventMs = baseMs + eventSeconds * 1000;
				if (eventMs <= fromMs || eventMs > nowMs) {
					continue;
				}

				const eventKey = `${day}|${schedule.id}|${lessonIndex}|${eventType}|${eventSeconds}|${soundName}`;
				this.enqueueSchedulerSound(soundName, eventKey);
			}
		}
	}

	private unauthorized(): MockResponse {
		return {
			status: 401,
			data: { detail: 'bmaster.auth.invalid_token' }
		};
	}

	private notFound(detail = 'not found'): MockResponse {
		return {
			status: 404,
			data: { detail }
		};
	}

	private badRequest(detail = 'bad request'): MockResponse {
		return {
			status: 400,
			data: { detail }
		};
	}

	private conflict(detail = 'conflict'): MockResponse {
		return {
			status: 409,
			data: { detail }
		};
	}

	private resolveIdentityByToken(token: string | undefined | null): AuthIdentity | null {
		if (!token) {
			return null;
		}
		const session = this.state.auth.sessions.find((item) => item.token === token);
		if (!session) {
			return null;
		}
		if (session.type === 'root') {
			return { type: 'root' };
		}
		const account = this.state.auth.accounts.find(
			(item) => item.id === session.account_id && !item.deleted
		);
		if (!account) {
			return null;
		}
		return {
			type: 'account',
			account,
			permissions: this.getAccountPermissions(account)
		};
	}

	private getAccountPermissions(account: AccountRecord): string[] {
		const permissions = new Set<string>();
		for (const roleId of account.role_ids) {
			const role = this.state.auth.roles.find((item) => item.id === roleId);
			if (!role) {
				continue;
			}
			for (const permission of role.permissions) {
				permissions.add(permission);
			}
		}
		return Array.from(permissions);
	}

	private parseBearer(config: InternalAxiosRequestConfig): string | undefined {
		const authHeader = getHeaderValue(config, 'Authorization');
		if (!authHeader) {
			return undefined;
		}
		const [type, value] = authHeader.split(' ');
		if (!value || type.toLowerCase() !== 'bearer') {
			return undefined;
		}
		return value;
	}

	private resolveIdentity(config: InternalAxiosRequestConfig): AuthIdentity | null {
		const token = this.parseBearer(config);
		return this.resolveIdentityByToken(token);
	}

	private createSession(identity: SessionType, accountId?: number): string {
		const token = randomToken();
		this.state.auth.sessions.push({
			token,
			type: identity,
			account_id: accountId,
			created_at: Date.now()
		});
		this.persistState();
		return token;
	}

	private toQueryAuthor(identity: AuthIdentity | null): QueryAuthor | undefined {
		if (!identity) {
			return undefined;
		}
		if (identity.type === 'root') {
			return {
				type: 'root',
				name: 'root',
				label: 'Service'
			};
		}
		return {
			type: 'account',
			name: identity.account.name,
			label: 'Account'
		};
	}

	private getNextId(values: number[]): number {
		const max = values.length === 0 ? 0 : Math.max(...values);
		return max + 1;
	}

	private ensureIcomRuntime(icomId: string): RuntimeIcomQueue {
		const existing = this.runtime.icom_queues.get(icomId);
		if (existing) {
			return existing;
		}
		const created: RuntimeIcomQueue = { queue_ids: [], playing_id: undefined };
		this.runtime.icom_queues.set(icomId, created);
		return created;
	}

	private insertIntoPriorityQueue(icomRuntime: RuntimeIcomQueue, queryId: string): void {
		const query = this.runtime.queries.get(queryId);
		if (!query) {
			return;
		}

		let inserted = false;
		for (let index = 0; index < icomRuntime.queue_ids.length; index += 1) {
			const current = this.runtime.queries.get(icomRuntime.queue_ids[index]);
			if (!current) {
				continue;
			}
			if (query.priority > current.priority) {
				icomRuntime.queue_ids.splice(index, 0, queryId);
				inserted = true;
				break;
			}
		}
		if (!inserted) {
			icomRuntime.queue_ids.push(queryId);
		}
	}

	private trimQueryHistory(): void {
		if (this.runtime.queries.size <= QUERY_HISTORY_LIMIT) {
			return;
		}
		const removable = Array.from(this.runtime.queries.values())
			.filter((query) => query.status !== 'playing' && query.status !== 'waiting')
			.sort((a, b) => a.updated_at - b.updated_at);
		while (
			this.runtime.queries.size > QUERY_HISTORY_LIMIT &&
			removable.length > 0
		) {
			const victim = removable.shift();
			if (!victim) {
				break;
			}
			this.runtime.queries.delete(victim.id);
			this.runtime.stream_stats.delete(victim.id);
		}
	}

	private clearQueryTimer(queryId: string): void {
		const timerId = this.runtime.query_timers.get(queryId);
		if (!timerId) {
			return;
		}
		window.clearTimeout(timerId);
		this.runtime.query_timers.delete(queryId);
	}

	private stopSoundPlayback(queryId: string): void {
		const active = this.runtime.sound_playback.get(queryId);
		if (!active) {
			return;
		}
		this.runtime.sound_playback.delete(queryId);
		try {
			active.audio.removeEventListener('ended', active.on_ended);
			active.audio.removeEventListener('error', active.on_error);
		} catch {}
		try {
			active.audio.pause();
			active.audio.src = '';
			active.audio.load();
		} catch {}
		try {
			URL.revokeObjectURL(active.object_url);
		} catch {}
	}

	private startSoundPlayback(query: RuntimeQuery): void {
		if (query.type !== 'sounds.sound' || !query.sound_name) {
			return;
		}
		if (typeof window === 'undefined' || typeof Audio === 'undefined') {
			return;
		}
		const queryId = query.id;
		const soundName = query.sound_name;

		void (async () => {
			const record = await getSoundBlobRecord(soundName);
			const current = this.runtime.queries.get(queryId);
			if (!record || !current || current.status !== 'playing') {
				return;
			}

			const objectUrl = URL.createObjectURL(record.blob);
			const audio = new Audio(objectUrl);
			audio.preload = 'auto';
			audio.volume = clamp(this.state.settings.volume, 0, 100) / 100;

			const onEnded = () => {
				this.finishQuery(queryId, 'finished');
			};
			const onError = () => {
				this.finishQuery(queryId, 'finished');
			};

			audio.addEventListener('ended', onEnded, { once: true });
			audio.addEventListener('error', onError, { once: true });

			this.runtime.sound_playback.set(queryId, {
				audio,
				object_url: objectUrl,
				on_ended: onEnded,
				on_error: onError
			});

			const stillCurrent = this.runtime.queries.get(queryId);
			if (!stillCurrent || stillCurrent.status !== 'playing') {
				this.stopSoundPlayback(queryId);
				return;
			}

			try {
				await audio.play();
				if (
					!stillCurrent.duration &&
					Number.isFinite(audio.duration) &&
					audio.duration > 0
				) {
					stillCurrent.duration = Number(audio.duration.toFixed(3));
				}
			} catch {
				this.stopSoundPlayback(queryId);
			}
		})();
	}

	private moveToNextQuery(icomId: string): void {
		const icomRuntime = this.runtime.icom_queues.get(icomId);
		if (!icomRuntime) {
			return;
		}
		if (icomRuntime.playing_id) {
			return;
		}
		const nextId = icomRuntime.queue_ids.shift();
		if (!nextId) {
			return;
		}
		const query = this.runtime.queries.get(nextId);
		if (!query) {
			this.moveToNextQuery(icomId);
			return;
		}
		this.startQuery(query);
	}

	private startQuery(query: RuntimeQuery): void {
		const icomRuntime = this.ensureIcomRuntime(query.icom);
		icomRuntime.playing_id = query.id;
		query.status = 'playing';
		query.updated_at = Date.now();
		query.lifecycle?.onPlaying?.();
		this.startSoundPlayback(query);

		if (query.auto_finish_ms && query.auto_finish_ms > 0) {
			const timer = window.setTimeout(() => {
				this.finishQuery(query.id, 'finished');
			}, query.auto_finish_ms);
			this.runtime.query_timers.set(query.id, timer);
		}
	}

	private finishQuery(queryId: string, status: QueryStatus): RuntimeQuery | undefined {
		const query = this.runtime.queries.get(queryId);
		if (!query) {
			return undefined;
		}
		if (query.status === 'finished' || query.status === 'cancelled') {
			return query;
		}

		this.clearQueryTimer(queryId);
		this.stopSoundPlayback(queryId);

		const icomRuntime = this.runtime.icom_queues.get(query.icom);
		if (icomRuntime) {
			if (icomRuntime.playing_id === queryId) {
				icomRuntime.playing_id = undefined;
			}
			const queueIndex = icomRuntime.queue_ids.indexOf(queryId);
			if (queueIndex >= 0) {
				icomRuntime.queue_ids.splice(queueIndex, 1);
			}
		}

		query.status = status;
		query.updated_at = Date.now();
		query.lifecycle?.onStopped?.();

		this.moveToNextQuery(query.icom);
		this.trimQueryHistory();
		return query;
	}

	private enqueueQuery(query: RuntimeQuery): RuntimeQuery {
		const icomRuntime = this.ensureIcomRuntime(query.icom);
		this.runtime.queries.set(query.id, query);

		if (query.force && icomRuntime.playing_id) {
			this.finishQuery(icomRuntime.playing_id, 'cancelled');
		}

		if (!icomRuntime.playing_id) {
			this.startQuery(query);
			return query;
		}

		query.status = 'waiting';
		query.updated_at = Date.now();
		this.insertIntoPriorityQueue(icomRuntime, query.id);
		query.lifecycle?.onWaiting?.();
		return query;
	}

	private toQueryInfo(query: RuntimeQuery) {
		return {
			id: query.id,
			type: query.type,
			icom: query.icom,
			priority: query.priority,
			force: query.force,
			duration: query.duration,
			status: query.status,
			author: query.author,
			...(query.sound_name ? { sound_name: query.sound_name } : {})
		};
	}

	private toIcomInfo(icom: IcomRecord) {
		const runtime = this.ensureIcomRuntime(icom.id);
		const playing = runtime.playing_id
			? this.runtime.queries.get(runtime.playing_id)
			: undefined;
		const queue = runtime.queue_ids
			.map((id) => this.runtime.queries.get(id))
			.filter((query): query is RuntimeQuery => Boolean(query));
		return {
			id: icom.id,
			name: icom.name,
			playing: playing ? this.toQueryInfo(playing) : undefined,
			queue: queue.map((query) => this.toQueryInfo(query)),
			paused: Boolean(icom.paused)
		};
	}

	private normalizeScheduleLesson(raw: any): ScheduleLesson {
		return {
			start_at: typeof raw?.start_at === 'string' ? raw.start_at : '',
			start_sound: typeof raw?.start_sound === 'string' ? raw.start_sound : '',
			end_at: typeof raw?.end_at === 'string' ? raw.end_at : '',
			end_sound: typeof raw?.end_sound === 'string' ? raw.end_sound : ''
		};
	}

	private response(
		status: number,
		data: unknown,
		headers?: Record<string, string>
	): MockResponse {
		return { status, data, headers };
	}

	private makeAxiosResponse(
		config: InternalAxiosRequestConfig,
		mockResponse: MockResponse
	): AxiosResponse {
		return {
			data: this.applyResponseType(mockResponse.data, config.responseType),
			status: mockResponse.status,
			statusText: String(mockResponse.status),
			headers: mockResponse.headers || {},
			config,
			request: {
				mock: true
			}
		};
	}

	private shouldResolveStatus(
		status: number,
		config: InternalAxiosRequestConfig
	): boolean {
		const validateStatus = config.validateStatus;
		if (!validateStatus) {
			return true;
		}
		return validateStatus(status);
	}

	private applyResponseType(data: unknown, responseType?: ResponseType): unknown {
		if (responseType === 'blob') {
			if (data instanceof Blob) {
				return data;
			}
			return new Blob([
				typeof data === 'string' ? data : JSON.stringify(data)
			], {
				type: 'application/json'
			});
		}

		if (responseType === 'arraybuffer') {
			if (data instanceof ArrayBuffer) {
				return data;
			}
			return data;
		}

		return data;
	}

	private async parseRequestBody(config: InternalAxiosRequestConfig): Promise<unknown> {
		const raw = config.data;
		if (raw === undefined || raw === null) {
			return undefined;
		}

		if (raw instanceof FormData || raw instanceof Blob || raw instanceof ArrayBuffer) {
			return raw;
		}

		if (typeof raw === 'string') {
			const contentType = getHeaderValue(config, 'Content-Type') || '';
			if (contentType.includes('application/json')) {
				return parseJsonIfString(raw);
			}
			return parseJsonIfString(raw);
		}

		return raw;
	}

	private async routeRequest(ctx: RequestContext): Promise<MockResponse> {
		const [root, second, third] = ctx.segments;
		if (!root) {
			return this.notFound();
		}

		if (root === 'auth') {
			if (ctx.method === 'GET' && second === 'service') {
				return this.response(200, { enabled: this.state.auth.service_enabled });
			}
			if (ctx.method === 'POST' && second === 'login') {
				return this.handleLogin(ctx.body);
			}

			if (!ctx.identity) {
				return this.unauthorized();
			}

			if (ctx.method === 'GET' && second === 'me') {
				if (ctx.identity.type === 'root') {
					return this.response(200, { type: 'root' });
				}
				return this.response(200, {
					type: 'account',
					id: ctx.identity.account.id,
					name: ctx.identity.account.name,
					permissions: ctx.identity.permissions
				});
			}

			if (ctx.method === 'GET' && second === 'roles') {
				return this.response(
					200,
					this.state.auth.roles.map((role) => ({
						id: role.id,
						name: role.name,
						permissions: [...role.permissions]
					}))
				);
			}

			if (second === 'accounts') {
				if (ctx.method === 'GET' && !third) {
					return this.response(
						200,
						this.state.auth.accounts
							.filter((account) => !account.deleted)
							.map((account) => ({
								type: 'account',
								id: account.id,
								name: account.name,
								deleted: account.deleted,
								role_ids: [...account.role_ids]
							}))
					);
				}

				if (ctx.method === 'POST' && !third) {
					const body = (ctx.body || {}) as Record<string, unknown>;
					const name = typeof body.name === 'string' ? body.name.trim() : '';
					const password =
						typeof body.password === 'string' ? body.password : '';
					const roleIds = ensureArray(body.role_ids as number[]).map((value) =>
						toNumber(value, 0)
					);

					if (!name || !password) {
						return this.badRequest('invalid account payload');
					}

					if (
						this.state.auth.accounts.some(
							(account) => account.name === name && !account.deleted
						)
					) {
						return this.conflict('account exists');
					}

					const account: AccountRecord = {
						type: 'account',
						id: this.getNextId(this.state.auth.accounts.map((item) => item.id)),
						name,
						password,
						deleted: false,
						role_ids: roleIds.filter((value) => value > 0)
					};
					this.state.auth.accounts.push(account);
					this.persistState();
					return this.response(200, {
						type: 'account',
						id: account.id,
						name: account.name,
						deleted: false,
						role_ids: [...account.role_ids]
					});
				}

				if ((ctx.method === 'PATCH' || ctx.method === 'DELETE') && third) {
					const accountId = toNumber(third, 0);
					const account = this.state.auth.accounts.find(
						(item) => item.id === accountId && !item.deleted
					);
					if (!account) {
						return this.notFound('account not found');
					}

					if (ctx.method === 'DELETE') {
						account.deleted = true;
						this.state.auth.sessions = this.state.auth.sessions.filter(
							(session) =>
								session.type !== 'account' || session.account_id !== account.id
						);
						this.persistState();
						return this.response(200, {
							type: 'account',
							id: account.id,
							name: account.name,
							deleted: true,
							role_ids: [...account.role_ids]
						});
					}

					const body = (ctx.body || {}) as Record<string, unknown>;
					if (typeof body.name === 'string' && body.name.trim()) {
						account.name = body.name.trim();
					}
					if (typeof body.password === 'string' && body.password.length > 0) {
						account.password = body.password;
					}
					if (Array.isArray(body.role_ids)) {
						account.role_ids = body.role_ids
							.map((value) => toNumber(value, 0))
							.filter((value) => value > 0);
					}
					this.persistState();
					return this.response(200, {
						type: 'account',
						id: account.id,
						name: account.name,
						deleted: account.deleted,
						role_ids: [...account.role_ids]
					});
				}
			}
		}

		if (!ctx.identity) {
			return this.unauthorized();
		}

		if (root === 'icoms') {
			if (ctx.method === 'GET' && !second) {
				const payload: Record<string, unknown> = {};
				for (const icom of this.state.icoms.items) {
					payload[icom.id] = this.toIcomInfo(icom);
				}
				return this.response(200, payload);
			}
			if (ctx.method === 'GET' && second) {
				const icom = this.state.icoms.items.find((item) => item.id === second);
				if (!icom) {
					return this.notFound('icom not found');
				}
				return this.response(200, this.toIcomInfo(icom));
			}
		}

		if (root === 'queries') {
			if (ctx.method === 'POST' && second === 'sound') {
				const body = (ctx.body || {}) as Record<string, unknown>;
				const icomId = typeof body.icom_id === 'string' ? body.icom_id : '';
				const soundName =
					typeof body.sound_name === 'string' ? body.sound_name : '';
				const priority = clamp(toNumber(body.priority, 0), -100, 100);
				const force = Boolean(body.force);

				if (!icomId || !soundName) {
					return this.badRequest('invalid query payload');
				}
				const icom = this.state.icoms.items.find((item) => item.id === icomId);
				if (!icom) {
					return this.notFound('icom not found');
				}
				const sound = this.state.sounds.meta.find((item) => item.name === soundName);
				if (!sound) {
					return this.notFound('sound not found');
				}

					const query: RuntimeQuery = {
						id: randomId(),
					type: 'sounds.sound',
					icom: icom.id,
					priority,
					force,
					sound_name: soundName,
					status: 'waiting',
					duration: sound.sound_specs?.duration,
					author: this.toQueryAuthor(ctx.identity),
					created_at: Date.now(),
					updated_at: Date.now(),
					auto_finish_ms: Math.max(
						500,
						Math.floor((sound.sound_specs?.duration ?? 2) * 1000)
					)
				};

				this.enqueueQuery(query);
				return this.response(200, this.toQueryInfo(query));
			}

			if (second && ctx.method === 'GET') {
				const query = this.runtime.queries.get(second);
				if (!query) {
					return this.notFound('query not found');
				}
				return this.response(200, this.toQueryInfo(query));
			}

			if (second && ctx.method === 'DELETE') {
				const query = this.runtime.queries.get(second);
				if (!query) {
					return this.notFound('query not found');
				}
				this.finishQuery(query.id, 'cancelled');
				return this.response(200, this.toQueryInfo(query));
			}
		}

		if (root === 'sounds') {
			if (ctx.method === 'GET' && second === 'info') {
				return this.response(200, jsonClone(this.state.sounds.meta));
			}

			if (second === 'file' && ctx.method === 'POST') {
				if (!(ctx.body instanceof FormData)) {
					return this.badRequest('file required');
				}
				const file = ctx.body.get('file');
				if (!(file instanceof File)) {
					return this.badRequest('file required');
				}

				const fileName = file.name;
				if (!SOUND_NAME_PATTERN.test(fileName)) {
					return this.badRequest('invalid sound file name');
				}
				if (this.state.sounds.meta.some((item) => item.name === fileName)) {
					return this.conflict('sound already exists');
				}

				const duration = await computeAudioDuration(file);
				const soundMeta: SoundMeta = {
					name: fileName,
					size: file.size,
					mime: file.type || 'application/octet-stream',
					sound_specs: duration ? { duration } : null
				};
				this.state.sounds.meta.push(soundMeta);
				this.state.sounds.meta.sort((a, b) => a.name.localeCompare(b.name));
				await putSoundBlob({
					name: fileName,
					blob: file,
					size: file.size,
					mime: soundMeta.mime,
					duration,
					updated_at: Date.now()
				});
				this.persistState();
				return this.response(200, { ok: true });
			}

			if (second === 'file' && ctx.method === 'GET' && third) {
				const soundName = decodeURIComponent(third);
				if (!SOUND_NAME_PATTERN.test(soundName)) {
					return this.badRequest('invalid sound file name');
				}
				const record = await getSoundBlobRecord(soundName);
				if (!record) {
					return this.notFound('sound not found');
				}
				return this.response(200, record.blob, {
					'content-type': record.mime || 'application/octet-stream'
				});
			}

			if (second === 'file' && ctx.method === 'DELETE' && third) {
				const soundName = decodeURIComponent(third);
				if (!SOUND_NAME_PATTERN.test(soundName)) {
					return this.badRequest('invalid sound file name');
				}
				const existing = this.state.sounds.meta.find(
					(item) => item.name === soundName
				);
				if (!existing) {
					return this.notFound('sound not found');
				}
				this.state.sounds.meta = this.state.sounds.meta.filter(
					(item) => item.name !== soundName
				);
				await deleteSoundBlob(soundName);
				this.persistState();
				return this.response(200, { ok: true });
			}
		}

		if (root === 'school') {
			if (second === 'schedules') {
				if (ctx.method === 'GET' && !third) {
					return this.response(200, jsonClone(this.state.school.schedules));
				}
				if (ctx.method === 'POST' && !third) {
					const body = (ctx.body || {}) as Record<string, unknown>;
					const schedule: ScheduleRecord = {
						id: this.getNextId(
							this.state.school.schedules.map((item) => item.id)
						),
						name:
							typeof body.name === 'string' && body.name.trim()
								? body.name.trim()
								: `Расписание ${this.state.school.schedules.length + 1}`,
						lessons: Array.isArray(body.lessons)
							? body.lessons.map((lesson) =>
									this.normalizeScheduleLesson(lesson)
							  )
							: []
					};
					this.state.school.schedules.push(schedule);
					this.persistState();
					return this.response(200, jsonClone(schedule));
				}
				if (ctx.method === 'POST' && third === 'dupe' && ctx.segments[3]) {
					const sourceId = toNumber(ctx.segments[3], 0);
					const source = this.state.school.schedules.find(
						(item) => item.id === sourceId
					);
					if (!source) {
						return this.notFound('schedule not found');
					}
					const dupe: ScheduleRecord = {
						id: this.getNextId(
							this.state.school.schedules.map((item) => item.id)
						),
						name: `${source.name} (копия)`,
						lessons: source.lessons.map((lesson) => ({ ...lesson }))
					};
					this.state.school.schedules.push(dupe);
					this.persistState();
					return this.response(200, jsonClone(dupe));
				}
				if ((ctx.method === 'PATCH' || ctx.method === 'DELETE') && third) {
					const scheduleId = toNumber(third, 0);
					const schedule = this.state.school.schedules.find(
						(item) => item.id === scheduleId
					);
					if (!schedule) {
						return this.notFound('schedule not found');
					}
					if (ctx.method === 'DELETE') {
						this.state.school.schedules = this.state.school.schedules.filter(
							(item) => item.id !== schedule.id
						);
						this.persistState();
						return this.response(200, jsonClone(schedule));
					}
					const body = (ctx.body || {}) as Record<string, unknown>;
					if (typeof body.name === 'string' && body.name.trim()) {
						schedule.name = body.name.trim();
					}
					if (Array.isArray(body.lessons)) {
						schedule.lessons = body.lessons.map((lesson) =>
							this.normalizeScheduleLesson(lesson)
						);
					}
					this.persistState();
					return this.response(200, jsonClone(schedule));
				}
			}

			if (second === 'assignments') {
				if (ctx.method === 'GET' && third === 'query') {
					const startDate = normalizeDate(ctx.query.get('start_date'));
					const endDate = normalizeDate(ctx.query.get('end_date'));
					if (!startDate || !endDate) {
						return this.badRequest('invalid date range');
					}
					const items = this.state.school.assignments
						.filter(
							(item) => item.start_date >= startDate && item.start_date <= endDate
						)
						.sort((a, b) => dateSortAsc(a.start_date, b.start_date));
					return this.response(200, jsonClone(items));
				}
				if (ctx.method === 'GET' && third === 'active') {
					const at = normalizeDate(ctx.query.get('at') || todayIsoDate());
					if (!at) {
						return this.badRequest('invalid date');
					}
					const sorted = this.state.school.assignments
						.slice()
						.sort((a, b) => dateSortAsc(a.start_date, b.start_date));
					let active: AssignmentRecord | null = null;
					for (const assignment of sorted) {
						if (assignment.start_date <= at) {
							active = assignment;
						} else {
							break;
						}
					}
					return this.response(200, active ? jsonClone(active) : null);
				}
				if (ctx.method === 'POST' && !third) {
					const body = (ctx.body || {}) as Record<string, unknown>;
					const startDate = normalizeDate(body.start_date);
					if (!startDate) {
						return this.badRequest('invalid start_date');
					}
					const assignment: AssignmentRecord = {
						id: this.getNextId(
							this.state.school.assignments.map((item) => item.id)
						),
						start_date: startDate,
						monday: body.monday as number | null,
						tuesday: body.tuesday as number | null,
						wednesday: body.wednesday as number | null,
						thursday: body.thursday as number | null,
						friday: body.friday as number | null,
						saturday: body.saturday as number | null,
						sunday: body.sunday as number | null
					};
					this.state.school.assignments.push(assignment);
					this.state.school.assignments.sort((a, b) =>
						dateSortAsc(a.start_date, b.start_date)
					);
					this.persistState();
					return this.response(200, jsonClone(assignment));
				}
				if ((ctx.method === 'PATCH' || ctx.method === 'DELETE') && third) {
					const assignmentId = toNumber(third, 0);
					const assignment = this.state.school.assignments.find(
						(item) => item.id === assignmentId
					);
					if (!assignment) {
						return this.notFound('assignment not found');
					}

					if (ctx.method === 'DELETE') {
						this.state.school.assignments = this.state.school.assignments.filter(
							(item) => item.id !== assignment.id
						);
						this.persistState();
						return this.response(200, jsonClone(assignment));
					}

					const body = (ctx.body || {}) as Record<string, unknown>;
					const nextDate =
						body.start_date === undefined
							? assignment.start_date
							: normalizeDate(body.start_date);
					if (!nextDate) {
						return this.badRequest('invalid start_date');
					}
					assignment.start_date = nextDate;
					if (Object.prototype.hasOwnProperty.call(body, 'monday')) {
						assignment.monday = body.monday as number | null;
					}
					if (Object.prototype.hasOwnProperty.call(body, 'tuesday')) {
						assignment.tuesday = body.tuesday as number | null;
					}
					if (Object.prototype.hasOwnProperty.call(body, 'wednesday')) {
						assignment.wednesday = body.wednesday as number | null;
					}
					if (Object.prototype.hasOwnProperty.call(body, 'thursday')) {
						assignment.thursday = body.thursday as number | null;
					}
					if (Object.prototype.hasOwnProperty.call(body, 'friday')) {
						assignment.friday = body.friday as number | null;
					}
					if (Object.prototype.hasOwnProperty.call(body, 'saturday')) {
						assignment.saturday = body.saturday as number | null;
					}
					if (Object.prototype.hasOwnProperty.call(body, 'sunday')) {
						assignment.sunday = body.sunday as number | null;
					}
					this.state.school.assignments.sort((a, b) =>
						dateSortAsc(a.start_date, b.start_date)
					);
					this.persistState();
					return this.response(200, jsonClone(assignment));
				}
			}

			if (second === 'overrides') {
				if (ctx.method === 'GET' && third === 'query') {
					const startDate = normalizeDate(ctx.query.get('start_date'));
					const endDate = normalizeDate(ctx.query.get('end_date'));
					if (!startDate || !endDate) {
						return this.badRequest('invalid date range');
					}
					const items = this.state.school.overrides
						.filter((item) => item.at >= startDate && item.at <= endDate)
						.sort((a, b) => dateSortAsc(a.at, b.at));
					return this.response(200, jsonClone(items));
				}

				if (ctx.method === 'POST' && !third) {
					const body = (ctx.body || {}) as Record<string, unknown>;
					const at = normalizeDate(body.at);
					if (!at) {
						return this.badRequest('invalid at date');
					}
					const endDate = ctx.query.get('end_date');
					const normalizedEnd = endDate ? normalizeDate(endDate) : at;
					if (!normalizedEnd) {
						return this.badRequest('invalid end_date');
					}

					const muteAllLessons = Boolean(body.mute_all_lessons);
					const muteLessons = ensureArray(body.mute_lessons as number[])
						.map((value) => toNumber(value, 0))
						.filter((value) => Number.isInteger(value) && value >= 0);

					const range = iterateDateRange(
						at <= normalizedEnd ? at : normalizedEnd,
						at <= normalizedEnd ? normalizedEnd : at
					);
					for (const date of range) {
						const existing = this.state.school.overrides.find((item) => item.at === date);
						if (existing) {
							existing.mute_all_lessons = muteAllLessons;
							existing.mute_lessons = [...muteLessons];
							continue;
						}
						this.state.school.overrides.push({
							id: this.getNextId(
								this.state.school.overrides.map((item) => item.id)
							),
							at: date,
							mute_all_lessons: muteAllLessons,
							mute_lessons: [...muteLessons]
						});
					}
					this.state.school.overrides.sort((a, b) => dateSortAsc(a.at, b.at));
					this.persistState();
					return this.response(200, { ok: true, updated: range.length });
				}
			}
		}

		if (root === 'lite') {
			if (second === 'bells') {
				if (ctx.method === 'GET' && !third) {
					return this.response(200, jsonClone(this.state.lite.bells));
				}
				if (ctx.method === 'PATCH' && !third) {
					const body = (ctx.body || {}) as Record<string, unknown>;
					if (typeof body.enabled === 'boolean') {
						this.state.lite.bells.enabled = body.enabled;
					}
					if (body.weekdays && typeof body.weekdays === 'object') {
						this.state.lite.bells.weekdays = {
							...this.state.lite.bells.weekdays,
							...(body.weekdays as BellsSettings['weekdays'])
						};
					}
					if (Array.isArray(body.lessons)) {
						this.state.lite.bells.lessons = body.lessons.map((lesson) => ({
							enabled: Boolean((lesson as any).enabled),
							start_at:
								typeof (lesson as any).start_at === 'string'
									? (lesson as any).start_at
									: '',
							start_sound:
								typeof (lesson as any).start_sound === 'string'
									? (lesson as any).start_sound
									: undefined,
							end_at:
								typeof (lesson as any).end_at === 'string'
									? (lesson as any).end_at
									: '',
							end_sound:
								typeof (lesson as any).end_sound === 'string'
									? (lesson as any).end_sound
									: undefined
						}));
					}
					this.persistState();
					return this.response(200, jsonClone(this.state.lite.bells));
				}
				if (ctx.method === 'PATCH' && third === 'lessons' && ctx.segments[3]) {
					const lessonId = toNumber(ctx.segments[3], -1);
					if (lessonId < 0 || lessonId >= this.state.lite.bells.lessons.length) {
						return this.notFound('lesson not found');
					}
					const body = (ctx.body || {}) as Record<string, unknown>;
					if (typeof body.enabled === 'boolean') {
						this.state.lite.bells.lessons[lessonId].enabled = body.enabled;
					}
					this.persistState();
					return this.response(200, jsonClone(this.state.lite.bells.lessons[lessonId]));
				}
			}

			if (second === 'announcements') {
				if (ctx.method === 'GET') {
					return this.response(200, jsonClone(this.state.lite.announcements));
				}
				if (ctx.method === 'PATCH') {
					const body = (ctx.body || {}) as Record<string, unknown>;
					if (typeof body.ring_sound === 'string') {
						this.state.lite.announcements.ring_sound = body.ring_sound;
					}
					this.persistState();
					return this.response(200, jsonClone(this.state.lite.announcements));
				}
			}
		}

		if (root === 'settings') {
			if (second === 'volume') {
				if (ctx.method === 'GET') {
					return this.response(200, {
						ok: true,
						volume: this.state.settings.volume
					});
				}
				if (ctx.method === 'PUT') {
					const body = (ctx.body || {}) as Record<string, unknown>;
					const volume = clamp(Math.round(toNumber(body.volume, 0)), 0, 100);
					this.state.settings.volume = volume;
					for (const item of this.runtime.sound_playback.values()) {
						item.audio.volume = volume / 100;
					}
					this.persistState();
					return this.response(200, { ok: true, volume });
				}
			}

			if (ctx.method === 'GET' && second === 'check_updates') {
				return this.response(200, {
					ok: true,
					status: 'updates_available',
					has_updates: true,
					backend_has_updates: true,
					frontend_has_updates: false
				});
			}

			if (ctx.method === 'POST' && second === 'update') {
				return this.response(200, {
					ok: true,
					status: 'success',
					backend_updated: true,
					frontend_updated: true
				});
			}

			if (ctx.method === 'POST' && second === 'reboot') {
				return this.response(200, true);
			}

			if (second === 'settings') {
				if (ctx.method === 'GET') {
					const payload = {
						ok: true,
						stub: true,
						schedules: ctx.query.get('schedules') ?? null,
						assignments: ctx.query.get('assignments') ?? null,
						overrides: ctx.query.get('overrides') ?? null,
						generated_at: new Date().toISOString()
					};
					return this.response(
						200,
						new Blob([JSON.stringify(payload, null, 2)], {
							type: 'application/json'
						}),
						{
							'content-type': 'application/json',
							'content-disposition':
								"attachment; filename*=UTF-8''school-settings-stub.json"
						}
					);
				}

				if (ctx.method === 'POST') {
					return this.response(200, {
						ok: true,
						stub: true,
						imported: true
					});
				}
			}
		}

		if (root === 'health' && ctx.method === 'GET') {
			return this.response(200, { ok: true });
		}

		if (root === 'certs' && ctx.method === 'GET') {
			if (second === 'download' || second === 'cert.cer') {
				const blob = new Blob([this.state.certs.content], {
					type: 'application/x-x509-ca-cert'
				});
				return this.response(200, blob, {
					'content-type': 'application/x-x509-ca-cert',
					'content-disposition': `attachment; filename=\"${this.state.certs.file_name}\"`
				});
			}
		}

		if (root === 'scripting') {
			if (ctx.method === 'GET' && second === 'scripts') {
				return this.response(200, jsonClone(this.state.scripting.scripts));
			}
			if (ctx.method === 'GET' && second === 'tasks') {
				return this.response(200, jsonClone(this.state.scripting.tasks));
			}
		}

		return this.notFound();
	}

	private handleLogin(body: unknown): MockResponse {
		const payload = (body || {}) as Record<string, unknown>;
		const username = typeof payload.username === 'string' ? payload.username : '';
		const password = typeof payload.password === 'string' ? payload.password : '';

		if (username === 'root') {
			if (password !== this.state.auth.root_password) {
				return {
					status: 401,
					data: {
						detail: 'bmaster.auth.invalid_credentials'
					}
				};
			}
			const token = this.createSession('root');
			return this.response(200, {
				access_token: token,
				token_type: 'bearer'
			});
		}

		const account = this.state.auth.accounts.find(
			(item) => item.name === username && !item.deleted
		);
		if (!account || account.password !== password) {
			return {
				status: 401,
				data: {
					detail: 'bmaster.auth.invalid_credentials'
				}
			};
		}

		const token = this.createSession('account', account.id);
		return this.response(200, {
			access_token: token,
			token_type: 'bearer'
		});
	}

	public async handleAxiosRequest(
		config: InternalAxiosRequestConfig
	): Promise<AxiosResponse> {
		const rawUrl = config.url || '';
		const fullUrl = new URL(rawUrl, 'http://mock.local');
		const path = normalizePath(fullUrl.pathname);
		const method = (config.method || 'get').toUpperCase();
		const query = mergeQueryParams(fullUrl.searchParams, config.params);
		const body = await this.parseRequestBody(config);
		const identity = this.resolveIdentity(config);

		const response = await this.routeRequest({
			method,
			path,
			segments: path.split('/').filter(Boolean),
			query,
			body,
			config,
			identity
		});

		const axiosResponse = this.makeAxiosResponse(config, response);
		if (this.shouldResolveStatus(axiosResponse.status, config)) {
			return axiosResponse;
		}

		throw new AxiosError(
			`Request failed with status code ${axiosResponse.status}`,
			undefined,
			config,
			axiosResponse.request,
			axiosResponse
		);
	}

	public canHandleWebSocket(url: string): boolean {
		const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://mock.local');
		const normalizedPath = normalizePath(parsed.pathname);
		return normalizedPath === 'queries/stream';
	}

	public openStreamSession(
		url: string,
		transport: StreamSessionTransport
	): StreamSessionHandle {
		const parsed = new URL(
			url,
			typeof window !== 'undefined' ? window.location.origin : 'http://mock.local'
		);
		const token = parsed.searchParams.get('token');
		const identity = this.resolveIdentityByToken(token);
		if (!identity) {
			queueMicrotask(() => {
				transport.send(
					JSON.stringify({ type: 'error', error: 'invalid token' })
				);
				transport.close(4001, 'invalid token');
			});
			return {
				onClientData: () => undefined,
				onClientClose: () => undefined
			};
		}

			const sessionId = randomId();
		const session: StreamSessionState = {
			id: sessionId,
			identity,
			transport,
			query_id: undefined,
			closed: false
		};
		this.streamSessions.set(sessionId, session);

		const stopStreamQuery = () => {
			if (!session.query_id) {
				return;
			}
			this.finishQuery(session.query_id, 'cancelled');
			session.query_id = undefined;
		};

		const onClientData = (data: unknown) => {
			if (session.closed) {
				return;
			}

			if (typeof data === 'string') {
				let message: Record<string, unknown>;
				try {
					message = JSON.parse(data) as Record<string, unknown>;
				} catch {
					session.transport.send(
						JSON.stringify({ type: 'error', error: 'validation error' })
					);
					return;
				}

				if (message.type === 'stop') {
					stopStreamQuery();
					session.transport.send(JSON.stringify({ type: 'stopped' }));
					return;
				}

				if (message.type !== 'start') {
					session.transport.send(
						JSON.stringify({ type: 'error', error: 'validation error' })
					);
					return;
				}

				const icomId = typeof message.icom === 'string' ? message.icom : '';
				const priority = clamp(toNumber(message.priority, 0), -100, 100);
				const force = Boolean(message.force);
				if (!icomId) {
					session.transport.send(
						JSON.stringify({ type: 'error', error: 'validation error' })
					);
					return;
				}
				const icom = this.state.icoms.items.find((item) => item.id === icomId);
				if (!icom) {
					session.transport.send(
						JSON.stringify({ type: 'error', error: 'icom not found' })
					);
					return;
				}

				stopStreamQuery();

					const query: RuntimeQuery = {
						id: randomId(),
					type: 'api.stream',
					icom: icom.id,
					priority,
					force,
					status: 'waiting',
					author: this.toQueryAuthor(session.identity),
					created_at: Date.now(),
					updated_at: Date.now(),
					lifecycle: {
						onWaiting: () => {
							session.transport.send(JSON.stringify({ type: 'waiting' }));
						},
						onPlaying: () => {
							session.transport.send(JSON.stringify({ type: 'started' }));
						},
						onStopped: () => {
							session.transport.send(JSON.stringify({ type: 'stopped' }));
						}
					}
				};
				session.query_id = query.id;
				this.runtime.stream_stats.set(query.id, {
					bytes: 0,
					chunks: 0,
					buffers: []
				});
				this.enqueueQuery(query);
				return;
			}

			const isArrayBuffer = data instanceof ArrayBuffer;
			const isBlob = data instanceof Blob;
			if (!isArrayBuffer && !isBlob) {
				return;
			}
			if (!session.query_id) {
				return;
			}
			const query = this.runtime.queries.get(session.query_id);
			if (!query || query.status !== 'playing') {
				return;
			}

			const stats = this.runtime.stream_stats.get(session.query_id);
			if (!stats) {
				return;
			}

			if (isArrayBuffer) {
				stats.bytes += data.byteLength;
				stats.chunks += 1;
				stats.buffers.push(data.slice(0));
			} else {
				stats.bytes += data.size;
				stats.chunks += 1;
				void data.arrayBuffer().then((buffer) => {
					stats.buffers.push(buffer);
					if (stats.buffers.length > 24) {
						stats.buffers.splice(0, stats.buffers.length - 24);
					}
				});
				return;
			}

			if (stats.buffers.length > 24) {
				stats.buffers.splice(0, stats.buffers.length - 24);
			}
		};

		const onClientClose = () => {
			if (session.closed) {
				return;
			}
			session.closed = true;
			if (session.query_id) {
				this.finishQuery(session.query_id, 'cancelled');
				session.query_id = undefined;
			}
			this.streamSessions.delete(session.id);
		};

		return {
			onClientData,
			onClientClose
		};
	}

	public async resolveSoundObjectUrl(
		soundName: string
	): Promise<string | undefined> {
		const record = await getSoundBlobRecord(soundName);
		if (!record) {
			return undefined;
		}
		return URL.createObjectURL(record.blob);
	}

	public async reset(): Promise<void> {
		const schedulerWasRunning = this.schedulerIntervalId !== null;
		this.stopScheduler();
		for (const timerId of this.runtime.query_timers.values()) {
			window.clearTimeout(timerId);
		}
		for (const queryId of Array.from(this.runtime.sound_playback.keys())) {
			this.stopSoundPlayback(queryId);
		}
		this.runtime = this.createEmptyRuntime();
		this.initializeIcomRuntime();

		for (const session of this.streamSessions.values()) {
			if (!session.closed) {
				session.closed = true;
				session.transport.close(4000, 'reset');
			}
		}
		this.streamSessions.clear();

		this.state = makeSeedState();
		this.persistState();
		await clearSoundBlobStore();
		if (typeof window !== 'undefined') {
			window.localStorage.removeItem('bmaster.auth.token');
		}
		this.resetSchedulerState(Date.now());
		if (schedulerWasRunning) {
			this.startScheduler();
		}
	}

	public installDevApi(): void {
		if (typeof window === 'undefined') {
			return;
		}
		this.startScheduler();
		window.__bmasterMock = {
			reset: async () => {
				await this.reset();
			}
		};
	}
}

export const mockBackend = new MockBackend();

export const mockAxiosAdapter: AxiosAdapter = async (
	config: InternalAxiosRequestConfig
) => {
	return await mockBackend.handleAxiosRequest(config);
};

export type { StreamSessionHandle, StreamSessionTransport };
