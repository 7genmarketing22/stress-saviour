/**
 * Stress Saviors logo palette — 7 colors sampled from stress-savious-logo.png
 *
 * 1. Pale sky    — lightest S facet highlight
 * 2. Light aqua  — upper-mid facet
 * 3. Vibrant cyan — mid cyan facet
 * 4. Saviors blue — primary brand / "Saviors" text
 * 5. Royal blue  — lower-mid facet
 * 6. Navy        — deepest S facet
 * 7. Slate       — "Stress" text / secondary copy
 */
export const brandColors = {
  pale: "#a8e8f0",
  light: "#48c8e0",
  cyan: "#0090c0",
  primary: "#0080b8",
  royal: "#0863a4",
  navy: "#102c7b",
  slate: "#314e7a",
} as const;

export type BrandColor = keyof typeof brandColors;
