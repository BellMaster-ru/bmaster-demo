import { isAuthed } from '@/api/demo';
import MainPage from '@/MainPage';
import LoginPage from '@/LoginPage';
import DemoDisclaimerGate from '@/components/DemoDisclaimerGate';

function App() {
	const isAuthed_ = isAuthed();

	return isAuthed_ ? (
		<DemoDisclaimerGate>
			<MainPage />
		</DemoDisclaimerGate>
	) : (
		<LoginPage />
	);
}

export default App;
