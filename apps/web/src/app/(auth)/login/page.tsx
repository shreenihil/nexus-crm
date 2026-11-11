'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Kbd } from '@nexus/ui';
import { ShieldCheck, ArrowRight, Lock, Mail, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('founder@acme.inc');
  const [password, setPassword] = React.useState('SuperSecretPassword123!');
  const [mfaCode, setMfaCode] = React.useState('');
  const [mfaTicket, setMfaTicket] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      if (data.mfaRequired) {
        setMfaTicket(data.mfaTicket);
      } else {
        localStorage.setItem('nexus-token', data.sessionId);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/v1/auth/mfa/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaTicket, token: mfaCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid 6-digit MFA code');
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
            {mfaTicket ? 'Two-Factor Authentication' : 'Sign in to Nexus CRM'}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {mfaTicket
              ? 'Enter the 6-digit TOTP code from your authenticator app'
              : 'Enter your credentials to access your workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[6px] text-xs font-medium bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger-text)] border border-[var(--color-status-danger-border)]">
            {error}
          </div>
        )}

        {!mfaTicket ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              id="login-email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              prefixIcon={<Mail className="h-4 w-4" />}
              placeholder="you@company.com"
              required
            />
            <Input
              id="login-password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              prefixIcon={<Lock className="h-4 w-4" />}
              placeholder="••••••••••••"
              required
            />
            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4">
            <Input
              id="mfa-code"
              label="6-Digit Verification Code"
              type="text"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              prefixIcon={<KeyRound className="h-4 w-4" />}
              placeholder="123456"
              autoFocus
              required
            />
            <Button type="submit" loading={loading} className="w-full mt-2">
              Verify Code <ShieldCheck className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => setMfaTicket(null)}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-center"
            >
              Back to password login
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[var(--color-border-default)] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <span>Don&apos;t have an account?</span>
          <Link
            href="/register"
            className="font-medium text-[var(--color-accent-primary)] hover:underline"
          >
            Create workspace
          </Link>
        </div>
      </div>
    </div>
  );
}
