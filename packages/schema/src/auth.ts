import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters long for enterprise security')
    .max(128, 'Password cannot exceed 128 characters'),
  firstName: z.string().min(1, 'First name is required').max(100).trim(),
  lastName: z.string().min(1, 'Last name is required').max(100).trim(),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters').max(100).trim(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z.object({
  token: z
    .string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must only contain digits'),
});

export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const mfaChallengeSchema = z.object({
  mfaTicket: z.string().uuid('Invalid MFA session ticket'),
  token: z
    .string()
    .length(6, 'TOTP code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must only contain digits'),
});

export type MfaChallengeInput = z.infer<typeof mfaChallengeSchema>;

export const mfaRecoverySchema = z.object({
  mfaTicket: z.string().uuid('Invalid MFA session ticket'),
  recoveryCode: z.string().min(8).max(32).trim(),
});

export type MfaRecoveryInput = z.infer<typeof mfaRecoverySchema>;
