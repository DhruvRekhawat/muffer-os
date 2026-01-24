import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

// Get all pending orders (orders without associated projects)
export const listPendingOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN can view orders
    if (!user || user.role !== "SUPER_ADMIN") {
      return [];
    }
    
    // Get all orders
    const allOrders = await ctx.db
      .query("orders")
      .order("desc")
      .collect();
    
    // Get all projects with their orderIds
    const allProjects = await ctx.db
      .query("projects")
      .collect();
    
    const usedOrderIds = new Set(
      allProjects.map(p => p.orderId.toString())
    );
    
    // Filter to only orders without projects
    const pendingOrders = allOrders.filter(order => 
      !usedOrderIds.has(order._id.toString())
    );
    
    return pendingOrders;
  },
});

// Get single order by ID
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN can view orders
    if (!user || user.role !== "SUPER_ADMIN") {
      return null;
    }
    
    return await ctx.db.get(args.orderId);
  },
});

// Create manual order (SUPER_ADMIN only). Does NOT create project.
export const createManualOrder = mutation({
  args: {
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    serviceType: v.union(
      v.literal("EditMax"),
      v.literal("ContentMax"),
      v.literal("AdMax"),
      v.literal("Other")
    ),
    planDetails: v.string(),
    brief: v.string(),
    totalPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user || user.role !== "SUPER_ADMIN") {
      throw new Error("Only SUPER_ADMIN can create manual orders");
    }

    if (args.totalPrice <= 0) {
      throw new Error("Total price must be greater than 0");
    }

    const orderId = await ctx.db.insert("orders", {
      serviceType: args.serviceType,
      planDetails: args.planDetails.trim() || "Manual order",
      brief: args.brief.trim() || `Manual order from ${args.clientName || args.clientEmail || "Customer"}`,
      clientName: args.clientName?.trim() || undefined,
      clientEmail: args.clientEmail?.trim() || undefined,
      totalPrice: args.totalPrice,
      status: "PAID",
      createdAt: Date.now(),
    });

    return { orderId };
  },
});

// Internal mutation: Create order from external API (does NOT create project)
export const createOrderExternal = internalMutation({
  args: {
    // Order details from external API
    name: v.string(),
    email: v.string(),
    service: v.union(
      v.literal("EditMax"),
      v.literal("ContentMax"),
      v.literal("AdMax"),
      v.literal("Other")
    ),
    totalPrice: v.number(),
    brief: v.optional(v.string()),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    editMaxPlan: v.optional(v.string()),
    adMaxStyle: v.optional(v.string()),
    adMaxCreatorGender: v.optional(v.string()),
    adMaxCreatorAge: v.optional(v.string()),
    contentMaxLength: v.optional(v.string()),
    addOns: v.array(v.string()),
    adCount: v.optional(v.number()),
    discountPercentage: v.optional(v.number()),
    couponCode: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    externalOrderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Build plan details string from order data
    const planDetailsParts: string[] = [];
    if (args.editMaxPlan) planDetailsParts.push(`Plan: ${args.editMaxPlan}`);
    if (args.adMaxStyle) planDetailsParts.push(`Style: ${args.adMaxStyle}`);
    if (args.adMaxCreatorGender) planDetailsParts.push(`Gender: ${args.adMaxCreatorGender}`);
    if (args.adMaxCreatorAge) planDetailsParts.push(`Age: ${args.adMaxCreatorAge}`);
    if (args.contentMaxLength) planDetailsParts.push(`Length: ${args.contentMaxLength}`);
    if (args.addOns.length > 0) planDetailsParts.push(`Add-ons: ${args.addOns.join(", ")}`);
    if (args.adCount) planDetailsParts.push(`Ad Count: ${args.adCount}`);
    
    const planDetails = planDetailsParts.length > 0 
      ? planDetailsParts.join(" | ")
      : "Standard Plan";
    
    // Create order only (no project)
    const orderId = await ctx.db.insert("orders", {
      serviceType: args.service,
      planDetails,
      brief: args.brief || `Order from ${args.name || args.clientName || "Customer"} (${args.email})`,
      clientName: args.clientName || args.name,
      clientEmail: args.clientEmail || args.email,
      totalPrice: args.totalPrice,
      status: "PAID", // Payment already processed externally
      createdAt: Date.now(),
    });
    
    return { orderId };
  },
});
