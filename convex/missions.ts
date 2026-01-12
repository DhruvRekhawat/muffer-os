import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Get all active missions
export const listActiveMissions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("missions")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
  },
});

// Get all missions (SA only)
export const listAllMissions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "SUPER_ADMIN") return [];
    
    return await ctx.db.query("missions").order("desc").collect();
  },
});

// Get mission by ID
export const getMission = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.missionId);
  },
});

// Get editor's mission progress
export const getEditorMissionProgress = query({
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
    
    const progress = await ctx.db
      .query("missionProgress")
      .withIndex("by_editor", (q) => q.eq("editorId", editorId))
      .collect();
    
    // Join with mission data
    const result = [];
    for (const p of progress) {
      const mission = await ctx.db.get(p.missionId);
      if (mission && mission.active) {
        result.push({
          ...p,
          mission,
          percentComplete: Math.min(100, Math.round((p.progress / mission.target) * 100)),
        });
      }
    }
    
    return result;
  },
});

// Get missions with progress for editor dashboard
export const getMissionsWithProgress = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return [];
    
    const activeMissions = await ctx.db
      .query("missions")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    
    const result = [];
    
    for (const mission of activeMissions) {
      // Check eligibility
      if (mission.eligibleEditorIds && !mission.eligibleEditorIds.includes(user._id)) {
        continue;
      }
      
      // Get progress
      const progress = await ctx.db
        .query("missionProgress")
        .withIndex("by_mission_editor", (q) => 
          q.eq("missionId", mission._id).eq("editorId", user._id)
        )
        .first();
      
      result.push({
        mission,
        progress: progress?.progress || 0,
        completed: progress?.completed || false,
        percentComplete: Math.min(100, Math.round(((progress?.progress || 0) / mission.target) * 100)),
      });
    }
    
    return result;
  },
});

// Create mission (SA only)
export const createMission = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("SPEED"),
      v.literal("VOLUME"),
      v.literal("STREAK")
    ),
    target: v.number(),
    rewardAmount: v.number(),
    window: v.union(
      v.literal("DAILY"),
      v.literal("WEEKLY"),
      v.literal("MONTHLY")
    ),
    eligibleServiceTypes: v.optional(v.array(v.union(
      v.literal("EditMax"),
      v.literal("ContentMax"),
      v.literal("AdMax")
    ))),
    eligibleEditorIds: v.optional(v.array(v.id("users"))),
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
    
    const missionId = await ctx.db.insert("missions", {
      title: args.title,
      description: args.description,
      type: args.type,
      target: args.target,
      rewardAmount: args.rewardAmount,
      window: args.window,
      active: true,
      eligibleServiceTypes: args.eligibleServiceTypes,
      eligibleEditorIds: args.eligibleEditorIds,
      createdAt: Date.now(),
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "mission.created",
      entityType: "mission",
      entityId: missionId,
      metadata: { title: args.title, type: args.type },
      createdAt: Date.now(),
    });
    
    return missionId;
  },
});

// Update mission (SA only)
export const updateMission = mutation({
  args: {
    missionId: v.id("missions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    target: v.optional(v.number()),
    rewardAmount: v.optional(v.number()),
    active: v.optional(v.boolean()),
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
    
    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.target !== undefined) updates.target = args.target;
    if (args.rewardAmount !== undefined) updates.rewardAmount = args.rewardAmount;
    if (args.active !== undefined) updates.active = args.active;
    
    await ctx.db.patch(args.missionId, updates);
    return args.missionId;
  },
});

// Update mission progress (called when milestone is approved)
export const updateMissionProgress = mutation({
  args: {
    editorId: v.id("users"),
    missionType: v.union(
      v.literal("SPEED"),
      v.literal("VOLUME"),
      v.literal("STREAK")
    ),
    increment: v.number(),
  },
  handler: async (ctx, args) => {
    // Find active missions of this type
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_active", (q) => q.eq("active", true))
      .filter((q) => q.eq(q.field("type"), args.missionType))
      .collect();
    
    for (const mission of missions) {
      // Check eligibility
      if (mission.eligibleEditorIds && !mission.eligibleEditorIds.includes(args.editorId)) {
        continue;
      }
      
      // Get or create progress
      const existingProgress = await ctx.db
        .query("missionProgress")
        .withIndex("by_mission_editor", (q) => 
          q.eq("missionId", mission._id).eq("editorId", args.editorId)
        )
        .first();
      
      if (existingProgress) {
        const newProgress = existingProgress.progress + args.increment;
        const completed = newProgress >= mission.target;
        
        await ctx.db.patch(existingProgress._id, {
          progress: newProgress,
          completed,
          completedAt: completed ? Date.now() : undefined,
          lastUpdated: Date.now(),
        });
        
        // If just completed, award bonus
        if (completed && !existingProgress.completed) {
          const editor = await ctx.db.get(args.editorId);
          if (editor) {
            await ctx.db.patch(args.editorId, {
              unlockedBalance: (editor.unlockedBalance ?? 0) + mission.rewardAmount,
              lifetimeEarnings: (editor.lifetimeEarnings ?? 0) + mission.rewardAmount,
            });
          }
        }
      } else {
        const completed = args.increment >= mission.target;
        
        await ctx.db.insert("missionProgress", {
          missionId: mission._id,
          editorId: args.editorId,
          progress: args.increment,
          completed,
          completedAt: completed ? Date.now() : undefined,
          lastUpdated: Date.now(),
        });
        
        // If completed on first increment, award bonus
        if (completed) {
          const editor = await ctx.db.get(args.editorId);
          if (editor) {
            await ctx.db.patch(args.editorId, {
              unlockedBalance: (editor.unlockedBalance ?? 0) + mission.rewardAmount,
              lifetimeEarnings: (editor.lifetimeEarnings ?? 0) + mission.rewardAmount,
            });
          }
        }
      }
    }
  },
});

