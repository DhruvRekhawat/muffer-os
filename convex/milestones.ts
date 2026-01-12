import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// Get milestones for a project
export const getProjectMilestones = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("milestones")
      .withIndex("by_project_order", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// Get single milestone
export const getMilestone = query({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.milestoneId);
  },
});

// Get milestones assigned to editor
export const getEditorMilestones = query({
  args: { 
    editorId: v.optional(v.id("users")),
    status: v.optional(v.union(
      v.literal("LOCKED"),
      v.literal("IN_PROGRESS"),
      v.literal("SUBMITTED"),
      v.literal("APPROVED"),
      v.literal("REJECTED")
    )),
  },
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
    
    let milestones = await ctx.db
      .query("milestones")
      .withIndex("by_editor", (q) => q.eq("assignedEditorId", editorId))
      .collect();
    
    if (args.status) {
      milestones = milestones.filter(m => m.status === args.status);
    }
    
    return milestones;
  },
});

// Get next actionable milestone for editor
export const getNextMilestone = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return null;
    
    // Find first IN_PROGRESS or REJECTED milestone
    const milestone = await ctx.db
      .query("milestones")
      .withIndex("by_editor", (q) => q.eq("assignedEditorId", user._id))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "IN_PROGRESS"),
          q.eq(q.field("status"), "REJECTED")
        )
      )
      .first();
    
    return milestone;
  },
});

// Create milestone
export const createMilestone = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    payoutAmount: v.number(),
    assignedEditorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role === "EDITOR") {
      throw new Error("Unauthorized");
    }
    
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    // Get current milestone count for order
    const existingMilestones = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    const order = existingMilestones.length + 1;
    
    // Get editor name if assigned
    let assignedEditorName: string | undefined;
    if (args.assignedEditorId) {
      const editor = await ctx.db.get(args.assignedEditorId);
      if (editor) assignedEditorName = editor.name;
    }
    
    const milestoneId = await ctx.db.insert("milestones", {
      projectId: args.projectId,
      projectName: project.name,
      title: args.title,
      description: args.description,
      order,
      dueDate: args.dueDate,
      payoutAmount: args.payoutAmount,
      assignedEditorId: args.assignedEditorId,
      assignedEditorName,
      status: order === 1 ? "IN_PROGRESS" : "LOCKED",
      createdAt: Date.now(),
    });
    
    // Update project milestone count
    await ctx.db.patch(args.projectId, {
      milestoneCount: order,
    });
    
    return milestoneId;
  },
});

// Update milestone
export const updateMilestone = mutation({
  args: {
    milestoneId: v.id("milestones"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    payoutAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role === "EDITOR") {
      throw new Error("Unauthorized");
    }
    
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    
    // Check if project is completed - payout amounts are locked until project is completed
    const project = await ctx.db.get(milestone.projectId);
    if (project && project.status !== "COMPLETED" && args.payoutAmount !== undefined) {
      throw new Error("Cannot change payout amount until project is marked as done");
    }
    
    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.payoutAmount !== undefined) {
      updates.payoutAmount = args.payoutAmount;
    }
    
    await ctx.db.patch(args.milestoneId, updates);
    return args.milestoneId;
  },
});

// Mark milestone as done (APPROVED) - for PM/Admin
export const markMilestoneAsDone = mutation({
  args: {
    milestoneId: v.id("milestones"),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role === "EDITOR") {
      throw new Error("Unauthorized");
    }
    
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    
    // Update milestone to APPROVED
    await ctx.db.patch(args.milestoneId, {
      status: "APPROVED",
      approvedAt: Date.now(),
    });
    
    // Update project completed milestone count
    const project = await ctx.db.get(milestone.projectId);
    if (project) {
      const allMilestones = await ctx.db
        .query("milestones")
        .withIndex("by_project", (q) => q.eq("projectId", milestone.projectId))
        .collect();
      
      const approvedCount = allMilestones.filter(m => m.status === "APPROVED").length;
      
      await ctx.db.patch(milestone.projectId, {
        completedMilestoneCount: approvedCount,
      });
      
      // Check if all milestones are approved, then mark project as completed
      const allApproved = allMilestones.every(m => m.status === "APPROVED");
      if (allApproved) {
        await ctx.db.patch(milestone.projectId, {
          status: "COMPLETED",
        });
      }
      
      // Unlock next milestone
      const nextMilestone = await ctx.db
        .query("milestones")
        .withIndex("by_project_order", (q) => q.eq("projectId", milestone.projectId))
        .filter((q) => q.eq(q.field("order"), milestone.order + 1))
        .first();
      
      if (nextMilestone && nextMilestone.status === "LOCKED") {
        await ctx.db.patch(nextMilestone._id, {
          status: "IN_PROGRESS",
        });
      }
    }
    
    return args.milestoneId;
  },
});

// Assign editor to milestone
export const assignEditor = mutation({
  args: {
    milestoneId: v.id("milestones"),
    editorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role === "EDITOR") {
      throw new Error("Unauthorized");
    }
    
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    
    const editor = await ctx.db.get(args.editorId);
    if (!editor || editor.role !== "EDITOR") {
      throw new Error("Invalid editor");
    }
    
    await ctx.db.patch(args.milestoneId, {
      assignedEditorId: args.editorId,
      assignedEditorName: editor.name,
    });
    
    // Also add editor to project if not already
    const project = await ctx.db.get(milestone.projectId);
    if (project && !project.editorIds.includes(args.editorId)) {
      await ctx.db.patch(milestone.projectId, {
        editorIds: [...project.editorIds, args.editorId],
        editorNames: [...project.editorNames, editor.name],
      });
    }
    
    return args.milestoneId;
  },
});

// Get pending submissions for PM
export const getPendingSubmissions = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role === "EDITOR") return [];
    
    let submissions = await ctx.db
      .query("submissions")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();
    
    if (args.projectId) {
      submissions = submissions.filter(s => s.projectId === args.projectId);
    }
    
    // For PM, only show submissions for their projects
    if (user.role === "PM") {
      const pmProjects = await ctx.db
        .query("projects")
        .withIndex("by_pm", (q) => q.eq("pmId", user._id))
        .collect();
      const pmProjectIds = pmProjects.map(p => p._id);
      submissions = submissions.filter(s => pmProjectIds.includes(s.projectId));
    }
    
    return submissions;
  },
});

// Get overdue milestones
export const getOverdueMilestones = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return [];
    
    const now = Date.now();
    
    let milestones = await ctx.db
      .query("milestones")
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "APPROVED"),
          q.neq(q.field("status"), "LOCKED"),
          q.lt(q.field("dueDate"), now)
        )
      )
      .collect();
    
    // Filter for milestones with due dates
    milestones = milestones.filter(m => m.dueDate !== undefined);
    
    // Role-based filtering
    if (user.role === "EDITOR") {
      milestones = milestones.filter(m => m.assignedEditorId === user._id);
    } else if (user.role === "PM") {
      const pmProjects = await ctx.db
        .query("projects")
        .withIndex("by_pm", (q) => q.eq("pmId", user._id))
        .collect();
      const pmProjectIds = pmProjects.map(p => p._id);
      milestones = milestones.filter(m => pmProjectIds.includes(m.projectId));
    }
    
    return milestones;
  },
});

// Internal: Unlock next milestone after approval
export const unlockNextMilestone = internalMutation({
  args: {
    projectId: v.id("projects"),
    completedOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const nextMilestone = await ctx.db
      .query("milestones")
      .withIndex("by_project_order", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("order"), args.completedOrder + 1))
      .first();
    
    if (nextMilestone && nextMilestone.status === "LOCKED") {
      await ctx.db.patch(nextMilestone._id, {
        status: "IN_PROGRESS",
      });
    }
    
    // Check if all milestones are complete
    const allMilestones = await ctx.db
      .query("milestones")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    
    const allApproved = allMilestones.every(m => m.status === "APPROVED");
    
    if (allApproved) {
      await ctx.db.patch(args.projectId, {
        status: "COMPLETED",
        completedMilestoneCount: allMilestones.length,
      });
    }
  },
});

