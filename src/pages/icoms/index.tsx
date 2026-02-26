// @ts-nocheck
import {
	useMutation,
	useQuery,
	useQueryClient,
	UseQueryResult
} from '@tanstack/react-query';

import * as icoms from '@/api/icoms';
import * as sounds from '@/api/sounds';
import ForegroundNotification from '@/components/ForegroundNotification';
import { createContext, useContext, useState } from 'react';
import {
	MusicNoteList,
	VolumeUp,
	Mic,
	Broadcast,
	MusicNote,
	PlayFill,
	Search,
	PlusCircle,
	ExclamationTriangle
} from 'react-bootstrap-icons';

import { IcomQuery } from '@/pages/icoms/queries';
import IcomMixer from './mixer/icom';
import SoundsMixer from './mixer/sounds';
import RecordMixer from './mixer/record';
import BroadcastMixer from './mixer/broadcast';
import { Spinner } from 'react-bootstrap';
import { humanFileSize } from '@/utils';
import AudioPlayer from '@/components/AudioPlayer';
import { HTTP_BASE_URL } from '@/api';


export interface IcomContextData {
	icomsQuery: UseQueryResult<icoms.IcomInfoMap>;
	soundsQuery: UseQueryResult<sounds.SoundInfo[]>;
	selectedIcom?: icoms.IcomInfo;
}

const IcomPageContext = createContext<IcomContextData | undefined>(undefined);

export function useIcomContext(): IcomContextData {
	const data = useContext(IcomPageContext);
	if (!data) throw Error('Not in IcomPageContext');
	return data;
}


export default function IcomsPage() {
	const icomsQuery = useQuery({
		queryFn: () => icoms.getIcoms(),
		queryKey: ['icoms'],
		refetchInterval: 2000
	});

	const soundsQuery = useQuery({
		queryFn: () => sounds.getSoundInfo(),
		queryKey: ['sounds']
	})

	const [selectedIcomId, setSelectedIcomId] = useState<string | undefined>(
		undefined
	);

	const [markedIcomIds, setMarkedIcomIds] = useState<string[]>([]);
	const [selectedMixerId, setSelectedMixerId] = useState<string>('icom');

	const [selectedSoundName, setSelectedSoundName] = useState<string>('');

	if (icomsQuery.isLoading)
		return <ForegroundNotification>Загрузка...</ForegroundNotification>;
	else if (icomsQuery.isError || !icomsQuery.data)
		return <ForegroundNotification>Ошибка загрузки</ForegroundNotification>;

	const icomMap = icomsQuery.data;
	const icomList = Object.values(icomMap);
	let selectedIcom: icoms.IcomInfo | undefined = undefined;

	if (selectedIcomId) {
		selectedIcom = icomMap[selectedIcomId];
		if (!selectedIcom) setSelectedIcomId(undefined);
	}


	return (
		<IcomPageContext.Provider
			value={{
				icomsQuery,
				selectedIcom,
				soundsQuery
			}}
		>
			<div className='h-[40rem] flex border flex-row'>
				{/* Main - Интеркомы & Запросы */}
				<div className='w-2/3 flex flex-col'>
					<div className='h-1/2 flex flex-row bg-white'>
						{/* Left - Интеркомы*/}
						<div className='w-5/12 p-2 border-r'>
							<h2 className='font-semibold ml-1 mb-2 text-gray-700'>
								Интеркомы
							</h2>
							<div className='flex flex-col gap-1 overflow-y-auto'>
								{icomList.map((icom) => (
									<div
										key={icom.id}
										onClick={() => {
											if (icom !== selectedIcom) setSelectedIcomId(icom.id);
										}}
										className={`flex items-center p-1 px-2 cursor-pointer rounded-lg ${
											selectedIcom === icom
												? 'bg-blue-50 border border-blue-200'
												: 'hover:bg-gray-50'
										}`}
									>
										<input
											type='checkbox'
											className='mr-2 w-4 h-4 text-blue-600'
										/>
										<span
											className={selectedIcom === icom ? 'font-medium' : ''}
										>
											{icom.name}
										</span>
										<span className='ml-auto text-sm text-gray-500 flex flex-row items-center gap-2'>
											{icom.playing && <PlayFill />}#{icom.id}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Right - Запросы */}
						<div className='w-7/12 p-2 overflow-y-auto '>
							<h2 className='font-semibold ml-1 mb-2 text-gray-700'>Запросы</h2>
							{selectedIcom && (
								<div className='flex flex-col gap-2'>
									{selectedIcom.playing && (
										<IcomQuery
											queryInfo={selectedIcom.playing}
										/>
									)}
									{selectedIcom.queue.map((q) => (
										<IcomQuery
											queryInfo={q}
										/>
									))}
								</div>
							)}
						</div>
					</div>

					<div className='h-1/2 flex flex-row border-t'>
						<div className='w-44 flex flex-col gap-1 p-2 border-r'>
							<h2 className='font-semibold ml-1 mb-2 text-gray-700'>Микшер</h2>
							{[
								['icom', <><VolumeUp /> Интерком</>],
								['sounds', <><MusicNoteList /> Звуки</>],
								['record', <><Mic /> Запись</>],
								['broadcast', <><Broadcast /> Эфир</>]
							].map(([id, tab]) => (
								<button
									key={id}
									className={`flex flex-row gap-2 items-center p-1 px-2 text-left rounded-lg ${
										id === selectedMixerId
											? 'bg-blue-50 border border-blue-200 font-medium'
											: 'text-gray-600 hover:bg-gray-200'
									}`}
									onClick={() => setSelectedMixerId(id)}
								>
									{tab}
								</button>
							))}
						</div>

						<div className='w-full p-3 relative'>
							<IcomMixer visible={selectedMixerId === 'icom'}/>
							<SoundsMixer visible={selectedMixerId === 'sounds'}/>
							<RecordMixer visible={selectedMixerId === 'record'}/>
							<BroadcastMixer visible={selectedMixerId === 'broadcast'}/>
						</div>
					</div>
				</div>

				{/* Right Sidebar - Звуки */}
				<div className='w-1/3 flex flex-col border-l'>
					<div className='h-3/4 p-2 flex flex-col'>
						<div className='flex items-center mb-3 gap-2'>
							<h2 className='font-semibold text-gray-700'>Звуки</h2>
							<div className='ml-auto relative'>
								<input
									type='search'
									placeholder='Поиск...'
									className='pl-8 pr-2 py-1 border rounded-lg text-sm w-40'
								/>
								<Search
									className='absolute left-2 top-2 text-gray-400'
									size={14}
								/>
							</div>
						</div>

						<div className='overflow-y-auto flex-1'>
							{
								soundsQuery.data
								? soundsQuery.data.map((soundInfo) => (
									<div
										key={soundInfo.name}
										className={`flex items-center p-2 rounded-lg cursor-pointer group ${
											selectedSoundName === soundInfo.name
											? 'bg-blue-50'
											: 'hover:bg-gray-50'
										}`}
										onClick={() => setSelectedSoundName(soundInfo.name)}
									>
										<MusicNote className='text-blue-500 mr-3' />
	
										<div className='flex-1'>
											<div className='font-medium text-gray-800'>
												{soundInfo.name}
											</div>
											<div className='text-sm text-gray-500 flex items-center gap-2'>
												<span>0:00</span>
												<span>•</span>
												<span>{humanFileSize(soundInfo.size)}</span>
											</div>
										</div>
	
										<button className='ml-2 p-2 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'>
											<PlusCircle className='text-green-500' size={20} />
										</button>
									</div>
								))
								: <div><Spinner/> Загрузка</div>
							}
							
						</div>
					</div>

					<div className='h-1/4 border-t p-3 flex flex-col'>
						{
							selectedSoundName
							? (
								<AudioPlayer
									className='bg-white'
									src={`${HTTP_BASE_URL}/api/sounds/file/${encodeURIComponent(selectedSoundName)}`}
								/>
								// <div className='flex items-center gap-3'>
								// 	<button className='p-2 bg-blue-500 text-white rounded-full'>
								// 		<PlayFill size={20} />
								// 	</button>

								// 	<div className='flex-1 bg-gray-200 rounded-full h-2'>
								// 		<div className='bg-blue-500 w-1/3 h-2 rounded-full'></div>
								// 	</div>

								// 	<span className='text-sm text-gray-500'>0:15 / 0:45</span>
								// </div>
							)
							: <div className='flex flex-row items-center justify-center gap-3 text-orange-700'>
								<ExclamationTriangle size={21} /> Выберите звук
							</div>
						}
						
					</div>
				</div>
			</div>
		</IcomPageContext.Provider>
	);
}
