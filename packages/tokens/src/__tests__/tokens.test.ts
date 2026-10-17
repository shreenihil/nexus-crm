import { describe, it, expect } from 'vitest';
import {
  getContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  lightTheme,
  darkTheme,
  highContrastTheme,
  accentPresets,
  deriveBrandAccent,
  compileCssVariables,
} from '../index.js';

describe('Design Tokens — WCAG 2.2 Contrast & Themes', () => {
  it('Light Theme primary text meets WCAG AA on surface and canvas', () => {
    const ratioSurface = getContrastRatio(lightTheme.textPrimary, lightTheme.bgSurface);
    const ratioCanvas = getContrastRatio(lightTheme.textPrimary, lightTheme.bgCanvas);

    expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
    expect(ratioCanvas).toBeGreaterThanOrEqual(4.5);
    expect(meetsWcagAA(lightTheme.textPrimary, lightTheme.bgSurface)).toBe(true);
  });

  it('Dark Theme primary text meets WCAG AA on surface and canvas', () => {
    const ratioSurface = getContrastRatio(darkTheme.textPrimary, darkTheme.bgSurface);
    const ratioCanvas = getContrastRatio(darkTheme.textPrimary, darkTheme.bgCanvas);

    expect(ratioSurface).toBeGreaterThanOrEqual(4.5);
    expect(ratioCanvas).toBeGreaterThanOrEqual(4.5);
    expect(meetsWcagAA(darkTheme.textPrimary, darkTheme.bgSurface)).toBe(true);
  });

  it('High Contrast Theme text meets WCAG AAA (>= 7:1) on surface and canvas', () => {
    const ratioSurface = getContrastRatio(highContrastTheme.textPrimary, highContrastTheme.bgSurface);
    const ratioCanvas = getContrastRatio(highContrastTheme.textPrimary, highContrastTheme.bgCanvas);

    expect(ratioSurface).toBeGreaterThanOrEqual(7.0);
    expect(ratioCanvas).toBeGreaterThanOrEqual(7.0);
    expect(meetsWcagAAA(highContrastTheme.textPrimary, highContrastTheme.bgSurface)).toBe(true);
  });

  it('All 6 accent presets have accessible text on accent (>= 4.5:1)', () => {
    for (const [key, palette] of Object.entries(accentPresets)) {
      const ratio = getContrastRatio(palette.textOnAccent, palette.primary);
      expect(ratio, `Accent ${key} text contrast should meet AA`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('Custom brand accent generator derives valid contrast', () => {
    // Test with light brand color
    const lightYellow = deriveBrandAccent('#FCD34D');
    expect(getContrastRatio(lightYellow.textOnAccent, lightYellow.primary)).toBeGreaterThanOrEqual(4.5);

    // Test with dark brand color
    const darkNavy = deriveBrandAccent('#1E1B4B');
    expect(getContrastRatio(darkNavy.textOnAccent, darkNavy.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('CSS variable compilation generates expected tokens', () => {
    const css = compileCssVariables();
    expect(css).toContain('--color-bg-canvas:');
    expect(css).toContain('--color-text-primary:');
    expect(css).toContain('.dark {');
    expect(css).toContain('.high-contrast');
    expect(css).toContain('[data-accent="indigo"]');
    expect(css).toContain('[data-density="compact"]');
  });
});
