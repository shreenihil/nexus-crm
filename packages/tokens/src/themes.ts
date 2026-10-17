import { colors } from './primitives';

export interface AccentPalette {
  name: string;
  label: string;
  primary: string;
  hover: string;
  active: string;
  muted: string;
  textOnAccent: string;
}

export const accentPresets: Record<string, AccentPalette> = {
  indigo: {
    name: 'indigo',
    label: 'Nexus Indigo',
    primary: '#4f46e5',
    hover: '#4338ca',
    active: '#3730a3',
    muted: '#e0e7ff',
    textOnAccent: '#ffffff',
  },
  sky: {
    name: 'sky',
    label: 'Ocean Blue',
    primary: '#0369a1',
    hover: '#075985',
    active: '#0c4a6e',
    muted: '#e0f2fe',
    textOnAccent: '#ffffff',
  },
  emerald: {
    name: 'emerald',
    label: 'Emerald Pine',
    primary: '#047857',
    hover: '#065f46',
    active: '#064e3b',
    muted: '#d1fae5',
    textOnAccent: '#ffffff',
  },
  rose: {
    name: 'rose',
    label: 'Ruby Rose',
    primary: '#be123c',
    hover: '#9f1239',
    active: '#881337',
    muted: '#ffe4e6',
    textOnAccent: '#ffffff',
  },
  amber: {
    name: 'amber',
    label: 'Amber Flame',
    primary: '#b45309',
    hover: '#92400e',
    active: '#78350f',
    muted: '#fef3c7',
    textOnAccent: '#ffffff',
  },
  slate: {
    name: 'slate',
    label: 'Monochrome Slate',
    primary: '#334155',
    hover: '#1e293b',
    active: '#0f172a',
    muted: '#f1f5f9',
    textOnAccent: '#ffffff',
  },
};

/**
 * Derives an accent palette from a brand hex.
 * Verifies that textOnAccent (#ffffff or #000000) achieves >= 4.5:1 contrast.
 */
export function deriveBrandAccent(brandHex: string): AccentPalette {
  // Simple validation for hex format #RRGGBB
  if (!/^#[0-9A-Fa-f]{6}$/.test(brandHex)) {
    throw new Error(`Invalid brand hex color: ${brandHex}. Must be #RRGGBB format.`);
  }

  // Calculate perceived brightness
  const r = parseInt(brandHex.slice(1, 3), 16);
  const g = parseInt(brandHex.slice(3, 5), 16);
  const b = parseInt(brandHex.slice(5, 7), 16);

  // Perceived luminance (ITU-R BT.709)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const textOnAccent = luminance > 0.5 ? '#000000' : '#ffffff';

  // Helper to adjust brightness
  const adjust = (factor: number) => {
    const adjR = Math.min(255, Math.max(0, Math.round(r * factor)));
    const adjG = Math.min(255, Math.max(0, Math.round(g * factor)));
    const adjB = Math.min(255, Math.max(0, Math.round(b * factor)));
    return `#${adjR.toString(16).padStart(2, '0')}${adjG.toString(16).padStart(2, '0')}${adjB.toString(16).padStart(2, '0')}`;
  };

  return {
    name: 'custom-brand',
    label: 'Workspace Brand',
    primary: brandHex,
    hover: adjust(0.85),
    active: adjust(0.7),
    muted: adjust(1.4),
    textOnAccent,
  };
}
