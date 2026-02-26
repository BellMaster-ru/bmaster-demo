import { ReactNode, useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import Button from '@/components/Button';
import { initializeMockEnvironment } from '@/api/mock';

type DemoDisclaimerGateProps = {
	children: ReactNode;
};

export default function DemoDisclaimerGate({ children }: DemoDisclaimerGateProps) {
	const [accepted, setAccepted] = useState(false);

	useEffect(() => {
		if (!accepted) {
			return;
		}
		initializeMockEnvironment();
	}, [accepted]);

	if (!accepted) {
		return (
			<Modal show centered backdrop='static' keyboard={false}>
				<Modal.Header>
					<Modal.Title>Демо-режим BMaster</Modal.Title>
				</Modal.Header>
				<Modal.Body className='space-y-3'>
					<p className='mb-0'>
						Это демонстрационная версия. Данные и поведение сервера
						эмулируются в браузере.
					</p>
					<p className='mb-0 text-slate-600 text-sm'>
						Функционал ограничен и не отражает работу реальной системы в
						продакшене.
					</p>
				</Modal.Body>
				<Modal.Footer>
					<Button onClick={() => setAccepted(true)} className='w-full'>
						Понятно, продолжить
					</Button>
				</Modal.Footer>
			</Modal>
		);
	}

	return <>{children}</>;
}
