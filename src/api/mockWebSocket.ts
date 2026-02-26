import { mockBackend, type StreamSessionHandle } from './mockBackend';

class MockWebSocket extends EventTarget {
	public static readonly CONNECTING = 0;
	public static readonly OPEN = 1;
	public static readonly CLOSING = 2;
	public static readonly CLOSED = 3;

	public readonly CONNECTING = MockWebSocket.CONNECTING;
	public readonly OPEN = MockWebSocket.OPEN;
	public readonly CLOSING = MockWebSocket.CLOSING;
	public readonly CLOSED = MockWebSocket.CLOSED;

	public readonly extensions = '';
	public readonly protocol = '';
	public readonly url: string;

	public binaryType: BinaryType = 'blob';
	public bufferedAmount = 0;
	public readyState = MockWebSocket.CONNECTING;

	public onopen: ((this: WebSocket, ev: Event) => any) | null = null;
	public onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
	public onerror: ((this: WebSocket, ev: Event) => any) | null = null;
	public onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;

	private session: StreamSessionHandle;
	private closed = false;

	constructor(url: string) {
		super();
		this.url = url;
		this.session = mockBackend.openStreamSession(url, {
			send: (data) => {
				void this.emitMessage(data);
			},
			close: (code, reason) => {
				this.closeFromServer(code, reason);
			}
		});

		queueMicrotask(() => {
			if (this.readyState !== MockWebSocket.CONNECTING) {
				return;
			}
			this.readyState = MockWebSocket.OPEN;
			this.emitOpen();
		});
	}

	public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
		if (this.readyState !== MockWebSocket.OPEN) {
			throw new Error('MockWebSocket is not open');
		}
		if (data instanceof ArrayBuffer) {
			this.session.onClientData(data);
			return;
		}
		if (ArrayBuffer.isView(data)) {
			const view = data as ArrayBufferView;
			this.session.onClientData(
				view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
			);
			return;
		}
		this.session.onClientData(data);
	}

	public close(code?: number, reason?: string): void {
		if (
			this.readyState === MockWebSocket.CLOSING ||
			this.readyState === MockWebSocket.CLOSED
		) {
			return;
		}

		this.readyState = MockWebSocket.CLOSING;
		this.session.onClientClose();
		this.finalizeClose(code, reason || 'closed');
	}

	private emitOpen(): void {
		const event = new Event('open');
		this.dispatchEvent(event);
		if (this.onopen) {
			this.onopen.call(this as unknown as WebSocket, event);
		}
	}

	private emitError(): void {
		const event = new Event('error');
		this.dispatchEvent(event);
		if (this.onerror) {
			this.onerror.call(this as unknown as WebSocket, event);
		}
	}

	private async emitMessage(raw: string | ArrayBuffer | Blob): Promise<void> {
		if (this.readyState === MockWebSocket.CLOSED) {
			return;
		}

		let data: string | ArrayBuffer | Blob = raw;
		if (raw instanceof Blob) {
			if (this.binaryType === 'arraybuffer') {
				data = await raw.arrayBuffer();
			}
		}
		if (raw instanceof ArrayBuffer && this.binaryType === 'blob') {
			data = new Blob([raw]);
		}

		const event = new MessageEvent('message', {
			data
		});
		this.dispatchEvent(event);
		if (this.onmessage) {
			this.onmessage.call(this as unknown as WebSocket, event);
		}
	}

	private closeFromServer(code?: number, reason?: string): void {
		if (this.readyState === MockWebSocket.CLOSED) {
			return;
		}
		if (this.readyState === MockWebSocket.CONNECTING) {
			this.emitError();
		}
		this.readyState = MockWebSocket.CLOSING;
		this.finalizeClose(code, reason || 'closed');
	}

	private finalizeClose(code?: number, reason = ''): void {
		if (this.closed) {
			return;
		}
		this.closed = true;
		this.readyState = MockWebSocket.CLOSED;

		const event = new CloseEvent('close', {
			code: code ?? 1000,
			reason,
			wasClean: true
		});
		this.dispatchEvent(event);
		if (this.onclose) {
			this.onclose.call(this as unknown as WebSocket, event);
		}
	}
}

let wsShimInstalled = false;

export const installMockWebSocketShim = (): void => {
	if (typeof window === 'undefined') {
		return;
	}
	if (wsShimInstalled) {
		return;
	}
	wsShimInstalled = true;

	const NativeWebSocket = window.WebSocket;
	const buildSocket = (url: string | URL, protocols?: string | string[]) => {
		const urlString = typeof url === 'string' ? url : url.toString();
		if (mockBackend.canHandleWebSocket(urlString)) {
			return new MockWebSocket(urlString) as unknown as WebSocket;
		}
		if (protocols !== undefined) {
			return new NativeWebSocket(url, protocols);
		}
		return new NativeWebSocket(url);
	};

	const ProxiedWebSocket = new Proxy(NativeWebSocket, {
		construct(_target, args) {
			const [url, protocols] = args as [string | URL, string | string[] | undefined];
			return buildSocket(url, protocols);
		},
		apply(_target, _thisArg, args) {
			const [url, protocols] = args as [string | URL, string | string[] | undefined];
			return buildSocket(url, protocols);
		}
	});

	window.WebSocket = ProxiedWebSocket as unknown as typeof WebSocket;
};
