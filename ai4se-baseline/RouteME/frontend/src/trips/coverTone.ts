const COVER_TONES = ['lagoon', 'coral', 'jade', 'dusk', 'amber'] as const;

export function coverTone(destinationCode: string): string {
  let hash = 0;
  for (const char of destinationCode) {
    hash = (hash + (char.codePointAt(0) ?? 0)) % 9973;
  }
  return COVER_TONES[hash % COVER_TONES.length];
}