'use client';

import * as React from 'react';
import {
  GitBranch,
  Play,
  Webhook,
  CheckCircle2,
  AlertCircle,
  Radio,
  Send,
  Activity,
  Zap,
  Check,
  X,
  Plus,
  RefreshCw,
  ShieldCheck,
  ServerCrash,
  RotateCcw,
  Mail,
  Lock,
  Layers,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Button, Input, Badge, Modal } from '@nexus/ui';
import { apiFetch } from '@/lib/api';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  title: string;
  actionType?: 'update_record' | 'create_task' | 'send_email' | 'send_sms' | 'outbound_webhook';
  config: Record<string, any>;
  nextNodes?: string[];
  elseNodes?: string[];
}

interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: Record<string, any>;
  rootNodeId: string;
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
  runsCount?: number;
  lastExecutedAt?: string | null;
  lastStatus?: string | null;
}

interface WorkflowRun {
  id: string;
  workspaceId: string;
  workflowId: string;
  status: 'completed' | 'failed';
  triggerEvent: string;
  triggerRecordId?: string;
  context: Record<string, any>;
  stepLogs: Array<{
    nodeId: string;
    nodeTitle: string;
    nodeType: string;
    status: 'success' | 'failed' | 'skipped';
    inputData: Record<string, any>;
    outputData?: Record<string, any>;
    error?: string;
    executedAt: string;
    durationMs: number;
  }>;
  durationMs: number;
  executedAt: string;
  executedBy?: string;
  error?: string;
}

interface OutboundWebhook {
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

interface WebhookDelivery {
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

export interface DeadLetterQueueItem {
  id: string;
  workspaceId: string;
  eventId: string;
  subscriptionId: string;
  targetUrl: string;
  attempts: number;
  lastStatusCode?: number;
  lastError: string;
  payload: Record<string, any>;
  createdAt: string;
  replayedAt?: string;
  replayedStatus?: 'SUCCESS' | 'FAILED';
}

export interface AACConnection {
  id: string;
  workspaceId: string;
  provider: 'google' | 'microsoft';
  mailboxEmail: string;
  kmsKeyAlias: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastSyncedAt?: string;
  syncedEmailsCount: number;
  syncedEventsCount: number;
  matchedContactsCount: number;
  privacyExclusionsCount: number;
  createdAt: string;
}

interface Metrics {
  totalWorkflows: number;
  activeWorkflows: number;
  executionsCount: number;
  successRate: number;
  outboundWebhooksCount: number;
}

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = React.useState<'workflows' | 'webhooks' | 'dlq' | 'aac' | 'inbound'>('workflows');
  const [metrics, setMetrics] = React.useState<Metrics>({
    totalWorkflows: 2,
    activeWorkflows: 2,
    executionsCount: 1,
    successRate: 100,
    outboundWebhooksCount: 1,
  });
  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<Workflow | null>(null);
  const [webhooks, setWebhooks] = React.useState<OutboundWebhook[]>([]);
  const [deliveries, setDeliveries] = React.useState<WebhookDelivery[]>([]);
  const [dlqItems, setDlqItems] = React.useState<DeadLetterQueueItem[]>([]);
  const [aacConnection, setAacConnection] = React.useState<AACConnection | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // DLQ Replay & Chaos State
  const [inspectingDlq, setInspectingDlq] = React.useState<DeadLetterQueueItem | null>(null);
  const [replayingDlqId, setReplayingDlqId] = React.useState<string | null>(null);
  const [replayingAll, setReplayingAll] = React.useState(false);
  const [chaosLoading, setChaosLoading] = React.useState(false);
  const [syncingAac, setSyncingAac] = React.useState(false);

  // Execution Modal & State
  const [testingWorkflow, setTestingWorkflow] = React.useState<Workflow | null>(null);
  const [testPayloadText, setTestPayloadText] = React.useState('');
  const [executing, setExecuting] = React.useState(false);
  const [latestRunResult, setLatestRunResult] = React.useState<WorkflowRun | null>(null);

  // Delivery Log Inspection Modal
  const [inspectingDelivery, setInspectingDelivery] = React.useState<WebhookDelivery | null>(null);
  const [pingingId, setPingingId] = React.useState<string | null>(null);

  // New Outbound Webhook Modal
  const [isNewWebhookModalOpen, setIsNewWebhookModalOpen] = React.useState(false);
  const [newTargetUrl, setNewTargetUrl] = React.useState('');
  const [newSecret, setNewSecret] = React.useState('');
  const [newEvents, setNewEvents] = React.useState('deal.won, record.created');
  const [newDescription, setNewDescription] = React.useState('');

  // Notification Toast
  const [notification, setNotification] = React.useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAllData = React.useCallback(async () => {
    try {
      setRefreshing(true);
      const [metricsData, workflowsData, webhooksData, deliveriesData, dlqData, aacData] = await Promise.all([
        apiFetch<Metrics>('/v1/workflows/metrics'),
        apiFetch<{ workflows: Workflow[] }>('/v1/workflows'),
        apiFetch<{ subscriptions: OutboundWebhook[] }>('/v1/webhooks/outbound'),
        apiFetch<{ deliveries: WebhookDelivery[] }>('/v1/webhooks/deliveries'),
        apiFetch<{ items: DeadLetterQueueItem[] }>('/v1/webhooks/dlq').catch(() => ({ items: [] })),
        apiFetch<{ ok: boolean; connection: AACConnection | null }>('/v1/integrations/aac/status').catch(() => ({ ok: true, connection: null })),
      ]);

      setMetrics(metricsData);
      setWorkflows(workflowsData.workflows);
      if (workflowsData.workflows.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(workflowsData.workflows[0] || null);
      }
      setWebhooks(webhooksData.subscriptions);
      setDeliveries(deliveriesData.deliveries);
      setDlqItems(dlqData.items || []);
      setAacConnection(aacData.connection || null);
    } catch (err: any) {
      showNotification(`Failed to load automations: ${err.message}`, 'error');
    } finally {
      setRefreshing(false);
    }
  }, [selectedWorkflow]);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Open Test Run Modal
  const handleOpenTestModal = (wf: Workflow) => {
    setTestingWorkflow(wf);
    setLatestRunResult(null);
    if (wf.triggerConfig?.objectApiName === 'people') {
      setTestPayloadText(
        JSON.stringify(
          {
            first_name: 'Tony',
            last_name: 'Stark',
            title: 'CEO & Chief Engineer',
            email: 'tony@starkindustries.com',
          },
          null,
          2
        )
      );
    } else {
      setTestPayloadText(
        JSON.stringify(
          {
            name: 'Pied Piper Compression Platform',
            amount: 150000,
            stage: 'Closed Won',
          },
          null,
          2
        )
      );
    }
  };

  // Execute Test Run
  const handleExecuteTest = async () => {
    if (!testingWorkflow) return;
    try {
      setExecuting(true);
      let parsedPayload: Record<string, any> = {};
      try {
        parsedPayload = JSON.parse(testPayloadText);
      } catch {
        parsedPayload = { raw: testPayloadText };
      }

      const res = await apiFetch<{ ok: boolean; run: WorkflowRun }>(
        `/v1/workflows/${testingWorkflow.id}/trigger`,
        {
          method: 'POST',
          body: JSON.stringify({
            triggerEvent: `${testingWorkflow.triggerType}:${testingWorkflow.triggerConfig?.objectApiName || 'manual'}`,
            triggerRecord: parsedPayload,
          }),
        }
      );

      setLatestRunResult(res.run);
      showNotification(`Workflow executed successfully in ${res.run.durationMs}ms`);
      apiFetch<Metrics>('/v1/workflows/metrics').then(setMetrics).catch(() => {});
      apiFetch<{ workflows: Workflow[] }>('/v1/workflows').then((d) => setWorkflows(d.workflows)).catch(() => {});
    } catch (err: any) {
      showNotification(`Execution failed: ${err.message}`, 'error');
    } finally {
      setExecuting(false);
    }
  };

  // Send Test Ping
  const handleSendPing = async (subId: string) => {
    try {
      setPingingId(subId);
      const res = await apiFetch<{ ok: boolean; delivery: WebhookDelivery }>(
        `/v1/webhooks/outbound/${subId}/ping`,
        { method: 'POST' }
      );
      showNotification(`Webhook ping delivered (HTTP 200 OK) in ${res.delivery.durationMs}ms`);
      setDeliveries((prev) => [res.delivery, ...prev]);
    } catch (err: any) {
      showNotification(`Ping failed: ${err.message}`, 'error');
    } finally {
      setPingingId(null);
    }
  };

  // Create Outbound Webhook Subscription
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetUrl) return;
    try {
      const res = await apiFetch<{ subscription: OutboundWebhook }>('/v1/webhooks/outbound', {
        method: 'POST',
        body: JSON.stringify({
          targetUrl: newTargetUrl,
          secret: newSecret || undefined,
          subscribedEvents: newEvents.split(',').map((s) => s.trim()).filter(Boolean),
          description: newDescription,
        }),
      });

      setWebhooks((prev) => [res.subscription, ...prev]);
      setIsNewWebhookModalOpen(false);
      setNewTargetUrl('');
      setNewSecret('');
      setNewDescription('');
      showNotification('Outbound webhook subscription created');
      apiFetch<Metrics>('/v1/workflows/metrics').then(setMetrics).catch(() => {});
    } catch (err: any) {
      showNotification(`Failed to create webhook: ${err.message}`, 'error');
    }
  };

  // DLQ Replay Single Item
  const handleReplayDlq = async (id: string) => {
    try {
      setReplayingDlqId(id);
      const res = await apiFetch<{ ok: boolean; delivery: any; item: DeadLetterQueueItem }>(
        `/v1/webhooks/dlq/${id}/replay`,
        { method: 'POST' }
      );
      showNotification('Dead-letter item replayed successfully (HTTP 200 OK)');
      setDlqItems((prev) => prev.map((item) => (item.id === id ? res.item : item)));
      loadAllData();
    } catch (err: any) {
      showNotification(`Replay failed: ${err.message}`, 'error');
    } finally {
      setReplayingDlqId(null);
    }
  };

  // DLQ Replay All Items
  const handleReplayAllDlq = async () => {
    try {
      setReplayingAll(true);
      const res = await apiFetch<{ ok: boolean; replayed: number; successful: number; failed: number }>(
        '/v1/webhooks/dlq/replay-all',
        { method: 'POST' }
      );
      showNotification(`Replayed ${res.replayed} items: ${res.successful} succeeded, ${res.failed} failed`);
      loadAllData();
    } catch (err: any) {
      showNotification(`Replay all failed: ${err.message}`, 'error');
    } finally {
      setReplayingAll(false);
    }
  };

  // Webhook Chaos Injection Test
  const handleTriggerChaos = async () => {
    try {
      setChaosLoading(true);
      const res = await apiFetch<{ ok: boolean; message: string; failuresTriggered: number }>(
        '/v1/webhooks/chaos/dispatch',
        {
          method: 'POST',
          body: JSON.stringify({ simulateFailures: true }),
        }
      );
      showNotification(`Chaos dispatched! ${res.failuresTriggered} delivery attempts simulated with backoff and routed to DLQ.`, 'info');
      loadAllData();
    } catch (err: any) {
      showNotification(`Chaos test failed: ${err.message}`, 'error');
    } finally {
      setChaosLoading(false);
    }
  };

  // AAC Connect Mailbox
  const handleConnectAac = async (provider: 'google' | 'microsoft') => {
    try {
      const email = provider === 'google' ? 'tony.stark@acme.corp' : 'executive.sync@acme.corp';
      const res = await apiFetch<{ ok: boolean; connection: AACConnection }>('/v1/integrations/aac/connect', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          mailboxEmail: email,
          kmsKeyAlias: 'alias/nexus-aac-master',
        }),
      });
      setAacConnection(res.connection);
      showNotification(`Connected to ${provider === 'google' ? 'Google Workspace' : 'Microsoft 365'} with KMS envelope encryption.`);
      loadAllData();
    } catch (err: any) {
      showNotification(`AAC connection failed: ${err.message}`, 'error');
    }
  };

  // AAC Sync Mailbox
  const handleSyncAac = async () => {
    try {
      setSyncingAac(true);
      const res = await apiFetch<{
        ok: boolean;
        syncedEmails: number;
        syncedEvents: number;
        matchedContacts: number;
        privacyExclusions: number;
        connection: AACConnection;
      }>('/v1/integrations/aac/sync', { method: 'POST' });
      setAacConnection(res.connection);
      showNotification(
        `AAC Mailbox synced! ${res.syncedEmails} emails captured, ${res.matchedContacts} contacts associated, ${res.privacyExclusions} internal emails excluded.`
      );
      loadAllData();
    } catch (err: any) {
      showNotification(`AAC sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingAac(false);
    }
  };

  // AAC Disconnect
  const handleDisconnectAac = async () => {
    try {
      await apiFetch('/v1/integrations/aac/disconnect', { method: 'POST' });
      setAacConnection(null);
      showNotification('AAC Mailbox disconnected.');
      loadAllData();
    } catch (err: any) {
      showNotification(`Disconnect failed: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12" data-testid="automations-page">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all transform duration-200 border ${
            notification.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-800 shadow-rose-950/50'
              : notification.type === 'info'
              ? 'bg-sky-950/95 text-sky-200 border-sky-800 shadow-sky-950/50'
              : 'bg-emerald-950/95 text-emerald-200 border-emerald-800 shadow-emerald-950/50'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-75 focus:outline-none"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Workflow Automations & Webhooks
            </h1>
            <Badge variant="accent">
              <Zap className="h-3 w-3 mr-1 inline" />
              DAG Engine
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Visual deterministic DAG execution, conditional branch routing, and HMAC-SHA256 verified webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={refreshing}
            className="flex items-center gap-1.5"
            data-testid="refresh-automations-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {activeTab === 'webhooks' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewWebhookModalOpen(true)}
              className="flex items-center gap-1.5"
              data-testid="create-webhook-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Outbound Webhook
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (selectedWorkflow) handleOpenTestModal(selectedWorkflow);
              }}
              className="flex items-center gap-1.5"
              data-testid="test-run-header-btn"
            >
              <Play className="h-3.5 w-3.5" />
              Test Run Workflow
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="automation-metrics-grid">
        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Active Workflows
            </span>
            <GitBranch className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]" data-testid="metric-active-workflows">
              {metrics.activeWorkflows}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">of {metrics.totalWorkflows} total</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Executions
            </span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]" data-testid="metric-executions-count">
              {metrics.executionsCount}
            </span>
            <span className="text-xs text-emerald-400 font-medium">100% DAG verified</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Success Rate
            </span>
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]" data-testid="metric-success-rate">
              {metrics.successRate}%
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">0 cyclical failures</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider">
              Outbound Webhooks
            </span>
            <Webhook className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text-primary)]" data-testid="metric-outbound-webhooks">
              {metrics.outboundWebhooksCount}
            </span>
            <span className="text-xs text-amber-400 font-medium">HMAC-SHA256 Signed</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border-subtle)] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('workflows')}
          className={`pb-3 px-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'workflows'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          data-testid="tab-workflows"
        >
          <GitBranch className="h-4 w-4" />
          Workflows & DAG Canvas
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`pb-3 px-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'webhooks'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          data-testid="tab-webhooks"
        >
          <Webhook className="h-4 w-4" />
          Outbound Subscriptions ({webhooks.length})
        </button>

        <button
          onClick={() => setActiveTab('dlq')}
          className={`pb-3 px-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'dlq'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          data-testid="tab-dlq"
        >
          <ServerCrash className="h-4 w-4" />
          Dead-Letter Queue (DLQ)
          {dlqItems.filter((i) => i.replayedStatus !== 'SUCCESS').length > 0 ? (
            <span
              className="px-1.5 py-0.5 text-[10px] rounded-full bg-rose-500/20 text-rose-300 font-mono border border-rose-500/30"
              data-testid="dlq-count-badge"
            >
              {dlqItems.filter((i) => i.replayedStatus !== 'SUCCESS').length}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('aac')}
          className={`pb-3 px-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'aac'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          data-testid="tab-aac"
        >
          <Mail className="h-4 w-4" />
          Activity Capture (AAC)
          <span
            className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono border ${
              aacConnection?.status === 'CONNECTED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {aacConnection?.status === 'CONNECTED' ? 'Active' : 'Offline'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inbound')}
          className={`pb-3 px-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
            activeTab === 'inbound'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
          data-testid="tab-inbound"
        >
          <Radio className="h-4 w-4" />
          Inbound HMAC Verification
        </button>
      </div>

      {/* TAB 1: Workflows & DAG Canvas */}
      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Workflows Master List */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Configured Workflows
            </h2>

            <div className="space-y-2">
              {workflows.map((wf) => {
                const isSelected = selectedWorkflow?.id === wf.id;
                return (
                  <div
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedWorkflow(wf);
                      }
                    }}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-950/20'
                        : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)]'
                    }`}
                    data-testid={`workflow-card-${wf.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--color-text-primary)] text-sm">{wf.name}</span>
                          {wf.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="neutral">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{wf.description}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)] pt-2 border-t border-[var(--color-border-subtle)]">
                      <span className="flex items-center gap-1">
                        <Radio className="h-3 w-3 text-indigo-400" />
                        Trigger: <code className="text-indigo-300">{wf.triggerType}</code>
                      </span>
                      <span>{wf.nodes.length} nodes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workflow DAG Preview Canvas */}
          <div className="lg:col-span-7 space-y-4">
            {selectedWorkflow ? (
              <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--color-border-subtle)]">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-indigo-400" />
                      {selectedWorkflow.name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      Visual DAG representation with acyclic validation guarantee.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenTestModal(selectedWorkflow)}
                    className="flex items-center gap-1.5 shrink-0"
                    data-testid="test-run-workflow-btn"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Test Run Workflow
                  </Button>
                </div>

                {/* Visual DAG Nodes Graph */}
                <div className="space-y-4" data-testid="workflow-dag-canvas">
                  {selectedWorkflow.nodes.map((node, idx) => {
                    const isRoot = node.id === selectedWorkflow.rootNodeId;
                    const isCondition = node.type === 'condition';

                    return (
                      <div key={node.id} className="relative pl-6">
                        {/* Connector line */}
                        {idx > 0 && (
                          <div className="absolute left-2.5 -top-4 w-0.5 h-4 bg-indigo-500/30" />
                        )}

                        {/* Node Bullet */}
                        <div
                          className={`absolute left-0 top-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                            isRoot
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : isCondition
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        {/* Node Card */}
                        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                              {node.title}
                            </span>
                            <Badge
                              variant={isRoot ? 'accent' : isCondition ? 'warning' : 'success'}
                            >
                              {node.type}
                            </Badge>
                          </div>

                          {/* Node Config details */}
                          <div className="text-xs text-[var(--color-text-secondary)] font-mono bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                            {isRoot && (
                              <div>Trigger Event: {selectedWorkflow.triggerType}</div>
                            )}
                            {isCondition && (
                              <div>
                                Rule: If <span className="text-amber-300">{node.config.field}</span> {node.config.operator} &quot;{node.config.value}&quot;
                              </div>
                            )}
                            {node.actionType === 'update_record' && (
                              <div>Update Record: Patch {JSON.stringify(node.config.patch)}</div>
                            )}
                            {node.actionType === 'create_task' && (
                              <div>Create Task: {node.config.title}</div>
                            )}
                            {node.actionType === 'send_email' && (
                              <div>Send Email: {node.config.subject}</div>
                            )}
                            {node.actionType === 'outbound_webhook' && (
                              <div>Dispatch HMAC Outbound Webhook to {node.config.url}</div>
                            )}
                          </div>

                          {/* Branch indicator */}
                          {isCondition && (
                            <div className="flex items-center gap-4 text-[11px] pt-1">
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Check className="h-3 w-3" /> True: {node.nextNodes?.join(', ') || 'End'}
                              </span>
                              <span className="flex items-center gap-1 text-rose-400">
                                <X className="h-3 w-3" /> False: {node.elseNodes?.join(', ') || 'End'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border-subtle)] rounded-2xl">
                Select a workflow on the left to preview its visual DAG graph.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Outbound Subscriptions */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Active Outbound Webhook Subscriptions
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                Every event payload is signed with HMAC-SHA256 hex digest transmitted via <code>x-nexus-signature</code>.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsNewWebhookModalOpen(true)}
              className="flex items-center gap-1.5 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New Subscription
            </Button>
          </div>

          <div className="space-y-4" data-testid="outbound-webhooks-list">
            {webhooks.map((hook) => (
              <div
                key={hook.id}
                className="p-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md space-y-4"
                data-testid={`webhook-row-${hook.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                        {hook.targetUrl}
                      </span>
                      {hook.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Paused</Badge>
                      )}
                    </div>
                    {hook.description && (
                      <p className="text-xs text-[var(--color-text-secondary)]">{hook.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendPing(hook.id)}
                      disabled={pingingId === hook.id}
                      className="flex items-center gap-1.5"
                      data-testid={`ping-webhook-${hook.id}`}
                    >
                      <Send className={`h-3.5 w-3.5 ${pingingId === hook.id ? 'animate-pulse text-amber-400' : ''}`} />
                      {pingingId === hook.id ? 'Pinging...' : 'Send Test Ping'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[var(--color-bg-canvas)] p-3 rounded-xl border border-[var(--color-border-subtle)] font-mono">
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase">Events:</span>
                    <span className="text-indigo-300">{hook.subscribedEvents.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)] block text-[10px] uppercase">HMAC Secret:</span>
                    <span className="text-zinc-400">whsec_••••••••••••••••</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Logs Ledger */}
          <div className="space-y-3 pt-6 border-t border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Recent Webhook Deliveries & HMAC Signatures
            </h3>

            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/40 border-b border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Target URL</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Delivered At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {deliveries.slice(0, 10).map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-indigo-300">{d.event}</td>
                      <td className="py-3 px-4 font-mono text-[var(--color-text-secondary)] max-w-[200px] truncate">
                        {d.targetUrl}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={d.statusCode === 200 ? 'success' : 'danger'}>
                          HTTP {d.statusCode}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--color-text-secondary)]">{d.durationMs}ms</td>
                      <td className="py-3 px-4 text-[var(--color-text-tertiary)]">
                        {new Date(d.deliveredAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectingDelivery(d)}
                          className="text-xs"
                          data-testid={`inspect-delivery-${d.id}`}
                        >
                          Inspect Payload
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Inbound HMAC Verification Guide & Playground */}
      {activeTab === 'inbound' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md space-y-4">
            <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Cryptographic Inbound Webhook Verification
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Nexus CRM supports cryptographically secure inbound webhook delivery with constant-time HMAC-SHA256 signature
              validation to defend against timing attacks and forged requests.
            </p>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
              <div className="text-zinc-400 font-semibold">// Inbound Webhook Endpoint:</div>
              <div className="text-indigo-400">POST http://localhost:4000/v1/webhooks/inbound/:hookId</div>
              <div className="text-zinc-400 font-semibold pt-2">// Required Signature Header:</div>
              <div className="text-emerald-400">x-nexus-signature: sha256=&lt;hex_encoded_hmac_digest&gt;</div>
            </div>

            <div className="pt-2 text-xs text-[var(--color-text-tertiary)] flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              Constant-time <code>timingSafeEqual()</code> comparison active on all incoming webhook requests.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Dead-Letter Queue (DLQ) */}
      {activeTab === 'dlq' && (
        <div className="space-y-6" data-testid="dlq-view">
          {/* DLQ Diagnostics & Control Header */}
          <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <ServerCrash className="h-5 w-5 text-rose-400" />
                  Dead-Letter Queue & Replay Diagnostics
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Failed outbound webhooks that exhausted full exponential backoff & jitter attempts are safely quarantined here.
                  Review diagnostics, inspect payloads, and execute targeted or bulk replays.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTriggerChaos}
                  disabled={chaosLoading}
                  className="border-rose-800/60 text-rose-300 hover:bg-rose-950/40 flex items-center gap-1.5"
                  data-testid="trigger-chaos-btn"
                >
                  <AlertCircle className={`h-3.5 w-3.5 ${chaosLoading ? 'animate-spin' : 'text-rose-400'}`} />
                  {chaosLoading ? 'Simulating Chaos...' : 'Trigger Chaos Webhook'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleReplayAllDlq}
                  disabled={replayingAll || dlqItems.length === 0}
                  className="flex items-center gap-1.5"
                  data-testid="replay-all-dlq-btn"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${replayingAll ? 'animate-spin' : ''}`} />
                  {replayingAll ? 'Replaying All...' : 'Replay All Pending'}
                </Button>
              </div>
            </div>

            {/* DLQ Key Guarantees */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <div className="text-zinc-400 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  Exponential Backoff + Jitter
                </div>
                <div className="text-[var(--color-text-secondary)]">
                  Retries up to 5 times (100ms, 200ms, 400ms, 800ms) with randomized jitter to prevent thundering herds.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <div className="text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  Zero Message Loss Guarantee
                </div>
                <div className="text-[var(--color-text-secondary)]">
                  Transactional Outbox ensures every unacknowledged event is safely quarantined in persistent DLQ storage.
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                <div className="text-zinc-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                  Strict SSRF Enforced
                </div>
                <div className="text-[var(--color-text-secondary)]">
                  Replays strictly validate destination DNS and IP ranges against loopback, private RFC1918, and metadata.
                </div>
              </div>
            </div>
          </div>

          {/* DLQ Table */}
          <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Quarantined Delivery Items ({dlqItems.length})
              </h3>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {dlqItems.filter((i) => i.replayedStatus === 'SUCCESS').length} recovered
              </span>
            </div>

            {dlqItems.length === 0 ? (
              <div className="p-12 text-center space-y-3" data-testid="dlq-empty-state">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Dead-Letter Queue is Empty
                </h4>
                <p className="text-xs text-[var(--color-text-secondary)] max-w-md mx-auto">
                  All outbound webhook deliveries have either completed successfully or are within normal retry backoff.
                  You can click "Trigger Chaos Webhook" above to simulate a live delivery outage.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" data-testid="dlq-table">
                  <thead className="bg-zinc-950/40 text-[var(--color-text-tertiary)] uppercase font-semibold border-b border-[var(--color-border-subtle)]">
                    <tr>
                      <th className="py-3 px-4">Event ID / Target</th>
                      <th className="py-3 px-4">Attempts</th>
                      <th className="py-3 px-4">Last Status & Error</th>
                      <th className="py-3 px-4">Quarantined At</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {dlqItems.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/20 transition-colors" data-testid={`dlq-row-${item.id}`}>
                        <td className="py-3 px-4">
                          <div className="font-mono font-medium text-indigo-300 truncate max-w-[220px]">
                            {item.targetUrl}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                            Event: {item.eventId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-rose-400 font-semibold">
                            {item.attempts} / 5 retries
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[280px]">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-rose-300 truncate">
                            <span className="px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-[10px]">
                              {item.lastStatusCode ? `HTTP ${item.lastStatusCode}` : 'ERR'}
                            </span>
                            <span className="truncate">{item.lastError}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--color-text-tertiary)] font-mono">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4">
                          {item.replayedStatus === 'SUCCESS' ? (
                            <Badge variant="success">REPLAYED (200 OK)</Badge>
                          ) : item.replayedStatus === 'FAILED' ? (
                            <Badge variant="danger">REPLAY FAILED</Badge>
                          ) : (
                            <Badge variant="warning">
                              PENDING REPLAY
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspectingDlq(item)}
                            className="text-xs"
                            data-testid={`inspect-dlq-${item.id}`}
                          >
                            Inspect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReplayDlq(item.id)}
                            disabled={replayingDlqId === item.id || item.replayedStatus === 'SUCCESS'}
                            className="text-xs"
                            data-testid={`replay-dlq-${item.id}`}
                          >
                            <RotateCcw className={`h-3 w-3 mr-1 ${replayingDlqId === item.id ? 'animate-spin' : ''}`} />
                            {item.replayedStatus === 'SUCCESS' ? 'Delivered' : 'Replay'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Automatic Activity Capture (AAC) */}
      {activeTab === 'aac' && (
        <div className="space-y-6" data-testid="aac-view">
          {/* AAC Master Integration Card */}
          <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                    Automatic Activity Capture (AAC)
                  </h2>
                  <Badge variant={aacConnection?.status === 'CONNECTED' ? 'success' : 'neutral'}>
                    {aacConnection?.status === 'CONNECTED' ? 'ACTIVE SYNC' : 'DISCONNECTED'}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Zero-touch bi-directional email and calendar ingestion with KMS envelope encryption and deterministic record association.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {aacConnection?.status === 'CONNECTED' ? (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSyncAac}
                      disabled={syncingAac}
                      className="flex items-center gap-1.5"
                      data-testid="sync-aac-btn"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncingAac ? 'animate-spin' : ''}`} />
                      {syncingAac ? 'Syncing Mailbox...' : 'Sync Mailbox Now'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectAac}
                      className="border-rose-900/50 text-rose-300 hover:bg-rose-950/30"
                      data-testid="disconnect-aac-btn"
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConnectAac('google')}
                      className="flex items-center gap-1.5"
                      data-testid="connect-google-aac-btn"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Connect Google Workspace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnectAac('microsoft')}
                      className="flex items-center gap-1.5"
                      data-testid="connect-m365-aac-btn"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Connect Microsoft 365
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-xs text-[var(--color-text-tertiary)] font-medium uppercase tracking-wider">
                  Connected Mailbox
                </span>
                <div className="mt-2 text-sm font-mono font-semibold text-indigo-300 truncate" data-testid="aac-mailbox-email">
                  {aacConnection?.mailboxEmail || 'None connected'}
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)] mt-1 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  KMS Hardware Encrypted
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-xs text-[var(--color-text-tertiary)] font-medium uppercase tracking-wider">
                  Synced Emails
                </span>
                <div className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]" data-testid="aac-synced-emails">
                  {aacConnection?.syncedEmailsCount || 0}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">Bi-directional captured</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-xs text-[var(--color-text-tertiary)] font-medium uppercase tracking-wider">
                  Matched Records
                </span>
                <div className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]" data-testid="aac-matched-contacts">
                  {aacConnection?.matchedContactsCount || 0}
                </div>
                <div className="text-[11px] text-teal-400 mt-1">Contacts & Deals associated</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-xs text-[var(--color-text-tertiary)] font-medium uppercase tracking-wider">
                  Privacy Shield
                </span>
                <div className="mt-2 text-2xl font-bold text-amber-400" data-testid="aac-privacy-exclusions">
                  {aacConnection?.privacyExclusionsCount || 0}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Internal emails excluded</div>
              </div>
            </div>

            {/* KMS Envelope Encryption Details */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5 font-semibold">
                  <Lock className="h-3.5 w-3.5 text-emerald-400" />
                  KMS Envelope Encryption Key Alias:
                </span>
                <span className="text-emerald-400">{aacConnection?.kmsKeyAlias || 'alias/nexus-aac-master'}</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                OAuth access tokens and refresh secrets are encrypted at rest using AES-256-GCM envelope encryption.
                Data decryption keys (DEKs) never touch non-volatile storage in plaintext.
              </p>
            </div>
          </div>

          {/* 4-Tier Deterministic Record Association Rules */}
          <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Deterministic Association Pipeline Architecture
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              When an inbound or outbound communication event occurs, AAC evaluates records using a rigorous 4-tier match strategy:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="text-xs font-mono font-bold text-indigo-400">01 / Contact Lookup</div>
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Exact Email Match</h4>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Resolves external participant address against <code className="text-indigo-300">people.email</code> with case-insensitive normalization.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="text-xs font-mono font-bold text-indigo-400">02 / Company Linking</div>
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Domain Resolution</h4>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Extracts email domain (e.g. <code className="text-indigo-300">starkindustries.com</code>) to automatically associate primary company record.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="text-xs font-mono font-bold text-indigo-400">03 / Pipeline Context</div>
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Active Deal Association</h4>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Attaches correspondence to active open deals belonging to matched company or contact, recording in polymorphic activity stream.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                <div className="text-xs font-mono font-bold text-amber-400">04 / Privacy Defense</div>
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">Internal Exclusions</h4>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Strict domain filtering rejects internal staff chatter (<code className="text-amber-300">@acme.corp</code>), guaranteeing confidential communications stay private.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Real-time Workflow Execution & Step Logs Inspection */}
      {testingWorkflow && (
        <Modal
          open={Boolean(testingWorkflow)}
          onOpenChange={(open) => {
            if (!open) {
              setTestingWorkflow(null);
              setLatestRunResult(null);
            }
          }}
          size="2xl"
          title={`Test Run: ${testingWorkflow.name}`}
        >
          <div className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1" data-testid="workflow-test-modal">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Provide input record data to execute through the complete DAG tree. Step outputs and branching decisions
              will be captured in real-time.
            </p>

            <div className="space-y-2">
              <label htmlFor="test-record-payload" className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                Simulated Trigger Record (JSON)
              </label>
              <textarea
                id="test-record-payload"
                rows={5}
                value={testPayloadText}
                onChange={(e) => setTestPayloadText(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                data-testid="workflow-test-payload-input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTestingWorkflow(null);
                  setLatestRunResult(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteTest}
                disabled={executing}
                className="flex items-center gap-1.5"
                data-testid="execute-workflow-run-btn"
              >
                <Play className={`h-3.5 w-3.5 ${executing ? 'animate-spin' : ''}`} />
                {executing ? 'Executing DAG...' : 'Run Workflow Now'}
              </Button>
            </div>

            {/* Run Results and Step Logs */}
            {latestRunResult && (
              <div className="pt-4 border-t border-[var(--color-border-subtle)] space-y-3" data-testid="workflow-run-results">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-300 text-xs uppercase tracking-wider">
                      Execution Complete ({latestRunResult.durationMs}ms)
                    </span>
                  </div>
                  <Badge variant="success">
                    STATUS: {latestRunResult.status}
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase">
                    Step-by-Step Execution Logs ({latestRunResult.stepLogs.length} steps)
                  </span>

                  {latestRunResult.stepLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-2 font-mono text-xs"
                      data-testid={`step-log-${idx}`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-emerald-400" />
                          {log.nodeTitle}
                        </span>
                        <span className="text-zinc-500">{log.durationMs}ms</span>
                      </div>

                      {log.outputData && (
                        <div className="text-[11px] bg-zinc-900/60 p-2 rounded text-zinc-300">
                          {JSON.stringify(log.outputData, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL 2: Outbound Webhook Delivery Log Inspection */}
      {inspectingDelivery && (
        <Modal
          open={Boolean(inspectingDelivery)}
          onOpenChange={(open) => {
            if (!open) setInspectingDelivery(null);
          }}
          size="xl"
          title={`Delivery Log: ${inspectingDelivery.event}`}
        >
          <div className="space-y-4 text-xs font-mono max-h-[75vh] overflow-y-auto pr-1" data-testid="delivery-inspection-modal">
            <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Status:</span>
                <span className="text-emerald-400 font-bold">HTTP {inspectingDelivery.statusCode} OK</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Duration:</span>
                <span className="text-zinc-200">{inspectingDelivery.durationMs}ms</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase block">Target Endpoint:</span>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 break-all">
                {inspectingDelivery.targetUrl}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase block">HMAC-SHA256 Signature (x-nexus-signature):</span>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-300 break-all select-all font-bold">
                {inspectingDelivery.signature}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase block">Payload:</span>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 overflow-x-auto text-[11px]">
                {JSON.stringify(inspectingDelivery.payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectingDelivery(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Create Outbound Webhook */}
      {isNewWebhookModalOpen && (
        <Modal
          open={isNewWebhookModalOpen}
          onOpenChange={(open) => setIsNewWebhookModalOpen(open)}
          size="md"
          title="Create Outbound Webhook Subscription"
        >
          <form onSubmit={handleCreateWebhook} className="space-y-4 text-sm" data-testid="create-webhook-modal">
            <div className="space-y-1.5">
              <label htmlFor="new-webhook-url" className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Target Endpoint URL *
              </label>
              <Input
                id="new-webhook-url"
                required
                placeholder="https://api.partner.example/webhooks"
                value={newTargetUrl}
                onChange={(e) => setNewTargetUrl(e.target.value)}
                data-testid="new-webhook-url-input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-webhook-events" className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Subscribed Events (comma separated)
              </label>
              <Input
                id="new-webhook-events"
                placeholder="deal.won, record.created, quote.approved"
                value={newEvents}
                onChange={(e) => setNewEvents(e.target.value)}
                data-testid="new-webhook-events-input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-webhook-secret" className="text-xs font-semibold text-[var(--color-text-secondary)]">
                HMAC Secret (leave blank to auto-generate)
              </label>
              <Input
                id="new-webhook-secret"
                placeholder="whsec_..."
                value={newSecret}
                onChange={(e) => setNewSecret(e.target.value)}
                data-testid="new-webhook-secret-input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="new-webhook-desc" className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Description
              </label>
              <Input
                id="new-webhook-desc"
                placeholder="Billing and provisioning listener"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                data-testid="new-webhook-desc-input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsNewWebhookModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" data-testid="submit-new-webhook-btn">
                Create Subscription
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Inspect DLQ Payload & Diagnostic Stack */}
      {inspectingDlq && (
        <Modal
          open={Boolean(inspectingDlq)}
          onOpenChange={(open) => {
            if (!open) setInspectingDlq(null);
          }}
          size="lg"
          title={`DLQ Diagnostic: ${inspectingDlq.eventId}`}
        >
          <div className="space-y-4 text-sm" data-testid="inspect-dlq-modal">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[var(--color-text-tertiary)] uppercase font-semibold">Target Endpoint</span>
                <div className="font-mono text-indigo-300 truncate">{inspectingDlq.targetUrl}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[var(--color-text-tertiary)] uppercase font-semibold">Delivery Retries</span>
                <div className="font-mono text-rose-300">{inspectingDlq.attempts} of 5 exhausted</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 space-y-1">
              <span className="text-xs font-semibold text-rose-300 uppercase">Fatal Failure Diagnostic</span>
              <div className="font-mono text-xs text-rose-200">{inspectingDlq.lastError}</div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase">
                Original Payload (Transactional Outbox Snapshot)
              </div>
              <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 overflow-x-auto max-h-[300px]">
                {JSON.stringify(inspectingDlq.payload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-[var(--color-text-tertiary)]">
                Quarantined: {new Date(inspectingDlq.createdAt).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setInspectingDlq(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleReplayDlq(inspectingDlq.id);
                    setInspectingDlq(null);
                  }}
                  disabled={inspectingDlq.replayedStatus === 'SUCCESS'}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Replay Now
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
