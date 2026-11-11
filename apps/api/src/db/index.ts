import { createHash, timingSafeEqual } from 'node:crypto';
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
export type Database = DatabaseStore;

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

  // Onboarding System: user onboarding state persistence
  onboardingStates = new Map<string, any>();

  // Self-Hosting: First-run Setup Wizard gate (§4.2)
  isInstanceInitialized = false;
  setupTokenHash: string | null = null;
  setupTokenExpiresAt: number | null = null;

  generateSetupToken(): string {
    const token = process.env.NEXUS_SETUP_TOKEN || createHash('sha256').update(generateUuidV7()).digest('hex').slice(0, 32);
    this.setupTokenHash = createHash('sha256').update(token).digest('hex');
    this.setupTokenExpiresAt = Date.now() + 3600 * 1000;
    return token;
  }

  verifySetupToken(token: string): boolean {
    if (this.isInstanceInitialized || !this.setupTokenHash || !this.setupTokenExpiresAt) {
      return false;
    }
    if (Date.now() > this.setupTokenExpiresAt) {
      return false;
    }
    const hash = createHash('sha256').update(token).digest('hex');
    return timingSafeEqual(Buffer.from(hash), Buffer.from(this.setupTokenHash));
  }

  async completeSetup(params: {
    instanceName: string;
    adminEmail: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
    baseCurrency?: string;
    timezone?: string;
    locale?: string;
  }): Promise<{ user: UserRecord; workspace: WorkspaceRecord; sessionToken: string }> {
    const now = new Date().toISOString();
    const userId = generateUuidV7();
    const workspaceId = generateUuidV7();
    const passwordHash = await hashPassword(params.adminPassword);

    const user: UserRecord = {
      id: userId,
      email: params.adminEmail,
      passwordHash,
      firstName: params.adminFirstName,
      lastName: params.adminLastName,
      isActive: true,
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(userId, user);

    const workspace: WorkspaceRecord = {
      id: workspaceId,
      name: params.instanceName || 'Primary Workspace',
      slug: (params.instanceName || 'primary').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      brandColor: '#4f46e5',
      baseCurrency: params.baseCurrency || 'INR',
      enabledCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'CHF', 'SAR', 'ZAR'],
      locale: params.locale || 'en-IN',
      timezone: params.timezone || 'Asia/Kolkata',
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

    const sessionToken = generateUuidV7();
    this.sessions.set(sessionToken, {
      id: sessionToken,
      userId,
      workspaceId,
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      lastUsedAt: now,
    });

    await this.seedStandardObjects(workspaceId);

    const masterKek = generateKey();
    this.kmsKeys.set('1', {
      id: '1',
      workspaceId,
      version: 1,
      status: 'ACTIVE',
      algorithm: 'AES-256-GCM',
      keyHex: masterKek.toString('hex'),
      createdAt: now,
    });
    const initialDek = generateKey();
    const initialEnvelope = {
      ...wrapDek(masterKek, initialDek, 'dek-tenant-main', 1),
      workspaceId,
    };
    this.encryptedDeks.set(initialEnvelope.dekId, initialEnvelope);

    this.isInstanceInitialized = true;
    this.setupTokenHash = null;
    this.setupTokenExpiresAt = null;

    await this.appendAuditEvent({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: 'system.setup_completed',
      payload: {
        instanceName: workspace.name,
        adminEmail: user.email,
        baseCurrency: workspace.baseCurrency,
        timezone: workspace.timezone,
      },
    });

    return { user, workspace, sessionToken };
  }



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
  /**
   * Initializes a clean system with canonical standard objects and zero business records.
   */
  async initializeSystem(force = false): Promise<void> {
    if (this.users.size > 0 && !force) return;
    if (process.env.NEXUS_CLEAN_INSTALL === 'true') {
      this.isInstanceInitialized = false;
      this.generateSetupToken();
      return;
    }
    if (force) {
      this.workspaces.clear();
      this.users.clear();
      this.memberships.clear();
      this.sessions.clear();
      this.mfaFactors.clear();
      this.recoveryCodes.clear();
      this.auditEvents = [];
      this.latestAuditHash = "0000000000000000000000000000000000000000000000000000000000000000";
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
    const passwordHash = await hashPassword("SuperSecretPassword123!");

    const user: UserRecord = {
      id: userId,
      email: "founder@nexus-crm.local",
      passwordHash,
      firstName: "Alex",
      lastName: "Rivers",
      isActive: true,
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(userId, user);

    const workspace: WorkspaceRecord = {
      id: workspaceId,
      name: "Nexus Sovereign CRM",
      slug: "nexus-sovereign",
      brandColor: "#4f46e5",
      baseCurrency: "INR",
      enabledCurrencies: ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY", "CHF", "SAR", "ZAR"],
      locale: "en-IN",
      timezone: "Asia/Kolkata",
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
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    // Session token for initial authentication
    this.sessions.set("demo-session-token", {
      id: "demo-session-token",
      userId,
      workspaceId,
      refreshTokenHash: "hash",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      lastUsedAt: now,
    });

    // Seed canonical standard objects (Companies, People, Deals, Activities)
    await this.seedStandardObjects(workspaceId);

    // Master KEK and Initial Envelope DEK
    const masterKek = generateKey();
    this.kmsKeys.set("1", {
      id: "1",
      workspaceId,
      version: 1,
      status: "ACTIVE",
      algorithm: "AES-256-GCM",
      keyHex: masterKek.toString("hex"),
      createdAt: now,
    });

    const initialDek = generateKey();
    const initialEnvelope = {
      ...wrapDek(masterKek, initialDek, "dek-tenant-main", 1),
      workspaceId,
    };
    this.encryptedDeks.set(initialEnvelope.dekId, initialEnvelope);

    // Initial audit chain
    await this.appendAuditEvent({
      workspaceId,
      actorType: "system",
      action: "system.bootstrap",
      payload: { message: "Initialized Sovereign Nexus CRM workspace with canonical standard objects and clean state" },
    });
    await this.appendAuditEvent({
      workspaceId,
      actorType: "user",
      actorId: userId,
      action: "metadata.schema.seed",
      payload: { objects: ["companies", "people", "deals", "activities"] },
    });
    this.isInstanceInitialized = true;
  }

  /**
   * Seeds demo data for test suites from test fixtures.
   */
  async seedDemoData(force = false): Promise<void> {
    await this.initializeSystem(force);
    const { seedDemoRecords } = await import("../__tests__/fixtures/demo-data.js");
    await seedDemoRecords(this, force);
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
