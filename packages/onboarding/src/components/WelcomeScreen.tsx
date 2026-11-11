'use client';

import * as React from 'react';
import {
  Globe,
  IndianRupee,
  Briefcase,
  ShieldCheck,
  Building2,
  Check,
  ArrowRight,
  Layers,
  Sparkles,
  Database,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { Button, Badge } from '@nexus/ui';
import type { OnboardingRole, OnboardingTemplate, OnboardingLanguage } from '../types';

interface WelcomeScreenProps {
  onComplete: (data: {
    role: OnboardingRole;
    template: OnboardingTemplate;
    language: OnboardingLanguage;
    currency: string;
    locale: string;
  }) => void;
  onSkip: () => void;
}

export function WelcomeScreen({ onComplete, onSkip }: WelcomeScreenProps) {
  const [role, setRole] = React.useState<OnboardingRole>('admin');
  const [template, setTemplate] = React.useState<OnboardingTemplate>('b2b_saas');
  const [language, setLanguage] = React.useState<OnboardingLanguage>('en');
  const [currency] = React.useState('INR');
  const [locale] = React.useState('en-IN');

  const roles: Array<{ id: OnboardingRole; title: { en: string; hi: string }; desc: { en: string; hi: string }; icon: React.ReactNode }> = [
    {
      id: 'admin',
      title: { en: 'Founder / Administrator', hi: 'संस्थापक / प्रशासक' },
      desc: { en: 'Configure schemas, BYOK keys, automations & permissions', hi: 'स्कीमा, केएमएस कुंजियां, ऑटोमेशन और अनुमतियां कॉन्फ़िगर करें' },
      icon: <ShieldCheck className="w-5 h-5 text-[var(--color-accent-primary)]" />,
    },
    {
      id: 'sales',
      title: { en: 'Sales & Deal Lead', hi: 'सेल्स और डील लीड' },
      desc: { en: 'Manage Kanban pipelines, log calls & send quotes in ₹', hi: 'कानबान पाइपलाइन प्रबंधित करें, कॉल्स लॉग करें और ₹ में कोट्स भेजें' },
      icon: <Briefcase className="w-5 h-5 text-[var(--color-accent-primary)]" />,
    },
    {
      id: 'finance',
      title: { en: 'Finance & Operations', hi: 'वित्त और संचालन' },
      desc: { en: 'CPQ quote approvals, 18% GST invoices, multi-currency', hi: 'कोट्स अनुमोदन, 18% जीएसटी इनवॉइस और बहु-मुद्रा रिपोर्टिंग' },
      icon: <IndianRupee className="w-5 h-5 text-[var(--color-accent-primary)]" />,
    },
  ];

  const templates: Array<{ id: OnboardingTemplate; title: { en: string; hi: string }; desc: { en: string; hi: string } }> = [
    {
      id: 'b2b_saas',
      title: { en: 'B2B SaaS & Tech', hi: 'बी2बी सास और टेक' },
      desc: { en: 'Pre-configured with ARR, Churn, Tiered Pricing & Technical POC stages', hi: 'एआरआर, टियर प्राइसिंग और तकनीकी पीओसी चरणों के साथ' },
    },
    {
      id: 'agency',
      title: { en: 'Agency & Professional Services', hi: 'एजेंसी और प्रोफेशनल सर्विसेज' },
      desc: { en: 'Optimized for retainer contracts, milestone billing & client delivery', hi: 'रिटेनर अनुबंध और माइलस्टोन बिलिंग के लिए अनुकूलित' },
    },
    {
      id: 'blank',
      title: { en: 'Clean Sovereign Slate', hi: 'स्वच्छ संप्रभु स्लेट' },
      desc: { en: 'Standard 4 canonical objects with 0 business records — full DIY control', hi: '0 बिजनेस रिकॉर्ड के साथ मानक 4 ऑब्जेक्ट्स' },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-canvas)]/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border-default)] pb-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                {language === 'en'
                  ? 'Welcome to Nexus CRM'
                  : 'नेक्सस सीआरएम में आपका स्वागत है'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
              {language === 'en'
                ? 'Sovereign, multi-tenant CRM built for INR-first enterprise sales.'
                : 'रुपया (₹) प्रथम एंटरप्राइज बिक्री के लिए निर्मित संप्रभु बहु-किरायेदार सीआरएम।'}
            </p>
          </div>

          {/* Bilingual Switcher */}
          <div className="flex items-center gap-1 bg-[var(--color-bg-subtle)] p-1 rounded-lg border border-[var(--color-border-default)] text-xs">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                language === 'en'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                language === 'hi'
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              हिंदी
            </button>
          </div>
        </div>

        {/* Region & Currency Defaults Card */}
        <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--color-text-primary)] font-medium">
            <Globe className="w-4 h-4 text-[var(--color-accent-primary)]" />
            <span>
              {language === 'en' ? 'Region & Financial Defaults:' : 'क्षेत्र एवं वित्तीय मानक:'}
            </span>
            <Badge variant="accent">India (en-IN)</Badge>
            <Badge variant="success">₹ INR Lakhs/Crores</Badge>
          </div>
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {language === 'en' ? 'Fiscal Year: April – March' : 'वित्तीय वर्ष: अप्रैल - मार्च'}
          </span>
        </div>

        {/* Role Selector */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {language === 'en' ? '1. Select Your Primary Role' : '1. अपनी प्राथमिक भूमिका चुनें'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  role === r.id
                    ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)] ring-1 ring-[var(--color-accent-primary)]'
                    : 'border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-md bg-[var(--color-bg-subtle)]">{r.icon}</div>
                  {role === r.id && <Check className="w-4 h-4 text-[var(--color-accent-primary)]" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {r.title[language]}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] mt-1 line-clamp-2">
                    {r.desc[language]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Starting Template Selector */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {language === 'en' ? '2. Choose Starting Configuration' : '2. प्रारंभिक कॉन्फ़िगरेशन चुनें'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  template === t.id
                    ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)] ring-1 ring-[var(--color-accent-primary)]'
                    : 'border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t.title[language]}
                  </span>
                  {template === t.id && <Check className="w-4 h-4 text-[var(--color-accent-primary)]" />}
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  {t.desc[language]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Where does your data live? (§5.1) */}
        <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {language === 'en' ? 'Where does your data live?' : 'आपका डेटा कहाँ संग्रहीत है?'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Tier 1 / Tier 2 Ready
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                {language === 'en'
                  ? 'Self-hosted · Sovereign storage with customer-managed keys (BYOK)'
                  : 'सेल्फ-होस्टेड · संप्रभु स्टोरेज ग्राहक-प्रबंधित कुंजियों (BYOK) के साथ'}
              </p>
            </div>
          </div>
          <a
            href="/settings/platform"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
          >
            {language === 'en' ? 'View Storage SPI' : 'स्टोरेज एसपीआई देखें'}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-default)]">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            {language === 'en' ? 'Skip setup for now' : 'अभी के लिए छोड़ें'}
          </button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onComplete({ role, template, language, currency, locale })}
            className="gap-2"
          >
            <span>{language === 'en' ? 'Continue to Product Tour' : 'उत्पाद भ्रमण जारी रखें'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
