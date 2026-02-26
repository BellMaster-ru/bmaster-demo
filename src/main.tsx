import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import '@/index.css';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DemoDisclaimerGate from '@/components/DemoDisclaimerGate';


const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DemoDisclaimerGate>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </DemoDisclaimerGate>
    </QueryClientProvider>
  </StrictMode>,
);
