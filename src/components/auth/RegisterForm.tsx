import { useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { UserPlus } from 'lucide-react';
import { useLayerStore } from '../../store/layerStore';

export function RegisterForm({ onToggle }: { onToggle: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#' + Math.floor(Math.random()*16777215).toString(16));
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [proposedDomain, setProposedDomain] = useState('');
  const [error, setError] = useState('');
  const register = useAuthStore((state) => state.register);
  const availableDomains = useLayerStore((state) => state.availableDomains);

  const sortedDomains = useMemo(
    () => [...availableDomains].sort((a, b) => a.name.localeCompare(b.name)),
    [availableDomains]
  );

  const toggleDomain = (domainId: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId)
        ? prev.filter((id) => id !== domainId)
        : [...prev, domainId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (selectedDomains.length === 0 && !proposedDomain.trim()) {
      setError('Select at least one domain or propose a new domain to continue.');
      return;
    }

    const success = register({
      email,
      password,
      name: name || email.split('@')[0],
      color,
      layers: selectedDomains,
      proposedLayer: proposedDomain.trim() || null,
    });

    if (!success) {
      setError('Email already registered');
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-xl shadow-xl">
      <div className="flex items-center justify-center mb-8">
        <div className="p-3 rounded-full bg-white/20">
          <UserPlus className="w-6 h-6 text-white" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-white text-center mb-8">Create Account</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
            required
          />
        </div>
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display Name (optional)"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
          />
        </div>
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
            required
          />
        </div>
        <div>
          <label className="block text-white/80 mb-3">Select your mission layers</label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {sortedDomains.map((domain) => (
              <label
                key={domain.id}
                className="flex items-start space-x-3 p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(domain.id)}
                  onChange={() => toggleDomain(domain.id)}
                  className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-white focus:ring-white/40"
                />
                <div>
                  <p className="text-white font-medium">{domain.name}</p>
                  {domain.description && (
                    <p className="text-sm text-white/60">{domain.description}</p>
                  )}
                </div>
              </label>
            ))}
            {sortedDomains.length === 0 && (
              <p className="text-white/60 text-sm">No domains available yet.</p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-white/80">Request a new layer</label>
          <input
            type="text"
            value={proposedDomain}
            onChange={(e) => setProposedDomain(e.target.value)}
            placeholder="Propose a new collaboration domain"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
          />
          <p className="text-xs text-white/60">
            Tell us if your team operates in a new space. We\'ll review and activate approved layers quickly.
          </p>
        </div>
        <div>
          <label className="block text-white/80 mb-2">Choose your node color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-12 rounded-lg cursor-pointer"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
        >
          Sign Up
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