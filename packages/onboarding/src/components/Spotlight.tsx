"use client";

import * as React from "react";

interface SpotlightProps {
  targetTourId: string;
  padding?: number;
}

export function Spotlight({ targetTourId, padding = 8 }: SpotlightProps) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const updateRect = React.useCallback(() => {
    const el = document.querySelector(`[data-tour-id="${targetTourId}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
    } else {
      setRect(null);
    }
  }, [targetTourId]);

  React.useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  if (!rect) {
    // Fallback scrim if element not yet mounted
    return (
      <div className="fixed inset-0 z-40 bg-black/50 transition-opacity pointer-events-none" />
    );
  }

  const x = Math.max(0, rect.left - padding);
  const y = Math.max(0, rect.top - padding);
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  return (
    <svg
      className="fixed inset-0 z-40 w-full h-full pointer-events-none transition-all duration-200"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx="8" fill="black" />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0, 0, 0, 0.65)"
        mask="url(#spotlight-mask)"
      />
      {/* High-contrast pulsing target ring */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="8"
        fill="none"
        stroke="var(--color-accent-primary)"
        strokeWidth="2"
        className="animate-pulse"
      />
    </svg>
  );
}
