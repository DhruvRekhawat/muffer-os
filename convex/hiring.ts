import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { notifyUser } from "./notifications";

// Get all applications (SA only)
export const listApplications = query({
  args: {
    status: v.optional(v.union(
      v.literal("SUBMITTED"),
      v.literal("APPROVED"),
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
        .query("editorApplications")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    
    return await ctx.db
      .query("editorApplications")
      .order("desc")
      .collect();
  },
});

// Get single application
export const getApplication = query({
  args: { applicationId: v.id("editorApplications") },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") return null;
    
    return await ctx.db.get(args.applicationId);
  },
});

// Get pending applications count (for dashboard)
export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return 0;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") return 0;
    
    const pending = await ctx.db
      .query("editorApplications")
      .withIndex("by_status", (q) => q.eq("status", "SUBMITTED"))
      .collect();
    
    return pending.length;
  },
});

// Submit application (public)
export const submitApplication = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    occupation: v.optional(v.string()),
    experience: v.optional(v.string()),
    tools: v.array(v.string()),
    portfolioLinks: v.array(v.string()),
    canStartImmediately: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if already applied
    const existing = await ctx.db
      .query("editorApplications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      // Check cooldown
      if (existing.rejectionCooldownUntil && existing.rejectionCooldownUntil > Date.now()) {
        const cooldownDate = new Date(existing.rejectionCooldownUntil);
        throw new Error(`You can reapply after ${cooldownDate.toLocaleDateString()}`);
      }
      
      // If pending, don't allow duplicate
      if (existing.status === "SUBMITTED") {
        throw new Error("You already have a pending application");
      }
      
      // If approved, don't allow
      if (existing.status === "APPROVED") {
        throw new Error("You are already approved");
      }
    }
    
    // Create new application
    const applicationId = await ctx.db.insert("editorApplications", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      occupation: args.occupation,
      experience: args.experience,
      tools: args.tools,
      portfolioLinks: args.portfolioLinks,
      canStartImmediately: args.canStartImmediately,
      status: "SUBMITTED",
      createdAt: Date.now(),
    });
    
    return applicationId;
  },
});

// Approve application (SA only)
export const approveApplication = mutation({
  args: { applicationId: v.id("editorApplications") },
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
    
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");
    
    if (application.status !== "SUBMITTED") {
      throw new Error("Application already processed");
    }
    
    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: "APPROVED",
      reviewedBy: user._id,
    });
    
    // Create user account for the editor
    const userId = await ctx.db.insert("users", {
      name: application.name,
      email: application.email,
      phone: application.phone,
      role: "EDITOR",
      status: "INVITED",
      tools: application.tools,
      experience: application.experience,
      canStartImmediately: application.canStartImmediately,
      unlockedBalance: 0,
      lifetimeEarnings: 0,
      createdAt: Date.now(),
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "application.approved",
      entityType: "editorApplication",
      entityId: args.applicationId,
      metadata: { editorEmail: application.email, newUserId: userId },
      createdAt: Date.now(),
    });

    // Notify the new editor about approval (using the newly created user ID)
    await notifyUser(ctx, {
      userId,
      type: "editor.hiring.decision",
      title: "Application Approved!",
      message: "Welcome to Muffer! Your editor application has been approved.",
      data: {
        link: "/auth/login",
      },
    });
    
    return { applicationId: args.applicationId, userId };
  },
});

// Reject application (SA only)
export const rejectApplication = mutation({
  args: { 
    applicationId: v.id("editorApplications"),
    reason: v.optional(v.string()),
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
    
    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");
    
    if (application.status !== "SUBMITTED") {
      throw new Error("Application already processed");
    }
    
    // Set 2-month cooldown
    const cooldownUntil = Date.now() + (60 * 24 * 60 * 60 * 1000); // 60 days
    
    await ctx.db.patch(args.applicationId, {
      status: "REJECTED",
      reviewedBy: user._id,
      rejectionReason: args.reason,
      rejectionCooldownUntil: cooldownUntil,
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "application.rejected",
      entityType: "editorApplication",
      entityId: args.applicationId,
      metadata: { editorEmail: application.email, reason: args.reason },
      createdAt: Date.now(),
    });
    
    return args.applicationId;
  },
});

// Internal mutation: Submit application from external API (called via HTTP)
export const submitApplicationExternal = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    occupation: v.optional(v.string()),
    experience: v.optional(v.string()),
    tools: v.array(v.string()),
    portfolioLinks: v.array(v.string()),
    canStartImmediately: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if already applied
    const existing = await ctx.db
      .query("editorApplications")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      // Check cooldown
      if (existing.rejectionCooldownUntil && existing.rejectionCooldownUntil > Date.now()) {
        const cooldownDate = new Date(existing.rejectionCooldownUntil);
        throw new Error(`You can reapply after ${cooldownDate.toLocaleDateString()}`);
      }
      
      // If pending, don't allow duplicate
      if (existing.status === "SUBMITTED") {
        throw new Error("You already have a pending application");
      }
      
      // If approved, don't allow
      if (existing.status === "APPROVED") {
        throw new Error("You are already approved");
      }
    }
    
    // Create new application
    const applicationId = await ctx.db.insert("editorApplications", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      occupation: args.occupation,
      experience: args.experience,
      tools: args.tools,
      portfolioLinks: args.portfolioLinks,
      canStartImmediately: args.canStartImmediately,
      status: "SUBMITTED",
      createdAt: Date.now(),
    });
    
    return applicationId;
  },
});
