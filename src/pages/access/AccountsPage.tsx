import {
	AccountInfo,
	createAccount,
	deleteAccount,
	getAccounts,
	updateAccount,
	UpdateAccountRequest
} from '@/api/access/accounts';
import Panel from '@/components/Panel';
import PageLayout from '@/components/PageLayout';
import { Name, Note, Value } from '@/components/text';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import './style.css';
import { getRoles, RoleInfo } from '@/api/access/roles';
import { useEffect, useState } from 'react';
import { cn } from '@/utils';
import Field from '@/components/Field';
import TextProperty from '@/components/TextProperty';
import { Typeahead } from 'react-bootstrap-typeahead';
import Button from '@/components/Button';
import DangerConfirmModal from '@/components/DangerConfirmModal';
import {
	Plus,
	PlusLg,
	Trash,
	Trash2,
	Trash3,
	TrashFill,
	XCircleFill
} from 'react-bootstrap-icons';

export const AccountsPage = () => {
	const queryClient = useQueryClient();

	const accountsQuery = useQuery({
		queryKey: ['auth.accounts'],
		queryFn: () => getAccounts()
	});

	const accounts: AccountInfo[] | null = accountsQuery.data || null;
	const accountById = {};
	if (accounts !== null) {
		for (const account of accounts) {
			accountById[account.id] = account;
		}
	}

	const rolesQuery = useQuery({
		queryKey: ['auth.roles'],
		queryFn: () => getRoles()
	});

	const roles: RoleInfo[] | null = rolesQuery.data || null;
	const roleById = {};
	if (roles !== null) {
		for (const role of roles) {
			roleById[role.id] = role;
		}
	}

	const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
		null
	);
	const selectedAccount: AccountInfo | null =
		(selectedAccountId && accountById[selectedAccountId]) || null;
	const [accountToDelete, setAccountToDelete] = useState<AccountInfo | null>(null);

	// NEW ACCOUNT
	const [creatingAccount, setCreatingAccount] = useState<boolean>(false);
	const [newAccountName, setNewAccountName] = useState<string>('');
	const [newAccountRoles, setNewAccountRoles] = useState<RoleInfo[]>([]);
	const [newAccountPassword, setNewAccountPassword] = useState<string>('');

	let newNameWarning = null;
	if (newAccountName.length < 3 || newAccountName.length > 32)
		newNameWarning = 'От 3 до 32 символов';

	let newPasswordWarning = null;
	if (newAccountPassword.length < 5 || newAccountPassword.length > 32)
		newPasswordWarning = 'От 5 до 32 символов';

	const isValid = newNameWarning === null && newPasswordWarning === null;

	const createAccountMutation = useMutation({
		mutationKey: ['auth.accounts.create'],
		mutationFn: () =>
			createAccount({
				name: newAccountName,
				password: newAccountPassword,
				role_ids: newAccountRoles.map((role) => role.id)
			}),
		onSuccess: (newAccount) => {
			queryClient.invalidateQueries({ queryKey: ['auth.accounts'] });
			setSelectedAccountId(newAccount.id);
		}
	});

	const updateAccountMutation = useMutation({
		mutationKey: ['auth.accounts.update'],
		mutationFn: (req: UpdateAccountRequest) =>
			updateAccount(selectedAccountId, req),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['auth.accounts'] });
		}
	});

	const deleteAccountMutation = useMutation({
		mutationKey: ['auth.accounts.delete'],
		mutationFn: (accountId: number) => deleteAccount(accountId),
		onSuccess: (_, accountId) => {
			queryClient.invalidateQueries({ queryKey: ['auth.accounts'] });
			if (selectedAccountId === accountId) {
				setSelectedAccountId(null);
			}
			setAccountToDelete(null);
		}
	});

	const requestDeleteAccount = () => {
		if (selectedAccount) {
			setAccountToDelete(selectedAccount);
		}
	};

	const confirmDeleteAccount = () => {
		if (accountToDelete) {
			deleteAccountMutation.mutate(accountToDelete.id);
		}
	};

	useEffect(() => {
		if (creatingAccount) setSelectedAccountId(null);
	}, [creatingAccount]);

	useEffect(() => {
		if (selectedAccountId !== null) setCreatingAccount(false);
	}, [selectedAccountId]);

	return (
		<PageLayout pageTitle='Пользователи' className='max-w-[60rem]'>
			<div className='flex flex-col gap-4 lg:flex-row'>
				<Panel className='flex-1 mb-auto'>
					<Panel.Header className='flex items-center p-3 px-4'>
						Пользователи
						{!creatingAccount && (
							<Button
								className='text-center ml-auto'
								onClick={() => setCreatingAccount(true)}
							>
								<PlusLg className='text-[1rem]' /> Создать
							</Button>
						)}
					</Panel.Header>
					<Panel.Body className='p-0 max-h-[35rem] overflow-y-auto'>
						{accounts ? (
							<div className='overflow-x-auto'>
								<table className='w-full border-2 min-w-[32rem]'>
									<thead className='bg-gray-300'>
										<tr>
											<th className=''>id</th>
											<th>Имя</th>
											<th>Роль</th>
											<th>Флаги</th>
										</tr>
									</thead>
									<tbody>
										{accounts.map((account) => {
											const isSelected = account.id === selectedAccountId;
											return (
												<tr
													key={account.id}
													className={cn(
														'hover:bg-gray-100 cursor-pointer',
														isSelected && 'bg-blue-200 hover:bg-blue-100'
													)}
													onClick={() => setSelectedAccountId(account.id)}
												>
													<td>{account.id}</td>
													<td>{account.name}</td>
													<td>
														{account.role_ids
															.map((roleId) => roleById[roleId]?.name || roleId)
															.join(', ')}
													</td>
													<td></td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<Note>Загрузка...</Note>
						)}
					</Panel.Body>
				</Panel>
				<Panel className='w-full min-w-0 lg:min-w-[20rem] lg:max-w-[24rem] mb-auto'>
					{!creatingAccount ? (
						<>
							<Panel.Header>Свойства</Panel.Header>
							<Panel.Body>
								{selectedAccount ? (
									<div className='flex flex-col gap-3'>
										<Field>
											<Name>Имя</Name>
											<Value>
												<TextProperty
													className='h-10'
													value={selectedAccount.name}
													disabled={updateAccountMutation.isPending}
													onSubmit={(v) => {
														updateAccountMutation.mutate({ name: v });
													}}
												/>
											</Value>
										</Field>
										<Field>
											<Name>Роль</Name>
											{roles ? (
												<Typeahead
													options={roles}
													labelKey='name'
													positionFixed
													disabled={updateAccountMutation.isPending}
													selected={selectedAccount.role_ids.map((v) => roleById[v])}
													onChange={(roles) => {
														updateAccountMutation.mutate({
															// @ts-ignore
															role_ids: roles.map((role) => role.id)
														});
													}}
												/>
											) : (
												<Note>Загрузка...</Note>
											)}
										</Field>
										<Field>
											<Name>Пароль</Name>
											<TextProperty
												className='h-10'
												value=''
												disabled={updateAccountMutation.isPending}
												onSubmit={(v) => {
													updateAccountMutation.mutate({ password: v });
												}}
											/>
										</Field>
										<Button
											onClick={requestDeleteAccount}
											disabled={deleteAccountMutation.isPending}
											variant='danger'
											className='mr-auto mt-4'
										>
											<TrashFill />
											Удалить
										</Button>
									</div>
								) : (
									<Note>Выберите аккаунт из списка</Note>
								)}
							</Panel.Body>
						</>
					) : (
						<>
							<Panel.Header>Новый пользователь</Panel.Header>
							<Panel.Body>
								<div className='flex flex-col gap-3'>
									<Field>
										<Name className={newNameWarning && 'text-red-500'}>
											Имя
											{newNameWarning && <Note>{newNameWarning}</Note>}
										</Name>
										<Value>
											<input
												className='w-full p-2 border rounded-md'
												type='text'
												value={newAccountName}
												onChange={(e) => setNewAccountName(e.target.value)}
											/>
										</Value>
									</Field>
									<Field>
										<Name>Роль</Name>
										<Value>
											{roles ? (
												<Typeahead
													options={roles}
													labelKey='name'
													positionFixed
													selected={newAccountRoles}
													onChange={(s) => {
														// @ts-ignore s is RoleInfo[]
														setNewAccountRoles(s);
													}}
												/>
											) : (
												<Note>Загрузка...</Note>
											)}
										</Value>
									</Field>
									<Field>
										<Name className={newPasswordWarning && 'text-red-500'}>
											Пароль{' '}
											{newPasswordWarning && <Note>{newPasswordWarning}</Note>}
										</Name>
										<Value>
											<input
												className='w-full p-2 border rounded-md'
												type='password'
												value={newAccountPassword}
												onChange={(e) => setNewAccountPassword(e.target.value)}
											/>
										</Value>
									</Field>
									<div className='flex gap-1'>
										<Button
											onClick={() => setCreatingAccount(false)}
											variant='danger'
											className='rounded-r-none px-3'
										>
											<XCircleFill size={24} />
										</Button>
										<Button
											className='rounded-l-none'
											onClick={() => createAccountMutation.mutate()}
											disabled={!isValid || createAccountMutation.isPending}
										>
											Создать
										</Button>
									</div>
								</div>
							</Panel.Body>
						</>
					)}
				</Panel>
			</div>

			<DangerConfirmModal
				show={accountToDelete !== null}
				title='Подтверждение удаления'
				description='Вы уверены, что хотите удалить пользователя?'
				details={
					accountToDelete ? (
						<p className='bg-gray-100 p-2 rounded-md font-mono text-sm'>
							{accountToDelete.name}
						</p>
					) : null
				}
				warning={<p className='text-red-600 text-sm'>Это действие невозможно отменить.</p>}
				confirmText='Удалить пользователя'
				pendingText='Удаление...'
				onCancel={() => setAccountToDelete(null)}
				onConfirm={confirmDeleteAccount}
				isPending={deleteAccountMutation.isPending}
			/>
		</PageLayout>
	);
};

export default AccountsPage;
