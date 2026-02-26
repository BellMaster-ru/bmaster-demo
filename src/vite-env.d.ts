/// <reference types="vite/client" />

interface Window {
	__bmasterMock?: {
		reset: () => Promise<void>;
	};
}
