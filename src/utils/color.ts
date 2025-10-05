export const domainToHsl = (domain: string, saturation = 65, lightness = 50) => {
  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
    hash &= hash;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};
