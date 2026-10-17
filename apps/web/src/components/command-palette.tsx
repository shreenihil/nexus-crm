'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@nexus/ui';
import {
  Search,
  TrendingUp,
  Users,
  Building2,
  GitBranch,
  ShieldCheck,
  Layers,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  Moon,
  Sun,
  Copy,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchHit {
  id: string;
  objectApiName: string;
  objectLabel: string;
  title: string;
  subtitle: string;
  href: string;
}

const STATIC_ACTIONS = [
  {
    category: 'Navigation',
    items: [
      { id: 'nav-deals', label: 'Sales Pipeline & Kanban Board', href: '/deals/board', icon: TrendingUp },
      { id: 'nav-people', label: 'People & Contacts Catalog', href: '/records/people', icon: Users },
      { id: 'nav-companies', label: 'Companies & Accounts', href: '/records/companies', icon: Building2 },
      { id: 'nav-quotes', label: 'Deals & CPQ Quotes', href: '/records/deals', icon: FileSpreadsheet },
      { id: 'nav-dedup', label: 'Deduplication Resolution Center', href: '/duplicates', icon: Copy },
      { id: 'nav-automations', label: 'Workflow Automations & Webhooks', href: '/automations', icon: GitBranch },
      { id: 'nav-schema', label: 'Schema & Custom Object Builder', href: '/settings/schema', icon: Layers },
      { id: 'nav-security', label: 'Sovereign BYOK Key Management', href: '/settings/platform', icon: ShieldCheck },
      { id: 'nav-design', label: 'Design System & Token Showroom', href: '/design-system', icon: Sparkles },
    ],
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSearchResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search fetching
  React.useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('nexus-token');
        const res = await fetch(`http://localhost:3000/api/v1/search?q=${encodeURIComponent(query.trim())}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Combine items for keyboard navigation
  const filteredNavItems = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return STATIC_ACTIONS[0]!.items;
    return STATIC_ACTIONS[0]!.items.filter((item) =>
      item.label.toLowerCase().includes(q)
    );
  }, [query]);

  const totalItems = searchResults.length + filteredNavItems.length;

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < searchResults.length) {
        const hit = searchResults[selectedIndex];
        if (hit) handleSelect(hit.href);
      } else {
        const navIdx = selectedIndex - searchResults.length;
        const nav = filteredNavItems[navIdx];
        if (nav) handleSelect(nav.href);
      }
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title="Universal Command Palette"
      description="Instant search across deals, contacts, companies and workflow actions (⌘K)"
      className="p-0 overflow-hidden"
    >
      <div className="flex flex-col" onKeyDown={handleKeyDown}>
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
          <Search className="h-5 w-5 text-[var(--color-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            id="input-command-palette-search"
            placeholder="Search records, run commands, navigate..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          {loading && (
            <div className="h-4 w-4 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-text-muted)]">
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {/* Dynamic Record Hits */}
          {searchResults.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-3 py-1 block">
                Records ({searchResults.length})
              </span>
              <div className="space-y-0.5">
                {searchResults.map((hit, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => handleSelect(hit.href)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-accent-primary)] text-white'
                          : 'hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]'
                          }`}
                        >
                          {hit.objectLabel}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold truncate">{hit.title}</span>
                          <span
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-white/80' : 'text-[var(--color-text-muted)]'
                            }`}
                          >
                            {hit.subtitle}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-75" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions & Navigation */}
          {filteredNavItems.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] px-3 py-1 block">
                Quick Navigation & Actions
              </span>
              <div className="space-y-0.5">
                {filteredNavItems.map((item, idx) => {
                  const globalIdx = searchResults.length + idx;
                  const isSelected = selectedIndex === globalIdx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.href)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-accent-primary)] text-white'
                          : 'hover:bg-[var(--color-bg-subtle)] text-[var(--color-text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-1.5 rounded-md ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-[var(--color-bg-subtle)] text-[var(--color-accent-primary)]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-white/75' : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        Jump ↵
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)]">
              No matching records or actions found for &ldquo;{query}&rdquo;.
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2 border-t border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-[var(--color-bg-surface)] px-1 py-0.5 rounded border border-[var(--color-border-default)] text-[10px]">
                ↑
              </kbd>{' '}
              <kbd className="font-mono bg-[var(--color-bg-surface)] px-1 py-0.5 rounded border border-[var(--color-border-default)] text-[10px]">
                ↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="font-mono bg-[var(--color-bg-surface)] px-1 py-0.5 rounded border border-[var(--color-border-default)] text-[10px]">
                ↵
              </kbd>{' '}
              open
            </span>
          </div>
          <span>Sovereign Omnisearch</span>
        </div>
      </div>
    </Modal>
  );
}
