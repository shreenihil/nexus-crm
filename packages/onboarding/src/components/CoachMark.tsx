"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@nexus/ui";
import type { TourStep, OnboardingLanguage } from "../types";

interface CoachMarkProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  language?: OnboardingLanguage;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function CoachMark({
  step,
  stepIndex,
  totalSteps,
  language = "en",
  onNext,
  onPrev,
  onSkip,
}: CoachMarkProps) {
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({
    top: 120,
    left: 120,
  });

  React.useEffect(() => {
    function calculatePosition() {
      const el = document.querySelector(
        `[data-tour-id="${step.targetTourId}"]`,
      );
      if (!el) {
        setCoords({
          top: window.innerHeight / 2 - 100,
          left: window.innerWidth / 2 - 160,
        });
        return;
      }

      const rect = el.getBoundingClientRect();
      const popoverWidth = 340;
      const popoverHeight = 180;
      const margin = 12;

      let top = rect.bottom + margin;
      let left = rect.left;

      if (step.placement === "right") {
        top = Math.max(16, rect.top);
        left = rect.right + margin;
      } else if (step.placement === "bottom") {
        top = rect.bottom + margin;
        left = Math.max(16, rect.left);
      } else if (step.placement === "top") {
        top = rect.top - popoverHeight - margin;
        left = Math.max(16, rect.left);
      } else if (step.placement === "left") {
        top = Math.max(16, rect.top);
        left = rect.left - popoverWidth - margin;
      }

      // Clamping to screen boundaries
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      if (top + popoverHeight > window.innerHeight - 16) {
        top = window.innerHeight - popoverHeight - 16;
      }
      if (top < 16) top = 16;

      setCoords({ top, left });
    }

    calculatePosition();
    window.addEventListener("resize", calculatePosition);
    window.addEventListener("scroll", calculatePosition, true);
    return () => {
      window.removeEventListener("resize", calculatePosition);
      window.removeEventListener("scroll", calculatePosition, true);
    };
  }, [step]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="coachmark-title"
      style={{
        position: "fixed",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: "340px",
      }}
      className="z-50 bg-[var(--color-bg-surface)] border-2 border-[var(--color-accent-primary)] rounded-xl shadow-2xl p-4.5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent-primary)]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {language === "en"
              ? `Step ${stepIndex + 1} of ${totalSteps}`
              : `चरण ${stepIndex + 1} / ${totalSteps}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip Tour"
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <h3
          id="coachmark-title"
          className="text-sm font-bold text-[var(--color-text-primary)]"
        >
          {step.title[language]}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          {step.body[language]}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-default)]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={stepIndex === 0}
          className="text-xs h-7 px-2"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
          {language === "en" ? "Back" : "पीछे"}
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          className="text-xs h-7 px-3 gap-1"
        >
          {stepIndex === totalSteps - 1 ? (
            <>
              <span>{language === "en" ? "Finish Tour" : "समाप्त"}</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>{language === "en" ? "Next" : "आगे"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
