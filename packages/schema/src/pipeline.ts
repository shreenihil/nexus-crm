import { z } from "zod";

export const pipelineStageSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Stage name is required"),
  stageOrder: z.number().int().nonnegative(),
  winProbability: z.number().min(0).max(100),
  rottingDaysThreshold: z.number().int().positive().default(14),
  color: z.string().default("#6366f1"),
});

export type PipelineStage = z.infer<typeof pipelineStageSchema>;

export const pipelineSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1, "Pipeline name is required"),
  isDefault: z.boolean().default(true),
  stages: z.array(pipelineStageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Pipeline = z.infer<typeof pipelineSchema>;

export const stageTransitionSchema = z.object({
  dealId: z.string(),
  fromStage: z.string(),
  toStage: z.string(),
  transitionedAt: z.string(),
  userId: z.string().optional(),
});

export type StageTransition = z.infer<typeof stageTransitionSchema>;

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "discovery",
    name: "Discovery",
    stageOrder: 0,
    winProbability: 20,
    rottingDaysThreshold: 14,
    color: "#3b82f6",
  },
  {
    id: "qualification",
    name: "Qualification",
    stageOrder: 1,
    winProbability: 40,
    rottingDaysThreshold: 14,
    color: "#8b5cf6",
  },
  {
    id: "proposal",
    name: "Proposal Sent",
    stageOrder: 2,
    winProbability: 60,
    rottingDaysThreshold: 10,
    color: "#06b6d4",
  },
  {
    id: "negotiation",
    name: "Negotiation",
    stageOrder: 3,
    winProbability: 80,
    rottingDaysThreshold: 7,
    color: "#f59e0b",
  },
  {
    id: "closed_won",
    name: "Closed Won",
    stageOrder: 4,
    winProbability: 100,
    rottingDaysThreshold: 999,
    color: "#10b981",
  },
  {
    id: "closed_lost",
    name: "Closed Lost",
    stageOrder: 5,
    winProbability: 0,
    rottingDaysThreshold: 999,
    color: "#ef4444",
  },
];

/**
 * Checks whether a deal has been rotting in its current stage beyond threshold.
 */
export function isDealRotting(daysInStage: number, threshold: number): boolean {
  if (threshold >= 999) return false; // Won/Lost do not rot
  return daysInStage > threshold;
}

/**
 * Calculates the total and weighted pipeline values for a collection of deals.
 */
export function calculatePipelineMetrics(
  deals: Array<{ amount: number; stage: string }>,
  stages: PipelineStage[] = DEFAULT_PIPELINE_STAGES,
): {
  totalAmount: number;
  weightedAmount: number;
  dealCount: number;
  stageBreakdown: Record<
    string,
    { count: number; amount: number; weightedAmount: number }
  >;
} {
  let totalAmount = 0;
  let weightedAmount = 0;
  const stageBreakdown: Record<
    string,
    { count: number; amount: number; weightedAmount: number }
  > = {};

  for (const s of stages) {
    stageBreakdown[s.name] = { count: 0, amount: 0, weightedAmount: 0 };
  }

  for (const deal of deals) {
    const amt = Number(deal.amount) || 0;
    totalAmount += amt;

    const matchedStage = stages.find(
      (s) => s.name.toLowerCase() === (deal.stage || "").toLowerCase(),
    );
    const prob = matchedStage ? matchedStage.winProbability : 50;
    const weighted = amt * (prob / 100);
    weightedAmount += weighted;

    const stageKey = matchedStage ? matchedStage.name : deal.stage;
    if (!stageBreakdown[stageKey]) {
      stageBreakdown[stageKey] = { count: 0, amount: 0, weightedAmount: 0 };
    }
    stageBreakdown[stageKey]!.count += 1;
    stageBreakdown[stageKey]!.amount += amt;
    stageBreakdown[stageKey]!.weightedAmount += weighted;
  }

  return {
    totalAmount,
    weightedAmount,
    dealCount: deals.length,
    stageBreakdown,
  };
}
