import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
const notificationType = v.union(
  v.literal("editor.invitation.received"),
  v.literal("editor.invitation.expired"),
  v.literal("editor.milestone.assigned"),
  v.literal("editor.submission.approved"),
  v.literal("editor.submission.rejected"),
  v.literal("editor.payout.unlocked"),
  v.literal("editor.payout.processed"),
  v.literal("editor.mission.completed"),
  v.literal("editor.deadline.warning"),
  v.literal("editor.hiring.decision"),
  v.literal("pm.project.assigned"),
  v.literal("pm.invitation.response"),
  v.literal("pm.submission.ready"),
  v.literal("pm.project.at_risk"),
  v.literal("pm.project.delayed"),
  v.literal("pm.deadline.warning"),
  v.literal("pm.application.new"),
  v.literal("pm.project.completed"),
  v.literal("sa.order.placed"),
  v.literal("sa.application.new"),
  v.literal("sa.payout.large"),
  v.literal("sa.project.completed"),
  v.literal("sa.project.danger"),
  v.literal("sa.hiring.decision"),
  v.literal("sa.daily.summary")
);

// Get template config for a notification type
export const getTemplate = internalQuery({
  args: { type: notificationType },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("whatsappTemplates")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .first();

    return template;
  },
});

// Send WhatsApp notification
export const sendNotification = internalAction({
  args: {
    userId: v.id("users"),
    phone: v.string(),
    type: notificationType,
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    try {
      // Get template config
      const template = await ctx.runQuery(internal.whatsapp.getTemplate, { 
        type: args.type 
      });
      
      if (!template || !template.isActive) {
        console.log(`No active template found for ${args.type}`);
        return;
      }

      // Build parameters from data based on template mapping
      const parameters = template.parameterMapping
        .sort((a, b) => a.paramIndex - b.paramIndex)
        .map(mapping => {
          const value = args.data?.[mapping.dataField];
          return {
            type: "text",
            text: value != null ? String(value) : "",
          };
        });

      // Build request body
      const requestBody: any = {
        token: process.env.WHATSAPP_TOKEN,
        phone: args.phone,
        template_name: template.templateName,
        template_language: template.templateLanguage,
      };

      // Add components only if we have parameters
      if (parameters.length > 0) {
        requestBody.components = [{
          type: "BODY",
          parameters,
        }];
      }

      // Send via WhatsApp API
      const response = await fetch(
        "https://chat.leminai.com/api/wpbox/sendtemplatemessage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const responseText = await response.text();
      const success = response.ok;

      // Log result
      await ctx.runMutation(internal.whatsapp.logNotification, {
        userId: args.userId,
        phone: args.phone,
        type: args.type,
        templateName: template.templateName,
        status: success ? "SENT" : "FAILED",
        errorMessage: success ? undefined : responseText,
      });

      if (!success) {
        console.error(`WhatsApp notification failed for ${args.type}:`, responseText);
      }
    } catch (error) {
      console.error(`Error sending WhatsApp notification:`, error);
      
      // Log the failure
      await ctx.runMutation(internal.whatsapp.logNotification, {
        userId: args.userId,
        phone: args.phone,
        type: args.type,
        templateName: "unknown",
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

// Log WhatsApp notification attempt
export const logNotification = internalMutation({
  args: {
    userId: v.id("users"),
    phone: v.string(),
    type: notificationType,
    templateName: v.string(),
    status: v.union(v.literal("SENT"), v.literal("FAILED")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("whatsappNotificationLog", {
      userId: args.userId,
      phone: args.phone,
      type: args.type,
      templateName: args.templateName,
      status: args.status,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    });
  },
});

// Seed WhatsApp templates (run once to populate initial templates)
export const seedTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const templates = [
      // Editor templates
      {
        type: "editor.invitation.received" as const,
        templateName: "muffer_project_invitation",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "projectName" },
          { paramIndex: 3, dataField: "minPayout" },
          { paramIndex: 4, dataField: "maxPayout" },
          { paramIndex: 5, dataField: "deadline" },
        ],
      },
      {
        type: "editor.submission.approved" as const,
        templateName: "muffer_work_approved",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "projectName" },
          { paramIndex: 3, dataField: "qcScore" },
          { paramIndex: 4, dataField: "amount" },
        ],
      },
      {
        type: "editor.submission.rejected" as const,
        templateName: "muffer_work_rejected",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "projectName" },
          { paramIndex: 3, dataField: "feedback" },
        ],
      },
      {
        type: "editor.payout.processed" as const,
        templateName: "muffer_payout_processed",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "amount" },
          { paramIndex: 3, dataField: "transactionId" },
        ],
      },
      {
        type: "editor.deadline.warning" as const,
        templateName: "muffer_deadline_reminder",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "projectName" },
          { paramIndex: 2, dataField: "timeRemaining" },
        ],
      },
      {
        type: "editor.mission.completed" as const,
        templateName: "muffer_mission_completed",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "missionName" },
          { paramIndex: 3, dataField: "amount" },
        ],
      },
      // PM templates
      {
        type: "pm.submission.ready" as const,
        templateName: "muffer_new_submission",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "pmName" },
          { paramIndex: 2, dataField: "editorName" },
          { paramIndex: 3, dataField: "projectName" },
        ],
      },
      {
        type: "pm.project.at_risk" as const,
        templateName: "muffer_project_alert",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "projectName" },
          { paramIndex: 2, dataField: "status" },
          { paramIndex: 3, dataField: "pendingCount" },
        ],
      },
      {
        type: "pm.project.delayed" as const,
        templateName: "muffer_project_alert",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "projectName" },
          { paramIndex: 2, dataField: "status" },
          { paramIndex: 3, dataField: "pendingCount" },
        ],
      },
      {
        type: "pm.invitation.response" as const,
        templateName: "muffer_editor_response",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "pmName" },
          { paramIndex: 2, dataField: "editorName" },
          { paramIndex: 3, dataField: "response" },
          { paramIndex: 4, dataField: "projectName" },
        ],
      },
      // SA templates
      {
        type: "sa.order.placed" as const,
        templateName: "muffer_new_order",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "clientName" },
          { paramIndex: 2, dataField: "serviceType" },
          { paramIndex: 3, dataField: "amount" },
        ],
      },
      {
        type: "sa.payout.large" as const,
        templateName: "muffer_payout_alert",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "amount" },
          { paramIndex: 2, dataField: "editorName" },
        ],
      },
      {
        type: "sa.daily.summary" as const,
        templateName: "muffer_daily_summary",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "date" },
          { paramIndex: 2, dataField: "newOrders" },
          { paramIndex: 3, dataField: "activeProjects" },
          { paramIndex: 4, dataField: "atRiskProjects" },
          { paramIndex: 5, dataField: "pendingPayouts" },
        ],
      },
    ];

    let inserted = 0;
    for (const template of templates) {
      const existing = await ctx.db
        .query("whatsappTemplates")
        .withIndex("by_type", (q) => q.eq("type", template.type))
        .first();

      if (!existing) {
        await ctx.db.insert("whatsappTemplates", {
          ...template,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      }
    }

    return { inserted, total: templates.length };
  },
});

// Public mutation to seed templates (requires SUPER_ADMIN)
export const seedTemplatesPublic = mutation({
  args: {},
  handler: async (ctx) => {
    // Check authentication and require SUPER_ADMIN
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user || user.role !== "SUPER_ADMIN") {
      throw new Error("Only SUPER_ADMIN can seed templates");
    }

    // Same logic as internal mutation
    const now = Date.now();
    
    const templates = [
      // Editor templates
      {
        type: "editor.invitation.received" as const,
        templateName: "muffer_project_invitation",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "projectName" },
          { paramIndex: 3, dataField: "minPayout" },
          { paramIndex: 4, dataField: "maxPayout" },
          { paramIndex: 5, dataField: "deadline" },
        ],
      },
      {
        type: "editor.submission.approved" as const,
        templateName: "muffer_work_approved",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "projectName" },
          { paramIndex: 3, dataField: "qcScore" },
          { paramIndex: 4, dataField: "amount" },
        ],
      },
      {
        type: "editor.submission.rejected" as const,
        templateName: "muffer_work_rejected",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "projectName" },
          { paramIndex: 3, dataField: "feedback" },
        ],
      },
      {
        type: "editor.payout.processed" as const,
        templateName: "muffer_payout_processed",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "amount" },
          { paramIndex: 3, dataField: "transactionId" },
        ],
      },
      {
        type: "editor.deadline.warning" as const,
        templateName: "muffer_deadline_reminder",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "projectName" },
          { paramIndex: 2, dataField: "timeRemaining" },
        ],
      },
      {
        type: "editor.mission.completed" as const,
        templateName: "muffer_mission_completed",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "editorName" },
          { paramIndex: 2, dataField: "missionName" },
          { paramIndex: 3, dataField: "amount" },
        ],
      },
      // PM templates
      {
        type: "pm.submission.ready" as const,
        templateName: "muffer_new_submission",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "pmName" },
          { paramIndex: 2, dataField: "editorName" },
          { paramIndex: 3, dataField: "projectName" },
        ],
      },
      {
        type: "pm.project.at_risk" as const,
        templateName: "muffer_project_alert",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "projectName" },
          { paramIndex: 2, dataField: "status" },
          { paramIndex: 3, dataField: "pendingCount" },
        ],
      },
      {
        type: "pm.project.delayed" as const,
        templateName: "muffer_project_alert",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "projectName" },
          { paramIndex: 2, dataField: "status" },
          { paramIndex: 3, dataField: "pendingCount" },
        ],
      },
      {
        type: "pm.invitation.response" as const,
        templateName: "muffer_editor_response",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "pmName" },
          { paramIndex: 2, dataField: "editorName" },
          { paramIndex: 3, dataField: "response" },
          { paramIndex: 4, dataField: "projectName" },
        ],
      },
      // SA templates
      {
        type: "sa.order.placed" as const,
        templateName: "muffer_new_order",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "clientName" },
          { paramIndex: 2, dataField: "serviceType" },
          { paramIndex: 3, dataField: "amount" },
        ],
      },
      {
        type: "sa.payout.large" as const,
        templateName: "muffer_payout_alert",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "amount" },
          { paramIndex: 2, dataField: "editorName" },
        ],
      },
      {
        type: "sa.daily.summary" as const,
        templateName: "muffer_daily_summary",
        templateLanguage: "en",
        parameterMapping: [
          { paramIndex: 1, dataField: "date" },
          { paramIndex: 2, dataField: "newOrders" },
          { paramIndex: 3, dataField: "activeProjects" },
          { paramIndex: 4, dataField: "atRiskProjects" },
          { paramIndex: 5, dataField: "pendingPayouts" },
        ],
      },
    ];

    let inserted = 0;
    for (const template of templates) {
      const existing = await ctx.db
        .query("whatsappTemplates")
        .withIndex("by_type", (q) => q.eq("type", template.type))
        .first();

      if (!existing) {
        await ctx.db.insert("whatsappTemplates", {
          ...template,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        inserted++;
      }
    }

    return { inserted, total: templates.length };
  },
});
