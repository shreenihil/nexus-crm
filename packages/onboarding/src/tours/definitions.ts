import type { TourDefinition } from "../types";

export const GENERAL_PRODUCT_TOUR: TourDefinition = {
  id: "tour-general-overview",
  version: 1,
  roles: ["all"],
  steps: [
    {
      id: "step-nav-deals",
      targetTourId: "nav-deals",
      placement: "right",
      title: {
        en: "Visual Kanban Deal Pipeline",
        hi: "विज़ुअल कानबान डील पाइपलाइन",
      },
      body: {
        en: "Manage your active sales stages with real-time rotting detection, weighted pipeline totals, and multi-currency conversion.",
        hi: "रीयल-टाइम स्टेज मॉनिटरिंग, भारित पाइपलाइन और बहु-मुद्रा रूपांतरण के साथ अपनी बिक्री चरणों का प्रबंधन करें।",
      },
    },
    {
      id: "step-command-palette",
      targetTourId: "search-command-palette",
      placement: "bottom",
      title: {
        en: "Command Palette & Quick Search (⌘K)",
        hi: "कमांड पैलेट और त्वरित खोज (⌘K)",
      },
      body: {
        en: "Press ⌘K or Ctrl+K anywhere to jump across companies, search contacts, or trigger quick actions with sub-millisecond AST search.",
        hi: "कहीं भी ⌘K या Ctrl+K दबाकर तुरंत कंपनियों, संपर्कों को खोजें या तुरंत नई क्रियाएं प्रारंभ करें।",
      },
    },
    {
      id: "step-btn-new-deal",
      targetTourId: "btn-new-deal",
      placement: "bottom",
      title: {
        en: "Fast Record & Deal Creation",
        hi: "त्वरित रिकॉर्ड और डील निर्माण",
      },
      body: {
        en: "Create new deals with automatic organization linking and instant pipeline calculation.",
        hi: "स्वचालित संगठन लिंकिंग और तत्काल पाइपलाइन गणना के साथ नए सौदे बनाएं।",
      },
      action: {
        type: "click",
        targetUrl: "/deals",
      },
    },
    {
      id: "step-nav-duplicates",
      targetTourId: "nav-duplicates",
      placement: "right",
      title: {
        en: "Automated Deduplication & Golden Record",
        hi: "स्वचालित डुप्लीकेट पहचान और गोल्डन रिकॉर्ड",
      },
      body: {
        en: "Nexus continuously indexes records using 4 fuzzy algorithms to highlight potential duplicates and allow 1-click survivorship merges.",
        hi: "नेक्सस 4 फ़ज़ी एल्गोरिदम का उपयोग करके डुप्लीकेट की पहचान करता है और 1-क्लिक में रिकॉर्ड मर्ज करने की सुविधा देता है।",
      },
    },
    {
      id: "step-nav-automations",
      targetTourId: "nav-automations",
      placement: "right",
      title: {
        en: "DAG Workflow Engine & Webhooks",
        hi: "डीएजी वर्कफ़्लो इंजन और वेबहुक्स",
      },
      body: {
        en: "Build multi-step conditional automations with guaranteed loop prevention and dead-letter queue replaying.",
        hi: "लूप रोकथाम और डीएलक्यू रीप्ले सुरक्षा के साथ स्वचालित वर्कफ़्लो बनाएं।",
      },
    },
    {
      id: "step-nav-settings",
      targetTourId: "nav-settings",
      placement: "right",
      title: {
        en: "Sovereignty, KMS Keys & Audit Chain",
        hi: "संप्रभुता, केएमएस कुंजी और ऑडिट ट्रेल",
      },
      body: {
        en: "Full tenant encryption with customer-managed keys (BYOK) and cryptographically sealed SHA-256 tamper-evident logs.",
        hi: "ग्राहक-प्रबंधित एन्क्रिप्शन कुंजियों (BYOK) और क्रिप्टोग्राफ़िक SHA-256 छेड़छाड़-रोधी ऑडिट लॉग के साथ पूर्ण सुरक्षा।",
      },
    },
  ],
};
