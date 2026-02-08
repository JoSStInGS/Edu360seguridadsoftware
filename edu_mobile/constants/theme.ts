/**
 * Edu360 Mobile Design System
 * Colors, fonts and styles based on edu360_web
 */

export const Colors = {
  light: {
    // Core
    primary: '#135bec',
    primaryLight: 'rgba(21,53,147,0.12)',
    primaryHover: 'rgba(21,53,147,0.2)',
    button: '#3498db',
    brandBlue: '#1E3A8A',

    // Status
    success: '#16A34A',
    successLight: 'rgba(7,136,61,0.12)',
    error: '#e73c08',
    errorLight: 'rgba(231,60,8,0.12)',
    warning: '#f59e0b',
    warningLight: 'rgba(245,158,11,0.12)',

    // Backgrounds
    background: '#f6f6f8',
    card: '#ffffff',
    surface: '#ffffff',

    // Text
    text: '#111827',
    textSecondary: '#506295',
    muted: '#6b7280',
    placeholder: '#7f8c8d',

    // Borders
    border: '#e8eaf3',
    borderFocus: '#135bec',

    // Tab Bar
    tabBar: '#ffffff',
    tabIconDefault: '#506295',
    tabIconSelected: '#135bec',

    // Misc
    overlay: 'rgba(0,0,0,0.4)',
    shadow: '#000',
  },
  dark: {
    // Core
    primary: '#4d8af0',
    primaryLight: 'rgba(21,53,147,0.2)',
    primaryHover: 'rgba(21,53,147,0.3)',
    button: '#3498db',
    brandBlue: '#4d8af0',

    // Status
    success: '#38a169',
    successLight: 'rgba(56,161,105,0.2)',
    error: '#e53e3e',
    errorLight: 'rgba(229,62,62,0.2)',
    warning: '#f59e0b',
    warningLight: 'rgba(245,158,11,0.2)',

    // Backgrounds
    background: '#101622',
    card: '#1a202c',
    surface: '#1a202c',

    // Text
    text: '#f8f9fb',
    textSecondary: '#a0aec0',
    muted: '#9BA1A6',
    placeholder: '#718096',

    // Borders
    border: '#2d3748',
    borderFocus: '#4d8af0',

    // Tab Bar
    tabBar: '#1a202c',
    tabIconDefault: '#a0aec0',
    tabIconSelected: '#4d8af0',

    // Misc
    overlay: 'rgba(0,0,0,0.6)',
    shadow: '#000',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const FontFamily = {
  regular: 'Lexend_400Regular',
  medium: 'Lexend_500Medium',
  bold: 'Lexend_700Bold',
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};
