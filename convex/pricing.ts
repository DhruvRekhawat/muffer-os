import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

type ServiceType = "EditMax" | "ContentMax" | "AdMax";
type PricingUnit = "video" | "ad";
type AddonCategory = "voice" | "graphics" | "delivery" | "format" | "script" | "other";
type CouponType = "percentage" | "fixed" | "fixed_price";
type BulkDiscountType = "percentage" | "fixed";

type Addon = {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: AddonCategory;
};

type Plan = {
  id: string;
  name: string;
  service: ServiceType;
  price: number;
  pricePerUnit: number;
  unit: PricingUnit;
  includes: string[];
  addons: Addon[];
  features: string[];
  popular?: boolean;
  custom?: boolean;
};

type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  validFrom?: number;
  validUntil?: number;
  usageLimit?: number;
  usedCount?: number;
  applicableServices?: ServiceType[];
  applicablePlanIds?: string[];
  applicableAddonIds?: string[];
  active: boolean;
};

type BulkDiscountRule = {
  minQuantity: number;
  type: BulkDiscountType;
  value: number;
  maxDiscount?: number;
};

export type PricingConfig = {
  key: "default";
  plans: Plan[];
  couponCodes: Coupon[];
  bulkDiscountRules: BulkDiscountRule[];
  addonCategories: {
    voice: string;
    graphics: string;
    delivery: string;
    format: string;
    script: string;
    other: string;
  };
  version: number;
  updatedAt: number;
};

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  key: "default",
  plans: [
    {
      id: "editmax-plan",
      name: "EditMax",
      service: "EditMax",
      price: 1000,
      pricePerUnit: 1000,
      unit: "video",
      includes: [
        "Professional video editing",
        "Music & sound design",
        "Captions & subtitles",
        "Smooth transitions",
        "2 revisions included",
        "72-100 hours turnaround",
      ],
      features: [
        "Professional video editing",
        "Music & sound design",
        "Captions & subtitles",
        "Smooth transitions",
        "Color grading & correction",
        "2 revisions included",
        "72-100 hours turnaround",
      ],
      addons: [
        {
          id: "rush-editmax",
          name: "Rush Delivery",
          price: 761,
          category: "delivery",
          description: "Get your videos a day earlier",
        },
        {
          id: "unlimited-revisions-editmax",
          name: "Unlimited Revisions",
          price: 0,
          category: "other",
          description: "Unlimited revisions included",
        },
      ],
    },
    {
      id: "contentmax-plan",
      name: "ContentMax",
      service: "ContentMax",
      price: 1200,
      pricePerUnit: 1200,
      unit: "video",
      includes: [
        "Professional editing",
        "Captions & subtitles",
        "Licensed music",
        "Professional lighting",
        "Audio optimization",
        "5-7 days turnaround",
      ],
      features: [
        "Professional editing",
        "Captions & subtitles",
        "Licensed music",
        "Cinematic editing",
        "Motion graphics",
        "Color grading",
        "5-7 days turnaround",
      ],
      addons: [
        { id: "vo-contentmax", name: "VO", price: 1500, category: "voice", description: "Professional voice-over" },
        {
          id: "advanced-graphics-contentmax",
          name: "Advanced Graphics",
          price: 2250,
          category: "graphics",
          description: "Advanced motion graphics",
        },
        {
          id: "pro-thumbnails-contentmax",
          name: "Pro Thumbnails",
          price: 999,
          category: "graphics",
          description: "Professional thumbnail design",
        },
        {
          id: "additional-format-contentmax",
          name: "Additional Format",
          price: 775,
          category: "format",
          description: "Extra export formats",
        },
      ],
    },
    {
      id: "admax-plan",
      name: "AdMax",
      service: "AdMax",
      price: 2000,
      pricePerUnit: 2000,
      unit: "ad",
      includes: [
        "Complete ad creation",
        "Script writing",
        "Professional shooting",
        "Post-production editing",
        "Full commercial rights",
        "5-7 days turnaround",
      ],
      features: [
        "Complete ad creation",
        "Script writing",
        "Professional shooting",
        "Post-production editing",
        "UGC + studio content mix",
        "Motion graphics & captions",
        "Full commercial rights",
        "5-7 days turnaround",
      ],
      addons: [
        { id: "custom-script-admax", name: "Custom Script", price: 999, category: "script", description: "Custom script writing" },
        { id: "vo-admax", name: "VO", price: 1500, category: "voice", description: "Voice-over recording" },
        { id: "rush-admax", name: "Rush Delivery", price: 999, category: "delivery", description: "24-hour delivery" },
        { id: "additional-creator-admax", name: "Additional Creator", price: 2500, category: "other", description: "Extra creator per ad" },
      ],
    },
  ],
  couponCodes: [
    {
      id: "welcome-10",
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      minOrderAmount: 5000,
      maxDiscount: 5000,
      validFrom: Date.parse("2024-01-01"),
      validUntil: Date.parse("2025-12-31"),
      usageLimit: 1000,
      usedCount: 0,
      applicableServices: ["EditMax", "AdMax", "ContentMax"],
      active: true,
    },
    {
      id: "first-order-15",
      code: "FIRST15",
      type: "percentage",
      value: 15,
      minOrderAmount: 10000,
      maxDiscount: 10000,
      validFrom: Date.parse("2024-01-01"),
      validUntil: Date.parse("2025-12-31"),
      usageLimit: 500,
      usedCount: 0,
      applicableServices: ["EditMax", "AdMax", "ContentMax"],
      active: true,
    },
    {
      id: "bulk-20",
      code: "BULK20",
      type: "percentage",
      value: 20,
      minOrderAmount: 50000,
      maxDiscount: 20000,
      validFrom: Date.parse("2024-01-01"),
      validUntil: Date.parse("2025-12-31"),
      usageLimit: 100,
      usedCount: 0,
      applicableServices: ["AdMax", "ContentMax"],
      active: true,
    },
    {
      id: "fixed-1000",
      code: "SAVE1000",
      type: "fixed",
      value: 1000,
      minOrderAmount: 8000,
      validFrom: Date.parse("2024-01-01"),
      validUntil: Date.parse("2025-12-31"),
      usageLimit: 2000,
      usedCount: 0,
      applicableServices: ["EditMax"],
      active: true,
    },
    {
      id: "testing-99",
      code: "TESTING99",
      type: "fixed_price",
      value: 1,
      validFrom: Date.parse("2024-01-01"),
      validUntil: Date.parse("2099-12-31"),
      usedCount: 0,
      applicableServices: ["EditMax", "AdMax", "ContentMax"],
      active: true,
    },
  ],
  bulkDiscountRules: [
    { minQuantity: 5, type: "percentage", value: 5 },
    { minQuantity: 20, type: "fixed", value: 3000 },
  ],
  addonCategories: {
    voice: "Voice & Audio",
    graphics: "Graphics & Visuals",
    delivery: "Delivery & Rush",
    format: "Export Formats",
    script: "Script & Content",
    other: "Other Services",
  },
  version: 0,
  updatedAt: 0,
};

function normalizeConfigForRead(configFromDb: Omit<PricingConfig, "updatedAt" | "version"> & { updatedAt: number; version: number }) {
  return {
    ...configFromDb,
  } satisfies PricingConfig;
}

export const getPublicPricingConfig = query({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("pricingConfig")
      .withIndex("by_key", (q) => q.eq("key", "default"))
      .first();

    if (!existing) {
      return DEFAULT_PRICING_CONFIG;
    }

    return normalizeConfigForRead({
      key: "default",
      plans: existing.plans,
      couponCodes: existing.couponCodes,
      bulkDiscountRules: existing.bulkDiscountRules,
      addonCategories: existing.addonCategories,
      version: existing.version,
      updatedAt: existing.updatedAt,
    });
  },
});

export const getAdminPricingConfig = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user || user.role !== "SUPER_ADMIN") {
      return null;
    }

    const existing = await ctx.db
      .query("pricingConfig")
      .withIndex("by_key", (q) => q.eq("key", "default"))
      .first();

    if (!existing) {
      return DEFAULT_PRICING_CONFIG;
    }

    return normalizeConfigForRead({
      key: "default",
      plans: existing.plans,
      couponCodes: existing.couponCodes,
      bulkDiscountRules: existing.bulkDiscountRules,
      addonCategories: existing.addonCategories,
      version: existing.version,
      updatedAt: existing.updatedAt,
    });
  },
});

export const upsertPricingConfig = mutation({
  args: {
    plans: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        service: v.union(v.literal("EditMax"), v.literal("ContentMax"), v.literal("AdMax")),
        price: v.number(),
        pricePerUnit: v.number(),
        unit: v.union(v.literal("video"), v.literal("ad")),
        includes: v.array(v.string()),
        addons: v.array(
          v.object({
            id: v.string(),
            name: v.string(),
            price: v.number(),
            description: v.optional(v.string()),
            category: v.union(
              v.literal("voice"),
              v.literal("graphics"),
              v.literal("delivery"),
              v.literal("format"),
              v.literal("script"),
              v.literal("other")
            ),
          })
        ),
        features: v.array(v.string()),
        popular: v.optional(v.boolean()),
        custom: v.optional(v.boolean()),
      })
    ),
    couponCodes: v.array(
      v.object({
        id: v.string(),
        code: v.string(),
        type: v.union(v.literal("percentage"), v.literal("fixed"), v.literal("fixed_price")),
        value: v.number(),
        minOrderAmount: v.optional(v.number()),
        maxDiscount: v.optional(v.number()),
        validFrom: v.optional(v.number()),
        validUntil: v.optional(v.number()),
        usageLimit: v.optional(v.number()),
        usedCount: v.optional(v.number()),
        applicableServices: v.optional(
          v.array(v.union(v.literal("EditMax"), v.literal("ContentMax"), v.literal("AdMax")))
        ),
        applicablePlanIds: v.optional(v.array(v.string())),
        applicableAddonIds: v.optional(v.array(v.string())),
        active: v.boolean(),
      })
    ),
    bulkDiscountRules: v.array(
      v.object({
        minQuantity: v.number(),
        type: v.union(v.literal("percentage"), v.literal("fixed")),
        value: v.number(),
        maxDiscount: v.optional(v.number()),
      })
    ),
    addonCategories: v.object({
      voice: v.string(),
      graphics: v.string(),
      delivery: v.string(),
      format: v.string(),
      script: v.string(),
      other: v.string(),
    }),
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

    const existing = await ctx.db
      .query("pricingConfig")
      .withIndex("by_key", (q) => q.eq("key", "default"))
      .first();

    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("pricingConfig", {
        key: "default",
        plans: args.plans as any,
        couponCodes: args.couponCodes as any,
        bulkDiscountRules: args.bulkDiscountRules as any,
        addonCategories: args.addonCategories as any,
        version: 1,
        updatedAt: now,
        updatedBy: user._id,
      });

      return { key: "default" as const, version: 1, updatedAt: now };
    }

    const nextVersion = (existing.version ?? 0) + 1;
    await ctx.db.patch(existing._id, {
      plans: args.plans as any,
      couponCodes: args.couponCodes as any,
      bulkDiscountRules: args.bulkDiscountRules as any,
      addonCategories: args.addonCategories as any,
      version: nextVersion,
      updatedAt: now,
      updatedBy: user._id,
    });

    return { key: "default" as const, version: nextVersion, updatedAt: now };
  },
});

