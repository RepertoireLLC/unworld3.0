const RANDOM_FALLBACK = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function generateId(prefix?: string) {
  const base =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : RANDOM_FALLBACK();
  return prefix ? `${prefix}-${base}` : base;
}
