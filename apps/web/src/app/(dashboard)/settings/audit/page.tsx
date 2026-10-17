'use client';

import * as React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  History,
  RefreshCw,
  Hash,
  Clock,
  User,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';
import { Button, Badge } from '@nexus/ui';
import { apiFetch } from '@/lib/api';

interface AuditEvent {
  id: string;
  workspaceId: string;
  actorType: string;
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  payload: Record<string, any>;
  prevHash: string;
  currentHash: string;
  createdAt: string;
}

export default function AuditLogPage() {
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState(false);
  const [verificationResult, setVerificationResult] = React.useState<{
    valid: boolean;
    checkedEventsCount: number;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAuditEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<AuditEvent[]>('/v1/audit/events');
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit events');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await apiFetch<{ valid: boolean; checkedEventsCount: number }>('/v1/audit/verify');
      setVerificationResult(res);
    } catch (err: any) {
      setError(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  React.useEffect(() => {
    fetchAuditEvents();
    handleVerifyChain();
  }, [fetchAuditEvents]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Tamper-Evident Audit Ledger
            </h1>
            <Badge variant="accent">Cryptographic Proof</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Immutable SHA-256 hash-chained event stream logging all tenant operations and schema changes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="btn-refresh-audit"
            variant="ghost"
            size="sm"
            onClick={fetchAuditEvents}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            id="btn-verify-audit-chain"
            variant="primary"
            size="md"
            onClick={handleVerifyChain}
            loading={verifying}
          >
            <ShieldCheck className="h-4 w-4" /> Verify Hash Chain
          </Button>
        </div>
      </div>

      {/* Cryptographic Verification Badge Banner */}
      {verificationResult && (
        <div
          id="audit-verification-banner"
          className={`p-4 rounded-[10px] border flex items-center justify-between gap-4 shadow-sm ${
            verificationResult.valid
              ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-[8px] ${
                verificationResult.valid ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}
            >
              {verificationResult.valid ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <ShieldAlert className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {verificationResult.valid
                  ? 'Cryptographic Ledger Integrity: 100% Verified'
                  : 'Tampering Detected: Ledger Chain Broken'}
              </h2>
              <p className="text-xs opacity-90 mt-0.5">
                {verificationResult.valid
                  ? `All ${verificationResult.checkedEventsCount} events passed recursive SHA-256 genesis hash verification.`
                  : 'One or more records have mismatched previous/current cryptographic hashes.'}
              </p>
            </div>
          </div>

          <Badge variant={verificationResult.valid ? 'success' : 'danger'}>
            {verificationResult.valid ? 'Valid Hash Chain' : 'Integrity Failure'}
          </Badge>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-border)]">
          {error}
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              Chronological Audit Trail ({events.length} Events)
            </span>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
            Displaying latest events (descending)
          </span>
        </div>

        <div className="overflow-x-auto focus:outline-none" tabIndex={0} role="region" aria-label="Audit log events">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]/40 text-[var(--color-text-muted)] font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Payload Summary</th>
                <th className="py-2.5 px-3">Cryptographic SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-muted)]">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                    {loading ? 'Verifying audit ledger...' : 'No audit events found.'}
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--color-text-secondary)] whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-mono text-[10px]">
                        {evt.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="capitalize text-[var(--color-text-secondary)]">
                        {evt.actorType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
                      {evt.targetType ? `${evt.targetType}:${evt.targetId?.slice(0, 8)}...` : '—'}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-secondary)] max-w-xs truncate">
                      {JSON.stringify(evt.payload)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
                      <span className="bg-[var(--color-bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--color-border-default)]">
                        {evt.currentHash.slice(0, 16)}...
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
