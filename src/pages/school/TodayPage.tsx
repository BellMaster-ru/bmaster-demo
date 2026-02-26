// @ts-nocheck
import React, { createContext, useContext, useState } from 'react';
import {
	BellsSettings,
	getBellsSettings,
	Lesson,
	patchBellsSettings,
	patchLesson
} from '@/api/lite/bells';
import ForegroundNotification from '@/components/ForegroundNotification';
import PageLayout from '@/components/PageLayout';
import { useSounds } from '@/sounds';
import { cn, countMinutes, formatDate } from '@/utils';
import {
	useMutation,
	UseMutationResult,
	useQuery,
	useQueryClient,
	UseQueryResult
} from '@tanstack/react-query';
import { Card, Form, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
	Floppy,
	FloppyFill,
	PencilFill,
	PencilSquare,
	Plus,
	Trash,
	X,
	XCircle,
	XCircleFill,
	XLg,
	XOctagon
} from 'react-bootstrap-icons';
import { Typeahead } from 'react-bootstrap-typeahead';
import { Panel } from '@/components/Panel';
import { H2, Name, Note, Value } from '@/components/text';
import { Button } from '@/components/Button';
import Field from '@/components/Field';
import {
	getSchedules,
	ScheduleInfo,
	ScheduleLesson
} from '@/api/school/schedules';
import { getActiveAssignment } from '@/api/school/assignments';
import {
	createOverride,
	getOverridesByDateRange
} from '@/api/school/overrides';

/* ---------------- Context ---------------- */
export type TodayLessonsContext = {
	muteAllLessons: boolean;
	muteLessons: Set<number>;
	// updateMuteLessons: (muteLessons: Set<number>) => void;
	overrideMutation: UseMutationResult;
	update(): () => void;
};
// setEditingLessons: (lessons: Lesson[] | undefined) => void;

/* ---------------- LessonCard ---------------- */
const LessonCard = ({
	lesson_num,
	lesson,
	ctx,
	...attrs
}: {
	lesson_num: number;
	lesson: ScheduleLesson;
	ctx: TodayLessonsContext;
} & React.HTMLAttributes<HTMLDivElement>) => {
	const lessonDisabled = ctx.muteLessons.has(lesson_num);

	let disabledReason = undefined;
	if (lessonDisabled) disabledReason = 'звонки урока выключены';
	else if (ctx.muteAllLessons) disabledReason = 'все звонки выключены';

	return (
		<Panel className='flex flex-col rounded-lg' {...attrs}>
			<Panel.Header className='flex items-center gap-3 p-3'>
				<Form.Check
					type='switch'window
					disabled={ctx.overrideMutation.isPending}
					onChange={(e) => {
						if (e.target.checked) {
							ctx.muteLessons.delete(lesson_num);
							ctx.update();
						} else {
							ctx.muteLessons.add(lesson_num);
							ctx.update();
						}
					}}
					checked={!lessonDisabled}
				/>

				<div className='flex items-baseline gap-2'>
					<Value>{lesson_num + 1}</Value>
					<Name>урок</Name>
				</div>

				{disabledReason && <Note>Выключен: {disabledReason}</Note>}
			</Panel.Header>

			<div className='flex flex-col sm:flex-row gap-4 p-3 bg-blue-50'>
				<Field>
					<Name>Начало</Name>
					<Value>{lesson.start_at}</Value>
				</Field>

				<Field>
					<Name>Звук (начало)</Name>
					<Value>
						{lesson.start_sound || (
							<label className='text-gray-500'>отсутствует</label>
						)}
					</Value>
				</Field>
			</div>

			<div className='flex flex-col sm:flex-row gap-4 p-3 bg-green-50'>
				<Field>
					<Name>Конец</Name>
					<Value>{lesson.end_at}</Value>
				</Field>

				<Field>
					<Name>Звук (конец)</Name>
					<Value>
						{lesson.end_sound || (
							<label className='text-gray-500'>отсутствует</label>
						)}
					</Value>
				</Field>
			</div>
		</Panel>
	);
};

const TodayPage = () => {
	const today = new Date();

	const queryClient = useQueryClient();

	const schedulesQuery = useQuery({
		queryKey: ['school.schedules'],
		queryFn: () => getSchedules()
	});
	console.log(schedulesQuery);

	let schedulesById: Record<string, ScheduleInfo> | null = null;
	if (schedulesQuery.data) {
		schedulesById = {};
		schedulesQuery.data.forEach((schedule: any) => {
			schedulesById[schedule.id] = schedule;
		});
	}

	const activeAssignmentQuery = useQuery({
		queryKey: ['school.assignment'],
		queryFn: () => getActiveAssignment(formatDate(today))
	});
	console.log(activeAssignmentQuery);

	const weekdayNormalMap = {
		0: 6,
		1: 0,
		2: 1,
		3: 2,
		4: 3,
		5: 4,
		6: 5
	};
	const weekdayApiNames = [
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday'
	];

	const wd = weekdayApiNames[weekdayNormalMap[today.getDay()]];
	console.log(wd);
	const scheduleId =
		(activeAssignmentQuery.data && activeAssignmentQuery.data[wd]) || null;

	const schedule =
		(scheduleId !== null && schedulesById && schedulesById[scheduleId]) || null;
	console.log(schedule);

	const displayLessons = schedule && schedule.lessons;

	const activeOverrideQuery = useQuery({
		queryKey: ['school.override'],
		queryFn: () => getOverridesByDateRange(today, today)
	});

	console.log(activeOverrideQuery);
	const activeOverride =
		(activeOverrideQuery.data && activeOverrideQuery.data[0]) || null;

	const muteAllLessons = activeOverride
		? activeOverride.mute_all_lessons
		: false;
	const muteLessons = new Set<number>(activeOverride?.mute_lessons || []);

	const overrideMutation = useMutation({
		mutationKey: ['school.override'],
		mutationFn: ({
			muteAllLessons,
			muteLessons
		}: {
			muteAllLessons: boolean;
			muteLessons: number[];
		}) =>
			createOverride({
				at: formatDate(today),
				mute_all_lessons: muteAllLessons,
				mute_lessons: muteLessons
			}),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ['school.override']
			})
	});

	const update = () => {
		overrideMutation.mutate({
			muteAllLessons,
			muteLessons: Array.from(muteLessons)
		});
	};

	const ctx: TodayLessonsContext = {
		muteAllLessons,
		muteLessons,
		overrideMutation,
		update
	};

	return (
		<PageLayout pageTitle='Звонки сегодня'>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{/* Левая часть — список уроков */}
				<div className='lg:col-span-2 min-w-0'>
					<Panel>
						<Panel.Header className='flex items-center justify-between'>
							<div className='flex items-center gap-3'>
								<div className='flex items-center gap-3 text-slate-600'>
									<Form.Check
										disabled={overrideMutation.isPending}
										checked={!muteAllLessons}
										onChange={(e) =>
											overrideMutation.mutate({
												muteAllLessons: !e.target.checked,
												muteLessons: Array.from(muteLessons)
											})
										}
										type='switch'
									/>
									<H2>Звонки {muteAllLessons ? 'включены' : 'выключены'}</H2>
								</div>
							</div>
						</Panel.Header>

						<Panel.Body className='space-y-4'>
							{!displayLessons || displayLessons.length === 0 ? (
								<div className='text-gray-500 text-center py-8'>
									<div className='flex items-center justify-center space-x-2'>
										<span>Уроков нет</span>
									</div>
								</div>
							) : (
								displayLessons.map((lesson, lesson_num) => {
									let breakDisplay = null;
									if (lesson_num !== 0) {
										const prevLesson = displayLessons[lesson_num - 1];
										const breakDuration =
											lesson.start_at && prevLesson.end_at
												? countMinutes(lesson.start_at) -
												  countMinutes(prevLesson.end_at)
												: null;
										breakDisplay = (
											<div
												className={cn(
													'flex items-center gap-3 py-2 px-4 text-gray-500',
													breakDuration !== null && breakDuration > 0
														? ''
														: 'text-red-500'
												)}
											>
												<Name>Перемена</Name>
												<Value>
													{breakDuration !== null
														? `${breakDuration} мин`
														: '-- мин'}
												</Value>
												{/* {breakDuration < 1 && (
																					<div className='text-red-500 text-sm'>
																						пересечение времени
																					</div>
																				)} */}
											</div>
										);
									}

									return (
										<div key={lesson_num}>
											{breakDisplay}
											<LessonCard
												ctx={ctx}
												lesson={lesson}
												lesson_num={lesson_num}
											/>
										</div>
									);
								})
							)}
						</Panel.Body>
					</Panel>
				</div>

				{/* Правая панель — всякая инфа */}
				{/* <div>
					<Panel>
						<Panel.Header>
							<H2>Детали</H2>
							<Note>Управление шаблонами и быстрыми действиями</Note>
						</Panel.Header>

						<Panel.Body className='space-y-5'>
							<Field>
								<Name>Рабочее время</Name>
								<Value>
									{workTime ? `${workTime.start} — ${workTime.end}` : '—'}
								</Value>
								<Note>С начала 1-го урока и до конца последнего</Note>
							</Field>
							<hr />
							<Field>
								<Name>Состояние расписания</Name>
								<div className='flex items-center gap-2'>
									<div
										className={`px-2 py-1 rounded text-sm font-medium ${
											bellsSettings.enabled
												? 'bg-green-50 text-green-700'
												: 'bg-red-50 text-red-700'
										}`}
									>
										{bellsSettings.enabled ? 'Включено' : 'Выключено'}
									</div>
									<Note>({enabledLessons.length} уроков)</Note>
								</div>
							</Field>
						</Panel.Body>
					</Panel>
				</div> */}
			</div>

		</PageLayout>
	);
};

export default TodayPage;
