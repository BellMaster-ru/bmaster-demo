import { useIcomContext } from '@/pages/icoms';
import { useState } from 'react';
import { Form } from 'react-bootstrap';

export default function IcomMixer({visible = false}: {visible?: boolean}) {
	const { selectedIcom } = useIcomContext();
	const [message, setMessage] = useState('');
	if (!visible) return;
	return <Form.Control type='text' value={message} onChange={(e) => setMessage(e.target.value)} />;
}
