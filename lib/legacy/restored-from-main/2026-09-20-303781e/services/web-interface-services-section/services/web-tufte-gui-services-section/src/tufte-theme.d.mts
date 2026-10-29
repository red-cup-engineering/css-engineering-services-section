export interface TufteTheme {
  name: "early-mac";
  styles: string;
  themeColor: string;
}

/** CSS for TUFTE's domain-neutral warm, monochrome early Macintosh theme. */
export const EARLY_MAC_THEME_STYLES: string;
export const EARLY_MAC_THEME: TufteTheme;

/** Resolve a supported named theme. Unknown values return null. */
export function resolveTufteTheme(theme?: string): TufteTheme | null;
