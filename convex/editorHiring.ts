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

// Test task config: Drive links and briefs (replace with your links when ready)
const TEST_TASK_CONFIG = {
  UGC: {
    driveLink: "https://drive.google.com/drive/folders/1CADOgJg90JV5h_J9q0gJJi-CsiNvZBbz?usp=drive_link",
    summary: `UGC TEST TASK (15-30 seconds)

📋 Open the link below to understand the task. This document can be updated, so always refer to it for the latest requirements:
https://docs.google.com/document/d/1ECaSAd_4vSxmrw7x3UHwqhuCe1Gxtoa2rqMTHonRTtI/edit?usp=sharing

Read fully before you start. If you can't beat the reference, skip.

Your Goal
Create a 15-30s scroll-stopping, attention-holding UGC edit in the reference style: fast cuts, bold text emphasis, clean audio, pattern interrupts. The raw footage may be low quality on purpose. We're testing your taste + problem-solving.

What You Will Receive
Raw footage + brief, 1 reference edit link. Your submission must match the style and upgrade it.

The "Beat the Reference" Rule (Mandatory)
You must improve at least ONE of these clearly: Hook (first 1-2 seconds), Pacing (no dead air, tighter cuts), Captions (cleaner, more readable), Sound design (voice clarity, music ducking), Visual polish (better grade, overlays). If your edit is "same level" as reference, you will not be shortlisted.

Must-Haves (Non-Negotiable)
- Pattern interrupt every 2-3 seconds (text hit, b-roll, card, overlay)
- Jump cuts on phrases, not just pauses. Keep energy high, clarity higher.
- Text: large emphasis words, clean subtitle flow, stay within safe margins.
- Audio: voice clear and loud, music ducked under voice, no clipping.

Submission: Final export link (Google Drive), one-line note "What I did to beat the reference". File: UGC_TEST_<YourName>_<Date>.mp4. Export: 1080x1920 (9:16), H.264 MP4, 25/30 fps, 10-20 Mbps, 48kHz AAC.

Instant reject: unreadable text, music louder than voice, random effects, slow/flat, late with no message.`,
  },
  CINEMATIC: {
    driveLink: "https://drive.google.com/drive/folders/1CADOgJg90JV5h_J9q0gJJi-CsiNvZBbz?usp=drive_link",
    summary: `CINEMATIC OR COMEDIC TEST (30-45 seconds)

📋 Open the link below to understand the task. This document can be updated, so always refer to it for the latest requirements:
https://docs.google.com/document/d/1ECaSAd_4vSxmrw7x3UHwqhuCe1Gxtoa2rqMTHonRTtI/edit?usp=sharing

Read fully before you start. If you can't beat the reference, skip.

Your Goal
Create a 30-45s cinematic, storytelling-driven cut. This is not "pretty montage." It's emotion + pacing + sound in a micro-story.

What You Will Receive
Raw footage + brief (what the viewer must feel/understand), 1 reference edit link. Your submission must match the vibe and upgrade it.

The "Beat the Reference" Rule (Mandatory)
You must improve at least ONE of these: Hook (curiosity, tension, emotion), Story clarity (beginning → turn → landing), Rhythm (intentional cuts, no filler), Sound design (world-building, clean mix), Visual cinema polish, Ending (strong final beat). If your cut is "same level" as reference, you will not be shortlisted.

Must-Haves (Non-Negotiable)
- Complete micro-moment (setup → shift → payoff). No filler beauty shots.
- Sound design: clean dialogue/VO, atmos + texture, music supports moment.
- Visual: clean exposure/contrast, stabilize where needed, minimal intentional text.

What NOT to do: Meme edits, over-editing, random SFX every cut, heavy UGC-style captions, slow shots with no story.

Submission: Final export link (Google Drive), one-line note. Optional: 10-20 sec timeline screenshot. File: CINE_TEST_<YourName>_<Date>.mp4. Export: 1080x1920 (9:16), H.264 MP4, 25/30 fps, 10-20 Mbps, 48kHz AAC.

Instant reject: unclear story/weak hook, poor audio mix, fake-looking grade, montage not moment, late with no message.`,
  },
} as const;

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
  const taskType = hiring.testTaskType ?? "UGC";
  const deadlineHours = hiring.testDeadlineHours ?? 24;
  const dueDate = now + deadlineHours * 60 * 60 * 1000;
  const config = TEST_TASK_CONFIG[taskType];
  const summary =
    "Download test project files here:\n\n" +
    config.driveLink +
    "\n\nYou have " +
    deadlineHours +
    " hours to complete the test. Submit your deliverable via the milestone form (Google Drive link + notes), not in chat.\n\n---\n\n" +
    config.summary;

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

export const completePrinciples = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "EDITOR") throw new Error("Only editors can complete principles");

    const hiring = await ensureEditorHiring(ctx, user._id);
    const now = Date.now();
    await ctx.db.patch(hiring._id, {
      principlesCompletedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const selectTestTask = mutation({
  args: {
    type: v.union(v.literal("UGC"), v.literal("CINEMATIC")),
    deadlineHours: v.union(v.literal(24), v.literal(48)),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "EDITOR") throw new Error("Only editors can select a test task");

    const hiring = await ensureEditorHiring(ctx, user._id);
    if (!hiring.principlesCompletedAt) {
      throw new Error("Complete the principles first");
    }
    const now = Date.now();
    await ctx.db.patch(hiring._id, {
      testTaskType: args.type,
      testDeadlineHours: args.deadlineHours,
      updatedAt: now,
    });
    const updatedHiring = await ctx.db.get(hiring._id);
    if (!updatedHiring) throw new Error("Hiring record not found");
    const { project } = await ensureTestProject(ctx, user, updatedHiring);
    if (!project) throw new Error("Failed to create test project");
    return { projectId: project._id, slug: project.slug };
  },
});

export const createTestProject = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "EDITOR") throw new Error("Only editors can create a test project");

    const hiring = await ensureEditorHiring(ctx, user._id);
    const { project } = await ensureTestProject(ctx, user, hiring);
    if (!project) throw new Error("Failed to create test project");
    return { projectId: project._id, slug: project.slug };
  },
});

export const acceptNda = mutation({
  args: {
    fullName: v.string(),
    signedAgreementPdfUrl: v.optional(v.string()),
    signedAgreementStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (user.role !== "EDITOR" && user.role !== "PM") throw new Error("Unauthorized");

    const hiring = await ensureEditorHiring(ctx, user._id);
    const now = Date.now();

    let pdfUrl = args.signedAgreementPdfUrl;
    if (!pdfUrl && args.signedAgreementStorageId) {
      pdfUrl = await ctx.storage.getUrl(args.signedAgreementStorageId) ?? undefined;
    }

    if (user.role === "EDITOR") {
      // Editor: NDA only after admin approval.
      if (hiring.status !== "APPROVED") {
        throw new Error("You can sign the NDA only after admin approval.");
      }
      await ctx.db.patch(hiring._id, {
        ndaAcceptedName: args.fullName.trim(),
        ndaAcceptedAt: now,
        ndaCheckboxesCompletedAt: now,
        signedAgreementPdfUrl: pdfUrl,
        updatedAt: now,
      });
      await ctx.db.patch(user._id, { status: "ACTIVE" });
      return null;
    }

    // PM flow: patch NDA and move to admin review.
    await ctx.db.patch(hiring._id, {
      ndaAcceptedName: args.fullName.trim(),
      ndaAcceptedAt: now,
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
      const approver = h.approvedBy ? await ctx.db.get(h.approvedBy) : null;
      result.push({
        hiring: h,
        user: u,
        testSubmission: submission
          ? { _id: submission._id, driveLink: submission.driveLink, notes: submission.notes }
          : null,
        approver: approver ? { name: approver.name, email: approver.email } : null,
      });
    }
    return result;
  },
});

// List all candidates with optional status filter
export const listAllCandidates = query({
  args: {
    status: v.optional(v.union(
      v.literal("ONBOARDING"),
      v.literal("READY_FOR_REVIEW"),
      v.literal("APPROVED"),
      v.literal("REJECTED")
    )),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    
    let items;
    if (args.status) {
      items = await ctx.db
        .query("editorHiring")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      // Get all items, ordered by updatedAt descending
      // Query all and sort manually since we need all statuses
      const allItems = await ctx.db.query("editorHiring").collect();
      items = allItems.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    const result = [];
    for (const h of items) {
      const u = await ctx.db.get(h.userId);
      if (!u) continue;
      const submission = h.testSubmissionId ? await ctx.db.get(h.testSubmissionId) : null;
      const approver = h.approvedBy ? await ctx.db.get(h.approvedBy) : null;
      result.push({
        hiring: h,
        user: u,
        testSubmission: submission
          ? { _id: submission._id, driveLink: submission.driveLink, notes: submission.notes }
          : null,
        approver: approver ? { name: approver.name, email: approver.email } : null,
      });
    }
    return result;
  },
});

export const approveEditor = mutation({
  args: {
    userId: v.id("users"),
    tier: v.optional(v.union(
      v.literal("JUNIOR"),
      v.literal("STANDARD"),
      v.literal("SENIOR"),
      v.literal("ELITE")
    )),
  },
  handler: async (ctx, args) => {
    const sa = await requireSuperAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "EDITOR" && user.role !== "PM") {
      throw new Error("User is not eligible for approval");
    }

    const hiring = await ensureEditorHiring(ctx, args.userId);
    const now = Date.now();

    // For editors, require tier to be set
    if (user.role === "EDITOR" && !args.tier) {
      throw new Error("Tier is required for editor approval");
    }

    // Lookup tier rate if tier is provided
    let tierRatePerMin: number | undefined = undefined;
    if (args.tier) {
      const tierRate = await ctx.db
        .query("tierRates")
        .withIndex("by_tier", (q) => q.eq("tier", args.tier!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      
      if (!tierRate) {
        throw new Error(`Tier rate not found for tier: ${args.tier}`);
      }
      tierRatePerMin = tierRate.ratePerMin;
    }

    // PM: set ACTIVE immediately. Editor: stay INVITED until NDA is signed.
    if (user.role === "PM") {
      await ctx.db.patch(args.userId, { status: "ACTIVE" });
    } else if (user.role === "EDITOR" && args.tier) {
      // Set tier and rate for editor
      await ctx.db.patch(args.userId, {
        tier: args.tier,
        tierRatePerMin,
      });
    }

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
      metadata: { email: user.email, role: user.role, tier: args.tier },
      createdAt: now,
    });

    return args.userId;
  },
});

export const rejectEditor = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sa = await requireSuperAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    if (user.role !== "EDITOR" && user.role !== "PM") {
      throw new Error("User is not eligible for rejection");
    }

    const hiring = await ctx.db
      .query("editorHiring")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!hiring) throw new Error("No hiring record found");
    if (hiring.status !== "READY_FOR_REVIEW") {
      throw new Error("User is not in ready-for-review status");
    }

    const now = Date.now();
    await ctx.db.patch(hiring._id, {
      status: "REJECTED",
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      actorId: sa._id,
      actorRole: sa.role ?? "SUPER_ADMIN",
      action: user.role === "PM" ? "hiring.pm.rejected" : "hiring.editor.rejected",
      entityType: "user",
      entityId: args.userId.toString(),
      metadata: { email: user.email, role: user.role, reason: args.reason },
      createdAt: now,
    });

    return args.userId;
  },
});

