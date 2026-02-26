import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const clamp = (value, min, max) =>
	value < min ? min : value > max ? max : value;

export function humanFileSize(size) {
	var i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
	return (
		+(size / Math.pow(1024, i)).toFixed(2) * 1 +
		' ' +
		['B', 'kB', 'MB', 'GB', 'TB'][i]
	);
}

export const formatDurationMSS = (totalSeconds: number): string => {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${String(Math.floor(seconds)).padStart(2, '0')}`;
};

export const countMinutes = (time: string) => {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
};

export const getMonthDayCount = (month: number, year: number) =>
	new Date(year, month + 1, 0).getDate();

export const formatDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(date.getDate()).padStart(2, '0')}`;

export const fromDateFormat = (date: string) => {
	const [year, month, day] = date.split('-').map(Number);
	return new Date(year, month - 1, day);
};
