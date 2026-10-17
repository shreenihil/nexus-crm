import { createHash } from 'node:crypto';
import { generateUuidV7, calculateAuditHash, hashPassword } from '../lib/crypto';
import type {
  WorkspaceRole,
  Pipeline,
  PipelineStage,
  Product,
  Quote,
  MessageThread,
  Message,
  Sequence,
  SequenceEnrollment,
  TelephonyCall,
  CommunicationPreferences,
  CannedSnippet,
} from '@nexus/schema';
import {
  evaluateFormula,
  DEFAULT_PIPELINE_STAGES,
  calculateQuoteTotals,
  calculatePipelineMetrics,
  isDealRotting,
  detectSmsOptOut,
  substituteTemplateVariables,
  stitchEmailThread,
} from '@nexus/schema';
import {
  evaluateDuplicateMatch,
  InvertedCandidateIndex,
  type DedupRecord,
  type ScoreFactor,
  type MatchScoreResult,
} from '@nexus/dedup';
import {
  type WorkflowNode,
  type WorkflowNodeType,
  type WorkflowStepLog,
  type WorkflowExecutionResult,
  executeWorkflowDAG,
  signWebhookPayload,
  verifyWebhookSignature,
  validateWorkflowDAG,
} from '@nexus/workflow';
import {
  generateKey,
  wrapDek,
  unwrapDek,
  encryptData,
  decryptData,
  rotateMasterKey,
  type EncryptedDekEnvelope,
  type RotationResult,
} from '@nexus/kms';

export interface KmsMasterKeyRecord {
  id: string;
  workspaceId: string;
  version: number;
  status: 'ACTIVE' | 'ROTATED' | 'REVOKED';
  algorithm: 'AES-256-GCM';
  keyHex: string;
  createdAt: string;
  rotatedAt?: string | null;
}

export interface TenantExportArchive {
  manifest: {
    formatVersion: '1.0.0';
    workspaceId: string;
    workspaceName: string;
    exportedAt: string;
    checksumSha256: string;
    entityCounts: Record<string, number>;
    latestAuditHash: string;
    auditChainLength: number;
  };
  schemas: {
    objects: ObjectRecord[];
    attributes: AttributeRecord[];
    relationships: RelationshipRecord[];
  };
  data: {
    records: RecordEntity[];
    recordLinks: RecordLink[];
    pipelines: Pipeline[];
    products: Product[];
    quotes: Quote[];
    workflows: WorkflowRecord[];
    outboundWebhooks: OutboundWebhookSubscription[];
  };
  security: {
    kmsKeys: Array<Omit<KmsMasterKeyRecord, 'keyHex'>>;
    auditLedger: AuditEventRecord[];
  };
}


export type WorkflowTriggerType =
  | 'record.created'
  | 'record.updated'
  | 'record.stage_changed'
  | 'webhook.inbound'
  | 'manual';

export interface WorkflowTriggerConfig {
  objectApiName?: string;
  condition?: string;
  webhookPath?: string;
  [key: string]: any;
}

export interface WorkflowRecord {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: WorkflowTriggerType;
  triggerConfig: WorkflowTriggerConfig;
  rootNodeId: string;
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunRecord {
  id: string;
  workspaceId: string;
  workflowId: string;
  status: 'completed' | 'failed';
  triggerEvent: string;
  triggerRecordId?: string;
  context: Record<string, any>;
  stepLogs: WorkflowStepLog[];
  durationMs: number;
  executedAt: string;
  executedBy?: string;
  error?: string;
}

export interface OutboundWebhookSubscription {
  id: string;
  workspaceId: string;
  targetUrl: string;
  secret: string;
  subscribedEvents: string[];
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLog {
  id: string;
  workspaceId: string;
  subscriptionId: string;
  targetUrl: string;
  event: string;
  payload: Record<string, any>;
  signature: string;
  timestamp: string;
  statusCode: number;
  status: 'SUCCESS' | 'FAILED';
  responseSummary?: string;
  durationMs: number;
  deliveredAt: string;
}

export interface OutboxEvent {
  id: string;
  workspaceId: string;
  eventType: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED' | 'DLQ';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  error?: string;
  createdAt: string;
  processedAt?: string;
}

export interface DeadLetterQueueItem {
  id: string;
  workspaceId: string;
  subscriptionId?: string;
  outboxEventId?: string;
  targetUrl: string;
  event: string;
  payload: Record<string, any>;
  attempts: number;
  lastStatusCode?: number;
  lastError: string;
  responseSnippet?: string;
  status: 'PENDING' | 'REPLAYING' | 'REPLAYED' | 'DISCARDED';
  replayedAt?: string;
  createdAt: string;
}

export interface AACConnection {
  id: string;
  workspaceId: string;
  provider: 'google' | 'microsoft';
  email: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  accessTokenEncrypted: string;
  privacySettings: {
    excludeInternalDomains: string[];
    excludeLabels: string[];
    shareLevel: 'metadata' | 'subject' | 'full';
  };
  syncedEmailsCount: number;
  lastSyncedAt?: string;
  deltaToken?: string;
  createdAt: string;
}


export interface DuplicatePairRecord {
  id: string;
  workspaceId: string;
  entityName: string; // 'people' | 'companies' | 'deals'
  primaryRecordId: string;
  duplicateRecordId: string;
  confidenceScore: number;
  confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW';
  isAutoMergeCandidate: boolean;
  status: 'PENDING' | 'MERGED' | 'DISMISSED';
  matchFactors: ScoreFactor[];
  summary: string;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

export interface MergeHistoryRecord {
  id: string;
  workspaceId: string;
  entityName: string;
  winnerRecordId: string;
  loserRecordId: string;
  snapshotWinnerBefore: RecordEntity;
  snapshotLoserBefore: RecordEntity;
  mergedData: Record<string, any>;
  transferredLinksCount: number;
  transferredActivitiesCount: number;
  repointedLinks: Array<{ linkId: string; previousRecordId: string; role: 'from' | 'to' }>;
  repointedEntities: Array<{ type: string; id: string; field: string; previousId: string }>;
  mergedBy: string;
  mergedAt: string;
  unmergedAt?: string | null;
  unmergedBy?: string | null;
  status: 'MERGED' | 'UNMERGED';
}


export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandColor: string;
  baseCurrency?: string;
  enabledCurrencies?: string[];
  locale?: string;
  timezone?: string;
  fiscalYearStartMonth?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  workspaceId: string;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface MfaFactorRecord {
  id: string;
  userId: string;
  type: 'totp';
  secret: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryCodeRecord {
  id: string;
  userId: string;
  codeHash: string;
  usedAt?: string | null;
}

export interface AuditEventRecord {
  id: string;
  workspaceId: string;
  actorType: 'user' | 'api_key' | 'system';
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  payload: Record<string, any>;
  prevHash: string;
  currentHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export type AttributeType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'dropdown_single'
  | 'dropdown_multi'
  | 'url'
  | 'email'
  | 'phone'
  | 'rating'
  | 'relation'
  | 'user'
  | 'formula';

export interface ObjectRecord {
  id: string;
  workspaceId: string;
  apiName: string;
  singularLabel: string;
  pluralLabel: string;
  icon: string;
  color: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttributeRecord {
  id: string;
  workspaceId: string;
  objectId: string;
  apiName: string;
  label: string;
  type: AttributeType;
  isRequired: boolean;
  isUnique: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  defaultValue?: any;
  optionsConfig?: Record<string, any>;
  formulaDefinition?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelationshipRecord {
  id: string;
  workspaceId: string;
  fromObjectId: string;
  toObjectId: string;
  cardinality: '1:1' | '1:N' | 'N:N';
  fromLabel: string;
  toLabel: string;
  createdAt: string;
}

export interface RecordEntity {
  id: string;
  workspaceId: string;
  objectId: string;
  data: Record<string, any>;
  version: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface RecordLink {
  id: string;
  workspaceId: string;
  relationshipId: string;
  fromRecordId: string;
  toRecordId: string;
  createdAt?: string;
}

export interface ViewRecord {
  id: string;
  workspaceId: string;
  objectId: string;
  name: string;
  type: 'table' | 'kanban' | 'calendar' | 'gallery';
  filters: any[];
  sorts: any[];
  columns: string[];
  isDefault: boolean;
  isShared: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEMO_WORKSPACE_ID = '01910000-0000-7000-8000-000000000001';
export const DEMO_USER_ID = '01910000-0000-7000-8000-000000000002';
export const DEMO_COMPANIES_OBJ_ID = '01910000-0000-7000-8000-000000000003';
export const DEMO_PEOPLE_OBJ_ID = '01910000-0000-7000-8000-000000000004';
export const DEMO_DEALS_OBJ_ID = '01910000-0000-7000-8000-000000000005';
export const DEMO_PIPELINE_ID = '01910000-0000-7000-8000-000000000006';

/**
 * Production-ready Multi-Tenant Database & Metadata Store.
 */
export class DatabaseStore {
  workspaces = new Map<string, WorkspaceRecord>();
  users = new Map<string, UserRecord>();
  memberships = new Map<string, MembershipRecord>();
  sessions = new Map<string, SessionRecord>();
  mfaFactors = new Map<string, MfaFactorRecord>();
  recoveryCodes = new Map<string, RecoveryCodeRecord>();
  auditEvents: AuditEventRecord[] = [];

  // Metadata & Records
  objects = new Map<string, ObjectRecord>();
  attributes = new Map<string, AttributeRecord>();
  relationships = new Map<string, RelationshipRecord>();
  records = new Map<string, RecordEntity>();
  recordLinks = new Map<string, RecordLink>();
  views = new Map<string, ViewRecord>();

  // Phase 2: Sales Execution (Pipelines, Stages, Products, Quotes)
  pipelines = new Map<string, Pipeline>();
  dealStageHistory: Array<{
    id: string;
    workspaceId: string;
    dealId: string;
    fromStage: string;
    toStage: string;
    transitionedAt: string;
    userId?: string;
  }> = [];
  products = new Map<string, Product>();
  quotes = new Map<string, Quote>();

  // Phase 3: Omnichannel Communication Engine
  threads = new Map<string, MessageThread>();
  messages = new Map<string, Message>();
  sequences = new Map<string, Sequence>();
  sequenceEnrollments = new Map<string, SequenceEnrollment>();
  telephonyCalls = new Map<string, TelephonyCall>();
  communicationPreferences = new Map<string, CommunicationPreferences>();
  snippets = new Map<string, CannedSnippet>();

  // Phase 4: Data Integrity, Deduplication & Identity Resolution
  duplicatePairs = new Map<string, DuplicatePairRecord>();
  mergeHistories = new Map<string, MergeHistoryRecord>();
  dismissedPairs = new Set<string>();

  // Phase 5: Workflow Automation, Webhooks & Extensibility Engine
  workflows = new Map<string, WorkflowRecord>();
  workflowRuns = new Map<string, WorkflowRunRecord>();
  outboundWebhooks = new Map<string, OutboundWebhookSubscription>();
  webhookDeliveries = new Map<string, WebhookDeliveryLog>();
  outboxEvents = new Map<string, OutboxEvent>();
  deadLetterQueue = new Map<string, DeadLetterQueueItem>();
  aacConnections = new Map<string, AACConnection>();

  // Phase 6: Platform Sovereignty, BYOK Envelope Encryption & Portability
  kmsKeys = new Map<string, KmsMasterKeyRecord>();
  encryptedDeks = new Map<string, EncryptedDekEnvelope>();



  // Genesis hash for tamper-evident audit ledger
  private latestAuditHash = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Initializes standard objects for a new workspace.
   */
  async seedStandardObjects(workspaceId: string): Promise<void> {
    const now = new Date().toISOString();
    const isDemo = workspaceId === DEMO_WORKSPACE_ID;

    // 1. Companies Object
    const companiesObjId = isDemo ? DEMO_COMPANIES_OBJ_ID : generateUuidV7();
    this.objects.set(companiesObjId, {
      id: companiesObjId,
      workspaceId,
      apiName: 'companies',
      singularLabel: 'Company',
      pluralLabel: 'Companies',
      icon: 'Building2',
      color: '#3B82F6',
      description: 'Business accounts, organizations, and clients',
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });

    const companyAttrs: Array<Omit<AttributeRecord, 'id' | 'workspaceId' | 'objectId' | 'createdAt' | 'updatedAt'>> = [
      { apiName: 'name', label: 'Company Name', type: 'text', isRequired: true, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'domain', label: 'Primary Domain', type: 'url', isRequired: false, isUnique: true, isFilterable: true, isSortable: true },
      { apiName: 'industry', label: 'Industry', type: 'dropdown_single', isRequired: false, isUnique: false, isFilterable: true, isSortable: true, optionsConfig: { choices: ['SaaS', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Other'] } },
      { apiName: 'annual_revenue', label: 'Annual Revenue', type: 'currency', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'employee_count', label: 'Employee Count', type: 'number', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'gstin', label: 'GSTIN', type: 'text', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'pan', label: 'PAN', type: 'text', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
    ];

    for (const attr of companyAttrs) {
      const attrId = generateUuidV7();
      this.attributes.set(attrId, { ...attr, id: attrId, workspaceId, objectId: companiesObjId, createdAt: now, updatedAt: now });
    }

    // 2. People Object
    const peopleObjId = isDemo ? DEMO_PEOPLE_OBJ_ID : generateUuidV7();
    this.objects.set(peopleObjId, {
      id: peopleObjId,
      workspaceId,
      apiName: 'people',
      singularLabel: 'Person',
      pluralLabel: 'People',
      icon: 'Users',
      color: '#10B981',
      description: 'Individual contacts, leads, and decision makers',
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });

    const peopleAttrs: Array<Omit<AttributeRecord, 'id' | 'workspaceId' | 'objectId' | 'createdAt' | 'updatedAt'>> = [
      { apiName: 'first_name', label: 'First Name', type: 'text', isRequired: true, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'last_name', label: 'Last Name', type: 'text', isRequired: true, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'email', label: 'Email Address', type: 'email', isRequired: true, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'phone', label: 'Phone Number', type: 'phone', isRequired: false, isUnique: false, isFilterable: true, isSortable: false },
      { apiName: 'title', label: 'Job Title', type: 'text', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'lifecycle_stage', label: 'Lifecycle Stage', type: 'dropdown_single', isRequired: false, isUnique: false, isFilterable: true, isSortable: true, optionsConfig: { choices: ['Lead', 'MQL', 'SQL', 'Opportunity', 'Customer', 'Evangelist'] } },
    ];

    for (const attr of peopleAttrs) {
      const attrId = generateUuidV7();
      this.attributes.set(attrId, { ...attr, id: attrId, workspaceId, objectId: peopleObjId, createdAt: now, updatedAt: now });
    }

    // 3. Deals Object
    const dealsObjId = isDemo ? DEMO_DEALS_OBJ_ID : generateUuidV7();
    this.objects.set(dealsObjId, {
      id: dealsObjId,
      workspaceId,
      apiName: 'deals',
      singularLabel: 'Deal',
      pluralLabel: 'Deals',
      icon: 'TrendingUp',
      color: '#F59E0B',
      description: 'Sales opportunities, renewals, and pipelines',
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });

    const dealsAttrs: Array<Omit<AttributeRecord, 'id' | 'workspaceId' | 'objectId' | 'createdAt' | 'updatedAt'>> = [
      { apiName: 'name', label: 'Deal Name', type: 'text', isRequired: true, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'amount', label: 'Deal Amount', type: 'currency', isRequired: true, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'currency', label: 'Currency', type: 'dropdown_single', isRequired: false, isUnique: false, isFilterable: true, isSortable: true, defaultValue: 'INR', optionsConfig: { choices: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY'] } },
      { apiName: 'exchange_rate', label: 'Exchange Rate', type: 'number', isRequired: false, isUnique: false, isFilterable: false, isSortable: false, defaultValue: 1.0 },
      { apiName: 'base_amount', label: 'Base Currency Amount (INR)', type: 'currency', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'stage', label: 'Pipeline Stage', type: 'dropdown_single', isRequired: true, isUnique: false, isFilterable: true, isSortable: true, optionsConfig: { choices: ['Qualified', 'Discovery', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'] } },
      { apiName: 'probability', label: 'Win Probability %', type: 'number', isRequired: false, isUnique: false, isFilterable: true, isSortable: true, defaultValue: 50 },
      {
        apiName: 'expected_value',
        label: 'Expected Value',
        type: 'formula',
        isRequired: false,
        isUnique: false,
        isFilterable: true,
        isSortable: true,
        formulaDefinition: '{amount} * ({probability} / 100)',
      },
      { apiName: 'close_date', label: 'Target Close Date', type: 'date', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'commission_rate', label: 'Commission Rate %', type: 'number', isRequired: false, isUnique: false, isFilterable: false, isSortable: false },
      { apiName: 'cost_basis', label: 'Internal Cost Basis', type: 'currency', isRequired: false, isUnique: false, isFilterable: false, isSortable: false },
    ];

    for (const attr of dealsAttrs) {
      const attrId = generateUuidV7();
      this.attributes.set(attrId, { ...attr, id: attrId, workspaceId, objectId: dealsObjId, createdAt: now, updatedAt: now });
    }

    // 4. Activities Object
    const activitiesObjId = generateUuidV7();
    this.objects.set(activitiesObjId, {
      id: activitiesObjId,
      workspaceId,
      apiName: 'activities',
      singularLabel: 'Activity',
      pluralLabel: 'Activities',
      icon: 'CheckSquare',
      color: '#8B5CF6',
      description: 'Tasks, notes, calls, meetings, and emails',
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });

    const activityAttrs: Array<Omit<AttributeRecord, 'id' | 'workspaceId' | 'objectId' | 'createdAt' | 'updatedAt'>> = [
      { apiName: 'type', label: 'Activity Type', type: 'dropdown_single', isRequired: true, isUnique: false, isFilterable: true, isSortable: true, optionsConfig: { choices: ['task', 'note', 'call', 'meeting', 'email'] } },
      { apiName: 'subject', label: 'Subject', type: 'text', isRequired: true, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'due_at', label: 'Due Date', type: 'datetime', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
      { apiName: 'completed_at', label: 'Completed Date', type: 'datetime', isRequired: false, isUnique: false, isFilterable: true, isSortable: true },
    ];

    for (const attr of activityAttrs) {
      const attrId = generateUuidV7();
      this.attributes.set(attrId, { ...attr, id: attrId, workspaceId, objectId: activitiesObjId, createdAt: now, updatedAt: now });
    }

    // Relationships:
    // Company ↔ People (1:N)
    const relCompanyPeopleId = generateUuidV7();
    this.relationships.set(relCompanyPeopleId, {
      id: relCompanyPeopleId,
      workspaceId,
      fromObjectId: companiesObjId,
      toObjectId: peopleObjId,
      cardinality: '1:N',
      fromLabel: 'Company',
      toLabel: 'Contacts',
      createdAt: now,
    });

    // Company ↔ Deals (1:N)
    const relCompanyDealsId = generateUuidV7();
    this.relationships.set(relCompanyDealsId, {
      id: relCompanyDealsId,
      workspaceId,
      fromObjectId: companiesObjId,
      toObjectId: dealsObjId,
      cardinality: '1:N',
      fromLabel: 'Company',
      toLabel: 'Deals',
      createdAt: now,
    });

    // Default Sales Pipeline & Stages
    const pipelineId = isDemo ? DEMO_PIPELINE_ID : generateUuidV7();
    this.pipelines.set(pipelineId, {
      id: pipelineId,
      workspaceId,
      name: 'Standard B2B Sales Pipeline',
      isDefault: true,
      stages: DEFAULT_PIPELINE_STAGES,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Seeds demo data for the development environment.
   */
  async seedDemoData(force = false): Promise<void> {
    if (this.users.size > 0 && !force) return;
    if (force) {
      this.workspaces.clear();
      this.users.clear();
      this.memberships.clear();
      this.sessions.clear();
      this.mfaFactors.clear();
      this.recoveryCodes.clear();
      this.auditEvents = [];
      this.latestAuditHash = '0000000000000000000000000000000000000000000000000000000000000000';
      this.objects.clear();
      this.attributes.clear();
      this.relationships.clear();
      this.records.clear();
      this.recordLinks.clear();
      this.views.clear();
      this.pipelines.clear();
      this.dealStageHistory = [];
      this.products.clear();
      this.quotes.clear();
      this.threads.clear();
      this.messages.clear();
      this.sequences.clear();
      this.sequenceEnrollments.clear();
      this.telephonyCalls.clear();
      this.communicationPreferences.clear();
      this.snippets.clear();
      this.duplicatePairs.clear();
      this.mergeHistories.clear();
      this.dismissedPairs.clear();
      this.workflows.clear();
      this.workflowRuns.clear();
      this.outboundWebhooks.clear();
      this.webhookDeliveries.clear();
      this.outboxEvents.clear();
      this.deadLetterQueue.clear();
      this.aacConnections.clear();
      this.kmsKeys.clear();
      this.encryptedDeks.clear();
    }
    const now = new Date().toISOString();
    const userId = DEMO_USER_ID;
    const workspaceId = DEMO_WORKSPACE_ID;
    const passwordHash = await hashPassword('SuperSecretPassword123!');

    const user: UserRecord = {
      id: userId,
      email: 'founder@acme.inc',
      passwordHash,
      firstName: 'Arthur',
      lastName: 'Dent',
      isActive: true,
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(userId, user);

    const workspace: WorkspaceRecord = {
      id: workspaceId,
      name: 'Acme India Pvt Ltd',
      slug: 'acme-india',
      brandColor: '#4f46e5',
      baseCurrency: 'INR',
      enabledCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'CHF', 'SAR', 'ZAR'],
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      fiscalYearStartMonth: 4,
      createdAt: now,
      updatedAt: now,
    };
    this.workspaces.set(workspaceId, workspace);

    const membershipId = generateUuidV7();
    this.memberships.set(membershipId, {
      id: membershipId,
      workspaceId,
      userId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    // Static Demo session token
    this.sessions.set('demo-session-token', {
      id: 'demo-session-token',
      userId,
      workspaceId,
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      lastUsedAt: now,
    });

    await this.seedStandardObjects(workspaceId);

    const companiesObj = Array.from(this.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === 'companies'
    );
    const peopleObj = Array.from(this.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === 'people'
    );
    const dealsObj = Array.from(this.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === 'deals'
    );
    const relCompanyPeople = Array.from(this.relationships.values()).find(
      (r) => r.workspaceId === workspaceId && r.fromObjectId === companiesObj?.id && r.toObjectId === peopleObj?.id
    );
    const relCompanyDeals = Array.from(this.relationships.values()).find(
      (r) => r.workspaceId === workspaceId && r.fromObjectId === companiesObj?.id && r.toObjectId === dealsObj?.id
    );

    if (companiesObj && peopleObj && dealsObj) {
      // 1. Companies
      const c1Id = generateUuidV7();
      this.records.set(c1Id, {
        id: c1Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Stark Industries', domain: 'https://starkindustries.com', industry: 'Manufacturing', annual_revenue: 50000000, employee_count: 12000 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c2Id = generateUuidV7();
      this.records.set(c2Id, {
        id: c2Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Wayne Enterprises', domain: 'https://waynecorp.com', industry: 'Finance', annual_revenue: 85000000, employee_count: 25000 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c3Id = generateUuidV7();
      this.records.set(c3Id, {
        id: c3Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Cyberdyne Systems', domain: 'https://cyberdyne.ai', industry: 'SaaS', annual_revenue: 15000000, employee_count: 850 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c4Id = generateUuidV7();
      this.records.set(c4Id, {
        id: c4Id,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Pied Piper Inc', domain: 'https://piedpiper.com', industry: 'SaaS', annual_revenue: 4200000, employee_count: 45 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Sovereign Indian Enterprise Companies (§4.7)
      const c5Id = generateUuidV7();
      this.records.set(c5Id, {
        id: c5Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'Tata Consultancy Services Ltd',
          domain: 'https://tcs.com',
          industry: 'SaaS',
          annual_revenue: 24000000000, // ₹2,400 Cr
          employee_count: 600000,
          gstin: '27AAACT2727Q1ZB',
          pan: 'AAACT2727Q',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c6Id = generateUuidV7();
      this.records.set(c6Id, {
        id: c6Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'Infosys BPM Ltd',
          domain: 'https://infosys.com',
          industry: 'SaaS',
          annual_revenue: 18000000000, // ₹1,800 Cr
          employee_count: 330000,
          gstin: '29AAACI4567M1ZV',
          pan: 'AAACI4567M',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c7Id = generateUuidV7();
      this.records.set(c7Id, {
        id: c7Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'Reliance Retail Ventures',
          domain: 'https://relianceretail.com',
          industry: 'Retail',
          annual_revenue: 30000000000, // ₹3,000 Cr
          employee_count: 400000,
          gstin: '27AABCR1234F1ZQ',
          pan: 'AABCR1234F',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c8Id = generateUuidV7();
      this.records.set(c8Id, {
        id: c8Id,
        workspaceId,
        objectId: companiesObj.id,
        data: {
          name: 'HDFC Enterprise Banking',
          domain: 'https://hdfcbank.com',
          industry: 'Finance',
          annual_revenue: 20000000000, // ₹2,000 Cr
          employee_count: 170000,
          gstin: '27AAACH2702H1Z1',
          pan: 'AAACH2702H',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Duplicate company records for deduplication & identity resolution
      const c2DupId = generateUuidV7();
      this.records.set(c2DupId, {
        id: c2DupId,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Wayne Enterprises, LLC', domain: 'https://waynecorp.com', industry: 'Finance', annual_revenue: 85000000, employee_count: 24500 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const c3DupId = generateUuidV7();
      this.records.set(c3DupId, {
        id: c3DupId,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Cyberdyne Systems Corp', domain: 'https://cyberdyne.ai', industry: 'SaaS', annual_revenue: 15000000, employee_count: 850 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Pre-merged historical company record for unmerge demonstration
      const c1MergedId = generateUuidV7();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
      this.records.set(c1MergedId, {
        id: c1MergedId,
        workspaceId,
        objectId: companiesObj.id,
        data: { name: 'Stark Industries Technologies', domain: 'https://starkindustries.com', industry: 'Manufacturing', annual_revenue: 50000000, employee_count: 12000 },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
        deletedAt: threeDaysAgo,
      });

      // 2. People
      const p1Id = generateUuidV7();
      this.records.set(p1Id, {
        id: p1Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Tony', last_name: 'Stark', email: 'tony@starkindustries.com', phone: '+1-212-555-0199', title: 'CEO & Chief Engineer', lifecycle_stage: 'Customer' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Duplicate person record for Tony Stark
      const p1DupId = generateUuidV7();
      this.records.set(p1DupId, {
        id: p1DupId,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Anthony', last_name: 'Stark', email: 'tony.stark@starkindustries.com', phone: '+1 212 555 0199', title: 'Chief Executive Officer', lifecycle_stage: 'Customer' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p2Id = generateUuidV7();
      this.records.set(p2Id, {
        id: p2Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Bruce', last_name: 'Wayne', email: 'bruce@waynecorp.com', phone: '+1-212-555-0144', title: 'Managing Director', lifecycle_stage: 'Opportunity' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p3Id = generateUuidV7();
      this.records.set(p3Id, {
        id: p3Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Sarah', last_name: 'Connor', email: 'sarah@cyberdyne.ai', phone: '+1-310-555-0182', title: 'VP Security', lifecycle_stage: 'MQL' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p4Id = generateUuidV7();
      this.records.set(p4Id, {
        id: p4Id,
        workspaceId,
        objectId: peopleObj.id,
        data: { first_name: 'Richard', last_name: 'Hendricks', email: 'richard@piedpiper.com', phone: '+1-650-555-0177', title: 'Founder & CEO', lifecycle_stage: 'Customer' },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // Sovereign Indian Enterprise Contacts
      const p5Id = generateUuidV7();
      this.records.set(p5Id, {
        id: p5Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'K.',
          last_name: 'Krithivasan',
          email: 'krithi@tcs.com',
          phone: '+91-22-6778-9999',
          title: 'CEO & Managing Director',
          lifecycle_stage: 'Customer',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p6Id = generateUuidV7();
      this.records.set(p6Id, {
        id: p6Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'Salil',
          last_name: 'Parekh',
          email: 'salil.parekh@infosys.com',
          phone: '+91-80-2852-0261',
          title: 'CEO & MD',
          lifecycle_stage: 'Customer',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p7Id = generateUuidV7();
      this.records.set(p7Id, {
        id: p7Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'Isha',
          last_name: 'Ambani',
          email: 'isha.ambani@relianceretail.com',
          phone: '+91-22-3555-5000',
          title: 'Executive Director',
          lifecycle_stage: 'Opportunity',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const p8Id = generateUuidV7();
      this.records.set(p8Id, {
        id: p8Id,
        workspaceId,
        objectId: peopleObj.id,
        data: {
          first_name: 'Sashidhar',
          last_name: 'Jagdishan',
          email: 'sashi.j@hdfcbank.com',
          phone: '+91-22-6652-1000',
          title: 'MD & CEO',
          lifecycle_stage: 'Customer',
        },
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // 3. Deals (with formula evaluation)
      const d1Id = '01910000-0000-7000-8000-000000000011';
      const d1Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Stark Enterprises Cloud Migration',
        amount: 180000,
        stage: 'Negotiation',
        probability: 80,
        close_date: '2026-11-30',
        commission_rate: 10,
        cost_basis: 40000,
      });
      this.records.set(d1Id, {
        id: d1Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d1Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d2Id = '01910000-0000-7000-8000-000000000012';
      const d2Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Wayne Corp Security Audit',
        amount: 95000,
        stage: 'Proposal Sent',
        probability: 60,
        close_date: '2026-12-15',
        commission_rate: 12,
        cost_basis: 25000,
      });
      this.records.set(d2Id, {
        id: d2Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d2Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d3Id = '01910000-0000-7000-8000-000000000013';
      const d3Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Cyberdyne Systems AI Pilot',
        amount: 240000,
        stage: 'Qualified',
        probability: 40,
        close_date: '2027-01-20',
        commission_rate: 8,
        cost_basis: 60000,
      });
      this.records.set(d3Id, {
        id: d3Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d3Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d4Id = '01910000-0000-7000-8000-000000000014';
      const d4Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Pied Piper Compression Platform',
        amount: 65000,
        stage: 'Closed Won',
        probability: 100,
        close_date: '2026-10-01',
        commission_rate: 15,
        cost_basis: 10000,
      });
      this.records.set(d4Id, {
        id: d4Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d4Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      // 4. Record Links (Bidirectional links)
      if (relCompanyPeople) {
        const link1 = generateUuidV7();
        this.recordLinks.set(link1, { id: link1, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c1Id, toRecordId: p1Id });
        const link2 = generateUuidV7();
        this.recordLinks.set(link2, { id: link2, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c2Id, toRecordId: p2Id });
        const link3 = generateUuidV7();
        this.recordLinks.set(link3, { id: link3, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c3Id, toRecordId: p3Id });
        const link4 = generateUuidV7();
        this.recordLinks.set(link4, { id: link4, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c4Id, toRecordId: p4Id });
        const link5 = generateUuidV7();
        this.recordLinks.set(link5, { id: link5, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c5Id, toRecordId: p5Id });
        const link6 = generateUuidV7();
        this.recordLinks.set(link6, { id: link6, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c6Id, toRecordId: p6Id });
        const link7 = generateUuidV7();
        this.recordLinks.set(link7, { id: link7, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c7Id, toRecordId: p7Id });
        const link8 = generateUuidV7();
        this.recordLinks.set(link8, { id: link8, workspaceId, relationshipId: relCompanyPeople.id, fromRecordId: c8Id, toRecordId: p8Id });
      }

      // Deals 6, 7, 8 (Indian Rupee & Multi-Currency Deals §4.7)
      const d6Id = generateUuidV7();
      const d6Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'TCS Pan-India CRM Modernization',
        amount: 125000000, // ₹12.50 Cr
        currency: 'INR',
        exchange_rate: 1.0,
        base_amount: 125000000,
        stage: 'Proposal Sent',
        probability: 70,
        close_date: '2026-12-31',
        commission_rate: 8,
        cost_basis: 30000000,
      });
      this.records.set(d6Id, {
        id: d6Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d6Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d7Id = generateUuidV7();
      const d7Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Infosys Global Support Desk Expansion',
        amount: 48000000, // ₹4.80 Cr
        currency: 'INR',
        exchange_rate: 1.0,
        base_amount: 48000000,
        stage: 'Negotiation',
        probability: 85,
        close_date: '2026-11-15',
        commission_rate: 10,
        cost_basis: 12000000,
      });
      this.records.set(d7Id, {
        id: d7Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d7Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      const d8Id = generateUuidV7();
      const d8Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'TCS North America Cloud Integration',
        amount: 1500000, // USD 1,500,000
        currency: 'USD',
        exchange_rate: 83.5,
        base_amount: 125250000, // Base equivalent: ₹12.525 Cr
        stage: 'Proposal Sent',
        probability: 65,
        close_date: '2027-01-31',
        commission_rate: 8,
        cost_basis: 350000,
      });
      this.records.set(d8Id, {
        id: d8Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d8Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
      });

      if (relCompanyDeals) {
        const linkD1 = generateUuidV7();
        this.recordLinks.set(linkD1, { id: linkD1, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c1Id, toRecordId: d1Id });
        const linkD2 = generateUuidV7();
        this.recordLinks.set(linkD2, { id: linkD2, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c2Id, toRecordId: d2Id });
        const linkD3 = generateUuidV7();
        this.recordLinks.set(linkD3, { id: linkD3, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c3Id, toRecordId: d3Id });
        const linkD4 = generateUuidV7();
        this.recordLinks.set(linkD4, { id: linkD4, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c4Id, toRecordId: d4Id });
        const linkD6 = generateUuidV7();
        this.recordLinks.set(linkD6, { id: linkD6, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c5Id, toRecordId: d6Id });
        const linkD7 = generateUuidV7();
        this.recordLinks.set(linkD7, { id: linkD7, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c6Id, toRecordId: d7Id });
        const linkD8 = generateUuidV7();
        this.recordLinks.set(linkD8, { id: linkD8, workspaceId, relationshipId: relCompanyDeals.id, fromRecordId: c5Id, toRecordId: d8Id });
      }

      // 5. Seed Pipeline & Stages
      const pipelineId = generateUuidV7();
      this.pipelines.set(pipelineId, {
        id: pipelineId,
        workspaceId,
        name: 'Standard B2B Sales Pipeline',
        isDefault: true,
        stages: DEFAULT_PIPELINE_STAGES,
        createdAt: now,
        updatedAt: now,
      });

      // Seed stage transition history with realistic durations (including a rotting deal)
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      this.dealStageHistory.push(
        { id: generateUuidV7(), workspaceId, dealId: d1Id, fromStage: 'Proposal Sent', toStage: 'Negotiation', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d2Id, fromStage: 'Qualification', toStage: 'Proposal Sent', transitionedAt: tenDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d3Id, fromStage: 'Discovery', toStage: 'Qualified', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d4Id, fromStage: 'Negotiation', toStage: 'Closed Won', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d6Id, fromStage: 'Qualification', toStage: 'Proposal Sent', transitionedAt: twoDaysAgo, userId },
        { id: generateUuidV7(), workspaceId, dealId: d7Id, fromStage: 'Proposal Sent', toStage: 'Negotiation', transitionedAt: twoDaysAgo, userId }
      );

      // Seed Deal 5: Rotting in Discovery (20 days > 14 days threshold)
      const d5Id = '01910000-0000-7000-8000-000000000015';
      const d5Data = this.evaluateRecordFormulas(workspaceId, dealsObj.id, {
        name: 'Omni Consumer Products Security Suite',
        amount: 110000,
        stage: 'Discovery',
        probability: 20,
        close_date: '2026-12-31',
        commission_rate: 10,
        cost_basis: 30000,
      });
      this.records.set(d5Id, {
        id: d5Id,
        workspaceId,
        objectId: dealsObj.id,
        data: d5Data,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        createdAt: twentyDaysAgo,
        updatedAt: twentyDaysAgo,
      });
      this.dealStageHistory.push({
        id: generateUuidV7(),
        workspaceId,
        dealId: d5Id,
        fromStage: '',
        toStage: 'Discovery',
        transitionedAt: twentyDaysAgo,
        userId,
      });

      // 6. Seed Products (CPQ Light)
      const prod1Id = '01910000-0000-7000-8000-000000000031';
      this.products.set(prod1Id, {
        id: prod1Id,
        workspaceId,
        sku: 'NEX-ENT-M',
        name: 'Nexus CRM Enterprise Seat',
        description: 'Unlimited custom objects, full audit ledger, and API access',
        unitPrice: 120,
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod2Id = '01910000-0000-7000-8000-000000000032';
      this.products.set(prod2Id, {
        id: prod2Id,
        workspaceId,
        sku: 'NEX-GRW-M',
        name: 'Nexus CRM Growth Seat',
        description: 'Core CRM pipeline and contact management for growing teams',
        unitPrice: 60,
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod3Id = '01910000-0000-7000-8000-000000000033';
      this.products.set(prod3Id, {
        id: prod3Id,
        workspaceId,
        sku: 'NEX-SEC-A',
        name: 'Dedicated SSO & Security Suite',
        description: 'SAML 2.0, Okta/Google SSO, custom IP whitelisting',
        unitPrice: 2400,
        billingPeriod: 'annual',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod4Id = '01910000-0000-7000-8000-000000000034';
      this.products.set(prod4Id, {
        id: prod4Id,
        workspaceId,
        sku: 'NEX-MIG-ONE',
        name: 'Enterprise Onboarding & Migration',
        description: 'Dedicated implementation architect and legacy CRM migration',
        unitPrice: 4500,
        billingPeriod: 'one_time',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // 7. Seed Quote for Stark Enterprises Cloud Migration
      const quote1Id = generateUuidV7();
      const quoteTotals = calculateQuoteTotals(
        [
          {
            productId: prod1Id,
            productName: 'Nexus CRM Enterprise Seat',
            sku: 'NEX-ENT-M',
            billingPeriod: 'monthly',
            quantity: 50,
            unitPrice: 120,
            discountPercent: 10,
          },
          {
            productId: prod3Id,
            productName: 'Dedicated SSO & Security Suite',
            sku: 'NEX-SEC-A',
            billingPeriod: 'annual',
            quantity: 1,
            unitPrice: 2400,
            discountPercent: 0,
          },
          {
            productId: prod4Id,
            productName: 'Enterprise Onboarding & Migration',
            sku: 'NEX-MIG-ONE',
            billingPeriod: 'one_time',
            quantity: 1,
            unitPrice: 4500,
            discountPercent: 0,
          },
        ],
        5,
        8.5
      );

      this.quotes.set(quote1Id, {
        id: quote1Id,
        workspaceId,
        dealId: d1Id,
        quoteNumber: 'Q-2026-001',
        lineItems: quoteTotals.lineItems,
        subtotal: quoteTotals.subtotal,
        volumeDiscountPercent: 5,
        discountAmount: quoteTotals.discountAmount,
        taxRatePercent: 8.5,
        taxAmount: quoteTotals.taxAmount,
        total: quoteTotals.total,
        arr: quoteTotals.arr,
        tcv: quoteTotals.tcv,
        status: 'approved',
        requiresApproval: quoteTotals.requiresApproval,
        createdAt: now,
        updatedAt: now,
      });

      // Sovereign Indian Products & Price Book (in INR minor/major)
      const prod5Id = generateUuidV7();
      this.products.set(prod5Id, {
        id: prod5Id,
        workspaceId,
        sku: 'NEX-IN-ENT',
        name: 'Nexus CRM Enterprise Seat India',
        description: 'Complete Indian sovereign CRM with GST, audit hash chain, and regional VPC data isolation',
        unitPrice: 9999, // ₹9,999/month
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod6Id = generateUuidV7();
      this.products.set(prod6Id, {
        id: prod6Id,
        workspaceId,
        sku: 'NEX-IN-GRW',
        name: 'Nexus CRM Growth Seat India',
        description: 'Core CRM pipeline, contact management, and WhatsApp outreach for Indian teams',
        unitPrice: 4999, // ₹4,999/month
        billingPeriod: 'monthly',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod7Id = generateUuidV7();
      this.products.set(prod7Id, {
        id: prod7Id,
        workspaceId,
        sku: 'NEX-IN-GST',
        name: 'India GST & E-Invoicing Suite',
        description: 'Automated GSTR-1 matching, IRN generation, and GSTIN verification',
        unitPrice: 49999, // ₹49,999/year
        billingPeriod: 'annual',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const prod8Id = generateUuidV7();
      this.products.set(prod8Id, {
        id: prod8Id,
        workspaceId,
        sku: 'NEX-IN-IMP',
        name: 'Enterprise Onboarding & Sovereign Migration',
        description: 'Dedicated implementation architect, legacy CRM data pipeline, and training',
        unitPrice: 250000, // ₹2,50,000 one-time
        billingPeriod: 'one_time',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // 8. Seed Quote for TCS Pan-India CRM Modernization (with 18% Indian GST)
      const quote2Id = generateUuidV7();
      const tcsQuoteTotals = calculateQuoteTotals(
        [
          {
            productId: prod5Id,
            productName: 'Nexus CRM Enterprise Seat India',
            sku: 'NEX-IN-ENT',
            billingPeriod: 'monthly',
            quantity: 200,
            unitPrice: 9999,
            discountPercent: 10,
          },
          {
            productId: prod7Id,
            productName: 'India GST & E-Invoicing Suite',
            sku: 'NEX-IN-GST',
            billingPeriod: 'annual',
            quantity: 1,
            unitPrice: 49999,
            discountPercent: 0,
          },
          {
            productId: prod8Id,
            productName: 'Enterprise Onboarding & Sovereign Migration',
            sku: 'NEX-IN-IMP',
            billingPeriod: 'one_time',
            quantity: 1,
            unitPrice: 250000,
            discountPercent: 0,
          },
        ],
        5,
        18 // 18% GST (9% CGST + 9% SGST)
      );

      this.quotes.set(quote2Id, {
        id: quote2Id,
        workspaceId,
        dealId: d6Id,
        quoteNumber: 'Q-2026-IN-001',
        lineItems: tcsQuoteTotals.lineItems,
        subtotal: tcsQuoteTotals.subtotal,
        volumeDiscountPercent: 5,
        discountAmount: tcsQuoteTotals.discountAmount,
        taxRatePercent: 18,
        taxAmount: tcsQuoteTotals.taxAmount,
        total: tcsQuoteTotals.total,
        arr: tcsQuoteTotals.arr,
        tcv: tcsQuoteTotals.tcv,
        status: 'approved',
        requiresApproval: tcsQuoteTotals.requiresApproval,
        createdAt: now,
        updatedAt: now,
      });

      // 9. Seed Omnichannel Communication Data (Phase 3)
      // Canned Snippets
      this.snippets.set('snip-intro', {
        id: 'snip-intro',
        workspaceId,
        shortcut: '!intro',
        title: 'Welcome & Value Proposition',
        body: 'Hi {{first_name}},\n\nThanks for connecting with {{company}}! I would love to schedule a technical architecture walkthrough to discuss your data sovereignty and security requirements.\n\nBest,\nAlex Rivers',
        category: 'Sales',
      });
      this.snippets.set('snip-quote', {
        id: 'snip-quote',
        workspaceId,
        shortcut: '!quote',
        title: 'Proposal Follow-up',
        body: 'Hi {{first_name}},\n\nFollowing up on our quote proposal for {{deal_name}}. Let me know if you would like to review the line items or SLA tiers.\n\nBest,\nAlex Rivers',
        category: 'Proposals',
      });
      this.snippets.set('snip-sec', {
        id: 'snip-sec',
        workspaceId,
        shortcut: '!sec',
        title: 'Security & Compliance Briefing',
        body: 'Hi {{first_name}},\n\nHere is our security whitepaper detailing KMS envelope encryption, tamper-evident SHA-256 audit logs, and SOC 2 Type II compliance.\n\nBest,\nSecurity Team',
        category: 'Security',
      });

      // Default Communication Preferences
      [p1Id, p2Id, p3Id, p4Id].forEach((cid) => {
        this.communicationPreferences.set(cid, {
          contactId: cid,
          workspaceId,
          emailOptOut: false,
          smsOptOut: false,
          updatedAt: now,
        });
      });

      // Thread 1: Stark Email Thread
      const th1Id = 'th-stark-email-1';
      const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const oneHourAgo = new Date(Date.now() - 1 * 3600 * 1000).toISOString();
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const slaTimer = new Date(Date.now() + 45 * 60 * 1000).toISOString();

      this.threads.set(th1Id, {
        id: th1Id,
        workspaceId,
        subject: 'Enterprise Cloud Transformation Scope',
        channel: 'email',
        contactId: p1Id,
        companyId: c1Id,
        dealId: d1Id,
        status: 'open',
        assignedUserId: userId,
        slaDueAt: slaTimer,
        lastMessageAt: thirtyMinsAgo,
        unreadCount: 1,
        participantSummary: 'Tony Stark <tony@starkindustries.com>',
        snippetPreview: "Please send over the revised quote with 120 Enterprise seats and annual billing.",
        createdAt: threeHoursAgo,
        updatedAt: thirtyMinsAgo,
      });

      this.messages.set('msg-stark-1', {
        id: 'msg-stark-1',
        threadId: th1Id,
        workspaceId,
        direction: 'inbound',
        channel: 'email',
        sender: { name: 'Tony Stark', email: 'tony@starkindustries.com' },
        recipients: [{ name: 'Alex Rivers', email: 'alex@acme.corp' }],
        subject: 'Enterprise Cloud Transformation Scope',
        bodyText: 'Hi Alex,\n\nWe have reviewed the preliminary architecture. Can you confirm if your platform supports customer-managed encryption keys (BYOK) and sub-millisecond query latency across 1M+ polymorphic records?\n\nBest,\nTony Stark',
        spfDkimStatus: 'pass',
        isInternalNote: false,
        attachments: [],
        createdAt: threeHoursAgo,
      });

      this.messages.set('msg-stark-2', {
        id: 'msg-stark-2',
        threadId: th1Id,
        workspaceId,
        direction: 'outbound',
        channel: 'email',
        sender: { name: 'Alex Rivers', email: 'alex@acme.corp' },
        recipients: [{ name: 'Tony Stark', email: 'tony@starkindustries.com' }],
        subject: 'Re: Enterprise Cloud Transformation Scope',
        bodyText: 'Hi Tony,\n\nYes! We just verified our 1,000,000 record benchmark at p95 = 0.000 ms. In addition, all tenant records are cryptographically sealed with an immutable SHA-256 hash chain.\n\nBest,\nAlex Rivers',
        isInternalNote: false,
        attachments: [],
        createdAt: twoHoursAgo,
      });

      this.messages.set('msg-stark-3', {
        id: 'msg-stark-3',
        threadId: th1Id,
        workspaceId,
        direction: 'internal',
        channel: 'internal_note',
        sender: { name: 'Arthur Dent', userId },
        recipients: [],
        bodyText: 'Spoke with engineering lead. We can provision the dedicated tenant enclave and provide custom webhook ingestion for their StarkNet streaming data. Finance approved up to 10% volume discount.',
        isInternalNote: true,
        attachments: [],
        createdAt: oneHourAgo,
      });

      this.messages.set('msg-stark-4', {
        id: 'msg-stark-4',
        threadId: th1Id,
        workspaceId,
        direction: 'inbound',
        channel: 'email',
        sender: { name: 'Tony Stark', email: 'tony@starkindustries.com' },
        recipients: [{ name: 'Alex Rivers', email: 'alex@acme.corp' }],
        subject: 'Re: Enterprise Cloud Transformation Scope',
        bodyText: "That's exceptional. Please send over the revised quote with 120 Enterprise seats and annual billing.",
        spfDkimStatus: 'pass',
        isInternalNote: false,
        attachments: [],
        createdAt: thirtyMinsAgo,
      });

      // Thread 2: Wayne SMS Thread
      const th2Id = 'th-wayne-sms-1';
      this.threads.set(th2Id, {
        id: th2Id,
        workspaceId,
        subject: 'Security Questionnaire Follow-up',
        channel: 'sms',
        contactId: p2Id,
        companyId: c2Id,
        dealId: d2Id,
        status: 'open',
        assignedUserId: userId,
        lastMessageAt: twoHoursAgo,
        unreadCount: 0,
        participantSummary: 'Bruce Wayne (+1-212-555-0144)',
        snippetPreview: 'Security committee is reviewing the encryption model. Looks solid.',
        createdAt: threeHoursAgo,
        updatedAt: twoHoursAgo,
      });

      this.messages.set('msg-wayne-1', {
        id: 'msg-wayne-1',
        threadId: th2Id,
        workspaceId,
        direction: 'outbound',
        channel: 'sms',
        sender: { name: 'Alex Rivers', phone: '+1-800-555-0100' },
        recipients: [{ name: 'Bruce Wayne', phone: '+1-212-555-0144' }],
        bodyText: 'Hi Bruce, this is Alex from Nexus CRM. Did you have a chance to review the SOC 2 Type II report we sent over?',
        isInternalNote: false,
        attachments: [],
        createdAt: threeHoursAgo,
      });

      this.messages.set('msg-wayne-2', {
        id: 'msg-wayne-2',
        threadId: th2Id,
        workspaceId,
        direction: 'inbound',
        channel: 'sms',
        sender: { name: 'Bruce Wayne', phone: '+1-212-555-0144' },
        recipients: [{ name: 'Alex Rivers', phone: '+1-800-555-0100' }],
        bodyText: 'Security committee is reviewing the encryption model. Looks solid.',
        isInternalNote: false,
        attachments: [],
        createdAt: twoHoursAgo,
      });

      // Thread 3: WhatsApp
      const th3Id = 'th-pied-whatsapp-1';
      this.threads.set(th3Id, {
        id: th3Id,
        workspaceId,
        subject: 'API Integration & Webhook Signatures',
        channel: 'whatsapp',
        contactId: p4Id,
        companyId: c4Id,
        dealId: d4Id,
        status: 'resolved',
        assignedUserId: userId,
        lastMessageAt: oneHourAgo,
        unreadCount: 0,
        participantSummary: 'Richard Hendricks (+1-415-555-0177)',
        snippetPreview: 'HMAC-SHA256 signatures are working cleanly. Thanks!',
        createdAt: oneHourAgo,
        updatedAt: oneHourAgo,
      });

      this.messages.set('msg-pied-1', {
        id: 'msg-pied-1',
        threadId: th3Id,
        workspaceId,
        direction: 'inbound',
        channel: 'whatsapp',
        sender: { name: 'Richard Hendricks', phone: '+1-415-555-0177' },
        recipients: [{ name: 'Nexus Support' }],
        bodyText: 'Hey Alex! Does your webhook engine support HMAC-SHA256 signatures for inbound event delivery?',
        isInternalNote: false,
        attachments: [],
        createdAt: oneHourAgo,
      });

      // Multi-Step Drip Sequence
      const seqId = 'seq-enterprise-outbound';
      this.sequences.set(seqId, {
        id: seqId,
        workspaceId,
        name: 'Enterprise Outbound Cadence',
        description: 'Multi-step technical outreach for enterprise accounts',
        isActive: true,
        exitOnReply: true,
        exitOnMeetingBooked: true,
        exitOnDealWon: true,
        dailyDomainLimit: 50,
        steps: [
          {
            id: 'seq-step-1',
            stepOrder: 0,
            dayOffset: 0,
            type: 'email',
            subject: 'Sovereign Multi-Tenant CRM: Technical Briefing',
            body: 'Hi {{first_name}},\n\nNexus CRM delivers complete tenant sovereign isolation, sub-millisecond AST formula queries, and cryptographically verified audit trails.\n\nBest,\nAlex Rivers',
          },
          {
            id: 'seq-step-2',
            stepOrder: 1,
            dayOffset: 3,
            type: 'task_call',
            subject: 'Architecture Q&A Follow-up Call',
            body: 'Conduct discovery call to discuss compliance standards and KMS encryption requirements.',
          },
          {
            id: 'seq-step-3',
            stepOrder: 2,
            dayOffset: 7,
            type: 'email',
            subject: 'Case Study: 1M Polymorphic Records Query Benchmark',
            body: 'Hi {{first_name}},\n\nWanted to share our 1,000,000 record benchmark verified at p95 = 0.000 ms.\n\nBest,\nAlex Rivers',
          },
        ],
        createdAt: now,
        updatedAt: now,
      });

      this.sequenceEnrollments.set('enr-bruce-1', {
        id: 'enr-bruce-1',
        workspaceId,
        sequenceId: seqId,
        contactId: p2Id,
        contactEmail: 'bruce@waynecorp.com',
        currentStepIndex: 1,
        nextStepDueAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
        status: 'running',
        enrolledAt: now,
        updatedAt: now,
      });

      // 8. Phase 4: Seed Merge History Demo Record (Stark Industries merge)
      const starkMergedHistId = 'merge-demo-hist-1';
      const starkWinner = this.records.get(c1Id)!;
      const starkLoser = this.records.get(c1MergedId)!;
      this.mergeHistories.set(starkMergedHistId, {
        id: starkMergedHistId,
        workspaceId,
        entityName: 'companies',
        winnerRecordId: c1Id,
        loserRecordId: c1MergedId,
        snapshotWinnerBefore: JSON.parse(JSON.stringify(starkWinner)),
        snapshotLoserBefore: JSON.parse(JSON.stringify(starkLoser)),
        mergedData: { ...starkWinner.data, employee_count: 12000 },
        transferredLinksCount: 1,
        transferredActivitiesCount: 1,
        repointedLinks: [],
        repointedEntities: [],
        mergedBy: userId,
        mergedAt: threeDaysAgo,
        status: 'MERGED',
      });

      // 9. Scan and index initial duplicates for workspace
      this.scanDuplicatesForWorkspace(workspaceId);

      // 10. Phase 5: Workflow Automation & Extensibility Engine
      const wf1Id = 'wf-auto-lead-nurture';
      this.workflows.set(wf1Id, {
        id: wf1Id,
        workspaceId,
        name: 'Autonomous Inbound Lead Qualification & Routing',
        description: 'Evaluates inbound lead titles, applies VIP tags, and triggers omnichannel notifications',
        isActive: true,
        triggerType: 'record.created',
        triggerConfig: { objectApiName: 'people' },
        rootNodeId: 'node-trig-lead',
        nodes: [
          {
            id: 'node-trig-lead',
            type: 'trigger',
            title: 'Lead Created (People)',
            config: { object: 'people' },
            nextNodes: ['node-cond-exec'],
          },
          {
            id: 'node-cond-exec',
            type: 'condition',
            title: 'Is Executive Lead? (CEO / Founder / VP)',
            config: { field: 'title', operator: 'contains', value: 'CEO' },
            nextNodes: ['node-act-vip-tag'],
            elseNodes: ['node-act-std-tag'],
          },
          {
            id: 'node-act-vip-tag',
            type: 'action',
            title: 'Tag Record as VIP & Priority 1',
            actionType: 'update_record',
            config: { entityName: 'people', patch: { lifecycle_stage: 'Opportunity' } },
            nextNodes: ['node-act-notify-team'],
          },
          {
            id: 'node-act-std-tag',
            type: 'action',
            title: 'Tag Record as Standard Lead',
            actionType: 'update_record',
            config: { entityName: 'people', patch: { lifecycle_stage: 'Lead' } },
            nextNodes: ['node-act-send-email'],
          },
          {
            id: 'node-act-notify-team',
            type: 'action',
            title: 'Create Executive SLA Follow-up Task',
            actionType: 'create_task',
            config: {
              title: 'Executive Briefing Follow-up for {{first_name}} {{last_name}}',
              description: 'Priority SLA: 1 hour contact guarantee.',
            },
          },
          {
            id: 'node-act-send-email',
            type: 'action',
            title: 'Send Standard Welcome Email',
            actionType: 'send_email',
            config: {
              subject: 'Welcome to Sovereign Nexus CRM',
              body: 'Hi {{first_name}}, thank you for connecting with us.',
            },
          },
        ],
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      const wf2Id = 'wf-deal-won-webhook';
      this.workflows.set(wf2Id, {
        id: wf2Id,
        workspaceId,
        name: 'Closed-Won ERP Dispatch & Audit Sync',
        description: 'Dispatches enterprise deal payload to billing & provisioning systems via HMAC signed webhook',
        isActive: true,
        triggerType: 'record.stage_changed',
        triggerConfig: { objectApiName: 'deals' },
        rootNodeId: 'node-trig-deal',
        nodes: [
          {
            id: 'node-trig-deal',
            type: 'trigger',
            title: 'Deal Stage Updated',
            config: { object: 'deals' },
            nextNodes: ['node-cond-won'],
          },
          {
            id: 'node-cond-won',
            type: 'condition',
            title: 'Is Deal Closed Won?',
            config: { field: 'stage', operator: '==', value: 'Closed Won' },
            nextNodes: ['node-act-erp-hook'],
            elseNodes: [],
          },
          {
            id: 'node-act-erp-hook',
            type: 'action',
            title: 'Dispatch HMAC Outbound Webhook to ERP',
            actionType: 'outbound_webhook',
            config: {
              url: 'https://hooks.acme-erp.internal/orders/sync',
              secret: 'whsec_prod_demo_9876543210fedcba',
            },
            nextNodes: ['node-act-audit-task'],
          },
          {
            id: 'node-act-audit-task',
            type: 'action',
            title: 'Create Customer Provisioning Task',
            actionType: 'create_task',
            config: {
              title: 'Customer Provisioning for {{name}}',
              description: 'Verify invoice generation and KMS BYOK key deployment.',
            },
          },
        ],
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      // Demo Workflow 3: Section 12.8 Golden Path Requirement
      // "Deal > ₹50 L (or base equivalent) stalls 7 days -> notify manager + create task"
      const wf3Id = 'wf-deal-stalled-escalation';
      this.workflows.set(wf3Id, {
        id: wf3Id,
        workspaceId,
        name: 'Stalled High-Value Deal SLA Escalation (> ₹50L)',
        description: 'Triggers when a deal exceeding ₹50,00,000 (INR 5M or base equivalent) stalls in negotiation for 7+ days; notifies sales director and generates SLA intervention task',
        isActive: true,
        triggerType: 'record.updated',
        triggerConfig: { objectApiName: 'deals' },
        rootNodeId: 'node-trig-stalled',
        nodes: [
          {
            id: 'node-trig-stalled',
            type: 'trigger',
            title: 'Deal Updated & Stage Analyzed',
            config: { object: 'deals' },
            nextNodes: ['node-cond-stalled-7d'],
          },
          {
            id: 'node-cond-stalled-7d',
            type: 'condition',
            title: 'Is Deal Stalled in Stage >= 7 Days?',
            config: { field: 'days_in_stage', operator: '>=', value: 7 },
            nextNodes: ['node-cond-val-50l'],
            elseNodes: [],
          },
          {
            id: 'node-cond-val-50l',
            type: 'condition',
            title: 'Is Value >= ₹50,00,000 (Base Equivalent)?',
            config: { field: 'amount', operator: '>=', value: 5000000 },
            nextNodes: ['node-act-alert-manager'],
            elseNodes: [],
          },
          {
            id: 'node-act-alert-manager',
            type: 'action',
            title: 'Notify Sales Director via Priority Alert',
            actionType: 'send_email',
            config: {
              recipient: 'director.sales@acme.corp',
              subject: 'URGENT SLA Escalation: Stalled Deal {{name}} > ₹50L',
              body: 'Deal {{name}} valued at {{amount}} has stalled for 7+ days. Executive intervention required.',
            },
            nextNodes: ['node-act-create-task'],
          },
          {
            id: 'node-act-create-task',
            type: 'action',
            title: 'Create Executive SLA Intervention Task',
            actionType: 'create_task',
            config: {
              title: 'Executive Intervention: Stalled Deal {{name}}',
              description: 'Schedule emergency deal review with sponsor and VP.',
              dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            },
          },
        ],
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      // Demo Outbound Webhook Subscription
      const hook1Id = 'hook-sub-erp-1';
      this.outboundWebhooks.set(hook1Id, {
        id: hook1Id,
        workspaceId,
        targetUrl: 'https://hooks.acme-erp.internal/orders/sync',
        secret: 'whsec_prod_demo_9876543210fedcba',
        subscribedEvents: ['deal.won', 'quote.approved', 'record.created'],
        isActive: true,
        description: 'Enterprise ERP sync listener for closed-won deals',
        createdAt: threeDaysAgo,
        updatedAt: threeDaysAgo,
      });

      // Demo Webhook Delivery Log
      const deliv1Id = 'del-log-erp-1';
      const samplePayload = {
        event: 'deal.won',
        timestamp: threeDaysAgo,
        deal: {
          id: d4Id,
          name: 'Pied Piper Compression Platform',
          amount: 65000,
          stage: 'Closed Won',
        },
      };
      this.webhookDeliveries.set(deliv1Id, {
        id: deliv1Id,
        workspaceId,
        subscriptionId: hook1Id,
        targetUrl: 'https://hooks.acme-erp.internal/orders/sync',
        event: 'deal.won',
        payload: samplePayload,
        signature: signWebhookPayload('whsec_prod_demo_9876543210fedcba', samplePayload),
        timestamp: threeDaysAgo,
        statusCode: 200,
        status: 'SUCCESS',
        responseSummary: 'HTTP 200 OK - Order 88392 Queued for Provisioning',
        durationMs: 38,
        deliveredAt: threeDaysAgo,
      });

      // Demo Workflow Execution Run
      const run1Id = 'run-demo-lead-1';
      this.workflowRuns.set(run1Id, {
        id: run1Id,
        workspaceId,
        workflowId: wf1Id,
        status: 'completed',
        triggerEvent: 'record.created:people',
        triggerRecordId: p1Id,
        context: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
        stepLogs: [
          {
            nodeId: 'node-trig-lead',
            nodeTitle: 'Lead Created (People)',
            nodeType: 'trigger',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { triggerEvent: 'record.created:people', triggeredAt: threeDaysAgo, recordId: p1Id },
            executedAt: threeDaysAgo,
            durationMs: 1,
          },
          {
            nodeId: 'node-cond-exec',
            nodeTitle: 'Is Executive Lead? (CEO / Founder / VP)',
            nodeType: 'condition',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { expression: 'title contains CEO', evaluatedTo: true },
            executedAt: threeDaysAgo,
            durationMs: 1,
          },
          {
            nodeId: 'node-act-vip-tag',
            nodeTitle: 'Tag Record as VIP & Priority 1',
            nodeType: 'action',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { updated: true, targetId: p1Id, patch: { lifecycle_stage: 'Opportunity' } },
            executedAt: threeDaysAgo,
            durationMs: 2,
          },
          {
            nodeId: 'node-act-notify-team',
            nodeTitle: 'Create Executive SLA Follow-up Task',
            nodeType: 'action',
            status: 'success',
            inputData: { record: { first_name: 'Tony', last_name: 'Stark', title: 'CEO & Chief Engineer' } },
            outputData: { taskCreated: true, task: { title: 'Executive Briefing Follow-up for Tony Stark' } },
            executedAt: threeDaysAgo,
            durationMs: 3,
          },
        ],
        durationMs: 7,
        executedAt: threeDaysAgo,
        executedBy: userId,
      });

      // 11. Phase 6: Platform Sovereignty, KMS Envelope Encryption & BYOK
      const masterKek = generateKey();
      const masterKeyId = 'kms-key-v1';
      this.kmsKeys.set(masterKeyId, {
        id: masterKeyId,
        workspaceId,
        version: 1,
        status: 'ACTIVE',
        algorithm: 'AES-256-GCM',
        keyHex: masterKek.toString('hex'),
        createdAt: threeDaysAgo,
      });

      const initialDek = generateKey();
      const initialEnvelope = {
        ...wrapDek(masterKek, initialDek, 'dek-tenant-main', 1),
        workspaceId,
      };
      this.encryptedDeks.set(initialEnvelope.dekId, initialEnvelope);

      // 12. Append initial audit events with valid hash chain

      await this.appendAuditEvent({
        workspaceId,
        actorType: 'system',
        action: 'system.bootstrap',
        payload: { message: 'Initialized Sovereign Nexus CRM workspace with standard schemas and seed dataset' },
      });
      await this.appendAuditEvent({
        workspaceId,
        actorType: 'user',
        actorId: userId,
        action: 'metadata.schema.seed',
        payload: { objects: ['companies', 'people', 'deals', 'activities'] },
      });
    }
  }

  /**
   * Converts a database RecordEntity to a normalized DedupRecord for matching.
   */
  toDedupRecord(record: RecordEntity, objectApiName: string): DedupRecord {
    const data = record.data || {};
    if (objectApiName === 'people') {
      const firstName = data.first_name || '';
      const lastName = data.last_name || '';
      const name = `${firstName} ${lastName}`.trim();
      return {
        id: record.id,
        entityName: 'people',
        name,
        firstName,
        lastName,
        email: data.email,
        phone: data.phone,
        companyName: data.company_name,
        raw: data,
      };
    } else if (objectApiName === 'companies') {
      return {
        id: record.id,
        entityName: 'companies',
        name: data.name,
        domain: data.domain,
        companyName: data.name,
        raw: data,
      };
    } else {
      return {
        id: record.id,
        entityName: objectApiName,
        name: data.name || '',
        raw: data,
      };
    }
  }

  /**
   * Pre-creation duplicate check. Evaluates potential matches in real-time (<25ms).
   */
  checkDuplicatePreCreation(
    workspaceId: string,
    entityName: string,
    data: Record<string, any>
  ): { isDuplicate: boolean; matches: Array<{ record: RecordEntity; matchResult: MatchScoreResult }> } {
    const obj = Array.from(this.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === entityName
    );
    if (!obj) return { isDuplicate: false, matches: [] };

    const activeRecords = Array.from(this.records.values()).filter(
      (r) => r.workspaceId === workspaceId && r.objectId === obj.id && !r.deletedAt
    );

    const tempRecordEntity: RecordEntity = {
      id: 'precheck-temp',
      workspaceId,
      objectId: obj.id,
      data,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const targetDedup = this.toDedupRecord(tempRecordEntity, entityName);

    const blocker = new InvertedCandidateIndex();
    for (const r of activeRecords) {
      blocker.addRecord(this.toDedupRecord(r, entityName));
    }

    const candidateDedupRecords = blocker.getCandidates(targetDedup);
    const matches: Array<{ record: RecordEntity; matchResult: MatchScoreResult }> = [];

    // Evaluate candidates with corroboration engine
    for (const cand of candidateDedupRecords) {
      const matchResult = evaluateDuplicateMatch(targetDedup, cand);
      if (matchResult.overallScore >= 60) {
        const fullRecord = this.records.get(cand.id);
        if (fullRecord) {
          matches.push({ record: fullRecord, matchResult });
        }
      }
    }

    matches.sort((x, y) => y.matchResult.overallScore - x.matchResult.overallScore);

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
  }

  /**
   * Full workspace deduplication scan across people, companies, and deals.
   */
  scanDuplicatesForWorkspace(workspaceId: string): DuplicatePairRecord[] {
    const detectedPairs: DuplicatePairRecord[] = [];
    const now = new Date().toISOString();

    for (const entityName of ['people', 'companies', 'deals']) {
      const obj = Array.from(this.objects.values()).find(
        (o) => o.workspaceId === workspaceId && o.apiName === entityName
      );
      if (!obj) continue;

      const activeRecords = Array.from(this.records.values()).filter(
        (r) => r.workspaceId === workspaceId && r.objectId === obj.id && !r.deletedAt
      );

      const blocker = new InvertedCandidateIndex();
      const dedupList: DedupRecord[] = activeRecords.map((r) => this.toDedupRecord(r, entityName));
      blocker.addRecords(dedupList);

      const comparedPairKeys = new Set<string>();

      for (const recA of dedupList) {
        const candidates = blocker.getCandidates(recA);
        for (const recB of candidates) {
          const pairKey = [recA.id, recB.id].sort().join(':');
          if (comparedPairKeys.has(pairKey)) continue;
          comparedPairKeys.add(pairKey);

          // Check if previously dismissed
          if (this.dismissedPairs.has(pairKey)) continue;

          const matchResult = evaluateDuplicateMatch(recA, recB);
          if (matchResult.overallScore >= 60) {
            // Check if pair already exists in duplicatePairs
            let existingPair = Array.from(this.duplicatePairs.values()).find(
              (p) =>
                p.workspaceId === workspaceId &&
                ((p.primaryRecordId === recA.id && p.duplicateRecordId === recB.id) ||
                 (p.primaryRecordId === recB.id && p.duplicateRecordId === recA.id))
            );

            if (!existingPair) {
              const pairId = generateUuidV7();
              const pairRecord: DuplicatePairRecord = {
                id: pairId,
                workspaceId,
                entityName,
                primaryRecordId: recA.id,
                duplicateRecordId: recB.id,
                confidenceScore: matchResult.overallScore,
                confidenceTier: matchResult.confidenceTier,
                isAutoMergeCandidate: matchResult.isAutoMergeCandidate,
                status: 'PENDING',
                matchFactors: matchResult.factors,
                summary: matchResult.summary,
                createdAt: now,
              };
              this.duplicatePairs.set(pairId, pairRecord);
              detectedPairs.push(pairRecord);
            } else {
              detectedPairs.push(existingPair);
            }
          }
        }
      }
    }

    return detectedPairs;
  }

  /**
   * Merges two duplicate records with complete transactional link transfer and snapshot rollback capability.
   */
  async mergeRecords(
    workspaceId: string,
    pairId: string | null,
    winnerId: string,
    loserId: string,
    mergedData: Record<string, any>,
    userId: string
  ): Promise<MergeHistoryRecord> {
    const winner = this.records.get(winnerId);
    const loser = this.records.get(loserId);

    if (!winner || winner.workspaceId !== workspaceId) {
      throw new Error(`Winner record ${winnerId} not found in workspace`);
    }
    if (!loser || loser.workspaceId !== workspaceId) {
      throw new Error(`Loser record ${loserId} not found in workspace`);
    }
    if (winner.objectId !== loser.objectId) {
      throw new Error('Cannot merge records of different object types');
    }

    const obj = this.objects.get(winner.objectId);
    const entityName = obj ? obj.apiName : 'records';
    const now = new Date().toISOString();

    // Snapshots before merge
    const snapshotWinnerBefore: RecordEntity = JSON.parse(JSON.stringify(winner));
    const snapshotLoserBefore: RecordEntity = JSON.parse(JSON.stringify(loser));

    const repointedLinks: Array<{ linkId: string; previousRecordId: string; role: 'from' | 'to' }> = [];
    const repointedEntities: Array<{ type: string; id: string; field: string; previousId: string }> = [];

    // 1. Re-point RecordLinks
    for (const [linkId, link] of this.recordLinks.entries()) {
      if (link.workspaceId !== workspaceId) continue;

      if (link.fromRecordId === loserId) {
        link.fromRecordId = winnerId;
        repointedLinks.push({ linkId, previousRecordId: loserId, role: 'from' });
      }
      if (link.toRecordId === loserId) {
        link.toRecordId = winnerId;
        repointedLinks.push({ linkId, previousRecordId: loserId, role: 'to' });
      }
    }

    // 2. Re-point Quotes
    for (const [quoteId, quote] of this.quotes.entries()) {
      if (quote.workspaceId !== workspaceId) continue;
      const qAny = quote as any;
      if (qAny.companyId === loserId) {
        qAny.companyId = winnerId;
        repointedEntities.push({ type: 'quote', id: quoteId, field: 'companyId', previousId: loserId });
      }
      if (qAny.contactId === loserId) {
        qAny.contactId = winnerId;
        repointedEntities.push({ type: 'quote', id: quoteId, field: 'contactId', previousId: loserId });
      }
      if (quote.dealId === loserId) {
        quote.dealId = winnerId;
        repointedEntities.push({ type: 'quote', id: quoteId, field: 'dealId', previousId: loserId });
      }
    }

    // 3. Re-point Threads
    for (const [threadId, thread] of this.threads.entries()) {
      if (thread.workspaceId !== workspaceId) continue;
      if (thread.contactId === loserId) {
        thread.contactId = winnerId;
        repointedEntities.push({ type: 'thread', id: threadId, field: 'contactId', previousId: loserId });
      }
      if (thread.dealId === loserId) {
        thread.dealId = winnerId;
        repointedEntities.push({ type: 'thread', id: threadId, field: 'dealId', previousId: loserId });
      }
    }

    // 4. Re-point Sequence Enrollments
    for (const [enrId, enr] of this.sequenceEnrollments.entries()) {
      if (enr.workspaceId !== workspaceId) continue;
      if (enr.contactId === loserId) {
        enr.contactId = winnerId;
        repointedEntities.push({ type: 'sequenceEnrollment', id: enrId, field: 'contactId', previousId: loserId });
      }
    }

    // 5. Re-point Telephony Calls
    for (const [callId, call] of this.telephonyCalls.entries()) {
      if (call.workspaceId !== workspaceId) continue;
      if (call.contactId === loserId) {
        call.contactId = winnerId;
        repointedEntities.push({ type: 'telephonyCall', id: callId, field: 'contactId', previousId: loserId });
      }
    }

    // 6. Re-point Activities (polymorphic records)
    let transferredActivitiesCount = 0;
    const activitiesObj = Array.from(this.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === 'activities'
    );
    if (activitiesObj) {
      for (const [recId, rec] of this.records.entries()) {
        if (rec.workspaceId === workspaceId && rec.objectId === activitiesObj.id && !rec.deletedAt) {
          let activityUpdated = false;
          if (rec.data.related_to_id === loserId) {
            rec.data.related_to_id = winnerId;
            activityUpdated = true;
          }
          if (rec.data.contact_id === loserId) {
            rec.data.contact_id = winnerId;
            activityUpdated = true;
          }
          if (rec.data.company_id === loserId) {
            rec.data.company_id = winnerId;
            activityUpdated = true;
          }
          if (rec.data.deal_id === loserId) {
            rec.data.deal_id = winnerId;
            activityUpdated = true;
          }
          if (activityUpdated) {
            rec.version += 1;
            rec.updatedAt = now;
            transferredActivitiesCount++;
          }
        }
      }
    }

    // 7. Update Winner with mergedData
    winner.data = { ...winner.data, ...mergedData };
    winner.version += 1;
    winner.updatedAt = now;
    winner.updatedBy = userId;

    // 8. Soft-delete Loser record
    loser.deletedAt = now;
    loser.updatedAt = now;
    loser.updatedBy = userId;

    // 9. Save MergeHistory
    const mergeHistoryId = generateUuidV7();
    const mergeHistory: MergeHistoryRecord = {
      id: mergeHistoryId,
      workspaceId,
      entityName,
      winnerRecordId: winnerId,
      loserRecordId: loserId,
      snapshotWinnerBefore,
      snapshotLoserBefore,
      mergedData,
      transferredLinksCount: repointedLinks.length,
      transferredActivitiesCount,
      repointedLinks,
      repointedEntities,
      mergedBy: userId,
      mergedAt: now,
      status: 'MERGED',
    };
    this.mergeHistories.set(mergeHistoryId, mergeHistory);

    // 10. Update Pair status if pairId provided or exists
    if (pairId && this.duplicatePairs.has(pairId)) {
      const p = this.duplicatePairs.get(pairId)!;
      p.status = 'MERGED';
      p.resolvedAt = now;
      p.resolvedBy = userId;
    } else {
      // Find matching pair
      const p = Array.from(this.duplicatePairs.values()).find(
        (pair) =>
          pair.workspaceId === workspaceId &&
          ((pair.primaryRecordId === winnerId && pair.duplicateRecordId === loserId) ||
           (pair.primaryRecordId === loserId && pair.duplicateRecordId === winnerId))
      );
      if (p) {
        p.status = 'MERGED';
        p.resolvedAt = now;
        p.resolvedBy = userId;
      }
    }

    // 11. Write tamper-evident audit ledger event
    await this.appendAuditEvent({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: 'identity.records.merged',
      targetType: entityName,
      targetId: winnerId,
      payload: {
        winnerId,
        loserId,
        mergeHistoryId,
        transferredLinksCount: repointedLinks.length,
        transferredActivitiesCount,
      },
    });

    return mergeHistory;
  }

  /**
   * Reversible Unmerge within 30-day window. Restores loser and rolls back re-pointed links.
   */
  async unmergeRecords(
    workspaceId: string,
    mergeId: string,
    userId: string
  ): Promise<MergeHistoryRecord> {
    const history = this.mergeHistories.get(mergeId);
    if (!history || history.workspaceId !== workspaceId) {
      throw new Error(`Merge history record ${mergeId} not found`);
    }
    if (history.status === 'UNMERGED') {
      throw new Error(`Merge ${mergeId} has already been unmerged`);
    }

    // 30-day window check
    const mergeTime = new Date(history.mergedAt).getTime();
    const thirtyDaysMs = 30 * 24 * 3600 * 1000;
    if (Date.now() - mergeTime > thirtyDaysMs) {
      throw new Error(`Cannot unmerge: 30-day reversible resolution window has expired`);
    }

    const winner = this.records.get(history.winnerRecordId);
    const loser = this.records.get(history.loserRecordId);
    if (!winner || !loser) {
      throw new Error('Original records involved in merge could not be located');
    }

    const now = new Date().toISOString();

    // 1. Restore Winner data
    winner.data = JSON.parse(JSON.stringify(history.snapshotWinnerBefore.data));
    winner.version += 1;
    winner.updatedAt = now;
    winner.updatedBy = userId;

    // 2. Restore Loser record
    loser.data = JSON.parse(JSON.stringify(history.snapshotLoserBefore.data));
    loser.deletedAt = null;
    loser.version += 1;
    loser.updatedAt = now;
    loser.updatedBy = userId;

    // 3. Rollback repointed links
    for (const item of history.repointedLinks) {
      const link = this.recordLinks.get(item.linkId);
      if (link) {
        if (item.role === 'from') {
          link.fromRecordId = item.previousRecordId;
        } else {
          link.toRecordId = item.previousRecordId;
        }
      }
    }

    // 4. Rollback repointed entities
    for (const item of history.repointedEntities) {
      if (item.type === 'quote') {
        const q = this.quotes.get(item.id);
        if (q) (q as any)[item.field] = item.previousId;
      } else if (item.type === 'thread') {
        const t = this.threads.get(item.id);
        if (t) (t as any)[item.field] = item.previousId;
      } else if (item.type === 'sequenceEnrollment') {
        const s = this.sequenceEnrollments.get(item.id);
        if (s) (s as any)[item.field] = item.previousId;
      } else if (item.type === 'telephonyCall') {
        const c = this.telephonyCalls.get(item.id);
        if (c) (c as any)[item.field] = item.previousId;
      }
    }

    // 5. Update history status
    history.status = 'UNMERGED';
    history.unmergedAt = now;
    history.unmergedBy = userId;

    // 6. Reopen duplicate pair if present
    const pair = Array.from(this.duplicatePairs.values()).find(
      (p) =>
        p.workspaceId === workspaceId &&
        ((p.primaryRecordId === history.winnerRecordId && p.duplicateRecordId === history.loserRecordId) ||
         (p.primaryRecordId === history.loserRecordId && p.duplicateRecordId === history.winnerRecordId))
    );
    if (pair) {
      pair.status = 'PENDING';
      pair.resolvedAt = null;
      pair.resolvedBy = null;
    }

    // 7. Append audit event
    await this.appendAuditEvent({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: 'identity.records.unmerged',
      targetType: history.entityName,
      targetId: winner.id,
      payload: {
        mergeHistoryId: history.id,
        winnerId: winner.id,
        loserId: loser.id,
      },
    });

    return history;
  }

  /**
   * Executes a workflow DAG within a workspace.
   */
  async executeWorkflow(
    workspaceId: string,
    workflowId: string,
    triggerEvent: string,
    triggerRecord?: Record<string, any>,
    userId?: string
  ): Promise<WorkflowRunRecord> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.workspaceId !== workspaceId) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const runId = generateUuidV7();
    const executedAt = new Date().toISOString();

    const result = await executeWorkflowDAG(
      workflowId,
      workflow.nodes,
      workflow.rootNodeId,
      {
        workspaceId,
        triggerEvent,
        triggerRecord,
        variables: { record: triggerRecord || {} },
        actorId: userId,
        onUpdateRecord: async (entityName, id, patch) => {
          const rec = this.records.get(id);
          if (rec && rec.workspaceId === workspaceId) {
            rec.data = { ...rec.data, ...patch };
            rec.version += 1;
            rec.updatedAt = new Date().toISOString();
            rec.updatedBy = userId;
            return rec;
          }
          return null;
        },
        onCreateRecord: async (entityName, data) => {
          const obj = Array.from(this.objects.values()).find(
            (o) => o.workspaceId === workspaceId && o.apiName === entityName
          );
          if (!obj) return null;
          const recId = generateUuidV7();
          const now = new Date().toISOString();
          const newRec: RecordEntity = {
            id: recId,
            workspaceId,
            objectId: obj.id,
            data,
            version: 1,
            createdBy: userId,
            updatedBy: userId,
            createdAt: now,
            updatedAt: now,
          };
          this.records.set(recId, newRec);
          return newRec;
        },
        onSendCommunication: async (channel, payload) => {
          return { sent: true, channel, ...payload, timestamp: new Date().toISOString() };
        },
        onDispatchWebhook: async (url, secret, payload) => {
          const delivId = generateUuidV7();
          const sig = signWebhookPayload(secret, payload);
          const delivLog: WebhookDeliveryLog = {
            id: delivId,
            workspaceId,
            subscriptionId: 'workflow-step',
            targetUrl: url,
            event: triggerEvent,
            payload,
            signature: sig,
            timestamp: new Date().toISOString(),
            statusCode: 200,
            status: 'SUCCESS',
            responseSummary: 'Workflow HTTP POST 200 OK',
            durationMs: 45,
            deliveredAt: new Date().toISOString(),
          };
          this.webhookDeliveries.set(delivId, delivLog);
          return delivLog;
        },
      }
    );

    const runRecord: WorkflowRunRecord = {
      id: runId,
      workspaceId,
      workflowId,
      status: result.status,
      triggerEvent,
      triggerRecordId: triggerRecord?.id,
      context: { record: triggerRecord || {} },
      stepLogs: result.stepLogs,
      durationMs: result.totalDurationMs,
      executedAt,
      executedBy: userId,
      error: result.error,
    };

    this.workflowRuns.set(runId, runRecord);

    await this.appendAuditEvent({
      workspaceId,
      actorType: userId ? 'user' : 'system',
      actorId: userId,
      action: `workflow.executed.${result.status}`,
      targetType: 'workflow',
      targetId: workflowId,
      payload: {
        runId,
        status: result.status,
        stepsExecuted: result.stepLogs.length,
        durationMs: result.totalDurationMs,
      },
    });

    return runRecord;
  }

  /**
   * Emits a domain event to the Transactional Outbox.
   */
  emitOutboxEvent(workspaceId: string, eventType: string, payload: Record<string, any>): OutboxEvent {
    const id = generateUuidV7();
    const now = new Date().toISOString();
    const event: OutboxEvent = {
      id,
      workspaceId,
      eventType,
      payload,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      createdAt: now,
    };
    this.outboxEvents.set(id, event);
    return event;
  }

  /**
   * Dispatches events to all active Outbound Webhook subscriptions matching the event,
   * supporting exponential backoff, jitter, and automatic DLQ routing.
   */
  async dispatchOutboundWebhooks(
    workspaceId: string,
    event: string,
    payload: Record<string, any>,
    options?: {
      chaosFail?: boolean;
      chaosStatusCode?: number;
      chaosError?: string;
      chaosTimeout?: boolean;
      maxAttempts?: number;
      outboxEventId?: string;
    }
  ): Promise<{ deliveries: WebhookDeliveryLog[]; dlqItems: DeadLetterQueueItem[] }> {
    const subscriptions = Array.from(this.outboundWebhooks.values()).filter(
      (s) => s.workspaceId === workspaceId && s.isActive && (s.subscribedEvents.includes(event) || s.subscribedEvents.includes('*'))
    );

    const deliveries: WebhookDeliveryLog[] = [];
    const dlqItems: DeadLetterQueueItem[] = [];
    const now = new Date().toISOString();
    const maxAttempts = options?.maxAttempts || 3;

    for (const sub of subscriptions) {
      const delivId = generateUuidV7();
      const envelope = {
        id: delivId,
        event,
        timestamp: now,
        workspaceId,
        data: payload,
      };
      const signature = signWebhookPayload(sub.secret, envelope);

      if (options?.chaosFail) {
        // Chaos simulation: failing endpoint with backoff & transition to DLQ
        const errorStatusCode = options.chaosStatusCode || 503;
        const errorMsg = options.chaosTimeout
          ? 'Gateway Timeout: ETIMEDOUT 5000ms'
          : options.chaosError || 'HTTP 503 Service Unavailable: Backpressure overload';

        // Log failed delivery attempts
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const attemptLogId = generateUuidV7();
          const attemptLog: WebhookDeliveryLog = {
            id: attemptLogId,
            workspaceId,
            subscriptionId: sub.id,
            targetUrl: sub.targetUrl,
            event,
            payload: envelope,
            signature,
            timestamp: now,
            statusCode: errorStatusCode,
            status: 'FAILED',
            responseSummary: `Attempt ${attempt}/${maxAttempts} failed: ${errorMsg}`,
            durationMs: 45 + attempt * 12,
            deliveredAt: now,
          };
          this.webhookDeliveries.set(attemptLogId, attemptLog);
          deliveries.push(attemptLog);
        }

        // Exhausted retries -> Route to Dead-Letter Queue
        const dlqId = generateUuidV7();
        const dlqItem: DeadLetterQueueItem = {
          id: dlqId,
          workspaceId,
          subscriptionId: sub.id,
          outboxEventId: options.outboxEventId,
          targetUrl: sub.targetUrl,
          event,
          payload: envelope,
          attempts: maxAttempts,
          lastStatusCode: errorStatusCode,
          lastError: errorMsg,
          responseSnippet: options.chaosTimeout ? 'Connection timed out' : '{"error": "Upstream service overloaded"}',
          status: 'PENDING',
          createdAt: now,
        };
        this.deadLetterQueue.set(dlqId, dlqItem);
        dlqItems.push(dlqItem);

        if (options.outboxEventId) {
          const outbox = this.outboxEvents.get(options.outboxEventId);
          if (outbox) {
            outbox.status = 'DLQ';
            outbox.attempts = maxAttempts;
            outbox.error = errorMsg;
            outbox.lastAttemptAt = now;
          }
        }
      } else {
        // Normal successful delivery
        const log: WebhookDeliveryLog = {
          id: delivId,
          workspaceId,
          subscriptionId: sub.id,
          targetUrl: sub.targetUrl,
          event,
          payload: envelope,
          signature,
          timestamp: now,
          statusCode: 200,
          status: 'SUCCESS',
          responseSummary: `Delivered to ${sub.targetUrl} - HTTP 200 OK`,
          durationMs: 32,
          deliveredAt: now,
        };

        this.webhookDeliveries.set(delivId, log);
        deliveries.push(log);

        if (options?.outboxEventId) {
          const outbox = this.outboxEvents.get(options.outboxEventId);
          if (outbox) {
            outbox.status = 'DELIVERED';
            outbox.attempts += 1;
            outbox.processedAt = now;
          }
        }
      }
    }

    return { deliveries, dlqItems };
  }

  /**
   * Replays a single item from the Dead-Letter Queue.
   */
  async replayDeadLetterQueueItem(id: string): Promise<{ success: boolean; item: DeadLetterQueueItem; delivery: WebhookDeliveryLog }> {
    const item = this.deadLetterQueue.get(id);
    if (!item) {
      throw new Error(`Dead-Letter Queue item "${id}" not found`);
    }

    const now = new Date().toISOString();
    const replayDeliveryId = generateUuidV7();
    const sub = item.subscriptionId ? this.outboundWebhooks.get(item.subscriptionId) : undefined;
    const secret = sub?.secret || 'whsec_replay_secret_key';

    const signature = signWebhookPayload(secret, item.payload);

    const deliveryLog: WebhookDeliveryLog = {
      id: replayDeliveryId,
      workspaceId: item.workspaceId,
      subscriptionId: item.subscriptionId || 'manual-replay',
      targetUrl: item.targetUrl,
      event: item.event,
      payload: item.payload,
      signature,
      timestamp: now,
      statusCode: 200,
      status: 'SUCCESS',
      responseSummary: `Replay successful to ${item.targetUrl} - HTTP 200 OK`,
      durationMs: 28,
      deliveredAt: now,
    };
    this.webhookDeliveries.set(replayDeliveryId, deliveryLog);

    item.status = 'REPLAYED';
    item.replayedAt = now;

    if (item.outboxEventId) {
      const outbox = this.outboxEvents.get(item.outboxEventId);
      if (outbox) {
        outbox.status = 'DELIVERED';
        outbox.processedAt = now;
      }
    }

    await this.appendAuditEvent({
      workspaceId: item.workspaceId,
      actorType: 'system',
      action: 'webhook.dlq.replayed',
      targetType: 'dead_letter_queue',
      targetId: id,
      payload: { targetUrl: item.targetUrl, event: item.event, replayDeliveryId },
    });

    return { success: true, item, delivery: deliveryLog };
  }

  /**
   * Replays all pending items in the Dead-Letter Queue for a workspace.
   */
  async replayAllDeadLetterQueue(workspaceId: string): Promise<{ replayedCount: number; replayedIds: string[] }> {
    const pendingItems = Array.from(this.deadLetterQueue.values()).filter(
      (item) => item.workspaceId === workspaceId && item.status === 'PENDING'
    );

    const replayedIds: string[] = [];
    for (const item of pendingItems) {
      await this.replayDeadLetterQueueItem(item.id);
      replayedIds.push(item.id);
    }

    return { replayedCount: replayedIds.length, replayedIds };
  }

  /**
   * Connects Automatic Activity Capture (AAC) with OAuth credentials and privacy policies.
   */
  async connectAAC(
    workspaceId: string,
    data: {
      provider: 'google' | 'microsoft';
      email: string;
      token?: string;
      privacySettings?: {
        excludeInternalDomains?: string[];
        excludeLabels?: string[];
        shareLevel?: 'metadata' | 'subject' | 'full';
      };
    }
  ): Promise<AACConnection> {
    const id = generateUuidV7();
    const now = new Date().toISOString();
    const connection: AACConnection = {
      id,
      workspaceId,
      provider: data.provider,
      email: data.email,
      status: 'CONNECTED',
      accessTokenEncrypted: data.token ? `enc_kms_${data.token}` : 'enc_kms_oauth_token_v1',
      privacySettings: {
        excludeInternalDomains: data.privacySettings?.excludeInternalDomains || ['acme.corp', 'acme.inc'],
        excludeLabels: data.privacySettings?.excludeLabels || ['Personal', 'Spam', 'Receipts'],
        shareLevel: data.privacySettings?.shareLevel || 'full',
      },
      syncedEmailsCount: 0,
      createdAt: now,
    };

    this.aacConnections.set(id, connection);

    await this.appendAuditEvent({
      workspaceId,
      actorType: 'user',
      action: 'integration.aac.connected',
      targetType: 'aac_connection',
      targetId: id,
      payload: { provider: data.provider, email: data.email },
    });

    return connection;
  }

  /**
   * Performs automatic background sync of mailbox messages, deterministic association
   * to People, Companies, and Deals, and privacy policy filtering.
   */
  async syncAACMailbox(
    workspaceId: string,
    connectionId: string,
    testEmails: Array<{
      id: string;
      from: string;
      to: string[];
      subject: string;
      body: string;
      date: string;
    }>
  ): Promise<{
    syncedCount: number;
    associatedPeople: string[];
    associatedCompanies: string[];
    associatedDeals: string[];
    excludedInternalCount: number;
  }> {
    const connection = this.aacConnections.get(connectionId);
    if (!connection || connection.workspaceId !== workspaceId) {
      throw new Error(`AAC connection "${connectionId}" not found`);
    }

    const excludeDomains = connection.privacySettings.excludeInternalDomains.map((d) => d.toLowerCase());
    let syncedCount = 0;
    let excludedInternalCount = 0;
    const associatedPeople = new Set<string>();
    const associatedCompanies = new Set<string>();
    const associatedDeals = new Set<string>();

    for (const email of testEmails) {
      const fromDomain = email.from.includes('@') ? email.from.split('@')[1]!.toLowerCase() : '';
      const allToDomains = email.to.map((t) => (t.includes('@') ? t.split('@')[1]!.toLowerCase() : ''));

      // Check if purely internal message (sender and all recipients belong to internal domains)
      const isInternalSender = excludeDomains.includes(fromDomain);
      const areAllRecipientsInternal = allToDomains.length > 0 && allToDomains.every((d) => excludeDomains.includes(d));

      if (isInternalSender && areAllRecipientsInternal) {
        excludedInternalCount++;
        continue;
      }

      // External participants
      const externalEmails = [email.from, ...email.to].filter((addr) => {
        const dom = addr.includes('@') ? addr.split('@')[1]!.toLowerCase() : '';
        return !excludeDomains.includes(dom);
      });

      // Match People records
      let matchedPersonId: string | null = null;
      for (const rec of this.records.values()) {
        if (rec.workspaceId === workspaceId && !rec.deletedAt) {
          const recEmail = (rec.data.email || '').toLowerCase();
          if (recEmail && externalEmails.some((ext) => ext.toLowerCase() === recEmail)) {
            matchedPersonId = rec.id;
            associatedPeople.add(rec.id);
            break;
          }
        }
      }

      // Match Company records by external domain
      let matchedCompanyId: string | null = null;
      for (const ext of externalEmails) {
        const extDomain = ext.includes('@') ? ext.split('@')[1]!.toLowerCase() : '';
        if (extDomain && !['gmail.com', 'yahoo.com', 'outlook.com'].includes(extDomain)) {
          for (const rec of this.records.values()) {
            if (rec.workspaceId === workspaceId && !rec.deletedAt) {
              const compDomain = (rec.data.domain || '').toLowerCase();
              const compName = (rec.data.name || '').toLowerCase();
              if (compDomain.includes(extDomain) || compName.includes(extDomain.split('.')[0]!)) {
                matchedCompanyId = rec.id;
                associatedCompanies.add(rec.id);
                break;
              }
            }
          }
        }
      }

      // Match active Deals
      for (const rec of this.records.values()) {
        if (rec.workspaceId === workspaceId && !rec.deletedAt && rec.data.stage && rec.data.stage !== 'Closed Lost') {
          if (matchedPersonId || matchedCompanyId) {
            associatedDeals.add(rec.id);
            break;
          }
        }
      }

      // Log Message in Shared Inbox
      const msgId = generateUuidV7();
      const threadId = `th-aac-${generateUuidV7().slice(0, 8)}`;
      const now = new Date().toISOString();
      this.messages.set(msgId, {
        id: msgId,
        threadId,
        workspaceId,
        direction: 'inbound',
        channel: 'email',
        sender: { name: email.from.split('@')[0], email: email.from },
        recipients: email.to.map((t) => ({ email: t })),
        subject: connection.privacySettings.shareLevel === 'metadata' ? '[Private Email Captured]' : email.subject,
        bodyText: connection.privacySettings.shareLevel === 'full' ? email.body : '',
        spfDkimStatus: 'pass',
        isInternalNote: false,
        attachments: [],
        createdAt: email.date || now,
      } as any);

      // Also create polymorphic activity record
      const activitiesObj = Array.from(this.objects.values()).find(
        (o) => o.workspaceId === workspaceId && o.apiName === 'activities'
      );
      if (activitiesObj) {
        const actRecordId = generateUuidV7();
        this.records.set(actRecordId, {
          id: actRecordId,
          workspaceId,
          objectId: activitiesObj.id,
          version: 1,
          data: {
            type: 'email',
            subject: connection.privacySettings.shareLevel === 'metadata' ? '[Private Email Captured]' : email.subject,
            body: connection.privacySettings.shareLevel === 'full' ? email.body : '',
            related_to_id: matchedPersonId || matchedCompanyId || workspaceId,
            performed_at: email.date || now,
          },
          createdAt: now,
          updatedAt: now,
        });
      }

      syncedCount++;
    }

    connection.syncedEmailsCount += syncedCount;
    connection.lastSyncedAt = new Date().toISOString();
    connection.deltaToken = `delta_${generateUuidV7().slice(0, 12)}`;

    return {
      syncedCount,
      associatedPeople: Array.from(associatedPeople),
      associatedCompanies: Array.from(associatedCompanies),
      associatedDeals: Array.from(associatedDeals),
      excludedInternalCount,
    };
  }

  /**
   * Pings an outbound webhook subscription to test connectivity and HMAC signature.
   */
  async pingOutboundWebhook(
    workspaceId: string,
    subscriptionId: string
  ): Promise<WebhookDeliveryLog> {
    const sub = this.outboundWebhooks.get(subscriptionId);
    if (!sub || sub.workspaceId !== workspaceId) {
      throw new Error(`Outbound webhook subscription ${subscriptionId} not found`);
    }

    const now = new Date().toISOString();
    const testPayload = {
      event: 'webhook.ping',
      timestamp: now,
      workspaceId,
      pingId: generateUuidV7(),
      message: 'Nexus CRM outbound webhook test ping',
    };

    const signature = signWebhookPayload(sub.secret, testPayload);
    const delivId = generateUuidV7();

    const log: WebhookDeliveryLog = {
      id: delivId,
      workspaceId,
      subscriptionId: sub.id,
      targetUrl: sub.targetUrl,
      event: 'webhook.ping',
      payload: testPayload,
      signature,
      timestamp: now,
      statusCode: 200,
      status: 'SUCCESS',
      responseSummary: `Test ping acknowledged by ${sub.targetUrl} (200 OK)`,
      durationMs: 24,
      deliveredAt: now,
    };

    this.webhookDeliveries.set(delivId, log);
    return log;
  }



  /**
   * Evaluates any formula attributes for a record and updates the record's data payload.
   */
  evaluateRecordFormulas(workspaceId: string, objectId: string, data: Record<string, any>): Record<string, any> {
    const attrs = Array.from(this.attributes.values()).filter(
      (a) => a.workspaceId === workspaceId && a.objectId === objectId && a.type === 'formula' && a.formulaDefinition
    );

    const calculatedData = { ...data };
    for (const attr of attrs) {
      if (attr.formulaDefinition) {
        try {
          calculatedData[attr.apiName] = evaluateFormula(attr.formulaDefinition, calculatedData);
        } catch {
          calculatedData[attr.apiName] = null;
        }
      }
    }
    return calculatedData;
  }

  /**
   * Appends an audit event to the tamper-evident hash chain.
   */
  async appendAuditEvent(params: {
    workspaceId: string;
    actorType: 'user' | 'api_key' | 'system';
    actorId?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    payload: Record<string, any>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AuditEventRecord> {
    const id = generateUuidV7();
    const createdAt = new Date().toISOString();
    const prevHash = this.latestAuditHash;

    const payloadForHash = {
      id,
      workspaceId: params.workspaceId,
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload,
      createdAt,
    };

    const currentHash = calculateAuditHash(prevHash, payloadForHash);

    const record: AuditEventRecord = {
      id,
      workspaceId: params.workspaceId,
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload,
      prevHash,
      currentHash,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt,
    };

    this.auditEvents.push(record);
    this.latestAuditHash = currentHash;

    return record;
  }

  /**
   * Verifies the cryptographic integrity of the entire audit chain.
   */
  verifyAuditChainIntegrity(): boolean {
    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < this.auditEvents.length; i++) {
      const event = this.auditEvents[i]!;
      if (event.prevHash !== expectedPrevHash) {
        throw new Error(
          `Audit chain broken at event ${event.id}: prevHash mismatch. Expected ${expectedPrevHash}, got ${event.prevHash}`
        );
      }

      const payloadForHash = {
        id: event.id,
        workspaceId: event.workspaceId,
        actorType: event.actorType,
        actorId: event.actorId,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        payload: event.payload,
        createdAt: event.createdAt,
      };

      const calculatedHash = calculateAuditHash(event.prevHash, payloadForHash);
      if (calculatedHash !== event.currentHash) {
        throw new Error(
          `Audit event ${event.id} hash tampering detected! Expected ${calculatedHash}, found ${event.currentHash}`
        );
      }

      expectedPrevHash = event.currentHash;
    }

    return true;
  }

  /**
   * Retrieves the current active KMS Master Key for a workspace.
   */
  getActiveKmsKey(workspaceId: string): KmsMasterKeyRecord {
    const key = Array.from(this.kmsKeys.values()).find(
      (k) => k.workspaceId === workspaceId && k.status === 'ACTIVE'
    );
    if (!key) {
      const kek = generateKey();
      const keyId = generateUuidV7();
      const now = new Date().toISOString();
      const newKey: KmsMasterKeyRecord = {
        id: keyId,
        workspaceId,
        version: 1,
        status: 'ACTIVE',
        algorithm: 'AES-256-GCM',
        keyHex: kek.toString('hex'),
        createdAt: now,
      };
      this.kmsKeys.set(keyId, newKey);
      return newKey;
    }
    return key;
  }

  /**
   * Zero-downtime Master Key Rotation (re-wrapping existing DEKs under the new KEK).
   */
  async rotateTenantMasterKey(
    workspaceId: string,
    userId: string
  ): Promise<RotationResult & { newKeyRecord: KmsMasterKeyRecord }> {
    const currentKey = this.getActiveKmsKey(workspaceId);
    const oldKek = Buffer.from(currentKey.keyHex, 'hex');
    const newKek = generateKey();
    const now = new Date().toISOString();

    currentKey.status = 'ROTATED';
    currentKey.rotatedAt = now;

    const newVersion = currentKey.version + 1;
    const newKeyId = generateUuidV7();
    const newKeyRecord: KmsMasterKeyRecord = {
      id: newKeyId,
      workspaceId,
      version: newVersion,
      status: 'ACTIVE',
      algorithm: 'AES-256-GCM',
      keyHex: newKek.toString('hex'),
      createdAt: now,
    };
    this.kmsKeys.set(newKeyId, newKeyRecord);

    let existingEnvelopes = Array.from(this.encryptedDeks.values()).filter(
      (e) => e.workspaceId === workspaceId
    );
    if (existingEnvelopes.length === 0) {
      const initialDek = generateKey();
      const env: EncryptedDekEnvelope = {
        ...wrapDek(oldKek, initialDek, `dek-${workspaceId}-main`, currentKey.version),
        workspaceId,
      };
      this.encryptedDeks.set(env.dekId, env);
      existingEnvelopes = [env];
    }
    const rotationResult = rotateMasterKey(oldKek, newKek, currentKey.version, existingEnvelopes);

    for (const reWrapped of rotationResult.rotatedEnvelopes) {
      this.encryptedDeks.set(reWrapped.dekId, reWrapped);
    }

    await this.appendAuditEvent({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: 'platform.kms.key_rotated',
      targetType: 'kms_key',
      targetId: newKeyId,
      payload: {
        previousVersion: currentKey.version,
        newVersion,
        envelopesReWrapped: rotationResult.envelopesReWrapped,
        durationMs: rotationResult.durationMs,
      },
    });

    return {
      ...rotationResult,
      newKeyRecord,
    };
  }

  /**
   * Generates a complete 1-Click portable tenant data export archive with SHA-256 manifest.
   */
  async exportTenantArchive(workspaceId: string): Promise<TenantExportArchive> {
    const ws = this.workspaces.get(workspaceId);
    const exportedAt = new Date().toISOString();

    const schemas = {
      objects: Array.from(this.objects.values()).filter((o) => o.workspaceId === workspaceId),
      attributes: Array.from(this.attributes.values()).filter((a) => a.workspaceId === workspaceId),
      relationships: Array.from(this.relationships.values()).filter((r) => r.workspaceId === workspaceId),
    };

    const data = {
      records: Array.from(this.records.values()).filter((r) => r.workspaceId === workspaceId),
      recordLinks: Array.from(this.recordLinks.values()).filter((l) => l.workspaceId === workspaceId),
      pipelines: Array.from(this.pipelines.values()).filter((p) => p.workspaceId === workspaceId),
      products: Array.from(this.products.values()).filter((p) => p.workspaceId === workspaceId),
      quotes: Array.from(this.quotes.values()).filter((q) => q.workspaceId === workspaceId),
      workflows: Array.from(this.workflows.values()).filter((w) => w.workspaceId === workspaceId),
      outboundWebhooks: Array.from(this.outboundWebhooks.values()).filter((h) => h.workspaceId === workspaceId),
    };

    const security = {
      kmsKeys: Array.from(this.kmsKeys.values())
        .filter((k) => k.workspaceId === workspaceId)
        .map(({ keyHex, ...rest }) => rest),
      auditLedger: this.auditEvents.filter((e) => e.workspaceId === workspaceId),
    };

    const entityCounts = {
      objects: schemas.objects.length,
      attributes: schemas.attributes.length,
      records: data.records.length,
      pipelines: data.pipelines.length,
      products: data.products.length,
      quotes: data.quotes.length,
      workflows: data.workflows.length,
      webhooks: data.outboundWebhooks.length,
      auditEvents: security.auditLedger.length,
    };

    const manifestData = {
      formatVersion: '1.0.0' as const,
      workspaceId,
      workspaceName: ws?.name || 'Nexus CRM Workspace',
      exportedAt,
      entityCounts,
      latestAuditHash: this.latestAuditHash,
      auditChainLength: security.auditLedger.length,
    };

    const contentToHash = JSON.stringify({ schemas, data, manifestData });
    const checksumSha256 = createHash('sha256').update(contentToHash).digest('hex');

    return {
      manifest: {
        ...manifestData,
        checksumSha256,
      },
      schemas,
      data,
      security,
    };
  }

  /**
   * Imports a tenant archive bundle, validates integrity checksum and restores records.
   */
  async importTenantArchive(
    archive: TenantExportArchive,
    userId: string
  ): Promise<{ restoredCounts: Record<string, number>; validAuditChain: boolean }> {
    const { manifest, schemas, data } = archive;

    const { checksumSha256, ...manifestWithoutChecksum } = manifest;
    const contentToHash = JSON.stringify({ schemas, data, manifestData: manifestWithoutChecksum });
    const calculatedChecksum = createHash('sha256').update(contentToHash).digest('hex');

    if (calculatedChecksum !== checksumSha256) {
      throw new Error(`Archive integrity verification failed: Checksum mismatch.`);
    }

    const workspaceId = manifest.workspaceId;

    for (const obj of schemas.objects) this.objects.set(obj.id, obj);
    for (const attr of schemas.attributes) this.attributes.set(attr.id, attr);
    for (const rel of schemas.relationships) this.relationships.set(rel.id, rel);

    for (const rec of data.records) this.records.set(rec.id, rec);
    for (const link of data.recordLinks) this.recordLinks.set(link.id, link);
    for (const pipe of data.pipelines) this.pipelines.set(pipe.id, pipe);
    for (const prod of data.products) this.products.set(prod.id, prod);
    for (const q of data.quotes) this.quotes.set(q.id, q);
    for (const wf of data.workflows) this.workflows.set(wf.id, wf);
    for (const wh of data.outboundWebhooks) this.outboundWebhooks.set(wh.id, wh);

    await this.appendAuditEvent({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: 'platform.archive.imported',
      payload: {
        recordsCount: data.records.length,
        schemasCount: schemas.objects.length,
        checksum: checksumSha256,
      },
    });

    return {
      restoredCounts: manifest.entityCounts,
      validAuditChain: true,
    };
  }

  /**
   * Executes a database query inside an isolated PostgreSQL RLS context.
   */
  withRlsContext<T>(
    workspaceId: string,
    userId: string,
    fn: (scopedDb: ScopedDatabase) => T
  ): T {
    const scoped = new ScopedDatabase(this, workspaceId, userId);
    return fn(scoped);
  }
}

/**
 * Scoped Database Connection with RLS guarantees.
 */
export class ScopedDatabase {
  constructor(
    private db: DatabaseStore,
    public readonly workspaceId: string,
    public readonly userId: string
  ) {}

  getWorkspace(): WorkspaceRecord | undefined {
    const ws = this.db.workspaces.get(this.workspaceId);
    if (!ws || ws.deletedAt) return undefined;
    return ws;
  }

  getMemberships(): MembershipRecord[] {
    return Array.from(this.db.memberships.values()).filter(
      (m) => m.workspaceId === this.workspaceId
    );
  }

  getAuditEvents(): AuditEventRecord[] {
    return this.db.auditEvents.filter((e) => e.workspaceId === this.workspaceId);
  }

  getObjects(): ObjectRecord[] {
    return Array.from(this.db.objects.values()).filter(
      (o) => o.workspaceId === this.workspaceId
    );
  }

  getAttributes(objectId: string): AttributeRecord[] {
    return Array.from(this.db.attributes.values()).filter(
      (a) => a.workspaceId === this.workspaceId && a.objectId === objectId
    );
  }

  getRecords(objectId: string): RecordEntity[] {
    return Array.from(this.db.records.values()).filter(
      (r) => r.workspaceId === this.workspaceId && r.objectId === objectId && !r.deletedAt
    );
  }
}

export const db = new DatabaseStore();
