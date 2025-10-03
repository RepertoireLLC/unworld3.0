import { useEffect } from 'react';
import { AuthModal } from './components/auth/AuthModal';
import { useAuthStore } from './store/authStore';
import { initializeMockData } from './store/mockData';
import { Dashboard } from './components/dashboard/Dashboard';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      initializeMockData();
    }
  }, [isAuthenticated]);

  return isAuthenticated ? <Dashboard /> : <AuthModal />;
}
