import { colors } from './primitives';

export interface SemanticThemeTokens {
  // Surfaces
  bgCanvas: string;
  bgSurface: string;
  bgSubtle: string;
  bgElevated: string;
  bgOverlay: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders
  borderDefault: string;
  borderMuted: string;
  borderStrong: string;
  borderFocus: string;

  // Status indicators
  statusSuccessBg: string;
  statusSuccessText: string;
  statusSuccessBorder: string;

  statusWarningBg: string;
  statusWarningText: string;
  statusWarningBorder: string;

  statusDangerBg: string;
  statusDangerText: string;
  statusDangerBorder: string;

  statusInfoBg: string;
  statusInfoText: string;
  statusInfoBorder: string;
}

export const lightTheme: SemanticThemeTokens = {
  bgCanvas: '#f8fafc',
  bgSurface: '#ffffff',
  bgSubtle: '#f1f5f9',
  bgElevated: '#ffffff',
  bgOverlay: 'rgba(15, 23, 42, 0.5)',

  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textInverse: '#ffffff',

  borderDefault: '#e2e8f0',
  borderMuted: '#f1f5f9',
  borderStrong: '#cbd5e1',
  borderFocus: '#6366f1',

  statusSuccessBg: '#ecfdf5',
  statusSuccessText: '#065f46',
  statusSuccessBorder: '#a7f3d0',

  statusWarningBg: '#fffbeb',
  statusWarningText: '#92400e',
  statusWarningBorder: '#fde68a',

  statusDangerBg: '#fff1f2',
  statusDangerText: '#9f1239',
  statusDangerBorder: '#fecdd3',

  statusInfoBg: '#f0f9ff',
  statusInfoText: '#075985',
  statusInfoBorder: '#bae6fd',
};

export const darkTheme: SemanticThemeTokens = {
  bgCanvas: '#090d16',
  bgSurface: '#111726',
  bgSubtle: '#182032',
  bgElevated: '#1f293d',
  bgOverlay: 'rgba(0, 0, 0, 0.75)',

  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textInverse: '#0f172a',

  borderDefault: '#1e293b',
  borderMuted: '#182032',
  borderStrong: '#334155',
  borderFocus: '#818cf8',

  statusSuccessBg: '#022c22',
  statusSuccessText: '#6ee7b7',
  statusSuccessBorder: '#065f46',

  statusWarningBg: '#451a03',
  statusWarningText: '#fcd34d',
  statusWarningBorder: '#92400e',

  statusDangerBg: '#4c0519',
  statusDangerText: '#fda4af',
  statusDangerBorder: '#9f1239',

  statusInfoBg: '#082f49',
  statusInfoText: '#7dd3fc',
  statusInfoBorder: '#075985',
};

export const highContrastTheme: SemanticThemeTokens = {
  bgCanvas: '#000000',
  bgSurface: '#0a0a0a',
  bgSubtle: '#171717',
  bgElevated: '#262626',
  bgOverlay: 'rgba(0, 0, 0, 0.9)',

  textPrimary: '#ffffff',
  textSecondary: '#f5f5f5',
  textMuted: '#d4d4d4',
  textInverse: '#000000',

  borderDefault: '#ffffff',
  borderMuted: '#a3a3a3',
  borderStrong: '#ffffff',
  borderFocus: '#ffff00', // high-vis yellow focus

  statusSuccessBg: '#000000',
  statusSuccessText: '#4ade80',
  statusSuccessBorder: '#4ade80',

  statusWarningBg: '#000000',
  statusWarningText: '#facc15',
  statusWarningBorder: '#facc15',

  statusDangerBg: '#000000',
  statusDangerText: '#f87171',
  statusDangerBorder: '#f87171',

  statusInfoBg: '#000000',
  statusInfoText: '#60a5fa',
  statusInfoBorder: '#60a5fa',
};
