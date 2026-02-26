import { cn } from '@/utils';
import { HTMLAttributes } from 'react';

export const Field = ({
	children,
	className,
	...attrs
}: HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('flex flex-col gap-1', className)}
		{...attrs}
	>
		{children}
	</div>
);

export default Field;
