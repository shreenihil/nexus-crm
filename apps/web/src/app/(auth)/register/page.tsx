'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@nexus/ui';
import { Building2, User, Mail, Lock, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [workspaceName, setWorkspaceName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          workspaceName,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      localStorage.setItem('nexus-token', data.sessionId);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-bg-canvas)]">
      <div className="w-full max-w-md p-8 rounded-[12px] bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-10 w-10 rounded-[8px] bg-[var(--color-accent-primary)] text-white flex items-center justify-center font-bold text-lg mb-3 shadow-sm">
            N
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Create your Nexus CRM workspace
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Zero lock-in, programmable multi-tenant CRM
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[6px] text-xs font-medium bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-border)]">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="first-name"
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              prefixIcon={<User className="h-4 w-4" />}
              placeholder="Jane"
              required
            />
            <Input
              id="last-name"
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              required
            />
          </div>

          <Input
            id="workspace-name"
            label="Company / Workspace name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            prefixIcon={<Building2 className="h-4 w-4" />}
            placeholder="Acme Global Inc"
            required
          />

          <Input
            id="reg-email"
            label="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            prefixIcon={<Mail className="h-4 w-4" />}
            placeholder="jane@acme.com"
            required
          />

          <Input
            id="reg-password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            prefixIcon={<Lock className="h-4 w-4" />}
            placeholder="Min 12 characters"
            helperText="At least 12 characters required for enterprise security"
            required
          />

          <Button type="submit" loading={loading} className="w-full mt-2">
            Get started <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[var(--color-border-default)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>Already have an account?</span>
          <Link
            href="/login"
            className="font-medium text-[var(--color-accent-primary)] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
