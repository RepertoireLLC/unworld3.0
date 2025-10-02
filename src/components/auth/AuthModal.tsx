import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuthStore } from '../../store/authStore';

interface AuthModalProps {
  isSubmitting?: boolean;
}

export function AuthModal({ isSubmitting = false }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const clearError = useAuthStore((state) => state.clearError);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen py-8 w-full flex items-center justify-center">
        {isLogin ? (
          <LoginForm
            onToggle={() => {
              setIsLogin(false);
              clearError();
            }}
            isSubmitting={isSubmitting}
          />
        ) : (
          <RegisterForm
            onToggle={() => {
              setIsLogin(true);
              clearError();
            }}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}