'use client';

import * as React from 'react';
import type {
  UserOnboardingState,
  OnboardingRole,
  OnboardingTemplate,
  OnboardingLanguage,
  TourDefinition,
} from '../types';
import { GENERAL_PRODUCT_TOUR } from '../tours/definitions';
import { WelcomeScreen } from '../components/WelcomeScreen';
import { OnboardingCarousel } from '../components/OnboardingCarousel';
import { Spotlight } from '../components/Spotlight';
import { CoachMark } from '../components/CoachMark';

interface OnboardingContextValue {
  state: UserOnboardingState;
  activeTour: TourDefinition | null;
  currentStepIndex: number;
  startTour: (tourId?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  setLanguage: (lang: OnboardingLanguage) => void;
  completeChecklistItem: (key: keyof UserOnboardingState['checklist']) => void;
  dismissChecklist: () => void;
  reopenChecklist: () => void;
}

const DEFAULT_STATE: UserOnboardingState = {
  userId: 'usr-demo-admin',
  workspaceId: 'ws-demo-sovereign',
  role: 'admin',
  template: 'b2b_saas',
  currency: 'INR',
  locale: 'en-IN',
  language: 'en',
  showWelcome: true,
  showCarousel: false,
  activeTourId: null,
  currentStepIndex: 0,
  completedTours: [],
  checklist: {
    createWorkspace: true,
    addRecord: false,
    createDeal: false,
    connectEmail: false,
    testCommandPalette: false,
    generateQuote: false,
  },
  isDismissed: false,
  updatedAt: new Date().toISOString(),
};

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({
  children,
  initialTour = GENERAL_PRODUCT_TOUR,
}: {
  children: React.ReactNode;
  initialTour?: TourDefinition;
}) {
  const [state, setState] = React.useState<UserOnboardingState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_onboarding_state');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return DEFAULT_STATE;
  });

  // Sync to backend / local storage
  const syncState = React.useCallback((newState: UserOnboardingState) => {
    setState(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_onboarding_state', JSON.stringify(newState));
    }
    fetch('http://localhost:4000/v1/onboarding/state', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-session-token',
      },
      body: JSON.stringify(newState),
    }).catch(() => {});
  }, []);

  const activeTour = state.activeTourId ? initialTour : null;
  const currentStep = activeTour?.steps[state.currentStepIndex] || null;

  const handleWelcomeComplete = (data: {
    role: OnboardingRole;
    template: OnboardingTemplate;
    language: OnboardingLanguage;
    currency: string;
    locale: string;
  }) => {
    syncState({
      ...state,
      role: data.role,
      template: data.template,
      language: data.language,
      currency: data.currency,
      locale: data.locale,
      showWelcome: false,
      showCarousel: true,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCarouselFinish = () => {
    syncState({
      ...state,
      showCarousel: false,
      activeTourId: initialTour.id,
      currentStepIndex: 0,
      updatedAt: new Date().toISOString(),
    });
  };

  const startTour = (tourId = initialTour.id) => {
    syncState({
      ...state,
      showWelcome: false,
      showCarousel: false,
      activeTourId: tourId,
      currentStepIndex: 0,
      updatedAt: new Date().toISOString(),
    });
  };

  const nextStep = () => {
    if (!activeTour) return;
    if (state.currentStepIndex < activeTour.steps.length - 1) {
      syncState({
        ...state,
        currentStepIndex: state.currentStepIndex + 1,
        updatedAt: new Date().toISOString(),
      });
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (state.currentStepIndex > 0) {
      syncState({
        ...state,
        currentStepIndex: state.currentStepIndex - 1,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const skipTour = () => {
    syncState({
      ...state,
      showWelcome: false,
      showCarousel: false,
      activeTourId: null,
      updatedAt: new Date().toISOString(),
    });
  };

  const completeTour = () => {
    syncState({
      ...state,
      activeTourId: null,
      completedTours: Array.from(new Set([...state.completedTours, initialTour.id])),
      updatedAt: new Date().toISOString(),
    });
  };

  const setLanguage = (lang: OnboardingLanguage) => {
    syncState({
      ...state,
      language: lang,
      updatedAt: new Date().toISOString(),
    });
  };

  const completeChecklistItem = (key: keyof UserOnboardingState['checklist']) => {
    syncState({
      ...state,
      checklist: {
        ...state.checklist,
        [key]: true,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const dismissChecklist = () => {
    syncState({
      ...state,
      isDismissed: true,
      updatedAt: new Date().toISOString(),
    });
  };

  const reopenChecklist = () => {
    syncState({
      ...state,
      isDismissed: false,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        activeTour,
        currentStepIndex: state.currentStepIndex,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        setLanguage,
        completeChecklistItem,
        dismissChecklist,
        reopenChecklist,
      }}
    >
      {children}

      {/* Welcome Screen overlay */}
      {state.showWelcome && (
        <WelcomeScreen
          onComplete={handleWelcomeComplete}
          onSkip={skipTour}
        />
      )}

      {/* Onboarding Carousel */}
      {state.showCarousel && (
        <OnboardingCarousel
          language={state.language}
          onFinish={handleCarouselFinish}
          onSkip={skipTour}
        />
      )}

      {/* Product Tour Spotlight & CoachMark */}
      {state.activeTourId && currentStep && (
        <>
          <Spotlight targetTourId={currentStep.targetTourId} />
          <CoachMark
            step={currentStep}
            stepIndex={state.currentStepIndex}
            totalSteps={activeTour?.steps.length || 0}
            language={state.language}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
          />
        </>
      )}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = React.useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
