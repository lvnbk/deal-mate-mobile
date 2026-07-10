export const colors = {
  bg: '#FFFFFF',
  surface: '#F7F7F5',
  border: '#E5E5E2',
  text: '#111111',
  // Brand
  primary: '#BE1C2D',
  primaryLight: '#FF6E7A', // gradient end / lighter primary
  secondary: '#1D3557',
  onPrimary: '#FFFFFF', // text/icon color on brand backgrounds
  // Semantic
  textSecondary: '#666666',
  muted: '#999999',
  danger: '#D13A2F',
  success: '#0F6E56',
  // Interactive links map to the brand secondary (navy)
  accent: '#1D3557',
};

// Gradient token pairs (use with expo-linear-gradient <LinearGradient colors={gradients.primary} />)
export const gradients = {
  primary: [colors.primary, colors.primaryLight] as const,
  // Branded page background: soft cream → warm coral-pink. Bold but keeps dark text readable.
  background: ['#FFF6F0', '#FFDCE0', '#FFB9C1'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
};
