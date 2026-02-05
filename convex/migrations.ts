import { mutation } from "./_generated/server";

/**
 * Migration: Remove payoutAmount field from all milestones
 * 
 * IMPORTANT: This migration must be run BEFORE pushing the schema change that removes payoutAmount.
 * 
 * If you've already pushed the schema change and are getting validation errors:
 * 1. Temporarily add `payoutAmount: v.optional(v.number())` back to milestones schema
 * 2. Push the schema
 * 3. Run this migration: npx convex run migrations:removePayoutAmountFromMilestones
 * 4. Remove payoutAmount from schema again
 * 5. Push the schema again
 * 
 * Or run via Convex dashboard: Functions > migrations:removePayoutAmountFromMilestones > Run
 */
export const removePayoutAmountFromMilestones = mutation({
  args: {},
  handler: async (ctx) => {
    // Query all milestones
    const milestones = await ctx.db.query("milestones").collect();
    
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    for (const milestone of milestones) {
      try {
        // Access raw document to check for payoutAmount
        const milestoneAny = milestone as any;
        
        // If payoutAmount exists, replace the document without it
        if (milestoneAny.payoutAmount !== undefined) {
          await ctx.db.replace(milestone._id, {
            projectId: milestone.projectId,
            projectName: milestone.projectName,
            title: milestone.title,
            description: milestone.description,
            order: milestone.order,
            dueDate: milestone.dueDate,
            bonusEligible: milestone.bonusEligible,
            assignedEditorId: milestone.assignedEditorId,
            assignedEditorName: milestone.assignedEditorName,
            status: milestone.status,
            submittedAt: milestone.submittedAt,
            approvedAt: milestone.approvedAt,
            qcGuidelinesScore: milestone.qcGuidelinesScore,
            qcAvQualityScore: milestone.qcAvQualityScore,
            qcSelfRelianceScore: milestone.qcSelfRelianceScore,
            qcAverage: milestone.qcAverage,
            lateMinutes: milestone.lateMinutes,
            createdAt: milestone.createdAt,
          });
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push({
          id: milestone._id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`Failed to update milestone ${milestone._id}:`, error);
      }
    }
    
    return {
      success: errors.length === 0,
      updated,
      skipped,
      total: milestones.length,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length === 0
        ? `Successfully removed payoutAmount from ${updated} milestones, skipped ${skipped}`
        : `Removed payoutAmount from ${updated} milestones, skipped ${skipped}, ${errors.length} errors occurred`,
    };
  },
});
