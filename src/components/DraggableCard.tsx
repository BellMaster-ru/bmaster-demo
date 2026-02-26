import { useState, useEffect, useRef, HTMLAttributes, ReactNode } from 'react';
import { Card } from 'react-bootstrap';
import { ChevronDown, ChevronUp } from 'react-bootstrap-icons';

const MovableCard = ({
	children,
	fixedX,
	className,
	header,
	...attrs
}: {
	fixedX?: boolean;
	header?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) => {
	const [position, setPosition] = useState({
		x: window.innerWidth / 2 - 150, // Center initially
		y: window.innerHeight / 2 - 100
	});
	const [isDragging, setIsDragging] = useState(false);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const handleRef = useRef<HTMLDivElement | undefined>(null);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging) return;

			setPosition({
				x: Math.max(
					0,
					Math.min(
						e.clientX - offset.x,
						window.innerWidth - handleRef.current.clientWidth
					)
				),
				y: Math.max(
					0,
					Math.min(
						e.clientY - offset.y,
						window.innerHeight - handleRef.current.clientHeight
					)
				)
			});
		};

		const handleMouseUp = () => setIsDragging(false);
		const handleResize = () => {
			setPosition((prev) => ({
				x: Math.min(prev.x, window.innerWidth - handleRef.current.clientWidth),
				y: Math.min(prev.y, window.innerHeight - handleRef.current.clientHeight)
			}));
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		window.addEventListener('resize', handleResize);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('resize', handleResize);
		};
	}, [isDragging, offset]);

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		setIsDragging(true);
		setOffset({
			x: e.clientX - position.x,
			y: e.clientY - position.y
		});
	};

	const height = window.innerHeight - position.y;

	return (
		<Card
			style={{
				top: `${position.y}px`,
				left: fixedX ? undefined : `${position.x}px`,
				height: `${height}px`
			}}
			className={`fixed select-none shadow-lg z-50 rounded-b-none ${className}`}
			{...attrs}
		>
			<Card.Header
				onMouseDown={handleMouseDown}
				ref={handleRef}
				className='cursor-move flex flex-row items-center bg-gray-100 hover:bg-gray-200 transition-colors'
			>
				{header}
				{height > 50 ? (
					<ChevronDown
						className='ml-auto cursor-pointer'
						onClick={() => {
							setPosition((prev) => ({
								x: prev.x,
								y: window.innerHeight - handleRef.current.clientHeight
							}));
						}}
            size={'1.2rem'}
					/>
				) : (
					<ChevronUp
						className='ml-auto cursor-pointer'
						onClick={() => {
							setPosition((prev) => ({
								x: prev.x,
								y: window.innerHeight - handleRef.current.clientHeight * 10
							}));
						}}
            size={'1.2rem'}
					/>
				)}
			</Card.Header>
			{children}
		</Card>
	);
};

export default MovableCard;
