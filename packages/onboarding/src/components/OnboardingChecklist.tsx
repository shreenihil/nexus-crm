'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  PartyPopper,
  X,
} from 'lucide-react';
import { Button } from '@nexus/ui';
import type { OnboardingLanguage } from '../types';

interface OnboardingChecklistProps {
  checklist: {
    createWorkspace: boolean;
    addRecord: boolean;
    createDeal: boolean;
    connectEmail: boolean;
    testCommandPalette: boolean;
    generateQuote: boolean;
  };
  language?: OnboardingLanguage;
  userRole?: string;
  onDismiss?: () => void;
  onItemClick?: (key: string) => void;
}

export function OnboardingChecklist({
  checklist,
  language = 'en',
  userRole = 'owner',
  onDismiss,
  onItemClick,
}: OnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const allItems = [
    {
      key: 'createWorkspace',
      title: { en: 'Sovereign Workspace Created', hi: 'संप्रभु कार्यक्षेत्र निर्मित' },
      desc: { en: 'Canonical standard objects, KMS keys & audit trail initialized', hi: 'मानक ऑब्जेक्ट्स और केएमएस कुंजियां आरंभ की गईं' },
      done: true,
      href: '/settings',
      adminOnly: true,
    },
    {
      key: 'createDeal',
      title: { en: 'Create First Sales Opportunity', hi: 'पहला बिक्री अवसर बनाएं' },
      desc: { en: 'Track deal value, stage velocity and rotting alerts in ₹ INR', hi: '₹ में सौदे के मूल्य और स्टेज गति को ट्रैक करें' },
      done: checklist.createDeal,
      href: '/deals',
    },
    {
      key: 'addRecord',
      title: { en: 'Add or Import Customer Contacts', hi: 'ग्राहक संपर्क जोड़ें या आयात करें' },
      desc: { en: 'Continuous deduplication keeps your database pristine', hi: 'निरंतर डिडुप्लीकेशन डेटाबेस को स्वच्छ रखता है' },
      done: checklist.addRecord,
      href: '/records/people',
    },
    {
      key: 'connectEmail',
      title: { en: 'Connect Communication Inbox', hi: 'संचार इनबॉक्स कनेक्ट करें' },
      desc: { en: 'Auto-stitch emails, SMS and calls into unified timelines', hi: 'ईमेल, एसएमएस और कॉल को टाइमलाइन में स्वतः जोड़ें' },
      done: checklist.connectEmail,
      href: '/inbox',
    },
    {
      key: 'testCommandPalette',
      title: { en: 'Try Command Palette (⌘K / Ctrl+K)', hi: 'कमांड पैलेट आज़माएं (⌘K / Ctrl+K)' },
      desc: { en: 'Instant AST polymorphic search across all tenant records', hi: 'सभी टेनेंट रिकॉर्ड्स में त्वरित एएसटी खोज' },
      done: checklist.testCommandPalette,
      href: '#',
    },
    {
      key: 'generateQuote',
      title: { en: 'Generate Quote with 18% GST', hi: '18% जीएसटी के साथ कोट जनरेट करें' },
      desc: { en: 'Calculate line items and generate sovereign Indian tax invoices', hi: 'कोटेशन बनाएं और कर चालान तैयार करें' },
      done: checklist.generateQuote,
      href: '/deals',
    },
  ];

  const items = allItems.filter((i) => !i.adminOnly || userRole === 'owner' || userRole === 'admin');
  const completedCount = items.filter((i) => i.done).length;
  const percentage = Math.round((completedCount / items.length) * 100);
  const isAllComplete = completedCount === items.length;

  return (
    <div className="w-full bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-xl shadow-sm overflow-hidden mb-6 transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]">
            {isAllComplete ? <PartyPopper className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-text-primary)]">
                {language === 'en' ? 'Get Started with Sovereign Nexus' : 'संप्रभु नेक्सस के साथ शुरुआत करें'}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)] font-mono font-medium">
                {completedCount} / {items.length}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {isAllComplete
                ? language === 'en' ? 'Workspace fully operational! Ready for enterprise sales.' : 'कार्यक्षेत्र पूरी तरह से तैयार है!'
                : language === 'en' ? 'Complete these foundational steps to maximize your sales pipeline.' : 'अपनी बिक्री पाइपलाइन को अधिकतम करने के लिए ये कदम उठाएं।'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[var(--color-bg-subtle)] h-1.5">
        <div
          className="bg-[var(--color-accent-primary)] h-1.5 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Items list */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => (
            <div
              key={item.key}
              className={`p-3.5 rounded-lg border flex items-start gap-3 transition-colors ${
                item.done
                  ? 'bg-[var(--color-bg-subtle)]/50 border-[var(--color-border-muted)]'
                  : 'bg-[var(--color-bg-surface)] border-[var(--color-border-default)] hover:border-[var(--color-accent-muted)]'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success-primary, #10b981)]" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--color-border-strong)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className={`text-xs font-semibold ${
                      item.done
                        ? 'line-through text-[var(--color-text-muted)]'
                        : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    {item.title[language]}
                  </h3>
                  {!item.done && (
                    <a
                      href={item.href}
                      onClick={() => onItemClick && onItemClick(item.key)}
                      className="text-[11px] font-medium text-[var(--color-accent-primary)] hover:underline flex items-center gap-0.5"
                    >
                      <span>{language === 'en' ? 'Start' : 'शुरू'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">
                  {item.desc[language]}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
