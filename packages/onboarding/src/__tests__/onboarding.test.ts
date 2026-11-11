import { describe, it, expect } from 'vitest';
import { GENERAL_PRODUCT_TOUR } from '../tours/definitions';

describe('Onboarding System (§3.1 & §3.2)', () => {
  it('validates that General Product Tour definition has valid unique steps and targets', () => {
    expect(GENERAL_PRODUCT_TOUR.id).toBe('tour-general-overview');
    expect(GENERAL_PRODUCT_TOUR.steps.length).toBeGreaterThanOrEqual(6);

    const stepIds = new Set<string>();
    for (const step of GENERAL_PRODUCT_TOUR.steps) {
      expect(stepIds.has(step.id)).toBe(false);
      stepIds.add(step.id);
      expect(step.targetTourId).toBeDefined();
      expect(step.targetTourId.length).toBeGreaterThan(0);
      expect(step.title.en).toBeDefined();
      expect(step.title.hi).toBeDefined();
      expect(step.body.en).toBeDefined();
      expect(step.body.hi).toBeDefined();
    }
  });

  it('guarantees bilingual parity for all tour step titles and descriptions', () => {
    for (const step of GENERAL_PRODUCT_TOUR.steps) {
      expect(step.title.en.trim().length).toBeGreaterThan(3);
      expect(step.title.hi.trim().length).toBeGreaterThan(3);
      expect(step.body.en.trim().length).toBeGreaterThan(10);
      expect(step.body.hi.trim().length).toBeGreaterThan(10);
    }
  });

  it('ensures tour target targets correspond to critical interactive surfaces', () => {
    const targets = GENERAL_PRODUCT_TOUR.steps.map((s) => s.targetTourId);
    expect(targets).toContain('nav-deals');
    expect(targets).toContain('search-command-palette');
    expect(targets).toContain('btn-new-deal');
    expect(targets).toContain('nav-duplicates');
    expect(targets).toContain('nav-automations');
    expect(targets).toContain('nav-settings');
  });
});
