'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Database,
  HardDrive,
  Cpu,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Activity,
  Layers,
  Terminal,
  Server,
  Zap,
} from 'lucide-react';
import { Button, Badge } from '@nexus/ui';
import { apiFetch } from '@/lib/api';

interface BackendItem {
  name: string;
  tier: 1 | 2;
  capabilities: Record<string, boolean>;
  health: {
    status: 'healthy' | 'degraded' | 'unreachable';
    latencyMs: number;
    details?: Record<string, any>;
    checkedAt: string;
    message?: string;
  };
}

interface BackendsOverview {
  database: BackendItem;
  objectStorage: BackendItem;
  queueCache: BackendItem;
}

export default function BackendConnectionManagerPage() {
  const [overview, setOverview] = React.useState<BackendsOverview | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [probing, setProbing] = React.useState<Record<string, boolean>>({});
  const [probeResults, setProbeResults] = React.useState<Record<string, any>>({});
  const [error, setError] = React.useState<string | null>(null);

  const loadBackends = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<BackendsOverview>('/v1/platform/backends');
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load storage backend overview');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadBackends();
  }, [loadBackends]);

  const handleProbe = async (category: 'database' | 'objectStorage' | 'queueCache') => {
    try {
      setProbing((prev) => ({ ...prev, [category]: true }));
      const result = await apiFetch(`/v1/platform/backends/probe`, {
        method: 'POST',
        body: JSON.stringify({ category }),
      });
      setProbeResults((prev) => ({ ...prev, [category]: result }));
    } catch (err: any) {
      setProbeResults((prev) => ({
        ...prev,
        [category]: { status: 'unreachable', message: err.message },
      }));
    } finally {
      setProbing((prev) => ({ ...prev, [category]: false }));
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'healthy') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
          <CheckCircle2 className="h-3 w-3" /> Healthy
        </span>
      );
    }
    if (status === 'degraded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-800">
          <AlertTriangle className="h-3 w-3" /> Degraded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/60 text-red-400 border border-red-800">
        <AlertTriangle className="h-3 w-3" /> Unreachable
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16 px-4">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/settings/platform"
              className="inline-flex items-center text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Platform Sovereignty
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Backend Connection Manager
            </h1>
            <Badge variant="accent">Pluggable SPI</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Pluggable storage engines, capability flags negotiation, and safe read-only connection diagnostics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadBackends}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Security & Read-Only Probe Guarantee Banner */}
      <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/50 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-200 space-y-1">
          <p className="font-semibold text-white">Safe Read-Only Diagnostic Probes Guarantee (§3.3)</p>
          <p className="text-indigo-300">
            Connection tests execute non-mutating ping commands (<code className="font-mono text-indigo-200">SELECT 1</code>,{' '}
            <code className="font-mono text-indigo-200">HEAD bucket</code>,{' '}
            <code className="font-mono text-indigo-200">PING</code>) and never modify or write customer data.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Storage Backend Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Relational Database Adapter */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Relational Database</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Data persistence & indexing</p>
                </div>
              </div>
              <Badge variant="neutral">Tier {overview?.database.tier || 2}</Badge>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-bg-muted)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Active Engine:</span>
                <span className="font-mono font-medium text-white">{overview?.database.name || 'loading...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Latency:</span>
                <span className="font-mono text-emerald-400">{overview?.database.health.latencyMs ?? 0} ms</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-muted)]">Health Status:</span>
                {renderStatusBadge(probeResults.database?.status || overview?.database.health.status || 'healthy')}
              </div>
            </div>

            {/* Capability Flags */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Capabilities Matrix
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {overview &&
                  Object.entries(overview.database.capabilities).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`px-2 py-1 rounded flex items-center justify-between ${
                        enabled ? 'bg-slate-900/60 text-slate-200' : 'bg-slate-950/40 text-slate-500 line-through'
                      }`}
                    >
                      <span>{key}</span>
                      <span className="text-[9px] font-mono">{enabled ? '✓' : '✗'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            disabled={probing.database}
            onClick={() => handleProbe('database')}
          >
            <Activity className={`h-3.5 w-3.5 mr-1.5 ${probing.database ? 'animate-spin' : ''}`} />
            {probing.database ? 'Probing...' : 'Test Database Connection'}
          </Button>
        </div>

        {/* 2. Object Storage Adapter */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Object Storage</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Attachments, files & media</p>
                </div>
              </div>
              <Badge variant="neutral">Tier {overview?.objectStorage.tier || 2}</Badge>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-bg-muted)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Active Engine:</span>
                <span className="font-mono font-medium text-white">{overview?.objectStorage.name || 'loading...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Latency:</span>
                <span className="font-mono text-emerald-400">{overview?.objectStorage.health.latencyMs ?? 0} ms</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-muted)]">Health Status:</span>
                {renderStatusBadge(probeResults.objectStorage?.status || overview?.objectStorage.health.status || 'healthy')}
              </div>
            </div>

            {/* Capability Flags */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Capabilities Matrix
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {overview &&
                  Object.entries(overview.objectStorage.capabilities).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`px-2 py-1 rounded flex items-center justify-between ${
                        enabled ? 'bg-slate-900/60 text-slate-200' : 'bg-slate-950/40 text-slate-500 line-through'
                      }`}
                    >
                      <span>{key}</span>
                      <span className="text-[9px] font-mono">{enabled ? '✓' : '✗'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            disabled={probing.objectStorage}
            onClick={() => handleProbe('objectStorage')}
          >
            <Activity className={`h-3.5 w-3.5 mr-1.5 ${probing.objectStorage ? 'animate-spin' : ''}`} />
            {probing.objectStorage ? 'Probing...' : 'Test Storage Connection'}
          </Button>
        </div>

        {/* 3. Queue & Cache Adapter */}
        <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Queue & Cache</h3>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Async jobs, locks & pub/sub</p>
                </div>
              </div>
              <Badge variant="neutral">Tier {overview?.queueCache.tier || 2}</Badge>
            </div>

            <div className="p-3 rounded-lg bg-[var(--color-bg-muted)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Active Engine:</span>
                <span className="font-mono font-medium text-white">{overview?.queueCache.name || 'loading...'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Latency:</span>
                <span className="font-mono text-emerald-400">{overview?.queueCache.health.latencyMs ?? 0} ms</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border-subtle)]">
                <span className="text-[var(--color-text-muted)]">Health Status:</span>
                {renderStatusBadge(probeResults.queueCache?.status || overview?.queueCache.health.status || 'healthy')}
              </div>
            </div>

            {/* Capability Flags */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Capabilities Matrix
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {overview &&
                  Object.entries(overview.queueCache.capabilities).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`px-2 py-1 rounded flex items-center justify-between ${
                        enabled ? 'bg-slate-900/60 text-slate-200' : 'bg-slate-950/40 text-slate-500 line-through'
                      }`}
                    >
                      <span>{key}</span>
                      <span className="text-[9px] font-mono">{enabled ? '✓' : '✗'}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            disabled={probing.queueCache}
            onClick={() => handleProbe('queueCache')}
          >
            <Activity className={`h-3.5 w-3.5 mr-1.5 ${probing.queueCache ? 'animate-spin' : ''}`} />
            {probing.queueCache ? 'Probing...' : 'Test Cache Connection'}
          </Button>
        </div>
      </div>

      {/* Migration Tooling Callout (§3.4) */}
      <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] space-y-4">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-5 w-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Live Data Migration Tooling</h2>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Migrate your entire instance data between storage backends (e.g. SQLite to PostgreSQL) with zero data loss using streaming pagination and checksum verification:
        </p>
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
          <p className="text-slate-500"># 1. Dry-run verification (validates schemas & calculates row counts without writes)</p>
          <p className="text-indigo-300">pnpm crm backend:migrate --from sqlite://./nexus.db --to postgres://nexus@localhost/nexus_db --dry-run</p>
          <p className="text-slate-500 pt-2"># 2. Live streaming migration with batch pagination</p>
          <p className="text-emerald-300">pnpm crm backend:migrate --from sqlite://./nexus.db --to postgres://nexus@localhost/nexus_db</p>
        </div>
      </div>
    </div>
  );
}
