import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  mfaVerifySchema,
  updateWorkspaceSchema,
} from '../index.js';

describe('Schema Validation Unit Tests', () => {
  it('Validates valid registration input', () => {
    const valid = {
      email: 'jane.doe@company.com',
      password: 'StrongPassword123!',
      firstName: 'Jane',
      lastName: 'Doe',
      workspaceName: 'Acme Global',
    };
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('Rejects passwords shorter than 12 characters', () => {
    const invalid = {
      email: 'jane@company.com',
      password: 'short',
      firstName: 'Jane',
      lastName: 'Doe',
      workspaceName: 'Acme',
    };
    const result = registerSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('Validates 6-digit TOTP format', () => {
    expect(mfaVerifySchema.safeParse({ token: '123456' }).success).toBe(true);
    expect(mfaVerifySchema.safeParse({ token: '12345' }).success).toBe(false);
    expect(mfaVerifySchema.safeParse({ token: 'abcdef' }).success).toBe(false);
  });

  it('Validates workspace hex brand color', () => {
    expect(updateWorkspaceSchema.safeParse({ brandColor: '#6366F1' }).success).toBe(true);
    expect(updateWorkspaceSchema.safeParse({ brandColor: 'not-a-color' }).success).toBe(false);
  });
});
