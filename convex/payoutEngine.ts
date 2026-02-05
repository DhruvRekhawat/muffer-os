import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import {
  MIN_PREVIEW_RELIABILITY_FACTOR,
  MIN_PREVIEW_QUALITY_FACTOR,
  MAX_PREVIEW_RELIABILITY_FACTOR,
  MAX_PREVIEW_QUALITY_FACTOR,
} from "../lib/constants";

// Lookup reliability factor from late minutes
export async function getReliabilityFactor(
  ctx: { db: any },
  lateMinutes: number
): Promise<number> {
  const bands = await ctx.db
    .query("reliabilityBands")
    .withIndex("by_minutes")
    .collect();
  
  // Sort by minLateMinutes descending, find first band where lateMinutes >= minLateMinutes
  bands.sort((a: any, b: any) => b.minLateMinutes - a.minLateMinutes);
  
  for (const band of bands) {
    if (lateMinutes >= band.minLateMinutes) {
      return band.factor;
    }
  }
  
  // Default to worst case if no band matches
  return 0.70;
}

// Lookup quality factor from QC average
export async function getQualityFactor(
  ctx: { db: any },
  qcAvg: number
): Promise<number> {
  const bands = await ctx.db
    .query("qualityBands")
    .withIndex("by_qc")
    .collect();
  
  // Sort by minQcAvg descending, find first band where qcAvg >= minQcAvg
  bands.sort((a: any, b: any) => b.minQcAvg - a.minQcAvg);
  
  for (const band of bands) {
    if (qcAvg >= band.minQcAvg) {
      return band.factor;
    }
  }
  
  // Default to worst case if no band matches
  return 0.85;
}

// Get editor's tier rate: from user record, or tierRates table, or default STANDARD (500)
async function getEditorTierRate(ctx: { db: any }, editor: Doc<"users">): Promise<number> {
  if (editor.tierRatePerMin != null && editor.tierRatePerMin > 0) {
    return editor.tierRatePerMin;
  }
  if (editor.tier) {
    const tierRate = await ctx.db
      .query("tierRates")
      .withIndex("by_tier", (q: any) => q.eq("tier", editor.tier))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .first();
    if (tierRate) return tierRate.ratePerMin;
  }
  return 500; // Fallback to STANDARD rate
}

// Calculate payout preview (for invitations)
export async function calculatePayoutPreview(
  ctx: { db: any },
  project: Doc<"projects">,
  editor: Doc<"users">
): Promise<{
  billableMinutes: number;
  tierRate: number;
  base: number;
  minPayout: number;
  maxPayout: number;
  editorCap: number;
  eligibleBonuses: Array<{ code: string; amount: number; condition: string }>;
}> {
  const billableMinutes = project.billableMinutes ?? 0;
  const tierRate = await getEditorTierRate(ctx, editor);
  const base = billableMinutes * tierRate;
  const editorCap = project.editorCapAmount ?? base * 2; // Fallback if not set

  // Min case: late + low QC
  const minGross = base * MIN_PREVIEW_RELIABILITY_FACTOR * MIN_PREVIEW_QUALITY_FACTOR;
  const minPayout = Math.min(minGross, editorCap);

  // Max case: on-time + high QC
  const maxGross = base * MAX_PREVIEW_RELIABILITY_FACTOR * MAX_PREVIEW_QUALITY_FACTOR;
  const maxCapped = Math.min(maxGross, editorCap);
  
  // TODO: Calculate eligible bonuses (missions, rush, etc.)
  // For now, no bonuses in preview
  const eligibleBonuses: Array<{ code: string; amount: number; condition: string }> = [];
  const maxPayout = maxCapped; // + bonuses would be added here

  return {
    billableMinutes,
    tierRate,
    base: Math.round(base),
    minPayout: Math.round(minPayout),
    maxPayout: Math.round(maxPayout),
    editorCap: Math.round(editorCap),
    eligibleBonuses,
  };
}

// Calculate final payout (on project completion)
export async function calculateFinalPayout(
  ctx: { db: any },
  project: Doc<"projects">,
  editor: Doc<"users">,
  qcAverage: number,
  lateMinutes: number,
  bonuses: Array<{ code: string; amount: number }> = []
): Promise<{
  billableMinutes: number;
  tierRate: number;
  reliabilityFactor: number;
  qualityFactor: number;
  basePayout: number;
  afterFactors: number;
  cappedPayout: number;
  bonusAmount: number;
  finalPayout: number;
  bonusesApplied: Array<{ code: string; amount: number }>;
}> {
  const billableMinutes = project.billableMinutes ?? 0;
  const tierRate = await getEditorTierRate(ctx, editor);
  const basePayout = billableMinutes * tierRate;

  const reliabilityFactor = await getReliabilityFactor(ctx, lateMinutes);
  const qualityFactor = await getQualityFactor(ctx, qcAverage);

  const afterFactors = basePayout * reliabilityFactor * qualityFactor;
  const editorCap = project.editorCapAmount ?? basePayout * 2;
  const cappedPayout = Math.min(afterFactors, editorCap);

  // Apply bonuses (limited by incentive pool remaining)
  const incentivePoolRemaining = project.incentivePoolRemaining ?? 0;
  let bonusAmount = 0;
  const bonusesApplied: Array<{ code: string; amount: number }> = [];

  for (const bonus of bonuses) {
    if (bonusAmount + bonus.amount <= incentivePoolRemaining) {
      bonusAmount += bonus.amount;
      bonusesApplied.push(bonus);
    }
  }

  const finalPayout = cappedPayout + bonusAmount;

  return {
    billableMinutes,
    tierRate,
    reliabilityFactor,
    qualityFactor,
    basePayout: Math.round(basePayout),
    afterFactors: Math.round(afterFactors),
    cappedPayout: Math.round(cappedPayout),
    bonusAmount: Math.round(bonusAmount),
    finalPayout: Math.round(finalPayout),
    bonusesApplied,
  };
}

// Get current projected earnings (for real-time display)
export const getCurrentProjectedEarnings = query({
  args: {
    projectId: v.id("projects"),
    editorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    const editor = await ctx.db.get(args.editorId);
    
    if (!project || !editor) return null;

    // Get all milestones for this editor in this project
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("assignedEditorId"), args.editorId))
      .collect();

    if (milestones.length === 0) return null;

    // Calculate aggregate QC average
    const scoredMilestones = milestones.filter((m) => m.qcAverage !== undefined);
    const qcAverage =
      scoredMilestones.length > 0
        ? scoredMilestones.reduce((sum, m) => sum + (m.qcAverage ?? 0), 0) / scoredMilestones.length
        : 4.5; // Default to neutral if no scores yet

    // Calculate total late minutes
    const lateMinutes = milestones.reduce((sum, m) => sum + (m.lateMinutes ?? 0), 0);

    // Calculate projected payout
    const breakdown = await calculateFinalPayout(ctx, project, editor, qcAverage, lateMinutes, []);

    return {
      ...breakdown,
      qcAverage,
      lateMinutes,
      milestonesScored: scoredMilestones.length,
      totalMilestones: milestones.length,
    };
  },
});
