import { z } from 'zod';

export const workspaceRoles = [
  'owner',
  'admin',
  'sales_manager',
  'sales_rep',
  'support',
  'finance',
  'read_only',
] as const;

export type WorkspaceRole = (typeof workspaceRoles)[number];

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g. #3B82F6)')
    .optional(),
  logoUrl: z.string().url().nullable().optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role: z.enum(workspaceRoles),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
