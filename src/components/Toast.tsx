import { useState, useEffect, useRef } from 'react';

interface ToastProps {
	show: boolean;
	setShow: (show: boolean) => void;
	message: string;
	variant?: 'success' | 'danger' | 'warning';
	delay?: number;
}

function Toast({
	show,
	setShow,
	message,
	variant = 'success',
	delay = 5000
}: ToastProps) {
	const [progress, setProgress] = useState(100);
	const startTimeRef = useRef<number | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	useEffect(() => {
		if (!show) {
			setProgress(100);
			if (animationFrameRef.current)
				cancelAnimationFrame(animationFrameRef.current);
			return;
		}

		setProgress(100);
		startTimeRef.current = Date.now();

		const animate = () => {
			if (!startTimeRef.current) return;
			const elapsed = Date.now() - startTimeRef.current;
			const remaining = delay - elapsed;
			const percentage = Math.max((remaining / delay) * 100, 0);
			setProgress(percentage);

			if (remaining > 0) {
				animationFrameRef.current = requestAnimationFrame(animate);
			} else {
				setShow(false);
			}
		};

		animationFrameRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationFrameRef.current)
				cancelAnimationFrame(animationFrameRef.current);
		};
	}, [show, delay, setShow]);

	const getToastStyles = (): React.CSSProperties => {
		const baseStyles: React.CSSProperties = {
			position: 'fixed',
			top: '20px',
			right: '20px',
			zIndex: 9999,
			minWidth: '300px',
			maxWidth: '400px',
			border: 'none',
			cursor: 'pointer',
			boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
			borderRadius: '8px',
			overflow: 'hidden',
			fontFamily: 'system-ui, -apple-system, sans-serif',
			fontSize: '14px',
			fontWeight: 500,
			transition: 'transform 0.2s ease, opacity 0.2s ease',
			transform: show ? 'translateX(0)' : 'translateX(100%)',
			opacity: show ? 1 : 0
		};

		switch (variant) {
			case 'success':
				return { ...baseStyles, backgroundColor: '#10b981', color: 'white' };
			case 'danger':
				return { ...baseStyles, backgroundColor: '#ef4444', color: 'white' };
			case 'warning':
				return { ...baseStyles, backgroundColor: '#f59e0b', color: '#1f2937' };
			default:
				return { ...baseStyles, backgroundColor: '#10b981', color: 'white' };
		}
	};

	const getProgressBarStyles = () => {
		const baseStyle: React.CSSProperties = {
			height: '3px',
			width: '100%',
			borderRadius: '0',
			transition: 'none',
			backgroundColor: 'rgba(255, 255, 255, 0.3)'
		};

		const progressStyle: React.CSSProperties = {
			height: '100%',
			borderRadius: '0',
			transition: 'width 0.1s linear'
		};

		switch (variant) {
			case 'success':
			case 'danger':
				progressStyle.backgroundColor = 'rgba(255, 255, 255, 0.8)';
				break;
			case 'warning':
				progressStyle.backgroundColor = 'rgba(255, 255, 255, 0.7)';
				baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.2)';
				break;
			default:
				progressStyle.backgroundColor = 'rgba(255, 255, 255, 0.8)';
		}

		return { baseStyle, progressStyle };
	};

	const toastStyles = getToastStyles();
	const { baseStyle, progressStyle } = getProgressBarStyles();

	if (!show) return null;

	return (
		<div
			style={toastStyles}
			onClick={() => setShow(false)}
			role='alert'
			aria-live='polite'
		>
			<div style={baseStyle}>
				<div style={{ ...progressStyle, width: `${progress}%` }} />
			</div>

			<div style={{ padding: '12px 16px', lineHeight: '1.5' }}>{message}</div>
		</div>
	);
}

export default Toast;
