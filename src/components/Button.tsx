import { cn } from '@/utils';
import { HTMLAttributes } from 'react';

export type ButtonProps = {
	variant?: 'primary' | 'danger' | 'outline-danger' | 'secondary' | 'success';
	disabled?: boolean;
} & HTMLAttributes<HTMLButtonElement>;

export const Button = ({
	children,
	className,
	variant,
	disabled,
	...attrs
}: ButtonProps) => {
	// variant = variant || 'secondary';
	let variantClass = '';
	switch (variant) {
		case 'danger':
			variantClass = 'bg-rose-600 hover:bg-rose-500';
			break;
		case 'outline-danger':
			// variantClass = 'bg-red-600 shadow-red-600 hover:bg-red-700';
			variantClass = 'bg-red-600 hover:bg-red-500';
			break;
		case 'secondary':
			// variantClass = 'bg-gray-500 shadow-gray-500 hover:bg-gray-600';
			variantClass = 'bg-gray-600 hover:bg-gray-500';
			break;
		case 'success':
			// variantClass = 'bg-green-600 shadow-green-600 hover:bg-green-600';
			variantClass = 'bg-emerald-600 hover:bg-emerald-500';
			break;
		default:
			// variantClass = 'bg-blue-500 shadow-blue-500 hover:bg-blue-600';
			// variantClass = 'bg-[rgb(76,110,245)] hover:bg-[rgb(112,139,247)]';
			variantClass = 'bg-blue-500 hover:bg-blue-400';
	}

	return (
		<button
			disabled={disabled}
			className={cn(
				variantClass,
				'flex shadow-md items-center justify-center gap-2 text-white py-2 px-6 rounded-lg transition-all duration-300',
				disabled ? 'opacity-50 pointer-events-none' : '',
				className
			)}
			{...attrs}
		>
			{children}
		</button>
	);
};

export default Button;
