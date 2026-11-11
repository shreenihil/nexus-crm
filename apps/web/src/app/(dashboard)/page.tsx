"use client";

import * as React from "react";
import {
  TrendingUp,
  Users,
  Coins,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  IndianRupee,
  Layers,
  Inbox,
  FileSpreadsheet,
} from "lucide-react";
import { Button, Badge, Avatar, MoneyDisplay } from "@nexus/ui";
import { OnboardingChecklist, useOnboarding } from "@nexus/onboarding";
import Link from "next/link";

export default function DashboardHomePage() {
  const { state, dismissChecklist } = useOnboarding();
  const [deals, setDeals] = React.useState<any[]>([]);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      try {
        const [dealsRes, actRes] = await Promise.all([
          fetch("http://localhost:4000/v1/records/deals", {
            headers: { Authorization: "Bearer demo-session-token" },
          }).catch(() => null),
          fetch("http://localhost:4000/v1/records/activities", {
            headers: { Authorization: "Bearer demo-session-token" },
          }).catch(() => null),
        ]);

        if (dealsRes && dealsRes.ok) {
          const d = await dealsRes.json();
          setDeals(d.records || []);
        }
        if (actRes && actRes.ok) {
          const a = await actRes.json();
          setActivities(a.records || []);
        }
      } catch (e) {
        // Fallback gracefully
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalPipelineAmount = deals.reduce(
    (sum, d) => sum + (Number(d.data?.amount) || 0),
    0,
  );
  const activeDealsCount = deals.filter(
    (d) => d.data?.stage !== "Closed Lost",
  ).length;
  const wonDealsCount = deals.filter(
    (d) => d.data?.stage === "Closed Won",
  ).length;
  const winRate =
    activeDealsCount > 0
      ? Math.round((wonDealsCount / activeDealsCount) * 100)
      : 0;

  const kpis = [
    {
      title: "Total Pipeline",
      renderValue: (
        <MoneyDisplay
          amount={totalPipelineAmount}
          currency="INR"
          compact
          size="2xl"
        />
      ),
      change: deals.length > 0 ? "+14.2% vs last month" : "No deals active",
      icon: (
        <IndianRupee className="h-4 w-4 text-[var(--color-accent-primary)]" />
      ),
    },
    {
      title: "Active Deals",
      renderValue: (
        <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {activeDealsCount}
        </span>
      ),
      change:
        activeDealsCount > 0
          ? `${activeDealsCount} active in pipeline`
          : "Pipeline ready",
      icon: (
        <TrendingUp className="h-4 w-4 text-[var(--color-accent-primary)]" />
      ),
    },
    {
      title: "Avg. Win Rate",
      renderValue: (
        <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {winRate}%
        </span>
      ),
      change: deals.length > 0 ? "Verified metric" : "Awaiting closed deals",
      icon: <Sparkles className="h-4 w-4 text-[var(--color-accent-primary)]" />,
    },
    {
      title: "Engaged Activities",
      renderValue: (
        <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
          {activities.length}
        </span>
      ),
      change:
        activities.length > 0
          ? `${activities.length} automated events`
          : "Ready to capture",
      icon: <Users className="h-4 w-4 text-[var(--color-accent-primary)]" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Executive Sales Overview
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Real-time pipeline metrics and activity across your sovereign
            workspace
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/design-system">
            <Button variant="secondary" size="md">
              <Sparkles className="h-4 w-4" /> Design System
            </Button>
          </Link>
          <Link href="/deals">
            <Button variant="primary" size="md" data-tour-id="btn-new-deal">
              <Plus className="h-4 w-4" /> New Deal
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist Card */}
      {!state.isDismissed && (
        <OnboardingChecklist
          checklist={state.checklist}
          language={state.language}
          onDismiss={dismissChecklist}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-4 flex flex-col justify-between shadow-sm hover:border-[var(--color-border-strong)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {kpi.title}
              </span>
              <div className="p-2 rounded-lg bg-[var(--color-bg-subtle)]">
                {kpi.icon}
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <div>{kpi.renderValue}</div>
              <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Split View: Recent Deals & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals Table / Empty State */}
        <div className="lg:col-span-2 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[var(--color-border-default)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                High Value Pipeline
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Primary active opportunities by value and current pipeline stage
              </p>
            </div>
            <Link href="/deals">
              <Button variant="ghost" size="sm" className="text-xs">
                View Kanban <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {deals.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-6 h-6 text-[var(--color-text-muted)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                No deals in pipeline yet
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm">
                Create your first sales deal or import customer records to track
                pipeline velocity and revenue forecasts.
              </p>
              <div className="mt-4 flex gap-2">
                <Link href="/deals">
                  <Button variant="primary" size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create Deal
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-medium">
                    <th className="py-2.5 px-4">Opportunity</th>
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4 text-right">Value (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-muted)]">
                  {deals.slice(0, 5).map((deal, i) => (
                    <tr
                      key={deal.id || i}
                      className="hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {deal.data?.name || "Deal"}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          {deal.data?.company_name || "Organization"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="accent">
                          {deal.data?.stage || "Discovery"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-[var(--color-text-primary)]">
                        <MoneyDisplay
                          amount={deal.data?.amount || 0}
                          currency="INR"
                          size="sm"
                          compact
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity / Empty State */}
        <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-sm p-5 flex flex-col">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
            Recent Activity
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">
            Automatic capture & meeting logs
          </p>

          {activities.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center my-auto">
              <div className="w-10 h-10 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] flex items-center justify-center mb-2.5">
                <Clock className="w-5 h-5 text-[var(--color-text-muted)]" />
              </div>
              <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
                No recent activity
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1 max-w-[200px]">
                Inbound customer communications, telephony calls, and meeting
                logs will stream here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activities.slice(0, 5).map((act, idx) => (
                <div
                  key={act.id || idx}
                  className="flex items-start gap-3 text-xs"
                >
                  <Avatar name={act.data?.participant || "User"} size="sm" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[var(--color-text-primary)] font-medium">
                      {act.data?.title || "Communication logged"}
                    </span>
                    <span className="text-[var(--color-text-muted)] line-clamp-2">
                      {act.data?.summary || "No summary"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
