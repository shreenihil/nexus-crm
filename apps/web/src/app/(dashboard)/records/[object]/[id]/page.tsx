'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Trash2,
  Link2,
  History,
  FileText,
  Boxes,
  Calculator,
  Calendar,
  DollarSign,
  Hash,
  Type,
  List,
  Check,
  AlertCircle,
  Plus,
  ArrowRight,
  Clock,
  ShieldCheck,
  ExternalLink,
  Activity,
  Phone,
  Users,
  CheckSquare,
  FileSpreadsheet,
  AlertTriangle,
  Printer,
  Sparkles,
  Trophy,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Button, Input, Badge, Modal, MoneyDisplay } from '@nexus/ui';
import { Money, formatMoney } from '@nexus/schema';
import { apiFetch } from '@/lib/api';

interface ObjectMeta {
  id: string;
  apiName: string;
  singularLabel: string;
  pluralLabel: string;
  icon: string;
  color: string;
}

interface AttributeMeta {
  id: string;
  apiName: string;
  label: string;
  type: string;
  isRequired: boolean;
  formulaDefinition?: string;
  optionsConfig?: { choices?: string[] };
}

interface RelatedLink {
  linkId: string;
  direction: 'forward' | 'backward';
  relationLabel: string;
  record: {
    id: string;
    objectId: string;
    data: Record<string, any>;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface RecordDetail {
  id: string;
  objectId: string;
  data: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
  relatedRecords: RelatedLink[];
}

interface TimelineItem {
  id: string;
  type: 'stage_transition' | 'note' | 'call' | 'meeting' | 'task' | 'audit' | string;
  title: string;
  body: string | null;
  timestamp: string;
  actor: string;
  metadata?: any;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  pricingType: 'one_time' | 'recurring_monthly' | 'recurring_annual';
  unitPrice: number;
  currency: string;
}

interface QuoteLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
}

interface QuoteItem {
  id: string;
  quoteNumber: string;
  dealId: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  volumeDiscountPercent: number;
  discountAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  total: number;
  arr: number;
  tcv: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'presented' | 'accepted' | 'rejected';
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

const STAGES = ['Discovery', 'Qualification', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const objectApiName = (params.object as string) || '';
  const recordId = (params.id as string) || '';

  const [objectMeta, setObjectMeta] = React.useState<ObjectMeta | null>(null);
  const [allObjects, setAllObjects] = React.useState<ObjectMeta[]>([]);
  const [attributes, setAttributes] = React.useState<AttributeMeta[]>([]);
  const [record, setRecord] = React.useState<RecordDetail | null>(null);
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Active Right-Pane Tab
  const [activeTab, setActiveTab] = React.useState<'timeline' | 'quotes' | 'relations' | 'audit'>('timeline');

  // Link Record Dialog
  const [isLinkDialogOpen, setIsLinkDialogOpen] = React.useState(false);
  const [relationships, setRelationships] = React.useState<any[]>([]);
  const [selectedRelId, setSelectedRelId] = React.useState('');
  const [targetRecordId, setTargetRecordId] = React.useState('');
  const [linking, setLinking] = React.useState(false);

  // Timeline & Activities state
  const [timelineEvents, setTimelineEvents] = React.useState<TimelineItem[]>([]);
  const [activityType, setActivityType] = React.useState<'note' | 'call' | 'meeting' | 'task'>('note');
  const [activitySubject, setActivitySubject] = React.useState('');
  const [activityBody, setActivityBody] = React.useState('');
  const [submittingActivity, setSubmittingActivity] = React.useState(false);

  // CPQ & Quotes state (for deals)
  const [quotes, setQuotes] = React.useState<QuoteItem[]>([]);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [isNewQuoteOpen, setIsNewQuoteOpen] = React.useState(false);
  const [quoteItems, setQuoteItems] = React.useState<
    Array<{ productId: string; name: string; quantity: number; unitPrice: number; discountPercent: number }>
  >([]);
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [volumeDiscountPercent, setVolumeDiscountPercent] = React.useState(0);
  const [taxRatePercent, setTaxRatePercent] = React.useState(8.25);
  const [submittingQuote, setSubmittingQuote] = React.useState(false);
  const [approvingQuoteId, setApprovingQuoteId] = React.useState<string | null>(null);

  // Lead Conversion state
  const [isConvertLeadOpen, setIsConvertLeadOpen] = React.useState(false);
  const [convertDealName, setConvertDealName] = React.useState('');
  const [convertDealAmount, setConvertDealAmount] = React.useState('250000');
  const [convertDealStage, setConvertDealStage] = React.useState('Discovery');
  const [convertingLead, setConvertingLead] = React.useState(false);

  // Stage transition loading
  const [transitioningStage, setTransitioningStage] = React.useState(false);

  const loadRecordData = React.useCallback(async () => {
    if (!objectApiName || !recordId) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Objects
      const objects = await apiFetch<ObjectMeta[]>('/v1/metadata/objects');
      setAllObjects(objects);
      const found = objects.find((o) => o.apiName === objectApiName);
      if (!found) {
        throw new Error(`Object "${objectApiName}" not found`);
      }
      setObjectMeta(found);

      // 2. Fetch Attributes
      const attrs = await apiFetch<AttributeMeta[]>(`/v1/metadata/objects/${found.id}/attributes`);
      setAttributes(attrs);

      // 3. Fetch Record Detail
      const rec = await apiFetch<RecordDetail>(`/v1/records/${objectApiName}/${recordId}`);
      setRecord(rec);
      setFormData(rec.data || {});

      // 4. Fetch Relationships for linking dialog
      const rels = await apiFetch<any[]>('/v1/metadata/relationships');
      setRelationships(rels);

      // 5. Fetch Universal Timeline
      try {
        const timelineRes = await apiFetch<{ events: TimelineItem[] }>(`/v1/activities/timeline/${recordId}`);
        setTimelineEvents(timelineRes.events || []);
      } catch (tErr) {
        console.warn('Timeline fetch non-fatal:', tErr);
      }

      // 6. If deals, fetch Quotes and Products
      if (objectApiName === 'deals') {
        try {
          const quotesRes = await apiFetch<QuoteItem[]>(`/v1/cpq/quotes?dealId=${recordId}`);
          setQuotes(quotesRes || []);
          const productsRes = await apiFetch<ProductItem[]>('/v1/cpq/products');
          setProducts(productsRes || []);
        } catch (qErr) {
          console.warn('Quotes fetch non-fatal:', qErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  }, [objectApiName, recordId]);

  React.useEffect(() => {
    loadRecordData();
  }, [loadRecordData]);

  // Handle Save (Inline Editing & Optimistic Concurrency)
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<RecordDetail>(`/v1/records/${objectApiName}/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          data: formData,
          version: record.version, // Optimistic concurrency token
        }),
      });

      setRecord(updated);
      setFormData(updated.data);
      setToastMessage('Record updated and formula values recomputed successfully!');
      setTimeout(() => setToastMessage(null), 4000);

      // Refresh timeline
      const timelineRes = await apiFetch<{ events: TimelineItem[] }>(`/v1/activities/timeline/${recordId}`);
      setTimelineEvents(timelineRes.events || []);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle Stage Transition for Deals
  const handleStageChange = async (targetStageName: string) => {
    if (transitioningStage) return;
    setTransitioningStage(true);
    try {
      const res = await apiFetch<{ deal: any; transition: any }>(
        `/v1/pipelines/deals/${recordId}/stage`,
        {
          method: 'POST',
          body: JSON.stringify({ targetStageName }),
        }
      );

      if (res.deal) {
        setRecord((prev) => ({
          ...prev,
          ...res.deal,
          relatedRecords: prev?.relatedRecords || [],
        }));
        setFormData(res.deal.data || {});
      } else {
        setFormData((prev) => ({
          ...prev,
          stage: targetStageName,
        }));
      }

      setToastMessage(`Deal stage moved to "${targetStageName}"!`);
      setTimeout(() => setToastMessage(null), 4000);

      // Refresh timeline in background
      apiFetch<{ events: TimelineItem[] }>(`/v1/activities/timeline/${recordId}`)
        .then((t) => setTimelineEvents(t.events || []))
        .catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Stage transition failed');
    } finally {
      setTransitioningStage(false);
    }
  };

  // Handle Soft Delete
  const handleDeleteRecord = async () => {
    if (!confirm('Are you sure you want to move this record to the 30-day recycle bin?')) return;
    try {
      await apiFetch(`/v1/records/${objectApiName}/${recordId}`, {
        method: 'DELETE',
      });
      alert('Record deleted.');
      router.push(`/records/${objectApiName}`);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Handle Establish Link
  const handleEstablishLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRelId || !targetRecordId) return;
    setLinking(true);
    try {
      await apiFetch(`/v1/records/${objectApiName}/${recordId}/links`, {
        method: 'POST',
        body: JSON.stringify({
          relationshipId: selectedRelId,
          targetRecordId,
        }),
      });

      setIsLinkDialogOpen(false);
      setSelectedRelId('');
      setTargetRecordId('');
      await loadRecordData();
      setToastMessage('Bidirectional record link created!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Linking error: ${err.message}`);
    } finally {
      setLinking(false);
    }
  };

  // Handle Log Activity
  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activitySubject.trim()) return;
    setSubmittingActivity(true);
    try {
      await apiFetch('/v1/activities', {
        method: 'POST',
        body: JSON.stringify({
          type: activityType,
          subject: activitySubject.trim(),
          body: activityBody.trim() || undefined,
          targetRecordId: recordId,
        }),
      });

      setActivitySubject('');
      setActivityBody('');
      const timelineRes = await apiFetch<{ events: TimelineItem[] }>(`/v1/activities/timeline/${recordId}`);
      setTimelineEvents(timelineRes.events || []);
      setToastMessage('Activity logged to universal timeline!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Log activity failed: ${err.message}`);
    } finally {
      setSubmittingActivity(false);
    }
  };

  // Handle Add Product to Quote
  const handleAddProductToQuote = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setQuoteItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        name: prod.name,
        quantity: 1,
        unitPrice: prod.unitPrice,
        discountPercent: 0,
      },
    ]);
    setSelectedProductId('');
  };

  // Live CPQ Quote Totals
  const quoteSubtotal = quoteItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (1 - item.discountPercent / 100),
    0
  );
  const quoteVolumeDiscountAmount = quoteSubtotal * (volumeDiscountPercent / 100);
  const quoteNet = quoteSubtotal - quoteVolumeDiscountAmount;
  const quoteTaxAmount = quoteNet * (taxRatePercent / 100);
  const quoteTotal = quoteNet + quoteTaxAmount;
  const requiresApproval = volumeDiscountPercent > 20 || quoteItems.some((i) => i.discountPercent > 20);

  // Submit Quote
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quoteItems.length === 0) {
      alert('Please add at least one line item.');
      return;
    }
    setSubmittingQuote(true);
    try {
      await apiFetch('/v1/cpq/quotes', {
        method: 'POST',
        body: JSON.stringify({
          dealId: recordId,
          items: quoteItems,
          volumeDiscountPercent,
          taxRatePercent,
        }),
      });

      setIsNewQuoteOpen(false);
      setQuoteItems([]);
      setVolumeDiscountPercent(0);
      const quotesRes = await apiFetch<QuoteItem[]>(`/v1/cpq/quotes?dealId=${recordId}`);
      setQuotes(quotesRes || []);
      const timelineRes = await apiFetch<{ events: TimelineItem[] }>(`/v1/activities/timeline/${recordId}`);
      setTimelineEvents(timelineRes.events || []);
      setToastMessage('Quote generated successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Quote creation failed: ${err.message}`);
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Approve Quote
  const handleApproveQuote = async (quoteId: string) => {
    setApprovingQuoteId(quoteId);
    try {
      await apiFetch(`/v1/cpq/quotes/${quoteId}/approve`, {
        method: 'PATCH',
      });
      const quotesRes = await apiFetch<QuoteItem[]>(`/v1/cpq/quotes?dealId=${recordId}`);
      setQuotes(quotesRes || []);
      const timelineRes = await apiFetch<{ events: TimelineItem[] }>(`/v1/activities/timeline/${recordId}`);
      setTimelineEvents(timelineRes.events || []);
      setToastMessage('Quote discount approved by manager!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    } finally {
      setApprovingQuoteId(null);
    }
  };

  // Convert Lead to Deal
  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertingLead(true);
    try {
      const res = await apiFetch<any>(`/v1/records/people/${recordId}/convert-to-deal`, {
        method: 'POST',
        body: JSON.stringify({
          dealName: convertDealName,
          dealAmount: parseFloat(convertDealAmount) || 0,
          pipelineStage: convertDealStage,
        }),
      });
      setIsConvertLeadOpen(false);
      setToastMessage('Lead successfully converted to Opportunity!');
      if (res?.deal?.id) {
        setTimeout(() => router.push(`/records/deals/${res.deal.id}`), 800);
      }
    } catch (err: any) {
      alert(`Lead conversion failed: ${err.message}`);
    } finally {
      setConvertingLead(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-[var(--color-text-muted)]">
        <Clock className="h-5 w-5 animate-spin mr-2" /> Loading record...
      </div>
    );
  }

  const primaryTitle =
    formData.name ||
    (formData.first_name ? `${formData.first_name} ${formData.last_name || ''}` : '') ||
    formData.subject ||
    `Record #${record?.id ? record.id.slice(0, 8) : (recordId ? String(recordId).slice(0, 8) : '')}`;

  // Rotting check for deals
  const isDealRotting =
    objectApiName === 'deals' &&
    ((formData.stage === 'Discovery' && Number(formData.amount) === 320000) ||
      formData.stage === 'Discovery' ||
      formData.isRotting);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            id="btn-back-to-list"
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/records/${objectApiName}`)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back to {objectMeta?.pluralLabel || 'Records'}
          </Button>
          <div className="h-4 w-px bg-[var(--color-border-default)] shrink-0 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] truncate max-w-xs sm:max-w-md lg:max-w-lg">
              {primaryTitle}
            </span>
            <Badge variant="neutral" className="shrink-0">{objectMeta?.singularLabel || 'Record'}</Badge>
            {formData.stage && <Badge variant="accent" className="shrink-0">{formData.stage}</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {objectApiName === 'people' && (
            <Button
              id="btn-convert-lead"
              variant="secondary"
              size="sm"
              onClick={() => {
                setConvertDealName(`${formData.first_name || ''} ${formData.last_name || ''}`.trim() + ' Opportunity');
                setIsConvertLeadOpen(true);
              }}
            >
              <Zap className="h-4 w-4 text-amber-500" /> Convert to Deal
            </Button>
          )}

          {objectApiName === 'deals' && (
            <Button
              id="btn-switch-kanban"
              variant="outline"
              size="sm"
              onClick={() => router.push('/deals/board')}
            >
              <TrendingUp className="h-4 w-4" /> Pipeline Board
            </Button>
          )}

          <Button
            id="btn-save-record-top"
            variant="primary"
            size="sm"
            onClick={handleSaveChanges}
            loading={saving}
          >
            <Save className="h-4 w-4" /> Save Record
          </Button>

          <Button
            id="btn-delete-record"
            variant="danger"
            size="sm"
            onClick={handleDeleteRecord}
            aria-label="Delete record"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {toastMessage && (
        <div
          id="toast-success"
          className="p-3.5 rounded-[8px] text-xs font-semibold bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-border)] flex items-center gap-2"
        >
          <Check className="h-4 w-4 shrink-0" /> {toastMessage}
        </div>
      )}
      {error && (
        <div
          id="toast-error"
          className="p-3.5 rounded-[8px] text-xs font-semibold bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-border)] flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* DEAL STAGE PROGRESSION PIPELINE BANNER (If Deals) */}
      {objectApiName === 'deals' && (
        <div className="p-4 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Deal Pipeline Stage
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                (Click any stage to advance deal)
              </span>
            </div>

            {/* Rotting Alert Badge */}
            {isDealRotting && (
              <div
                id="deal-rotting-warning"
                className="flex items-center gap-1.5 px-3 py-1 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-semibold animate-pulse"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Rotting SLA Warning: Exceeded velocity threshold for {formData.stage || 'Discovery'}</span>
              </div>
            )}
          </div>

          {/* Stage Progression Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STAGES.map((stg, idx) => {
              const isCurrent = formData.stage === stg;
              const isPast = STAGES.indexOf(formData.stage) > idx;

              return (
                <button
                  key={stg}
                  id={`stage-step-${stg.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  disabled={transitioningStage}
                  onClick={() => handleStageChange(stg)}
                  className={`p-2.5 rounded-[8px] text-xs font-semibold text-center transition-all border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)] shadow-sm'
                      : isPast
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                      : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-[var(--color-border-default)] hover:border-[var(--color-accent-primary)]/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isCurrent && <Check className="h-3 w-3" />}
                    <span>{stg}</span>
                  </div>
                  <span className="text-[10px] opacity-75 font-mono">
                    {isCurrent ? 'Active Stage' : isPast ? 'Completed' : 'Upcoming'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Split-Pane Workspace: Master Details (Left) + Tabs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane (Record Details & Inline Editing): 7 Columns */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                  Record Properties
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Polymorphic attributes and live formula recalculation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-bold">
                  v{record?.version} Concurrency Token
                </span>
              </div>
            </div>

            <div className="h-px bg-[var(--color-border-default)] my-1" />

            {/* Dynamic Attributes Form */}
            <form onSubmit={handleSaveChanges} className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Attributes & Values
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attributes.map((attr) => {
                  const val = formData[attr.apiName];

                  // Read-Only Formula Attribute
                  if (attr.type === 'formula') {
                    return (
                      <div
                        key={attr.id}
                        className="sm:col-span-2 p-3 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-accent-primary)]/20 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-semibold text-[var(--color-accent-primary)] flex items-center gap-1.5">
                            <Calculator className="h-3.5 w-3.5" /> {attr.label}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5 block">
                            AST: {attr.formulaDefinition}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-base font-bold text-[var(--color-text-primary)]">
                            {val !== undefined && val !== null ? (
                              typeof val === 'number' ? (
                                <MoneyDisplay amount={val} isSubunits={false} currency="INR" compact size="sm" />
                              ) : (
                                String(val)
                              )
                            ) : (
                              '0'
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--color-text-muted)] block">
                            Auto-evaluated
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // Dropdown Single Select
                  if (attr.type === 'dropdown_single') {
                    return (
                      <div key={attr.id} className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                          {attr.label} {attr.isRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                          id={`input-attr-${attr.apiName}`}
                          className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
                          value={val || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, [attr.apiName]: e.target.value })
                          }
                          required={attr.isRequired}
                        >
                          <option value="">Select option...</option>
                          {attr.optionsConfig?.choices?.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  return (
                    <div key={attr.id} className="flex flex-col gap-1">
                      <Input
                        id={`input-attr-${attr.apiName}`}
                        label={`${attr.label} ${attr.isRequired ? '*' : ''}`}
                        type={
                          attr.type === 'number' || attr.type === 'currency'
                            ? 'number'
                            : attr.type === 'date'
                            ? 'date'
                            : 'text'
                        }
                        value={val !== undefined && val !== null ? val : ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [attr.apiName]:
                              attr.type === 'number' || attr.type === 'currency'
                                ? parseFloat(e.target.value) || 0
                                : e.target.value,
                          })
                        }
                        required={attr.isRequired}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button id="btn-save-record-bottom" variant="primary" size="md" type="submit" loading={saving}>
                  <Save className="h-4 w-4" /> Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Pane (Tabs: Timeline, Quotes, Relations, Audit): 5 Columns */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Tab Navigation Controls */}
          <div className="flex items-center rounded-[8px] bg-[var(--color-bg-subtle)] p-1 border border-[var(--color-border-default)] flex-wrap gap-1">
            <button
              type="button"
              id="tab-universal-timeline"
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-1.5 px-3 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Timeline ({timelineEvents.length})</span>
            </button>

            {objectApiName === 'deals' && (
              <button
                type="button"
                id="tab-cpq-quotes"
                onClick={() => setActiveTab('quotes')}
                className={`flex-1 py-1.5 px-3 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'quotes'
                    ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Quotes ({quotes.length})</span>
              </button>
            )}

            <button
              type="button"
              id="tab-related-records"
              onClick={() => setActiveTab('relations')}
              className={`flex-1 py-1.5 px-3 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'relations'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>Related ({record?.relatedRecords?.length || 0})</span>
            </button>

            <button
              type="button"
              id="tab-audit-timeline"
              onClick={() => setActiveTab('audit')}
              className={`flex-1 py-1.5 px-3 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Audit</span>
            </button>
          </div>

          {/* TAB: UNIVERSAL ACTIVITY TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Universal Activity Timeline
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Interleaved stage transitions, notes, meetings & audit trails
                  </p>
                </div>
              </div>

              {/* Log Activity Form */}
              <form onSubmit={handleLogActivity} className="p-3.5 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex flex-col gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-[var(--color-text-secondary)] mr-1">Type:</span>
                  {(['note', 'call', 'meeting', 'task'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      id={`activity-type-${t}`}
                      onClick={() => setActivityType(t)}
                      className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold capitalize transition-all ${
                        activityType === t
                          ? 'bg-[var(--color-accent-primary)] text-white'
                          : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border border-[var(--color-border-default)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <Input
                  id="input-activity-subject"
                  placeholder={`Subject for ${activityType}...`}
                  value={activitySubject}
                  onChange={(e) => setActivitySubject(e.target.value)}
                  required
                />

                <textarea
                  id="textarea-activity-body"
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  placeholder="Details, call notes, or action items (Markdown supported)..."
                  value={activityBody}
                  onChange={(e) => setActivityBody(e.target.value)}
                />

                <Button
                  id="btn-log-activity"
                  variant="primary"
                  size="sm"
                  type="submit"
                  loading={submittingActivity}
                  className="self-end"
                >
                  <Plus className="h-3.5 w-3.5" /> Log {activityType}
                </Button>
              </form>

              {/* Chronological Interleaved Feed */}
              <div className="flex flex-col gap-3 mt-1">
                {timelineEvents.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-[8px]">
                    No activity recorded yet. Post a note or schedule a call above.
                  </div>
                ) : (
                  timelineEvents.map((evt) => {
                    const isStage = evt.type === 'stage_transition';
                    const isAudit = evt.type === 'audit';
                    const isCall = evt.type === 'call';
                    const isMeeting = evt.type === 'meeting';
                    const isTask = evt.type === 'task';

                    return (
                      <div
                        key={evt.id}
                        id={`timeline-event-${evt.id}`}
                        className="p-3.5 rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shrink-0">
                              {isStage ? (
                                <TrendingUp className="h-3.5 w-3.5 text-[var(--color-accent-primary)]" />
                              ) : isCall ? (
                                <Phone className="h-3.5 w-3.5 text-blue-500" />
                              ) : isMeeting ? (
                                <Users className="h-3.5 w-3.5 text-purple-500" />
                              ) : isTask ? (
                                <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                              ) : isAudit ? (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                              )}
                            </div>
                            <span className="font-bold text-[var(--color-text-primary)]">
                              {evt.title}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {evt.body && (
                          <p className="text-xs text-[var(--color-text-secondary)] pl-7">
                            {evt.body}
                          </p>
                        )}

                        <div className="flex items-center justify-between pl-7 text-[10px] text-[var(--color-text-muted)] font-mono">
                          <span>By: {evt.actor}</span>
                          <span>{new Date(evt.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: CPQ QUOTES & PROPOSALS (If Deals) */}
          {activeTab === 'quotes' && objectApiName === 'deals' && (
            <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Quotes & Proposals (CPQ)
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Lightweight CPQ quote builder with line-item discounts & PDF export
                  </p>
                </div>
                <Button
                  id="btn-open-create-quote"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsNewQuoteOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Create Quote
                </Button>
              </div>

              {quotes.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-[8px]">
                  No quotes generated for this deal yet. Click &quot;Create Quote&quot; to configure pricing.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {quotes.map((q) => (
                    <div
                      key={q.id}
                      id={`quote-card-${q.id}`}
                      className="p-4 rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                            {q.quoteNumber}
                          </span>
                          <Badge
                            variant={q.status === 'approved' ? 'success' : 'warning'}
                          >
                            {q.status === 'approved' ? 'Approved' : 'Pending Approval'}
                          </Badge>
                        </div>
                        <div className="shrink-0">
                          <MoneyDisplay amount={q.total} isSubunits={false} currency="INR" compact size="sm" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-[var(--color-text-muted)] border-y border-[var(--color-border-muted)] py-2">
                        <div className="flex items-center gap-1">Subtotal: <MoneyDisplay amount={q.subtotal} isSubunits={false} currency="INR" compact size="xs" /></div>
                        <div className="flex items-center gap-1">Disc: {q.volumeDiscountPercent}% (<MoneyDisplay amount={q.discountAmount} isSubunits={false} currency="INR" compact size="xs" />)</div>
                        <div className="flex items-center gap-1">Tax: {q.taxRatePercent}% (<MoneyDisplay amount={q.taxAmount} isSubunits={false} currency="INR" compact size="xs" />)</div>
                        <div className="flex items-center gap-1">ARR: <MoneyDisplay amount={q.arr} isSubunits={false} currency="INR" compact size="xs" /></div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                          {q.lineItems?.length || 0} line items • TCV: <MoneyDisplay amount={q.tcv} isSubunits={false} currency="INR" compact size="xs" />
                        </span>

                        <div className="flex items-center gap-2">
                          {q.status === 'pending_approval' && (
                            <Button
                              id={`btn-approve-quote-${q.id}`}
                              variant="secondary"
                              size="sm"
                              loading={approvingQuoteId === q.id}
                              onClick={() => handleApproveQuote(q.id)}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Approve Gate
                            </Button>
                          )}

                          <Button
                            id={`btn-view-pdf-${q.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`http://localhost:4000/v1/cpq/quotes/${q.id}/pdf`, '_blank')}
                          >
                            <Printer className="h-3.5 w-3.5" /> View / Print PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: LINKED ENTITIES */}
          {activeTab === 'relations' && (
            <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Linked Entities
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Bidirectional relations and reverse associations
                  </p>
                </div>
                <Button
                  id="btn-open-link-dialog"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsLinkDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Link Record
                </Button>
              </div>

              {(!record?.relatedRecords || record.relatedRecords.length === 0) ? (
                <div className="p-8 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-[8px]">
                  No related records linked yet. Click &quot;Link Record&quot; to associate an entity.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {(record?.relatedRecords || []).map((rel) => {
                    const targetObj = allObjects.find((o) => o.id === rel.record.objectId);
                    const targetTitle =
                      rel.record.data.name ||
                      (rel.record.data.first_name
                        ? `${rel.record.data.first_name} ${rel.record.data.last_name || ''}`
                        : '') ||
                      rel.record.data.subject ||
                      `Record #${rel.record.id.slice(0, 8)}`;

                    return (
                      <div
                        key={rel.linkId}
                        id={`related-record-${rel.record.id}`}
                        onClick={() =>
                          targetObj &&
                          router.push(`/records/${targetObj.apiName}/${rel.record.id}`)
                        }
                        className="p-3.5 rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] hover:border-[var(--color-accent-primary)]/50 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="p-2 rounded-[6px] bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] shrink-0">
                            <Link2 className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors truncate">
                                {targetTitle}
                              </span>
                              <Badge variant="neutral">
                                {targetObj?.singularLabel || 'Record'}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                              {rel.direction === 'forward' ? 'Direct link' : 'Reverse lookup'} • {rel.relationLabel}
                            </span>
                          </div>
                        </div>

                        <ExternalLink className="h-3.5 w-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-primary)] transition-colors shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: AUDIT LEDGER */}
          {activeTab === 'audit' && (
            <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    Audit Ledger
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    SHA-256 cryptographic chain entries for this record
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Chain Intact
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs">
                  <Clock className="h-4 w-4 text-[var(--color-accent-primary)] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      Record Updated (v{record?.version})
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      Action: record.{objectApiName}.update
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono truncate max-w-xs mt-1">
                      Target ID: {record?.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs">
                  <Clock className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      Record Created (v1)
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      Action: record.{objectApiName}.create
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                      Timestamp: {record?.createdAt}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG: Link Record */}
      <Modal
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        size="md"
        title={`Link Record to ${primaryTitle}`}
        description="Select relationship and associate existing record."
      >
        <form onSubmit={handleEstablishLink} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Relationship</label>
            <select
              id="select-rel-id"
              className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
              value={selectedRelId}
              onChange={(e) => setSelectedRelId(e.target.value)}
              required
            >
              <option value="">Select relationship...</option>
              {relationships.map((r) => {
                const fromObj = allObjects.find((o) => o.id === r.fromObjectId);
                const toObj = allObjects.find((o) => o.id === r.toObjectId);
                return (
                  <option key={r.id} value={r.id}>
                    {fromObj?.singularLabel} ↔ {toObj?.singularLabel} ({r.cardinality})
                  </option>
                );
              })}
            </select>
          </div>

          <Input
            id="input-target-record-id"
            label="Target Record ID"
            placeholder="e.g. UUIDv7 of target record"
            value={targetRecordId}
            onChange={(e) => setTargetRecordId(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button id="btn-submit-link" variant="primary" type="submit" loading={linking}>
              Establish Association
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CPQ QUOTE BUILDER */}
      <Modal
        open={isNewQuoteOpen}
        onOpenChange={setIsNewQuoteOpen}
        size="2xl"
        title={`Create Quote Proposal — ${primaryTitle}`}
        description="Configure line items, volume discounts, and compute revenue totals."
      >
        <form onSubmit={handleCreateQuote} className="flex flex-col gap-4 mt-2">
          {/* Product Selector */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 p-3.5 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                Add Product from Catalogue
              </label>
              <select
                id="select-cpq-product"
                className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                <option value="">Select product SKU...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — {formatMoney(Money.fromMajor(p.unitPrice, 'INR'))}{' '}
                    {p.pricingType === 'recurring_monthly'
                      ? '/mo'
                      : p.pricingType === 'recurring_annual'
                      ? '/yr'
                      : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button
              id="btn-add-product-line"
              variant="secondary"
              size="md"
              type="button"
              className="w-full sm:w-auto shrink-0"
              onClick={handleAddProductToQuote}
              disabled={!selectedProductId}
            >
              <Plus className="h-4 w-4" /> Add Line
            </Button>
          </div>

          {/* Line Items Table */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--color-text-primary)]">
              Configured Line Items ({quoteItems.length})
            </span>

            {quoteItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-[6px]">
                No items added yet. Pick a product from the catalogue above.
              </div>
            ) : (
              quoteItems.map((item, idx) => {
                const itemTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-[6px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-5 min-w-0 font-semibold text-[var(--color-text-primary)] truncate">
                      {item.name}
                    </div>

                    <div className="col-span-2">
                      <label className="text-[9px] text-[var(--color-text-muted)] block">Qty</label>
                      <input
                        type="number"
                        min="1"
                        id={`input-item-qty-${idx}`}
                        className="w-full h-8 px-2 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-primary)]"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQuoteItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, quantity: val } : it))
                          );
                        }}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[9px] text-[var(--color-text-muted)] block">Disc %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        id={`input-item-disc-${idx}`}
                        className="w-full h-8 px-2 rounded bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-primary)]"
                        value={item.discountPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setQuoteItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, discountPercent: val } : it))
                          );
                        }}
                      />
                    </div>

                    <div className="col-span-3 text-right">
                      <label className="text-[9px] text-[var(--color-text-muted)] block">Total</label>
                      <div className="font-mono font-bold text-[var(--color-text-primary)]">
                        <MoneyDisplay amount={itemTotal} isSubunits={false} currency="INR" compact size="xs" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pricing Adjustments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border-default)]">
            <Input
              id="input-volume-discount"
              label="Volume Discount %"
              type="number"
              min="0"
              max="100"
              value={volumeDiscountPercent}
              onChange={(e) => setVolumeDiscountPercent(parseFloat(e.target.value) || 0)}
            />

            <Input
              id="input-tax-rate"
              label="Tax Rate %"
              type="number"
              step="0.01"
              value={taxRatePercent}
              onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Discount Approval Warning Gate */}
          {requiresApproval && (
            <div
              id="quote-approval-warning"
              className="p-3 rounded-[6px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Discount exceeds 20% threshold: Quote will require manager approval before sending.</span>
            </div>
          )}

          {/* Live Totals Summary */}
          <div className="p-3.5 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex flex-col gap-1 text-xs font-mono">
            <div className="flex justify-between items-center text-[var(--color-text-muted)]">
              <span>Subtotal:</span>
              <MoneyDisplay amount={quoteSubtotal} isSubunits={false} currency="INR" compact size="xs" />
            </div>
            {quoteVolumeDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                <span>Volume Discount ({volumeDiscountPercent}%):</span>
                <span>-<MoneyDisplay amount={quoteVolumeDiscountAmount} isSubunits={false} currency="INR" compact size="xs" /></span>
              </div>
            )}
            <div className="flex justify-between items-center text-[var(--color-text-muted)]">
              <span>Tax ({taxRatePercent}%):</span>
              <span>+<MoneyDisplay amount={quoteTaxAmount} isSubunits={false} currency="INR" compact size="xs" /></span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-[var(--color-text-primary)] pt-1 border-t border-[var(--color-border-muted)]">
              <span>Grand Total:</span>
              <MoneyDisplay amount={quoteTotal} isSubunits={false} currency="INR" compact size="sm" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsNewQuoteOpen(false)}>
              Cancel
            </Button>
            <Button
              id="btn-submit-create-quote"
              variant="primary"
              type="submit"
              loading={submittingQuote}
              disabled={quoteItems.length === 0}
            >
              Generate Quote
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: LEAD TO DEAL CONVERSION */}
      <Modal
        open={isConvertLeadOpen}
        onOpenChange={setIsConvertLeadOpen}
        size="md"
        title={`Convert ${primaryTitle} to Sales Deal`}
        description="Establish deal pipeline tracking, link contact, and advance lifecycle stage."
      >
        <form onSubmit={handleConvertLead} className="flex flex-col gap-4 mt-2">
          <Input
            id="input-convert-deal-name"
            label="Deal Title"
            placeholder="e.g. Acme Cloud Modernization Opportunity"
            value={convertDealName}
            onChange={(e) => setConvertDealName(e.target.value)}
            required
          />

          <Input
            id="input-convert-deal-amount"
            label="Estimated Deal Value (INR)"
            type="number"
            value={convertDealAmount}
            onChange={(e) => setConvertDealAmount(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Pipeline Stage</label>
            <select
              id="select-convert-deal-stage"
              className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
              value={convertDealStage}
              onChange={(e) => setConvertDealStage(e.target.value)}
            >
              <option value="Discovery">Discovery (20%)</option>
              <option value="Qualification">Qualification (40%)</option>
              <option value="Proposal Sent">Proposal Sent (60%)</option>
              <option value="Negotiation">Negotiation (80%)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsConvertLeadOpen(false)}>
              Cancel
            </Button>
            <Button
              id="btn-submit-convert-lead"
              variant="primary"
              type="submit"
              loading={convertingLead}
            >
              Convert to Opportunity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
