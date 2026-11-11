"use client";

import * as React from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon,
  Database,
  History,
  Palette,
  Shield,
  Key,
  Users,
  Building,
  ArrowRight,
  Sparkles,
  Server,
} from "lucide-react";
import { Button, Badge, ThemeSwitcher } from "@nexus/ui";
import { apiFetch } from "@/lib/api";

export default function SettingsHubPage() {
  const [workspaceInfo, setWorkspaceInfo] = React.useState<any>(null);
  const [userRole, setUserRole] = React.useState<string>("owner");

  React.useEffect(() => {
    apiFetch("/v1/auth/me")
      .then((data) => {
        setWorkspaceInfo(data.workspace);
        setUserRole(data.role);
      })
      .catch((err) => console.error(err));
  }, []);

  const settingCards = [
    {
      title: "Platform Sovereignty & BYOK KMS",
      description:
        "Zero-downtime AES-256-GCM envelope encryption, customer-managed keys, and 1-click portable archive exports.",
      href: "/settings/platform",
      icon: <Server className="h-5 w-5 text-indigo-500" />,
      badge: "Zero-Downtime BYOK",
    },
    {
      title: "Schema & Custom Objects",
      description:
        "Manage standard and custom data entities, typed attributes, and formula calculations.",
      href: "/settings/schema",
      icon: <Database className="h-5 w-5 text-[var(--color-accent-primary)]" />,
      badge: "Phase 1 Core",
    },
    {
      title: "Tamper-Evident Audit Ledger",
      description:
        "Inspect SHA-256 hash-chained event streams and verify cryptographic ledger integrity.",
      href: "/settings/audit",
      icon: <History className="h-5 w-5 text-emerald-500" />,
      badge: "Cryptographic Proof",
    },
    {
      title: "Appearance & Themes",
      description:
        "Configure light, dark, high-contrast modes, accent color presets, and interface density.",
      href: "/design-system",
      icon: <Palette className="h-5 w-5 text-purple-500" />,
      badge: "WCAG 2.2 AA",
    },
    {
      title: "Roles & Security",
      description:
        "3-layer authorization policies (Object, Record, Field), TOTP MFA, and session controls.",
      href: "/settings/audit",
      icon: <Shield className="h-5 w-5 text-amber-500" />,
      badge: "STRIDE Hardened",
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border-default)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
              Workspace Settings
            </h1>
            <Badge variant="accent">Tenant Management</Badge>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Configure system schemas, security policies, and interface
            customization
          </p>
        </div>
      </div>

      {/* Tenant Identity Card */}
      <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[10px] bg-[var(--color-accent-primary)] text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
            {workspaceInfo?.name?.[0] || "A"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                {workspaceInfo?.name || "Acme Corp"}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
                slug: {workspaceInfo?.slug || "acme-corp"}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Active role:{" "}
              <span className="font-semibold capitalize text-[var(--color-text-primary)]">
                {userRole}
              </span>{" "}
              (Full administrative privileges)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/settings/schema">
            <Button id="btn-settings-schema" variant="primary" size="md">
              <Database className="h-4 w-4" /> Open Schema Builder
            </Button>
          </Link>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingCards.map((card, idx) => (
          <Link key={idx} href={card.href} className="group">
            <div className="h-full p-5 rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-accent-primary)]/50 transition-all shadow-sm flex flex-col justify-between group-hover:shadow-md">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-[8px] bg-[var(--color-bg-subtle)] group-hover:bg-[var(--color-accent-muted)] transition-colors">
                    {card.icon}
                  </div>
                  <Badge variant="neutral">{card.badge}</Badge>
                </div>
                <h3 className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent-primary)] mt-4">
                <span>Configure</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Embedded Live Theme Customizer */}
      <div className="rounded-[10px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] p-6 shadow-sm flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-primary)]">
            Quick Appearance Settings
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Switch modes or select curated high-contrast and accent presets
          </p>
        </div>

        <div className="p-4 rounded-[8px] bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  );
}
