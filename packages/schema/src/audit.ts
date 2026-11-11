import { z } from "zod";

export const auditEventSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  actorType: z.enum(["user", "api_key", "system"]),
  actorId: z.string().uuid().nullable().optional(),
  action: z.string().min(1).max(128),
  targetType: z.string().max(64).nullable().optional(),
  targetId: z.string().uuid().nullable().optional(),
  payload: z.record(z.any()),
  prevHash: z.string().length(64),
  currentHash: z.string().length(64),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;
