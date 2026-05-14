import { lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary.tsx';

const ClientApp = lazy(() => import('./pages/ClientApp.tsx'));
const VendorApp = lazy(() => import('./pages/VendorApp.tsx'));
const AdminApp  = lazy(() => import('./pages/AdminApp.tsx'));

export default function App() {
  const path = window.location.pathname;
  return (
    <ErrorBoundary>
      <Suspense>
        {path.startsWith('/admin')  ? <AdminApp />  :
         path.startsWith('/vendor') ? <VendorApp /> : <ClientApp />}
      </Suspense>
    </ErrorBoundary>
  );
}
