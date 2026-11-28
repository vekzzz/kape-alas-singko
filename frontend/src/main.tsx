import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createPersistOptions, createQueryClient } from './api/queryClient';
import App from './App';
import { initLiteMode } from './lib/liteMode';
import './styles.css';

initLiteMode();

// Storage keys from before the move to zustand. Nothing reads them any more, so clear them out.
for (const key of ['alas-singko-cart-v2', 'alas-singko-orders-v2', 'alas-singko-last-order-v1']) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
try {
  sessionStorage.removeItem('alas-singko-order-type-v1');
} catch {}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

const queryClient = createQueryClient();
const persistOptions = createPersistOptions();

createRoot(container).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
);
