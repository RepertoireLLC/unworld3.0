import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { UserPlus } from 'lucide-react';

interface RegisterFormProps {
  onToggle: () => void;
  isSubmitting?: boolean;
}

export function RegisterForm({ onToggle, isSubmitting = false }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16));
  const [localError, setLocalError] = useState('');
  const register = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const resetErrors = () => {
    if (localError) setLocalError('');
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }

    await register({
      email,
      password,
      name: name || email.split('@')[0],
      color,
    });
  };

  return (
    <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-xl">
      <div className="flex items-center justify-center mb-8">
        <div className="p-3 rounded-full bg-white/20">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white text-center mb-8">Create Account</h2>
      {(error || localError) && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error || localError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetErrors();
            }}
            placeholder="Email"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
            required
          />
        </div>
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              resetErrors();
            }}
            placeholder="Display Name (optional)"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              resetErrors();
            }}
            placeholder="Password (min. 6 characters)"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
            required
            minLength={6}
          />
        </div>
        <div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              resetErrors();
            }}
            placeholder="Confirm Password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
            required
          />
        </div>
        <div>
          <label className="block text-white/80 mb-2">Choose your node color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              resetErrors();
            }}
            className="w-full h-12 rounded-lg cursor-pointer"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p className="mt-6 text-center text-white/60">
        Already have an account?{' '}
        <button
          onClick={onToggle}
          className="text-white hover:underline focus:outline-none"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}