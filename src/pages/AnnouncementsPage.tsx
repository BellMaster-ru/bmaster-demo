import { useEffect, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { Mic, StopCircle } from 'react-bootstrap-icons';
import { buildWsUrl } from '@/api';
import { H2, Note } from '@/components/text';
import Panel from '@/components/Panel';
import Kbd from '@/components/Kbd';
import PageLayout from '@/components/PageLayout';

const RATE = 48000;
const CHANNELS = 1;
const TIMESLICE_MS = 250;
const LOOPBACK_DELAY_SECONDS = 0.5;

type LoopbackConnection = {
	audioContext: AudioContext;
	sourceNode: MediaStreamAudioSourceNode;
	delayNode: DelayNode;
	gainNode: GainNode;
};

interface Connection {
	ws: WebSocket;
	mediaRecorder: MediaRecorder;
	stream: MediaStream;
	mimeType: string;
	timesliceMs: number;
	seq: number;
	sampleRateHint: number;
	channelsHint: number;
	loopback: LoopbackConnection | null;
}

interface PendingStartConnection {
	cancelled: boolean;
	ws: WebSocket | null;
	mediaRecorder: MediaRecorder | null;
	stream: MediaStream | null;
	loopback: LoopbackConnection | null;
}

type BroadcastStatus = 'idle' | 'connecting' | 'waiting' | 'started' | 'error';

interface WsServerMessage {
	type: 'error' | 'started' | 'stopped' | 'waiting' | string;
	error?: string;
}

interface WsStartMessage {
	type: 'start';
	icom: string;
	priority: number;
	force: boolean;
	codec: string;
	container: string;
	mime_type: string;
	timeslice_ms: number;
	sample_rate_hint: number;
	channels_hint: number;
}

const OPUS_MIME = 'audio/webm;codecs=opus';
const supportsMediaRecorder = (): boolean => {
	return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
};

const chooseMimeType = (): string | null => {
	if (!supportsMediaRecorder()) return null;
	return MediaRecorder.isTypeSupported(OPUS_MIME) ? OPUS_MIME : null;
};

const stopRecorder = async (mediaRecorder: MediaRecorder): Promise<void> => {
	if (mediaRecorder.state === 'inactive') return;
	await new Promise<void>((resolve) => {
		const onStop = () => resolve();
		mediaRecorder.addEventListener('stop', onStop, { once: true });
		mediaRecorder.stop();
	});
};

const getAudioContextClass = (): (new (contextOptions?: AudioContextOptions) => AudioContext) | null => {
	if (typeof window === 'undefined') return null;
	return (
		(window as any).AudioContext ||
		(window as any).webkitAudioContext ||
		null
	);
};

const createDelayedLoopback = async (
	stream: MediaStream
): Promise<LoopbackConnection> => {
	const AudioContextClass = getAudioContextClass();
	if (!AudioContextClass) {
		throw new Error('WebAudio API не поддерживается в этом браузере');
	}

	const audioContext = new AudioContextClass({ latencyHint: 'interactive' });
	const sourceNode = audioContext.createMediaStreamSource(stream);
	const delayNode = audioContext.createDelay(3);
	delayNode.delayTime.value = LOOPBACK_DELAY_SECONDS;
	const gainNode = audioContext.createGain();
	gainNode.gain.value = 1;

	sourceNode.connect(delayNode);
	delayNode.connect(gainNode);
	gainNode.connect(audioContext.destination);

	if (audioContext.state === 'suspended') {
		await audioContext.resume();
	}

	return {
		audioContext,
		sourceNode,
		delayNode,
		gainNode
	};
};

const stopLoopback = async (loopback: LoopbackConnection | null): Promise<void> => {
	if (!loopback) return;
	try {
		loopback.sourceNode.disconnect();
	} catch {}
	try {
		loopback.delayNode.disconnect();
	} catch {}
	try {
		loopback.gainNode.disconnect();
	} catch {}
	try {
		await loopback.audioContext.close();
	} catch {}
};

export default function AnnouncementsPage() {
	const [connection, setConnection] = useState<Connection | null>(null);
	const [status, setStatus] = useState<BroadcastStatus>('idle');
	const [error, setError] = useState<string | null>(null);
	const connectionRef = useRef<Connection | null>(null);
	const pendingStartRef = useRef<PendingStartConnection | null>(null);
	const isStoppingRef = useRef(false);

	useEffect(() => {
		connectionRef.current = connection;
	}, [connection]);

	const stopPendingStart = async (
		pending: PendingStartConnection,
		closeSocket: boolean
	) => {
		pending.cancelled = true;
		try {
			if (pending.mediaRecorder) {
				await stopRecorder(pending.mediaRecorder);
			}
		} catch {}
		try {
			await stopLoopback(pending.loopback);
		} catch {}
		try {
			pending.stream?.getTracks().forEach((track) => track.stop());
		} catch {}
		if (
			closeSocket &&
			pending.ws &&
			(pending.ws.readyState === WebSocket.OPEN ||
				pending.ws.readyState === WebSocket.CONNECTING)
		) {
			try {
				pending.ws.close();
			} catch {}
		}
	};

	const stop = async (
		options: { closeSocket?: boolean; nextStatus?: BroadcastStatus } = {}
	) => {
		const { closeSocket = true, nextStatus = 'idle' } = options;
		const conn = connectionRef.current;
		if (!conn) {
			const pendingStart = pendingStartRef.current;
			if (pendingStart) {
				await stopPendingStart(pendingStart, closeSocket);
				pendingStartRef.current = null;
			}
			setStatus(nextStatus);
			return;
		}

		isStoppingRef.current = true;
		setStatus(nextStatus);

		try {
			await stopRecorder(conn.mediaRecorder);
		} catch {}
		try {
			await stopLoopback(conn.loopback);
		} catch {}
		try {
			if (closeSocket && conn.ws.readyState === WebSocket.OPEN) {
				conn.ws.send(JSON.stringify({ type: 'stop' }));
			}
		} catch {}
		try {
			conn.stream.getTracks().forEach((track) => track.stop());
		} catch {}
		if (
			closeSocket &&
			(conn.ws.readyState === WebSocket.OPEN ||
				conn.ws.readyState === WebSocket.CONNECTING)
		) {
			try {
				conn.ws.close();
			} catch {}
		}

		connectionRef.current = null;
		setConnection(null);
		pendingStartRef.current = null;
		isStoppingRef.current = false;
	};

	const ensureLoopbackStarted = async (conn: Connection) => {
		if (conn.loopback) return;
		const loopback = await createDelayedLoopback(conn.stream);
		conn.loopback = loopback;
	};

	const ensureLoopbackStopped = async (conn: Connection) => {
		if (!conn.loopback) return;
		const loopback = conn.loopback;
		conn.loopback = null;
		await stopLoopback(loopback);
	};

	useEffect(() => {
		if (!connection) return;

		const { ws } = connection;

		const wsOpen = () => {
			const startMessage: WsStartMessage = {
				type: 'start',
				icom: 'main',
				priority: 4,
				force: false,
				codec: 'opus',
				container: 'webm',
				mime_type: connection.mimeType,
				timeslice_ms: connection.timesliceMs,
				sample_rate_hint: connection.sampleRateHint,
				channels_hint: connection.channelsHint
			};
			ws.send(
				JSON.stringify(startMessage)
			);
		};

		const wsError = (e: Event) => {
			console.error('[WS] Error:', e);
			setError('Ошибка WebSocket-соединения');
			stop({ closeSocket: false, nextStatus: 'error' });
		};

		const wsMessage = (e: MessageEvent) => {
			const data = e.data;
			let msg: WsServerMessage | null = null;
			try {
				msg = JSON.parse(String(data)) as WsServerMessage;
			} catch {
				return;
			}

			switch (msg.type) {
				case 'error':
					setError(msg.error || 'Ошибка эфира');
					stop({ closeSocket: false, nextStatus: 'error' });
					break;
					case 'started':
						setStatus('started');
						if (connection.mediaRecorder.state === 'inactive') {
							connection.mediaRecorder.start(connection.timesliceMs);
						}
						void ensureLoopbackStarted(connection).catch(() => {
							setError('Не удалось включить локальное прослушивание');
							stop({ closeSocket: true, nextStatus: 'error' });
						});
						break;
					case 'stopped':
						setStatus('waiting');
						void ensureLoopbackStopped(connection);
						break;
					case 'waiting':
						setStatus('waiting');
						void ensureLoopbackStopped(connection);
						break;
				}
			};

		const wsClose = () => {
			if (!isStoppingRef.current && connectionRef.current) {
				stop({ closeSocket: false, nextStatus: 'idle' });
			}
		};

		ws.addEventListener('error', wsError);
		ws.addEventListener('message', wsMessage);
		ws.addEventListener('close', wsClose);
		if (ws.readyState === WebSocket.OPEN) {
			wsOpen();
		} else {
			ws.addEventListener('open', wsOpen);
		}

		return () => {
			ws.removeEventListener('open', wsOpen);
			ws.removeEventListener('error', wsError);
			ws.removeEventListener('message', wsMessage);
			ws.removeEventListener('close', wsClose);
		};
	}, [connection]);

	const start = async () => {
		setError(null);
		const token = localStorage.getItem('bmaster.auth.token');
		if (!token) {
			setError('Требуется авторизация');
			setStatus('error');
			return;
		}
		const mimeType = chooseMimeType();
		if (!mimeType) {
			setError('Opus/WebM не поддерживается в этом браузере');
			setStatus('error');
			return;
		}

		let ws: WebSocket | null = null;
		let stream: MediaStream | null = null;
		let mediaRecorder: MediaRecorder | null = null;
		const pendingStart: PendingStartConnection = {
			cancelled: false,
			ws: null,
			mediaRecorder: null,
			stream: null,
			loopback: null
		};
		pendingStartRef.current = pendingStart;

		try {
			setStatus('connecting');
			const wsUrl = buildWsUrl(
				'/api/queries/stream',
				new URLSearchParams({ token })
			);
			ws = new WebSocket(wsUrl);
			ws.binaryType = 'arraybuffer';
			pendingStart.ws = ws;

			stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: RATE,
					channelCount: CHANNELS
				},
				video: false
			});
			pendingStart.stream = stream;
			if (pendingStart.cancelled) {
				await stopPendingStart(pendingStart, true);
				return;
			}

				mediaRecorder = new MediaRecorder(stream, {
					mimeType
				});
				pendingStart.mediaRecorder = mediaRecorder;
				if (pendingStart.cancelled) {
					await stopPendingStart(pendingStart, true);
					return;
				}
				const sampleRateHint = stream.getAudioTracks()[0]?.getSettings().sampleRate ?? RATE;
				const channelsHint = stream.getAudioTracks()[0]?.getSettings().channelCount ?? CHANNELS;
				mediaRecorder.addEventListener('dataavailable', async (event: BlobEvent) => {
				if (!connectionRef.current) return;
				if (event.data.size === 0) return;
				const activeConnection = connectionRef.current;
				if (activeConnection.ws.readyState !== WebSocket.OPEN) return;
				const arrayBuffer = await event.data.arrayBuffer();
				activeConnection.ws.send(arrayBuffer);
				activeConnection.seq += 1;
			});

			mediaRecorder.addEventListener('error', () => {
				setError('Ошибка кодирования аудио');
				stop({ closeSocket: true, nextStatus: 'error' });
			});

				setConnection({
					mediaRecorder,
					stream,
					mimeType,
					timesliceMs: TIMESLICE_MS,
					seq: 0,
					ws,
					sampleRateHint,
					channelsHint,
					loopback: null
				});
				pendingStartRef.current = null;
			} catch (e: unknown) {
				console.error('[Broadcast] Failed to start:', e);
				setError(e instanceof Error ? e.message : 'Не удалось начать эфир');
				setStatus('error');

				try {
					if (mediaRecorder) await stopRecorder(mediaRecorder);
				} catch {}
				try {
					await stopLoopback(pendingStart.loopback);
				} catch {}
				try {
					stream?.getTracks().forEach((track) => track.stop());
				} catch {}
				if (
					ws &&
					(ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
				) {
					try {
						ws.close();
					} catch {}
				}
				if (pendingStartRef.current === pendingStart) {
					pendingStartRef.current = null;
				}
			}
		};

	const handleClick = () => {
		if (status === 'idle' || status === 'error') {
			start();
		} else {
			stop();
		}
	};

	const statusLabel =
		status === 'idle'
			? 'Готов'
			: status === 'connecting'
			? 'Подключение...'
			: status === 'waiting'
			? 'Ожидание'
			: status === 'started'
			? 'Говорите'
			: 'Ошибка';

	const statusBadgeClass = () => {
		switch (status) {
			case 'started':
				return 'bg-emerald-50 text-emerald-700';
			case 'connecting':
				return 'bg-amber-50 text-amber-700';
			case 'waiting':
				return 'bg-sky-50 text-sky-700';
			case 'error':
				return 'bg-red-50 text-red-700';
			default:
				return 'bg-slate-50 text-slate-700';
		}
	};

	return (
		<PageLayout pageTitle='Объявления' className='max-w-2xl p-6'>

			<Panel>
				<div className='p-8 bg-white'>
					<div className='flex flex-col items-center gap-6'>
						<div className='text-center'>
							<H2>Вещание в эфир</H2>
							<Note>
								Нажмите большую кнопку ниже или используйте&nbsp;
								<Kbd code='Space' />
							</Note>
						</div>

						{/* BIG CENTER BUTTON */}
							<button
								aria-pressed={status === 'started'}
								aria-label={status === 'idle' ? 'Начать эфир' : 'Остановить эфир'}
								onClick={handleClick}
								className={`relative flex items-center justify-center rounded-full transform transition-transform active:scale-95 focus:outline-none ring-0 shadow-md
	                ${
									status === 'started'
										? 'bg-rose-600 hover:bg-rose-700 pulse-announce'
										: 'bg-blue-600 hover:bg-blue-600'
								}
                text-white`}
							style={{ width: 140, height: 140 }}
						>
							{/* subtle inner circle */}
							<span
								className={`absolute rounded-full inset-0 ${
									status === 'started'
										? 'opacity-10 bg-rose-600'
										: 'bg-blue-500 hover:bg-blue-400'
								}`}
							/>

							<div className='relative z-10 flex items-center justify-center'>
								{status === 'connecting' && <Spinner style={{ width: 44, height: 44 }} />}
								{status === 'idle' && <Mic size={44} />}
								{status === 'started' && <StopCircle size={44} />}
								{status === 'waiting' && <Mic size={44} />}
								{status === 'error' && <StopCircle size={44} />}
							</div>
						</button>

						<div className='flex flex-col sm:flex-row items-center gap-3'>
							<div
								className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass()}`}
							>
								{statusLabel}
							</div>
							{error && <div className='text-sm text-red-600'>{error}</div>}
						</div>

						{/* bottom info + small instruction */}
						<div className='w-full mt-2 text-center'>
							<div className='inline-grid grid-cols-2 gap-4 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-md'>
								<div className='flex flex-col items-start'>
									<div className='text-xs text-slate-400'>Кодек</div>
									<div className='font-medium text-slate-700'>
										{connection?.mimeType || 'n/a'}
									</div>
								</div>
								<div className='flex flex-col items-end'>
									<div className='text-xs text-slate-400'>Срез</div>
									<div className='font-medium text-slate-700'>
										{connection?.timesliceMs ?? TIMESLICE_MS} ms
									</div>
								</div>
								<Note className='col-span-2 text-center text-xs mb-2'>
									Логи и ошибки выводятся в консоль.
								</Note>
							</div>
						</div>
					</div>
				</div>
			</Panel>

			<style>{`
        /* pulse animation for active broadcast */
        @keyframes pulseAnnounce {
          0% { box-shadow: 0 0 0 0 rgba(0,0,0,0.0); transform: scale(1); }
          50% { box-shadow: 0 0 0 14px rgba(0,0,0,0.03); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.0); transform: scale(1); }
        }
        .pulse-announce {
          animation: pulseAnnounce 1.8s infinite ease-in-out;
        }
        /* accessible focus ring */
        button:focus { box-shadow: 0 0 0 6px rgba(37,99,235,0.12); }
        /* kbd style (ensure visible on white bg) */
        kbd { font-weight: 600; }
        @media (prefers-reduced-motion: reduce) {
          .pulse-announce, .animate-spin { animation: none !important; }
        }
      `}</style>
		</PageLayout>
	);
}
