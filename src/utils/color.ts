export function generateColor(): string {
  const randomValue = Math.floor(Math.random() * 0xffffff);
  return `#${randomValue.toString(16).padStart(6, '0')}`;
}
