import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

async function requireSuperAdmin(ctx: { db: any; auth: any }) {
  const identity = await auth.getUserId(ctx);
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity))
    .first();
  if (!user || user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return user;
}

// Tier Rates CRUD
export const listTierRates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tierRates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getAllTierRates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tierRates").collect();
  },
});

export const upsertTierRate = mutation({
  args: {
    tier: v.union(
      v.literal("JUNIOR"),
      v.literal("STANDARD"),
      v.literal("SENIOR"),
      v.literal("ELITE")
    ),
    ratePerMin: v.number(),
    rushEligible: v.optional(v.boolean()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    
    const existing = await ctx.db
      .query("tierRates")
      .withIndex("by_tier", (q) => q.eq("tier", args.tier))
      .first();
    
    const now = Date.now();
    const data = {
      tier: args.tier,
      ratePerMin: args.ratePerMin,
      rushEligible: args.rushEligible ?? false,
      isActive: args.isActive,
      updatedAt: now,
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("tierRates", {
        ...data,
        createdAt: now,
      });
    }
  },
});

// SKU Catalog CRUD
export const listSkus = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("skuCatalog")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getAllSkus = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("skuCatalog").collect();
  },
});

export const getSkuByCode = query({
  args: { skuCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skuCatalog")
      .withIndex("by_code", (q) => q.eq("skuCode", args.skuCode))
      .first();
  },
});

export const upsertSku = mutation({
  args: {
    skuCode: v.string(),
    name: v.string(),
    serviceType: v.union(
      v.literal("EditMax"),
      v.literal("ContentMax"),
      v.literal("AdMax"),
      v.literal("Other")
    ),
    billableMinutesBase: v.number(),
    difficultyFactorDefault: v.number(),
    editorBudgetPct: v.number(),
    incentivePoolPct: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    
    const existing = await ctx.db
      .query("skuCatalog")
      .withIndex("by_code", (q) => q.eq("skuCode", args.skuCode))
      .first();
    
    const now = Date.now();
    const data = {
      skuCode: args.skuCode,
      name: args.name,
      serviceType: args.serviceType,
      billableMinutesBase: args.billableMinutesBase,
      difficultyFactorDefault: args.difficultyFactorDefault,
      editorBudgetPct: args.editorBudgetPct,
      incentivePoolPct: args.incentivePoolPct,
      isActive: args.isActive,
      updatedAt: now,
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("skuCatalog", {
        ...data,
        createdAt: now,
      });
    }
  },
});

export const toggleSkuActive = mutation({
  args: { skuCode: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    
    const sku = await ctx.db
      .query("skuCatalog")
      .withIndex("by_code", (q) => q.eq("skuCode", args.skuCode))
      .first();
    
    if (!sku) throw new Error("SKU not found");
    
    await ctx.db.patch(sku._id, {
      isActive: !sku.isActive,
      updatedAt: Date.now(),
    });
    
    return sku._id;
  },
});

// Reliability Bands CRUD
export const listReliabilityBands = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("reliabilityBands")
      .withIndex("by_minutes")
      .collect();
  },
});

export const upsertReliabilityBand = mutation({
  args: {
    minLateMinutes: v.number(),
    factor: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    
    const existing = await ctx.db
      .query("reliabilityBands")
      .withIndex("by_minutes", (q) => q.eq("minLateMinutes", args.minLateMinutes))
      .first();
    
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        factor: args.factor,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("reliabilityBands", {
        minLateMinutes: args.minLateMinutes,
        factor: args.factor,
        createdAt: now,
      });
    }
  },
});

// Quality Bands CRUD
export const listQualityBands = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("qualityBands")
      .withIndex("by_qc")
      .collect();
  },
});

export const upsertQualityBand = mutation({
  args: {
    minQcAvg: v.number(),
    factor: v.number(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    
    const existing = await ctx.db
      .query("qualityBands")
      .withIndex("by_qc", (q) => q.eq("minQcAvg", args.minQcAvg))
      .first();
    
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        factor: args.factor,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("qualityBands", {
        minQcAvg: args.minQcAvg,
        factor: args.factor,
        createdAt: now,
      });
    }
  },
});

// Seed default config values (call once to initialize)
export const seedDefaultConfig = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    
    const now = Date.now();
    
    // Seed tier rates
    const tierRates = [
      { tier: "JUNIOR" as const, ratePerMin: 250, rushEligible: false },
      { tier: "STANDARD" as const, ratePerMin: 500, rushEligible: true },
      { tier: "SENIOR" as const, ratePerMin: 750, rushEligible: true },
      { tier: "ELITE" as const, ratePerMin: 1000, rushEligible: true },
    ];
    
    for (const tr of tierRates) {
      const existing = await ctx.db
        .query("tierRates")
        .withIndex("by_tier", (q) => q.eq("tier", tr.tier))
        .first();
      if (!existing) {
        await ctx.db.insert("tierRates", {
          ...tr,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    
    // Seed reliability bands
    const reliabilityBands = [
      { minLateMinutes: 0, factor: 1.00 },
      { minLateMinutes: 60, factor: 0.95 },
      { minLateMinutes: 180, factor: 0.85 },
      { minLateMinutes: 9999, factor: 0.70 },
    ];
    
    for (const rb of reliabilityBands) {
      const existing = await ctx.db
        .query("reliabilityBands")
        .withIndex("by_minutes", (q) => q.eq("minLateMinutes", rb.minLateMinutes))
        .first();
      if (!existing) {
        await ctx.db.insert("reliabilityBands", {
          ...rb,
          createdAt: now,
        });
      }
    }
    
    // Seed quality bands
    const qualityBands = [
      { minQcAvg: 0.0, factor: 0.85 },
      { minQcAvg: 4.0, factor: 0.95 },
      { minQcAvg: 4.5, factor: 1.00 },
      { minQcAvg: 4.8, factor: 1.05 },
    ];
    
    for (const qb of qualityBands) {
      const existing = await ctx.db
        .query("qualityBands")
        .withIndex("by_qc", (q) => q.eq("minQcAvg", qb.minQcAvg))
        .first();
      if (!existing) {
        await ctx.db.insert("qualityBands", {
          ...qb,
          createdAt: now,
        });
      }
    }
    
    return { success: true };
  },
});
