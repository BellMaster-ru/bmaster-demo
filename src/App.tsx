import { isAuthed } from './api/auth';
import MainPage from '@/MainPage';
import LoginPage from '@/LoginPage';

function App() {
	const isAuthed_ = isAuthed();

	return isAuthed_ ? <MainPage /> : <LoginPage />;
}

export default App;
