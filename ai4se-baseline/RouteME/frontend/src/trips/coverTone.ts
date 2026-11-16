export const COVER_TONES = ['lagoon', 'coral', 'jade', 'dusk', 'amber'] as const;

/**
 * 目的地色调：同一目的地稳定映射到五色之一，用于没有图片时的内置封面。
 */
export function coverTone(destination: string): string {
  let hash = 0;
  for (const char of destination) {
    hash = (hash + (char.codePointAt(0) ?? 0)) % 9973;
  }
  return COVER_TONES[hash % COVER_TONES.length];
}