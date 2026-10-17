'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Columns,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  AlignJustify,
  List,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Boxes,
  Sparkles,
  Kanban,
  AlertTriangle,
  ExternalLink,
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

interface RecordItem {
  id: string;
  data: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export default function RecordListPage() {
  const params = useParams();
  const router = useRouter();
  const objectApiName = (params.object as string) || '';

  const [objectMeta, setObjectMeta] = React.useState<ObjectMeta | null>(null);
  const [attributes, setAttributes] = React.useState<AttributeMeta[]>([]);
  const [records, setRecords] = React.useState<RecordItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Table options
  const [density, setDensity] = React.useState<'comfortable' | 'compact'>('comfortable');
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = React.useState(false);

  // New Record Dialog
  const [isNewRecordOpen, setIsNewRecordOpen] = React.useState(false);
  const [newRecordData, setNewRecordData] = React.useState<Record<string, any>>({});
  const [submittingRecord, setSubmittingRecord] = React.useState(false);
  const [duplicateWarning, setDuplicateWarning] = React.useState<{
    isDuplicate: boolean;
    score: number;
    candidateName: string;
    summary: string;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = React.useState(false);

  React.useEffect(() => {
    if (!isNewRecordOpen) {
      setDuplicateWarning(null);
      return;
    }

    const hasKeyFields =
      newRecordData.email ||
      newRecordData.phone ||
      newRecordData.name ||
      newRecordData.first_name ||
      newRecordData.domain;

    if (!hasKeyFields) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingDuplicate(true);
        const res = await apiFetch<any>('/v1/duplicates/check', {
          method: 'POST',
          body: JSON.stringify({
            entityName: objectApiName,
            data: newRecordData,
          }),
        });

        if (res.isDuplicate && res.matches && res.matches.length > 0) {
          const top = res.matches[0];
          const candidateData = top.record?.data || {};
          const candidateName =
            candidateData.name ||
            `${candidateData.first_name || ''} ${candidateData.last_name || ''}`.trim() ||
            'Existing record';

          setDuplicateWarning({
            isDuplicate: true,
            score: top.matchResult.overallScore,
            candidateName,
            summary: top.matchResult.summary,
          });
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // Silently catch background precheck errors
      } finally {
        setCheckingDuplicate(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [newRecordData, isNewRecordOpen, objectApiName]);

  // CSV Import Dialog
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [csvRawText, setCsvRawText] = React.useState('');
  const [importDryRunResult, setImportDryRunResult] = React.useState<any | null>(null);
  const [importing, setImporting] = React.useState(false);

  // Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!objectApiName) return;
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Objects to find meta
      const allObjects = await apiFetch<ObjectMeta[]>('/v1/metadata/objects');
      const found = allObjects.find((o) => o.apiName === objectApiName);
      if (!found) {
        throw new Error(`Object "${objectApiName}" not found in this workspace schema.`);
      }
      setObjectMeta(found);

      // 2. Fetch Attributes
      const attrs = await apiFetch<AttributeMeta[]>(`/v1/metadata/objects/${found.id}/attributes`);
      setAttributes(attrs);

      // 3. Fetch Records
      const res = await apiFetch<{ records: RecordItem[]; total: number }>(`/v1/records/${objectApiName}`);
      setRecords(res.records);
    } catch (err: any) {
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [objectApiName]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate TanStack columns dynamically based on schema attributes
  const columns = React.useMemo<ColumnDef<RecordItem, any>[]>(() => {
    if (attributes.length === 0) return [];

    return attributes.map((attr) => ({
      id: attr.apiName,
      accessorFn: (row: RecordItem) => row.data[attr.apiName],
      header: ({ column }: { column: any }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1.5 font-semibold text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors select-none"
        >
          <span>{attr.label}</span>
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ),
      cell: ({ getValue }: { getValue: () => any }) => {
        const val = getValue();
        if (val === undefined || val === null || val === '') {
          return <span className="text-[var(--color-text-muted)] italic text-xs">—</span>;
        }

        if (attr.type === 'currency') {
          return (
            <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
              ${Number(val).toLocaleString()}
            </span>
          );
        }

        if (attr.type === 'formula') {
          return (
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-semibold border border-[var(--color-accent-primary)]/20">
              {typeof val === 'number' ? val.toLocaleString() : String(val)}
            </span>
          );
        }

        if (attr.type === 'dropdown_single') {
          return <Badge variant="accent">{String(val)}</Badge>;
        }

        if (attr.type === 'url') {
          return (
            <a
              href={String(val)}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--color-accent-primary)] hover:underline truncate max-w-[200px] block"
              onClick={(e) => e.stopPropagation()}
            >
              {String(val)}
            </a>
          );
        }

        return <span className="text-xs text-[var(--color-text-primary)]">{String(val)}</span>;
      },
    }));
  }, [attributes]);

  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Handle New Record Submit
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRecord(true);
    setError(null);
    try {
      const created = await apiFetch<RecordItem>(`/v1/records/${objectApiName}`, {
        method: 'POST',
        body: JSON.stringify({ data: newRecordData }),
      });

      setRecords((prev) => [created, ...prev]);
      setIsNewRecordOpen(false);
      setNewRecordData({});
      setToastMessage(`Record created in ${objectMeta?.singularLabel}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to create record');
    } finally {
      setSubmittingRecord(false);
    }
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    try {
      const res = await apiFetch<{ records: Array<Record<string, any>> }>(`/v1/export/${objectApiName}`);
      if (!res.records || res.records.length === 0) {
        alert('No records available to export.');
        return;
      }

      const headers = attributes.map((a) => a.apiName);
      const csvLines = [headers.join(',')];

      for (const row of res.records) {
        const line = headers.map((h) => {
          const val = row[h];
          if (val === undefined || val === null) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvLines.push(line.join(','));
      }

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${objectApiName}-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToastMessage(`Exported ${res.records.length} records successfully.`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Handle CSV Import Dry-Run
  const handleImportDryRun = async () => {
    if (!csvRawText.trim()) return;
    setImporting(true);
    try {
      const lines = csvRawText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }

      const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const parsedRows: Array<Record<string, any>> = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i]!.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cells[idx] || '';
        });
        parsedRows.push(rowObj);
      }

      const dryRun = await apiFetch(`/v1/import/${objectApiName}/dry-run`, {
        method: 'POST',
        body: JSON.stringify({ rows: parsedRows }),
      });

      setImportDryRunResult({
        ...dryRun,
        parsedRows,
      });
    } catch (err: any) {
      alert(`Dry run error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Commit CSV Import
  const handleCommitImport = async () => {
    if (!importDryRunResult?.parsedRows) return;
    setImporting(true);
    try {
      for (const row of importDryRunResult.parsedRows) {
        await apiFetch(`/v1/records/${objectApiName}`, {
          method: 'POST',
          body: JSON.stringify({ data: row }),
        });
      }
      setIsImportOpen(false);
      setCsvRawText('');
      setImportDryRunResult(null);
      await loadData();
      setToastMessage(`Imported ${importDryRunResult.validRowsCount} records!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Import commit failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              {objectMeta?.pluralLabel || objectApiName}
            </h1>
            <Badge variant="accent">{records.length} Records</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {objectMeta?.description || `Live records catalog for ${objectMeta?.singularLabel || objectApiName}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {objectApiName === 'deals' && (
            <Button
              id="btn-switch-kanban"
              variant="secondary"
              size="sm"
              onClick={() => router.push('/deals/board')}
            >
              <Kanban className="h-4 w-4" /> Pipeline Board
            </Button>
          )}

          <Button
            id="btn-import-csv"
            variant="ghost"
            size="sm"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="h-4 w-4" /> Import CSV
          </Button>

          <Button
            id="btn-export-csv"
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>

          <Button
            id="btn-new-record"
            variant="primary"
            size="md"
            onClick={() => setIsNewRecordOpen(true)}
          >
            <Plus className="h-4 w-4" /> New {objectMeta?.singularLabel || 'Record'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {toastMessage && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border border-[var(--color-status-success-border)] flex items-center gap-2">
          <Check className="h-4 w-4" /> {toastMessage}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-[8px] text-xs font-semibold bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-border)] flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* TanStack Table Card */}
      <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm flex flex-col overflow-hidden">
        {/* Table Controls ToolBar */}
        <div className="p-3.5 border-b border-[var(--color-border-default)] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--color-bg-subtle)]">
          {/* Quick Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
            <input
              id="input-record-search"
              type="text"
              placeholder={`Search ${objectMeta?.pluralLabel || 'records'}...`}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-[6px] text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Density Toggle */}
            <div className="flex items-center rounded-[6px] border border-[var(--color-border-default)] p-0.5 bg-[var(--color-bg-surface)]">
              <button
                type="button"
                id="btn-density-comfortable"
                onClick={() => setDensity('comfortable')}
                className={`p-1.5 rounded-[4px] text-xs font-medium transition-colors ${
                  density === 'comfortable'
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
                title="Comfortable Density"
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                id="btn-density-compact"
                onClick={() => setDensity('compact')}
                className={`p-1.5 rounded-[4px] text-xs font-medium transition-colors ${
                  density === 'compact'
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-bold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
                title="Compact Density"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Column Visibility Menu */}
            <div className="relative">
              <Button
                id="btn-column-visibility"
                variant="ghost"
                size="sm"
                onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              >
                <Columns className="h-3.5 w-3.5" /> Columns
              </Button>

              {isColumnDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-[8px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl p-2 z-30 flex flex-col gap-1">
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] px-2 py-1 uppercase">
                    Toggle Columns
                  </span>
                  {table.getAllLeafColumns().map((column: any) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="rounded border-[var(--color-border-default)] text-[var(--color-accent-primary)]"
                      />
                      <span className="capitalize">{column.id.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TanStack Table Render */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup: any) => (
                <tr key={headerGroup.id} className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]/50">
                  {headerGroup.headers.map((header: any) => (
                    <th key={header.id} className="py-2.5 px-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--color-border-muted)]">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                    {loading ? 'Loading records...' : 'No records found matching your filters.'}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row: any) => (
                  <tr
                    key={row.id}
                    id={`row-${row.original.id}`}
                    onClick={() => router.push(`/records/${objectApiName}/${row.original.id}`)}
                    className="hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer group"
                  >
                    {row.getVisibleCells().map((cell: any) => (
                      <td
                        key={cell.id}
                        className={`px-3 transition-all ${
                          density === 'compact' ? 'py-1.5' : 'py-3'
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-3 border-t border-[var(--color-border-default)] flex items-center justify-between text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)]/40">
          <span>
            Showing {table.getRowModel().rows.length} of {records.length} records
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="px-2 font-mono">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount() || 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Create Record */}
      <Modal
        open={isNewRecordOpen}
        onOpenChange={setIsNewRecordOpen}
        size="lg"
        title={`New ${objectMeta?.singularLabel || 'Record'}`}
        description={`Add a new ${objectMeta?.singularLabel || 'record'} with schema validation.`}
      >
        <form onSubmit={handleCreateRecord} className="flex flex-col gap-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
          {duplicateWarning && (
            <div
              id="pre-creation-duplicate-warning"
              data-testid="pre-creation-duplicate-warning"
              className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-xs text-amber-200 flex items-start gap-2.5"
            >
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-amber-300">
                  Potential Duplicate ({duplicateWarning.score}% Match)
                </span>
                <p className="mt-0.5 text-[var(--color-text-secondary)] text-[11px]">
                  Matches existing record <strong>{duplicateWarning.candidateName}</strong> ({duplicateWarning.summary}).
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <a
                    href="/duplicates"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline font-semibold inline-flex items-center gap-1"
                  >
                    Open Resolution Center <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
          {attributes
            .filter((attr) => attr.type !== 'formula') // formulas are calculated automatically
            .map((attr) => {
              if (attr.type === 'dropdown_single') {
                return (
                  <div key={attr.id} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                      {attr.label} {attr.isRequired && <span className="text-rose-500">*</span>}
                    </label>
                    <select
                      id={`input-attr-${attr.apiName}`}
                      className="w-full min-w-0 h-10 px-3 rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] truncate"
                      value={newRecordData[attr.apiName] || ''}
                      onChange={(e) =>
                        setNewRecordData({ ...newRecordData, [attr.apiName]: e.target.value })
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
                <Input
                  key={attr.id}
                  id={`input-attr-${attr.apiName}`}
                  label={`${attr.label} ${attr.isRequired ? '*' : ''}`}
                  type={attr.type === 'number' || attr.type === 'currency' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
                  value={newRecordData[attr.apiName] || ''}
                  onChange={(e) =>
                    setNewRecordData({
                      ...newRecordData,
                      [attr.apiName]:
                        attr.type === 'number' || attr.type === 'currency'
                          ? parseFloat(e.target.value) || 0
                          : e.target.value,
                    })
                  }
                  required={attr.isRequired}
                />
              );
            })}

          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <Button variant="ghost" type="button" onClick={() => setIsNewRecordOpen(false)}>
              Cancel
            </Button>
            <Button id="btn-submit-new-record" variant="primary" type="submit" loading={submittingRecord}>
              Create Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: CSV Import Wizard */}
      <Modal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        size="xl"
        title={`Import ${objectMeta?.pluralLabel} via CSV`}
        description="Paste raw CSV text or upload to validate and batch import."
      >
        <div className="flex flex-col gap-4 mt-2">
          {!importDryRunResult ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  CSV Content (Header row matching API names required)
                </label>
                <textarea
                  id="textarea-csv-import"
                  rows={8}
                  className="w-full p-3 font-mono text-xs rounded-[6px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  placeholder={`name,industry,annual_revenue\nAcme Solar,Renewable Energy,1200000\nGlobex Corp,Manufacturing,4500000`}
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  Schema requires: {attributes.filter((a) => a.isRequired).map((a) => a.apiName).join(', ')}
                </span>
                <Button
                  id="btn-run-dryrun"
                  variant="primary"
                  size="sm"
                  onClick={handleImportDryRun}
                  loading={importing}
                >
                  <FileSpreadsheet className="h-4 w-4" /> Run Dry-Run Validation
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    Validation Summary:
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-emerald-500 font-medium">
                      ✓ {importDryRunResult.validRowsCount} Valid Rows
                    </span>
                    <span className="text-rose-500 font-medium">
                      ✗ {importDryRunResult.errorRowsCount} Error Rows
                    </span>
                  </div>
                </div>
                <Badge variant={importDryRunResult.errorRowsCount === 0 ? 'success' : 'warning'}>
                  {importDryRunResult.errorRowsCount === 0 ? 'Ready to Import' : 'Errors Detected'}
                </Badge>
              </div>

              {importDryRunResult.errors?.length > 0 && (
                <div className="max-h-36 overflow-y-auto p-2 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-xs flex flex-col gap-1 border border-rose-200 dark:border-rose-900">
                  {importDryRunResult.errors.map((err: any, idx: number) => (
                    <div key={idx}>
                      Row {err.rowIndex + 1}: {err.errors.join(', ')}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-[var(--color-border-default)]">
                <Button variant="ghost" size="sm" onClick={() => setImportDryRunResult(null)}>
                  Back
                </Button>
                <Button
                  id="btn-confirm-import"
                  variant="primary"
                  size="sm"
                  onClick={handleCommitImport}
                  loading={importing}
                  disabled={importDryRunResult.validRowsCount === 0}
                >
                  Confirm Import ({importDryRunResult.validRowsCount} rows)
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
