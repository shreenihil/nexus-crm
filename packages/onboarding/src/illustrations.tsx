import * as React from 'react';

export function DataModelSvg({ className = "w-full h-44" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="20" y="30" width="160" height="140" rx="10" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1.5" />
      <rect x="20" y="30" width="160" height="32" rx="10" fill="var(--color-bg-subtle)" />
      <path d="M20 62H180" stroke="var(--color-border-default)" strokeWidth="1.5" />
      <circle cx="38" cy="46" r="5" fill="var(--color-accent-primary)" />
      <rect x="52" y="42" width="70" height="8" rx="4" fill="var(--color-text-primary)" />
      <rect x="36" y="78" width="128" height="6" rx="3" fill="var(--color-border-strong)" />
      <rect x="36" y="98" width="90" height="6" rx="3" fill="var(--color-border-default)" />
      <rect x="36" y="118" width="110" height="6" rx="3" fill="var(--color-border-default)" />
      <rect x="36" y="138" width="80" height="6" rx="3" fill="var(--color-accent-muted)" />

      {/* Linking Polymorphic Edge */}
      <path d="M180 90 C 205 90, 205 90, 225 90" stroke="var(--color-accent-primary)" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="205" cy="90" r="4" fill="var(--color-accent-primary)" />

      {/* Target Table */}
      <rect x="225" y="30" width="155" height="140" rx="10" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1.5" />
      <rect x="225" y="30" width="155" height="32" rx="10" fill="var(--color-bg-subtle)" />
      <path d="M225 62H380" stroke="var(--color-border-default)" strokeWidth="1.5" />
      <circle cx="243" cy="46" r="5" fill="var(--color-accent-secondary, #3b82f6)" />
      <rect x="257" y="42" width="60" height="8" rx="4" fill="var(--color-text-primary)" />
      <rect x="241" y="78" width="120" height="6" rx="3" fill="var(--color-border-strong)" />
      <rect x="241" y="98" width="85" height="6" rx="3" fill="var(--color-border-default)" />
      <rect x="241" y="118" width="105" height="6" rx="3" fill="var(--color-border-default)" />
      <rect x="241" y="138" width="70" height="6" rx="3" fill="var(--color-border-muted)" />
    </svg>
  );
}

export function KanbanPipelineSvg({ className = "w-full h-44" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Column 1 */}
      <rect x="20" y="25" width="105" height="150" rx="8" fill="var(--color-bg-subtle)" stroke="var(--color-border-muted)" strokeWidth="1" />
      <rect x="30" y="35" width="55" height="6" rx="3" fill="var(--color-text-secondary)" />
      <rect x="28" y="52" width="89" height="42" rx="6" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1" />
      <rect x="36" y="62" width="60" height="6" rx="3" fill="var(--color-text-primary)" />
      <rect x="36" y="74" width="40" height="5" rx="2.5" fill="var(--color-accent-primary)" />

      {/* Column 2 (Active Stage) */}
      <rect x="145" y="25" width="110" height="150" rx="8" fill="var(--color-bg-subtle)" stroke="var(--color-accent-muted)" strokeWidth="1.5" />
      <rect x="155" y="35" width="65" height="6" rx="3" fill="var(--color-accent-primary)" />
      
      {/* Dragging / Active Card with Shadow */}
      <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))">
        <rect x="153" y="52" width="94" height="46" rx="6" fill="var(--color-bg-surface)" stroke="var(--color-accent-primary)" strokeWidth="1.5" />
        <rect x="163" y="63" width="70" height="6" rx="3" fill="var(--color-text-primary)" />
        <rect x="163" y="75" width="45" height="6" rx="3" fill="var(--color-accent-primary)" />
      </g>
      <rect x="153" y="108" width="94" height="42" rx="6" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1" />

      {/* Column 3 (Won) */}
      <rect x="275" y="25" width="105" height="150" rx="8" fill="var(--color-bg-subtle)" stroke="var(--color-border-muted)" strokeWidth="1" />
      <rect x="285" y="35" width="50" height="6" rx="3" fill="var(--color-success-primary, #10b981)" />
      <rect x="283" y="52" width="89" height="42" rx="6" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1" />
      <circle cx="295" cy="73" r="5" fill="var(--color-success-primary, #10b981)" />
      <rect x="306" y="70" width="55" height="6" rx="3" fill="var(--color-text-primary)" />
    </svg>
  );
}

export function AutoCaptureSvg({ className = "w-full h-44" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Central Timeline Hub */}
      <path d="M70 100 H330" stroke="var(--color-border-default)" strokeWidth="2" strokeDasharray="6 6" />
      
      {/* Inbound Email Node */}
      <circle cx="90" cy="100" r="28" fill="var(--color-bg-surface)" stroke="var(--color-accent-primary)" strokeWidth="2" />
      <rect x="78" y="93" width="24" height="14" rx="2" stroke="var(--color-accent-primary)" strokeWidth="1.5" />
      <path d="M78 94L90 102L102 94" stroke="var(--color-accent-primary)" strokeWidth="1.5" />
      <text x="90" y="145" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10" fontFamily="sans-serif">Inbound Email</text>

      {/* Stitched Activity Hub */}
      <circle cx="200" cy="100" r="34" fill="var(--color-bg-surface)" stroke="var(--color-accent-primary)" strokeWidth="2.5" />
      <circle cx="200" cy="100" r="20" fill="var(--color-accent-subtle)" />
      <path d="M194 100L198 104L207 95" stroke="var(--color-accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="200" y="152" textAnchor="middle" fill="var(--color-text-primary)" fontWeight="bold" fontSize="11" fontFamily="sans-serif">Auto-Stitched Timeline</text>

      {/* Telephony Call Node */}
      <circle cx="310" cy="100" r="28" fill="var(--color-bg-surface)" stroke="var(--color-border-strong)" strokeWidth="2" />
      <path d="M303 93C303 93 306 97 308 97C310 97 312 95 314 97C316 99 317 103 315 105C313 107 310 108 307 106C304 104 300 99 301 96C302 94 303 93 303 93Z" fill="var(--color-accent-primary)" />
      <text x="310" y="145" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="10" fontFamily="sans-serif">Telephony & SMS</text>
    </svg>
  );
}

export function DuplicateResolutionSvg({ className = "w-full h-44" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Left Duplicate Card */}
      <rect x="40" y="45" width="130" height="100" rx="8" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1.5" />
      <rect x="52" y="58" width="65" height="7" rx="3" fill="var(--color-text-primary)" />
      <rect x="52" y="73" width="90" height="5" rx="2.5" fill="var(--color-text-muted)" />
      <rect x="52" y="86" width="75" height="5" rx="2.5" fill="var(--color-text-muted)" />
      <rect x="52" y="112" width="50" height="14" rx="4" fill="var(--color-warning-subtle, #fef3c7)" stroke="var(--color-warning-primary, #f59e0b)" strokeWidth="1" />
      <text x="77" y="122" textAnchor="middle" fill="var(--color-warning-primary, #d97706)" fontSize="8" fontWeight="bold">94% Match</text>

      {/* Comparison Engine Arrow */}
      <path d="M180 95H220" stroke="var(--color-accent-primary)" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M214 90L222 95L214 100" fill="var(--color-accent-primary)" />

      {/* Right Target / Golden Record Card */}
      <rect x="230" y="40" width="135" height="110" rx="8" fill="var(--color-bg-surface)" stroke="var(--color-accent-primary)" strokeWidth="2" />
      <rect x="242" y="54" width="75" height="7" rx="3" fill="var(--color-accent-primary)" />
      <rect x="242" y="69" width="105" height="5" rx="2.5" fill="var(--color-text-primary)" />
      <rect x="242" y="82" width="90" height="5" rx="2.5" fill="var(--color-text-muted)" />
      <rect x="242" y="95" width="80" height="5" rx="2.5" fill="var(--color-text-muted)" />
      <rect x="242" y="116" width="60" height="16" rx="4" fill="var(--color-accent-primary)" />
      <text x="272" y="127" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">Golden Record</text>
    </svg>
  );
}

export function SovereigntyAuditSvg({ className = "w-full h-44" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Shield Boundary */}
      <path d="M200 25C150 25 110 45 110 80C110 135 180 168 200 178C220 168 290 135 290 80C290 45 250 25 200 25Z" fill="var(--color-bg-surface)" stroke="var(--color-accent-primary)" strokeWidth="2" />
      <path d="M200 35C160 35 125 50 125 82C125 128 185 156 200 164C215 156 275 128 275 82C275 50 240 35 200 35Z" fill="var(--color-bg-subtle)" />
      
      {/* KMS Key & Hash Chain */}
      <circle cx="200" cy="85" r="18" fill="var(--color-accent-primary)" />
      <path d="M195 85H205M200 80V90" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <rect x="160" y="115" width="80" height="18" rx="4" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1" />
      <text x="200" y="127" textAnchor="middle" fill="var(--color-text-primary)" fontSize="8" fontFamily="monospace">SHA-256 Chain</text>
    </svg>
  );
}

export function QuoteToCashSvg({ className = "w-full h-44" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="70" y="30" width="260" height="140" rx="10" fill="var(--color-bg-surface)" stroke="var(--color-border-default)" strokeWidth="1.5" />
      <rect x="70" y="30" width="260" height="34" rx="10" fill="var(--color-bg-subtle)" />
      <path d="M70 64H330" stroke="var(--color-border-default)" strokeWidth="1.5" />
      
      {/* Header with Rupee Symbol */}
      <circle cx="95" cy="47" r="8" fill="var(--color-accent-primary)" />
      <text x="95" y="51" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">₹</text>
      <rect x="112" y="43" width="90" height="8" rx="4" fill="var(--color-text-primary)" />
      <rect x="270" y="41" width="45" height="12" rx="3" fill="var(--color-success-subtle, #d1fae5)" />
      <text x="292" y="50" textAnchor="middle" fill="var(--color-success-primary, #059669)" fontSize="8" fontWeight="bold">Approved</text>

      {/* Quote line items */}
      <rect x="90" y="80" width="120" height="6" rx="3" fill="var(--color-text-primary)" />
      <rect x="260" y="80" width="50" height="6" rx="3" fill="var(--color-text-primary)" />
      
      <rect x="90" y="98" width="100" height="6" rx="3" fill="var(--color-text-secondary)" />
      <rect x="260" y="98" width="50" height="6" rx="3" fill="var(--color-text-secondary)" />

      <path d="M90 118H310" stroke="var(--color-border-default)" strokeWidth="1" strokeDasharray="3 3" />

      {/* GST & Net Total */}
      <text x="90" y="136" fill="var(--color-text-muted)" fontSize="9">18% GST Compliance</text>
      <text x="310" y="136" textAnchor="end" fill="var(--color-accent-primary)" fontSize="11" fontWeight="bold" fontFamily="monospace">₹ 14,75,000</text>
    </svg>
  );
}
