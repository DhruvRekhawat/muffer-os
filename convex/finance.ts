import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

type Bucket = "day" | "month";
type ProjectStatus = "ACTIVE" | "AT_RISK" | "DELAYED" | "COMPLETED";
type OrderStatus = "PAID" | "IN_PROGRESS" | "COMPLETED";
type ServiceType = "EditMax" | "ContentMax" | "AdMax" | "Other";
function clampRange(args: { from?: number; to?: number }) {
  const from = args.from;
  const to = args.to;
  if (from !== undefined && to !== undefined && from > to) {
    return { from: to, to: from };
  }
  return { from, to };
}

function inRange(value: number, range: { from?: number; to?: number }) {
  if (range.from !== undefined && value < range.from) return false;
  if (range.to !== undefined && value > range.to) return false;
  return true;
}

function bucketStartMs(ts: number, bucket: Bucket) {
  const d = new Date(ts);
  if (bucket === "month") {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
  }
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0);
}

async function requireSuperAdmin(ctx: QueryCtx) {
  const identity = await auth.getUserId(ctx);
  if (!identity) return null;
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
    .first();
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

export const getFinanceOverview = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    bucket: v.optional(v.union(v.literal("day"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const user = await requireSuperAdmin(ctx);
    if (!user) return null;

    const bucket: Bucket = args.bucket ?? "day";
    const range = clampRange({ from: args.from, to: args.to });

    const [orders, , payoutRequests, projects] = await Promise.all([
      ctx.db.query("orders").collect() as Promise<Array<Doc<"orders">>>,
      ctx.db.query("milestones").collect() as Promise<Array<Doc<"milestones">>>,
      ctx.db.query("payoutRequests").collect() as Promise<Array<Doc<"payoutRequests">>>,
      ctx.db.query("projects").collect() as Promise<Array<Doc<"projects">>>,
    ]);

    const ordersInRange = orders.filter((o) => inRange(o.createdAt, range));
    const revenueTotal = ordersInRange.reduce((sum, o) => sum + o.totalPrice, 0);

    const revenueByService: Record<ServiceType, number> = {
      EditMax: 0,
      ContentMax: 0,
      AdMax: 0,
      Other: 0,
    };
    for (const o of ordersInRange) {
      revenueByService[o.serviceType] = (revenueByService[o.serviceType] || 0) + o.totalPrice;
    }

    // Note: Costs are now calculated at project level (editorCapAmount) rather than milestone level
    // Calculate costs from projects' editorCapAmount instead
    const expectedCostTotal = projects.reduce((sum: number, p: Doc<"projects">) => sum + (p.editorCapAmount || 0), 0);
    const approvedCostTotal = projects
      .filter((p: Doc<"projects">) => p.status === "COMPLETED")
      .reduce((sum: number, p: Doc<"projects">) => sum + (p.editorCapAmount || 0), 0);
    const remainingLiabilityTotal = projects
      .filter((p: Doc<"projects">) => p.status !== "COMPLETED")
      .reduce((sum: number, p: Doc<"projects">) => sum + (p.editorCapAmount || 0), 0);

    const grossMarginTotal = revenueTotal - expectedCostTotal;

    const pendingPayoutAmount = payoutRequests
      .filter((p) => p.status === "REQUESTED")
      .reduce((sum, p) => sum + p.amount, 0);

    const payoutsPaidInRange = payoutRequests.filter((p) => {
      if (p.status !== "PAID") return false;
      if (!p.processedAt) return false;
      return inRange(p.processedAt, range);
    });
    const payoutsPaidAmount = payoutsPaidInRange.reduce((sum, p) => sum + p.amount, 0);

    // Revenue time series.
    const seriesMap = new Map<number, number>();
    for (const o of ordersInRange) {
      const key = bucketStartMs(o.createdAt, bucket);
      seriesMap.set(key, (seriesMap.get(key) || 0) + o.totalPrice);
    }
    const revenueSeries = Array.from(seriesMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([bucketStart, revenue]) => ({ bucketStart, revenue }));

    return {
      range,
      bucket,
      revenueTotal,
      expectedCostTotal,
      approvedCostTotal,
      remainingLiabilityTotal,
      grossMarginTotal,
      pendingPayoutAmount,
      payoutsPaidAmount,
      revenueByService,
      revenueSeries,
    };
  },
});

export const listProjectFinance = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("ACTIVE"), v.literal("AT_RISK"), v.literal("DELAYED"), v.literal("COMPLETED"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireSuperAdmin(ctx);
    if (!user) return [];

    const range = clampRange({ from: args.from, to: args.to });

    const [projects] = await Promise.all([
      (args.status
        ? ctx.db
            .query("projects")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .collect()
        : ctx.db.query("projects").collect()) as Promise<Array<Doc<"projects">>>,
      ctx.db.query("milestones").collect() as Promise<Array<Doc<"milestones">>>,
    ]);

    const orderIds = Array.from(new Set(projects.map((p) => p.orderId)));
    const orders = await Promise.all(orderIds.map((id) => ctx.db.get(id))) as Array<Doc<"orders"> | null>;
    const orderById = new Map<Id<"orders">, Doc<"orders">>();
    for (const o of orders) {
      if (o) orderById.set(o._id, o);
    }

    const rows = [];
    for (const p of projects) {
      const order = orderById.get(p.orderId);
      if (!order) continue;

      if (!inRange(order.createdAt, range)) continue;

      // Calculate costs from project's editorCapAmount instead of milestone payoutAmount
      const expectedCost = p.editorCapAmount || 0;
      const approvedCost = p.status === "COMPLETED" ? (p.editorCapAmount || 0) : 0;
      const remainingLiability = p.status !== "COMPLETED" ? (p.editorCapAmount || 0) : 0;
      const margin = order.totalPrice - expectedCost;

      rows.push({
        projectId: p._id,
        slug: p.slug,
        projectName: p.name,
        projectStatus: p.status as ProjectStatus,
        pmName: p.pmName,
        orderId: order._id,
        orderCreatedAt: order.createdAt,
        serviceType: order.serviceType as ServiceType,
        orderStatus: order.status as OrderStatus,
        revenue: order.totalPrice,
        expectedCost,
        approvedCost,
        remainingLiability,
        margin,
      });
    }

    // Highest revenue first, then newest.
    rows.sort((a, b) => b.revenue - a.revenue || b.orderCreatedAt - a.orderCreatedAt);
    return rows;
  },
});

export const exportProjectFinanceCsv = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("ACTIVE"), v.literal("AT_RISK"), v.literal("DELAYED"), v.literal("COMPLETED"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireSuperAdmin(ctx);
    if (!user) return null;

    const data = await (async () => {
      const range = clampRange({ from: args.from, to: args.to });
      const [projects] = await Promise.all([
        (args.status
          ? ctx.db
              .query("projects")
              .withIndex("by_status", (q) => q.eq("status", args.status!))
              .collect()
          : ctx.db.query("projects").collect()) as Promise<Array<Doc<"projects">>>,
        ctx.db.query("milestones").collect() as Promise<Array<Doc<"milestones">>>,
      ]);

      const orderIds = Array.from(new Set(projects.map((p) => p.orderId)));
      const orders = (await Promise.all(orderIds.map((id) => ctx.db.get(id)))) as Array<Doc<"orders"> | null>;
      const orderById = new Map<Id<"orders">, Doc<"orders">>();
      for (const o of orders) if (o) orderById.set(o._id, o);

      const out = [];
      for (const p of projects) {
        const order = orderById.get(p.orderId);
        if (!order) continue;
        if (!inRange(order.createdAt, range)) continue;

        // Calculate costs from project's editorCapAmount instead of milestone payoutAmount
        const expectedCost = p.editorCapAmount || 0;
        const approvedCost = p.status === "COMPLETED" ? (p.editorCapAmount || 0) : 0;
        const remainingLiability = p.status !== "COMPLETED" ? (p.editorCapAmount || 0) : 0;
        const margin = order.totalPrice - expectedCost;

        out.push({
          projectName: p.name,
          projectSlug: p.slug,
          projectStatus: p.status as ProjectStatus,
          pmName: p.pmName,
          serviceType: order.serviceType as ServiceType,
          orderStatus: order.status as OrderStatus,
          orderCreatedAt: order.createdAt,
          revenue: order.totalPrice,
          expectedCost,
          approvedCost,
          remainingLiability,
          margin,
        });
      }
      out.sort((a, b) => b.revenue - a.revenue || b.orderCreatedAt - a.orderCreatedAt);
      return out;
    })();

    const header =
      "Project,Slug,Status,PM,Service,OrderStatus,OrderCreatedAt,Revenue,ExpectedCost,ApprovedCost,RemainingLiability,Margin\n";
    const rowsCsv = data
      .map((r) => {
        const created = new Date(r.orderCreatedAt).toISOString();
        const safe = (s: string) => `"${String(s).replaceAll('"', '""')}"`;
        return [
          safe(r.projectName),
          safe(r.projectSlug),
          safe(r.projectStatus),
          safe(r.pmName),
          safe(r.serviceType),
          safe(r.orderStatus),
          safe(created),
          r.revenue,
          r.expectedCost,
          r.approvedCost,
          r.remainingLiability,
          r.margin,
        ].join(",");
      })
      .join("\n");

    return header + rowsCsv;
  },
});

