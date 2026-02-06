import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Notification type union
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

// Core notification function - called from any mutation
export async function notifyUser(
  ctx: { db: any; scheduler: any },
  args: {
    userId: Id<"users">;
    type: Doc<"notifications">["type"];
    title: string;
    message: string;
    data?: {
      projectId?: Id<"projects">;
      milestoneId?: Id<"milestones">;
      orderId?: Id<"orders">;
      invitationId?: Id<"projectInvitations">;
      amount?: number;
      link?: string;
    };
  }
) {
  const user = await ctx.db.get(args.userId);
  if (!user) return;

  const prefs = await ctx.db
    .query("notificationPreferences")
    .withIndex("by_user", (q: { eq: (a: string, b: unknown) => unknown }) => q.eq("userId", args.userId))
    .first();

  // 1. Create in-app notification (if enabled)
  const inAppEnabled = prefs?.inAppEnabled !== false;
  const typeDisabled = prefs?.disabledTypes?.includes(args.type);
  
  if (inAppEnabled && !typeDisabled) {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      data: args.data,
      isRead: false,
      createdAt: Date.now(),
    });
  }

  // 2. Send WhatsApp (always, if user has phone)
  if (user.phone) {
    await ctx.scheduler.runAfter(0, internal.whatsapp.sendNotification, {
      userId: args.userId,
      phone: user.phone,
      type: args.type,
      data: args.data,
    });
  }
}

// Get notifications for current user
export const getMyNotifications = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) return [];

    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc");

    if (args.unreadOnly) {
      query = ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
        .order("desc");
    }

    const notifications = await query.take(args.limit ?? 50);
    return notifications;
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    return unreadNotifications.length;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) throw new Error("User not found");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new Error("Notification not found");

    if (notification.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) throw new Error("User not found");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return { count: unreadNotifications.length };
  },
});

// Get notification preferences for current user
export const getMyPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) return null;

    const prefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return prefs;
  },
});

// Update notification preferences
export const updatePreferences = mutation({
  args: {
    inAppEnabled: v.boolean(),
    disabledTypes: v.optional(v.array(notificationType)),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) throw new Error("User not found");

    const existingPrefs = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();

    if (existingPrefs) {
      await ctx.db.patch(existingPrefs._id, {
        inAppEnabled: args.inAppEnabled,
        disabledTypes: args.disabledTypes,
        updatedAt: now,
      });
      return existingPrefs._id;
    } else {
      return await ctx.db.insert("notificationPreferences", {
        userId: user._id,
        inAppEnabled: args.inAppEnabled,
        disabledTypes: args.disabledTypes,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Test notification - sends a test notification to current user
export const sendTestNotification = mutation({
  args: {
    type: notificationType,
    title: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) throw new Error("User not found");

    const title = args.title ?? "Test Notification";
    const message = args.message ?? `This is a test notification of type: ${args.type}`;

    await notifyUser(ctx, {
      userId: user._id,
      type: args.type,
      title,
      message,
      data: {
        amount: 1000,
        link: "/notifications",
      },
    });

    return {
      success: true,
      userId: user._id,
      phone: user.phone ?? "No phone number",
      type: args.type,
    };
  },
});

// Get WhatsApp notification logs for current user
export const getMyWhatsAppLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) return [];

    const logs = await ctx.db
      .query("whatsappNotificationLog")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 20);

    return logs;
  },
});

// Check WhatsApp template status for a notification type
export const checkTemplateStatus = query({
  args: {
    type: notificationType,
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("whatsappTemplates")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .first();

    return template
      ? {
          exists: true,
          isActive: template.isActive,
          templateName: template.templateName,
          templateLanguage: template.templateLanguage,
        }
      : { exists: false };
  },
});

// Delete old notifications (for cleanup)
export const deleteOldNotifications = internalMutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoffDate = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;
    
    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.lt(q.field("createdAt"), cutoffDate))
      .collect();

    let deleted = 0;
    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
      deleted++;
    }

    return { deleted };
  },
});
