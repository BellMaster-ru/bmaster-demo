// @ts-nocheck
import React, { useState } from 'react';
import { Spinner, Modal } from 'react-bootstrap';
import * as sounds from '@/api/sounds';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Panel from '@/components/Panel';
import {
	ExclamationTriangle,
	Laptop,
	MusicNote,
	Plus,
	Speaker,
	Trash,
	PlayFill,
	PlusLg
} from 'react-bootstrap-icons';
import { formatDurationMSS, humanFileSize } from '@/utils';
import AudioPlayer from '@/components/AudioPlayer';
import { HTTP_BASE_URL } from '@/api';
import { playSound } from '@/api/queries';
import FileUploadButton from '@/components/FileUploadButton';
import { H2, Name, Value, Note } from '@/components/text';
import { useSounds } from '@/sounds';
import Button from '@/components/Button';
import Field from '@/components/Field';
import PageLayout from '@/components/PageLayout';

const SoundsPage = () => {
	const { soundsQuery } = useSounds();
	const [selectedSoundName, setSelectedSoundName] = useState<
		string | undefined
	>(undefined);
	const [soundToDelete, setSoundToDelete] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const playSoundMut = useMutation({
		mutationFn: (sound_name: string) =>
			playSound({ icom_id: 'main', force: false, priority: 2, sound_name }),
		onSuccess: () => queryClient.invalidateQueries('icoms')
	});

	const uploadSoundMut = useMutation({
		mutationFn: (file: File) => sounds.uploadSound(file),
		onSuccess: () => queryClient.invalidateQueries('sounds')
	});

	const deleteSoundMut = useMutation({
		mutationFn: (sound_name: string) => sounds.deleteSound(sound_name),
		onSuccess: () => queryClient.invalidateQueries('sounds')
	});

	const handleDeleteClick = (soundName: string) => {
		setSoundToDelete(soundName);
	};

	const confirmDelete = () => {
		if (soundToDelete) {
			deleteSoundMut.mutate(soundToDelete);
			setSoundToDelete(null);

			// Если удаляем выбранный звук - сбрасываем выделение
			if (selectedSoundName === soundToDelete) {
				setSelectedSoundName(undefined);
			}
		}
	};

	const soundList = soundsQuery.data || [];
	const soundMap = Object.fromEntries(soundList.map((s) => [s.name, s]));
	const selectedSound = selectedSoundName
		? soundMap[selectedSoundName]
		: undefined;

	console.log(soundList);

	return (
		<PageLayout pageTitle='Библиотека звуков'>
			{/* Левая панель — список звуков */}
			<div className='grid grid-cols-1 items-start gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]'>
				<div className='min-w-0 bg-gray-50 rounded-xl shadow p-4 flex flex-col'>
					{soundsQuery.isLoading ? (
						<div className='flex justify-center items-center flex-1'>
							<Spinner />{' '}
							<span className='ml-2 text-gray-500'>Загрузка...</span>
						</div>
					) : (
						<div className='grid gap-3 overflow-y-auto pr-2'>
							{soundList.length === 0 ? (
								<div className='text-gray-500 text-center py-6'>
									Нет доступных звуков. Загрузите новые файлы.
								</div>
							) : (
								soundList.map((soundInfo) => (
									<div
										key={soundInfo.name}
										onClick={() => setSelectedSoundName(soundInfo.name)}
										className={`flex items-center p-3 rounded-lg border transition hover:shadow-sm cursor-pointer ${
											selectedSoundName === soundInfo.name
												? 'bg-blue-50'
												: 'bg-white hover:bg-gray-50'
										}`}
									>
										{soundInfo.sound_specs ? (
											<MusicNote size={24} className='text-blue-500 mr-3' />
										) : (
											<ExclamationTriangle
												size={24}
												className='text-orange-500 mr-3'
											/>
										)}
										<div className='flex flex-col'>
											<span className='font-medium'>{soundInfo.name}</span>
											<span className='text-sm text-gray-500 flex items-center gap-1'>
												{soundInfo.sound_specs &&
													formatDurationMSS(soundInfo.sound_specs.duration)}
												{soundInfo.sound_specs && <span>•</span>}
												{humanFileSize(soundInfo.size)}
											</span>
										</div>
										<button
											className='ml-auto p-2 text-gray-400 hover:text-red-500'
											onClick={(e) => {
												e.stopPropagation();
												handleDeleteClick(soundInfo.name);
											}}
										>
											<Trash size={18} />
										</button>
									</div>
								))
							)}
						</div>
					)}

					<div className='mt-4'>
						<FileUploadButton
							className='w-full'
							handleFile={(file) => uploadSoundMut.mutate(file)}
						>
							<Plus size={20} /> Загрузить звук
							{/* <PlusLg size={14} /> Загрузить звук */}
						</FileUploadButton>
					</div>
				</div>

				{/* Правая панель — предпросмотр и управление звуком */}
					<Panel className='mx-auto w-full max-w-[24rem] flex flex-col xl:mx-0'>
					{selectedSound ? (
						<>
							{/* <h2 className='text-lg font-semibold text-gray-700 mb-4'>
								{selectedSound.name}
							</h2> */}
							{/* <div className='text-lg font-medium text-slate-600 p-4 border-b'>
								{selectedSound.name}
							</div> */}
							<Panel.Header>
								<H2>{selectedSound.name}</H2>
							</Panel.Header>

							<Panel.Body className='p-4 bg-gray-50 space-y-6'>
								<Field className='gap-2'>
									<Name className='flex items-center gap-2'>
										<Laptop size={16} /> Ваше устройство
									</Name>
									<Value>
										<AudioPlayer
											className='w-full'
											src={`${HTTP_BASE_URL}/api/sounds/file/${selectedSound.name}`}
										/>
									</Value>
									<Note>Прослушать звук в браузере</Note>
								</Field>

								<hr />

								<Field className='gap-2'>
									<Name className='flex items-center gap-2'>
										<Speaker size={16} /> Динамики школы
									</Name>
									<Value>
										{selectedSound.sound_specs ? (
											<Button
												className='w-full'
												variant='success'
												disabled={playSoundMut.isPending}
												onClick={() => playSoundMut.mutate(selectedSoundName)}
											>
												<PlayFill /> Воспроизвести
											</Button>
										) : (
											<span className='text-orange-600 text-sm flex items-center gap-1'>
												<ExclamationTriangle size={14} /> Неизвестный формат
											</span>
										)}
									</Value>
									<Note>Воспроизвести звук в системе громкоговорителей</Note>
								</Field>
							</Panel.Body>
						</>
					) : (
						<Panel.Body className='flex flex-col items-center justify-center text-gray-400 text-center flex-1'>
							<Speaker size={40} className='mb-2' />
							<span>Выберите звук для предпросмотра</span>
						</Panel.Body>
					)}
				</Panel>
			</div>

			<Modal
				show={soundToDelete !== null}
				onHide={() => setSoundToDelete(null)}
			>
				<Modal.Header closeButton className='border-none'>
					<Modal.Title>Подтверждение удаления</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className='flex items-start'>
						<ExclamationTriangle
							className='text-yellow-500 mr-3 mt-1'
							size={24}
						/>
						<div>
							<p className='font-medium mb-1'>
								Вы уверены, что хотите удалить звук?
							</p>
							<p className='bg-gray-100 p-2 rounded-md font-mono text-sm'>
								{soundToDelete}
							</p>
							<p className='mt-2 text-red-600 text-sm'>
								Это действие невозможно отменить.
							</p>
						</div>
					</div>
				</Modal.Body>
				<Modal.Footer className='border-none'>
					<Button
						variant='secondary'
						onClick={() => setSoundToDelete(null)}
						disabled={deleteSoundMut.isPending}
					>
						Отмена
					</Button>
					<Button
						variant='danger'
						onClick={confirmDelete}
						disabled={deleteSoundMut.isPending}
					>
						{deleteSoundMut.isPending ? (
							<>
								<Spinner
									as='span'
									animation='border'
									size='sm'
									role='status'
									aria-hidden='true'
								/>
								<span className='ml-2'>Удаление...</span>
							</>
						) : (
							'Удалить'
						)}
					</Button>
				</Modal.Footer>
			</Modal>
			</PageLayout>
	);
};

export default SoundsPage;
