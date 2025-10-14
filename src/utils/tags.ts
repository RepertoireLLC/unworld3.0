export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function presentTag(tag: string): string {
  const normalized = normalizeTag(tag);
  if (!normalized) {
    return '';
  }
  return normalized
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function deduplicateTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    unique.push(tag.trim());
  }
  return unique;
}
