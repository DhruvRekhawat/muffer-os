import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

// Get submissions for a milestone
export const getMilestoneSubmissions = query({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", args.milestoneId))
      .order("desc")
      .collect();
  },
});

// Get submissions for a project
export const getProjectSubmissions = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("submissions")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();
  },
});

// Get editor's submissions
export const getEditorSubmissions = query({
  args: { 
    editorId: v.optional(v.id("users")),
    status: v.optional(v.union(
      v.literal("PENDING"),
      v.literal("APPROVED"),
      v.literal("REJECTED")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return [];
    
    let editorId = args.editorId;
    
    if (!editorId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
        .first();
      if (!user) return [];
      editorId = user._id;
    }
    
    let submissions = await ctx.db
      .query("submissions")
      .withIndex("by_editor", (q) => q.eq("editorId", editorId))
      .order("desc")
      .collect();
    
    if (args.status) {
      submissions = submissions.filter(s => s.status === args.status);
    }
    
    return submissions;
  },
});

// Submit deliverable for milestone
export const submitDeliverable = mutation({
  args: {
    milestoneId: v.id("milestones"),
    driveLink: v.string(),
    notes: v.optional(v.string()),
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
    
    const milestone = await ctx.db.get(args.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    
    // Validate editor is assigned
    if (milestone.assignedEditorId !== user._id) {
      throw new Error("You are not assigned to this milestone");
    }
    
    // Validate milestone status
    if (milestone.status !== "IN_PROGRESS" && milestone.status !== "REJECTED") {
      throw new Error("Cannot submit for this milestone status");
    }

    const project = await ctx.db.get(milestone.projectId);
    const isEditorTestProject =
      project?.isTestProject && project.testForEditorId === user._id;

    // Validate link: for editor's test project, accept any link; otherwise require Google Drive/Docs
    if (!isEditorTestProject) {
      if (!args.driveLink.includes("drive.google.com") && !args.driveLink.includes("docs.google.com")) {
        throw new Error("Please provide a valid Google Drive link");
      }
    } else {
      const link = args.driveLink.trim();
      if (!link || (!link.startsWith("http://") && !link.startsWith("https://"))) {
        throw new Error("Please provide a valid link (https:// or http://)");
      }
    }

    // Create submission
    const submissionId = await ctx.db.insert("submissions", {
      milestoneId: args.milestoneId,
      projectId: milestone.projectId,
      editorId: user._id,
      editorName: user.name,
      driveLink: args.driveLink,
      notes: args.notes,
      status: "PENDING",
      createdAt: Date.now(),
    });
    
    // Update milestone status
    await ctx.db.patch(args.milestoneId, {
      status: "SUBMITTED",
      submittedAt: Date.now(),
    });
    
    // Hiring flow hook: if this is the editor's test project, mark READY_FOR_REVIEW
    if (
      project?.isTestProject &&
      project.testForEditorId &&
      project.testForEditorId === user._id
    ) {
      const now = Date.now();
      let hiring = await ctx.db
        .query("editorHiring")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!hiring) {
        const hiringId = await ctx.db.insert("editorHiring", {
          userId: user._id,
          status: "READY_FOR_REVIEW",
          ndaDocumentName: "Partner NDA-1.pdf",
          testProjectId: project._id,
          testMilestoneId: args.milestoneId,
          testSubmissionId: submissionId,
          testSubmittedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        hiring = await ctx.db.get(hiringId);
      } else {
        await ctx.db.patch(hiring._id, {
          status: "READY_FOR_REVIEW",
          testProjectId: hiring.testProjectId ?? project._id,
          testMilestoneId: hiring.testMilestoneId ?? args.milestoneId,
          testSubmissionId: submissionId,
          testSubmittedAt: now,
          updatedAt: now,
        });
      }
    }

    // Create system chat message
    await ctx.db.insert("chatMessages", {
      projectId: milestone.projectId,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      type: "SYSTEM",
      content: `📤 ${user.name} submitted "${milestone.title}" for review`,
      createdAt: Date.now(),
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "submission.created",
      entityType: "submission",
      entityId: submissionId,
      metadata: { milestoneId: args.milestoneId, driveLink: args.driveLink },
      createdAt: Date.now(),
    });
    
    return submissionId;
  },
});

// Approve submission
export const approveSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || !user.role || user.role === "EDITOR") {
      throw new Error("Unauthorized");
    }
    
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    
    if (submission.status !== "PENDING") {
      throw new Error("Submission already reviewed");
    }
    
    const milestone = await ctx.db.get(submission.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    
    const project = await ctx.db.get(submission.projectId);
    if (!project) throw new Error("Project not found");
    
    // Check PM permission
    if (user.role === "PM" && project.pmId !== user._id) {
      throw new Error("Not your project");
    }
    
    // Update submission
    await ctx.db.patch(args.submissionId, {
      status: "APPROVED",
      reviewedBy: user._id,
      feedback: args.feedback,
      reviewedAt: Date.now(),
    });
    
    // Update milestone
    await ctx.db.patch(submission.milestoneId, {
      status: "APPROVED",
      approvedAt: Date.now(),
    });
    
    // Update project completed count
    await ctx.db.patch(submission.projectId, {
      completedMilestoneCount: project.completedMilestoneCount + 1,
    });
    
    // Unlock next milestone
    await ctx.runMutation(internal.milestones.unlockNextMilestone, {
      projectId: submission.projectId,
      completedOrder: milestone.order,
    });
    
    // Create system chat message
    await ctx.db.insert("chatMessages", {
      projectId: submission.projectId,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      type: "SYSTEM",
      content: `✅ ${user.name} approved "${milestone.title}"`,
      createdAt: Date.now(),
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "submission.approved",
      entityType: "submission",
      entityId: args.submissionId,
      metadata: { 
        milestoneId: submission.milestoneId, 
        editorId: submission.editorId,
        amount: milestone.payoutAmount,
      },
      createdAt: Date.now(),
    });
    
    return args.submissionId;
  },
});

// Reject submission
export const rejectSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user || user.role === "EDITOR") {
      throw new Error("Unauthorized");
    }
    
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) throw new Error("Submission not found");
    
    if (submission.status !== "PENDING") {
      throw new Error("Submission already reviewed");
    }
    
    const milestone = await ctx.db.get(submission.milestoneId);
    if (!milestone) throw new Error("Milestone not found");
    
    const project = await ctx.db.get(submission.projectId);
    if (!project) throw new Error("Project not found");
    
    // Check PM permission
    if (user.role === "PM" && project.pmId !== user._id) {
      throw new Error("Not your project");
    }
    
    // Update submission
    await ctx.db.patch(args.submissionId, {
      status: "REJECTED",
      reviewedBy: user._id,
      feedback: args.feedback,
      reviewedAt: Date.now(),
    });
    
    // Update milestone back to REJECTED (allows resubmission)
    await ctx.db.patch(submission.milestoneId, {
      status: "REJECTED",
    });
    
    // Create system chat message
    if (!user.role) throw new Error("User role not set");
    await ctx.db.insert("chatMessages", {
      projectId: submission.projectId,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      type: "SYSTEM",
      content: `❌ ${user.name} requested changes on "${milestone.title}": ${args.feedback}`,
      createdAt: Date.now(),
    });
    
    // Create audit event
    await ctx.db.insert("auditEvents", {
      actorId: user._id,
      actorRole: user.role,
      action: "submission.rejected",
      entityType: "submission",
      entityId: args.submissionId,
      metadata: { 
        milestoneId: submission.milestoneId, 
        editorId: submission.editorId,
        feedback: args.feedback,
      },
      createdAt: Date.now(),
    });
    
    return args.submissionId;
  },
});

