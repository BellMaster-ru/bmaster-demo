// @ts-nocheck
import { Card, Spinner } from 'react-bootstrap';

import * as icoms from '@/api/icoms';
import {
	Trash,
	MusicNote,
	PlayFill,
	ExclamationCircleFill,
	Gear,
	Wrench,
	PersonCircle,
	GearFill,
	Broadcast
} from 'react-bootstrap-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const authorTypeIcons = {
	service: <GearFill />,
	root: <Wrench />,
	account: <PersonCircle />
};

export function IcomQuery({
	queryInfo,
	onCancel
}: {
	queryInfo: icoms.QueryInfo;
	onCancel?: () => unknown;
}) {
	const queryClient = useQueryClient();
	const cancelQuery = useMutation({
		mutationFn: () => icoms.cancelQuery(queryInfo.id),
		onSuccess: () => {
			queryClient.invalidateQueries('icoms');
		}
	});

	let content;
	switch (queryInfo.type) {
		case 'sounds.sound':
			const query = queryInfo as icoms.SoundQueryInfo;
			content = (
				<>
					<span className='font-medium flex items-center gap-1'>
						<MusicNote className='text-blue-500' />
						<span className='text-gray-700'>Звук</span>
					</span>
					<span className='text-gray-600 truncate'>{query.sound_name}</span>
				</>
			);
			break;
		case 'api.stream':
			content = (
				<>
					<span className='font-medium flex items-center gap-1'>
						<Broadcast className='text-red-500' />
						<span className='text-gray-700'>Эфир</span>
					</span>
				</>
			);
			break;
	}

	console.log(queryInfo);

	return (
		<div
			key={queryInfo.id}
			className={`flex rounded-lg h-24 items-center border ${
				queryInfo.status == icoms.QueryStatus.Playing &&
				'border-green-500 bg-green-50'
			}`}
		>
			{/* Основной контент */}
			<div className='flex flex-col p-2 w-full'>
				<div className='flex flex-row'>
					<div className='flex flex-col'>{content}</div>
					<div className='flex flex-col ml-auto'>
						{queryInfo.duration && (
							<span className='ml-3 text-sm text-gray-500'>
								{queryInfo.duration}
							</span>
						)}

						{/* Приоритет */}
						<div className='ml-auto flex items-center gap-1 text-orange-500'>
							<span className='text-sm font-medium'>{queryInfo.priority}</span>
							{queryInfo.force && <ExclamationCircleFill className='text-sm' />}
						</div>
					</div>
				</div>
				<div>
					{queryInfo.author && (
						<div className='flex flex-row items-center mt-2 gap-2 text-gray-500'>
							{authorTypeIcons[queryInfo.author.type]}
							{queryInfo.author.name}
							<span className='text-gray-400 text-xs'>
								{queryInfo.author.label}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Кнопка удаления */}
			<button
				onClick={() => cancelQuery.mutate()}
				disabled={cancelQuery.isPending}
				className='p-[0.1rem] h-full bg-red-600 text-white flex items-center justify-center rounded-r-lg hover:bg-red-700'
			>
				{cancelQuery.isPending ? (
					<Spinner className='w-4 h-4' />
				) : (
					<Trash size={18} />
				)}
			</button>
		</div>
	);
	return <Card>Запрос</Card>;
}
