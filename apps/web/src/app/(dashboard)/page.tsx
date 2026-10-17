'use client';

import * as React from 'react';
import {
  TrendingUp,
  Users,
  Coins,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  IndianRupee,
} from 'lucide-react';
import { Button, Badge, Avatar, MoneyDisplay } from '@nexus/ui';
import Link from 'next/link';

export default function DashboardHomePage() {
  const kpis = [
    {
      title: 'Total Pipeline',
      renderValue: <MoneyDisplay amount={12800000000} currency="INR" compact size="2xl" />,
      change: '+14.2% vs last month',
      icon: <IndianRupee className="h-4 w-4 text-[var(--color-accent-primary)]" />,
    },
    {
      title: 'Active Deals',
      renderValue: <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">24</span>,
      change: '6 closing this month',
      icon: <TrendingUp className="h-4 w-4 text-[var(--color-accent-primary)]" />,
    },
    {
      title: 'Avg. Win Rate',
      renderValue: <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">38.5%</span>,
      change: '+2.1% across team',
      icon: <Sparkles className="h-4 w-4 text-[var(--color-accent-primary)]" />,
    },
    {
      title: 'Contacts Engaged',
      renderValue: <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">142</span>,
      change: '18 new this week',
      icon: <Users className="h-4 w-4 text-[var(--color-accent-primary)]" />,
    },
  ];

  const recentDeals = [
    {
      name: 'Stark Enterprises Cloud Migration',
      company: 'Stark Industries',
      amountSubunits: 18000000,
      currency: 'INR',
      stage: 'Negotiation',
      stageVariant: 'warning' as const,
      owner: 'Arthur Dent',
    },
    {
      name: 'Wayne Corp Security Audit',
      company: 'Wayne Enterprises',
      amountSubunits: 9500000,
      currency: 'INR',
      stage: 'Proposal Sent',
      stageVariant: 'info' as const,
      owner: 'Arthur Dent',
    },
    {
      name: 'Cyberdyne Systems AI Pilot',
      company: 'Cyberdyne',
      amountSubunits: 24000000,
      currency: 'INR',
      stage: 'Qualified',
      stageVariant: 'accent' as const,
      owner: 'Arthur Dent',
    },
    {
      name: 'Pied Piper Compression Platform',
      company: 'Pied Piper Inc',
      amountSubunits: 6500000,
      currency: 'INR',
      stage: 'Closed Won',
      stageVariant: 'success' as const,
      owner: 'Arthur Dent',
    },
    {
      name: 'TCS Pan-India CRM Modernization',
      company: 'Tata Consultancy Services',
      amountSubunits: 12500000000,
      currency: 'INR',
      stage: 'Proposal Sent',
      stageVariant: 'info' as const,
      owner: 'Arthur Dent',
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Executive Sales Overview
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Real-time pipeline metrics and activity across Acme India Pvt Ltd
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/design-system">
            <Button variant="secondary" size="md">
              <Sparkles className="h-4 w-4" /> Design System
            </Button>
          </Link>
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="p-5 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] font-medium">
              <span>{kpi.title}</span>
              <div className="p-1.5 rounded-[6px] bg-[var(--color-accent-muted)]">
                {kpi.icon}
              </div>
            </div>
            <div className="mt-3">
              {kpi.renderValue}
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 flex items-center gap-1 font-medium">
                <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-status-success-text)]" />
                {kpi.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid: Recent Deals + Quick Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals Table */}
        <div className="lg:col-span-2 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                High Priority Deals
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Deals scheduled to close in the current fiscal year
              </p>
            </div>
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)] text-xs text-[var(--color-text-muted)] font-medium">
                  <th className="py-2.5 px-3">Opportunity</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-3">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-muted)]">
                {recentDeals.map((deal, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-[var(--color-bg-subtle)] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-medium text-[var(--color-text-primary)]">
                      {deal.name}
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-secondary)]">
                      {deal.company}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-[var(--color-text-primary)]">
                      <MoneyDisplay amount={deal.amountSubunits} currency={deal.currency} size="sm" compact />
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={deal.stageVariant}>{deal.stage}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Timeline Feed */}
        <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm p-5 flex flex-col">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
            Recent Activity
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Automatic capture & meeting logs
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 text-xs">
              <Avatar name="Tony Stark" size="sm" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[var(--color-text-primary)] font-medium">
                  Email received from Tony Stark
                </span>
                <span className="text-[var(--color-text-muted)]">
                  "Ready to review the terms for the cloud migration."
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" /> 12 mins ago
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <Avatar name="Bruce Wayne" size="sm" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[var(--color-text-primary)] font-medium">
                  Proposal generated & sent
                </span>
                <span className="text-[var(--color-text-muted)]">
                  Wayne Corp Security Audit Proposal v2.pdf
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" /> 2 hours ago
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <Avatar name="Sarah Connor" size="sm" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[var(--color-text-primary)] font-medium">
                  Stage changed to Qualified
                </span>
                <span className="text-[var(--color-text-muted)] flex items-center gap-1">
                  Cyberdyne Systems AI Pilot (
                  <MoneyDisplay amount={24000000} currency="INR" size="xs" compact />)
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-1 flex items-center gap-1 font-mono">
                  <Clock className="h-3 w-3" /> 5 hours ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
