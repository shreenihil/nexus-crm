"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@nexus/ui";
import {
  DataModelSvg,
  KanbanPipelineSvg,
  AutoCaptureSvg,
  DuplicateResolutionSvg,
  SovereigntyAuditSvg,
  QuoteToCashSvg,
} from "../illustrations";
import type { OnboardingLanguage } from "../types";

interface OnboardingCarouselProps {
  language?: OnboardingLanguage;
  onFinish: () => void;
  onSkip: () => void;
}

export function OnboardingCarousel({
  language = "en",
  onFinish,
  onSkip,
}: OnboardingCarouselProps) {
  const [currentSlide, setCurrentSlide] = React.useState(0);

  const slides = [
    {
      title: {
        en: "1. Your Data, Your Way — Custom Objects & Schema Builder",
        hi: "1. आपका डेटा, आपका तरीका — कस्टम ऑब्जेक्ट्स और स्कीमा बिल्डर",
      },
      desc: {
        en: "Define polymorphic objects, relationships, and AST-powered calculated fields with sub-millisecond query evaluation.",
        hi: "पॉलीमॉर्फिक ऑब्जेक्ट्स, संबंध और उप-मिलीसेकंड फॉर्मूला फ़ील्ड्स को आसानी से परिभाषित करें।",
      },
      illustration: <DataModelSvg />,
    },
    {
      title: {
        en: "2. Pipelines That Move — Dynamic Kanban with Rotting Detection",
        hi: "2. गतिमान पाइपलाइन — रोटिंग डिटेक्शन के साथ कानबान",
      },
      desc: {
        en: "Track active opportunities with stage SLA aging, automated weighting, and real-time deal movement tracking.",
        hi: "स्टेज उम्र बढ़ने की चेतावनी और वास्तविक समय में सौदों की स्थिति पर नज़र रखें।",
      },
      illustration: <KanbanPipelineSvg />,
    },
    {
      title: {
        en: "3. Never Log an Email Again — Automated Activity Capture",
        hi: "3. मैन्युअल लॉगिंग को अलविदा — स्वचालित गतिविधि कैप्चर",
      },
      desc: {
        en: "Stitches inbound email replies, telephony phone calls, and SMS into unified chronological contact timelines.",
        hi: "आने वाले ईमेल उत्तर, फोन कॉल और एसएमएस को संपर्क टाइमलाइन में स्वचालित रूप से जोड़ें।",
      },
      illustration: <AutoCaptureSvg />,
    },
    {
      title: {
        en: "4. Clean Golden Records — 4-Algorithm Duplicate Detection",
        hi: "4. स्वच्छ गोल्डन रिकॉर्ड्स — 4-एल्गोरिदम डुप्लीकेट पहचान",
      },
      desc: {
        en: "Fuzzy matching prevents fragmented data and empowers instant survivorship merges with full rollback safety.",
        hi: "फ़ज़ी मिलान खंडित डेटा को रोकता है और तत्काल मर्जिंग और रोलबैक सुरक्षा प्रदान करता है।",
      },
      illustration: <DuplicateResolutionSvg />,
    },
    {
      title: {
        en: "5. Sovereign by Design — Customer KMS Keys & Cryptographic Audit",
        hi: "5. संप्रभुता और सुरक्षा — ग्राहक केएमएस और ऑडिट चेन",
      },
      desc: {
        en: "Zero data leakage across tenants with AES-256 envelope encryption and tamper-evident SHA-256 hash chains.",
        hi: "शून्य डेटा रिसाव, एईएस-256 एन्क्रिप्शन और क्रिप्टोग्राफ़िक रूप से सुरक्षित ऑडिट लॉग्स।",
      },
      illustration: <SovereigntyAuditSvg />,
    },
    {
      title: {
        en: "6. Quote to Cash in ₹ — INR-First & 18% GST Invoicing",
        hi: "6. कोट से कैश ₹ में — रुपया प्रथम और 18% जीएसटी इनवॉइसिंग",
      },
      desc: {
        en: "Standardized on Indian Lakhs/Crores (₹), real-time multi-currency conversions, and instant CPQ quote approvals.",
        hi: "लाख और करोड़ (₹) प्रारूप, वास्तविक समय बहु-मुद्रा रूपांतरण और त्वरित कोट स्वीकृति।",
      },
      illustration: <QuoteToCashSvg />,
    },
    {
      title: {
        en: "7. Your Data, Your Servers — True Sovereignty & Zero Lock-in",
        hi: "7. आपका डेटा, आपके सर्वर — सच्ची संप्रभुता और शून्य लॉक-इन",
      },
      desc: {
        en: "Self-host on any Linux server, edge appliance, or Kubernetes cluster with Docker Compose and Helm. 100% data portability.",
        hi: "डॉकर कंपोज़ और हेल्म के साथ किसी भी लिनक्स सर्वर पर सेल्फ-होस्ट करें। पूर्ण डेटा पोर्टेबिलिटी।",
      },
      illustration: <SovereigntyAuditSvg />,
    },
    {
      title: {
        en: "8. Plug In Your Own Backend — Effortless Storage Switching",
        hi: "8. अपना खुद का बैकएंड जोड़ें — आसान स्टोरेज स्विचिंग",
      },
      desc: {
        en: "Pluggable SPI allows hot-swapping from embedded SQLite to enterprise PostgreSQL (pgvector), S3, and Redis with one command.",
        hi: "प्लग करने योग्य एसपीआई आपको एक कमांड के साथ SQLite से PostgreSQL, S3 और Redis में माइग्रेट करने की अनुमति देता है।",
      },
      illustration: <DataModelSvg />,
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide]);

  const active = slides[currentSlide] ?? slides[0]!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nexus CRM Feature Carousel"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg-canvas)]/90 backdrop-blur-md p-4 sm:p-6"
    >
      <div className="w-full max-w-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top bar with progress dots and close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
          <div
            className="flex items-center gap-1.5"
            aria-label={`Slide ${currentSlide + 1} of ${slides.length}`}
          >
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide
                    ? "w-6 bg-[var(--color-accent-primary)]"
                    : "w-2 bg-[var(--color-border-strong)] hover:bg-[var(--color-text-muted)]"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Close carousel"
            className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-full max-w-sm mb-6 flex items-center justify-center bg-[var(--color-bg-subtle)] rounded-lg p-4 border border-[var(--color-border-muted)]">
            {active.illustration}
          </div>

          <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] tracking-tight">
            {active.title[language]}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed max-w-md">
            {active.desc[language]}
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--color-bg-subtle)] border-t border-[var(--color-border-default)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="gap-1 text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{language === "en" ? "Back" : "पीछे"}</span>
          </Button>

          <span className="text-xs font-mono text-[var(--color-text-muted)]">
            {currentSlide + 1} / {slides.length}
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            className="gap-1.5 text-xs"
          >
            {currentSlide === slides.length - 1 ? (
              <>
                <span>
                  {language === "en"
                    ? "Launch Product Tour"
                    : "उत्पाद भ्रमण शुरू करें"}
                </span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>{language === "en" ? "Next" : "आगे"}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
