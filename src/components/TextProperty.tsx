import { cn } from '@/utils';
import { HTMLAttributes, useEffect, useRef, useState } from 'react';
import { Check, CheckLg, PencilFill } from 'react-bootstrap-icons';

export const TextProperty = ({
	className,
	disabled,
	onSubmit,
	value,
	edit,
	defaultEdit,
	parent,
	...attrs
}: HTMLAttributes<HTMLInputElement> & {
	disabled?: boolean;
	onSubmit?: (v: string) => any;
	edit?: boolean;
	defaultEdit?: boolean;
	value: string;
	parent?: HTMLAttributes<HTMLDivElement>;
}) => {
	if (disabled === undefined) disabled = false;
	if (defaultEdit === undefined) defaultEdit = false;

	const [isEditing, setEditing] = useState<boolean>(defaultEdit);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing) {
			inputRef.current.focus();
		}
	}, [isEditing]);

	useEffect(() => {
		if (edit !== undefined && isEditing !== edit) setEditing(edit);
	}, [edit, isEditing]);

	useEffect(() => {
		if (disabled) setEditing(false);
	}, [disabled]);

	const submit = () => {
		if (onSubmit) onSubmit(inputRef.current.value);
		setEditing(false);
	};

	return (
		<div className={cn('flex rounded-lg border-2', className)} {...parent}>
			<input
				{...attrs}
				ref={inputRef}
				disabled={!isEditing}
				value={isEditing ? undefined : value}
				// onBlur={() => setEditing(false)}
				onKeyDown={(e) => {
					switch (e.key) {
						case 'Enter':
							submit();
							break;
						case 'Escape':
							setEditing(false);
							break;
					}
				}}
				className='flex-1 bg-gray-50 p-1 w-full'
			/>
			<button
				className='bg-gray-300 hover:bg-gray-400 rounded-r-[0.3rem] text-black py-1 px-[0.6rem]'
				disabled={disabled}
				onClick={() => {
					if (isEditing) submit();
					else setEditing(true);
				}}
			>
				{isEditing ? (
					<CheckLg className='m-auto' />
				) : (
					<PencilFill className='m-auto' />
				)}
			</button>
		</div>
	);
};

export default TextProperty;
