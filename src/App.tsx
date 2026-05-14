import ClientApp    from './pages/ClientApp.tsx';
import VendorApp    from './pages/VendorApp.tsx';
import AdminApp     from './pages/AdminApp.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

export default function App() {
  const path = window.location.pathname;
  return (
    <ErrorBoundary>
      {path.startsWith('/admin')   ? <AdminApp />  :
       path.startsWith('/vendor')  ? <VendorApp /> : <ClientApp />}
    </ErrorBoundary>
  );
}
