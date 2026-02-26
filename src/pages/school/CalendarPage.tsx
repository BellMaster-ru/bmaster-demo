import { useEffect, useState, type PointerEvent } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'tailwindcss/tailwind.css';
import { H2, Note } from '@/components/text';
import { Form } from 'react-bootstrap';
import Panel from '@/components/Panel';
import { Typeahead } from 'react-bootstrap-typeahead';
import {
	BellSlashFill,
	CaretLeftFill,
	CaretRightFill,
	ClockFill
} from 'react-bootstrap-icons';
import PageLayout from '@/components/PageLayout';
import { cn, fromDateFormat, formatDate } from '@/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	updateAssignment,
	createAssignment,
	deleteAssignment,
	getAssignmentsByDateRange,
	ScheduleAssignmentInfo,
	getActiveAssignment,
	ScheduleWeekdays
} from '@/api/school/assignments';
import {
	createOverride,
	getOverridesByDateRange,
	ScheduleOverrideInfo
} from '@/api/school/overrides';
import { getSchedules, ScheduleInfo } from '@/api/school/schedules';

const CalendarPage = () => {
	const queryClient = useQueryClient();

	const today = new Date();

	const [dayA, setDayA] = useState<number | null>(today.getDate());
	const [dayB, setDayB] = useState<number | null>(null);

	let startDay: number | null = null;
	let endDay: number | null = null;
	if (dayA !== null) {
		if (dayB !== null) {
			if (dayB > dayA) {
				startDay = dayA;
				endDay = dayB;
			} else {
				startDay = dayB;
				endDay = dayA;
			}
		} else startDay = dayA;
	}

	const [monthIndex, setMonthIndex] = useState<number>(today.getMonth());
	const [year, setYear] = useState<number>(today.getFullYear());
	const [ringStates, setRingStates] = useState([true, false, false, false]);
	const [brushing, setBrushing] = useState<boolean>(false);

	const startDate: Date | null =
		startDay !== null ? new Date(year, monthIndex, startDay) : null;
	const endDate: Date | null =
		endDay !== null ? new Date(year, monthIndex, endDay) : null;

	const toggleRing = (index: number) => {
		const newStates = [...ringStates];
		newStates[index] = !newStates[index];
		setRingStates(newStates);
	};

	const weekdayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
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
	const monthNames = [
		'Январь',
		'Февраль',
		'Март',
		'Апрель',
		'Май',
		'Июнь',
		'Июль',
		'Август',
		'Сентябрь',
		'Октябрь',
		'Ноябрь',
		'Декабрь'
	];

	const monthStart = new Date(year, monthIndex, 1);
	const monthEnd = new Date(year, monthIndex + 1, 0);
	const monthDayCount = monthEnd.getDate();

	const schedulesQuery = useQuery({
		queryFn: () => getSchedules(),
		queryKey: ['school.schedules']
	});

	let schedulesById: Record<string, any> | null = null;
	if (schedulesQuery.isFetched && schedulesQuery.data) {
		schedulesById = {};
		schedulesQuery.data.forEach((schedule: any) => {
			schedulesById[schedule.id] = schedule;
		});
	}

	const assignmentsQuery = useQuery({
		queryKey: ['school.assignments.month', year, monthIndex],
		queryFn: () => getAssignmentsByDateRange(monthStart, monthEnd)
	});

	const prevAssignment = useQuery({
		queryKey: ['school.assignments.prev', year, monthIndex],
		queryFn: () => getActiveAssignment(formatDate(monthStart))
	});

	let assignmentsByDay: Record<number, ScheduleAssignmentInfo> | null = null;
	let activeAssignment = prevAssignment.data;
	if (assignmentsQuery.isFetched && assignmentsQuery.data) {
		assignmentsByDay = {};
		assignmentsQuery.data.forEach((assignment: ScheduleAssignmentInfo) => {
			const day = fromDateFormat(assignment.start_date).getDate();
			assignmentsByDay[day] = assignment;
			if (day <= dayA) activeAssignment = assignment;
		});
	}

	const currentAssignment =
		assignmentsByDay !== null ? assignmentsByDay[dayA] || null : null;

	const assignmentsMutation = useMutation({
		mutationKey: ['school.assignments.month', year, monthIndex],
		mutationFn: (weekdays: ScheduleWeekdays) => {
			if (weekdays !== null)
				if (currentAssignment !== null)
					return updateAssignment(currentAssignment.id, weekdays);
				else
					return createAssignment({
						start_date: formatDate(startDate),
						...weekdays
					});
			else return deleteAssignment(currentAssignment.id);
		},
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ['school.assignments.month', year, monthIndex]
			})
	});

	const overridesQuery = useQuery({
		queryKey: ['school.overrides.month', year, monthIndex],
		queryFn: () => getOverridesByDateRange(monthStart, monthEnd)
	});

	const overridesMutation = useMutation({
		mutationKey: ['school.overrides.month', year, monthIndex],
		mutationFn: ({
			muteAllLessons,
			muteLessons
		}: {
			muteAllLessons: boolean;
			muteLessons: number[];
		}) =>
			createOverride(
				{
					at: formatDate(startDate),
					mute_all_lessons: muteAllLessons,
					mute_lessons: muteLessons
				},
				endDate !== null ? formatDate(endDate) : undefined
			),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ['school.overrides.month', year, monthIndex]
			})
	});

	let overridesByDay: Record<number, ScheduleOverrideInfo> | null = null;
	if (overridesQuery.isFetched && overridesQuery.data) {
		overridesByDay = {};
		overridesQuery.data.forEach((override: any) => {
			overridesByDay[fromDateFormat(override.at).getDate()] = override;
		});
	}

	const switchNextMonth = () => {
		if (monthIndex >= 11) {
			setMonthIndex(0);
			setYear(year + 1);
		} else setMonthIndex(monthIndex + 1);
	};

	const switchPrevMonth = () => {
		if (monthIndex <= 0) {
			setMonthIndex(11);
			setYear(year - 1);
		} else setMonthIndex(monthIndex - 1);
	};

	const updateRangeEnd = (day: number) => {
		if (!brushing || dayA === null) {
			return;
		}

		if (day === dayA) {
			setDayB((prev) => (prev === null ? prev : null));
			return;
		}

		setDayB((prev) => {
			if (prev === day) {
				return prev;
			}
			return day;
		});
	};

	const getCalendarDayFromPoint = (clientX: number, clientY: number) => {
		const element = document.elementFromPoint(clientX, clientY);
		const dayElement = element?.closest('[data-calendar-day]');
		const dayRaw = dayElement?.getAttribute('data-calendar-day');
		const day = dayRaw ? Number(dayRaw) : Number.NaN;

		if (!Number.isInteger(day) || day < 1 || day > monthDayCount) {
			return null;
		}

		return day;
	};

	const handleDayPointerDown = (
		event: PointerEvent<HTMLDivElement>,
		day: number
	) => {
		if (event.pointerType === 'mouse' && event.shiftKey && dayA !== null) {
			if (day !== dayA) {
				setDayB(day);
			}
			return;
		}

		event.preventDefault();
		setDayA(day);
		setDayB(null);
		setBrushing(true);
	};

	// Reset day selection after month change
	useEffect(() => {
		setDayA(
			monthIndex === today.getMonth() && year === today.getFullYear()
				? today.getDate()
				: null
		);
		setDayB(null);
	}, [monthIndex, year]);

	useEffect(() => {
		const listener = () => setBrushing(false);
		if (brushing) {
			window.addEventListener('pointerup', listener);
			window.addEventListener('pointercancel', listener);
		}
		return () => {
			window.removeEventListener('pointerup', listener);
			window.removeEventListener('pointercancel', listener);
		};
	}, [brushing]);

	useEffect(() => {
		const listener = (event: globalThis.PointerEvent) => {
			if (!brushing) {
				return;
			}

			if (event.pointerType === 'mouse' && (event.buttons & 1) !== 1) {
				return;
			}

			const day = getCalendarDayFromPoint(event.clientX, event.clientY);
			if (day !== null) {
				updateRangeEnd(day);
			}
		};

		if (brushing) {
			window.addEventListener('pointermove', listener);
		}

		return () => {
			window.removeEventListener('pointermove', listener);
		};
	}, [brushing, monthDayCount, dayA]);

	useEffect(
		() => console.log(activeAssignment),
		[assignmentsByDay, overridesByDay, schedulesById, schedulesQuery.data]
	);

	let muteAllLessons = false;
	let muteLessons = new Set<number>();
	if (overridesByDay) {
		Object.entries(overridesByDay).forEach(
			// @ts-ignore TODO: convert number
			([day, override]: [number, ScheduleOverrideInfo]) => {
				if (
					day == startDay ||
					(endDay !== null && day >= startDay && day <= endDay)
				) {
					if (override.mute_all_lessons) muteAllLessons = true;
					for (const mutedLesson of override.mute_lessons) {
						muteLessons.add(mutedLesson);
					}
				}
			}
		);
	}

	const displayAssignment = currentAssignment || activeAssignment;

	type LessonTime = { start_at: string; end_at: string };
	let selectedDaysLessons: (LessonTime | null)[] = [];

	console.log(startDay, endDay);

	if (startDay !== null && schedulesById && assignmentsByDay) {
		const isEqual = (a: LessonTime, b: LessonTime) =>
			typeof a === 'object' &&
			a !== null &&
			typeof b === 'object' &&
			b !== null &&
			a.start_at === b.start_at &&
			a.end_at === b.end_at;

		let lastAssignment = activeAssignment;
		let lastWeekday = weekdayNormalMap[startDate.getDay()];
		selectedDaysLessons = Array.from(
			(lastAssignment &&
				schedulesById[lastAssignment[weekdayApiNames[lastWeekday]]]?.lessons) ||
				[]
		);
		console.log('SELECTED DAYS 2 LESSONS:', selectedDaysLessons);

		if (endDay !== null) {
			for (let day = startDay + 1; day <= endDay; day++) {
				lastAssignment = assignmentsByDay[day] || lastAssignment;
				if (lastWeekday < 7) lastWeekday++;
				else lastWeekday = 1;

				const schedule =
					(lastAssignment &&
						schedulesById[lastAssignment[weekdayApiNames[lastWeekday]]]
							?.lessons) ||
					[];

				for (
					let i = 0;
					i < Math.max(selectedDaysLessons.length, schedule.length);
					i++
				) {
					if (!isEqual(schedule[i], selectedDaysLessons[i])) {
						selectedDaysLessons[i] = null;
					}
				}
			}
		}
	}

	console.log('SELECTED DAYS LESSONS:', selectedDaysLessons);

	// СКРИПТ МОМЕНТ
	let firstDayAssignment: ScheduleAssignmentInfo | null = null;
	if (startDay !== null) {
		const dayForTime = startDay;
		firstDayAssignment =
			assignmentsByDay && assignmentsByDay[dayForTime]
				? assignmentsByDay[dayForTime]
				: activeAssignment;
	}
	console.log(firstDayAssignment);
	return (
		<PageLayout pageTitle='Календарь' className='max-w-[50rem]'>
				<div className='grid grid-cols-1 items-start gap-4 xl:grid-cols-[22rem_24rem] xl:justify-center'>
					<div className='mx-auto flex w-full min-w-0 max-w-[22rem] flex-col'>
						{/* Calendar */}
						<Panel className='w-full'>
						<Panel.Header className='flex px-4 py-2'>
							<H2 className='m-auto flex items-center gap-3'>
								<button
									className='ring-[0.15rem] ring-transparent rounded-sm hover:ring-slate-500'
									onClick={() => switchPrevMonth()}
								>
									<CaretLeftFill />
								</button>
								<button className='min-w-36 underline-offset-4 hover:underline'>
									{monthNames[monthIndex]} {year}
								</button>
								<button
									className='ring-[0.15rem] ring-transparent rounded-sm hover:ring-slate-500'
									onClick={() => switchNextMonth()}
								>
									<CaretRightFill />
								</button>
							</H2>
						</Panel.Header>

						<Panel.Body className='p-3 flex flex-col gap-1'>
							<div className='m-auto'>
								<div className='grid grid-cols-7 text-center font-bold'>
									{weekdayNames.map((day) => (
										<div key={day}>{day}</div>
									))}
								</div>

									<div className='grid grid-cols-7 select-none text-center gap-[0.2rem]'>
										{[...Array(weekdayNormalMap[monthStart.getDay()])].map(
											(_, i) => (
												<div />
											)
										)}
										{[...Array(monthDayCount)].map((_, i) => {
										const day = i + 1;
										const isSelected =
											startDay === day ||
											(endDay !== null
												? day >= startDay && day <= endDay
												: false);
										const overrides =
											overridesByDay !== null ? overridesByDay[day] : null;
										const assignment =
											assignmentsByDay !== null ? assignmentsByDay[day] : null;
											return (
												<div
													key={day}
													data-calendar-day={day}
													className={cn(
														'w-8 relative h-8 sm:w-10 sm:h-10 flex rounded-md cursor-pointer items-center text-base sm:text-lg touch-none',
														isSelected
															? ' bg-blue-100 text-blue-900' +
																	(endDay === null
																		? ''
																		: day === startDay
																			? ' rounded-l-xl'
																			: day === endDay
																				? ' rounded-r-xl'
																				: 'bg-blue-100')
															: ' hover:bg-gray-100',
														day == dayA && 'ring-inset ring-2 ring-blue-300'
													)}
													onPointerDown={(event) =>
														handleDayPointerDown(event, day)
													}
													onPointerEnter={() => updateRangeEnd(day)}
													onPointerMove={() => updateRangeEnd(day)}
												>
												<span
													className={cn(
														'm-auto',
														year === today.getFullYear() &&
															monthIndex === today.getMonth() &&
															day === today.getDate() &&
															'text-blue-600 font-bold'
													)}
												>
													{day}
												</span>
												<div className='absolute flex right-1 bottom-[0.25rem] text-[0.6rem]'>
													{overrides && (
														<BellSlashFill
															className={
																overrides.mute_all_lessons
																	? 'text-red-400'
																	: 'text-gray-600'
															}
														/>
													)}
													{assignment && (
														<ClockFill className='text-blue-400 ' />
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</Panel.Body>
							<div className='p-3 border-t-2'>
								<Note className='flex flex-col gap-2'>
									<div>
										<p>Выберите день или диапазон для внесения изменений.</p>
										<p>• Клик — выбрать день</p>
										<p>• Удерживать/свайп — выбрать диапазон</p>
									</div>
								<hr />
								<div>
									<p className='font-semibold mb-2'>Легенда:</p>
									<p>
										• <ClockFill className='inline text-blue-400' /> — новое
										расписание
									</p>
									<p>
										• <BellSlashFill className='inline text-red-400' /> —
										выключены все звонки
									</p>
									<p>
										• <BellSlashFill className='inline text-gray-600' /> —
										выключен отдельный звонок
									</p>
								</div>
							</Note>
						</div>
					</Panel>
				</div>
					{/* Right panel */}
						<div className='mx-auto flex w-full min-w-0 max-w-[24rem] flex-col gap-3'>
					<Panel className='relative'>
						<Panel.Header className='p-2'>
							<H2 className='flex'>
								<Form.Check
									type='switch'
									disabled={overridesByDay === null}
									className='my-auto'
									onChange={(e) =>
										overridesMutation.mutate({
											muteAllLessons: !e.target.checked,
											muteLessons: Array.from(muteLessons)
										})
									}
									checked={!muteAllLessons}
								/>
								{muteAllLessons ? 'Звонки' : 'Звонки'}
							</H2>
						</Panel.Header>
						<Panel.Body className='p-3 flex flex-col gap-1 min-w-0'>
							<p className='font-medium text-gray-700 mb-1'>Отдельные уроки:</p>
							{/* <hr className='my-2 px-1' /> */}
							{selectedDaysLessons.map((lessonTime, lessonNum) => (
								<div key={lessonNum} className='flex items-center gap-2'>
									<Form.Check
										type='switch'
										disabled={overridesMutation.isPending}
										onChange={(e) => {
											const newMuteLessons = new Set(muteLessons);

											if (!e.target.checked) newMuteLessons.add(lessonNum);
											else newMuteLessons.delete(lessonNum);

											overridesMutation.mutate({
												muteAllLessons,
												muteLessons: Array.from(newMuteLessons)
											});
										}}
										checked={!muteLessons.has(lessonNum)}
									/>
									<div className='text-base sm:text-lg flex gap-2 min-w-0'>
										<span>{lessonNum + 1}.</span>
										<div className='rounded-solid rounded-lg'>
											{lessonTime ? (
												<span>{`${lessonTime.start_at} - ${lessonTime.end_at}`}</span>
											) : (
												<span className='animate-flashRed text-red-600 font-semibold'>
													конфликт!
												</span>
											)}
										</div>
									</div>
								</div>
							))}
						</Panel.Body>

						{/* <div className='border-t p-3'>
							<p className='text-sm'>8:30 - 12:00 (Время мута)</p>
						</div> */}
						{startDay === null && (
							<div className='absolute flex p-4 w-full h-full top-0 left-0 bg-black/10'>
								<span className='m-auto text-center text-slate-500 bg-white rounded p-1'>
									Выберите день или диапазон
								</span>
							</div>
						)}
					</Panel>

					<Panel className='relative'>
						<Panel.Header className='p-2'>
							<H2 className='flex'>
								<Form.Check
									type='switch'
									disabled={assignmentsQuery.isFetching}
									onChange={(e) => {
										if (e.target.checked)
											assignmentsMutation.mutate({
												monday: activeAssignment?.monday,
												tuesday: activeAssignment?.tuesday,
												wednesday: activeAssignment?.wednesday,
												thursday: activeAssignment?.thursday,
												friday: activeAssignment?.friday,
												saturday: activeAssignment?.saturday,
												sunday: activeAssignment?.sunday
											});
										else assignmentsMutation.mutate(null);
									}}
									checked={currentAssignment !== null}
								/>
								Новое расписание
							</H2>
						</Panel.Header>
						<Panel.Body className='p-3 flex flex-col gap-1'>
							{weekdayNames.map((day, i) => {
								const weekdayName = weekdayApiNames[i];
								const scheduleId = displayAssignment
									? displayAssignment[weekdayApiNames[i]]
									: null;
								const schedule =
									scheduleId && schedulesById
										? schedulesById[scheduleId] || null
										: null;
								return (
									<div key={i} className='flex items-center'>
										<span>{day}</span>
										<Typeahead
											className='ml-auto h-8 w-36 sm:w-40'
											emptyLabel='не найдено'
											positionFixed
											disabled={currentAssignment === null}
											selected={schedule ? [schedule] : []}
											onChange={(selected) => {
												console.log(selected);
												// @ts-ignore
												const val = selected[0] as
													| ScheduleInfo
													| 'none'
													| undefined;
												console.log(val);
												const weekdays = {
													monday: currentAssignment?.monday,
													tuesday: currentAssignment?.tuesday,
													wednesday: currentAssignment?.wednesday,
													thursday: currentAssignment?.thursday,
													friday: currentAssignment?.friday,
													saturday: currentAssignment?.saturday,
													sunday: currentAssignment?.sunday
												};
												weekdays[weekdayName] =
													val && val !== 'none' ? val.id : null;
												assignmentsMutation.mutate(weekdays);
											}}
											options={[
												{ id: 'none', name: 'Без расписания' },
												...(schedulesQuery.data || [])
											]}
											labelKey='name'
											placeholder='Без расписания'
											renderMenuItemChildren={(option) => (
												<div
													className={
														typeof option !== 'string' && option.id === 'none'
															? 'text-red-600'
															: ''
													}
												>
													{typeof option === 'string' ? option : option.name}
												</div>
											)}
										/>
									</div>
								);
							})}
						</Panel.Body>
						{(startDay !== null && endDay === null) || (
							<div className='absolute flex p-4 w-full h-full top-0 left-0 bg-black/10'>
								<span className='m-auto text-slate-500 bg-white rounded p-1'>
									Выберите один день
								</span>
							</div>
						)}
					</Panel>
				</div>
			</div>
		</PageLayout>
	);
};

export default CalendarPage;
