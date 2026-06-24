// Jade Pavilion brand palette — inspired by jade, vermillion red, and gold leaf.
// Used by all screens; pair with NativeWind classes where helpful.

export const palette = {
  jade: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    deep: '#00352B',
  },
  vermillion: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    300: '#FCA5A5',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#7F1D1D',
    deep: '#3B0A0A',
  },
  gold: {
    100: '#FEF3C7',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    leaf: '#E0B449',
  },
  ink: {
    50: '#F8FAF9',
    100: '#F1F5F3',
    200: '#E5EAE7',
    300: '#CBD2CE',
    500: '#6B7872',
    700: '#2D3A34',
    900: '#0E1714',
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

export const lightTheme: ThemeColors = {
  mode: 'light',
  bg: '#F6FBF8',
  bgElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F3',
  border: '#E2EAE5',
  borderStrong: '#CBD7D0',
  text: '#0E1714',
  textMuted: '#3F4D46',
  textSubtle: '#6B7872',
  primary: palette.jade[700],
  primaryDark: palette.jade[800],
  primaryFg: '#FFFFFF',
  accent: palette.vermillion[600],
  accentFg: '#FFFFFF',
  gold: palette.gold.leaf,
  goldDark: palette.gold[600],
  danger: palette.vermillion[600],
  success: palette.jade[600],
  shadow: 'rgba(6, 78, 59, 0.18)',
  gradientPrimary: [palette.jade[700], palette.jade[500]] as const,
  gradientWarm: [palette.vermillion[600], palette.gold[500]] as const,
  gradientHero: [palette.jade.deep, palette.jade[700], palette.jade[500]] as const,
  tabActive: palette.jade[700],
  tabInactive: '#7C8B83',
  tabBg: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  mode: 'dark',
  bg: '#06120E',
  bgElevated: '#0C1F18',
  surface: '#0F2620',
  surfaceAlt: '#163029',
  border: '#1E3A33',
  borderStrong: '#27514A',
  text: '#F1F5F3',
  textMuted: '#B7C4BD',
  textSubtle: '#7E8E87',
  primary: palette.jade[400],
  primaryDark: palette.jade[500],
  primaryFg: '#06120E',
  accent: palette.vermillion[500],
  accentFg: '#FFFFFF',
  gold: palette.gold[400],
  goldDark: palette.gold[600],
  danger: palette.vermillion[500],
  success: palette.jade[400],
  shadow: 'rgba(0, 0, 0, 0.5)',
  gradientPrimary: [palette.jade[600], palette.jade[400]] as const,
  gradientWarm: [palette.vermillion[700], palette.gold[600]] as const,
  gradientHero: ['#031310', palette.jade.deep, palette.jade[700]] as const,
  tabActive: palette.jade[300],
  tabInactive: '#5C6E67',
  tabBg: '#0C1F18',
};

export const getTheme = (mode: ThemeMode): ThemeColors =>
  mode === 'dark' ? darkTheme : lightTheme;
