import { useMemo } from 'react';
import { StyleSheet, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

const brand = {
  primary: '#BE1C2D',
  primaryLight: '#FF6E7A',
  secondary: '#1D3557',
  onPrimary: '#FFFFFF',
};

const lightPalette = {
  ...brand,
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F0EFEC',
  border: '#E5E5E2',
  borderStrong: '#CFCFCC',
  text: '#111111',
  textSecondary: '#555555',
  muted: '#8A8A88',
  overlay: 'rgba(0,0,0,0.45)',
  accent: '#1D3557',
  success: '#0F6E56',
  danger: '#D13A2F',
  warning: '#B8560E',
  info: '#1D3557',
  primaryBg: 'rgba(190,28,45,0.10)',
  successBg: 'rgba(15,110,86,0.12)',
  dangerBg: 'rgba(209,58,47,0.10)',
  scrim: 'rgba(0,0,0,0.5)',
};

const darkPalette: typeof lightPalette = {
  primary: '#FF4655',
  primaryLight: '#FF8A94',
  secondary: '#8FB2D6',
  onPrimary: '#FFFFFF',
  bg: '#0F1012',
  surface: '#191A1D',
  surfaceElevated: '#22242A',
  surfaceMuted: '#1E2024',
  border: '#2A2C31',
  borderStrong: '#3A3D44',
  text: '#F4F4F1',
  textSecondary: '#B5B5B0',
  muted: '#7A7C82',
  overlay: 'rgba(0,0,0,0.7)',
  accent: '#8FB2D6',
  success: '#3ED0AA',
  danger: '#FF6659',
  warning: '#F0B47C',
  info: '#7AB8FF',
  primaryBg: 'rgba(255,70,85,0.16)',
  successBg: 'rgba(62,208,170,0.18)',
  dangerBg: 'rgba(255,102,89,0.16)',
  scrim: 'rgba(0,0,0,0.75)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 30,
} as const;

type TypeToken = Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'>;

export const typography: Record<
  'h1' | 'h2' | 'h3' | 'title' | 'body' | 'bodyStrong' | 'caption' | 'captionStrong' | 'micro',
  TypeToken
> = {
  h1: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2, lineHeight: 26 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 22 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodyStrong: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  captionStrong: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  micro: { fontSize: 11, fontWeight: '500', lineHeight: 14 },
};

export const gradients = {
  primary: [brand.primary, brand.primaryLight] as const,
  primaryVivid: ['#E11A2C', '#FF8A94'] as const,
  background: ['#FFF6F0', '#FFDCE0', '#FFB9C1'] as const,
  backgroundDark: ['#241318', '#180B10', '#0B0608'] as const,
  discount: ['#D13A2F', '#F45A45'] as const,
} as const;

const lightElevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  } as ViewStyle,
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  } as ViewStyle,
  brand: {
    shadowColor: brand.primary,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  } as ViewStyle,
};

const darkElevation: typeof lightElevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  brand: {
    shadowColor: '#FF4655',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

export type Palette = typeof lightPalette;
export type Elevation = typeof lightElevation;
export type Spacing = typeof spacing;
export type Radii = typeof radii;
export type FontSize = typeof fontSize;
export type Typography = typeof typography;
export type Gradients = typeof gradients;

export type Theme = {
  isDark: boolean;
  colors: Palette;
  spacing: Spacing;
  radii: Radii;
  fontSize: FontSize;
  typography: Typography;
  gradients: Gradients;
  elevation: Elevation;
};

export function useAppTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return useMemo(
    () => ({
      isDark,
      colors: isDark ? darkPalette : lightPalette,
      spacing,
      radii,
      fontSize,
      typography,
      gradients,
      elevation: isDark ? darkElevation : lightElevation,
    }),
    [isDark],
  );
}

/** Hook: build a StyleSheet from theme. Returns both styles and theme. */
export function useStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (t: Theme) => T,
): [T, Theme] {
  const theme = useAppTheme();
  const styles = useMemo(() => StyleSheet.create(factory(theme)), [theme, factory]);
  return [styles, theme];
}

// Backwards-compat static export (light palette). Prefer useAppTheme() in new code.
export const colors = lightPalette;
