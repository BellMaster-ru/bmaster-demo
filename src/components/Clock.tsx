import { getActiveAssignment } from '@/api/school/assignments';
import { getOverridesByDateRange } from '@/api/school/overrides';
import { getSchedules } from '@/api/school/schedules';
import { countMinutes, formatDate } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ClockFill } from 'react-bootstrap-icons';

const weekdayApiNames = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
];

const formatMinutes = (minutes: number) => {
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;

	if (hours < 1) return `${remainder} мин`;
	if (remainder === 0) return `${hours} ч`;
	return `${hours} ч ${remainder} мин`;
};

const toSeconds = (value: string) => {
	if (!value) return null;
	const minutes = countMinutes(value);
	if (Number.isNaN(minutes)) return null;
	return minutes * 60;
};

export default function Clock() {
	const [time, setTime] = useState(new Date());
	const [showColon, setShowColon] = useState(true);
	const dateKey = formatDate(time);

	const schedulesQuery = useQuery({
		queryKey: ['school.schedules'],
		queryFn: () => getSchedules()
	});

	const activeAssignmentQuery = useQuery({
		queryKey: ['school.assignment.active', dateKey],
		queryFn: () => getActiveAssignment(dateKey),
		refetchInterval: 60 * 1000
	});
	const activeOverrideQuery = useQuery({
		queryKey: ['school.override', dateKey],
		queryFn: () => getOverridesByDateRange(dateKey, dateKey),
		refetchInterval: 60 * 1000
	});

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(new Date());
			setShowColon((prev) => !prev);
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	const hours = time.getHours().toString().padStart(2, '0');
	const minutes = time.getMinutes().toString().padStart(2, '0');
	const dayName = weekdayApiNames[time.getDay()];
	const scheduleId = activeAssignmentQuery.data?.[dayName] ?? null;
	const schedule =
		scheduleId && schedulesQuery.data
			? schedulesQuery.data.find((item) => item.id === scheduleId) || null
			: null;
	const activeOverrides = activeOverrideQuery.data || [];
	const muteAllLessons = activeOverrides.some((item) => item.mute_all_lessons);
	const muteLessons = new Set<number>(
		activeOverrides.flatMap((item) => item.mute_lessons || [])
	);

	const countdownLabel = useMemo(() => {
		if (
			schedulesQuery.isLoading ||
			activeAssignmentQuery.isLoading ||
			activeOverrideQuery.isLoading
		) {
			return 'Загрузка расписания...';
		}

		const lessons = schedule?.lessons || [];
		if (lessons.length === 0) {
			return 'Уроков сегодня нет';
		}
		if (muteAllLessons) {
			return 'Все звонки на сегодня выключены';
		}

		const nowSeconds =
			time.getHours() * 3600 + time.getMinutes() * 60 + time.getSeconds();
		const normalizedLessons = lessons
			.map((lesson, index) => ({
				index,
				start: toSeconds(lesson.start_at),
				end: toSeconds(lesson.end_at)
			}))
			.filter(
				(lesson) =>
					lesson.start !== null && lesson.end !== null && lesson.end > lesson.start
			)
			.filter((lesson) => !muteLessons.has(lesson.index))
			.sort((a, b) => a.start - b.start);
		if (normalizedLessons.length === 0) {
			return 'Звонки на сегодня выключены';
		}

		for (const lesson of normalizedLessons) {
			if (nowSeconds < lesson.start) {
				const leftMinutes = Math.ceil((lesson.start - nowSeconds) / 60);
				return `До начала урока ${formatMinutes(leftMinutes)}`;
			}

			if (nowSeconds >= lesson.start && nowSeconds < lesson.end) {
				const leftMinutes = Math.ceil((lesson.end - nowSeconds) / 60);
				return `До конца урока ${formatMinutes(leftMinutes)}`;
			}
		}

		return 'Уроки на сегодня закончились';
	}, [
		activeAssignmentQuery.isLoading,
		activeOverrideQuery.isLoading,
		muteAllLessons,
		muteLessons,
		schedule,
		schedulesQuery.isLoading,
		time
	]);

	const dateLabel = time.toLocaleDateString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});

	return (
		<div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm md:gap-3 md:rounded-xl md:px-3 md:py-2'>
			<div className='flex flex-col items-start text-slate-700'>
				<div className='text-base font-semibold font-mono leading-none tracking-tight md:text-lg'>
					{hours}
					<span className={showColon ? '' : 'opacity-0'}>:</span>
					{minutes}
					<ClockFill className='items-center justify-center ml-1 inline-block text-gray-600' size={16} />
				</div>
				<div className='text-[0.65rem] leading-tight text-slate-500 md:text-[0.7rem]'>
					{dateLabel}
				</div>
				<div className='text-[0.66rem] leading-tight text-slate-500 md:text-[0.72rem]'>
					{countdownLabel}
				</div>
			</div>
		</div>
	);
}
