import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";
import { MAX_ACTIVE_PROJECTS } from "../lib/constants";
import { calculatePayoutPreview } from "./payoutEngine";
import { internal } from "./_generated/api";
import { notifyUser } from "./notifications";

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
      // Editors see projects they're assigned to OR have a PENDING/ACCEPTED invitation for
      const invitedProjectIds = await ctx.db
        .query("projectInvitations")
        .withIndex("by_editor", (q) => q.eq("editorId", user._id))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), "PENDING"),
            q.eq(q.field("status"), "ACCEPTED")
          )
        )
        .collect()
        .then((invs) => [...new Set(invs.map((i) => i.projectId))]);
      projects = projects.filter(
        (p) => p.editorIds.includes(user._id) || invitedProjectIds.includes(p._id)
      );
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
    if (user.role === "EDITOR") {
      const isAssigned = project.editorIds.includes(user._id);
      if (!isAssigned) {
        // Allow access if editor has a PENDING or ACCEPTED invitation for this project
        const invitation = await ctx.db
          .query("projectInvitations")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("editorId"), user._id),
              q.or(
                q.eq(q.field("status"), "PENDING"),
                q.eq(q.field("status"), "ACCEPTED")
              )
            )
          )
          .first();
        if (!invitation) return null;
      }
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
    if (user.role === "EDITOR") {
      const isAssigned = project.editorIds.includes(user._id);
      if (!isAssigned) {
        const invitation = await ctx.db
          .query("projectInvitations")
          .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
          .filter((q) =>
            q.and(
              q.eq(q.field("editorId"), user._id),
              q.or(
                q.eq(q.field("status"), "PENDING"),
                q.eq(q.field("status"), "ACCEPTED")
              )
            )
          )
          .first();
        if (!invitation) return null;
      }
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
    
    // SKU and billing
    skuCode: v.optional(v.string()),
    billableMinutes: v.optional(v.number()),
    difficultyFactor: v.optional(v.number()),
    editorCapAmount: v.optional(v.number()),
    incentivePoolAmount: v.optional(v.number()),
    deadlineAt: v.optional(v.number()),
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
    
    // Calculate editor cap and incentive pool from SKU if provided
    let editorCapAmount = args.editorCapAmount;
    let incentivePoolAmount = args.incentivePoolAmount;
    let billableMinutes = args.billableMinutes;
    
    if (args.skuCode) {
      const sku = await ctx.db
        .query("skuCatalog")
        .withIndex("by_code", (q) => q.eq("skuCode", args.skuCode!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      
      if (sku) {
        billableMinutes = billableMinutes ?? (sku.billableMinutesBase * (args.difficultyFactor ?? sku.difficultyFactorDefault));
        editorCapAmount = editorCapAmount ?? Math.round(args.totalPrice * sku.editorBudgetPct);
        incentivePoolAmount = incentivePoolAmount ?? Math.round(args.totalPrice * sku.incentivePoolPct);
      }
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
      skuCode: args.skuCode,
      billableMinutes,
      difficultyFactor: args.difficultyFactor,
      editorCapAmount,
      incentivePoolAmount,
      incentivePoolRemaining: incentivePoolAmount,
      deadlineAt: args.deadlineAt,
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

// Create order and project together with editor invitations (unified flow)
export const createOrderAndProject = mutation({
  args: {
    // Order fields
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
    
    // Project fields
    projectName: v.string(),
    emoji: v.optional(v.string()),
    background: v.optional(v.string()),
    skuCode: v.optional(v.string()),
    billableMinutes: v.optional(v.number()),
    difficultyFactor: v.optional(v.number()),
    editorCapAmount: v.optional(v.number()),
    deadlineAt: v.optional(v.number()),
    
    // Editor invitations
    editorIds: v.array(v.id("users")),
    // PM assignment (direct)
    pmId: v.id("users"),
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
    
    if (args.totalPrice <= 0) {
      throw new Error("Total price must be greater than 0");
    }
    
    // PM assignment: PM can only assign self; SUPER_ADMIN can assign any PM/SUPER_ADMIN
    if (user.role === "PM" && args.pmId !== user._id) {
      throw new Error("You can only assign yourself as project manager");
    }
    const assignedUser = await ctx.db.get(args.pmId);
    if (!assignedUser) {
      throw new Error("Selected project manager not found");
    }
    if (assignedUser.role !== "PM" && assignedUser.role !== "SUPER_ADMIN") {
      throw new Error("Selected user is not a project manager or admin");
    }
    const pmId = args.pmId as Id<"users">;
    const pmName = assignedUser.name;
    
    // 1. Create order
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
    
    // 2. Calculate SKU-based values if SKU provided
    let editorCapAmount = args.editorCapAmount;
    let incentivePoolAmount: number | undefined;
    let billableMinutes = args.billableMinutes;
    
    if (args.skuCode) {
      const sku = await ctx.db
        .query("skuCatalog")
        .withIndex("by_code", (q) => q.eq("skuCode", args.skuCode!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      
      if (sku) {
        billableMinutes = billableMinutes ?? (sku.billableMinutesBase * (args.difficultyFactor ?? sku.difficultyFactorDefault));
        editorCapAmount = editorCapAmount ?? Math.round(args.totalPrice * sku.editorBudgetPct);
        incentivePoolAmount = Math.round(args.totalPrice * sku.incentivePoolPct);
      }
    }
    
    // 3. Create project with billing fields
    const slug = generateSlug(args.projectName);
    const projectId = await ctx.db.insert("projects", {
      orderId,
      name: args.projectName,
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
      skuCode: args.skuCode,
      billableMinutes,
      difficultyFactor: args.difficultyFactor,
      editorCapAmount,
      incentivePoolAmount,
      incentivePoolRemaining: incentivePoolAmount,
      deadlineAt: args.deadlineAt,
      createdAt: Date.now(),
    });
    
    // 4. Create default milestones
    const defaultMilestones = getDefaultMilestones(args.serviceType, args.totalPrice);
    
    for (let i = 0; i < defaultMilestones.length; i++) {
      await ctx.db.insert("milestones", {
        projectId,
        projectName: args.projectName,
        title: defaultMilestones[i].title,
        description: defaultMilestones[i].description,
        order: i + 1,
        status: i === 0 ? "IN_PROGRESS" : "LOCKED",
        createdAt: Date.now(),
      });
    }
    
    // Update milestone count
    await ctx.db.patch(projectId, {
      milestoneCount: defaultMilestones.length,
    });
    
    // 5. Send invitations to each editor
    for (const editorId of args.editorIds) {
      try {
        // Get editor details
        const editor = await ctx.db.get(editorId);
        if (!editor || editor.role !== "EDITOR" || editor.status !== "ACTIVE") {
          console.warn(`Skipping editor ${editorId}: not active or not an editor`);
          continue;
        }
        
        // Check editor capacity
        const activeProjects = await ctx.db
          .query("projects")
          .filter((q) =>
            q.and(
              q.neq(q.field("status"), "COMPLETED"),
              q.eq(q.field("isTestProject"), false)
            )
          )
          .collect();
        
        const editorActiveProjects = activeProjects.filter(p =>
          p.editorIds.includes(editorId)
        );
        
        if (editorActiveProjects.length >= MAX_ACTIVE_PROJECTS) {
          console.warn(`Skipping editor ${editor.name}: at capacity (${editorActiveProjects.length}/${MAX_ACTIVE_PROJECTS})`);
          continue;
        }
        
        // Check for existing pending/accepted invitation
        const existingInvitation = await ctx.db
          .query("projectInvitations")
          .withIndex("by_project", (q) => q.eq("projectId", projectId))
          .filter((q) =>
            q.and(
              q.eq(q.field("editorId"), editorId),
              q.or(
                q.eq(q.field("status"), "PENDING"),
                q.eq(q.field("status"), "ACCEPTED")
              )
            )
          )
          .first();
        
        if (existingInvitation) {
          console.warn(`Skipping editor ${editor.name}: already has invitation`);
          continue;
        }
        
        // Get project for payout preview
        const project = await ctx.db.get(projectId);
        if (!project) continue;
        
        // Calculate payout preview
        const payoutPreview = await calculatePayoutPreview(ctx, project, editor);
        
        // Create invitation
        await ctx.db.insert("projectInvitations", {
          projectId,
          projectName: args.projectName,
          editorId,
          editorName: editor.name,
          invitedBy: user._id,
          payoutPreview,
          status: "PENDING",
          createdAt: Date.now(),
        });

        // Notify editor about invitation
        await notifyUser(ctx, {
          userId: editorId,
          type: "editor.invitation.received",
          title: "New Project Invitation",
          message: `You've been invited to work on "${args.projectName}"`,
          data: {
            projectId,
            amount: payoutPreview.minPayout,
            link: `/projects/${slug}`,
          },
        });
      } catch (error) {
        console.error(`Error inviting editor ${editorId}:`, error);
        // Continue with other invitations
      }
    }
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "project.created_with_order",
      entityType: "project",
      entityId: projectId,
      metadata: { 
        name: args.projectName, 
        serviceType: args.serviceType,
        editorCount: args.editorIds.length,
      },
      createdAt: Date.now(),
    });
    
    // 6. Return project slug for navigation
    return { projectId, slug, orderId };
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

    const updates: Record<string, unknown> = {};

    if (user.role === "EDITOR") {
      // Editors can only change emoji and background on projects they're assigned to
      const isAssigned = project.editorIds.includes(user._id);
      if (!isAssigned) throw new Error("Editors cannot update projects");
      const editorOnlyFields = args.emoji !== undefined || args.background !== undefined;
      const otherFields = args.name !== undefined || args.summary !== undefined || args.status !== undefined || args.dueDate !== undefined;
      if (otherFields || !editorOnlyFields) {
        throw new Error("Editors can only update icon and background");
      }
      if (args.emoji !== undefined) updates.emoji = args.emoji;
      if (args.background !== undefined) updates.background = args.background;
    } else {
      if (user.role === "PM" && project.pmId !== user._id) {
        throw new Error("Not your project");
      }
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
    }

    await ctx.db.patch(args.projectId, updates);

    // If project is being marked as COMPLETED, trigger payout calculation
    if (args.status === "COMPLETED" && project.status !== "COMPLETED") {
      await ctx.runMutation(internal.payouts.unlockProjectEarnings, {
        projectId: args.projectId,
      });
    }

    // Notify PM if project status changed to at_risk or delayed
    if (args.status && args.status !== project.status) {
      if (args.status === "AT_RISK") {
        await notifyUser(ctx, {
          userId: project.pmId,
          type: "pm.project.at_risk",
          title: "Project At Risk",
          message: `Project "${project.name}" is now marked as at risk`,
          data: {
            projectId: args.projectId,
            link: `/projects/${project.slug}`,
          },
        });
      } else if (args.status === "DELAYED") {
        await notifyUser(ctx, {
          userId: project.pmId,
          type: "pm.project.delayed",
          title: "Project Delayed",
          message: `Project "${project.name}" is now marked as delayed`,
          data: {
            projectId: args.projectId,
            link: `/projects/${project.slug}`,
          },
        });
      }
    }

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

// Invite editor to project (creates invitation instead of direct assignment)
export const inviteEditorToProject = mutation({
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

    if (!user) throw new Error("User not found");
    if (user.role === "EDITOR") {
      throw new Error("Editors cannot invite other editors. Only the project manager or an admin can invite.");
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "PM") {
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
      throw new Error("Editor is already assigned to this project");
    }

    // Check if editor has capacity (max active projects)
    const activeProjects = await ctx.db
      .query("projects")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "COMPLETED"),
          q.eq(q.field("isTestProject"), false)
        )
      )
      .collect();
    
    const editorActiveProjects = activeProjects.filter(p =>
      p.editorIds.includes(args.editorId)
    );
    
    if (editorActiveProjects.length >= MAX_ACTIVE_PROJECTS) {
      throw new Error(`Editor already has ${MAX_ACTIVE_PROJECTS} active projects`);
    }

    // Check for existing pending/accepted invitation
    const existingInvitation = await ctx.db
      .query("projectInvitations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) =>
        q.and(
          q.eq(q.field("editorId"), args.editorId),
          q.or(
            q.eq(q.field("status"), "PENDING"),
            q.eq(q.field("status"), "ACCEPTED")
          )
        )
      )
      .first();
    
    if (existingInvitation) {
      throw new Error("Invitation already exists for this editor");
    }

    // Calculate payout preview
    const payoutPreview = await calculatePayoutPreview(ctx, project, editor);

    // Create invitation
    const invitationId = await ctx.db.insert("projectInvitations", {
      projectId: args.projectId,
      projectName: project.name,
      editorId: args.editorId,
      editorName: editor.name,
      invitedBy: user._id,
      payoutPreview,
      status: "PENDING",
      createdAt: Date.now(),
    });

    return invitationId;
  },
});

// Get pending invitations for current editor
export const getMyPendingInvitations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "EDITOR") return [];

    const invitations = await ctx.db
      .query("projectInvitations")
      .withIndex("by_editor", (q) => q.eq("editorId", user._id))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    // Enrich with project and PM info
    const enriched = [];
    for (const inv of invitations) {
      const project = await ctx.db.get(inv.projectId);
      if (!project) continue;
      
      const pm = await ctx.db.get(project.pmId);
      enriched.push({
        ...inv,
        project: {
          name: project.name,
          slug: project.slug,
          summary: project.summary,
          deadlineAt: project.deadlineAt || project.dueDate,
        },
        pmName: pm?.name || project.pmName,
      });
    }

    return enriched;
  },
});

// Get all invitations for a project (for PM/Admin to see invitation status)
export const getProjectInvitations = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) return null;
    
    // Get project to check permissions
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    
    // Editors and PMs viewing another PM's project get read-only team list (no invitation details)
    const canManageInvitations = user.role === "SUPER_ADMIN" || (user.role === "PM" && project.pmId === user._id);
    if (!canManageInvitations) {
      // Build read-only "accepted" list from project's current editors so Team section always renders
      const editorIds = project.editorIds ?? [];
      const editorNames = project.editorNames ?? [];
      const accepted: Array<{
        _id: Id<"projectInvitations">;
        editorId: Id<"users">;
        editorName: string;
        editorTier?: string;
        respondedAt: number | null;
        payoutPreview: { minPayout: number; maxPayout: number };
      }> = [];
      for (let i = 0; i < editorIds.length; i++) {
        const editorId = editorIds[i];
        const editor = await ctx.db.get(editorId);
        accepted.push({
          _id: editorId as unknown as Id<"projectInvitations">,
          editorId,
          editorName: editorNames[i] ?? editor?.name ?? "Unknown",
          editorTier: editor?.tier,
          respondedAt: null,
          payoutPreview: { minPayout: 0, maxPayout: 0 },
        });
      }
      return {
        all: [],
        pending: [],
        accepted,
        rejected: [],
        expired: [],
        counts: {
          total: accepted.length,
          pending: 0,
          accepted: accepted.length,
          rejected: 0,
          expired: 0,
        },
      };
    }

    // Get all invitations for this project
    const invitations = await ctx.db
      .query("projectInvitations")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Enrich with editor details
    const enriched = [];
    for (const inv of invitations) {
      const editor = await ctx.db.get(inv.editorId);
      enriched.push({
        ...inv,
        editorTier: editor?.tier,
        editorStatus: editor?.status,
      });
    }

    // Group by status
    const pending = enriched.filter(inv => inv.status === "PENDING");
    const accepted = enriched.filter(inv => inv.status === "ACCEPTED");
    const rejected = enriched.filter(inv => inv.status === "REJECTED");
    const expired = enriched.filter(inv => inv.status === "EXPIRED");

    return {
      all: enriched,
      pending,
      accepted,
      rejected,
      expired,
      counts: {
        total: enriched.length,
        pending: pending.length,
        accepted: accepted.length,
        rejected: rejected.length,
        expired: expired.length,
      },
    };
  },
});

// Accept project invitation
export const acceptProjectInvitation = mutation({
  args: {
    invitationId: v.id("projectInvitations"),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "EDITOR") {
      throw new Error("Unauthorized");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");
    
    if (invitation.editorId !== user._id) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "PENDING") {
      throw new Error("Invitation is no longer pending");
    }

    // Check editor still has capacity
    const activeProjects = await ctx.db
      .query("projects")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "COMPLETED"),
          q.eq(q.field("isTestProject"), false)
        )
      )
      .collect();
    
    const editorActiveProjects = activeProjects.filter(p =>
      p.editorIds.includes(user._id)
    );
    
    if (editorActiveProjects.length >= MAX_ACTIVE_PROJECTS) {
      throw new Error(`You already have ${MAX_ACTIVE_PROJECTS} active projects`);
    }

    const project = await ctx.db.get(invitation.projectId);
    if (!project) throw new Error("Project not found");

    // Add editor to project
    await ctx.db.patch(invitation.projectId, {
      editorIds: [...project.editorIds, user._id],
      editorNames: [...project.editorNames, user.name],
    });

    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "ACCEPTED",
      respondedAt: Date.now(),
    });

    // Create system chat message
    await ctx.db.insert("chatMessages", {
      projectId: invitation.projectId,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role ?? "EDITOR",
      type: "SYSTEM",
      content: `✅ ${user.name} accepted the project invitation`,
      createdAt: Date.now(),
    });

    // Notify PM about acceptance
    await notifyUser(ctx, {
      userId: project.pmId,
      type: "pm.invitation.response",
      title: "Invitation Accepted",
      message: `${user.name} accepted your invitation for "${project.name}"`,
      data: {
        projectId: invitation.projectId,
        link: `/projects/${project.slug}`,
      },
    });

    return { projectSlug: project.slug };
  },
});

// Reject project invitation
export const rejectProjectInvitation = mutation({
  args: {
    invitationId: v.id("projectInvitations"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role !== "EDITOR") {
      throw new Error("Unauthorized");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) throw new Error("Invitation not found");
    
    if (invitation.editorId !== user._id) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "PENDING") {
      throw new Error("Invitation is no longer pending");
    }

    const project = await ctx.db.get(invitation.projectId);
    if (!project) throw new Error("Project not found");

    // Update invitation status
    await ctx.db.patch(args.invitationId, {
      status: "REJECTED",
      respondedAt: Date.now(),
    });

    // Notify PM about rejection
    await notifyUser(ctx, {
      userId: project.pmId,
      type: "pm.invitation.response",
      title: "Invitation Declined",
      message: `${user.name} declined your invitation for "${project.name}"`,
      data: {
        projectId: invitation.projectId,
        link: `/projects/${project.slug}`,
      },
    });

    return args.invitationId;
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

    // Exclude test projects from dashboard counts
    projects = projects.filter(p => p.isTestProject !== true);

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

    // Exclude test projects from dashboard stats
    projects = projects.filter(p => p.isTestProject !== true);

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
