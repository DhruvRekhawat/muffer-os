import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";
// List all milestone templates
export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN and PM can view templates
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PM")) {
      return [];
    }
    
    return await ctx.db
      .query("milestoneTemplates")
      .order("desc")
      .collect();
  },
});

// Get single template by ID
export const getTemplate = query({
  args: { templateId: v.id("milestoneTemplates") },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN and PM can view templates
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PM")) {
      return null;
    }
    
    return await ctx.db.get(args.templateId);
  },
});

// Create new milestone template
export const createTemplate = mutation({
  args: {
    name: v.string(),
    milestones: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      payoutAmount: v.number(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN and PM can create templates
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PM")) {
      throw new Error("Unauthorized");
    }
    
    const templateId = await ctx.db.insert("milestoneTemplates", {
      name: args.name,
      milestones: args.milestones,
      createdAt: Date.now(),
      createdBy: user._id,
    });
    
    return templateId;
  },
});

// Update milestone template
export const updateTemplate = mutation({
  args: {
    templateId: v.id("milestoneTemplates"),
    name: v.optional(v.string()),
    milestones: v.optional(v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      payoutAmount: v.number(),
      order: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN and PM can update templates
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PM")) {
      throw new Error("Unauthorized");
    }
    
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    
    const updates: {
      name?: string;
      milestones?: Array<{
        title: string;
        description?: string;
        payoutAmount: number;
        order: number;
      }>;
    } = {};
    
    if (args.name !== undefined) updates.name = args.name;
    if (args.milestones !== undefined) updates.milestones = args.milestones;
    
    await ctx.db.patch(args.templateId, updates);
    return args.templateId;
  },
});

// Delete milestone template
export const deleteTemplate = mutation({
  args: { templateId: v.id("milestoneTemplates") },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN can delete templates
    if (!user || user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized");
    }
    
    const template = await ctx.db.get(args.templateId);
    if (!template) throw new Error("Template not found");
    
    await ctx.db.delete(args.templateId);
    return args.templateId;
  },
});
