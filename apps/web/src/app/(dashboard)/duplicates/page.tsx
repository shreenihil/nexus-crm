'use client';

import * as React from 'react';
import {
  Copy,
  GitMerge,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  History,
  Info,
  Building2,
  Users,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { Button, Input, Badge, Modal } from '@nexus/ui';
import { apiFetch } from '@/lib/api';

interface DuplicatePair {
  id: string;
  workspaceId: string;
  entityName: string;
  primaryRecordId: string;
  duplicateRecordId: string;
  confidenceScore: number;
  confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW';
  isAutoMergeCandidate: boolean;
  status: 'PENDING' | 'MERGED' | 'DISMISSED';
  matchFactors: Array<{
    factor: string;
    weight: number;
    similarity: number;
    contribution: number;
    detail: string;
  }>;
  summary: string;
  createdAt: string;
  primaryRecord?: {
    id: string;
    data: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  };
  duplicateRecord?: {
    id: string;
    data: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  };
}

interface MergeHistoryItem {
  id: string;
  workspaceId: string;
  entityName: string;
  winnerRecordId: string;
  loserRecordId: string;
  snapshotWinnerBefore: any;
  snapshotLoserBefore: any;
  mergedData: Record<string, any>;
  transferredLinksCount: number;
  transferredActivitiesCount: number;
  mergedBy: string;
  mergedAt: string;
  unmergedAt?: string | null;
  status: 'MERGED' | 'UNMERGED';
  winnerRecord?: any;
  loserRecord?: any;
}

export default function DuplicatesResolutionPage() {
  const [activeTab, setActiveTab] = React.useState<'pairs' | 'history'>('pairs');
  const [pairs, setPairs] = React.useState<DuplicatePair[]>([]);
  const [merges, setMerges] = React.useState<MergeHistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [scanning, setScanning] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedEntity, setSelectedEntity] = React.useState<string>('all');
  const [selectedTier, setSelectedTier] = React.useState<string>('all');

  // Comparison & Merge Modal
  const [comparingPair, setComparingPair] = React.useState<DuplicatePair | null>(null);
  const [winnerChoice, setWinnerChoice] = React.useState<'primary' | 'duplicate'>('primary');
  const [fieldSelections, setFieldSelections] = React.useState<Record<string, 'primary' | 'duplicate'>>({});
  const [merging, setMerging] = React.useState(false);

  // Score Explanation Popover
  const [explanationPair, setExplanationPair] = React.useState<DuplicatePair | null>(null);

  // Notification Toast
  const [notification, setNotification] = React.useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const notify = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [pairsRes, mergesRes] = await Promise.all([
        apiFetch<any>('/v1/duplicates?status=PENDING'),
        apiFetch<any>('/v1/duplicates/merges'),
      ]);
      setPairs(pairsRes.pairs || []);
      setMerges(mergesRes.merges || []);
    } catch (err: any) {
      notify(err.message || 'Failed to load duplicate records', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await apiFetch<any>('/v1/duplicates/scan', { method: 'POST' });
      notify(`Identity resolution scan complete. ${res.detectedCount} duplicate pairs analyzed.`, 'success');
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Scan failed', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleOpenMerge = (pair: DuplicatePair) => {
    setComparingPair(pair);
    setWinnerChoice('primary');

    // Default field selections to primary
    const allFields = new Set([
      ...Object.keys(pair.primaryRecord?.data || {}),
      ...Object.keys(pair.duplicateRecord?.data || {}),
    ]);
    const initSelections: Record<string, 'primary' | 'duplicate'> = {};
    for (const f of allFields) {
      initSelections[f] = 'primary';
    }
    setFieldSelections(initSelections);
  };

  const handleExecuteMerge = async () => {
    if (!comparingPair) return;
    setMerging(true);

    try {
      const winnerId = winnerChoice === 'primary' ? comparingPair.primaryRecordId : comparingPair.duplicateRecordId;
      const loserId = winnerChoice === 'primary' ? comparingPair.duplicateRecordId : comparingPair.primaryRecordId;

      // Construct merged data based on fieldSelections
      const mergedData: Record<string, any> = {};
      const primaryData = comparingPair.primaryRecord?.data || {};
      const duplicateData = comparingPair.duplicateRecord?.data || {};

      for (const [field, choice] of Object.entries(fieldSelections)) {
        if (choice === 'primary') {
          if (primaryData[field] !== undefined) mergedData[field] = primaryData[field];
        } else {
          if (duplicateData[field] !== undefined) mergedData[field] = duplicateData[field];
        }
      }

      await apiFetch(`/v1/duplicates/${comparingPair.id}/merge`, {
        method: 'POST',
        body: JSON.stringify({
          winnerId,
          loserId,
          mergedData,
        }),
      });

      notify('Records successfully merged! Reversible for 30 days.', 'success');
      setComparingPair(null);
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Merge failed', 'error');
    } finally {
      setMerging(false);
    }
  };

  const handleDismiss = async (pairId: string) => {
    try {
      await apiFetch(`/v1/duplicates/${pairId}/dismiss`, { method: 'POST' });
      notify('Pair dismissed. The engine will remember not to flag these records.', 'info');
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to dismiss pair', 'error');
    }
  };

  const handleUnmerge = async (mergeId: string) => {
    try {
      await apiFetch(`/v1/duplicates/merges/${mergeId}/unmerge`, { method: 'POST' });
      notify('Reversible unmerge complete! Restored archived record and reassigned relationships.', 'success');
      await loadData();
    } catch (err: any) {
      notify(err.message || 'Unmerge failed', 'error');
    }
  };

  // Metrics
  const highConfidenceCount = pairs.filter((p) => p.confidenceTier === 'HIGH').length;
  const autoMergeCount = pairs.filter((p) => p.isAutoMergeCandidate).length;
  const mergedCount = merges.filter((m) => m.status === 'MERGED').length;

  // Filtered pairs
  const filteredPairs = pairs.filter((pair) => {
    if (selectedEntity !== 'all' && pair.entityName !== selectedEntity) return false;
    if (selectedTier !== 'all' && pair.confidenceTier !== selectedTier) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pData = JSON.stringify(pair.primaryRecord?.data || {}).toLowerCase();
      const dData = JSON.stringify(pair.duplicateRecord?.data || {}).toLowerCase();
      if (!pData.includes(q) && !dData.includes(q) && !pair.summary.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getRecordTitle = (record?: { data: Record<string, any> }) => {
    if (!record?.data) return 'Untitled Record';
    const d = record.data;
    if (d.name) return d.name;
    if (d.first_name || d.last_name) return `${d.first_name || ''} ${d.last_name || ''}`.trim();
    return 'Record #' + (record as any).id?.slice(-6);
  };

  const getRecordSubtitle = (record?: { data: Record<string, any> }) => {
    if (!record?.data) return '';
    const d = record.data;
    const parts: string[] = [];
    if (d.email) parts.push(d.email);
    if (d.domain) parts.push(d.domain);
    if (d.phone) parts.push(d.phone);
    if (d.title) parts.push(d.title);
    return parts.join(' • ');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
          {notification.type === 'error' && <XCircle className="h-5 w-5 text-rose-400 shrink-0" />}
          {notification.type === 'info' && <Info className="h-5 w-5 text-indigo-400 shrink-0" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border-default)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GitMerge className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                Resolution Center
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                Data integrity & identity resolution engine with 5 matching algorithms and 30-day reversible merges.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            id="run-scan-btn"
            data-testid="run-scan-btn"
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning Workspace...' : 'Run Duplicate Scan'}
          </Button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="kpi-cards">
        <div className="p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Pending Pairs
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)] mt-1" data-testid="kpi-pending-count">
            {pairs.length}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Requires user review</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>High Confidence</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1" data-testid="kpi-high-conf-count">
            {highConfidenceCount}
          </div>
          <div className="text-xs text-emerald-500/80 mt-1">&ge; 85% match score</div>
        </div>

        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10">
          <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
            <span>Auto-Merge Candidates</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-1" data-testid="kpi-auto-merge-count">
            {autoMergeCount}
          </div>
          <div className="text-xs text-indigo-500/80 mt-1">&ge; 92% + exact identity anchor</div>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
          <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center justify-between">
            <span>Resolved Merges</span>
            <History className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)] mt-1" data-testid="kpi-merged-count">
            {mergedCount}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">Reversible in 30 days</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-[var(--color-border-default)] gap-6">
        <button
          id="tab-pending-pairs"
          data-testid="tab-pending-pairs"
          onClick={() => setActiveTab('pairs')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'pairs'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Copy className="h-4 w-4" />
          Pending Duplicate Pairs ({pairs.length})
        </button>

        <button
          id="tab-merge-history"
          data-testid="tab-merge-history"
          onClick={() => setActiveTab('history')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <History className="h-4 w-4" />
          Merge History & Rollback ({merges.length})
        </button>
      </div>

      {/* TAB 1: PENDING PAIRS */}
      {activeTab === 'pairs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                id="search-duplicates-input"
                data-testid="search-duplicates-input"
                type="text"
                placeholder="Search candidates by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[var(--color-text-primary)]"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                id="entity-filter-select"
                data-testid="entity-filter-select"
                aria-label="Filter by Object"
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="px-3 py-1.5 text-sm bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] rounded-md text-[var(--color-text-primary)]"
              >
                <option value="all">All Objects</option>
                <option value="people">People</option>
                <option value="companies">Companies</option>
                <option value="deals">Deals</option>
              </select>

              <select
                id="tier-filter-select"
                data-testid="tier-filter-select"
                aria-label="Filter by Confidence Tier"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="px-3 py-1.5 text-sm bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)] rounded-md text-[var(--color-text-primary)]"
              >
                <option value="all">All Tiers</option>
                <option value="HIGH">High (&ge;85%)</option>
                <option value="MEDIUM">Medium (60-85%)</option>
              </select>
            </div>
          </div>

          {/* Pairs Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-[var(--color-text-muted)]">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading duplicate pairs...
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
              <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Zero Duplicates Detected</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-md mx-auto mt-1">
                Your database identity index is clean and synchronized. Any incoming records will undergo real-time pre-creation corroboration.
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="duplicate-pairs-list">
              {filteredPairs.map((pair) => (
                <div
                  key={pair.id}
                  data-testid={`pair-card-${pair.id}`}
                  className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 hover:border-indigo-500/30 transition-all shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Record A */}
                    <div className="flex-1 min-w-0 p-3 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)]">
                          Primary
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          ID: {pair.primaryRecordId.slice(-8)}
                        </span>
                      </div>
                      <div className="font-semibold text-[var(--color-text-primary)] truncate">
                        {getRecordTitle(pair.primaryRecord)}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                        {getRecordSubtitle(pair.primaryRecord)}
                      </p>
                    </div>

                    {/* Center: Match Confidence & Factors Badge */}
                    <div className="flex flex-col items-center justify-center shrink-0 px-2 py-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-lg font-black px-2.5 py-1 rounded-lg border ${
                            pair.confidenceScore >= 85
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                          }`}
                          data-testid="confidence-badge"
                        >
                          {pair.confidenceScore}%
                        </span>
                        {pair.isAutoMergeCandidate && (
                          <span
                            title="Auto-merge qualified: identity anchor verified"
                            className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          >
                            <Sparkles className="h-4 w-4" />
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setExplanationPair(pair)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 underline decoration-dotted flex items-center gap-1"
                        data-testid="view-match-reasons-btn"
                      >
                        <Info className="h-3 w-3" />
                        Why match?
                      </button>
                    </div>

                    {/* Right: Record B (Duplicate) */}
                    <div className="flex-1 min-w-0 p-3 rounded-lg bg-[var(--color-bg-canvas)] border border-[var(--color-border-default)]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/30">
                          Duplicate Candidate
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          ID: {pair.duplicateRecordId.slice(-8)}
                        </span>
                      </div>
                      <div className="font-semibold text-[var(--color-text-primary)] truncate">
                        {getRecordTitle(pair.duplicateRecord)}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                        {getRecordSubtitle(pair.duplicateRecord)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center lg:flex-col justify-end gap-2 shrink-0">
                      <Button
                        id={`compare-merge-btn-${pair.id}`}
                        data-testid="compare-merge-btn"
                        variant="primary"
                        onClick={() => handleOpenMerge(pair)}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3"
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        Compare & Merge
                      </Button>

                      <Button
                        id={`dismiss-btn-${pair.id}`}
                        data-testid="dismiss-pair-btn"
                        variant="ghost"
                        onClick={() => handleDismiss(pair.id)}
                        className="text-xs py-1 px-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      >
                        Not a Duplicate
                      </Button>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="mt-3 pt-3 border-t border-[var(--color-border-default)]/60 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span className="truncate">
                      Corroboration: <span className="text-[var(--color-text-secondary)]">{pair.summary}</span>
                    </span>
                    <span className="shrink-0 capitalize">Object: {pair.entityName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MERGE HISTORY & ROLLBACK */}
      {activeTab === 'history' && (
        <div className="space-y-4" data-testid="merge-history-view">
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 flex items-start gap-3">
            <RotateCcw className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text-primary)]">30-Day Safe Rollback Invariant:</span>{' '}
              All merged records preserve full original snapshots, foreign-key relationships, timeline activities, and quote references. Clicking <strong>Unmerge</strong> instantly restores the archived record and reassigns all foreign links.
            </div>
          </div>

          {merges.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
              <History className="h-10 w-10 text-[var(--color-text-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-sm text-[var(--color-text-muted)]">No merge transactions recorded yet.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" data-testid="merge-history-table">
                  <thead className="bg-[var(--color-bg-canvas)] border-b border-[var(--color-border-default)] text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Merged Records</th>
                      <th className="py-3 px-4">Object</th>
                      <th className="py-3 px-4">Transferred Links</th>
                      <th className="py-3 px-4">Merged Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-default)]">
                    {merges.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--color-bg-canvas)]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[var(--color-text-primary)]">
                            Winner: {getRecordTitle(item.winnerRecord || item.snapshotWinnerBefore)}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)] mt-0.5 line-through">
                            Loser: {getRecordTitle(item.loserRecord || item.snapshotLoserBefore)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-[var(--color-text-secondary)]">
                          {item.entityName}
                        </td>
                        <td className="py-3.5 px-4 text-[var(--color-text-secondary)] text-xs">
                          {item.transferredLinksCount} links • {item.transferredActivitiesCount} activities
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[var(--color-text-muted)]">
                          {new Date(item.mergedAt).toLocaleDateString()} {new Date(item.mergedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              item.status === 'MERGED'
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {item.status === 'MERGED' ? (
                            <Button
                              id={`unmerge-btn-${item.id}`}
                              data-testid="unmerge-btn"
                              variant="outline"
                              onClick={() => handleUnmerge(item.id)}
                              className="text-xs py-1 px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 flex items-center gap-1.5 ml-auto"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Unmerge
                            </Button>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">Unmerged</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SIDE-BY-SIDE COMPARISON & MERGE MODAL */}
      {comparingPair && (
        <Modal
          open={Boolean(comparingPair)}
          onOpenChange={(open) => !open && setComparingPair(null)}
          size="3xl"
          title={`Resolve Duplicate — ${comparingPair.entityName.toUpperCase()}`}
        >
          <div className="space-y-6" data-testid="side-by-side-merge-modal">
            {/* Header info */}
            <div className="p-3 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-canvas)] flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)]">
                Match Confidence: <strong className="text-emerald-400">{comparingPair.confidenceScore}%</strong> ({comparingPair.confidenceTier})
              </span>
              <span className="text-[var(--color-text-muted)]">
                Signals: {comparingPair.summary}
              </span>
            </div>

            {/* Winner Preset Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                id="pick-winner-left"
                data-testid="pick-winner-left"
                onClick={() => {
                  setWinnerChoice('primary');
                  const allFields = Object.keys(fieldSelections);
                  const sel: Record<string, 'primary' | 'duplicate'> = {};
                  for (const f of allFields) sel[f] = 'primary';
                  setFieldSelections(sel);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  winnerChoice === 'primary'
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-md ring-1 ring-indigo-500'
                    : 'border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    Record A (Primary)
                  </span>
                  {winnerChoice === 'primary' && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                </div>
                <div className="font-semibold text-[var(--color-text-primary)]">
                  {getRecordTitle(comparingPair.primaryRecord)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  ID: {comparingPair.primaryRecordId.slice(-8)}
                </div>
              </button>

              <button
                type="button"
                id="pick-winner-right"
                data-testid="pick-winner-right"
                onClick={() => {
                  setWinnerChoice('duplicate');
                  const allFields = Object.keys(fieldSelections);
                  const sel: Record<string, 'primary' | 'duplicate'> = {};
                  for (const f of allFields) sel[f] = 'duplicate';
                  setFieldSelections(sel);
                }}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  winnerChoice === 'duplicate'
                    ? 'border-indigo-500 bg-indigo-950/20 shadow-md ring-1 ring-indigo-500'
                    : 'border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Record B (Duplicate)
                  </span>
                  {winnerChoice === 'duplicate' && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                </div>
                <div className="font-semibold text-[var(--color-text-primary)]">
                  {getRecordTitle(comparingPair.duplicateRecord)}
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">
                  ID: {comparingPair.duplicateRecordId.slice(-8)}
                </div>
              </button>
            </div>

            {/* Field-by-Field Cherry Pick Table */}
            <div>
              <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Field-Level Cherry Pick</span>
                <span className="text-[11px] font-normal text-[var(--color-text-muted)]">
                  Click radio button to choose winner value per field
                </span>
              </div>

              <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left" data-testid="field-compare-table">
                  <thead className="bg-[var(--color-bg-canvas)] border-b border-[var(--color-border-default)] sticky top-0 text-[var(--color-text-muted)] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Field</th>
                      <th className="py-2.5 px-3">Record A Value</th>
                      <th className="py-2.5 px-3">Record B Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-default)]">
                    {Object.keys(fieldSelections).map((field) => {
                      const valA = comparingPair.primaryRecord?.data?.[field];
                      const valB = comparingPair.duplicateRecord?.data?.[field];
                      const isConflict = String(valA ?? '') !== String(valB ?? '');

                      return (
                        <tr
                          key={field}
                          className={isConflict ? 'bg-amber-950/10' : ''}
                          data-testid={`field-row-${field}`}
                        >
                          <td className="py-2.5 px-3 font-medium text-[var(--color-text-secondary)]">
                            {field}
                            {isConflict && (
                              <span className="ml-1 text-[10px] text-amber-400 uppercase font-bold">
                                (Diff)
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`field_${field}`}
                                checked={fieldSelections[field] === 'primary'}
                                onChange={() =>
                                  setFieldSelections((prev) => ({ ...prev, [field]: 'primary' }))
                                }
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-[var(--color-text-primary)]">
                                {valA !== undefined && valA !== null ? String(valA) : <em className="text-[var(--color-text-muted)]">empty</em>}
                              </span>
                            </label>
                          </td>

                          <td className="py-2.5 px-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`field_${field}`}
                                checked={fieldSelections[field] === 'duplicate'}
                                onChange={() =>
                                  setFieldSelections((prev) => ({ ...prev, [field]: 'duplicate' }))
                                }
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-[var(--color-text-primary)]">
                                {valB !== undefined && valB !== null ? String(valB) : <em className="text-[var(--color-text-muted)]">empty</em>}
                              </span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Impact Safety Notice */}
            <div className="p-3.5 rounded-lg border border-indigo-500/20 bg-indigo-950/10 text-xs text-[var(--color-text-muted)] space-y-1">
              <div className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Atomic Merge & Link Transfer Guarantees
              </div>
              <p>
                • All quotes, emails, calls, threads, and relationships linked to the loser record will be reassigned to the surviving record.
              </p>
              <p>
                • The loser record will be soft-deleted and an entry added to the audit ledger. You have 30 days to reversibly unmerge.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-default)]">
              <Button
                variant="outline"
                onClick={() => setComparingPair(null)}
                disabled={merging}
              >
                Cancel
              </Button>
              <Button
                id="confirm-merge-btn"
                data-testid="confirm-merge-btn"
                variant="primary"
                onClick={handleExecuteMerge}
                disabled={merging}
                className="flex items-center gap-2"
              >
                <GitMerge className="h-4 w-4" />
                {merging ? 'Merging Records...' : 'Confirm & Execute Merge'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* WHY MATCH EXPLANATION MODAL */}
      {explanationPair && (
        <Modal
          open={Boolean(explanationPair)}
          onOpenChange={(open) => !open && setExplanationPair(null)}
          size="xl"
          title={`Match Evidence Breakdown (${explanationPair.confidenceScore}% Confidence)`}
        >
          <div className="space-y-4" data-testid="match-explanation-dialog">
            <p className="text-xs text-[var(--color-text-muted)]">
              Our 5-algorithm identity corroboration engine combines phonetic indexing, token transposition, legal entity normalization, and exact identity anchors into an explainable score:
            </p>

            <div className="space-y-2.5">
              {explanationPair.matchFactors.map((factor, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs ${
                    factor.contribution > 0
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className={factor.contribution > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {factor.factor}
                    </span>
                    <span className={factor.contribution > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {factor.contribution > 0 ? `+${factor.contribution}%` : `${factor.contribution}%`}
                    </span>
                  </div>
                  <p className="text-[var(--color-text-muted)] mt-1">{factor.detail}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[var(--color-border-default)] flex justify-end">
              <Button variant="outline" onClick={() => setExplanationPair(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
