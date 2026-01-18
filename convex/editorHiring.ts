import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { auth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 6)
  );
}

async function requireCurrentUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await auth.getUserId(ctx);
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}

async function requireSuperAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  if (user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
  return user;
}

async function ensureEditorHiring(ctx: MutationCtx, editorId: Id<"users">) {
  const existing = await ctx.db
    .query("editorHiring")
    .withIndex("by_user", (q) => q.eq("userId", editorId))
    .first();
  if (existing) return existing;

  const now = Date.now();
  const id = await ctx.db.insert("editorHiring", {
    userId: editorId,
    status: "ONBOARDING",
    ndaDocumentName: "Partner NDA-1.pdf",
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create editorHiring");
  return created;
}

async function ensureTestProject(
  ctx: MutationCtx,
  editor: Doc<"users">,
  hiring: Doc<"editorHiring">
) {
  // If already linked and project exists, keep it.
  if (hiring.testProjectId) {
    const p = await ctx.db.get(hiring.testProjectId);
    if (p) return { project: p, milestoneId: hiring.testMilestoneId };
  }

  const now = Date.now();
  const dueDate = now + 24 * 60 * 60 * 1000;
  const summary =
    "Please download the test project files here:\n\n" +
    "https://drive.google.com/drive/folders/1CADOgJg90JV5h_J9q0gJJi-CsiNvZBbz?usp=drive_link\n\n" +
    "You have 24 hours to complete the test.\n\n" +
    "Instructions:\n" +
    "- The folder contains raw files and reference files.\n" +
    "- Create the edit to match the reference style as closely as possible.\n" +
    "- Keep your project organized (bins, naming).\n" +
    "- Export the final video and upload it to Google Drive.\n" +
    "- Submit your Google Drive link and a short description in the milestone submission form (not in chat).";

  // Pick a PM owner for the test project (prefer SUPER_ADMIN, then PM).
  const sa = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "SUPER_ADMIN"))
    .first();
  const pm =
    sa ||
    (await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "PM"))
      .first());

  const pmId: Id<"users"> = (pm?._id ?? editor._id) as Id<"users">;
  const pmName = pm?.name ?? editor.name;

  const orderId = await ctx.db.insert("orders", {
    serviceType: "EditMax",
    planDetails: "Editor Test Project",
    brief: `Test project for ${editor.email}`,
    clientName: editor.name,
    clientEmail: editor.email,
    totalPrice: 0,
    status: "PAID",
    createdAt: now,
  });

  const projectName = `${editor.name} - Test Project`;
  const slug = generateSlug(projectName);

  const projectId = await ctx.db.insert("projects", {
    orderId,
    name: projectName,
    slug,
    emoji: "🧪",
    status: "ACTIVE",
    isTestProject: true,
    testForEditorId: editor._id,
    summary,
    summaryUpdatedAt: now,
    summaryUpdatedBy: pmId,
    pmId,
    pmName,
    editorIds: [editor._id],
    editorNames: [editor.name],
    milestoneCount: 1,
    completedMilestoneCount: 0,
    dueDate,
    createdAt: now,
  });

  const milestoneId = await ctx.db.insert("milestones", {
    projectId,
    projectName,
    title: "Test Submission",
    description:
      "Read the Project Summary card above, then submit your deliverable via the milestone form (Google Drive link + notes).",
    order: 1,
    dueDate,
    payoutAmount: 0,
    assignedEditorId: editor._id,
    assignedEditorName: editor.name,
    status: "IN_PROGRESS",
    createdAt: now,
  });

  await ctx.db.patch(hiring._id, {
    testProjectId: projectId,
    testMilestoneId: milestoneId,
    updatedAt: now,
  });

  await ctx.db.insert("auditEvents", {
    actorId: editor._id,
    actorRole: editor.role ?? "EDITOR",
    action: "hiring.test_project.created",
    entityType: "project",
    entityId: projectId.toString(),
    metadata: { editorId: editor._id, milestoneId, dueDate },
    createdAt: now,
  });

  const project = await ctx.db.get(projectId);
  return { project, milestoneId };
}

export const getMyEditorHiring = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "EDITOR" && user.role !== "PM") return null;

    const hiring = await ctx.db
      .query("editorHiring")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!hiring) {
      return { hiring: null, testProject: null };
    }

    const project = hiring.testProjectId
      ? await ctx.db.get(hiring.testProjectId)
      : null;

    return {
      hiring,
      testProject: project
        ? { _id: project._id, slug: project.slug, name: project.name }
        : null,
    };
  },
});

export const updateMyOnboardingDetails = mutation({
  args: {
    phone: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    tools: v.optional(v.array(v.string())),
    experience: v.optional(v.string()),
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "EDITOR" && user.role !== "PM") throw new Error("Unauthorized");

    const hiring = await ensureEditorHiring(ctx, user._id);

    const userUpdates: Partial<Doc<"users">> = {};
    if (args.phone !== undefined) userUpdates.phone = args.phone;
    if (args.skills !== undefined) userUpdates.skills = args.skills;
    if (args.tools !== undefined) userUpdates.tools = args.tools;
    if (args.experience !== undefined) userUpdates.experience = args.experience;
    if (args.addressLine1 !== undefined) userUpdates.addressLine1 = args.addressLine1;
    if (args.addressLine2 !== undefined) userUpdates.addressLine2 = args.addressLine2;
    if (args.city !== undefined) userUpdates.city = args.city;
    if (args.state !== undefined) userUpdates.state = args.state;
    if (args.postalCode !== undefined) userUpdates.postalCode = args.postalCode;
    if (args.country !== undefined) userUpdates.country = args.country;

    await ctx.db.patch(user._id, userUpdates);
    await ctx.db.patch(hiring._id, { updatedAt: Date.now() });
    return user._id;
  },
});

export const acceptNda = mutation({
  args: { fullName: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "EDITOR" && user.role !== "PM") throw new Error("Unauthorized");

    const hiring = await ensureEditorHiring(ctx, user._id);
    const now = Date.now();

    await ctx.db.patch(hiring._id, {
      ndaAcceptedName: args.fullName.trim(),
      ndaAcceptedAt: now,
      updatedAt: now,
    });

    if (user.role === "EDITOR") {
      const { project } = await ensureTestProject(ctx, user, hiring);
      if (!project) throw new Error("Failed to create test project");
      return { projectId: project._id, slug: project.slug };
    }

    // PM flow: no test project. After onboarding + NDA, move to admin review.
    await ctx.db.patch(hiring._id, {
      status: "READY_FOR_REVIEW",
      updatedAt: now,
    });

    return null;
  },
});

export const listReadyForReview = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdmin(ctx);
    const items = await ctx.db
      .query("editorHiring")
      .withIndex("by_status", (q) => q.eq("status", "READY_FOR_REVIEW"))
      .order("desc")
      .collect();

    const result = [];
    for (const h of items) {
      const u = await ctx.db.get(h.userId);
      if (!u) continue;
      const submission = h.testSubmissionId ? await ctx.db.get(h.testSubmissionId) : null;
      result.push({
        hiring: h,
        user: u,
        testSubmission: submission
          ? { _id: submission._id, driveLink: submission.driveLink, notes: submission.notes }
          : null,
      });
    }
    return result;
  },
});

export const approveEditor = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sa = await requireSuperAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "EDITOR" && user.role !== "PM") {
      throw new Error("User is not eligible for approval");
    }

    const hiring = await ensureEditorHiring(ctx, args.userId);
    const now = Date.now();

    await ctx.db.patch(args.userId, { status: "ACTIVE" });
    await ctx.db.patch(hiring._id, {
      status: "APPROVED",
      approvedBy: sa._id,
      approvedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      actorId: sa._id,
      actorRole: sa.role ?? "SUPER_ADMIN",
      action: user.role === "PM" ? "hiring.pm.approved" : "hiring.editor.approved",
      entityType: "user",
      entityId: args.userId.toString(),
      metadata: { email: user.email, role: user.role },
      createdAt: now,
    });

    return args.userId;
  },
});

