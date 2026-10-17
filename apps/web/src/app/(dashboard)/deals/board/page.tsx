'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Table as TableIcon,
  Kanban,
  IndianRupee,
  AlertTriangle,
  Clock,
  Sparkles,
  Plus,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Building2,
  RefreshCw,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Badge, Modal, Input, MoneyDisplay } from '@nexus/ui';
import { Money, formatMoney } from '@nexus/schema';
import { apiFetch } from '@/lib/api';

interface BoardDeal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  probability: number;
  expectedValue: number;
  closeDate: string | null;
  daysInStage: number;
  isRotting: boolean;
  rottingThreshold: number;
  version: number;
  data: Record<string, any>;
}

interface BoardStage {
  id: string;
  name: string;
  stageOrder: number;
  winProbability: number;
  rottingDaysThreshold: number;
  color: string;
  dealCount: number;
  totalAmount: number;
  weightedAmount: number;
  deals: BoardDeal[];
}

interface BoardData {
  pipeline: {
    id: string;
    name: string;
  };
  metrics: {
    totalAmount: number;
    weightedAmount: number;
    dealCount: number;
  };
  stages: BoardStage[];
}

export default function DealsKanbanBoardPage() {
  const router = useRouter();
  const [boardData, setBoardData] = React.useState<BoardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [draggingDealId, setDraggingDealId] = React.useState<string | null>(null);
  const [celebrationMessage, setCelebrationMessage] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState<string | null>(null);

  // New Deal modal
  const [isNewDealOpen, setIsNewDealOpen] = React.useState(false);
  const [newDealName, setNewDealName] = React.useState('');
  const [newDealAmount, setNewDealAmount] = React.useState('150000');
  const [newDealStage, setNewDealStage] = React.useState('Discovery');
  const [submittingDeal, setSubmittingDeal] = React.useState(false);

  const fetchBoard = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<BoardData>('/v1/pipelines/default/board');
      setBoardData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load deal pipeline board');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    setDraggingDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const moveDealToStage = async (dealId: string, targetStageName: string) => {
    if (!dealId || !boardData) return;

    // Find current deal and stage
    let foundDeal: BoardDeal | null = null;
    let fromStageName = '';

    for (const stage of boardData.stages) {
      const match = stage.deals.find((d) => d.id === dealId);
      if (match) {
        foundDeal = match;
        fromStageName = stage.name;
        break;
      }
    }

    if (!foundDeal || fromStageName.toLowerCase() === targetStageName.toLowerCase()) {
      setDraggingDealId(null);
      return;
    }

    // Optimistic UI Update
    const previousState = { ...boardData };
    const updatedStages = boardData.stages.map((st) => {
      if (st.name.toLowerCase() === fromStageName.toLowerCase()) {
        const remaining = st.deals.filter((d) => d.id !== dealId);
        const stAmt = remaining.reduce((sum, d) => sum + d.amount, 0);
        return {
          ...st,
          deals: remaining,
          dealCount: remaining.length,
          totalAmount: stAmt,
          weightedAmount: stAmt * (st.winProbability / 100),
        };
      }
      if (st.name.toLowerCase() === targetStageName.toLowerCase()) {
        const movedDeal: BoardDeal = {
          ...foundDeal!,
          stage: st.name,
          probability: st.winProbability,
          expectedValue: foundDeal!.amount * (st.winProbability / 100),
          daysInStage: 0,
          isRotting: false,
        };
        const newDeals = [movedDeal, ...st.deals];
        const stAmt = newDeals.reduce((sum, d) => sum + d.amount, 0);
        return {
          ...st,
          deals: newDeals,
          dealCount: newDeals.length,
          totalAmount: stAmt,
          weightedAmount: stAmt * (st.winProbability / 100),
        };
      }
      return st;
    });

    const newTotalAmount = updatedStages.reduce((sum, s) => sum + s.totalAmount, 0);
    const newWeightedAmount = updatedStages.reduce((sum, s) => sum + s.weightedAmount, 0);

    setBoardData({
      ...boardData,
      metrics: {
        ...boardData.metrics,
        totalAmount: newTotalAmount,
        weightedAmount: newWeightedAmount,
      },
      stages: updatedStages,
    });
    setDraggingDealId(null);
    setAnnouncement(`Moved deal "${foundDeal.name}" to stage ${targetStageName}`);

    // If moved to Closed Won, show celebration micro-animation
    if (targetStageName.toLowerCase() === 'closed won') {
      setCelebrationMessage(`🎉 Congratulations! "${foundDeal.name}" closed won for ${formatMoney(Money.fromMajor(foundDeal.amount, 'INR'))}!`);
      setTimeout(() => setCelebrationMessage(null), 5000);
    }

    // Server commit
    try {
      await apiFetch(`/v1/pipelines/deals/${dealId}/stage`, {
        method: 'POST',
        body: JSON.stringify({ toStage: targetStageName }),
      });
    } catch (err: any) {
      alert(`Stage transition failed: ${err.message}. Reverting...`);
      setBoardData(previousState);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageName: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain') || draggingDealId;
    if (dealId) {
      await moveDealToStage(dealId, targetStageName);
    }
  };

  // Create New Deal
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDeal(true);
    try {
      await apiFetch('/v1/records/deals', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            name: newDealName,
            amount: parseFloat(newDealAmount) || 0,
            stage: newDealStage,
          },
        }),
      });

      setIsNewDealOpen(false);
      setNewDealName('');
      setNewDealAmount('150000');
      await fetchBoard();
    } catch (err: any) {
      alert(`Failed to create deal: ${err.message}`);
    } finally {
      setSubmittingDeal(false);
    }
  };

  // Rotting deals count
  const rottingDealsCount =
    boardData?.stages.reduce(
      (sum, s) => sum + s.deals.filter((d) => d.isRotting).length,
      0
    ) || 0;

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Sales Pipeline & Kanban
            </h1>
            <Badge variant="accent">{boardData?.pipeline.name || 'Standard B2B Pipeline'}</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Real-time drag-and-drop stage execution, weighted pipeline forecasting, and deal velocity tracking
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-[6px] border border-[var(--color-border-default)] p-0.5 bg-[var(--color-bg-surface)]">
            <Button
              id="btn-switch-table-view"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/records/deals')}
              className="text-xs"
            >
              <TableIcon className="h-3.5 w-3.5" /> Table
            </Button>
            <Button
              id="btn-switch-board-view"
              variant="secondary"
              size="sm"
              className="text-xs font-bold"
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban Board
            </Button>
          </div>

          <Button
            id="btn-refresh-board"
            variant="ghost"
            size="sm"
            onClick={fetchBoard}
            aria-label="Refresh pipeline board"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            id="btn-open-create-deal"
            variant="primary"
            size="md"
            onClick={() => setIsNewDealOpen(true)}
          >
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        </div>
      </div>

      {/* Celebration Banner */}
      {celebrationMessage && (
        <div
          id="closed-won-celebration"
          className="p-4 rounded-[10px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 flex items-center justify-between shadow-md animate-bounce"
        >
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-emerald-500 shrink-0" />
            <span className="text-sm font-bold">{celebrationMessage}</span>
          </div>
          <Badge variant="success">Deal Closed</Badge>
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
            <span>Total Pipeline Value</span>
            <IndianRupee className="h-4 w-4 text-[var(--color-accent-primary)]" />
          </div>
          <div className="mt-2">
            <MoneyDisplay
              amount={boardData?.metrics.totalAmount || 0}
              isSubunits={false}
              currency="INR"
              compact
              size="2xl"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Sum across {boardData?.metrics.dealCount || 0} active deals
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
            <span>Weighted Pipeline (AST Formula)</span>
            <Sparkles className="h-4 w-4 text-[var(--color-accent-primary)]" />
          </div>
          <div className="mt-2">
            <MoneyDisplay
              amount={Math.round(boardData?.metrics.weightedAmount || 0)}
              isSubunits={false}
              currency="INR"
              compact
              size="2xl"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Calculated via win probabilities
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
            <span>Active Pipeline Stages</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] font-mono">
              {boardData?.stages.length || 6} Stages
            </span>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Discovery to Closed Won
            </p>
          </div>
        </div>

        <div className="p-4 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
            <span>Rotting Warnings Alert</span>
            <AlertTriangle className={`h-4 w-4 ${rottingDealsCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-2xl font-bold tracking-tight font-mono ${rottingDealsCount > 0 ? 'text-amber-500' : 'text-[var(--color-text-primary)]'}`}>
              {rottingDealsCount} {rottingDealsCount === 1 ? 'Deal' : 'Deals'}
            </span>
            {rottingDealsCount > 0 ? (
              <Badge variant="warning">Requires Action</Badge>
            ) : (
              <Badge variant="success">All Fresh</Badge>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Deals exceeding stage velocity limits
          </p>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="overflow-x-auto pb-4 focus:outline-none" tabIndex={0} role="region" aria-label="Kanban pipeline board">
        <div className="flex gap-4 min-w-[1280px]">
          {boardData?.stages.map((stage) => (
            <div
              key={stage.id}
              id={`stage-col-${stage.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              data-testid={`kanban-column-${stage.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.name)}
              className="flex-1 min-w-[280px] rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm flex flex-col max-h-[calc(100vh-280px)]"
            >
              {/* Column Header */}
              <div className="p-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] flex flex-col gap-1 rounded-t-[10px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color || '#6366f1' }}
                    />
                    <span className="font-bold text-xs text-[var(--color-text-primary)]">
                      {stage.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] font-semibold">
                    {stage.deals.length}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-muted)] mt-1">
                  <MoneyDisplay amount={stage.totalAmount} isSubunits={false} currency="INR" compact size="xs" />
                  <span>{stage.winProbability}% win prob</span>
                </div>
              </div>

              {/* Deal Cards Container */}
              <div
                className="p-2.5 overflow-y-auto flex-1 flex flex-col gap-2.5 focus:outline-none"
                tabIndex={0}
                role="region"
                aria-label={`${stage.name} deals`}
              >
                {stage.deals.length === 0 ? (
                  <div className="p-8 text-center text-[11px] text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-[8px]">
                    Drag deals here
                  </div>
                ) : (
                  stage.deals.map((deal) => {
                    const stageIdx = boardData?.stages.findIndex((s) => s.id === stage.id) ?? -1;
                    const canMoveBack = stageIdx > 0;
                    const canMoveForward = stageIdx >= 0 && stageIdx < (boardData?.stages.length || 0) - 1;
                    const prevStage = canMoveBack ? boardData?.stages[stageIdx - 1]?.name : null;
                    const nextStage = canMoveForward ? boardData?.stages[stageIdx + 1]?.name : null;

                    return (
                      <div
                        key={deal.id}
                        id={`deal-card-${deal.id}`}
                        draggable
                        tabIndex={0}
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => router.push(`/records/deals/${deal.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === '[' || (e.shiftKey && e.key === 'ArrowLeft')) {
                            e.preventDefault();
                            if (prevStage) moveDealToStage(deal.id, prevStage);
                          } else if (e.key === ']' || (e.shiftKey && e.key === 'ArrowRight')) {
                            e.preventDefault();
                            if (nextStage) moveDealToStage(deal.id, nextStage);
                          } else if (e.key === 'Enter') {
                            router.push(`/records/deals/${deal.id}`);
                          }
                        }}
                        className={`p-3.5 rounded-[8px] border bg-[var(--color-bg-surface)] hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2.5 group focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] ${
                          deal.isRotting
                            ? 'border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-950/10'
                            : 'border-[var(--color-border-default)] hover:border-[var(--color-accent-primary)]/50'
                        }`}
                      >
                        {/* Deal Header */}
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <span className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors leading-snug line-clamp-2 break-words min-w-0 flex-1">
                            {deal.name}
                          </span>
                          <div className="shrink-0">
                            <MoneyDisplay amount={deal.amount} isSubunits={false} currency="INR" compact size="xs" />
                          </div>
                        </div>

                        {/* Formula Expected Value */}
                        <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-mono">
                          <span className="flex items-center gap-1">
                            Exp: <MoneyDisplay amount={deal.expectedValue} isSubunits={false} currency="INR" compact size="xs" />
                          </span>
                          <span>{deal.probability}% Prob</span>
                        </div>

                        {/* Rotting Alert / Velocity Footer + Keyboard Navigation */}
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-muted)] text-[10px]">
                          {deal.isRotting ? (
                            <div
                              id={`rotting-badge-${deal.id}`}
                              className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold animate-pulse"
                              title={`Deal has spent ${deal.daysInStage} days in this stage (Threshold: ${deal.rottingThreshold} days)`}
                            >
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Rotting: {deal.daysInStage}d &gt; {deal.rottingThreshold}d limit</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[var(--color-text-muted)] font-mono">
                              <Clock className="h-3 w-3" />
                              <span>{deal.daysInStage}d in stage</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            {/* Keyboard stage movement alternative */}
                            <div className="flex items-center bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] rounded-[4px] p-0.5">
                              {canMoveBack && (
                                <button
                                  type="button"
                                  id={`btn-move-back-${deal.id}`}
                                  aria-label={`Move ${deal.name} back to ${prevStage}`}
                                  title={`Move back to ${prevStage} ([)`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (prevStage) moveDealToStage(deal.id, prevStage);
                                  }}
                                  className="p-0.5 rounded hover:bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                </button>
                              )}
                              {canMoveForward && (
                                <button
                                  type="button"
                                  id={`btn-move-forward-${deal.id}`}
                                  aria-label={`Advance ${deal.name} forward to ${nextStage}`}
                                  title={`Advance to ${nextStage} (])`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (nextStage) moveDealToStage(deal.id, nextStage);
                                  }}
                                  className="p-0.5 rounded hover:bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            <span className="text-[10px] font-mono text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                              Open →
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE DEAL MODAL */}
      <Modal
        open={isNewDealOpen}
        onOpenChange={setIsNewDealOpen}
        size="md"
        title="Create New Sales Opportunity"
        description="Add a new deal opportunity to the active sales pipeline."
      >
        <form onSubmit={handleCreateDeal} className="flex flex-col gap-4 mt-2">
          <Input
            id="input-deal-name"
            label="Deal Title"
            placeholder="e.g. Acme Corp Enterprise Cloud Transformation"
            value={newDealName}
            onChange={(e) => setNewDealName(e.target.value)}
            required
          />

          <Input
            id="input-deal-amount"
            label="Deal Value (INR)"
            type="number"
            value={newDealAmount}
            onChange={(e) => setNewDealAmount(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Pipeline Stage</label>
            <select
              id="select-deal-stage"
              className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
              value={newDealStage}
              onChange={(e) => setNewDealStage(e.target.value)}
            >
              <option value="Discovery">Discovery (20%)</option>
              <option value="Qualification">Qualification (40%)</option>
              <option value="Proposal Sent">Proposal Sent (60%)</option>
              <option value="Negotiation">Negotiation (80%)</option>
              <option value="Closed Won">Closed Won (100%)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsNewDealOpen(false)}>
              Cancel
            </Button>
            <Button id="btn-submit-create-deal" variant="primary" type="submit" loading={submittingDeal}>
              Create Deal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
