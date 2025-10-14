import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export function AuthModal() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-sm"
      style={{ background: 'rgba(2, 6, 23, 0.78)' }}
    >
      <div className="min-h-screen py-8 w-full flex items-center justify-center">
        {isLogin ? (
          <LoginForm onToggle={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggle={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}