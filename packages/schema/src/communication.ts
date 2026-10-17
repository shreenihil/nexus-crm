import { z } from 'zod';

export const channelTypeSchema = z.enum(['email', 'sms', 'whatsapp', 'call', 'internal_note']);
export type ChannelType = z.infer<typeof channelTypeSchema>;

export const threadStatusSchema = z.enum(['open', 'pending', 'resolved', 'snoozed']);
export type ThreadStatus = z.infer<typeof threadStatusSchema>;

export const messageDirectionSchema = z.enum(['inbound', 'outbound', 'internal']);
export type MessageDirection = z.infer<typeof messageDirectionSchema>;

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  mimeType: z.string(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

export const messageParticipantSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  userId: z.string().optional(),
});
export type MessageParticipant = z.infer<typeof messageParticipantSchema>;

export const messageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  workspaceId: z.string(),
  direction: messageDirectionSchema,
  channel: channelTypeSchema,
  sender: messageParticipantSchema,
  recipients: z.array(messageParticipantSchema),
  subject: z.string().optional(),
  bodyText: z.string(),
  bodyHtml: z.string().optional(),
  isInternalNote: z.boolean().default(false),
  attachments: z.array(attachmentSchema).default([]),
  spfDkimStatus: z.enum(['pass', 'fail', 'neutral']).optional(),
  inReplyTo: z.string().optional(),
  messageIdHeader: z.string().optional(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

export const messageThreadSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  subject: z.string(),
  channel: channelTypeSchema,
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
  status: threadStatusSchema.default('open'),
  assignedUserId: z.string().nullable().optional(),
  assignedTeamId: z.string().nullable().optional(),
  slaDueAt: z.string().nullable().optional(),
  lastMessageAt: z.string(),
  unreadCount: z.number().int().nonnegative().default(0),
  participantSummary: z.string().optional(),
  snippetPreview: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MessageThread = z.infer<typeof messageThreadSchema>;

export const sequenceStepSchema = z.object({
  id: z.string(),
  stepOrder: z.number().int().nonnegative(),
  dayOffset: z.number().int().nonnegative(),
  type: z.enum(['email', 'task_call', 'sms']),
  subject: z.string().optional(),
  body: z.string(),
});
export type SequenceStep = z.infer<typeof sequenceStepSchema>;

export const sequenceSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1, 'Sequence name is required'),
  description: z.string().optional(),
  steps: z.array(sequenceStepSchema),
  exitOnReply: z.boolean().default(true),
  exitOnMeetingBooked: z.boolean().default(true),
  exitOnDealWon: z.boolean().default(true),
  dailyDomainLimit: z.number().int().positive().default(50),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Sequence = z.infer<typeof sequenceSchema>;

export const sequenceEnrollmentSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  sequenceId: z.string(),
  contactId: z.string(),
  contactEmail: z.string(),
  currentStepIndex: z.number().int().nonnegative().default(0),
  nextStepDueAt: z.string(),
  status: z.enum(['running', 'completed', 'canceled_reply', 'canceled_won', 'paused']),
  enrolledAt: z.string(),
  updatedAt: z.string(),
});
export type SequenceEnrollment = z.infer<typeof sequenceEnrollmentSchema>;

export const callOutcomeSchema = z.enum(['connected', 'left_voicemail', 'busy', 'wrong_number', 'no_answer']);
export type CallOutcome = z.infer<typeof callOutcomeSchema>;

export const telephonyCallSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  userId: z.string(),
  phoneNumber: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  durationSeconds: z.number().int().nonnegative(),
  outcome: callOutcomeSchema,
  notes: z.string().optional(),
  recordingUrl: z.string().optional(),
  createdAt: z.string(),
});
export type TelephonyCall = z.infer<typeof telephonyCallSchema>;

export const communicationPreferencesSchema = z.object({
  contactId: z.string(),
  workspaceId: z.string(),
  emailOptOut: z.boolean().default(false),
  smsOptOut: z.boolean().default(false), // DNC (Do Not Call / SMS) flag
  updatedAt: z.string(),
});
export type CommunicationPreferences = z.infer<typeof communicationPreferencesSchema>;

export const cannedSnippetSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  shortcut: z.string(), // e.g. "!intro"
  title: z.string(),
  body: z.string(),
  category: z.string().default('General'),
});
export type CannedSnippet = z.infer<typeof cannedSnippetSchema>;

/**
 * Opt-out / DNC detection for inbound SMS.
 * Matches industry standards: STOP, UNSUBSCRIBE, CANCEL, QUIT, END.
 */
export function detectSmsOptOut(body: string): boolean {
  if (!body) return false;
  const trimmed = body.trim().toUpperCase();
  const optOutWords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'END', 'STOPALL'];
  if (optOutWords.includes(trimmed)) return true;
  const tokens = trimmed.split(/[\s,.;!]+/);
  return tokens.some((w) => optOutWords.includes(w));
}

/**
 * Variable substitution engine for email and message templates.
 * Supports {{first_name}}, {{company}}, {{deal_amount}}, etc.
 */
export function substituteTemplateVariables(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Thread stitching matching logic for email.
 * Evaluates In-Reply-To, References, and Subject clean prefix.
 */
export function stitchEmailThread(
  inReplyToHeader?: string,
  referencesHeader?: string[],
  cleanSubject?: string,
  existingThreads: Array<{ id: string; subject: string; messageIds: string[] }> = []
): string | null {
  // 1. Direct In-Reply-To match
  if (inReplyToHeader) {
    const match = existingThreads.find((t) => t.messageIds.includes(inReplyToHeader));
    if (match) return match.id;
  }

  // 2. References match
  if (referencesHeader && referencesHeader.length > 0) {
    for (const ref of referencesHeader) {
      const match = existingThreads.find((t) => t.messageIds.includes(ref));
      if (match) return match.id;
    }
  }

  // 3. Normalized subject match
  if (cleanSubject) {
    const normalized = cleanSubject.replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
    const match = existingThreads.find((t) => {
      const targetNorm = t.subject.replace(/^(re|fwd|fw):\s*/i, '').trim().toLowerCase();
      return targetNorm === normalized;
    });
    if (match) return match.id;
  }

  return null;
}

/**
 * Enforces business hours send window (e.g. 8 AM to 6 PM local time, Monday - Friday).
 */
export function isWithinSendWindow(
  date: Date = new Date(),
  startHour: number = 8,
  endHour: number = 18
): boolean {
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 0 || day === 6) return false;
  const hours = date.getHours();
  return hours >= startHour && hours < endHour;
}
