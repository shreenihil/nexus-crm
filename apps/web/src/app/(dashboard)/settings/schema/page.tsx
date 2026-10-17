'use client';

import * as React from 'react';
import {
  Boxes,
  Plus,
  Layers,
  Sparkles,
  Link2,
  Table as TableIcon,
  ShieldAlert,
  Check,
  Code2,
  ArrowRight,
  Database,
  Calculator,
  Type,
  Hash,
  DollarSign,
  Calendar,
  List,
  CheckSquare,
} from 'lucide-react';
import { Button, Input, Badge, Modal } from '@nexus/ui';
import { apiFetch } from '@/lib/api';

interface ObjectMeta {
  id: string;
  apiName: string;
  singularLabel: string;
  pluralLabel: string;
  icon: string;
  color: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
}

interface AttributeMeta {
  id: string;
  objectId: string;
  apiName: string;
  label: string;
  type: string;
  isRequired: boolean;
  isUnique: boolean;
  isFilterable: boolean;
  isSortable: boolean;
  formulaDefinition?: string;
  optionsConfig?: { choices?: string[] };
}

interface RelationshipMeta {
  id: string;
  fromObjectId: string;
  toObjectId: string;
  cardinality: string;
  fromLabel: string;
  toLabel: string;
}

export default function SchemaBuilderPage() {
  const [objects, setObjects] = React.useState<ObjectMeta[]>([]);
  const [selectedObjectId, setSelectedObjectId] = React.useState<string | null>(null);
  const [attributes, setAttributes] = React.useState<AttributeMeta[]>([]);
  const [relationships, setRelationships] = React.useState<RelationshipMeta[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [isNewObjectOpen, setIsNewObjectOpen] = React.useState(false);
  const [newObjSingular, setNewObjSingular] = React.useState('');
  const [newObjPlural, setNewObjPlural] = React.useState('');
  const [newObjApiName, setNewObjApiName] = React.useState('');
  const [newObjDesc, setNewObjDesc] = React.useState('');

  const [isNewAttrOpen, setIsNewAttrOpen] = React.useState(false);
  const [newAttrLabel, setNewAttrLabel] = React.useState('');
  const [newAttrApiName, setNewAttrApiName] = React.useState('');
  const [newAttrType, setNewAttrType] = React.useState('text');
  const [newAttrRequired, setNewAttrRequired] = React.useState(false);
  const [newAttrFormula, setNewAttrFormula] = React.useState('');
  const [newAttrChoices, setNewAttrChoices] = React.useState('');

  const [isNewRelOpen, setIsNewRelOpen] = React.useState(false);
  const [relTargetObjId, setRelTargetObjId] = React.useState('');
  const [relCardinality, setRelCardinality] = React.useState<'1:1' | '1:N' | 'N:N'>('1:N');
  const [relFromLabel, setRelFromLabel] = React.useState('');
  const [relToLabel, setRelToLabel] = React.useState('');

  const [submitting, setSubmitting] = React.useState(false);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);

  const fetchObjects = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ObjectMeta[]>('/v1/metadata/objects');
      setObjects(data);
      if (data.length > 0 && !selectedObjectId) {
        setSelectedObjectId(data[0]!.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load schema objects');
    } finally {
      setLoading(false);
    }
  }, [selectedObjectId]);

  const fetchAttributes = React.useCallback(async (objId: string) => {
    try {
      const data = await apiFetch<AttributeMeta[]>(`/v1/metadata/objects/${objId}/attributes`);
      setAttributes(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const fetchRelationships = React.useCallback(async () => {
    try {
      const data = await apiFetch<RelationshipMeta[]>('/v1/metadata/relationships');
      setRelationships(data);
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    fetchObjects();
    fetchRelationships();
  }, [fetchObjects, fetchRelationships]);

  React.useEffect(() => {
    if (selectedObjectId) {
      fetchAttributes(selectedObjectId);
    }
  }, [selectedObjectId, fetchAttributes]);

  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  // Auto-generate API names from singular labels
  const handleSingularChange = (val: string) => {
    setNewObjSingular(val);
    setNewObjApiName(val.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    if (!newObjPlural) {
      setNewObjPlural(val ? `${val}s` : '');
    }
  };

  const handleAttrLabelChange = (val: string) => {
    setNewAttrLabel(val);
    setNewAttrApiName(val.toLowerCase().replace(/[^a-z0-9]/g, '_'));
  };

  // Create Custom Object
  const handleCreateObject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<ObjectMeta>('/v1/metadata/objects', {
        method: 'POST',
        body: JSON.stringify({
          singularLabel: newObjSingular,
          pluralLabel: newObjPlural,
          apiName: newObjApiName,
          description: newObjDesc,
          icon: 'Box',
          color: '#6366F1',
        }),
      });

      setObjects((prev) => [...prev, created]);
      setSelectedObjectId(created.id);
      setIsNewObjectOpen(false);
      setNewObjSingular('');
      setNewObjPlural('');
      setNewObjApiName('');
      setNewObjDesc('');
      setSuccessToast(`Custom object "${created.singularLabel}" created successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create object');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Attribute
  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObjectId) return;
    setSubmitting(true);
    setError(null);

    const payload: any = {
      label: newAttrLabel,
      apiName: newAttrApiName,
      type: newAttrType,
      isRequired: newAttrRequired,
    };

    if (newAttrType === 'formula') {
      payload.formulaDefinition = newAttrFormula;
    } else if (newAttrType === 'dropdown_single' || newAttrType === 'dropdown_multi') {
      payload.optionsConfig = {
        choices: newAttrChoices.split(',').map((c) => c.trim()).filter(Boolean),
      };
    }

    try {
      const created = await apiFetch<AttributeMeta>(`/v1/metadata/objects/${selectedObjectId}/attributes`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setAttributes((prev) => [...prev, created]);
      setIsNewAttrOpen(false);
      setNewAttrLabel('');
      setNewAttrApiName('');
      setNewAttrType('text');
      setNewAttrRequired(false);
      setNewAttrFormula('');
      setNewAttrChoices('');
      setSuccessToast(`Attribute "${created.label}" added to ${selectedObject?.singularLabel}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to add attribute');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Relationship
  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObjectId || !relTargetObjId) return;
    setSubmitting(true);
    setError(null);

    try {
      const created = await apiFetch<RelationshipMeta>('/v1/metadata/relationships', {
        method: 'POST',
        body: JSON.stringify({
          fromObjectId: selectedObjectId,
          toObjectId: relTargetObjId,
          cardinality: relCardinality,
          fromLabel: relFromLabel,
          toLabel: relToLabel,
        }),
      });

      setRelationships((prev) => [...prev, created]);
      setIsNewRelOpen(false);
      setRelTargetObjId('');
      setRelFromLabel('');
      setRelToLabel('');
      setSuccessToast('Object relationship created successfully!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create relationship');
    } finally {
      setSubmitting(false);
    }
  };

  const getAttrIcon = (type: string) => {
    switch (type) {
      case 'formula':
        return <Calculator className="h-3.5 w-3.5 text-[var(--color-accent-primary)]" />;
      case 'number':
        return <Hash className="h-3.5 w-3.5 text-blue-500" />;
      case 'currency':
        return <DollarSign className="h-3.5 w-3.5 text-emerald-500" />;
      case 'date':
      case 'datetime':
        return <Calendar className="h-3.5 w-3.5 text-amber-500" />;
      case 'dropdown_single':
      case 'dropdown_multi':
        return <List className="h-3.5 w-3.5 text-purple-500" />;
      case 'boolean':
        return <CheckSquare className="h-3.5 w-3.5 text-teal-500" />;
      default:
        return <Type className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />;
    }
  };

  const objectRelationships = relationships.filter(
    (r) => r.fromObjectId === selectedObjectId || r.toObjectId === selectedObjectId
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Schema & Object Builder
            </h1>
            <Badge variant="accent">Phase 1 Data Core</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Define custom entities, polymorphic attributes, safe formulas, and bidirectional relationships
          </p>
        </div>

        <Button
          id="btn-create-custom-object"
          variant="primary"
          size="md"
          onClick={() => setIsNewObjectOpen(true)}
        >
          <Plus className="h-4 w-4" /> New Custom Object
        </Button>
      </div>

      {/* Notifications / Errors */}
      {successToast && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-border)] flex items-center gap-2">
          <Check className="h-4 w-4" /> {successToast}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-border)] flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Main 2-Column Split View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Nav: Object Catalog */}
        <div className="md:col-span-1 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-4 shadow-sm flex flex-col gap-2 h-fit">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Entities ({objects.length})
            </span>
            <Database className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          </div>

          <div className="flex flex-col gap-1">
            {objects.map((obj) => {
              const isSelected = obj.id === selectedObjectId;
              return (
                <button
                  key={obj.id}
                  id={`obj-tab-${obj.apiName}`}
                  type="button"
                  onClick={() => setSelectedObjectId(obj.id)}
                  className={`flex items-center justify-between p-2.5 rounded-[6px] text-sm font-medium transition-all text-left ${
                    isSelected
                      ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-semibold shadow-xs'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: obj.color || 'var(--color-accent-primary)' }}
                    />
                    <span className="truncate">{obj.pluralLabel}</span>
                  </div>
                  {obj.isSystem ? (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
                      System
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)]">
                      Custom
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Object Detail & Attributes */}
        <div className="md:col-span-3 flex flex-col gap-6">
          {selectedObject ? (
            <>
              {/* Object Header Card */}
              <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className="h-12 w-12 rounded-[10px] flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0"
                    style={{ backgroundColor: selectedObject.color || '#6366f1' }}
                  >
                    <Boxes className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                        {selectedObject.singularLabel}
                      </h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
                        api_name: {selectedObject.apiName}
                      </span>
                      {selectedObject.isSystem ? (
                        <Badge variant="neutral">Standard Object</Badge>
                      ) : (
                        <Badge variant="accent">Custom Entity</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {selectedObject.description || 'Custom business data entity configured in this tenant'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    id="btn-add-attribute"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsNewAttrOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Field
                  </Button>
                  <Button
                    id="btn-add-relationship"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsNewRelOpen(true)}
                  >
                    <Link2 className="h-3.5 w-3.5" /> Link Entity
                  </Button>
                </div>
              </div>

              {/* Attributes Section */}
              <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                      Fields & Attributes ({attributes.length})
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Typed schema attributes including calculated and formula fields
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto focus:outline-none" tabIndex={0} role="region" aria-label="Attributes table">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border-default)] text-xs text-[var(--color-text-muted)] font-medium">
                        <th className="py-2.5 px-3">Field Label</th>
                        <th className="py-2.5 px-3">API Name</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Constraints</th>
                        <th className="py-2.5 px-3">Formula / Config</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-muted)]">
                      {attributes.map((attr) => (
                        <tr key={attr.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                          <td className="py-3 px-3 font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                            {getAttrIcon(attr.type)}
                            <span>{attr.label}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-[var(--color-text-secondary)]">
                            {attr.apiName}
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-xs px-2 py-0.5 rounded-[4px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] font-mono text-[var(--color-text-secondary)]">
                              {attr.type}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {attr.isRequired && (
                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                                  Required
                                </span>
                              )}
                              {attr.isUnique && (
                                <span className="text-[10px] font-semibold text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                                  Unique
                                </span>
                              )}
                              {!attr.isRequired && !attr.isUnique && (
                                <span className="text-[10px] text-[var(--color-text-muted)]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-[var(--color-text-muted)]">
                            {attr.formulaDefinition ? (
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-semibold border border-[var(--color-accent-primary)]/20">
                                {attr.formulaDefinition}
                              </span>
                            ) : attr.optionsConfig?.choices ? (
                              <span className="text-xs truncate max-w-[200px] inline-block">
                                [{attr.optionsConfig.choices.slice(0, 3).join(', ')}
                                {attr.optionsConfig.choices.length > 3 ? '...' : ''}]
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Relationships Section */}
              <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                      Entity Relationships ({objectRelationships.length})
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Bidirectional associations with cascade and reverse lookups
                    </p>
                  </div>
                </div>

                {objectRelationships.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border-default)] rounded-[8px]">
                    No explicit relationships defined for {selectedObject.singularLabel}. Click "Link Entity" to connect to another object.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {objectRelationships.map((rel) => {
                      const isSource = rel.fromObjectId === selectedObjectId;
                      const otherObj = objects.find(
                        (o) => o.id === (isSource ? rel.toObjectId : rel.fromObjectId)
                      );
                      return (
                        <div
                          key={rel.id}
                          className="p-3.5 rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-[6px] bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)]">
                              <Link2 className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                                <span>{isSource ? selectedObject.singularLabel : otherObj?.singularLabel}</span>
                                <ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]" />
                                <span>{isSource ? otherObj?.singularLabel : selectedObject.singularLabel}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                                {rel.cardinality} ({isSource ? rel.toLabel : rel.fromLabel})
                              </span>
                            </div>
                          </div>
                          <Badge variant="neutral">{rel.cardinality}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-[var(--color-text-muted)]">
              Select or create an object to view schema definition
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create Custom Object */}
      <Modal
        open={isNewObjectOpen}
        onOpenChange={setIsNewObjectOpen}
        size="md"
        title="Create Custom Object"
        description="Define a new first-class sovereign data entity for your CRM tenant."
      >
        <form onSubmit={handleCreateObject} className="flex flex-col gap-4 mt-2">
          <Input
            id="input-obj-singular"
            label="Singular Label"
            placeholder="e.g. Subscription"
            value={newObjSingular}
            onChange={(e) => handleSingularChange(e.target.value)}
            required
          />
          <Input
            id="input-obj-plural"
            label="Plural Label"
            placeholder="e.g. Subscriptions"
            value={newObjPlural}
            onChange={(e) => setNewObjPlural(e.target.value)}
            required
          />
          <Input
            id="input-obj-apiname"
            label="API Name (immutable identifier)"
            value={newObjApiName}
            onChange={(e) => setNewObjApiName(e.target.value)}
            required
          />
          <Input
            id="input-obj-desc"
            label="Description"
            placeholder="e.g. Recurring SaaS contracts and tier specifications"
            value={newObjDesc}
            onChange={(e) => setNewObjDesc(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsNewObjectOpen(false)}>
              Cancel
            </Button>
            <Button id="btn-submit-create-object" variant="primary" type="submit" loading={submitting}>
              Create Object
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Add Attribute */}
      <Modal
        open={isNewAttrOpen}
        onOpenChange={setIsNewAttrOpen}
        size="lg"
        title={`Add Field to ${selectedObject?.singularLabel}`}
        description="Add a typed attribute to this object schema."
      >
        <form onSubmit={handleCreateAttribute} className="flex flex-col gap-4 mt-2">
          <Input
            id="input-attr-label"
            label="Field Label"
            placeholder="e.g. Monthly Recurring Revenue (MRR)"
            value={newAttrLabel}
            onChange={(e) => handleAttrLabelChange(e.target.value)}
            required
          />
          <Input
            id="input-attr-apiname"
            label="API Name"
            value={newAttrApiName}
            onChange={(e) => setNewAttrApiName(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Field Type</label>
            <select
              id="select-attr-type"
              className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
              value={newAttrType}
              onChange={(e) => setNewAttrType(e.target.value)}
            >
              <option value="text">Text (Single Line)</option>
              <option value="number">Numeric Integer / Float</option>
              <option value="currency">Currency ($ USD)</option>
              <option value="date">Date</option>
              <option value="datetime">Date & Time</option>
              <option value="dropdown_single">Single Select Dropdown</option>
              <option value="formula">Calculated Formula Field</option>
              <option value="boolean">Boolean (Checkbox)</option>
            </select>
          </div>

          {newAttrType === 'formula' && (
            <div className="flex flex-col gap-1.5 p-3 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
              <label className="text-xs font-semibold text-[var(--color-accent-primary)] flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Formula AST Expression
              </label>
              <input
                id="input-attr-formula"
                type="text"
                className="h-9 px-3 rounded-[6px] font-mono text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
                placeholder="e.g. {mrr} * 12 or IF({status} == 'active', {mrr}, 0)"
                value={newAttrFormula}
                onChange={(e) => setNewAttrFormula(e.target.value)}
                required
              />
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Sandboxed recursive descent AST engine. Reference field variables inside braces <code>{`{field_name}`}</code>.
              </span>
            </div>
          )}

          {(newAttrType === 'dropdown_single' || newAttrType === 'dropdown_multi') && (
            <Input
              id="input-attr-choices"
              label="Choices (comma-separated)"
              placeholder="e.g. Trial, Active, Suspended, Cancelled"
              value={newAttrChoices}
              onChange={(e) => setNewAttrChoices(e.target.value)}
              required
            />
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              id="chk-attr-required"
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
              checked={newAttrRequired}
              onChange={(e) => setNewAttrRequired(e.target.checked)}
            />
            <label htmlFor="chk-attr-required" className="text-xs text-[var(--color-text-secondary)] font-medium">
              This field is required
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsNewAttrOpen(false)}>
              Cancel
            </Button>
            <Button id="btn-submit-add-attr" variant="primary" type="submit" loading={submitting}>
              Add Field
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Add Relationship */}
      <Modal
        open={isNewRelOpen}
        onOpenChange={setIsNewRelOpen}
        size="md"
        title={`Link ${selectedObject?.singularLabel} to Another Object`}
        description="Establish bidirectional associations across entities."
      >
        <form onSubmit={handleCreateRelationship} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Target Entity</label>
            <select
              id="select-rel-target"
              className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
              value={relTargetObjId}
              onChange={(e) => {
                const targetId = e.target.value;
                setRelTargetObjId(targetId);
                const targetObj = objects.find((o) => o.id === targetId);
                if (targetObj) {
                  setRelFromLabel(selectedObject?.singularLabel || 'Parent');
                  setRelToLabel(targetObj.pluralLabel || 'Children');
                }
              }}
              required
            >
              <option value="">Select target entity...</option>
              {objects
                .filter((o) => o.id !== selectedObjectId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.pluralLabel} ({o.apiName})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)]">Cardinality</label>
            <select
              id="select-rel-cardinality"
              className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
              value={relCardinality}
              onChange={(e) => setRelCardinality(e.target.value as any)}
            >
              <option value="1:N">1:N (One to Many)</option>
              <option value="1:1">1:1 (One to One)</option>
              <option value="N:N">N:N (Many to Many)</option>
            </select>
          </div>

          <Input
            id="input-rel-fromlabel"
            label={`Label on ${selectedObject?.singularLabel}`}
            placeholder="e.g. Company"
            value={relFromLabel}
            onChange={(e) => setRelFromLabel(e.target.value)}
            required
          />
          <Input
            id="input-rel-tolabel"
            label="Label on Target Entity"
            placeholder="e.g. Subscriptions"
            value={relToLabel}
            onChange={(e) => setRelToLabel(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsNewRelOpen(false)}>
              Cancel
            </Button>
            <Button id="btn-submit-rel" variant="primary" type="submit" loading={submitting}>
              Establish Relationship
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
