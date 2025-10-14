import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogIn } from 'lucide-react';

export function LoginForm({ onToggle }: { onToggle: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = login({ email, password });
    
    if (!success) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border px-8 py-10 shadow-xl" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)', backdropFilter: 'blur(var(--ds-blur-base))' }}>
      <div className="mb-8 flex items-center justify-center">
        <div className="rounded-full p-3" style={{ background: 'var(--ds-accent-soft)', color: 'var(--ds-accent)' }}>
          <LogIn className="h-6 w-6" />
        </div>
      </div>
      <h2 className="mb-8 text-center text-2xl font-bold ds-text-primary">Welcome Back</h2>
      {error && (
        <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'rgba(251, 113, 133, 0.4)', background: 'rgba(251, 113, 133, 0.12)', color: 'var(--ds-critical)' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="ds-input"
            required
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="ds-input"
            required
          />
        </div>
        <button
          type="submit"
          className="ds-button ds-button-primary w-full justify-center"
        >
          Sign In
        </button>
      </form>
      <p className="mt-6 text-center ds-text-secondary">
        Don't have an account?{' '}
        <button
          onClick={onToggle}
          className="ds-text-accent hover:underline focus:outline-none"
        >
          Sign up
        </button>
      </p>
    </div>
  );
}