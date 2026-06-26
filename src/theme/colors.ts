// Sparrow brand palette — "Soft & Airy": sage green, blush, soft gold on light, breathable surfaces.
// Grounded in American Mahjong demographic + color-psychology research:
//   - Sage green: calm, gentle, wellness/lifestyle feel; nods to jade roots without heaviness
//   - Blush rose: warm, welcoming accent (used for highlights / secondary actions)
//   - Soft gold: gentle premium signal (used sparingly — subtitle rule, badges)
//   - Airy near-white backgrounds with generous negative space
//   - Warm-neutral charcoal-sage text: soft, never harsh pure black
// Brand: "Sparrow" (麻雀 máquè = "sparrow"; the 1-Bam tile is a bird) · subtitle "American Mahjong".
// Used by all screens; pair with NativeWind classes where helpful.

export const palette = {
  sage: {
    50: '#F2F8F5',
    100: '#E6F1EC',
    200: '#CFE4DB',
    300: '#AED3C5',
    400: '#92C2B1',
    500: '#7BB0A0', // brand primary — Soft Sage
    600: '#5BA28D', // deeper sage (mark / emphasis)
    700: '#488975',
    800: '#3A6F5F',
    900: '#2E4A40',
    deep: '#1C2622',
  },
  blush: {
    // Blush accent family
    50: '#FDF2F2',
    100: '#FBE5E5',
    200: '#F6D2D2',
    300: '#EFB9B9',
    400: '#E9A8A8', // standard blush
    500: '#DD8E8E',
    600: '#C97373', // deeper blush (text-on-light contrast)
    700: '#A85656',
    deep: '#5A2E2E',
  },
  gold: {
    // Soft gold accent family
    100: '#FBF1D6',
    200: '#F5E3B4',
    300: '#EAD08C',
    400: '#E4C97E', // standard soft gold
    500: '#D4B45F',
    600: '#B8973F',
    700: '#8F7430',
  },
  paper: {
    // Airy neutral foundation (the "table" / light surfaces)
    bg: '#F7FAF8', // primary background — barely-there sage tint
    surface: '#FFFFFF', // cards / modals — clean white
    alt: '#EEF5F1', // secondary surfaces / tile table
    border: '#DDE7E1', // soft border
    borderStrong: '#C7D6CE',
  },
  ink: {
    // Charcoal-sage text foundation
    900: '#2E3A35', // primary text (soft charcoal-green)
    700: '#52615A', // secondary text
    500: '#6B7A73', // tertiary / muted
    300: '#9AA7A1', // disabled / subtle
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  mode: ThemeMode;
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryDark: string;
  primaryFg: string;
  accent: string;
  accentFg: string;
  gold: string;
  goldDark: string;
  danger: string;
  success: string;
  shadow: string;
  gradientPrimary: readonly [string, string];
  gradientWarm: readonly [string, string];
  gradientHero: readonly [string, string, string];
  tabActive: string;
  tabInactive: string;
  tabBg: string;
};

// LIGHT MODE — airy near-white "table", soft sage structure, blush + gold for moments.
// (~60% paper surfaces / ~30% sage / ~10% blush+gold.)
export const lightTheme: ThemeColors = {
  mode: 'light',
  bg: palette.paper.bg, // #F7FAF8
  bgElevated: palette.paper.surface, // #FFFFFF
  surface: palette.paper.surface, // #FFFFFF cards
  surfaceAlt: palette.paper.alt, // #EEF5F1 tile-table / secondary
  border: palette.paper.border, // #DDE7E1
  borderStrong: palette.paper.borderStrong, // #C7D6CE
  text: palette.ink[900], // #2E3A35 (≈9.7:1 on bg — WCAG AAA)
  textMuted: palette.ink[700], // #52615A
  textSubtle: palette.ink[500], // #6B7A73
  primary: palette.sage[500], // #7BB0A0
  primaryDark: palette.sage[600], // #5BA28D
  primaryFg: '#FFFFFF', // white reads on sage buttons
  accent: palette.blush[400], // #E9A8A8 blush
  accentFg: palette.blush.deep, // #5A2E2E — dark text on light blush (AA)
  gold: palette.gold[400], // #E4C97E soft gold
  goldDark: palette.gold[600], // #B8973F (for text/icons needing contrast)
  danger: '#C9483F', // muted brick red (errors only — distinct from blush accent)
  success: palette.sage[600], // #5BA28D
  shadow: 'rgba(46, 58, 53, 0.10)', // soft sage-tinted shadow (airy, not heavy)
  gradientPrimary: [palette.sage[600], palette.sage[400]] as const,
  gradientWarm: [palette.blush[400], palette.gold[300]] as const,
  gradientHero: [palette.sage[400], palette.sage[200], palette.paper.bg] as const, // airy top-down
  tabActive: palette.sage[600], // #5BA28D
  tabInactive: '#AEB9B3', // soft stone-sage
  tabBg: palette.paper.surface, // #FFFFFF
};

// DARK MODE — deep soft-forest (not pure black), warm-light text, lightened sage.
export const darkTheme: ThemeColors = {
  mode: 'dark',
  bg: '#1C2622', // deep soft forest
  bgElevated: '#27332E',
  surface: '#27332E',
  surfaceAlt: '#2F3D37',
  border: '#3A4842',
  borderStrong: '#4A5A53',
  text: '#E7EFEA', // warm-light (≈12:1 on bg)
  textMuted: '#A9B7B0',
  textSubtle: '#82918A',
  primary: '#9FCBBC', // lightened sage for contrast on dark
  primaryDark: palette.sage[500], // #7BB0A0
  primaryFg: '#15201C',
  accent: '#EEB7B7', // softened blush pops on dark
  accentFg: '#3A1E1E',
  gold: '#E9D08C', // pale gold pops on dark
  goldDark: palette.gold[400], // #E4C97E
  danger: '#E08077', // lightened brick for dark bg
  success: '#9FCBBC',
  shadow: 'rgba(0, 0, 0, 0.45)',
  gradientPrimary: ['#5BA28D', '#9FCBBC'] as const,
  gradientWarm: ['#EEB7B7', '#E9D08C'] as const,
  gradientHero: ['#15201C', palette.sage.deep, '#3E5950'] as const,
  tabActive: '#9FCBBC',
  tabInactive: '#76847E',
  tabBg: '#27332E',
};

export const getTheme = (mode: ThemeMode): ThemeColors =>
  mode === 'dark' ? darkTheme : lightTheme;
