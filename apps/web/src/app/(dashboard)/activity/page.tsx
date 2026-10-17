'use client';

import * as React from 'react';
import {
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Send,
  Sparkles,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  User,
  Building,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Volume2,
  Plus,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Eye,
  Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@nexus/ui';

interface Thread {
  id: string;
  workspaceId: string;
  subject: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'call';
  contactId?: string;
  companyId?: string;
  dealId?: string;
  status: 'open' | 'resolved' | 'pending';
  assignedUserId?: string;
  slaDueAt?: string;
  slaSecondsRemaining?: number;
  lastMessageAt: string;
  unreadCount: number;
  participantSummary?: string;
  snippetPreview?: string;
}

interface Message {
  id: string;
  threadId: string;
  direction: 'inbound' | 'outbound' | 'internal';
  channel: string;
  sender?: { name?: string; email?: string; phone?: string; userId?: string };
  recipients?: Array<{ name?: string; email?: string; phone?: string }>;
  subject?: string;
  bodyText: string;
  bodyHtml?: string;
  spfDkimStatus?: 'pass' | 'fail' | 'neutral' | 'none';
  isInternalNote: boolean;
  createdAt: string;
}

interface ContactDetails {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
}

interface CompanyDetails {
  id: string;
  name?: string;
  domain?: string;
  industry?: string;
}

interface DealDetails {
  id: string;
  name?: string;
  amount?: number;
  stage?: string;
}

interface Preferences {
  contactId: string;
  emailOptOut: boolean;
  smsOptOut: boolean;
}

interface Snippet {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  category: string;
}

export default function UniversalInboxPage() {
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null);
  const selectedThreadIdRef = React.useRef(selectedThreadId);
  React.useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  const [activeThreadDetail, setActiveThreadDetail] = React.useState<{
    thread: Thread;
    messages: Message[];
    contact?: ContactDetails | null;
    company?: CompanyDetails | null;
    deal?: DealDetails | null;
    preferences?: Preferences;
  } | null>(null);

  // Filters & Views
  const [channelFilter, setChannelFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<'open' | 'resolved' | 'all'>('open');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [mobileView, setMobileView] = React.useState<'list' | 'detail'>('list');

  // Composer
  const [composerMode, setComposerMode] = React.useState<'email' | 'sms' | 'internal_note'>('email');
  const [composerText, setComposerText] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [snippets, setSnippets] = React.useState<Snippet[]>([]);
  const [snippetsOpen, setSnippetsOpen] = React.useState(false);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Softphone state
  const [softphoneOpen, setSoftphoneOpen] = React.useState(false);
  const [callStatus, setCallStatus] = React.useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [callSeconds, setCallSeconds] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isOnHold, setIsOnHold] = React.useState(false);
  const [currentCallId, setCurrentCallId] = React.useState<string | null>(null);
  const [callOutcome, setCallOutcome] = React.useState<'connected' | 'left_voicemail' | 'busy' | 'no_answer'>('connected');
  const [callNotes, setCallNotes] = React.useState('');

  // Call timer interval
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callStatus]);

  // Load threads
  const loadThreads = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ threads: Thread[]; totalCount: number }>('/v1/inbox/threads', {
        params: {
          channel: channelFilter !== 'all' ? channelFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery || undefined,
        },
      });
      setThreads(res.threads || []);
      if (!selectedThreadIdRef.current && res.threads && res.threads.length > 0 && res.threads[0]) {
        setSelectedThreadId(res.threads[0].id);
      }
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  }, [channelFilter, statusFilter, searchQuery]);

  // Load canned snippets
  React.useEffect(() => {
    apiFetch<Snippet[]>('/v1/inbox/snippets')
      .then((data) => setSnippets(data || []))
      .catch((e) => console.error('Failed to load snippets', e));
  }, []);

  React.useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load active thread detail
  const loadThreadDetail = React.useCallback(async (threadId: string) => {
    try {
      const data = await apiFetch<{
        thread: Thread;
        messages: Message[];
        contact?: ContactDetails | null;
        company?: CompanyDetails | null;
        deal?: DealDetails | null;
        preferences?: Preferences;
      }>(`/v1/inbox/threads/${threadId}`);
      setActiveThreadDetail(data);

      // Default composer mode to thread channel unless it's a call/whatsapp
      if (data.thread.channel === 'sms') {
        setComposerMode('sms');
      } else {
        setComposerMode('email');
      }
    } catch (err) {
      console.error('Failed to load thread detail:', err);
    }
  }, []);

  React.useEffect(() => {
    if (selectedThreadId) {
      loadThreadDetail(selectedThreadId);
    }
  }, [selectedThreadId, loadThreadDetail]);

  // Handle Send Message or Post Note
  const handleSendMessage = async () => {
    if (!selectedThreadId || !composerText.trim() || isSending) return;
    setIsSending(true);
    try {
      const isNote = composerMode === 'internal_note';
      await apiFetch(`/v1/inbox/threads/${selectedThreadId}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          bodyText: composerText,
          isInternalNote: isNote,
          channel: isNote ? 'internal_note' : composerMode,
        }),
      });
      setComposerText('');
      setActionSuccess(isNote ? 'Internal note added' : 'Message dispatched');
      setTimeout(() => setActionSuccess(null), 3000);
      await loadThreadDetail(selectedThreadId);
      await loadThreads();
    } catch (err: any) {
      alert(`Send failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle Thread Status
  const handleToggleStatus = async () => {
    if (!selectedThreadId || !activeThreadDetail) return;
    const nextStatus = activeThreadDetail.thread.status === 'open' ? 'resolved' : 'open';
    try {
      await apiFetch(`/v1/inbox/threads/${selectedThreadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setActionSuccess(`Thread marked as ${nextStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
      await loadThreadDetail(selectedThreadId);
      await loadThreads();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Insert Canned Snippet
  const handleInsertSnippet = (snippet: Snippet) => {
    const contactFirst = activeThreadDetail?.contact?.first_name || 'there';
    const companyName = activeThreadDetail?.company?.name || 'our organization';
    const dealName = activeThreadDetail?.deal?.name || 'your project';

    let substituted = snippet.body
      .replace(/{{first_name}}/g, contactFirst)
      .replace(/{{contact\.first_name}}/g, contactFirst)
      .replace(/{{company}}/g, companyName)
      .replace(/{{company\.name}}/g, companyName)
      .replace(/{{deal_name}}/g, dealName);

    setComposerText((prev) => (prev ? `${prev}\n\n${substituted}` : substituted));
    setSnippetsOpen(false);
  };

  // Start Click-to-Call
  const handleStartCall = async () => {
    if (!activeThreadDetail) return;
    const phone = activeThreadDetail.contact?.phone || '+1-212-555-0144';
    setSoftphoneOpen(true);
    setCallStatus('calling');
    setCallSeconds(0);
    setIsMuted(false);
    setIsOnHold(false);
    setCallNotes('');

    try {
      const res = await apiFetch<{ callId: string; status: string }>('/v1/telephony/calls', {
        method: 'POST',
        body: JSON.stringify({
          contactId: activeThreadDetail.contact?.id,
          dealId: activeThreadDetail.deal?.id,
          phoneNumber: phone,
        }),
      });
      setCurrentCallId(res.callId);
      setTimeout(() => {
        setCallStatus('connected');
      }, 1000);
    } catch (err: any) {
      alert(`Call failed: ${err.message}`);
      setCallStatus('idle');
      setSoftphoneOpen(false);
    }
  };

  // End Call & Open Disposition
  const handleEndCall = () => {
    setCallStatus('ended');
  };

  // Save Call Disposition
  const handleSaveCallDisposition = async () => {
    if (!currentCallId) {
      setSoftphoneOpen(false);
      return;
    }
    try {
      await apiFetch(`/v1/telephony/calls/${currentCallId}/end`, {
        method: 'POST',
        body: JSON.stringify({
          outcome: callOutcome,
          durationSeconds: callSeconds,
          notes: callNotes,
          dealId: activeThreadDetail?.deal?.id,
          contactId: activeThreadDetail?.contact?.id,
        }),
      });
      setActionSuccess('Call logged to activity timeline');
      setTimeout(() => setActionSuccess(null), 3000);
      setSoftphoneOpen(false);
      setCallStatus('idle');
      if (selectedThreadId) {
        await loadThreadDetail(selectedThreadId);
      }
    } catch (err: any) {
      alert(`Failed to save call disposition: ${err.message}`);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case 'email':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-500"><Mail className="w-3 h-3" /> Email</span>;
      case 'sms':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-green-500/10 text-green-500"><MessageSquare className="w-3 h-3" /> SMS</span>;
      case 'whatsapp':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-500"><MessageSquare className="w-3 h-3" /> WhatsApp</span>;
      case 'call':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-500"><Phone className="w-3 h-3" /> Call</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-500">{ch}</span>;
    }
  };

  return (
    <div
      data-testid="inbox-page"
      className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[var(--color-bg-canvas)]"
    >
      {/* Top Banner / Breadcrumb */}
      <div className="h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">Universal Shared Inbox</h1>
            <p className="text-xs text-[var(--color-text-secondary)]">Omnichannel Communication & Collision Detection</p>
          </div>
        </div>

        {actionSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{actionSuccess}</span>
          </div>
        )}
      </div>

      {/* Main 3-Column Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Thread List & Channel Filters */}
        <section
          aria-label="Communication Thread List"
          tabIndex={0}
          className={cn(
            'border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex flex-col shrink-0 overflow-y-auto',
            mobileView === 'detail' ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'
          )}
        >
          {/* Channel Filters */}
          <div className="p-3 border-b border-[var(--color-border-subtle)] space-y-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'sms', label: 'SMS', icon: MessageSquare },
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { id: 'call', label: 'Calls', icon: Phone },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    data-testid={`channel-filter-${c.id}`}
                    onClick={() => setChannelFilter(c.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 shrink-0',
                      channelFilter === c.id
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'bg-[var(--color-bg-canvas)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    )}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Status Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search subject or contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-[var(--color-bg-canvas)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="flex items-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] p-0.5 text-xs">
                <button
                  onClick={() => setStatusFilter('open')}
                  className={cn(
                    'px-2 py-0.5 rounded font-medium',
                    statusFilter === 'open' ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-secondary)]'
                  )}
                >
                  Open
                </button>
                <button
                  onClick={() => setStatusFilter('resolved')}
                  className={cn(
                    'px-2 py-0.5 rounded font-medium',
                    statusFilter === 'resolved' ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-xs' : 'text-[var(--color-text-secondary)]'
                  )}
                >
                  Resolved
                </button>
              </div>
            </div>
          </div>

          {/* Thread Cards */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--color-border-subtle)]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-secondary)]">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-secondary)]">No threads match your filters.</div>
            ) : (
              threads.map((t) => {
                const isSelected = t.id === selectedThreadId;
                const isSlaBreached = t.slaSecondsRemaining !== undefined && t.slaSecondsRemaining <= 0;

                return (
                  <button
                    key={t.id}
                    data-testid={`thread-item-${t.id}`}
                    onClick={() => {
                      setSelectedThreadId(t.id);
                      loadThreadDetail(t.id);
                      setMobileView('detail');
                    }}
                    className={cn(
                      'w-full text-left p-3.5 transition-colors relative flex flex-col gap-1.5 focus:outline-none',
                      isSelected
                        ? 'bg-[var(--color-primary)]/5 border-l-4 border-l-[var(--color-primary)]'
                        : 'hover:bg-[var(--color-bg-canvas)]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getChannelBadge(t.channel)}
                        <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                          {t.participantSummary || 'Customer'}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">
                        {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                      {t.subject}
                    </div>

                    <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                      {t.snippetPreview || 'No preview available'}
                    </p>

                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--color-border-subtle)]/50 text-[10px]">
                      {/* SLA Timer Badge */}
                      {t.slaDueAt && (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-medium',
                            isSlaBreached
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-amber-500/10 text-amber-500'
                          )}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>{isSlaBreached ? 'SLA Breached' : 'SLA: 45m left'}</span>
                        </span>
                      )}

                      {/* Unread indicator */}
                      {t.unreadCount > 0 && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* MIDDLE COLUMN: Active Conversation & Feed */}
        <div
          aria-label="Conversation Thread Messages"
          tabIndex={0}
          className={cn(
            'flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-canvas)]',
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          )}
        >
          {activeThreadDetail ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1.5 -ml-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-canvas)]"
                    aria-label="Back to threads list"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {activeThreadDetail.contact?.first_name?.[0] || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {activeThreadDetail.thread.subject}
                      </h2>
                      {getChannelBadge(activeThreadDetail.thread.channel)}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-medium capitalize',
                          activeThreadDetail.thread.status === 'open'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-slate-500/10 text-slate-500'
                        )}
                      >
                        {activeThreadDetail.thread.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">
                      {activeThreadDetail.thread.participantSummary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    data-testid="dnc-badge"
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                      activeThreadDetail.preferences?.smsOptOut
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-500'
                    )}
                  >
                    {activeThreadDetail.preferences?.smsOptOut ? 'DNC: Opted Out' : 'SMS: Subscribed'}
                  </span>

                  <button
                    data-testid="refresh-thread-btn"
                    onClick={() => {
                      if (selectedThreadId) loadThreadDetail(selectedThreadId);
                    }}
                    className="p-1.5 rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-canvas)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    aria-label="Refresh conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    data-testid="click-to-call-btn"
                    onClick={handleStartCall}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Call</span>
                  </button>

                  <button
                    data-testid="thread-status-toggle"
                    onClick={handleToggleStatus}
                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{activeThreadDetail.thread.status === 'open' ? 'Resolve Thread' : 'Re-open'}</span>
                  </button>
                </div>
              </div>

              {/* Collision Detection Banner */}
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-medium">Arthur Dent is currently viewing this thread</span>
              </div>

              {/* Message Feed */}
              <div
                aria-label="Messages Feed"
                tabIndex={0}
                className="flex-1 p-6 overflow-y-auto space-y-6"
              >
                {activeThreadDetail.messages.map((m) => {
                  if (m.isInternalNote) {
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span>Internal Team Note</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-[var(--color-text-primary)]">{m.sender?.name || 'Team Member'}</span>
                          </div>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                          {m.bodyText}
                        </div>
                      </div>
                    );
                  }

                  const isInbound = m.direction === 'inbound';
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'flex flex-col max-w-2xl',
                        isInbound ? 'mr-auto items-start' : 'ml-auto items-end'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1 text-xs text-[var(--color-text-secondary)]">
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {isInbound ? m.sender?.name || m.sender?.email || 'Contact' : 'Alex Rivers (You)'}
                        </span>
                        <span>·</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                        {/* SPF/DKIM verification badge for inbound email */}
                        {m.spfDkimStatus === 'pass' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-500">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>SPF/DKIM: PASS</span>
                          </span>
                        )}
                      </div>

                      <div
                        className={cn(
                          'p-4 rounded-2xl text-xs leading-relaxed space-y-2 shadow-xs border',
                          isInbound
                            ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)] rounded-tl-sm'
                            : 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] rounded-tr-sm'
                        )}
                      >
                        {m.bodyHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: m.bodyHtml }} className="prose prose-sm dark:prose-invert max-w-none" />
                        ) : (
                          <p className="whitespace-pre-wrap">{m.bodyText}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Multi-Channel Composer */}
              <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] space-y-3 shrink-0">
                {/* Channel Switcher Tabs */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-[var(--color-bg-canvas)] p-1 rounded-lg border border-[var(--color-border-subtle)] text-xs">
                    <button
                      data-testid="channel-tab-email"
                      onClick={() => setComposerMode('email')}
                      className={cn(
                        'px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5',
                        composerMode === 'email' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      )}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                    <button
                      data-testid="channel-tab-sms"
                      onClick={() => setComposerMode('sms')}
                      className={cn(
                        'px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5',
                        composerMode === 'sms' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>SMS</span>
                    </button>
                    <button
                      data-testid="channel-tab-note"
                      onClick={() => setComposerMode('internal_note')}
                      className={cn(
                        'px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5',
                        composerMode === 'internal_note' ? 'bg-amber-500 text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      )}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Internal Note</span>
                    </button>
                  </div>

                  {/* Canned Snippet Trigger */}
                  <div className="relative">
                    <button
                      data-testid="snippets-trigger-btn"
                      onClick={() => setSnippetsOpen(!snippetsOpen)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Snippets</span>
                    </button>

                    {snippetsOpen && (
                      <div className="absolute right-0 bottom-full mb-2 w-72 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-xl shadow-xl p-2 z-50 space-y-1">
                        <div className="px-2 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] border-b border-[var(--color-border-subtle)] flex items-center justify-between">
                          <span>Quick Snippets</span>
                          <span className="text-[10px] text-slate-400">Variables auto-filled</span>
                        </div>
                        {snippets.map((snip) => (
                          <button
                            key={snip.id}
                            data-testid={`snippet-item-${snip.id}`}
                            onClick={() => handleInsertSnippet(snip)}
                            className="w-full text-left p-2 rounded-lg hover:bg-[var(--color-bg-canvas)] transition-colors group"
                          >
                            <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-primary)]">
                              <span>{snip.title}</span>
                              <span className="font-mono text-[10px] text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">{snip.shortcut}</span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                              {snip.body}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* DNC warning for SMS */}
                {composerMode === 'sms' && activeThreadDetail.preferences?.smsOptOut && (
                  <div className="p-2 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Warning: Recipient has opted out of SMS messages (DNC Active). Outbound SMS will be rejected.</span>
                  </div>
                )}

                {/* Composer Textarea */}
                <div className="relative">
                  <textarea
                    data-testid="message-input"
                    rows={3}
                    placeholder={
                      composerMode === 'internal_note'
                        ? 'Type an internal note visible only to your workspace team...'
                        : composerMode === 'sms'
                        ? 'Type SMS message to contact phone...'
                        : 'Write reply to customer (supports Markdown)...'
                    }
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full p-3 text-xs rounded-xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      Press <kbd className="px-1 py-0.5 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded text-[10px]">⌘</kbd> + <kbd className="px-1 py-0.5 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded text-[10px]">Enter</kbd> to dispatch
                    </span>
                    <button
                      data-testid="send-message-btn"
                      onClick={handleSendMessage}
                      disabled={isSending || !composerText.trim()}
                      className={cn(
                        'px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all flex items-center gap-1.5',
                        composerMode === 'internal_note' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[var(--color-primary)] hover:opacity-90',
                        (isSending || !composerText.trim()) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{composerMode === 'internal_note' ? 'Post Note' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-[var(--color-text-secondary)]">
              <Inbox className="w-12 h-12 text-[var(--color-text-muted)] mb-3 opacity-40" />
              <p className="font-medium text-sm text-[var(--color-text-primary)]">No Thread Selected</p>
              <p className="mt-1">Choose a conversation from the left to view messages and history.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Contact, Company, Deal & DNC Context */}
        {activeThreadDetail && (
          <aside
            aria-label="CRM Record Context"
            tabIndex={0}
            className="hidden xl:flex w-80 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] flex-col shrink-0 overflow-y-auto p-4 space-y-5"
          >
            {/* Contact Card & Click to Call */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>Contact Info</span>
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                    activeThreadDetail.preferences?.smsOptOut
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  )}
                >
                  {activeThreadDetail.preferences?.smsOptOut ? 'DNC: Opted Out' : 'SMS: Subscribed'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] space-y-2">
                <div className="font-medium text-xs text-[var(--color-text-primary)]">
                  {activeThreadDetail.contact?.first_name} {activeThreadDetail.contact?.last_name}
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)] space-y-1">
                  <div>{activeThreadDetail.contact?.email || 'No email registered'}</div>
                  <div>{activeThreadDetail.contact?.phone || '+1-212-555-0144'}</div>
                </div>

                {/* Softphone Click-to-Call Trigger Button */}
                <button
                  data-testid="sidebar-call-btn"
                  onClick={handleStartCall}
                  className="w-full mt-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Contact (Softphone)</span>
                </button>
              </div>
            </div>

            {/* Company Card */}
            {activeThreadDetail.company && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>Company</span>
                </span>
                <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] text-xs space-y-1">
                  <div className="font-medium text-[var(--color-text-primary)]">{activeThreadDetail.company.name}</div>
                  <div className="text-[11px] text-[var(--color-text-secondary)]">{activeThreadDetail.company.domain || 'starkindustries.com'}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{activeThreadDetail.company.industry || 'Defense & Energy'}</div>
                </div>
              </div>
            )}

            {/* Deal Card */}
            {activeThreadDetail.deal && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>Associated Deal</span>
                </span>
                <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] text-xs space-y-1">
                  <div className="font-medium text-[var(--color-text-primary)]">{activeThreadDetail.deal.name}</div>
                  <div className="text-sm font-bold text-emerald-500">
                    ${(activeThreadDetail.deal.amount || 250000).toLocaleString()}
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500">
                    Stage: {activeThreadDetail.deal.stage || 'Negotiation'}
                  </div>
                </div>
              </div>
            )}

            {/* Sequences Card */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Active Drip Cadence</span>
              </span>
              <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-canvas)] text-xs space-y-1.5">
                <div className="font-medium text-[var(--color-text-primary)]">Enterprise Outbound Cadence</div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">Step 2: Architecture Q&A Follow-up</div>
                <div className="text-[10px] text-amber-500 font-medium">Exit on Reply: ACTIVE</div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* WEBRTC SOFTPHONE DIALER & DISPOSITION MODAL */}
      {softphoneOpen && (
        <div
          data-testid="softphone-modal"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-2xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Nexus WebRTC Softphone</h3>
              </div>
              {callStatus === 'ended' && (
                <button
                  onClick={() => setSoftphoneOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  aria-label="Close softphone"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Call in progress or calling */}
            {callStatus !== 'ended' ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl font-bold">
                    {activeThreadDetail?.contact?.first_name?.[0] || 'T'}
                  </div>
                  {callStatus === 'connected' && (
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[var(--color-bg-surface)]" />
                  )}
                </div>

                <div className="text-center">
                  <div className="text-base font-bold text-[var(--color-text-primary)]">
                    {activeThreadDetail?.contact?.first_name} {activeThreadDetail?.contact?.last_name}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {activeThreadDetail?.contact?.phone || '+1-212-555-0144'}
                  </div>
                  <div className="text-sm font-mono font-semibold text-emerald-500 mt-2">
                    {callStatus === 'calling' ? 'Calling...' : formatTimer(callSeconds)}
                  </div>
                </div>

                {/* Softphone In-Call Controls */}
                <div className="flex items-center gap-4 pt-4">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                      isMuted ? 'bg-amber-500 text-white' : 'bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]'
                    )}
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => setIsOnHold(!isOnHold)}
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                      isOnHold ? 'bg-amber-500 text-white' : 'bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]'
                    )}
                    aria-label={isOnHold ? 'Resume call from hold' : 'Hold call'}
                  >
                    {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </button>

                  <button
                    data-testid="end-call-btn"
                    onClick={handleEndCall}
                    className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-lg"
                    aria-label="End softphone call"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Post-Call Disposition Form */
              <div className="space-y-4">
                <div className="text-center p-3 bg-[var(--color-bg-canvas)] rounded-xl border border-[var(--color-border-subtle)]">
                  <div className="text-xs text-[var(--color-text-secondary)]">Call Finished</div>
                  <div className="text-lg font-bold font-mono text-[var(--color-text-primary)] mt-0.5">
                    Duration: {formatTimer(callSeconds)}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Call Outcome Disposition
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'connected', label: 'Connected' },
                      { id: 'left_voicemail', label: 'Left Voicemail' },
                      { id: 'busy', label: 'Busy' },
                      { id: 'no_answer', label: 'No Answer' },
                    ].map((out) => (
                      <button
                        key={out.id}
                        data-testid={`outcome-${out.id}`}
                        onClick={() => setCallOutcome(out.id as any)}
                        className={cn(
                          'p-2 rounded-lg border text-left font-medium transition-colors',
                          callOutcome === out.id
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                            : 'bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-surface)]'
                        )}
                      >
                        {out.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--color-text-primary)]">
                    Call Summary & Activity Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document discussion points and action items for timeline..."
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-[var(--color-bg-canvas)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSoftphoneOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)]"
                  >
                    Discard
                  </button>
                  <button
                    data-testid="save-call-activity-btn"
                    onClick={handleSaveCallDisposition}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)] hover:opacity-90 text-white shadow-sm"
                  >
                    Save & Log to Timeline
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
