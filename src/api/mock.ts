import { mockBackend } from './mockBackend';
import { installMockWebSocketShim } from './mockWebSocket';

let initialized = false;

const normalizeCandidateUrl = (input: string): URL | null => {
	try {
		if (typeof window !== 'undefined') {
			return new URL(input, window.location.origin);
		}
		return new URL(input, 'http://mock.local');
	} catch {
		return null;
	}
};

const extractSoundNameFromUrl = (input: string): string | undefined => {
	const url = normalizeCandidateUrl(input);
	if (!url) {
		return undefined;
	}
	const path = url.pathname.replace(/\/+$/, '');
	const marker = '/api/sounds/file/';
	const index = path.indexOf(marker);
	if (index < 0) {
		return undefined;
	}
	const encoded = path.slice(index + marker.length);
	if (!encoded) {
		return undefined;
	}
	try {
		return decodeURIComponent(encoded);
	} catch {
		return undefined;
	}
};

export const initializeMockEnvironment = (): void => {
	if (initialized) {
		return;
	}
	initialized = true;
	mockBackend.installDevApi();
	installMockWebSocketShim();
};

export const resolvePlaybackUrl = async (
	src: string | undefined
): Promise<string | undefined> => {
	if (!src) {
		return undefined;
	}
	const soundName = extractSoundNameFromUrl(src);
	if (!soundName) {
		return src;
	}
	const objectUrl = await mockBackend.resolveSoundObjectUrl(soundName);
	return objectUrl || src;
};
