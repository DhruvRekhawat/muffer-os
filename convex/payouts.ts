import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { calculateFinalPayout } from "./payoutEngine";
import { notifyUser } from "./notifications";

// Minimum payout threshold (in rupees)
const MIN_PAYOUT = 500;

// Internal: unlock editor wallet balance when a project is COMPLETED.
// This is idempotent via `projects.payoutsUnlockedAt`.
export const unlockProjectEarnings = internalMutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return { ok: false as const, reason: "PROJECT_NOT_FOUND" as const };

    if (project.status !== "COMPLETED") {
      return { ok: false as const, reason: "PROJECT_NOT_COMPLETED" as const };
    }

    if (project.payoutsUnlockedAt) {
      return { ok: true as const, alreadyUnlocked: true as const };
    }

    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Group milestones by editor
    const milestonesByEditor = new Map<Id<"users">, typeof milestones>();
    for (const m of milestones) {
      if (m.status !== "APPROVED") continue;
      if (!m.assignedEditorId) continue;
      if (!milestonesByEditor.has(m.assignedEditorId)) {
        milestonesByEditor.set(m.assignedEditorId, []);
      }
      milestonesByEditor.get(m.assignedEditorId)!.push(m);
    }

    // Calculate and store payout records for each editor
    for (const [editorId, editorMilestones] of milestonesByEditor.entries()) {
      const editor = await ctx.db.get(editorId);
      if (!editor || !editor.tierRatePerMin) continue;

      // Calculate aggregate QC average
      const scoredMilestones = editorMilestones.filter((m) => m.qcAverage !== undefined);
      const qcAverage =
        scoredMilestones.length > 0
          ? scoredMilestones.reduce((sum, m) => sum + (m.qcAverage ?? 0), 0) / scoredMilestones.length
          : 4.5; // Default to neutral if no scores

      // Calculate total late minutes
      const lateMinutes = editorMilestones.reduce((sum, m) => sum + (m.lateMinutes ?? 0), 0);

      // Calculate final payout using payout engine
      const breakdown = await calculateFinalPayout(ctx, project, editor, qcAverage, lateMinutes, []);

      // Check if payout record already exists
      const existingRecord = await ctx.db
        .query("editorPayoutRecords")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .filter((q) => q.eq(q.field("editorId"), editorId))
        .first();

      const now = Date.now();
      if (existingRecord) {
        // Update existing record
        await ctx.db.patch(existingRecord._id, {
          ...breakdown,
          qcAverage,
          lateMinutes,
          status: "UNLOCKED",
          unlockedAt: now,
        });
      } else {
        // Create new record
        await ctx.db.insert("editorPayoutRecords", {
          projectId: args.projectId,
          editorId,
          ...breakdown,
          qcAverage,
          lateMinutes,
          status: "UNLOCKED",
          unlockedAt: now,
          createdAt: now,
        });
      }

      // Credit wallet balance
      if (breakdown.finalPayout > 0) {
        await ctx.runMutation(internal.users.updateEditorBalance, {
          editorId,
          amount: breakdown.finalPayout,
          isAddition: true,
        });

        // Notify editor about unlocked earnings
        await notifyUser(ctx, {
          userId: editorId,
          type: "editor.payout.unlocked",
          title: "Earnings Unlocked!",
          message: `₹${Math.round(breakdown.finalPayout)} unlocked from "${project.name}"`,
          data: {
            projectId: args.projectId,
            amount: breakdown.finalPayout,
            link: `/projects/${project.slug}`,
          },
        });
      }
    }

    await ctx.db.patch(args.projectId, {
      payoutsUnlockedAt: Date.now(),
    });

    return { ok: true as const, alreadyUnlocked: false as const };
  },
});

// Get payout record for a project (for earnings breakdown page)
export const getProjectPayoutRecord = query({
  args: {
    projectId: v.id("projects"),
    editorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return null;

    const editorId = args.editorId || (user.role === "EDITOR" ? user._id : null);
    if (!editorId) return null;

    // Check access: editor can only see their own, PM/SA can see any
    if (user.role === "EDITOR" && editorId !== user._id) {
      return null;
    }

    const payoutRecord = await ctx.db
      .query("editorPayoutRecords")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("editorId"), editorId))
      .first();

    return payoutRecord;
  },
});

// Get editor's payout history
export const getEditorPayouts = query({
  args: { editorId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    let editorId = args.editorId;
    
    if (!editorId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
        .first();
      if (!user) return [];
      editorId = user._id;
    }
    
    return await ctx.db
      .query("payoutRequests")
      .withIndex("by_editor", (q) => q.eq("editorId", editorId))
      .order("desc")
      .collect();
  },
});

// Get all payout requests (SA only)
export const listPayoutRequests = query({
  args: {
    status: v.optional(v.union(
      v.literal("REQUESTED"),
      v.literal("APPROVED"),
      v.literal("PAID"),
      v.literal("REJECTED")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") return [];
    
    if (args.status) {
      return await ctx.db
        .query("payoutRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    
    return await ctx.db
      .query("payoutRequests")
      .order("desc")
      .collect();
  },
});

// Get pending payouts count & total (for dashboard)
export const getPendingPayoutStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") return null;
    
    const pending = await ctx.db
      .query("payoutRequests")
      .withIndex("by_status", (q) => q.eq("status", "REQUESTED"))
      .collect();
    
    const totalAmount = pending.reduce((sum, p) => sum + p.amount, 0);
    
    return {
      count: pending.length,
      totalAmount,
    };
  },
});

// Request payout (Editor)
export const requestPayout = mutation({
  args: {
    amount: v.number(),
    payoutMethod: v.object({
      method: v.union(v.literal("UPI"), v.literal("BANK")),
      upiId: v.optional(v.string()),
      bankName: v.optional(v.string()),
      accountNumber: v.optional(v.string()),
      ifscCode: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) throw new Error("User not found");
    
    // Validate amount
    if (args.amount < MIN_PAYOUT) {
      throw new Error(`Minimum payout is ₹${MIN_PAYOUT}`);
    }
    
    if (args.amount > (user.unlockedBalance ?? 0)) {
      throw new Error("Insufficient balance");
    }
    
    // Validate payout method
    if (args.payoutMethod.method === "UPI" && !args.payoutMethod.upiId) {
      throw new Error("UPI ID is required");
    }
    if (args.payoutMethod.method === "BANK") {
      if (!args.payoutMethod.bankName || !args.payoutMethod.accountNumber || !args.payoutMethod.ifscCode) {
        throw new Error("Bank details are required");
      }
    }
    
    // Check for pending requests
    const pendingRequest = await ctx.db
      .query("payoutRequests")
      .withIndex("by_editor", (q) => q.eq("editorId", user._id))
      .filter((q) => q.eq(q.field("status"), "REQUESTED"))
      .first();
    
    if (pendingRequest) {
      throw new Error("You already have a pending payout request");
    }
    
    // Create payout request
    const requestId = await ctx.db.insert("payoutRequests", {
      editorId: user._id,
      editorName: user.name,
      amount: args.amount,
      payoutMethod: args.payoutMethod,
      status: "REQUESTED",
      createdAt: Date.now(),
    });
    
    // Also update user's payout details if not set
    if (!user.payoutDetails) {
      await ctx.db.patch(user._id, {
        payoutDetails: args.payoutMethod,
      });
    }
    
    // Create audit event
    if (!user.role) throw new Error("User role not set");
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "payout.requested",
      entityType: "payoutRequest",
      entityId: requestId,
      metadata: { amount: args.amount },
      createdAt: Date.now(),
    });
    
    return requestId;
  },
});

// Process payout - mark as paid (SA only)
export const processPayout = mutation({
  args: {
    requestId: v.id("payoutRequests"),
    transactionRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized");
    }
    
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    
    if (request.status !== "REQUESTED" && request.status !== "APPROVED") {
      throw new Error("Request already processed");
    }
    
    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "PAID",
      processedBy: user._id,
      processedAt: Date.now(),
      transactionRef: args.transactionRef,
    });
    
    // Deduct from editor balance
    const editor = await ctx.db.get(request.editorId);
    if (editor) {
      await ctx.db.patch(request.editorId, {
        unlockedBalance: Math.max(0, (editor.unlockedBalance ?? 0) - request.amount),
      });
    }
    
    // Create audit event
    if (!user.role) throw new Error("User role not set");
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "payout.processed",
      entityType: "payoutRequest",
      entityId: args.requestId,
      metadata: { 
        editorId: request.editorId, 
        amount: request.amount,
        transactionRef: args.transactionRef,
      },
      createdAt: Date.now(),
    });

    // Notify editor about processed payout
    await notifyUser(ctx, {
      userId: request.editorId,
      type: "editor.payout.processed",
      title: "Payout Processed",
      message: `Your payout of ₹${request.amount} has been processed`,
      data: {
        amount: request.amount,
        link: "/wallet",
      },
    });
    
    return args.requestId;
  },
});

// Reject payout (SA only)
export const rejectPayout = mutation({
  args: {
    requestId: v.id("payoutRequests"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized");
    }
    
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    
    if (request.status !== "REQUESTED") {
      throw new Error("Request already processed");
    }
    
    await ctx.db.patch(args.requestId, {
      status: "REJECTED",
      processedBy: user._id,
      processedAt: Date.now(),
      rejectionReason: args.reason,
    });
    
    // Create audit event
    if (!user.role) throw new Error("User role not set");
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "payout.rejected",
      entityType: "payoutRequest",
      entityId: args.requestId,
      metadata: { 
        editorId: request.editorId, 
        amount: request.amount,
        reason: args.reason,
      },
      createdAt: Date.now(),
    });
    
    return args.requestId;
  },
});

// Bulk export payouts for bank processing (SA only)
export const exportPayoutsForProcessing = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") return null;
    
    const pending = await ctx.db
      .query("payoutRequests")
      .withIndex("by_status", (q) => q.eq("status", "REQUESTED"))
      .collect();
    
    // Format as CSV for bank upload
    const header = "Name,Amount,Method,UPI_ID,Bank_Name,Account_Number,IFSC\n";
    const rows = pending.map(p => {
      const method = p.payoutMethod;
      return `"${p.editorName}",${p.amount},"${method.method}","${method.upiId || ''}","${method.bankName || ''}","${method.accountNumber || ''}","${method.ifscCode || ''}"`;
    }).join("\n");
    
    return header + rows;
  },
});

