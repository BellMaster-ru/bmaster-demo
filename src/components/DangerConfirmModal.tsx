import { ReactNode } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { ExclamationTriangle } from 'react-bootstrap-icons';
import Button from '@/components/Button';

export type DangerConfirmModalProps = {
	show: boolean;
	title: string;
	description: ReactNode;
	onCancel: () => void;
	onConfirm: () => void;
	confirmText?: string;
	cancelText?: string;
	pendingText?: string;
	details?: ReactNode;
	warning?: ReactNode;
	isPending?: boolean;
};

const DangerConfirmModal = ({
	show,
	title,
	description,
	onCancel,
	onConfirm,
	confirmText = 'Подтвердить',
	cancelText = 'Отмена',
	pendingText = 'Выполняется...',
	details,
	warning,
	isPending = false
}: DangerConfirmModalProps) => {
	return (
		<Modal show={show} onHide={onCancel} backdrop={isPending ? 'static' : true}>
			<Modal.Header closeButton={!isPending} className='border-none'>
				<Modal.Title>{title}</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<div className='flex items-start gap-3'>
					<ExclamationTriangle className='text-yellow-500 mt-1' size={22} />
					<div className='space-y-2'>
						<p className='font-medium'>{description}</p>
						{details}
						{warning}
					</div>
				</div>
			</Modal.Body>
			<Modal.Footer className='border-none'>
				<Button variant='secondary' onClick={onCancel} disabled={isPending}>
					{cancelText}
				</Button>
				<Button variant='danger' onClick={onConfirm} disabled={isPending}>
					{isPending ? (
						<>
							<Spinner animation='border' size='sm' />
							<span className='ml-2'>{pendingText}</span>
						</>
					) : (
						confirmText
					)}
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default DangerConfirmModal;
