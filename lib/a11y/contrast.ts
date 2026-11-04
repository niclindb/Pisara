// Color contrast math from WCAG 2.2 (success criteria 1.4.3 and 1.4.11).
// https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio

/** Minimum ratios for WCAG 2.2 AA. */
export const AA = {
  /** Body text and anything under 24px (or under 18.66px bold). 1.4.3 */
  text: 4.5,
  /** Text at 24px+ or 18.66px+ bold. 1.4.3 */
  largeText: 3,
  /** Borders of inputs, icons, focus rings, chart marks against what's next to them. 1.4.11 */
  ui: 3,
} as const;

export type ContrastUse = keyof typeof AA;

/** Parses #rgb or #rrggbb into 0–255 channels. Throws on anything else. */
export function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a hex color: ${hex}`);
  let h = m[1]!;
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colors, from 1 (same) to 21 (black on white). Order doesn't matter. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** True when the pair meets AA for that use. Uses the unrounded ratio, as WCAG requires. */
export function meetsAA(foreground: string, background: string, use: ContrastUse): boolean {
  return contrastRatio(foreground, background) >= AA[use];
}
