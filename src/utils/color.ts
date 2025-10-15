const HEX_FULL_PATTERN = /^#?[0-9a-fA-F]{6}$/;
const HEX_SHORT_PATTERN = /^#?[0-9a-fA-F]{3}$/;

export const generateRandomColor = () =>
  `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')
    .toUpperCase()}`;

export const coerceHexColor = (candidate: unknown): string | null => {
  if (typeof candidate !== 'string') {
    return null;
  }

  const trimmed = candidate.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (HEX_FULL_PATTERN.test(trimmed)) {
    const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    return `#${normalized.toUpperCase()}`;
  }

  if (HEX_SHORT_PATTERN.test(trimmed)) {
    const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
    const expanded = normalized
      .split('')
      .map((char) => char + char)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }

  return null;
};

export const normalizeHexColor = (
  input: unknown,
  fallback?: unknown,
  defaultColor?: string
) => coerceHexColor(input) ?? coerceHexColor(fallback) ?? defaultColor ?? generateRandomColor();
