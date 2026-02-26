import { cn } from '@/utils';
import { HTMLAttributes, useEffect, useState } from 'react';

export type KbdProps = {
	code: string;
} & HTMLAttributes<HTMLElement>;

export const Kbd = ({
	children,
	className,
	code,
	...attrs
}: KbdProps) => {
	const [pressed, setPressed] = useState<boolean>(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === code) setPressed(true);
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === code) setPressed(false);
		};
		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, []);

	return (
		<kbd
			className={cn(
				'px-2 py-1 text-white inline-block rounded border-gray-700 border-2',
				pressed
					? 'translate-y-0.5 bg-gray-700'
					: 'shadow-[0_2px_0_0_#000] bg-gray-600',
				className
			)}
			{...attrs}
		>
			{children || code}
		</kbd>
	);
};

export default Kbd;
