import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  db,
  type UserRecord,
  type WorkspaceRecord,
  type ObjectRecord,
  type AttributeRecord,
  type RecordEntity,
  type DuplicatePairRecord,
  type MergeHistoryRecord,
  type WorkflowRecord,
  type WorkflowRunRecord,
  type OutboundWebhookSubscription,
  type WebhookDeliveryLog,
  type DeadLetterQueueItem,
  type OutboxEvent,
  type AACConnection,
  type KmsMasterKeyRecord,
  type TenantExportArchive,
} from './db/index';
import { validateSafeOutboundUrl, SSRFBlockedError } from './lib/ssrf';
import {
  validateWorkflowDAG,
  verifyWebhookSignature,
  signWebhookPayload,
} from '@nexus/workflow';
import {
  generateUuidV7,
  hashPassword,
  verifyPassword,
  generateBase32Secret,
  computeTotpCode,
  verifyTotpCode,
  generateRecoveryCodes,
} from './lib/crypto';
import {
  registerSchema,
  loginSchema,
  mfaVerifySchema,
  mfaChallengeSchema,
  updateWorkspaceSchema,
  calculateQuoteTotals,
  calculatePipelineMetrics,
  isDealRotting,
  DEFAULT_PIPELINE_STAGES,
  detectSmsOptOut,
  stitchEmailThread,
  substituteTemplateVariables,
  isWithinSendWindow,
  type Pipeline,
  type Product,
  type Quote,
  type MessageThread,
  type Message,
  type Sequence,
  type SequenceEnrollment,
  type TelephonyCall,
  type CommunicationPreferences,
  type CannedSnippet,
} from '@nexus/schema';
import { can, ROLE_PERMISSIONS_MATRIX, type Action } from '@nexus/permissions';

export interface ServerOptions {
  port?: number;
  host?: string;
  logger?: boolean;
}

export async function createServer(opts: ServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger !== false,
  });

  // Seed default demo workspace & standard objects if empty (dev/runtime only)
  if (process.env.NODE_ENV !== 'test') {
    await db.seedDemoData();
  }

  // Security headers & Plugins
  await app.register(helmet, {
    contentSecurityPolicy: false, // For dev Swagger UI
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'dev-secret-cookie-signing-32-bytes-min',
  });

  await app.register(rateLimit, {
    max: 1000,
    timeWindow: '1 minute',
  });

  // Swagger Documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Nexus CRM API',
        description: 'Production-grade, multi-tenant, programmable CRM API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:4000' }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Authentication Context Decorators
  app.decorateRequest('user', null);
  app.decorateRequest('workspace', null);
  app.decorateRequest('membership', null);

  // Auth Middleware
  const authenticate = async (req: FastifyRequest, reply: FastifyReply) => {
    const sessionId = req.cookies['nexus_session'] || (req.headers['authorization'] as string)?.replace('Bearer ', '');
    if (!sessionId) {
      return reply.status(401).send({ error: 'Unauthorized: Missing session token' });
    }

    const session = db.sessions.get(sessionId);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return reply.status(401).send({ error: 'Unauthorized: Session expired or invalid' });
    }

    const user = db.users.get(session.userId);
    const workspace = db.workspaces.get(session.workspaceId);
    if (!user || !workspace) {
      return reply.status(401).send({ error: 'Unauthorized: User or workspace not found' });
    }

    const membershipKey = Array.from(db.memberships.values()).find(
      (m) => m.userId === user.id && m.workspaceId === workspace.id
    );

    (req as any).user = user;
    (req as any).workspace = workspace;
    (req as any).membership = membershipKey;
  };

  // Helper to mask/strip hidden fields based on role
  const maskRecordFields = (objectApiName: string, role: string, data: Record<string, any>) => {
    const roleDef = (ROLE_PERMISSIONS_MATRIX as any)[role];
    const hiddenFields = roleDef?.fieldPermissions?.[objectApiName]?.hidden || [];
    if (hiddenFields.length === 0) return data;

    const filtered = { ...data };
    for (const f of hiddenFields) {
      delete filtered[f];
    }
    return filtered;
  };

  // Health & Liveness check endpoint
  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  app.get('/v1/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Readiness probe checking database readiness and memory metrics
  app.get('/ready', async (req: FastifyRequest, reply: FastifyReply) => {
    return {
      status: 'ready',
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      activeTenants: db.workspaces.size,
      recordsCount: db.records.size,
    };
  });

  // Prometheus Metrics Exporter
  app.get('/metrics', async (req: FastifyRequest, reply: FastifyReply) => {
    reply.header('content-type', 'text/plain; version=0.0.4; charset=utf-8');
    const uptime = process.uptime().toFixed(1);
    const tenants = db.workspaces.size;
    const records = db.records.size;
    const auditEvents = db.auditEvents.length;
    const workflows = db.workflows.size;
    const webhooks = db.outboundWebhooks.size;

    return `# HELP nexus_uptime_seconds System uptime in seconds
# TYPE nexus_uptime_seconds gauge
nexus_uptime_seconds ${uptime}

# HELP nexus_active_tenants Total active sovereign workspaces
# TYPE nexus_active_tenants gauge
nexus_active_tenants ${tenants}

# HELP nexus_records_total Total polymorphic records stored
# TYPE nexus_records_total gauge
nexus_records_total ${records}

# HELP nexus_audit_events_total Total cryptographic tamper-evident audit ledger events
# TYPE nexus_audit_events_total counter
nexus_audit_events_total ${auditEvents}

# HELP nexus_workflows_total Total configured workflows
# TYPE nexus_workflows_total gauge
nexus_workflows_total ${workflows}

# HELP nexus_outbound_webhooks_total Total outbound webhook subscriptions
# TYPE nexus_outbound_webhooks_total gauge
nexus_outbound_webhooks_total ${webhooks}
`;
  });

  // --------------------------------------------------------------------------
  // AUTHENTICATION ROUTES
  // --------------------------------------------------------------------------

  // Register user + default workspace + seed standard objects
  app.post('/v1/auth/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parseResult.error.format() });
    }
    const { email, password, firstName, lastName, workspaceName } = parseResult.data;

    const existing = Array.from(db.users.values()).find((u) => u.email === email);
    if (existing) {
      return reply.status(409).send({ error: 'User with this email already exists' });
    }

    const userId = generateUuidV7();
    const workspaceId = generateUuidV7();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const user: UserRecord = {
      id: userId,
      email,
      passwordHash,
      firstName,
      lastName,
      isActive: true,
      isEmailVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    db.users.set(userId, user);

    const workspace: WorkspaceRecord = {
      id: workspaceId,
      name: workspaceName,
      slug: workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      brandColor: '#6366f1',
      baseCurrency: 'INR',
      enabledCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY', 'CHF', 'SAR', 'ZAR'],
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      fiscalYearStartMonth: 4,
      createdAt: now,
      updatedAt: now,
    };
    db.workspaces.set(workspaceId, workspace);

    const membershipId = generateUuidV7();
    db.memberships.set(membershipId, {
      id: membershipId,
      workspaceId,
      userId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });

    // Seed standard objects (People, Companies, Deals, Activities)
    await db.seedStandardObjects(workspaceId);

    // Create session
    const sessionId = generateUuidV7();
    db.sessions.set(sessionId, {
      id: sessionId,
      userId,
      workspaceId,
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      lastUsedAt: now,
    });

    // Append Audit Event
    await db.appendAuditEvent({
      workspaceId,
      actorType: 'user',
      actorId: userId,
      action: 'auth.register',
      targetType: 'workspace',
      targetId: workspaceId,
      payload: { email, workspaceName },
    });

    reply.setCookie('nexus_session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return reply.status(201).send({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      sessionId,
    });
  });

  // Login
  app.post('/v1/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid login payload' });
    }
    const { email, password } = parseResult.data;

    const user = Array.from(db.users.values()).find((u) => u.email === email);
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const mfa = Array.from(db.mfaFactors.values()).find((f) => f.userId === user.id && f.isVerified);
    if (mfa) {
      const mfaTicket = generateUuidV7();
      (db as any)[`mfa_ticket_${mfaTicket}`] = { userId: user.id, expires: Date.now() + 5 * 60 * 1000 };
      return reply.status(200).send({ mfaRequired: true, mfaTicket });
    }

    const membership = Array.from(db.memberships.values()).find((m) => m.userId === user.id);
    const workspaceId = membership ? membership.workspaceId : '';

    const sessionId = generateUuidV7();
    const now = new Date().toISOString();
    db.sessions.set(sessionId, {
      id: sessionId,
      userId: user.id,
      workspaceId,
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      lastUsedAt: now,
    });

    reply.setCookie('nexus_session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return {
      mfaRequired: false,
      sessionId,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    };
  });

  // Setup TOTP MFA (Authenticated)
  app.post('/v1/auth/mfa/setup', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const user = (req as any).user as UserRecord;
    const secret = generateBase32Secret(20);

    const mfaId = generateUuidV7();
    const now = new Date().toISOString();
    db.mfaFactors.set(mfaId, {
      id: mfaId,
      userId: user.id,
      type: 'totp',
      secret,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    const otpauthUri = `otpauth://totp/Nexus%20CRM:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Nexus%20CRM`;

    return { secret, otpauthUri };
  });

  // Verify and activate TOTP MFA (Authenticated)
  app.post('/v1/auth/mfa/verify', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user as UserRecord;
    const parseResult = mfaVerifySchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid 6-digit TOTP code' });
    }

    const factor = Array.from(db.mfaFactors.values()).find((f) => f.userId === user.id);
    if (!factor) {
      return reply.status(400).send({ error: 'MFA setup not initiated' });
    }

    const valid = verifyTotpCode(factor.secret, parseResult.data.token);
    if (!valid) {
      return reply.status(400).send({ error: 'Invalid TOTP code' });
    }

    factor.isVerified = true;
    factor.updatedAt = new Date().toISOString();

    const recoveryCodes = generateRecoveryCodes(10);
    for (const code of recoveryCodes) {
      const codeId = generateUuidV7();
      db.recoveryCodes.set(codeId, {
        id: codeId,
        userId: user.id,
        codeHash: code,
      });
    }

    return { success: true, recoveryCodes };
  });

  // MFA Challenge (Unauthenticated sign-in step)
  app.post('/v1/auth/mfa/challenge', async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = mfaChallengeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid challenge payload' });
    }
    const { mfaTicket, token } = parseResult.data;

    const ticket = (db as any)[`mfa_ticket_${mfaTicket}`];
    if (!ticket || ticket.expires < Date.now()) {
      return reply.status(401).send({ error: 'MFA ticket expired. Please log in again.' });
    }

    const factor = Array.from(db.mfaFactors.values()).find((f) => f.userId === ticket.userId && f.isVerified);
    if (!factor || !verifyTotpCode(factor.secret, token)) {
      return reply.status(401).send({ error: 'Invalid authentication code' });
    }

    delete (db as any)[`mfa_ticket_${mfaTicket}`];

    const user = db.users.get(ticket.userId)!;
    const membership = Array.from(db.memberships.values()).find((m) => m.userId === user.id);
    const workspaceId = membership ? membership.workspaceId : '';

    const sessionId = generateUuidV7();
    const now = new Date().toISOString();
    db.sessions.set(sessionId, {
      id: sessionId,
      userId: user.id,
      workspaceId,
      refreshTokenHash: 'hash',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      lastUsedAt: now,
    });

    reply.setCookie('nexus_session', sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return {
      success: true,
      sessionId,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
    };
  });

  // Current User (/v1/auth/me)
  app.get('/v1/auth/me', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const user = (req as any).user as UserRecord;
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const mfa = Array.from(db.mfaFactors.values()).some((f) => f.userId === user.id && f.isVerified);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mfaEnabled: mfa,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        brandColor: workspace.brandColor,
      },
      role: membership?.role || 'read_only',
    };
  });

  // Logout
  app.post('/v1/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const sessionId = req.cookies['nexus_session'];
    if (sessionId) {
      db.sessions.delete(sessionId);
    }
    reply.clearCookie('nexus_session', { path: '/' });
    return { success: true };
  });

  // --------------------------------------------------------------------------
  // METADATA & SCHEMA ROUTES
  // --------------------------------------------------------------------------

  // List all objects in active workspace
  app.get('/v1/metadata/objects', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    return Array.from(db.objects.values()).filter((o) => o.workspaceId === workspace.id);
  });

  // Create a Custom Object
  app.post('/v1/metadata/objects', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'manage_schema', 'custom_objects')) {
      return reply.status(403).send({ error: 'Forbidden: Insufficient permissions to manage schema' });
    }

    const { apiName, singularLabel, pluralLabel, icon = 'Box', color = '#6366F1', description } = req.body as any;
    if (!apiName || !singularLabel || !pluralLabel) {
      return reply.status(400).send({ error: 'apiName, singularLabel, and pluralLabel are required' });
    }

    const sanitizedApiName = apiName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Check duplicate
    const existing = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === sanitizedApiName
    );
    if (existing) {
      return reply.status(409).send({ error: `An object with API name '${sanitizedApiName}' already exists` });
    }

    const objectId = generateUuidV7();
    const now = new Date().toISOString();
    const newObj: ObjectRecord = {
      id: objectId,
      workspaceId: workspace.id,
      apiName: sanitizedApiName,
      singularLabel,
      pluralLabel,
      icon,
      color,
      description,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    db.objects.set(objectId, newObj);

    // Auto-create default 'name' attribute
    const nameAttrId = generateUuidV7();
    db.attributes.set(nameAttrId, {
      id: nameAttrId,
      workspaceId: workspace.id,
      objectId,
      apiName: 'name',
      label: `${singularLabel} Name`,
      type: 'text',
      isRequired: true,
      isUnique: false,
      isFilterable: true,
      isSortable: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'metadata.object.create',
      targetType: 'object',
      targetId: objectId,
      payload: { apiName: sanitizedApiName, singularLabel, pluralLabel },
    });

    return reply.status(201).send(newObj);
  });

  // List attributes for an object
  app.get('/v1/metadata/objects/:objectId/attributes', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectId } = req.params as { objectId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    const obj = db.objects.get(objectId);
    if (!obj || obj.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Object not found' });
    }

    return Array.from(db.attributes.values()).filter(
      (a) => a.workspaceId === workspace.id && a.objectId === objectId
    );
  });

  // Create an Attribute on an object
  app.post('/v1/metadata/objects/:objectId/attributes', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectId } = req.params as { objectId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'manage_schema', 'custom_objects')) {
      return reply.status(403).send({ error: 'Forbidden: Insufficient permissions to manage schema' });
    }

    const obj = db.objects.get(objectId);
    if (!obj || obj.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Object not found' });
    }

    const {
      apiName,
      label,
      type,
      isRequired = false,
      isUnique = false,
      isFilterable = true,
      isSortable = true,
      optionsConfig,
      formulaDefinition,
      defaultValue,
    } = req.body as any;

    if (!apiName || !label || !type) {
      return reply.status(400).send({ error: 'apiName, label, and type are required' });
    }

    const sanitizedApiName = apiName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const attrId = generateUuidV7();
    const now = new Date().toISOString();
    const newAttr: AttributeRecord = {
      id: attrId,
      workspaceId: workspace.id,
      objectId,
      apiName: sanitizedApiName,
      label,
      type,
      isRequired,
      isUnique,
      isFilterable,
      isSortable,
      optionsConfig,
      formulaDefinition,
      defaultValue,
      createdAt: now,
      updatedAt: now,
    };
    db.attributes.set(attrId, newAttr);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'metadata.attribute.create',
      targetType: 'attribute',
      targetId: attrId,
      payload: { objectId, apiName: sanitizedApiName, type },
    });

    return reply.status(201).send(newAttr);
  });

  // List relationships
  app.get('/v1/metadata/relationships', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    return Array.from(db.relationships.values()).filter((r) => r.workspaceId === workspace.id);
  });

  // Create relationship between two objects
  app.post('/v1/metadata/relationships', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'manage_schema', 'custom_objects')) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { fromObjectId, toObjectId, cardinality = '1:N', fromLabel, toLabel } = req.body as any;
    if (!fromObjectId || !toObjectId || !fromLabel || !toLabel) {
      return reply.status(400).send({ error: 'fromObjectId, toObjectId, fromLabel, and toLabel are required' });
    }

    const relId = generateUuidV7();
    const now = new Date().toISOString();
    const rel: any = {
      id: relId,
      workspaceId: workspace.id,
      fromObjectId,
      toObjectId,
      cardinality,
      fromLabel,
      toLabel,
      createdAt: now,
    };
    db.relationships.set(relId, rel);

    return reply.status(201).send(rel);
  });

  // --------------------------------------------------------------------------
  // RECORDS ROUTES
  // --------------------------------------------------------------------------

  // List records for an object (Cursor pagination, filtering, sorting, field masking)
  app.get('/v1/records/:objectApiName', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectApiName } = req.params as { objectApiName: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    // Check Object-level READ permission
    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'read', objectApiName)) {
      return reply.status(403).send({ error: `Forbidden: Cannot read object '${objectApiName}'` });
    }

    const obj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === objectApiName
    );
    if (!obj) {
      return reply.status(404).send({ error: `Object '${objectApiName}' not found` });
    }

    const allRecords = Array.from(db.records.values()).filter(
      (r) => r.workspaceId === workspace.id && r.objectId === obj.id && !r.deletedAt
    );

    // Apply field-level masking
    const maskedRecords = allRecords.map((r) => ({
      ...r,
      data: maskRecordFields(objectApiName, membership.role, r.data),
    }));

    return {
      records: maskedRecords,
      total: maskedRecords.length,
    };
  });

  // Create a record
  app.post('/v1/records/:objectApiName', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectApiName } = req.params as { objectApiName: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    // Check Object-level CREATE permission
    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'create', objectApiName)) {
      return reply.status(403).send({ error: `Forbidden: Cannot create records in '${objectApiName}'` });
    }

    const obj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === objectApiName
    );
    if (!obj) {
      return reply.status(404).send({ error: `Object '${objectApiName}' not found` });
    }

    const rawData = (req.body as any)?.data || (req.body as any) || {};

    // Evaluate dynamic formulas
    const calculatedData = db.evaluateRecordFormulas(workspace.id, obj.id, rawData);

    const recordId = generateUuidV7();
    const now = new Date().toISOString();
    const newRecord: RecordEntity = {
      id: recordId,
      workspaceId: workspace.id,
      objectId: obj.id,
      data: calculatedData,
      version: 1,
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    db.records.set(recordId, newRecord);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: `record.${objectApiName}.create`,
      targetType: objectApiName,
      targetId: recordId,
      payload: { data: calculatedData },
    });

    return reply.status(201).send({
      ...newRecord,
      data: maskRecordFields(objectApiName, membership.role, newRecord.data),
    });
  });

  // Get a single record by ID with related records
  app.get('/v1/records/:objectApiName/:recordId', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectApiName, recordId } = req.params as { objectApiName: string; recordId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'read', objectApiName)) {
      return reply.status(403).send({ error: `Forbidden: Cannot read object '${objectApiName}'` });
    }

    const record = db.records.get(recordId);
    if (!record || record.workspaceId !== workspace.id || record.deletedAt) {
      return reply.status(404).send({ error: 'Record not found' });
    }

    // Fetch related records in both directions
    const forwardLinks = Array.from(db.recordLinks.values()).filter(
      (l) => l.workspaceId === workspace.id && l.fromRecordId === recordId
    );
    const backwardLinks = Array.from(db.recordLinks.values()).filter(
      (l) => l.workspaceId === workspace.id && l.toRecordId === recordId
    );

    const relatedRecords = [
      ...forwardLinks.map((l) => {
        const target = db.records.get(l.toRecordId);
        const rel = db.relationships.get(l.relationshipId);
        return {
          linkId: l.id,
          direction: 'forward',
          relationLabel: rel?.toLabel || 'Related',
          record: target,
        };
      }),
      ...backwardLinks.map((l) => {
        const source = db.records.get(l.fromRecordId);
        const rel = db.relationships.get(l.relationshipId);
        return {
          linkId: l.id,
          direction: 'backward',
          relationLabel: rel?.fromLabel || 'Parent',
          record: source,
        };
      }),
    ].filter((r) => r.record && !r.record.deletedAt);

    return {
      ...record,
      data: maskRecordFields(objectApiName, membership.role, record.data),
      relatedRecords,
    };
  });

  // Update a record (inline editing, optimistic concurrency)
  app.patch('/v1/records/:objectApiName/:recordId', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectApiName, recordId } = req.params as { objectApiName: string; recordId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    const record = db.records.get(recordId);
    if (!record || record.workspaceId !== workspace.id || record.deletedAt) {
      return reply.status(404).send({ error: 'Record not found' });
    }

    // Check Object and Record-level permissions
    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'update', objectApiName, record)) {
      return reply.status(403).send({ error: `Forbidden: Cannot update record in '${objectApiName}'` });
    }

    const { data: updateData, version } = req.body as any;

    // Optimistic concurrency check
    if (version !== undefined && version !== record.version) {
      return reply.status(409).send({
        error: 'Conflict: Record has been modified by another user. Please refresh and re-apply.',
        currentVersion: record.version,
      });
    }

    const mergedData = { ...record.data, ...(updateData || {}) };
    const finalData = db.evaluateRecordFormulas(workspace.id, record.objectId, mergedData);

    record.data = finalData;
    record.version += 1;
    record.updatedBy = user.id;
    record.updatedAt = new Date().toISOString();

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: `record.${objectApiName}.update`,
      targetType: objectApiName,
      targetId: recordId,
      payload: { delta: updateData },
    });

    return {
      ...record,
      data: maskRecordFields(objectApiName, membership.role, record.data),
    };
  });

  // Soft-delete a record (moves to recycle bin)
  app.delete('/v1/records/:objectApiName/:recordId', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectApiName, recordId } = req.params as { objectApiName: string; recordId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    const record = db.records.get(recordId);
    if (!record || record.workspaceId !== workspace.id || record.deletedAt) {
      return reply.status(404).send({ error: 'Record not found' });
    }

    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'delete', objectApiName, record)) {
      return reply.status(403).send({ error: `Forbidden: Cannot delete record in '${objectApiName}'` });
    }

    record.deletedAt = new Date().toISOString();

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: `record.${objectApiName}.delete`,
      targetType: objectApiName,
      targetId: recordId,
      payload: { deletedAt: record.deletedAt },
    });

    return { success: true, message: 'Record moved to 30-day recycle bin' };
  });

  // Link two records
  app.post('/v1/records/:objectApiName/:recordId/links', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { recordId } = req.params as { recordId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { relationshipId, targetRecordId } = req.body as any;

    if (!relationshipId || !targetRecordId) {
      return reply.status(400).send({ error: 'relationshipId and targetRecordId are required' });
    }

    const linkId = generateUuidV7();
    const link: any = {
      id: linkId,
      workspaceId: workspace.id,
      relationshipId,
      fromRecordId: recordId,
      toRecordId: targetRecordId,
      createdAt: new Date().toISOString(),
    };
    db.recordLinks.set(linkId, link);

    return reply.status(201).send(link);
  });

  // --------------------------------------------------------------------------
  // GLOBAL SEARCH ROUTE
  // --------------------------------------------------------------------------
  app.get('/v1/search', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { q } = req.query as { q?: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    if (!q || q.trim().length === 0) {
      return { results: [] };
    }

    const query = q.toLowerCase().trim();
    const results: Array<{
      id: string;
      objectApiName: string;
      objectLabel: string;
      title: string;
      subtitle: string;
      href: string;
    }> = [];

    const objects = Array.from(db.objects.values()).filter((o) => o.workspaceId === workspace.id);

    for (const rec of db.records.values()) {
      if (rec.workspaceId !== workspace.id) continue;
      const obj = objects.find((o) => o.id === rec.objectId);
      if (!obj) continue;

      const dataStr = Object.values(rec.data).join(' ').toLowerCase();
      if (dataStr.includes(query) || rec.id.toLowerCase().includes(query)) {
        const title =
          rec.data.name ||
          `${rec.data.first_name || ''} ${rec.data.last_name || ''}`.trim() ||
          rec.data.subject ||
          `Record #${rec.id.slice(0, 8)}`;
        const subtitle =
          rec.data.email || rec.data.phone || rec.data.company || rec.data.stage || obj.singularLabel;

        results.push({
          id: rec.id,
          objectApiName: obj.apiName,
          objectLabel: obj.singularLabel,
          title,
          subtitle: String(subtitle),
          href: `/records/${obj.apiName}/${rec.id}`,
        });
      }

      if (results.length >= 25) break;
    }

    return { results };
  });

  // --------------------------------------------------------------------------
  // LEAD TO DEAL CONVERSION ROUTE
  // --------------------------------------------------------------------------
  app.post('/v1/records/people/:id/convert-to-deal', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const body = (req.body || {}) as { dealName?: string; dealAmount?: number; pipelineStage?: string };

    const person = db.records.get(id);
    if (!person || person.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Person / Lead record not found' });
    }

    const dealsObj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === 'deals'
    );
    if (!dealsObj) return reply.status(500).send({ error: 'Deals object definition missing' });

    const dealId = generateUuidV7();
    const leadName = `${person.data.first_name || ''} ${person.data.last_name || ''}`.trim();
    const dealName = body.dealName || (leadName ? `${leadName} Opportunity` : 'New Sales Opportunity');
    const dealAmount = body.dealAmount || 150000;
    const stage = body.pipelineStage || 'Discovery';

    const newDeal: RecordEntity = {
      id: dealId,
      workspaceId: workspace.id,
      objectId: dealsObj.id,
      version: 1,
      data: {
        name: dealName,
        amount: dealAmount,
        stage,
        probability: 20,
        expected_value: dealAmount * 0.2,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.records.set(dealId, newDeal);

    // Advance person lifecycle stage to Opportunity
    person.data.lifecycle_stage = 'Opportunity';
    person.version += 1;
    person.updatedAt = new Date().toISOString();
    db.records.set(id, person);

    // Link Person <-> Deal
    const linkId = generateUuidV7();
    db.recordLinks.set(linkId, {
      id: linkId,
      workspaceId: workspace.id,
      relationshipId: 'rel-person-deals',
      fromRecordId: id,
      toRecordId: dealId,
      createdAt: new Date().toISOString(),
    });

    // Write audit event
    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'lead.converted_to_deal',
      targetType: 'deals',
      targetId: dealId,
      payload: {
        leadPersonId: id,
        leadName,
        createdDealId: dealId,
        dealName,
        dealAmount,
      },
    });

    return reply.status(201).send({
      success: true,
      deal: newDeal,
      lead: person,
    });
  });

  // --------------------------------------------------------------------------
  // CSV IMPORT / EXPORT ROUTES
  // --------------------------------------------------------------------------

  // Import dry-run: parses records and validates schema
  app.post('/v1/import/:objectApiName/dry-run', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectApiName } = req.params as { objectApiName: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { rows } = req.body as { rows: Array<Record<string, any>> };

    const obj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === objectApiName
    );
    if (!obj) return reply.status(404).send({ error: 'Object not found' });

    const attrs = Array.from(db.attributes.values()).filter(
      (a) => a.workspaceId === workspace.id && a.objectId === obj.id
    );

    const validated: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < (rows || []).length; i++) {
      const row = rows[i]!;
      const rowErrors: string[] = [];

      for (const attr of attrs) {
        if (attr.isRequired && (row[attr.apiName] === undefined || row[attr.apiName] === '')) {
          rowErrors.push(`Missing required field '${attr.label}'`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ rowIndex: i, errors: rowErrors });
      } else {
        validated.push(row);
      }
    }

    return {
      totalRows: rows.length,
      validRowsCount: validated.length,
      errorRowsCount: errors.length,
      errors: errors.slice(0, 50),
    };
  });

  // Export records as CSV respecting field permissions
  app.get('/v1/export/:objectApiName', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { objectApiName } = req.params as { objectApiName: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;
    const user = (req as any).user as UserRecord;

    if (!can({ id: user.id, workspaceId: workspace.id, role: membership.role }, 'export', objectApiName)) {
      return reply.status(403).send({ error: `Forbidden: Cannot export records from '${objectApiName}'` });
    }

    const obj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === objectApiName
    );
    if (!obj) return reply.status(404).send({ error: 'Object not found' });

    const allRecords = Array.from(db.records.values()).filter(
      (r) => r.workspaceId === workspace.id && r.objectId === obj.id && !r.deletedAt
    );

    const masked = allRecords.map((r) => maskRecordFields(objectApiName, membership.role, r.data));

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: `record.${objectApiName}.export`,
      targetType: objectApiName,
      targetId: obj.id,
      payload: { exportedRowCount: masked.length },
    });

    return {
      object: objectApiName,
      records: masked,
      exportedAt: new Date().toISOString(),
    };
  });

  // --------------------------------------------------------------------------
  // PIPELINES & KANBAN ROUTES (Phase 2)
  // --------------------------------------------------------------------------

  // List pipelines
  app.get('/v1/pipelines', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    return Array.from(db.pipelines.values()).filter((p) => p.workspaceId === workspace.id);
  });

  // Kanban Board endpoint: Deals grouped by stages with metrics & rotting detection
  app.get('/v1/pipelines/:pipelineId/board', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { pipelineId } = req.params as { pipelineId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const membership = (req as any).membership;

    const pipeline = db.pipelines.get(pipelineId) || Array.from(db.pipelines.values()).find((p) => p.workspaceId === workspace.id);
    if (!pipeline) {
      return reply.status(404).send({ error: 'Pipeline not found' });
    }

    const dealsObj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === 'deals'
    );
    if (!dealsObj) {
      return { stages: pipeline.stages, deals: [] };
    }

    const allDeals = Array.from(db.records.values()).filter(
      (r) => r.workspaceId === workspace.id && r.objectId === dealsObj.id && !r.deletedAt
    );

    const now = Date.now();

    // Map deals with days in stage, rotting alert, and stage history
    const enrichedDeals = allDeals.map((d) => {
      const transitions = db.dealStageHistory.filter((h) => h.dealId === d.id);
      const latestTransition = transitions[transitions.length - 1];
      const stageDate = latestTransition ? new Date(latestTransition.transitionedAt).getTime() : new Date(d.createdAt).getTime();
      const daysInStage = Math.max(0, Math.floor((now - stageDate) / (1000 * 60 * 60 * 24)));

      const currentStageName = d.data.stage || 'Discovery';
      const matchedStage = pipeline.stages.find(
        (s) => s.name.toLowerCase() === currentStageName.toLowerCase()
      );
      const threshold = matchedStage ? matchedStage.rottingDaysThreshold : 14;
      const rotting = isDealRotting(daysInStage, threshold);

      return {
        id: d.id,
        name: d.data.name || 'Untitled Deal',
        amount: Number(d.data.amount) || 0,
        stage: currentStageName,
        probability: d.data.probability !== undefined ? Number(d.data.probability) : matchedStage?.winProbability || 50,
        expectedValue: Number(d.data.expected_value) || 0,
        closeDate: d.data.close_date || null,
        daysInStage,
        isRotting: rotting,
        rottingThreshold: threshold,
        version: d.version,
        data: maskRecordFields('deals', membership.role, d.data),
      };
    });

    const metrics = calculatePipelineMetrics(
      enrichedDeals.map((d) => ({ amount: d.amount, stage: d.stage })),
      pipeline.stages
    );

    return {
      pipeline,
      metrics,
      stages: pipeline.stages.map((stage) => {
        const stageDeals = enrichedDeals.filter(
          (d) =>
            d.stage.toLowerCase() === stage.name.toLowerCase() ||
            stage.name.toLowerCase().startsWith(d.stage.toLowerCase()) ||
            d.stage.toLowerCase().startsWith(stage.name.toLowerCase())
        );
        const stageAmount = stageDeals.reduce((sum, d) => sum + d.amount, 0);
        const stageWeighted = stageAmount * (stage.winProbability / 100);
        return {
          ...stage,
          dealCount: stageDeals.length,
          totalAmount: stageAmount,
          weightedAmount: stageWeighted,
          deals: stageDeals,
        };
      }),
    };
  });

  // Drag-and-drop Deal Stage Transition with optimistic recalculation & audit logging
  app.post('/v1/pipelines/deals/:dealId/stage', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { dealId } = req.params as { dealId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const membership = (req as any).membership;
    const { toStage, targetStageName } = req.body as any;
    const stage = toStage || targetStageName;

    if (!stage) {
      return reply.status(400).send({ error: 'toStage or targetStageName is required' });
    }

    const deal = db.records.get(dealId);
    if (!deal || deal.workspaceId !== workspace.id || deal.deletedAt) {
      return reply.status(404).send({ error: 'Deal record not found' });
    }

    const pipeline = Array.from(db.pipelines.values()).find((p) => p.workspaceId === workspace.id);
    const targetStage = pipeline?.stages.find(
      (s) => s.name.toLowerCase() === stage.toLowerCase()
    );

    const fromStage = deal.data.stage || 'Discovery';
    const newProbability = targetStage ? targetStage.winProbability : deal.data.probability;

    // Update deal data & recompute formulas
    const updatedData = {
      ...deal.data,
      stage: targetStage ? targetStage.name : stage,
      probability: newProbability,
    };

    const finalCalculatedData = db.evaluateRecordFormulas(workspace.id, deal.objectId, updatedData);

    deal.data = finalCalculatedData;
    deal.version += 1;
    deal.updatedBy = user.id;
    deal.updatedAt = new Date().toISOString();

    const transitionId = generateUuidV7();
    const transitionRecord = {
      id: transitionId,
      workspaceId: workspace.id,
      dealId,
      fromStage,
      toStage: targetStage ? targetStage.name : stage,
      transitionedAt: deal.updatedAt,
      userId: user.id,
    };
    db.dealStageHistory.push(transitionRecord);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'deal.stage.transition',
      targetType: 'deal',
      targetId: dealId,
      payload: {
        fromStage,
        toStage: targetStage ? targetStage.name : stage,
        probability: newProbability,
        expectedValue: finalCalculatedData.expected_value,
      },
    });

    return {
      deal: {
        ...deal,
        data: maskRecordFields('deals', membership.role, deal.data),
      },
      transition: transitionRecord,
    };
  });

  // --------------------------------------------------------------------------
  // CPQ LIGHT ROUTES (Products, Quotes, Approval Gate, PDF)
  // --------------------------------------------------------------------------

  // List products
  app.get('/v1/cpq/products', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    return Array.from(db.products.values()).filter((p) => p.workspaceId === workspace.id);
  });

  // Create product
  app.post('/v1/cpq/products', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { sku, name, description, unitPrice, billingPeriod = 'one_time' } = req.body as any;

    if (!sku || !name || unitPrice === undefined) {
      return reply.status(400).send({ error: 'sku, name, and unitPrice are required' });
    }

    const prodId = generateUuidV7();
    const now = new Date().toISOString();
    const prod: Product = {
      id: prodId,
      workspaceId: workspace.id,
      sku,
      name,
      description,
      unitPrice: Number(unitPrice),
      billingPeriod,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    db.products.set(prodId, prod);
    return reply.status(201).send(prod);
  });

  // List quotes (optional filter by dealId)
  app.get('/v1/cpq/quotes', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { dealId } = req.query as { dealId?: string };

    let quotes = Array.from(db.quotes.values()).filter((q) => q.workspaceId === workspace.id);
    if (dealId) {
      quotes = quotes.filter((q) => q.dealId === dealId);
    }
    return quotes;
  });

  // Create Quote with CPQ totals calculation & discount approval workflow
  app.post('/v1/cpq/quotes', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { dealId, items = [], volumeDiscountPercent = 0, taxRatePercent = 0 } = req.body as any;

    if (!dealId || items.length === 0) {
      return reply.status(400).send({ error: 'dealId and at least one line item are required' });
    }

    const totals = calculateQuoteTotals(items, volumeDiscountPercent, taxRatePercent);
    const quoteId = generateUuidV7();
    const now = new Date().toISOString();
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(db.quotes.size + 1).padStart(3, '0')}`;

    const quote: Quote = {
      id: quoteId,
      workspaceId: workspace.id,
      dealId,
      quoteNumber,
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      volumeDiscountPercent,
      discountAmount: totals.discountAmount,
      taxRatePercent,
      taxAmount: totals.taxAmount,
      total: totals.total,
      arr: totals.arr,
      tcv: totals.tcv,
      status: totals.requiresApproval ? 'pending_approval' : 'approved',
      requiresApproval: totals.requiresApproval,
      createdAt: now,
      updatedAt: now,
    };

    db.quotes.set(quoteId, quote);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'cpq.quote.create',
      targetType: 'quote',
      targetId: quoteId,
      payload: { quoteNumber, dealId, total: totals.total, requiresApproval: totals.requiresApproval },
    });

    return reply.status(201).send(quote);
  });

  // Approve Quote Gate (Manager approval)
  app.patch('/v1/cpq/quotes/:quoteId/approve', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { quoteId } = req.params as { quoteId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;

    const quote = db.quotes.get(quoteId);
    if (!quote || quote.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Quote not found' });
    }

    quote.status = 'approved';
    quote.requiresApproval = false;
    quote.updatedAt = new Date().toISOString();

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'cpq.quote.approve',
      targetType: 'quote',
      targetId: quoteId,
      payload: { quoteNumber: quote.quoteNumber, total: quote.total },
    });

    return quote;
  });

  // PDF Quote Render Endpoint (Returns print-ready semantic document)
  app.get('/v1/cpq/quotes/:quoteId/pdf', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { quoteId } = req.params as { quoteId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    const quote = db.quotes.get(quoteId);
    if (!quote || quote.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Quote not found' });
    }

    const deal = db.records.get(quote.dealId);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Quote ${quote.quoteNumber} - ${workspace.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 24px; font-weight: bold; color: #4f46e5; }
    .meta { text-align: right; font-size: 14px; color: #64748b; }
    .table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
    .table th, .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .table th { background: #f8fafc; font-weight: 600; color: #475569; }
    .totals { margin-top: 30px; margin-left: auto; width: 300px; font-size: 14px; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #0f172a; padding-top: 8px; color: #0f172a; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${workspace.name}</div>
      <p style="margin: 4px 0; color: #64748b;">Enterprise CRM Quote & Proposal</p>
      <p style="margin: 0; font-weight: 500;">Opportunity: ${deal?.data.name || 'Sales Deal'}</p>
    </div>
    <div class="meta">
      <p style="margin: 0; font-weight: bold; font-size: 16px; color: #0f172a;">${quote.quoteNumber}</p>
      <p style="margin: 4px 0;">Date: ${new Date(quote.createdAt).toLocaleDateString()}</p>
      <p style="margin: 0; text-transform: uppercase; font-size: 12px; font-weight: bold; color: ${quote.status === 'approved' ? '#10b981' : '#f59e0b'};">Status: ${quote.status}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product Description</th>
        <th>Period</th>
        <th style="text-align: right;">Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${quote.lineItems
        .map(
          (li) => `<tr>
          <td style="font-family: monospace;">${li.sku}</td>
          <td><strong>${li.productName}</strong></td>
          <td>${li.billingPeriod}</td>
          <td style="text-align: right;">${li.quantity}</td>
          <td style="text-align: right;">$${li.unitPrice.toLocaleString()}</td>
          <td style="text-align: right; font-weight: 600;">$${li.totalPrice.toLocaleString()}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal:</span><span>$${quote.subtotal.toLocaleString()}</span></div>
    ${quote.discountAmount > 0 ? `<div style="color: #ef4444;"><span>Discount (${quote.volumeDiscountPercent}%):</span><span>-$${quote.discountAmount.toLocaleString()}</span></div>` : ''}
    <div><span>Tax (${quote.taxRatePercent}%):</span><span>$${quote.taxAmount.toLocaleString()}</span></div>
    <div class="grand-total"><span>Total (USD):</span><span>$${quote.total.toLocaleString()}</span></div>
    ${quote.arr > 0 ? `<div style="margin-top: 8px; color: #4f46e5; font-size: 12px; font-weight: 600;"><span>Annualized Recurring (ARR):</span><span>$${quote.arr.toLocaleString()}</span></div>` : ''}
  </div>
</body>
</html>`;

    reply.type('text/html');
    return html;
  });

  // --------------------------------------------------------------------------
  // ACTIVITIES & TIMELINE ROUTES (Phase 2)
  // --------------------------------------------------------------------------

  // Chronological interleaved timeline for a record
  app.get('/v1/activities/timeline/:recordId', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { recordId } = req.params as { recordId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    // 1. Stage transitions for this deal
    const stageTransitions = db.dealStageHistory
      .filter((h) => h.workspaceId === workspace.id && h.dealId === recordId)
      .map((h) => ({
        id: h.id,
        type: 'stage_transition',
        title: `Stage changed: ${h.fromStage || 'New'} → ${h.toStage}`,
        body: null,
        timestamp: h.transitionedAt,
        actor: h.userId ? 'Arthur Dent' : 'System',
        metadata: { fromStage: h.fromStage, toStage: h.toStage },
      }));

    // 2. Activities linked to this record
    const links = Array.from(db.recordLinks.values()).filter(
      (l) => (l.fromRecordId === recordId || l.toRecordId === recordId) && l.workspaceId === workspace.id
    );
    const linkedIds = new Set(links.map((l) => (l.fromRecordId === recordId ? l.toRecordId : l.fromRecordId)));

    const activitiesObj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === 'activities'
    );

    const activitiesList = activitiesObj
      ? Array.from(db.records.values())
          .filter((r) => r.workspaceId === workspace.id && r.objectId === activitiesObj.id && (linkedIds.has(r.id) || r.data.targetRecordId === recordId))
          .map((r) => ({
            id: r.id,
            type: r.data.type || 'note',
            title: r.data.subject || 'Activity note',
            body: r.data.body || null,
            timestamp: r.createdAt,
            actor: 'Arthur Dent',
            metadata: r.data,
          }))
      : [];

    // 3. Audit events for this record
    const auditEntries = db.auditEvents
      .filter((e) => e.workspaceId === workspace.id && (e.targetId === recordId || e.payload?.dealId === recordId))
      .map((e) => ({
        id: e.id,
        type: 'audit',
        title: `Audit: ${e.action}`,
        body: JSON.stringify(e.payload),
        timestamp: e.createdAt,
        actor: e.actorType === 'user' ? 'Arthur Dent' : 'System',
        metadata: { hash: e.currentHash.slice(0, 16) },
      }));

    // Interleave & sort descending by timestamp
    const allEvents = [...stageTransitions, ...activitiesList, ...auditEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
      recordId,
      events: allEvents,
      totalCount: allEvents.length,
    };
  });

  // Log activity
  app.post('/v1/activities', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { type = 'note', subject, body, targetRecordId, dueAt } = req.body as any;

    if (!subject) {
      return reply.status(400).send({ error: 'subject is required' });
    }

    const activitiesObj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspace.id && o.apiName === 'activities'
    );
    if (!activitiesObj) {
      return reply.status(404).send({ error: 'Activities object not configured' });
    }

    const actId = generateUuidV7();
    const now = new Date().toISOString();
    const actRecord: RecordEntity = {
      id: actId,
      workspaceId: workspace.id,
      objectId: activitiesObj.id,
      data: {
        type,
        subject,
        body,
        targetRecordId,
        due_at: dueAt || null,
      },
      version: 1,
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    db.records.set(actId, actRecord);

    if (targetRecordId) {
      const linkId = generateUuidV7();
      db.recordLinks.set(linkId, {
        id: linkId,
        workspaceId: workspace.id,
        relationshipId: 'act-link',
        fromRecordId: targetRecordId,
        toRecordId: actId,
      });
    }

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: `activity.${type}.create`,
      targetType: 'activity',
      targetId: actId,
      payload: { subject, targetRecordId, type },
    });

    return reply.status(201).send(actRecord);
  });

  // --------------------------------------------------------------------------
  // OMNICHANNEL COMMUNICATION & SHARED INBOX (Phase 3)
  // --------------------------------------------------------------------------

  // List threads
  app.get('/v1/inbox/threads', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { status, channel, search } = req.query as { status?: string; channel?: string; search?: string };

    let threads = Array.from(db.threads.values()).filter((t) => t.workspaceId === workspace.id);

    if (status && status !== 'all') {
      threads = threads.filter((t) => t.status === status);
    }
    if (channel && channel !== 'all') {
      threads = threads.filter((t) => t.channel === channel);
    }
    if (search) {
      const q = search.toLowerCase();
      threads = threads.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.participantSummary?.toLowerCase().includes(q) ||
          t.snippetPreview?.toLowerCase().includes(q)
      );
    }

    // Sort newest lastMessageAt first
    threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return {
      threads,
      totalCount: threads.length,
    };
  });

  // Get thread detail with messages and associations
  app.get('/v1/inbox/threads/:threadId', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { threadId } = req.params as { threadId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    const thread = db.threads.get(threadId);
    if (!thread || thread.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Thread not found' });
    }

    const messages = Array.from(db.messages.values())
      .filter((m) => m.threadId === threadId && m.workspaceId === workspace.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Mark as read
    thread.unreadCount = 0;

    // Associated entities
    const contact = thread.contactId ? db.records.get(thread.contactId) : null;
    const company = thread.companyId ? db.records.get(thread.companyId) : null;
    const deal = thread.dealId ? db.records.get(thread.dealId) : null;
    const preferences = thread.contactId ? db.communicationPreferences.get(thread.contactId) : null;

    return {
      thread,
      messages,
      contact: contact ? { id: contact.id, ...contact.data } : null,
      company: company ? { id: company.id, ...company.data } : null,
      deal: deal ? { id: deal.id, ...deal.data } : null,
      preferences: preferences || { emailOptOut: false, smsOptOut: false },
    };
  });

  // Send reply or post internal note
  app.post('/v1/inbox/threads/:threadId/messages', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { threadId } = req.params as { threadId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { bodyText: rawText, body: rawBody, bodyHtml, channel, isInternalNote = false, attachments = [] } = req.body as any;
    const bodyText = rawText || rawBody;

    if (!bodyText) {
      return reply.status(400).send({ error: 'bodyText is required' });
    }

    const thread = db.threads.get(threadId);
    if (!thread || thread.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Thread not found' });
    }

    // DNC enforcement if outbound SMS or Email
    if (!isInternalNote && thread.contactId) {
      const prefs = db.communicationPreferences.get(thread.contactId);
      if (prefs?.smsOptOut && (channel === 'sms' || thread.channel === 'sms')) {
        return reply.status(403).send({ error: 'Forbidden: Recipient has opted out of SMS messages (DNC active)' });
      }
      if (prefs?.emailOptOut && (channel === 'email' || thread.channel === 'email')) {
        return reply.status(403).send({ error: 'Forbidden: Recipient has opted out of marketing emails' });
      }
    }

    const msgId = generateUuidV7();
    const now = new Date().toISOString();

    const newMsg: Message = {
      id: msgId,
      threadId,
      workspaceId: workspace.id,
      direction: isInternalNote ? 'internal' : 'outbound',
      channel: isInternalNote ? 'internal_note' : (channel || thread.channel),
      sender: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        userId: user.id,
      },
      recipients: thread.contactId ? [{ name: thread.participantSummary }] : [],
      bodyText,
      bodyHtml,
      isInternalNote,
      attachments,
      createdAt: now,
    };

    db.messages.set(msgId, newMsg);

    // Update thread
    thread.lastMessageAt = now;
    thread.snippetPreview = isInternalNote ? `[Internal Note] ${bodyText.slice(0, 75)}` : bodyText.slice(0, 100);
    thread.updatedAt = now;

    // Log to activity timeline
    if (thread.contactId || thread.dealId) {
      const actObj = Array.from(db.objects.values()).find(
        (o) => o.workspaceId === workspace.id && o.apiName === 'activities'
      );
      if (actObj) {
        const actId = generateUuidV7();
        db.records.set(actId, {
          id: actId,
          workspaceId: workspace.id,
          objectId: actObj.id,
          data: {
            type: isInternalNote ? 'note' : (channel || thread.channel),
            subject: isInternalNote ? 'Internal Team Note' : `Outbound ${channel || thread.channel}`,
            body: bodyText,
            targetRecordId: thread.dealId || thread.contactId,
          },
          version: 1,
          createdBy: user.id,
          updatedBy: user.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Append to audit ledger
    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: isInternalNote ? 'inbox.note.create' : 'inbox.message.send',
      targetType: 'thread',
      targetId: threadId,
      payload: { messageId: msgId, isInternalNote, channel: newMsg.channel },
    });

    return reply.status(201).send(newMsg);
  });

  // Update thread status/assignment
  app.patch('/v1/inbox/threads/:threadId', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { threadId } = req.params as { threadId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { status, assignedUserId, assignedTeamId } = req.body as any;

    const thread = db.threads.get(threadId);
    if (!thread || thread.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Thread not found' });
    }

    if (status) thread.status = status;
    if (assignedUserId !== undefined) thread.assignedUserId = assignedUserId;
    if (assignedTeamId !== undefined) thread.assignedTeamId = assignedTeamId;
    thread.updatedAt = new Date().toISOString();

    return thread;
  });

  // Inbound Email Webhook
  app.post('/v1/webhooks/inbound/email', async (req: FastifyRequest, reply: FastifyReply) => {
    const {
      workspaceId = Array.from(db.workspaces.keys())[0],
      from,
      to,
      subject = 'No Subject',
      text = '',
      html,
      inReplyTo,
      references = [],
      spfDkimStatus = 'pass',
      attachments = [],
    } = req.body as any;

    if (!from) {
      return reply.status(400).send({ error: 'from email is required' });
    }

    const now = new Date().toISOString();

    // 1. Thread stitching: find existing thread or create new
    const existingThreads = Array.from(db.threads.values())
      .filter((t) => t.workspaceId === workspaceId && t.channel === 'email')
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        messageIds: Array.from(db.messages.values())
          .filter((m) => m.threadId === t.id)
          .map((m) => m.id),
      }));

    const matchedThreadId = stitchEmailThread(inReplyTo, references, subject, existingThreads);

    // 2. Associate with contact by sender email
    const peopleObj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === 'people'
    );
    let matchedContact = peopleObj
      ? Array.from(db.records.values()).find(
          (r) => r.workspaceId === workspaceId && r.objectId === peopleObj.id && r.data.email?.toLowerCase() === from.toLowerCase()
        )
      : undefined;

    let targetThreadId = matchedThreadId;
    if (!targetThreadId) {
      targetThreadId = generateUuidV7();
      const newThread: MessageThread = {
        id: targetThreadId,
        workspaceId,
        subject,
        channel: 'email',
        contactId: matchedContact ? matchedContact.id : null,
        companyId: null,
        dealId: null,
        status: 'open',
        slaDueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        lastMessageAt: now,
        unreadCount: 1,
        participantSummary: from,
        snippetPreview: text.slice(0, 100),
        createdAt: now,
        updatedAt: now,
      };
      db.threads.set(targetThreadId, newThread);
    } else {
      const t = db.threads.get(targetThreadId)!;
      t.lastMessageAt = now;
      t.unreadCount += 1;
      t.snippetPreview = text.slice(0, 100);
      t.status = 'open';
      t.updatedAt = now;
    }

    // 3. Create inbound message
    const msgId = generateUuidV7();
    const newMsg: Message = {
      id: msgId,
      threadId: targetThreadId,
      workspaceId,
      direction: 'inbound',
      channel: 'email',
      sender: { email: from },
      recipients: to ? [{ email: to }] : [],
      subject,
      bodyText: text,
      bodyHtml: html,
      spfDkimStatus,
      isInternalNote: false,
      attachments,
      inReplyTo,
      createdAt: now,
    };
    db.messages.set(msgId, newMsg);

    // 4. Check active sequence enrollments: auto-cancel on reply
    if (matchedContact) {
      const enrollments = Array.from(db.sequenceEnrollments.values()).filter(
        (e) => e.workspaceId === workspaceId && e.contactId === matchedContact!.id && e.status === 'running'
      );
      for (const enr of enrollments) {
        const seq = db.sequences.get(enr.sequenceId);
        if (seq?.exitOnReply) {
          enr.status = 'canceled_reply';
          enr.updatedAt = now;
        }
      }
    }

    return reply.status(201).send({
      success: true,
      threadId: targetThreadId,
      messageId: msgId,
    });
  });

  // Inbound SMS Webhook with DNC STOP opt-out
  app.post('/v1/webhooks/inbound/sms', async (req: FastifyRequest, reply: FastifyReply) => {
    const {
      workspaceId = Array.from(db.workspaces.keys())[0],
      from,
      to,
      body = '',
    } = req.body as any;

    if (!from || !body) {
      return reply.status(400).send({ error: 'from and body are required' });
    }

    const now = new Date().toISOString();
    const isOptOut = detectSmsOptOut(body);

    // Match contact by phone
    const peopleObj = Array.from(db.objects.values()).find(
      (o) => o.workspaceId === workspaceId && o.apiName === 'people'
    );
    const matchedContact = peopleObj
      ? Array.from(db.records.values()).find(
          (r) => r.workspaceId === workspaceId && r.objectId === peopleObj.id && (r.data.phone === from || r.data.phone?.replace(/[^0-9]/g, '') === from.replace(/[^0-9]/g, ''))
        )
      : undefined;

    // Find or create thread
    let thread = Array.from(db.threads.values()).find(
      (t) => t.workspaceId === workspaceId && t.channel === 'sms' && (t.participantSummary?.includes(from) || (matchedContact && t.contactId === matchedContact.id))
    );

    if (!thread) {
      const threadId = generateUuidV7();
      thread = {
        id: threadId,
        workspaceId,
        subject: `SMS with ${matchedContact ? `${matchedContact.data.first_name} ${matchedContact.data.last_name || ''}` : from}`,
        channel: 'sms',
        contactId: matchedContact ? matchedContact.id : null,
        companyId: null,
        dealId: null,
        status: 'open',
        lastMessageAt: now,
        unreadCount: 1,
        participantSummary: `${matchedContact ? `${matchedContact.data.first_name} ${matchedContact.data.last_name || ''} ` : ''}(${from})`,
        snippetPreview: body.slice(0, 100),
        createdAt: now,
        updatedAt: now,
      };
      db.threads.set(threadId, thread);
    } else {
      thread.lastMessageAt = now;
      thread.snippetPreview = body.slice(0, 100);
      thread.unreadCount += 1;
      thread.updatedAt = now;
    }

    // Inbound message
    const msgId = generateUuidV7();
    db.messages.set(msgId, {
      id: msgId,
      threadId: thread.id,
      workspaceId,
      direction: 'inbound',
      channel: 'sms',
      sender: { phone: from },
      recipients: to ? [{ phone: to }] : [],
      bodyText: body,
      isInternalNote: false,
      attachments: [],
      createdAt: now,
    });

    let autoReply: string | null = null;

    // Handle STOP / DNC opt-out
    if (isOptOut && matchedContact) {
      let pref = db.communicationPreferences.get(matchedContact.id);
      if (!pref) {
        pref = { contactId: matchedContact.id, workspaceId, emailOptOut: false, smsOptOut: true, updatedAt: now };
        db.communicationPreferences.set(matchedContact.id, pref);
      } else {
        pref.smsOptOut = true;
        pref.updatedAt = now;
      }

      // Auto cancel sequences
      const enrollments = Array.from(db.sequenceEnrollments.values()).filter(
        (e) => e.workspaceId === workspaceId && e.contactId === matchedContact.id && e.status === 'running'
      );
      enrollments.forEach((e) => {
        e.status = 'canceled_reply';
        e.updatedAt = now;
      });

      // Audit log
      await db.appendAuditEvent({
        workspaceId,
        actorType: 'system',
        action: 'communication.sms.opt_out',
        targetType: 'contact',
        targetId: matchedContact.id,
        payload: { phone: from, reason: body.trim() },
      });

      autoReply = 'You have successfully opted out of SMS notifications. Text START to resume.';
    }

    return reply.status(201).send({
      success: true,
      threadId: thread.id,
      isOptOut,
      autoReply,
    });
  });

  // Canned Snippets
  app.get('/v1/inbox/snippets', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    return Array.from(db.snippets.values()).filter((s) => s.workspaceId === workspace.id);
  });

  app.post('/v1/inbox/snippets', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { shortcut, title, body, category = 'General' } = req.body as any;

    if (!shortcut || !title || !body) {
      return reply.status(400).send({ error: 'shortcut, title, and body are required' });
    }

    const id = generateUuidV7();
    const snippet: CannedSnippet = {
      id,
      workspaceId: workspace.id,
      shortcut: shortcut.startsWith('!') ? shortcut : `!${shortcut}`,
      title,
      body,
      category,
    };
    db.snippets.set(id, snippet);
    return reply.status(201).send(snippet);
  });

  // Sequences
  app.get('/v1/sequences', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const seqs = Array.from(db.sequences.values()).filter((s) => s.workspaceId === workspace.id);
    return seqs.map((s) => {
      const enrollments = Array.from(db.sequenceEnrollments.values()).filter((e) => e.sequenceId === s.id);
      return {
        ...s,
        enrollmentCount: enrollments.length,
        activeCount: enrollments.filter((e) => e.status === 'running').length,
        completedCount: enrollments.filter((e) => e.status === 'completed').length,
      };
    });
  });

  app.post('/v1/sequences', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { name, description, steps = [], exitOnReply = true, dailyDomainLimit = 50 } = req.body as any;

    if (!name) {
      return reply.status(400).send({ error: 'name is required' });
    }

    const id = generateUuidV7();
    const now = new Date().toISOString();
    const seq: Sequence = {
      id,
      workspaceId: workspace.id,
      name,
      description,
      steps,
      exitOnReply,
      exitOnMeetingBooked: true,
      exitOnDealWon: true,
      dailyDomainLimit,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    db.sequences.set(id, seq);
    return reply.status(201).send(seq);
  });

  // Enroll contact into sequence
  app.post('/v1/sequences/:id/enroll', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { contactId, contactEmail } = req.body as any;

    const seq = db.sequences.get(id);
    if (!seq || seq.workspaceId !== workspace.id) {
      return reply.status(404).send({ error: 'Sequence not found' });
    }

    const enrId = generateUuidV7();
    const now = new Date().toISOString();
    const enr: SequenceEnrollment = {
      id: enrId,
      workspaceId: workspace.id,
      sequenceId: id,
      contactId,
      contactEmail: contactEmail || 'contact@example.com',
      currentStepIndex: 0,
      nextStepDueAt: now,
      status: 'running',
      enrolledAt: now,
      updatedAt: now,
    };
    db.sequenceEnrollments.set(enrId, enr);
    return reply.status(201).send(enr);
  });

  // Telephony Calls
  app.post('/v1/telephony/calls', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { contactId, phoneNumber: rawPhone, toNumber, dealId } = req.body as any;
    const phoneNumber = rawPhone || toNumber;

    if (!phoneNumber) {
      return reply.status(400).send({ error: 'phoneNumber is required' });
    }

    const callId = generateUuidV7();
    return reply.status(201).send({
      callId,
      workspaceId: workspace.id,
      userId: user.id,
      contactId,
      dealId,
      phoneNumber,
      status: 'connected',
      token: 'webrtc-mock-session-token',
      startedAt: new Date().toISOString(),
    });
  });

  app.post('/v1/telephony/calls/:callId/end', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { callId } = req.params as { callId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { durationSeconds = 60, outcome = 'connected', notes, contactId, dealId, phoneNumber = '+1-555-0100' } = req.body as any;

    const now = new Date().toISOString();
    const callRecord: TelephonyCall = {
      id: callId,
      workspaceId: workspace.id,
      userId: user.id,
      contactId,
      dealId,
      phoneNumber,
      direction: 'outbound',
      durationSeconds,
      outcome,
      notes,
      createdAt: now,
    };
    db.telephonyCalls.set(callId, callRecord);

    // Auto-log to universal activity timeline
    const targetRecordId = dealId || contactId;
    if (targetRecordId) {
      const actObj = Array.from(db.objects.values()).find(
        (o) => o.workspaceId === workspace.id && o.apiName === 'activities'
      );
      if (actObj) {
        const actId = generateUuidV7();
        db.records.set(actId, {
          id: actId,
          workspaceId: workspace.id,
          objectId: actObj.id,
          data: {
            type: 'call',
            subject: `Outbound Call (${outcome}): ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
            body: notes || `Call outcome: ${outcome}`,
            targetRecordId,
          },
          version: 1,
          createdBy: user.id,
          updatedBy: user.id,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return callRecord;
  });

  // Communication Preferences (DNC)
  app.get('/v1/communication/preferences/:contactId', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { contactId } = req.params as { contactId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const pref = db.communicationPreferences.get(contactId);
    return pref || { contactId, workspaceId: workspace.id, emailOptOut: false, smsOptOut: false, updatedAt: new Date().toISOString() };
  });

  app.patch('/v1/communication/preferences/:contactId', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const { contactId } = req.params as { contactId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { emailOptOut, smsOptOut } = req.body as any;

    let pref = db.communicationPreferences.get(contactId);
    const now = new Date().toISOString();
    if (!pref) {
      pref = { contactId, workspaceId: workspace.id, emailOptOut: !!emailOptOut, smsOptOut: !!smsOptOut, updatedAt: now };
    } else {
      if (emailOptOut !== undefined) pref.emailOptOut = !!emailOptOut;
      if (smsOptOut !== undefined) pref.smsOptOut = !!smsOptOut;
      pref.updatedAt = now;
    }
    db.communicationPreferences.set(contactId, pref);
    return pref;
  });

  // --------------------------------------------------------------------------
  // PHASE 4: DEDUPLICATION & IDENTITY RESOLUTION ROUTES
  // --------------------------------------------------------------------------

  // List duplicate pairs with filtering & enriched record data
  app.get('/v1/duplicates', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { entityName, confidenceTier, status } = req.query as {
      entityName?: string;
      confidenceTier?: string;
      status?: string;
    };

    let pairs = Array.from(db.duplicatePairs.values()).filter(
      (p) => p.workspaceId === workspace.id
    );

    if (entityName) {
      pairs = pairs.filter((p) => p.entityName === entityName);
    }
    if (confidenceTier) {
      pairs = pairs.filter((p) => p.confidenceTier === confidenceTier);
    }
    if (status) {
      pairs = pairs.filter((p) => p.status === status);
    } else {
      // Default to PENDING if not specified
      pairs = pairs.filter((p) => p.status === 'PENDING');
    }

    // Enrich with current record data
    const enriched = pairs.map((pair) => {
      const primaryRecord = db.records.get(pair.primaryRecordId);
      const duplicateRecord = db.records.get(pair.duplicateRecordId);
      return {
        ...pair,
        primaryRecord,
        duplicateRecord,
      };
    });

    return {
      pairs: enriched,
      totalCount: enriched.length,
    };
  });

  // Get single duplicate pair detail with score breakdown
  app.get('/v1/duplicates/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    const pair = db.duplicatePairs.get(id);
    if (!pair || pair.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Duplicate pair not found' });
    }

    const primaryRecord = db.records.get(pair.primaryRecordId);
    const duplicateRecord = db.records.get(pair.duplicateRecordId);

    return {
      pair,
      primaryRecord,
      duplicateRecord,
    };
  });

  // Pre-creation duplicate check (<25ms)
  app.post('/v1/duplicates/check', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { entityName, data } = req.body as { entityName: string; data: Record<string, any> };

    if (!entityName || !data) {
      return { isDuplicate: false, matches: [] };
    }

    return db.checkDuplicatePreCreation(workspace.id, entityName, data);
  });

  // Trigger manual workspace duplicate scan
  app.post('/v1/duplicates/scan', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const detected = db.scanDuplicatesForWorkspace(workspace.id);
    return {
      scanned: true,
      detectedCount: detected.length,
    };
  });

  // Merge records
  app.post('/v1/duplicates/:id/merge', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { winnerId, loserId, mergedData } = req.body as {
      winnerId: string;
      loserId: string;
      mergedData: Record<string, any>;
    };

    if (!winnerId || !loserId) {
      return reply.code(400).send({ error: 'winnerId and loserId are required for merge' });
    }

    try {
      const history = await db.mergeRecords(
        workspace.id,
        id === 'custom' ? null : id,
        winnerId,
        loserId,
        mergedData || {},
        user.id
      );
      return { ok: true, mergeHistory: history };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Dismiss duplicate pair ("Not a duplicate")
  app.post('/v1/duplicates/:id/dismiss', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;

    const pair = db.duplicatePairs.get(id);
    if (!pair || pair.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Duplicate pair not found' });
    }

    const pairKey = [pair.primaryRecordId, pair.duplicateRecordId].sort().join(':');
    db.dismissedPairs.add(pairKey);

    pair.status = 'DISMISSED';
    pair.resolvedAt = new Date().toISOString();
    pair.resolvedBy = user.id;

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'identity.pair.dismissed',
      targetType: pair.entityName,
      targetId: pair.id,
      payload: {
        pairId: pair.id,
        primaryRecordId: pair.primaryRecordId,
        duplicateRecordId: pair.duplicateRecordId,
      },
    });

    return { ok: true, pair };
  });

  // List merge histories
  app.get('/v1/duplicates/merges', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { entityName } = req.query as { entityName?: string };

    let merges = Array.from(db.mergeHistories.values()).filter(
      (m) => m.workspaceId === workspace.id
    );

    if (entityName) {
      merges = merges.filter((m) => m.entityName === entityName);
    }

    merges.sort((a, b) => new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime());

    // Enrich with record details
    const enriched = merges.map((m) => {
      const winner = db.records.get(m.winnerRecordId);
      const loser = db.records.get(m.loserRecordId);
      return {
        ...m,
        winnerRecord: winner || m.snapshotWinnerBefore,
        loserRecord: loser || m.snapshotLoserBefore,
      };
    });

    return { merges: enriched };
  });

  // 1-Click Reversible Unmerge
  app.post('/v1/duplicates/merges/:mergeId/unmerge', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { mergeId } = req.params as { mergeId: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;

    try {
      const unmerged = await db.unmergeRecords(workspace.id, mergeId, user.id);
      return { ok: true, mergeHistory: unmerged };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // WORKFLOW AUTOMATION & WEBHOOKS (PHASE 5)
  // --------------------------------------------------------------------------

  // Get workflow KPI metrics
  app.get('/v1/workflows/metrics', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const wsWorkflows = Array.from(db.workflows.values()).filter(w => w.workspaceId === workspace.id);
    const wsRuns = Array.from(db.workflowRuns.values()).filter(r => r.workspaceId === workspace.id);
    const wsHooks = Array.from(db.outboundWebhooks.values()).filter(h => h.workspaceId === workspace.id);
    const totalExecutions = wsRuns.length;
    const completedExecutions = wsRuns.filter(r => r.status === 'completed').length;
    const successRate = totalExecutions > 0 ? Math.round((completedExecutions / totalExecutions) * 100) : 100;

    return {
      totalWorkflows: wsWorkflows.length,
      activeWorkflows: wsWorkflows.filter(w => w.isActive).length,
      executionsCount: totalExecutions,
      successRate,
      outboundWebhooksCount: wsHooks.filter(h => h.isActive).length,
    };
  });

  // List all workflows
  app.get('/v1/workflows', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const workflows = Array.from(db.workflows.values())
      .filter((w) => w.workspaceId === workspace.id)
      .map((w) => {
        const runs = Array.from(db.workflowRuns.values()).filter(r => r.workflowId === w.id);
        const lastRun = runs[runs.length - 1];
        return {
          ...w,
          runsCount: runs.length,
          lastExecutedAt: lastRun ? lastRun.executedAt : null,
          lastStatus: lastRun ? lastRun.status : null,
        };
      });

    return { workflows };
  });

  // Create workflow
  app.post('/v1/workflows', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { name, description, triggerType, triggerConfig, rootNodeId, nodes, isActive } = req.body as any;

    if (!name || !triggerType || !rootNodeId || !Array.isArray(nodes)) {
      return reply.code(400).send({ error: 'Missing required workflow fields (name, triggerType, rootNodeId, nodes)' });
    }

    const validation = validateWorkflowDAG(nodes, rootNodeId);
    if (!validation.isValid) {
      return reply.code(400).send({ error: 'Workflow validation failed', details: validation.errors });
    }

    const id = generateUuidV7();
    const now = new Date().toISOString();
    const workflow: WorkflowRecord = {
      id,
      workspaceId: workspace.id,
      name,
      description: description || '',
      isActive: isActive !== false,
      triggerType,
      triggerConfig: triggerConfig || {},
      rootNodeId,
      nodes,
      createdAt: now,
      updatedAt: now,
    };

    db.workflows.set(id, workflow);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'workflow.created',
      targetType: 'workflow',
      targetId: id,
      payload: { name, triggerType, nodesCount: nodes.length },
    });

    return reply.code(201).send({ workflow });
  });

  // Get single workflow
  app.get('/v1/workflows/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const workflow = db.workflows.get(id);

    if (!workflow || workflow.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }

    const runs = Array.from(db.workflowRuns.values())
      .filter((r) => r.workflowId === id)
      .reverse();

    return { workflow, runs };
  });

  // Update workflow
  app.put('/v1/workflows/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const workflow = db.workflows.get(id);

    if (!workflow || workflow.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }

    const body = req.body as any;
    if (body.nodes && body.rootNodeId) {
      const validation = validateWorkflowDAG(body.nodes, body.rootNodeId);
      if (!validation.isValid) {
        return reply.code(400).send({ error: 'Workflow validation failed', details: validation.errors });
      }
      workflow.nodes = body.nodes;
      workflow.rootNodeId = body.rootNodeId;
    }

    if (body.name !== undefined) workflow.name = body.name;
    if (body.description !== undefined) workflow.description = body.description;
    if (body.isActive !== undefined) workflow.isActive = Boolean(body.isActive);
    if (body.triggerType !== undefined) workflow.triggerType = body.triggerType;
    if (body.triggerConfig !== undefined) workflow.triggerConfig = body.triggerConfig;
    workflow.updatedAt = new Date().toISOString();

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'workflow.updated',
      targetType: 'workflow',
      targetId: id,
      payload: { name: workflow.name, isActive: workflow.isActive },
    });

    return { workflow };
  });

  // Delete workflow
  app.delete('/v1/workflows/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const workflow = db.workflows.get(id);

    if (!workflow || workflow.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }

    db.workflows.delete(id);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'workflow.deleted',
      targetType: 'workflow',
      targetId: id,
      payload: { name: workflow.name },
    });

    return { ok: true };
  });

  // Trigger manual test run of workflow
  app.post('/v1/workflows/:id/trigger', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const workflow = db.workflows.get(id);

    if (!workflow || workflow.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }

    const { triggerEvent, triggerRecord } = (req.body as any) || {};

    try {
      const run = await db.executeWorkflow(
        workspace.id,
        id,
        triggerEvent || `${workflow.triggerType}:${workflow.triggerConfig.objectApiName || 'manual'}`,
        triggerRecord,
        user.id
      );

      return { ok: true, run };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Get workflow run history
  app.get('/v1/workflows/:id/runs', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const workflow = db.workflows.get(id);

    if (!workflow || workflow.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Workflow not found' });
    }

    const runs = Array.from(db.workflowRuns.values())
      .filter((r) => r.workspaceId === workspace.id && r.workflowId === id)
      .reverse();

    return { runs };
  });

  // --------------------------------------------------------------------------
  // OUTBOUND & INBOUND WEBHOOKS
  // --------------------------------------------------------------------------

  // List outbound webhook subscriptions
  app.get('/v1/webhooks/outbound', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const subscriptions = Array.from(db.outboundWebhooks.values()).filter(
      (s) => s.workspaceId === workspace.id
    );

    return { subscriptions };
  });

  // Create outbound webhook subscription
  app.post('/v1/webhooks/outbound', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const { targetUrl, secret, subscribedEvents, description, isActive } = req.body as any;

    if (!targetUrl) {
      return reply.code(400).send({ error: 'targetUrl is required' });
    }

    try {
      await validateSafeOutboundUrl(targetUrl);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message, isSsrfBlocked: true });
    }

    const id = generateUuidV7();
    const now = new Date().toISOString();
    const subscription: OutboundWebhookSubscription = {
      id,
      workspaceId: workspace.id,
      targetUrl,
      secret: secret || `whsec_${generateUuidV7().replace(/-/g, '')}`,
      subscribedEvents: Array.isArray(subscribedEvents) && subscribedEvents.length > 0 ? subscribedEvents : ['*'],
      description: description || '',
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now,
    };

    db.outboundWebhooks.set(id, subscription);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'webhook.subscription.created',
      targetType: 'webhook_subscription',
      targetId: id,
      payload: { targetUrl, subscribedEvents: subscription.subscribedEvents },
    });

    return reply.code(201).send({ subscription });
  });

  // Update outbound webhook subscription
  app.put('/v1/webhooks/outbound/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const subscription = db.outboundWebhooks.get(id);

    if (!subscription || subscription.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Webhook subscription not found' });
    }

    const body = req.body as any;
    if (body.targetUrl !== undefined) {
      try {
        await validateSafeOutboundUrl(body.targetUrl);
      } catch (err: any) {
        return reply.code(400).send({ error: err.message, isSsrfBlocked: true });
      }
      subscription.targetUrl = body.targetUrl;
    }
    if (body.secret !== undefined) subscription.secret = body.secret;
    if (body.subscribedEvents !== undefined) subscription.subscribedEvents = body.subscribedEvents;
    if (body.description !== undefined) subscription.description = body.description;
    if (body.isActive !== undefined) subscription.isActive = Boolean(body.isActive);
    subscription.updatedAt = new Date().toISOString();

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'webhook.subscription.updated',
      targetType: 'webhook_subscription',
      targetId: id,
      payload: { targetUrl: subscription.targetUrl, isActive: subscription.isActive },
    });

    return { subscription };
  });

  // Delete outbound webhook subscription
  app.delete('/v1/webhooks/outbound/:id', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;
    const subscription = db.outboundWebhooks.get(id);

    if (!subscription || subscription.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'Webhook subscription not found' });
    }

    db.outboundWebhooks.delete(id);

    await db.appendAuditEvent({
      workspaceId: workspace.id,
      actorType: 'user',
      actorId: user.id,
      action: 'webhook.subscription.deleted',
      targetType: 'webhook_subscription',
      targetId: id,
      payload: { targetUrl: subscription.targetUrl },
    });

    return { ok: true };
  });

  // Send test ping to outbound webhook
  app.post('/v1/webhooks/outbound/:id/ping', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    try {
      const delivery = await db.pingOutboundWebhook(workspace.id, id);
      return { ok: true, delivery };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Get delivery logs for a specific subscription
  app.get('/v1/webhooks/outbound/:id/deliveries', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const workspace = (req as any).workspace as WorkspaceRecord;

    const deliveries = Array.from(db.webhookDeliveries.values())
      .filter((d) => d.workspaceId === workspace.id && d.subscriptionId === id)
      .reverse();

    return { deliveries };
  });

  // List all recent webhook delivery logs
  app.get('/v1/webhooks/deliveries', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const deliveries = Array.from(db.webhookDeliveries.values())
      .filter((d) => d.workspaceId === workspace.id)
      .reverse()
      .slice(0, 50);

    return { deliveries };
  });

  // SSRF Verification Endpoint for test suites and security validation
  app.post('/v1/webhooks/validate-url', async (req: FastifyRequest, reply: FastifyReply) => {
    const { url } = req.body as { url: string };
    if (!url) return reply.code(400).send({ error: 'url is required' });
    try {
      const result = await validateSafeOutboundUrl(url);
      return { safe: true, resolvedIp: result.resolvedIp };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message, isSsrfBlocked: true });
    }
  });

  // Chaos Webhook Dispatch: trigger events with backoff, jitter, and automatic DLQ routing
  app.post('/v1/webhooks/chaos/dispatch', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { event, payload, chaosFail, chaosStatusCode, chaosError, chaosTimeout, maxAttempts } = req.body as any;

    const outbox = db.emitOutboxEvent(workspace.id, event || 'deal.won', payload || { dealId: 'deal-test-chaos', amount: 150000 });
    const result = await db.dispatchOutboundWebhooks(workspace.id, event || 'deal.won', payload || { dealId: 'deal-test-chaos' }, {
      chaosFail: Boolean(chaosFail),
      chaosStatusCode,
      chaosError,
      chaosTimeout,
      maxAttempts: maxAttempts || 3,
      outboxEventId: outbox.id,
    });

    return {
      outboxEvent: db.outboxEvents.get(outbox.id),
      deliveriesCount: result.deliveries.length,
      dlqItemsCount: result.dlqItems.length,
      dlqItems: result.dlqItems,
    };
  });

  // List Dead-Letter Queue (DLQ) Items
  app.get('/v1/webhooks/dlq', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const items = Array.from(db.deadLetterQueue.values())
      .filter((item) => item.workspaceId === workspace.id)
      .reverse();

    return { items, totalPending: items.filter((i) => i.status === 'PENDING').length };
  });

  // Replay single Dead-Letter Queue Item
  app.post('/v1/webhooks/dlq/:id/replay', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    try {
      const result = await db.replayDeadLetterQueueItem(id);
      return { ok: true, item: result.item, delivery: result.delivery };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Replay All Dead-Letter Queue Items
  app.post('/v1/webhooks/dlq/replay-all', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    try {
      const result = await db.replayAllDeadLetterQueue(workspace.id);
      return { ok: true, replayedCount: result.replayedCount, replayedIds: result.replayedIds };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Automatic Activity Capture (AAC): Connect Provider
  app.post('/v1/integrations/aac/connect', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const body = req.body as any;
    if (!body.provider || !body.email) {
      return reply.code(400).send({ error: 'provider (google | microsoft) and email are required' });
    }

    const connection = await db.connectAAC(workspace.id, body);
    return reply.code(201).send({ connection });
  });

  // Automatic Activity Capture (AAC): Sync Mailbox
  app.post('/v1/integrations/aac/sync', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { connectionId, testEmails } = req.body as any;

    let connId = connectionId;
    if (!connId) {
      const existing = Array.from(db.aacConnections.values()).find((c) => c.workspaceId === workspace.id && c.status === 'CONNECTED');
      if (!existing) {
        return reply.code(400).send({ error: 'No active AAC connection found. Connect Google or Microsoft first.' });
      }
      connId = existing.id;
    }

    try {
      const result = await db.syncAACMailbox(workspace.id, connId, Array.isArray(testEmails) ? testEmails : []);
      const conn = db.aacConnections.get(connId);
      return { ok: true, connection: conn, ...result };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Automatic Activity Capture (AAC): Status
  app.get('/v1/integrations/aac/status', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const connections = Array.from(db.aacConnections.values()).filter((c) => c.workspaceId === workspace.id);
    return { connections, activeConnection: connections.find((c) => c.status === 'CONNECTED') || null };
  });

  // Automatic Activity Capture (AAC): Disconnect
  app.post('/v1/integrations/aac/disconnect', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const { connectionId } = req.body as any;

    const connection = db.aacConnections.get(connectionId);
    if (!connection || connection.workspaceId !== workspace.id) {
      return reply.code(404).send({ error: 'AAC connection not found' });
    }

    connection.status = 'DISCONNECTED';
    return { ok: true, connection };
  });

  // Inbound Webhook Trigger with HMAC-SHA256 timing-safe verification
  app.post('/v1/webhooks/inbound/:hookId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { hookId } = req.params as { hookId: string };
    const receivedSignature =
      (req.headers['x-nexus-signature'] as string) ||
      (req.headers['x-hub-signature-256'] as string) ||
      (req.headers['x-signature-256'] as string);

    // Look for matching workflow or configured inbound hook
    const workflow = Array.from(db.workflows.values()).find(
      (w) => w.id === hookId || w.triggerConfig?.webhookPath === hookId
    );

    const secret = workflow?.triggerConfig?.secret || 'inbound-demo-secret';

    if (receivedSignature) {
      const isValid = verifyWebhookSignature(secret, req.body as any, receivedSignature);
      if (!isValid) {
        return reply.code(401).send({ error: 'HMAC signature verification failed' });
      }
    }

    // Execute matching workflow if found
    let runResult: WorkflowRunRecord | null = null;
    if (workflow) {
      runResult = await db.executeWorkflow(
        workflow.workspaceId,
        workflow.id,
        'webhook.inbound',
        (req.body as any) || {}
      );
    }

    return {
      success: true,
      verified: Boolean(receivedSignature),
      hookId,
      run: runResult,
      receivedAt: new Date().toISOString(),
    };
  });

  // --------------------------------------------------------------------------
  // PLATFORM SOVEREIGNTY, BYOK KMS & DATA PORTABILITY (PHASE 6)
  // --------------------------------------------------------------------------

  // List tenant KMS master keys
  app.get('/v1/platform/kms/keys', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const activeKey = db.getActiveKmsKey(workspace.id);
    const keys = Array.from(db.kmsKeys.values())
      .filter((k) => k.workspaceId === workspace.id)
      .map(({ keyHex, ...rest }) => rest);

    return {
      activeVersion: activeKey.version,
      algorithm: activeKey.algorithm,
      keys,
    };
  });

  // Zero-downtime Master Key Rotation (BYOK / CMEK key rotation)
  app.post('/v1/platform/kms/rotate', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    const user = (req as any).user as UserRecord;

    try {
      const result = await db.rotateTenantMasterKey(workspace.id, user.id);
      return {
        ok: true,
        rotation: {
          previousVersion: result.previousVersion,
          newVersion: result.newVersion,
          envelopesReWrapped: result.envelopesReWrapped,
          durationMs: result.durationMs,
          newKeyId: result.newKeyRecord.id,
          algorithm: result.newKeyRecord.algorithm,
          createdAt: result.newKeyRecord.createdAt,
        },
      };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // 1-Click Complete Tenant Archive Export (with SHA-256 integrity manifest)
  app.get('/v1/platform/export', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const workspace = (req as any).workspace as WorkspaceRecord;

    const archive = await db.exportTenantArchive(workspace.id);
    reply.header('content-type', 'application/json');
    reply.header('content-disposition', `attachment; filename="nexus-export-${workspace.slug || workspace.id}.json"`);
    return archive;
  });

  // Complete Tenant Archive Import & Integrity Verification
  app.post('/v1/platform/import', { preHandler: [authenticate] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as any).user as UserRecord;
    const archive = req.body as TenantExportArchive;

    if (!archive?.manifest || !archive?.schemas || !archive?.data) {
      return reply.code(400).send({ error: 'Invalid tenant archive format' });
    }

    try {
      const result = await db.importTenantArchive(archive, user.id);
      return { ok: true, restored: result.restoredCounts, ...result };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // AUDIT LOG ROUTES
  // --------------------------------------------------------------------------

  app.get('/v1/audit/events', { preHandler: [authenticate] }, async (req: FastifyRequest) => {
    const workspace = (req as any).workspace as WorkspaceRecord;
    return db.auditEvents
      .filter((e) => e.workspaceId === workspace.id)
      .slice(-100)
      .reverse();
  });

  app.get('/v1/audit/verify', { preHandler: [authenticate] }, async () => {
    const valid = db.verifyAuditChainIntegrity();
    return { valid, checkedEventsCount: db.auditEvents.length };
  });

  // Test reset helper for reproducible E2E runs
  app.post('/v1/test/reset-demo', async () => {
    await db.seedDemoData(true);
    return { ok: true };
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const port = parseInt(process.env.PORT || '4000', 10);
  createServer({ port, logger: true }).then((server) => {
    server.listen({ port, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Nexus CRM API running at ${address}`);
      console.log(`OpenAPI documentation at ${address}/docs`);
    });
  });
}
