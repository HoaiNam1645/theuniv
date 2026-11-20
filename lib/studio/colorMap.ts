/**
 * Map a Vietnamese/English colour name to a swatch hex.
 *
 * Used by the storefront colour dots and by the studio's garment swatches. The
 * original version knew only white and black and returned `#ccc` for everything
 * else — so a product offering Xám / Navy / Đỏ rendered three identical grey
 * dots and the buyer could not tell which one they had selected.
 *
 * Matching is by substring so real product data ("Xanh navy", "Đỏ đô", "Heather
 * Grey") resolves without an exact-name contract. Order matters: a more
 * specific name is tested before the family it belongs to ("xanh navy" before
 * plain "xanh"), because the first match wins.
 */
const COLOR_PATTERNS: [RegExp, string][] = [
  [/trắng|trang\b|white/i, '#ffffff'],
  [/đen|den\b|black/i, '#111114'],
  [/navy|xanh\s*(navy|đen|bò)/i, '#1f3350'],
  [/xám|xam\b|ghi\b|grey|gray/i, '#9aa0a6'],
  [/đỏ|red|burgundy|đô\b/i, '#b3261e'],
  [/cam\b|orange/i, '#e2681c'],
  [/vàng|vang\b|yellow|mustard/i, '#e0b21e'],
  [/rêu|reu\b|olive|army/i, '#5b6236'],
  [/xanh\s*lá|green/i, '#2f7d4f'],
  [/xanh\s*dương|biển|bien\b|blue/i, '#1d6fb8'],
  [/hồng|hong\b|pink/i, '#d76d94'],
  [/tím|tim\b|purple|violet/i, '#6b4fa1'],
  [/nâu|nau\b|brown/i, '#6b4a32'],
  [/be\b|beige|kem|cream/i, '#e7dbc8'],
];

/** Neutral for an unrecognised name — never mistaken for a real colour. */
export const UNKNOWN_COLOR_HEX = '#cccccc';

export function colorNameToHex(name: string): string {
  const value = (name ?? '').trim();
  if (!value) return UNKNOWN_COLOR_HEX;
  for (const [pattern, hex] of COLOR_PATTERNS) {
    if (pattern.test(value)) return hex;
  }
  return UNKNOWN_COLOR_HEX;
}
