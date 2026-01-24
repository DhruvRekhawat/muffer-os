import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Generate URL-safe slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).substring(2, 6);
}

// Get all projects (role-aware)
export const listProjects = query({
  args: {
    status: v.optional(v.union(
      v.literal("ACTIVE"),
      v.literal("AT_RISK"),
      v.literal("DELAYED"),
      v.literal("COMPLETED")
    )),
    pmId: v.optional(v.id("users")),
    editorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return [];
    
    let projects;
    
    // Filter by specific criteria
    if (args.pmId) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_pm", (q) => q.eq("pmId", args.pmId!))
        .collect();
    } else if (args.status) {
      projects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      projects = await ctx.db
        .query("projects")
        .order("desc")
        .collect();
    }
    
    // Apply role-based filtering
    if (user.role === "EDITOR") {
      // Editors only see projects they're assigned to
      projects = projects.filter(p => p.editorIds.includes(user._id));
    } else if (user.role === "PM") {
      // PMs see their own projects
      projects = projects.filter(p => p.pmId === user._id);
    }
    // SA sees all projects
    
    // Apply editor filter if specified
    if (args.editorId) {
      projects = projects.filter(p => p.editorIds.includes(args.editorId!));
    }

    // Hide test projects from the Projects page/list (still accessible by direct slug).
    projects = projects.filter(p => p.isTestProject !== true);
    
    return projects;
  },
});

// Get single project by slug
export const getProjectBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return null;
    
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (!project) return null;
    
    // Check access
    if (user.role === "EDITOR" && !project.editorIds.includes(user._id)) {
      return null;
    }
    if (user.role === "PM" && project.pmId !== user._id) {
      return null;
    }
    
    return project;
  },
});

// Get project by ID
export const getProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

// Get project by ID with access control (for chat UI)
export const getProjectForCurrentUser = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();

    if (!user) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Check access
    if (user.role === "EDITOR" && !project.editorIds.includes(user._id)) {
      return null;
    }
    if (user.role === "PM" && project.pmId !== user._id) {
      return null;
    }

    return project;
  },
});

// Create new project (with order)
export const createProject = mutation({
  args: {
    // Order details
    serviceType: v.union(
      v.literal("EditMax"),
      v.literal("ContentMax"),
      v.literal("AdMax"),
      v.literal("Other")
    ),
    planDetails: v.string(),
    brief: v.string(),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    totalPrice: v.number(),
    
    // Project details
    name: v.string(),
    emoji: v.optional(v.string()),
    background: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    pmId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PM")) {
      throw new Error("Unauthorized");
    }
    if (user.role === "PM" && user.status !== "ACTIVE") {
      throw new Error("Not approved yet");
    }
    
    // Create order first
    const orderId = await ctx.db.insert("orders", {
      serviceType: args.serviceType,
      planDetails: args.planDetails,
      brief: args.brief,
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      totalPrice: args.totalPrice,
      status: "PAID",
      createdAt: Date.now(),
    });
    
    // Determine PM
    const pmId = args.pmId || user._id;
    let pmName = user.name;
    
    if (args.pmId && args.pmId !== user._id) {
      const pm = await ctx.db.get(args.pmId);
      if (pm) pmName = pm.name;
    }
    
    // Create project
    const slug = generateSlug(args.name);
    const projectId = await ctx.db.insert("projects", {
      orderId,
      name: args.name,
      slug,
      emoji: args.emoji || "🎬",
      background: args.background,
      status: "ACTIVE",
      pmId: pmId as Id<"users">,
      pmName,
      editorIds: [],
      editorNames: [],
      milestoneCount: 0,
      completedMilestoneCount: 0,
      dueDate: args.dueDate,
      createdAt: Date.now(),
    });
    
    // Create default milestones based on service type
    const defaultMilestones = getDefaultMilestones(args.serviceType, args.totalPrice);
    
    for (let i = 0; i < defaultMilestones.length; i++) {
      await ctx.db.insert("milestones", {
        projectId,
        projectName: args.name,
        title: defaultMilestones[i].title,
        description: defaultMilestones[i].description,
        order: i + 1,
        payoutAmount: defaultMilestones[i].payout,
        status: i === 0 ? "IN_PROGRESS" : "LOCKED",
        createdAt: Date.now(),
      });
    }
    
    // Update milestone count
    await ctx.db.patch(projectId, {
      milestoneCount: defaultMilestones.length,
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "project.created",
      entityType: "project",
      entityId: projectId,
      metadata: { name: args.name, serviceType: args.serviceType },
      createdAt: Date.now(),
    });
    
    return { projectId, slug };
  },
});

// Update project
export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    emoji: v.optional(v.string()),
    background: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("ACTIVE"),
      v.literal("AT_RISK"),
      v.literal("DELAYED"),
      v.literal("COMPLETED")
    )),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) throw new Error("User not found");
    if (user.role === "PM" && user.status !== "ACTIVE") {
      throw new Error("Not approved yet");
    }
    
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    // Check permissions
    if (user.role === "EDITOR") {
      throw new Error("Editors cannot update projects");
    }
    if (user.role === "PM" && project.pmId !== user._id) {
      throw new Error("Not your project");
    }
    
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.emoji !== undefined) updates.emoji = args.emoji;
    if (args.background !== undefined) updates.background = args.background;
    if (args.summary !== undefined) {
      updates.summary = args.summary;
      updates.summaryUpdatedAt = Date.now();
      updates.summaryUpdatedBy = user._id;
    }
    if (args.status !== undefined) updates.status = args.status;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    
    await ctx.db.patch(args.projectId, updates);
    return args.projectId;
  },
});

// Assign editor to project
export const assignEditorToProject = mutation({
  args: {
    projectId: v.id("projects"),
    editorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PM")) {
      throw new Error("Unauthorized");
    }
    if (user.role === "PM" && user.status !== "ACTIVE") {
      throw new Error("Not approved yet");
    }
    
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    // PMs can only manage their own projects
    if (user.role === "PM" && project.pmId !== user._id) {
      throw new Error("Not your project");
    }
    
    const editor = await ctx.db.get(args.editorId);
    if (!editor || editor.role !== "EDITOR") {
      throw new Error("Invalid editor");
    }

    const isTestAssignment =
      project.isTestProject === true && project.testForEditorId === editor._id;
    if (!isTestAssignment && editor.status !== "ACTIVE") {
      throw new Error("Editor is not approved yet");
    }
    
    // Check if already assigned
    if (project.editorIds.includes(args.editorId)) {
      return args.projectId;
    }
    
    await ctx.db.patch(args.projectId, {
      editorIds: [...project.editorIds, args.editorId],
      editorNames: [...project.editorNames, editor.name],
    });
    
    return args.projectId;
  },
});

// Get projects at risk (for dashboard)
export const getProjectsAtRisk = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return [];
    if (user.role === "PM" && user.status !== "ACTIVE") return [];
    
    let projects = await ctx.db
      .query("projects")
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "AT_RISK"),
          q.eq(q.field("status"), "DELAYED")
        )
      )
      .collect();
    
    // Apply role-based filtering
    if (user.role === "PM") {
      projects = projects.filter(p => p.pmId === user._id);
    }
    
    return projects;
  },
});

// Admin: Assign editor to project (no auth required for scripts)
// WARNING: This should only be used in development or with proper security
export const assignEditorToProjectAdmin = mutation({
  args: {
    projectId: v.id("projects"),
    editorId: v.id("users"),
    adminKey: v.optional(v.string()), // Simple security key
  },
  handler: async (ctx, args) => {
    // Optional: Add admin key check for security
    // if (args.adminKey !== process.env.ADMIN_KEY) {
    //   throw new Error("Unauthorized");
    // }
    
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    const editor = await ctx.db.get(args.editorId);
    if (!editor) throw new Error("Editor not found");
    
    // Check if already assigned
    if (project.editorIds.includes(args.editorId)) {
      return { success: true, message: "Editor already assigned" };
    }
    
    await ctx.db.patch(args.projectId, {
      editorIds: [...project.editorIds, args.editorId],
      editorNames: [...project.editorNames, editor.name],
    });
    
    return { success: true, projectId: args.projectId, editorId: args.editorId };
  },
});

// Admin: Create project and assign editor (no auth required for scripts)
export const createProjectAndAssignEditor = mutation({
  args: {
    editorId: v.id("users"),
    projectName: v.string(),
    serviceType: v.union(
      v.literal("EditMax"),
      v.literal("ContentMax"),
      v.literal("AdMax"),
      v.literal("Other")
    ),
    totalPrice: v.number(),
    pmId: v.optional(v.id("users")),
    adminKey: v.optional(v.string()), // Simple security key
  },
  handler: async (ctx, args) => {
    // Optional: Add admin key check for security
    // if (args.adminKey !== process.env.ADMIN_KEY) {
    //   throw new Error("Unauthorized");
    // }
    
    // Get or create a PM
    let pmId = args.pmId;
    let pmName = "System PM";
    
    if (pmId) {
      const pm = await ctx.db.get(pmId);
      if (pm) pmName = pm.name;
    } else {
      // Find first PM or SUPER_ADMIN
      const pm = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "PM"))
        .first();
      
      if (!pm) {
        const sa = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "SUPER_ADMIN"))
          .first();
        if (sa) {
          pmId = sa._id;
          pmName = sa.name;
        }
      } else {
        pmId = pm._id;
        pmName = pm.name;
      }
    }
    
    if (!pmId) {
      throw new Error("No PM or SUPER_ADMIN found. Please create one first.");
    }
    
    // Verify editor exists
    const editor = await ctx.db.get(args.editorId);
    if (!editor) throw new Error("Editor not found");
    if (editor.role !== "EDITOR") throw new Error("User is not an editor");
    if (editor.status !== "ACTIVE") throw new Error("Editor is not approved yet");
    
    // Create order
    const orderId = await ctx.db.insert("orders", {
      serviceType: args.serviceType,
      planDetails: "Script-created project",
      brief: `Project assigned to ${editor.name}`,
      totalPrice: args.totalPrice,
      status: "PAID",
      createdAt: Date.now(),
    });
    
    // Create project
    const slug = generateSlug(args.projectName);
    const projectId = await ctx.db.insert("projects", {
      orderId,
      name: args.projectName,
      slug,
      emoji: "🎬",
      status: "ACTIVE",
      pmId: pmId as Id<"users">,
      pmName,
      editorIds: [args.editorId],
      editorNames: [editor.name],
      milestoneCount: 0,
      completedMilestoneCount: 0,
      createdAt: Date.now(),
    });
    
    // Create default milestones
    const defaultMilestones = getDefaultMilestones(args.serviceType, args.totalPrice);
    
    for (let i = 0; i < defaultMilestones.length; i++) {
      await ctx.db.insert("milestones", {
        projectId,
        projectName: args.projectName,
        title: defaultMilestones[i].title,
        description: defaultMilestones[i].description,
        order: i + 1,
        payoutAmount: defaultMilestones[i].payout,
        status: i === 0 ? "IN_PROGRESS" : "LOCKED",
        createdAt: Date.now(),
      });
    }
    
    // Update milestone count
    await ctx.db.patch(projectId, {
      milestoneCount: defaultMilestones.length,
    });
    
    return { projectId, slug, editorId: args.editorId };
  },
});

// Get project dashboard stats
export const getProjectStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return null;
    if (user.role === "PM" && user.status !== "ACTIVE") return null;
    
    let projects = await ctx.db.query("projects").collect();
    
    // Role-based filtering
    if (user.role === "PM") {
      projects = projects.filter(p => p.pmId === user._id);
    } else if (user.role === "EDITOR") {
      projects = projects.filter(p => p.editorIds.includes(user._id));
    }
    
    const active = projects.filter(p => p.status === "ACTIVE").length;
    const atRisk = projects.filter(p => p.status === "AT_RISK").length;
    const delayed = projects.filter(p => p.status === "DELAYED").length;
    const completed = projects.filter(p => p.status === "COMPLETED").length;
    
    return { total: projects.length, active, atRisk, delayed, completed };
  },
});

// Helper: Get default milestones for service type
function getDefaultMilestones(serviceType: string, totalPrice: number) {
  const milestones = {
    EditMax: [
      { title: "First Draft", description: "Initial edit with cuts and basic transitions", payout: totalPrice * 0.3 },
      { title: "Color Grading", description: "Color correction and grading", payout: totalPrice * 0.25 },
      { title: "Sound Design", description: "Audio mixing and sound effects", payout: totalPrice * 0.2 },
      { title: "Final Export", description: "Final review and export", payout: totalPrice * 0.25 },
    ],
    ContentMax: [
      { title: "Script Review", description: "Review and approve script", payout: totalPrice * 0.15 },
      { title: "First Draft", description: "Initial edit", payout: totalPrice * 0.35 },
      { title: "Revisions", description: "Client feedback revisions", payout: totalPrice * 0.25 },
      { title: "Final Delivery", description: "Final export and delivery", payout: totalPrice * 0.25 },
    ],
    AdMax: [
      { title: "Concept Approval", description: "Approve ad concept and storyboard", payout: totalPrice * 0.2 },
      { title: "First Cut", description: "Initial ad edit", payout: totalPrice * 0.3 },
      { title: "Motion Graphics", description: "Add animations and graphics", payout: totalPrice * 0.25 },
      { title: "Final Export", description: "Multi-format export", payout: totalPrice * 0.25 },
    ],
    Other: [
      { title: "First Draft", description: "Initial draft or deliverable", payout: totalPrice * 0.4 },
      { title: "Revisions", description: "Feedback and revisions", payout: totalPrice * 0.3 },
      { title: "Final Delivery", description: "Final deliverable", payout: totalPrice * 0.3 },
    ],
  };

  return milestones[serviceType as keyof typeof milestones] || milestones.Other;
}

// Create project from existing order (admin UI)
export const createProjectFromOrderAdmin = mutation({
  args: {
    orderId: v.id("orders"),
    budget: v.number(),
    dueDate: v.optional(v.number()),
    pmId: v.id("users"),
    editorIds: v.array(v.id("users")),
    milestones: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      payoutAmount: v.number(),
      order: v.number(),
    })),
    projectName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // Only SUPER_ADMIN can create projects from orders
    if (!user || user.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized");
    }
    
    // Get order
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    
    // Check if project already exists for this order
    const existingProject = await ctx.db
      .query("projects")
      .filter((q) => q.eq(q.field("orderId"), args.orderId))
      .first();
    
    if (existingProject) {
      throw new Error("Project already exists for this order");
    }
    
    // Get PM details
    const pm = await ctx.db.get(args.pmId);
    if (!pm) throw new Error("PM not found");
    
    if (pm.role !== "PM" && pm.role !== "SUPER_ADMIN") {
      throw new Error("Selected user is not a PM");
    }
    
    // Get editor details
    const editorNames: string[] = [];
    for (const editorId of args.editorIds) {
      const editor = await ctx.db.get(editorId);
      if (!editor) throw new Error(`Editor ${editorId} not found`);
      if (editor.role !== "EDITOR") {
        throw new Error(`User ${editorId} is not an editor`);
      }
      if (editor.status !== "ACTIVE") {
        throw new Error(`Editor ${editor.name} is not approved yet`);
      }
      editorNames.push(editor.name);
    }
    
    // Generate project name
    const projectName = args.projectName || 
      (order.clientName ? `${order.clientName} - ${order.serviceType}` : `Project - ${order.serviceType}`);
    const slug = generateSlug(projectName);
    
    // Create project
    const projectId = await ctx.db.insert("projects", {
      orderId: args.orderId,
      name: projectName,
      slug,
      emoji: "🎬",
      status: "ACTIVE",
      pmId: args.pmId,
      pmName: pm.name,
      editorIds: args.editorIds,
      editorNames,
      milestoneCount: args.milestones.length,
      completedMilestoneCount: 0,
      budget: args.budget,
      dueDate: args.dueDate,
      createdAt: Date.now(),
    });
    
    // Create milestones
    for (const milestone of args.milestones) {
      await ctx.db.insert("milestones", {
        projectId,
        projectName,
        title: milestone.title,
        description: milestone.description,
        order: milestone.order,
        payoutAmount: milestone.payoutAmount,
        status: milestone.order === 1 ? "IN_PROGRESS" : "LOCKED",
        createdAt: Date.now(),
      });
    }
    
    // Update order status to IN_PROGRESS
    await ctx.db.patch(args.orderId, {
      status: "IN_PROGRESS",
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "project.created.from_order",
      entityType: "project",
      entityId: projectId.toString(),
      metadata: { 
        orderId: args.orderId.toString(),
        projectName,
        budget: args.budget,
      },
      createdAt: Date.now(),
    });
    
    return { projectId, slug };
  },
});

// Internal mutation: Create project from external order (called via HTTP API)
export const createProjectFromOrder = internalMutation({
  args: {
    // Order details from external API
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    service: v.union(
      v.literal("EditMax"),
      v.literal("ContentMax"),
      v.literal("AdMax"),
      v.literal("Other")
    ),
    editMaxPlan: v.optional(v.string()),
    adMaxStyle: v.optional(v.string()),
    adMaxCreatorGender: v.optional(v.string()),
    adMaxCreatorAge: v.optional(v.string()),
    contentMaxLength: v.optional(v.string()),
    addOns: v.array(v.string()),
    wantsSubscription: v.optional(v.boolean()),
    subscriptionBundle: v.optional(v.string()),
    brief: v.optional(v.string()),
    fileLinks: v.optional(v.string()),
    adCount: v.optional(v.number()),
    totalPrice: v.number(),
    discountPercentage: v.optional(v.number()),
    couponCode: v.optional(v.string()),
    originalPrice: v.optional(v.number()),
    externalOrderId: v.optional(v.string()), // ID from external system
  },
  handler: async (ctx, args) => {
    // Find or assign a PM
    let pmId: Id<"users"> | undefined;
    let pmName = "System PM";
    
    const pm = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "PM"))
      .first();
    
    if (!pm) {
      const sa = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "SUPER_ADMIN"))
        .first();
      if (sa) {
        pmId = sa._id;
        pmName = sa.name;
      }
    } else {
      pmId = pm._id;
      pmName = pm.name;
    }
    
    if (!pmId) {
      throw new Error("No PM or SUPER_ADMIN found. Please create one first.");
    }
    
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
    
    // Create order
    const orderId = await ctx.db.insert("orders", {
      serviceType: args.service,
      planDetails,
      brief: args.brief || `Order from ${args.name} (${args.email})`,
      clientName: args.name,
      clientEmail: args.email,
      totalPrice: args.totalPrice,
      status: "PAID", // Assuming payment is already processed
      createdAt: Date.now(),
    });
    
    // Generate project name from client name and service
    const projectName = `${args.name} - ${args.service}${args.company ? ` (${args.company})` : ""}`;
    const slug = generateSlug(projectName);
    
    // Create project
    const projectId = await ctx.db.insert("projects", {
      orderId,
      name: projectName,
      slug,
      emoji: "🎬",
      status: "ACTIVE",
      pmId: pmId as Id<"users">,
      pmName,
      editorIds: [],
      editorNames: [],
      milestoneCount: 0,
      completedMilestoneCount: 0,
      createdAt: Date.now(),
    });
    
    // Create default milestones based on service type
    const defaultMilestones = getDefaultMilestones(args.service, args.totalPrice);
    
    for (let i = 0; i < defaultMilestones.length; i++) {
      await ctx.db.insert("milestones", {
        projectId,
        projectName,
        title: defaultMilestones[i].title,
        description: defaultMilestones[i].description,
        order: i + 1,
        payoutAmount: defaultMilestones[i].payout,
        status: i === 0 ? "IN_PROGRESS" : "LOCKED",
        createdAt: Date.now(),
      });
    }
    
    // Update milestone count
    await ctx.db.patch(projectId, {
      milestoneCount: defaultMilestones.length,
    });
    
    return { projectId, slug, orderId };
  },
});
