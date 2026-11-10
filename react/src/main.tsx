import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { migrateLegacyUrl, routerBasename } from './utils/appUrl';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Old #/page and ?layer=page links move to the shared clean path before routing.
const migrated = migrateLegacyUrl();
if (migrated) window.history.replaceState(null, '', migrated);

// The root index.php writes this app into the head, so the mount point is created here.
const root = document.getElementById('root') ?? document.body.appendChild(Object.assign(document.createElement('div'), { id: 'root' }));

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename() || undefined}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
