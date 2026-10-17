import * as React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  Inbox,
  FileText,
  CreditCard,
  BarChart3,
  GitBranch,
  Copy,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Server,
} from 'lucide-react';
import { Kbd } from '../kbd/kbd';
import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { cn } from '../lib/utils';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface AppShellProps {
  currentPath?: string;
  workspaceName?: string;
  userName?: string;
  userEmail?: string;
  children: React.ReactNode;
  onNavigate?: (href: string) => void;
  onSearchClick?: () => void;
  onLogout?: () => void;
}

export function AppShell({
  currentPath = '/',
  workspaceName = 'Acme Corp',
  userName = 'Alex Rivers',
  userEmail = 'alex@acme.corp',
  children,
  onNavigate,
  onSearchClick,
  onLogout,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Inbox & Activity', href: '/activity', icon: <Inbox className="h-4 w-4" />, badge: 3 },
    { label: 'People', href: '/people', icon: <Users className="h-4 w-4" /> },
    { label: 'Companies', href: '/companies', icon: <Building2 className="h-4 w-4" /> },
    { label: 'Deals', href: '/deals', icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Quotes & Contracts', href: '/quotes', icon: <FileText className="h-4 w-4" /> },
    { label: 'Invoices', href: '/invoices', icon: <CreditCard className="h-4 w-4" /> },
    { label: 'Dashboards', href: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Automations', href: '/automations', icon: <GitBranch className="h-4 w-4" /> },
    { label: 'Duplicates', href: '/duplicates', icon: <Copy className="h-4 w-4" /> },
    { label: 'Platform & BYOK', href: '/settings/platform', icon: <Server className="h-4 w-4" /> },
    { label: 'Design System', href: '/design-system', icon: <Sparkles className="h-4 w-4" /> },
    { label: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(href);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] antialiased">
      {/* Desktop / Tablet Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)] transition-all duration-200 z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Workspace Brand Header */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-[var(--color-border-default)]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-7 w-7 rounded-[6px] bg-[var(--color-accent-primary)] text-white flex items-center justify-center font-bold text-sm shrink-0">
                N
              </div>
              <div className="flex flex-col truncate">
                <span className="font-semibold text-sm leading-tight truncate">{workspaceName}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">Nexus CRM</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="h-7 w-7 rounded-[6px] bg-[var(--color-accent-primary)] text-white flex items-center justify-center font-bold text-sm mx-auto">
              N
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-[4px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-[6px] text-sm font-medium transition-colors select-none w-full text-left',
                  isActive
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={cn('shrink-0', isActive ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-muted)]')}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--color-accent-primary)] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-2 border-t border-[var(--color-border-default)]">
          <div className={cn('flex items-center gap-2.5 p-1.5 rounded-[6px] hover:bg-[var(--color-bg-subtle)] transition-colors', collapsed && 'justify-center')}>
            <Avatar name={userName} size="sm" />
            {!collapsed && (
              <div className="flex flex-col flex-1 overflow-hidden text-left">
                <span className="text-xs font-semibold truncate leading-tight">{userName}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] truncate">{userEmail}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-[6px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Quick Search Trigger */}
            <button
              type="button"
              onClick={onSearchClick}
              className="flex items-center gap-2 h-9 px-3 rounded-[6px] bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-muted)] transition-colors sm:w-64"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">Search records, actions...</span>
              <Kbd>⌘K</Kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="relative p-2 rounded-[6px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-accent-primary)] ring-2 ring-[var(--color-bg-surface)]" />
            </button>
            {onLogout && (
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Sign out
              </Button>
            )}
          </div>
        </header>

        {/* Mobile Slide-down Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-2 flex flex-col gap-1 z-30 shadow-lg">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-[6px] text-sm font-medium text-left',
                  currentPath === item.href
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent-primary)] font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Page Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[var(--color-bg-canvas)]">
          {children}
        </main>
      </div>
    </div>
  );
}
