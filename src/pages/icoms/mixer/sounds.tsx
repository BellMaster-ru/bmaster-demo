// @ts-nocheck
import { playSound } from '@/api/queries';
import { useIcomContext } from '@/pages/icoms';
import { clamp } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';


export default function SoundsMixer({
	visible = false
}: {
	visible?: boolean;
}) {
	const queryClient = useQueryClient();
	const { selectedIcom, soundsQuery } = useIcomContext();
	const [soundName, setSoundName] = useState('');
	const [volume, setVolume] = useState(100);

	let soundNameError = '';
	if (soundName === '') soundNameError = 'Отсутствует звук';
	
	const isValid = !soundNameError && selectedIcom;

	const sendQuery = useMutation({
		mutationFn: () => playSound({
			icom_id: selectedIcom.id,
			sound_name: soundName,
			force: false,
			priority: 0
		}),
		mutationKey: ['playSound'],
		onSuccess: () => {
			queryClient.invalidateQueries('icoms');
		}
	});

	if (!visible) return;
	return (
		<div className='w-1/2 h-full relative'>
			<Form className='flex flex-col gap-4'>
				<Form.Group>
					<Form.Label>Звук</Form.Label>
					<Typeahead
						id='sound-selector'
						onChange={(selected) => setSoundName(selected[0] || '')}
						options={
							soundsQuery.data
							? soundsQuery.data.map((soundInfo) => soundInfo.name)
							: []
						}
						placeholder='Выберите звук'
						selected={soundName ? [soundName] : []}
						isInvalid={Boolean(soundNameError)}
					/>
					{soundNameError && <Form.Control.Feedback type='invalid'>
						{soundNameError}
					</Form.Control.Feedback>}
				</Form.Group>
				<Form.Group>
					<Form.Label>Громкость</Form.Label>
					<div className='flex items-center gap-4'>
						<Form.Range
							value={volume}
							onChange={(e) => setVolume(Number(e.target.value))}
							min={0}
							max={150}
							step={10}
						/>
						<Form.Control
							type="number"
							value={volume}
							onChange={(e) => setVolume(clamp(Math.floor(Number(e.target.value)), 0, 150))}
							min={0}
							max={150}
							step={10}
							className="w-20"
							aria-label="Number input"
						/>
					</div>
				</Form.Group>
			</Form>
			<Button
				className='absolute right-0 bottom-0 p-2 px-3 flex flex-row gap-2 items-center'
				onClick={() => sendQuery.mutate()}
				disabled={!isValid || sendQuery.isPending}
			>
				{sendQuery.isPending && <Spinner className='w-full h-full' />} Отправить
			</Button>
		</div>
	);
}
