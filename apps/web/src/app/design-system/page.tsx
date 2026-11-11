"use client";

import * as React from "react";
import Link from "next/link";
import {
  Button,
  Input,
  Badge,
  Kbd,
  Avatar,
  ThemeSwitcher,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  MoneyDisplay,
} from "@nexus/ui";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  ArrowLeft,
  Mail,
  Search,
  Check,
  Send,
  Trash2,
} from "lucide-react";

export default function DesignSystemGalleryPage() {
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState(
    "Opportunity moved to Closed Won",
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const colors = [
    {
      name: "Canvas Background",
      token: "var(--color-bg-canvas)",
      text: "Default app background",
    },
    {
      name: "Surface Background",
      token: "var(--color-bg-surface)",
      text: "Card & panel surface",
    },
    {
      name: "Subtle Background",
      token: "var(--color-bg-subtle)",
      text: "Secondary/hover surface",
    },
    {
      name: "Elevated Background",
      token: "var(--color-bg-elevated)",
      text: "Elevated popovers & menus",
    },
    {
      name: "Text Primary",
      token: "var(--color-text-primary)",
      text: "Headings & primary copy",
    },
    {
      name: "Text Secondary",
      token: "var(--color-text-secondary)",
      text: "Body labels & descriptions",
    },
    {
      name: "Text Muted",
      token: "var(--color-text-muted)",
      text: "Timestamps & placeholders",
    },
    {
      name: "Border Default",
      token: "var(--color-border-default)",
      text: "Card & divider borders",
    },
    {
      name: "Border Focus",
      token: "var(--color-border-focus)",
      text: "High-visibility focus ring",
    },
    {
      name: "Accent Primary",
      token: "var(--color-accent-primary)",
      text: "Active brand CTA",
    },
  ];

  return (
    <ToastProvider swipeDirection="right">
      <main className="min-h-screen bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] p-4 sm:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border-default)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
                </Link>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2.5">
                <Sparkles className="h-7 w-7 text-[var(--color-accent-primary)]" />
                Nexus Design System
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Living component showcase & token engine with instant theme,
                accent, and density switching.
              </p>
            </div>

            <div className="w-full sm:w-auto">
              <ThemeSwitcher />
            </div>
          </div>

          {/* Section 1: Semantic Tokens & Contrast */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Semantic Color Tokens & WCAG 2.2 AA Contrast
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {colors.map((c, i) => (
                <div
                  key={i}
                  className="p-3 rounded-[8px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm flex flex-col justify-between"
                >
                  <div
                    className="h-10 w-full rounded-[6px] border border-[var(--color-border-default)] mb-2"
                    style={{ backgroundColor: c.token }}
                  />
                  <div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] block">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)] block font-mono">
                      {c.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 2: Buttons & States */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Buttons & Interaction States
            </h2>
            <div className="p-6 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="danger">
                  <Trash2 className="h-4 w-4" /> Delete Record
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--color-border-muted)]">
                <Button variant="primary" loading>
                  Saving Changes...
                </Button>
                <Button variant="secondary" disabled>
                  Disabled State
                </Button>
                <Button variant="primary" size="sm">
                  Small Button
                </Button>
                <Button variant="primary" size="lg">
                  Large Button
                </Button>
                <Button variant="secondary" size="icon" aria-label="Send Email">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* Section 3: Inputs & Form Controls */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Inputs & Form Controls
            </h2>
            <div className="p-6 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-5">
              <Input
                label="Company Domain"
                placeholder="acme.com"
                prefixIcon={<Search className="h-4 w-4" />}
                helperText="Primary domain for identity resolution"
              />
              <Input
                label="Billing Email"
                type="email"
                placeholder="billing@acme.com"
                prefixIcon={<Mail className="h-4 w-4" />}
                required
              />
              <Input
                label="Deal ARR"
                defaultValue="invalid_number"
                error="Must be a valid integer currency amount"
              />
            </div>
          </section>

          {/* Section 4: Badges & Keyboard Shortcuts */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Badges (Color-Blind Safe) & Shortcuts
            </h2>
            <div className="p-6 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge
                  variant="success"
                  icon={<CheckCircle className="h-3 w-3" />}
                >
                  Closed Won
                </Badge>
                <Badge
                  variant="warning"
                  icon={<AlertTriangle className="h-3 w-3" />}
                >
                  Under Review
                </Badge>
                <Badge
                  variant="danger"
                  icon={<AlertCircle className="h-3 w-3" />}
                >
                  Payment Past Due
                </Badge>
                <Badge variant="info" icon={<Info className="h-3 w-3" />}>
                  Contract Sent
                </Badge>
                <Badge variant="accent">Enterprise Plan</Badge>
                <Badge variant="neutral">Draft</Badge>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-text-muted)] font-medium">
                  Keyboard Shortcuts:
                </span>
                <div className="flex items-center gap-1.5">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Kbd>G</Kbd>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    then
                  </span>
                  <Kbd>D</Kbd>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Avatars & Feedback Components */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Dialogs & Toast Notifications
            </h2>
            <div className="p-6 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm flex flex-wrap items-center gap-4">
              {/* Dialog Demo */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open Confirmation Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Workspace Deletion</DialogTitle>
                    <DialogDescription>
                      This will archive all contacts, deals, and records for 30
                      days before permanent deletion.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="secondary"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setDialogOpen(false)}
                    >
                      Confirm Archive
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Toast Demo */}
              <Button
                variant="primary"
                onClick={() => {
                  setToastOpen(false);
                  setTimeout(() => setToastOpen(true), 50);
                }}
              >
                Trigger Undo Toast
              </Button>

              <Toast
                open={toastOpen}
                onOpenChange={setToastOpen}
                variant="success"
              >
                <div className="flex flex-col gap-1">
                  <ToastTitle className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[var(--color-status-success-text)]" />
                    Deal Status Updated
                  </ToastTitle>
                  <ToastDescription>{toastMessage}</ToastDescription>
                </div>
                <ToastAction
                  altText="Undo deal move"
                  onClick={() => {
                    alert("Action undone successfully!");
                    setToastOpen(false);
                  }}
                >
                  Undo
                </ToastAction>
                <ToastClose />
              </Toast>

              {/* Avatar Demo */}
              <div className="flex items-center gap-2 ml-auto">
                <Avatar name="Sarah Connor" size="sm" />
                <Avatar name="John Matrix" size="md" />
                <Avatar name="Ellen Ripley" size="lg" />
              </div>
            </div>
          </section>

          {/* Section 6: Density Table Demo */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Data Density: Comfortable vs Compact View
            </h2>
            <div className="rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] text-xs text-[var(--color-text-muted)] font-semibold">
                    <th className="py-2.5 px-4">Contact</th>
                    <th className="py-2.5 px-4">Organization</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">ARR</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-muted)]">
                  {[
                    {
                      name: "K. Krithivasan",
                      org: "Tata Consultancy Services",
                      role: "CEO",
                      amountSubunits: 12500000000,
                      currency: "INR",
                      status: "Closed Won",
                      v: "success" as const,
                    },
                    {
                      name: "Salil Parekh",
                      org: "Infosys BPM Ltd",
                      role: "CEO & MD",
                      amountSubunits: 4800000000,
                      currency: "INR",
                      status: "Proposal",
                      v: "info" as const,
                    },
                    {
                      name: "C. P. Gurnani",
                      org: "Tech Mahindra Ltd",
                      role: "Director",
                      amountSubunits: 3600000000,
                      currency: "INR",
                      status: "Negotiation",
                      v: "warning" as const,
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-[var(--color-bg-subtle)] transition-colors"
                    >
                      <td className="py-[var(--density-cell-py)] px-[var(--density-cell-px)] font-medium text-[var(--color-text-primary)]">
                        {row.name}
                      </td>
                      <td className="py-[var(--density-cell-py)] px-[var(--density-cell-px)] text-[var(--color-text-secondary)]">
                        {row.org}
                      </td>
                      <td className="py-[var(--density-cell-py)] px-[var(--density-cell-px)] text-[var(--color-text-muted)]">
                        {row.role}
                      </td>
                      <td className="py-[var(--density-cell-py)] px-[var(--density-cell-px)] font-mono font-semibold text-[var(--color-text-primary)]">
                        <MoneyDisplay
                          amount={row.amountSubunits}
                          currency={row.currency}
                          compact
                          size="sm"
                        />
                      </td>
                      <td className="py-[var(--density-cell-py)] px-[var(--density-cell-px)]">
                        <Badge variant={row.v}>{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 7: Sovereign Multi-Currency & India-First Showcase (§4.7) */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] text-xs font-black">
                    ₹
                  </span>
                  Sovereign Currency Engine & India-First Formatting (§4.7)
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Integer minor units, Indian Lakh/Crore digit grouping, compact
                  forms, in-words generation, and ISO-4217 pinning.
                </p>
              </div>
              <Badge variant="accent">Rule 8 Enforced</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Indian Lakh/Crore Standard & Compact */}
              <div className="p-5 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm flex flex-col gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Indian Lakh / Crore Formats
                </span>
                <div className="flex flex-col gap-2">
                  <div>
                    <span className="text-xs text-[var(--color-text-muted)] block">
                      Standard Digit Grouping:
                    </span>
                    <MoneyDisplay amount={123456750} currency="INR" size="xl" />
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border-muted)]">
                    <span className="text-xs text-[var(--color-text-muted)] block">
                      Compact Crore Notation:
                    </span>
                    <MoneyDisplay
                      amount={25000000000}
                      currency="INR"
                      compact
                      size="lg"
                    />
                  </div>
                  <div className="pt-2 border-t border-[var(--color-border-muted)]">
                    <span className="text-xs text-[var(--color-text-muted)] block">
                      Compact Lakh Notation:
                    </span>
                    <MoneyDisplay
                      amount={125000000}
                      currency="INR"
                      compact
                      size="lg"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Legal In-Words Generation */}
              <div className="p-5 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm flex flex-col gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Indian Legal &quot;In Words&quot; Generator
                </span>
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-[var(--color-text-muted)] block">
                    Amount with Legal Words:
                  </span>
                  <MoneyDisplay
                    amount={123456750}
                    currency="INR"
                    showWords
                    size="lg"
                  />
                  <div className="pt-2 border-t border-[var(--color-border-muted)]">
                    <span className="text-xs text-[var(--color-text-muted)] block">
                      Small Amount with Paise:
                    </span>
                    <MoneyDisplay
                      amount={54325}
                      currency="INR"
                      showWords
                      size="md"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Pinned Multi-Currency Portfolio */}
              <div className="p-5 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm flex flex-col gap-3">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Pinned Global Currencies (ISO-4217)
                </span>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded border border-[var(--color-border-muted)] bg-[var(--color-bg-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] block font-mono">
                      INR (Default)
                    </span>
                    <MoneyDisplay amount={50000000} currency="INR" size="sm" />
                  </div>
                  <div className="p-2 rounded border border-[var(--color-border-muted)] bg-[var(--color-bg-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] block font-mono">
                      USD
                    </span>
                    <MoneyDisplay amount={150000000} currency="USD" size="sm" />
                  </div>
                  <div className="p-2 rounded border border-[var(--color-border-muted)] bg-[var(--color-bg-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] block font-mono">
                      EUR
                    </span>
                    <MoneyDisplay amount={8500000} currency="EUR" size="sm" />
                  </div>
                  <div className="p-2 rounded border border-[var(--color-border-muted)] bg-[var(--color-bg-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] block font-mono">
                      AED
                    </span>
                    <MoneyDisplay amount={45000000} currency="AED" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <ToastViewport />
    </ToastProvider>
  );
}
