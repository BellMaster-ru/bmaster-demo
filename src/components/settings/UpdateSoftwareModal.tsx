import { Modal, Spinner } from 'react-bootstrap';
import { CheckCircleFill, ExclamationTriangle } from 'react-bootstrap-icons';
import Button from '@/components/Button';

export type UpdatePhase = 'confirm' | 'running' | 'success' | 'error';
const UPDATE_MODAL_DEBUG_NAMESPACE = '[settings/update-modal]';

export type UpdateSoftwareModalProps = {
	show: boolean;
	phase: UpdatePhase;
	errorMessage: string;
	onClose: () => void;
	onConfirm: () => void;
	onRetry: () => void;
	onRequestReboot: () => void;
};

const UpdateSoftwareModal = ({
	show,
	phase,
	errorMessage,
	onClose,
	onConfirm,
	onRetry,
	onRequestReboot
}: UpdateSoftwareModalProps) => {
	const isRunning = phase === 'running';
	const logUpdateModal = (event: string, payload?: unknown) => {
		if (payload === undefined) {
			console.log(UPDATE_MODAL_DEBUG_NAMESPACE, event);
			return;
		}
		console.log(UPDATE_MODAL_DEBUG_NAMESPACE, event, payload);
	};

	const handleClose = () => {
		logUpdateModal('close_click', { phase, isRunning });
		onClose();
	};

	const handleConfirm = () => {
		logUpdateModal('confirm_click', { phase });
		onConfirm();
	};

	const handleRetry = () => {
		logUpdateModal('retry_click', { phase });
		onRetry();
	};

	const handleRequestReboot = () => {
		logUpdateModal('request_reboot_click', { phase });
		onRequestReboot();
	};

	return (
		<Modal
			show={show}
			onHide={handleClose}
			backdrop={isRunning ? 'static' : true}
			keyboard={!isRunning}
		>
			<Modal.Header closeButton={!isRunning} className='border-none'>
				<Modal.Title>
					{phase === 'success'
						? 'Обновление завершено'
						: phase === 'error'
							? 'Ошибка обновления'
							: 'Обновление системы'}
				</Modal.Title>
			</Modal.Header>

			<Modal.Body>
				{phase === 'confirm' && (
					<div className='flex items-start gap-3'>
						<ExclamationTriangle className='text-blue-500 mt-1' size={22} />
						<div className='space-y-2'>
							<p className='font-medium'>
								Доступно обновление системы. Установка займет меньше минуты.
							</p>
							<p className='text-slate-600 text-sm'>
								Во время установки управление и воспроизведение будут
								временно недоступны.
							</p>
						</div>
					</div>
				)}

				{phase === 'running' && (
					<div className='flex items-center gap-2 text-slate-700'>
						<Spinner animation='border' size='sm' />
						<p className='font-medium m-0'>Идёт установка обновления...</p>
					</div>
				)}

				{phase === 'success' && (
					<div className='flex items-center gap-3 text-emerald-700'>
						<CheckCircleFill size={22} className='shrink-0' />
						<p className='font-medium m-0'>Обновление успешно установлено. Рекомендуется перезагрузить сервер, чтобы применить изменения.</p>
					</div>
				)}

				{phase === 'error' && (
					<div className='space-y-2'>
						<div className='flex items-center gap-2 text-amber-700'>
							<ExclamationTriangle size={20} className='shrink-0' />
							<p className='font-medium m-0'>Не удалось завершить обновление</p>
						</div>
						<p className='text-sm text-slate-600 mb-0'>
							{errorMessage ||
								'Возникла ошибка во время обновления. Попробуйте повторить позже.'}
						</p>
					</div>
				)}
			</Modal.Body>

			<Modal.Footer className='border-none'>
					{phase === 'confirm' && (
						<>
							<Button variant='secondary' onClick={handleClose}>
								Отложить
							</Button>
							<Button onClick={handleConfirm}>Установить обновление</Button>
						</>
					)}

				{phase === 'running' && (
					<Button variant='secondary' disabled>
						<Spinner animation='border' size='sm' />
						Идёт установка...
					</Button>
				)}

					{phase === 'error' && (
						<>
							<Button variant='secondary' onClick={handleClose}>
								Закрыть
							</Button>
							<Button onClick={handleRetry}>Повторить</Button>
						</>
					)}

					{phase === 'success' && (
						<>
							<Button variant='secondary' onClick={handleClose}>
								Закрыть
							</Button>
							<Button variant='danger' onClick={handleRequestReboot}>
								Перезагрузить сервер
							</Button>
						</>
				)}
			</Modal.Footer>
		</Modal>
	);
};

export default UpdateSoftwareModal;
