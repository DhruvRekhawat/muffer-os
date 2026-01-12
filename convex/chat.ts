import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Get chat messages for a project
export const getProjectMessages = query({
  args: { 
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || !user.role) return [];
    
    // Check project access
    const project = await ctx.db.get(args.projectId);
    if (!project) return [];
    
    if (user.role === "EDITOR" && !project.editorIds.includes(user._id)) {
      return [];
    }
    if (user.role === "PM" && project.pmId !== user._id) {
      return [];
    }
    
    const messagesQuery = ctx.db
      .query("chatMessages")
      .withIndex("by_project_time", (q) => q.eq("projectId", args.projectId))
      .order("asc");
    
    const messages = await messagesQuery.collect();
    
    if (args.limit) {
      return messages.slice(-args.limit);
    }
    
    return messages;
  },
});

// Send text message
export const sendMessage = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) throw new Error("User not found");
    if (!user.role) throw new Error("User role not set");
    
    // Check project access
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    if (user.role === "EDITOR" && !project.editorIds.includes(user._id)) {
      throw new Error("No access to this project");
    }
    if (user.role === "PM" && project.pmId !== user._id) {
      throw new Error("No access to this project");
    }
    
    const messageId = await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      type: "TEXT",
      content: args.content,
      createdAt: Date.now(),
    });
    
    return messageId;
  },
});

// Send image message
export const sendImageMessage = mutation({
  args: {
    projectId: v.id("projects"),
    imageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) throw new Error("User not found");
    if (!user.role) throw new Error("User role not set");
    
    // Check project access
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    if (user.role === "EDITOR" && !project.editorIds.includes(user._id)) {
      throw new Error("No access to this project");
    }
    if (user.role === "PM" && project.pmId !== user._id) {
      throw new Error("No access to this project");
    }
    
    const messageId = await ctx.db.insert("chatMessages", {
      projectId: args.projectId,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      type: "IMAGE",
      content: args.caption || "",
      imageId: args.imageId,
      createdAt: Date.now(),
    });
    
    return messageId;
  },
});

// Generate upload URL for images
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Get image URL
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Export chat messages (for download)
export const exportChat = query({
  args: { 
    projectId: v.id("projects"),
    format: v.union(v.literal("JSON"), v.literal("CSV"), v.literal("TXT")),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role === "EDITOR") return null;
    
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_project_time", (q) => q.eq("projectId", args.projectId))
      .order("asc")
      .collect();
    
    if (args.format === "JSON") {
      return JSON.stringify(messages, null, 2);
    }
    
    if (args.format === "CSV") {
      const header = "Timestamp,Sender,Role,Type,Content\n";
      const rows = messages.map(m => {
        const date = new Date(m.createdAt).toISOString();
        const content = m.content.replace(/"/g, '""');
        return `"${date}","${m.senderName}","${m.senderRole}","${m.type}","${content}"`;
      }).join("\n");
      return header + rows;
    }
    
    // TXT format
    return messages.map(m => {
      const date = new Date(m.createdAt).toLocaleString();
      return `[${date}] ${m.senderName} (${m.senderRole}): ${m.content}`;
    }).join("\n");
  },
});

