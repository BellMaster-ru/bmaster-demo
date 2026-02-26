// @ts-nocheck
import { useState } from 'react';
import { Card, Form, Alert } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { login } from './api/auth';
import { useQuery } from '@tanstack/react-query';
import { getServiceInfo } from './api/service';
import Panel from '@/components/Panel';
import Button from '@/components/Button';
import { H2 } from '@/components/text';

const operateLoginSchema = z.object({
	username: z
		.string()
		.min(3, 'Имя пользователя должно содержать не менее 3 символов'),
	password: z.string().min(5, 'Пароль должен содержать не менее 5 символов'),
	remember: z.boolean().optional()
});

type OperateLoginFormData = z.infer<typeof operateLoginSchema>;

function OperateLoginForm() {
	const [errorMessage, setErrorMessage] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting }
	} = useForm<OperateLoginFormData>({
		resolver: zodResolver(operateLoginSchema)
	});
	const onSubmit = async (data: OperateLoginFormData) => {
		try {
			setErrorMessage('');
			const token = await login(data);
			localStorage.setItem('bmaster.auth.token', token.access_token);
			window.location.href = '/';
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 401)
				setErrorMessage('Неправильное имя пользователя или пароль');
			else setErrorMessage('Что-то пошло не так');
		}
	};

	return (
		<Form onSubmit={handleSubmit(onSubmit)}>
			<Form.Group className='mb-3'>
				<Form.Label>Имя пользователя</Form.Label>
				<Form.Control
					{...register('username')}
					isInvalid={!!errors.username}
					placeholder='Введите имя пользователя'
				/>
				<Form.Control.Feedback type='invalid'>
					{errors.username?.message}
				</Form.Control.Feedback>
			</Form.Group>

			<Form.Group className='mb-3'>
				<Form.Label>Пароль</Form.Label>
				<Form.Control
					{...register('password')}
					type='password'
					isInvalid={!!errors.password}
					placeholder='Введите пароль'
				/>
				<Form.Control.Feedback type='invalid'>
					{errors.password?.message}
				</Form.Control.Feedback>
			</Form.Group>

			{errorMessage && (
				<Alert variant='danger' className='mb-3 text-center'>
					{errorMessage}
				</Alert>
			)}

			<Button
				variant='primary'
				type='submit'
				className='w-100'
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Вход...' : 'Войти'}
			</Button>
		</Form>
	);
}

const serviceLoginSchema = z.object({
	password: z.string().min(5, 'Пароль должен содержать не менее 5 символов')
});

type ServiceLoginFormData = z.infer<typeof serviceLoginSchema>;

function ServiceLoginForm() {
	const [errorMessage, setErrorMessage] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting }
	} = useForm<ServiceLoginFormData>({
		resolver: zodResolver(serviceLoginSchema)
	});

	const onSubmit = async (data: ServiceLoginFormData) => {
		try {
			setErrorMessage('');
			const token = await login({
				username: 'root',
				password: data.password
			});
			localStorage.setItem('bmaster.auth.token', token.access_token);
			window.location.href = '/';
		} catch (err) {
			if (axios.isAxiosError(err) && err.response?.status === 401)
				setErrorMessage('Неправильный пароль');
			else setErrorMessage('Что-то пошло не так');
		}
	};

	return (
		<Form onSubmit={handleSubmit(onSubmit)}>
			<Alert className='text-center'>
				Включен режим обслуживания
				<br />
				Доступ к сервису временно ограничен
			</Alert>
			<Form.Group className='mb-3'>
				<Form.Label>Пароль администратора</Form.Label>
				<Form.Control
					{...register('password')}
					type='password'
					isInvalid={!!errors.password}
					placeholder='Введите пароль'
				/>
				<Form.Control.Feedback type='invalid'>
					{errors.password?.message}
				</Form.Control.Feedback>
			</Form.Group>

			{errorMessage && (
				<Alert variant='danger' className='mb-3 text-center'>
					{errorMessage}
				</Alert>
			)}

			<Button
				variant='primary'
				type='submit'
				className='w-100'
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Вход...' : 'Войти'}
			</Button>
		</Form>
	);
}

export default function LoginPage() {
	const serviceInfoQuery = useQuery({
		queryFn: () => getServiceInfo(),
		queryKey: ['serviceInfo']
	});

	let content;
	if (serviceInfoQuery.isLoading) content = <Card.Text>Загрузка...</Card.Text>;
	else if (serviceInfoQuery.isError)
		content = <Card.Text>Ошибка подключения</Card.Text>;
	else if (serviceInfoQuery.data?.enabled) content = <ServiceLoginForm />;
	else content = <OperateLoginForm />;

	return (
		<div className='min-vh-100 d-flex align-items-center justify-content-center bg-light'>
			<Panel className='w-100' style={{ maxWidth: '400px' }}>
				<Panel.Header className='text-center p-3'>
					<H2>Вход</H2>
				</Panel.Header>
				<Panel.Body className='p-10'>{content}</Panel.Body>
			</Panel>
		</div>
	);
}
