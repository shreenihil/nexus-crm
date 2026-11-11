'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@nexus/ui';
import { ShieldCheck, ArrowRight, Server, Key, CheckCircle, AlertCircle, Building2, Globe } from 'lucide-react';

export default function SetupWizardPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<'checking' | 'token' | 'config' | 'done' | 'already-configured'>('checking');
  const [token, setToken] = React.useState('');
  const [instanceName, setInstanceName] = React.useState('Nexus Sovereign CRM');
  const [adminFirstName, setAdminFirstName] = React.useState('');
  const [adminLastName, setAdminLastName] = React.useState('');
  const [adminEmail, setAdminEmail] = React.useState('');
  const [adminPassword, setAdminPassword] = React.useState('');
  const [baseCurrency, setBaseCurrency] = React.useState('INR');
  const [timezone, setTimezone] = React.useState('Asia/Kolkata');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('http://localhost:4000/v1/setup/status');
        if (res.status === 404) {
          setStep('already-configured');
          return;
        }
        const data = await res.json();
        if (data.initialized) {
          setStep('already-configured');
        } else {
          setStep('token');
        }
      } catch (err) {
        setStep('token');
      }
    }
    checkStatus();
  }, []);

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4000/v1/setup/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Invalid or expired setup token');
      }
      setStep('config');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (adminPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/v1/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          instanceName,
          adminFirstName,
          adminLastName,
          adminEmail,
          adminPassword,
          baseCurrency,
          timezone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize instance');
      }

      if (data.sessionToken) {
        localStorage.setItem('nexus-token', data.sessionToken);
      }
      setStep('done');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Setup initialization failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 animate-pulse text-indigo-400" />
          <p className="text-sm font-medium">Checking instance configuration...</p>
        </div>
      </div>
    );
  }

  if (step === 'already-configured') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Instance Already Initialized</h1>
          <p className="text-sm text-slate-400">
            This Nexus CRM instance is already configured and ready for production use.
          </p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={() => router.push('/login')}
          >
            Go to Sign In <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="h-10 w-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Nexus Self-Hosted Setup</h1>
            <p className="text-xs text-slate-400">First-run instance bootstrap & sovereign credential provisioning</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'token' && (
          <form onSubmit={handleVerifyToken} className="space-y-4">
            <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2 font-medium text-slate-200">
                <Key className="h-4 w-4 text-indigo-400" />
                Console Setup Token Required
              </div>
              <p>
                Check your server logs or terminal output for the high-entropy setup token printed at startup:
              </p>
              <code className="block bg-slate-900 text-indigo-300 px-3 py-1.5 rounded font-mono text-[11px] border border-slate-800">
                NEXUS CRM SETUP TOKEN: &lt;token&gt;
              </code>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Setup Token</label>
              <Input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the 32-character token from server logs"
                required
                className="font-mono text-sm bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !token.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {loading ? 'Verifying...' : 'Verify Setup Token'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        )}

        {step === 'config' && (
          <form onSubmit={handleCompleteSetup} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" /> Instance / Primary Workspace Name
                </label>
                <Input
                  type="text"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Admin First Name</label>
                <Input
                  type="text"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  required
                  placeholder="e.g. Arun"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Admin Last Name</label>
                <Input
                  type="text"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  required
                  placeholder="e.g. Prasad"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-300">Admin Email Address</label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="admin@yourcompany.com"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-semibold text-slate-300">
                  Admin Password <span className="text-[11px] text-slate-400 font-normal">(min 12 characters)</span>
                </label>
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Choose a strong master password"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-indigo-400" /> Base Currency
                </label>
                <select
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="INR">INR (₹) - Indian Rupee (Default)</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED (د.إ) - UAE Dirham</option>
                  <option value="SGD">SGD (S$) - Singapore Dollar</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Default Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2"
            >
              {loading ? 'Initializing Instance...' : 'Complete First-Run Setup'}
              <ShieldCheck className="h-4 w-4 ml-2" />
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
            <h2 className="text-lg font-bold text-white">Setup Completed Successfully!</h2>
            <p className="text-xs text-slate-400">
              Your instance has been provisioned, standard objects seeded, and cryptographic keys generated. Redirecting to dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
