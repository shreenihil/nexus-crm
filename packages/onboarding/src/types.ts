export type OnboardingRole =
  "admin" | "sales" | "finance" | "customer_success" | "other";
export type OnboardingTemplate =
  "b2b_saas" | "agency" | "marketplace" | "real_estate" | "blank";
export type OnboardingLanguage = "en" | "hi";

export interface TourStepAction {
  type: "click" | "input" | "navigate";
  targetUrl?: string;
  expectedValue?: string;
}

export interface TourStep {
  id: string;
  targetTourId: string;
  title: {
    en: string;
    hi: string;
  };
  body: {
    en: string;
    hi: string;
  };
  placement?: "top" | "bottom" | "left" | "right";
  action?: TourStepAction;
  skippable?: boolean;
}

export interface TourDefinition {
  id: string;
  version: number;
  roles: Array<OnboardingRole | "all">;
  steps: TourStep[];
}

export interface UserOnboardingState {
  userId: string;
  workspaceId: string;
  role: OnboardingRole;
  template: OnboardingTemplate;
  currency: string;
  locale: string;
  language: OnboardingLanguage;
  showWelcome: boolean;
  showCarousel: boolean;
  activeTourId: string | null;
  currentStepIndex: number;
  completedTours: string[];
  checklist: {
    createWorkspace: boolean;
    addRecord: boolean;
    createDeal: boolean;
    connectEmail: boolean;
    testCommandPalette: boolean;
    generateQuote: boolean;
  };
  isDismissed: boolean;
  updatedAt: string;
}
