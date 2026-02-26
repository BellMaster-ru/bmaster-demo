import { AudioHTMLAttributes, useEffect, useRef, useState } from 'react';
import { resolvePlaybackUrl } from '@/api/mock';

export default function AudioPlayer(attrs: AudioHTMLAttributes<HTMLAudioElement>) {
	const { src, ...rest } = attrs;
	const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(
		typeof src === 'string' ? src : undefined
	);
	const createdObjectUrlRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		let active = true;
		const source = typeof src === 'string' ? src : undefined;
		void resolvePlaybackUrl(source).then((nextUrl) => {
			if (!active) {
				if (nextUrl && nextUrl.startsWith('blob:')) {
					URL.revokeObjectURL(nextUrl);
				}
				return;
			}
			if (createdObjectUrlRef.current && createdObjectUrlRef.current !== nextUrl) {
				URL.revokeObjectURL(createdObjectUrlRef.current);
				createdObjectUrlRef.current = undefined;
			}
			if (nextUrl && nextUrl.startsWith('blob:')) {
				createdObjectUrlRef.current = nextUrl;
			}
			setResolvedSrc(nextUrl);
		});

		return () => {
			active = false;
		};
	}, [src]);

	useEffect(() => {
		return () => {
			if (createdObjectUrlRef.current) {
				URL.revokeObjectURL(createdObjectUrlRef.current);
				createdObjectUrlRef.current = undefined;
			}
		};
	}, []);

	return <audio controls {...rest} src={resolvedSrc} />;
}
