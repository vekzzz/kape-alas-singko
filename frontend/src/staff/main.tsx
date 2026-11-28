import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createQueryClient } from '../api/queryClient';
import { StaffApp } from './StaffApp';
import './staff.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in staff.html');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      <StaffApp />
    </QueryClientProvider>
  </StrictMode>,
);
