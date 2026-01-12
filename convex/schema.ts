import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Role and status enums as validators
const userRole = v.union(
  v.literal("SUPER_ADMIN"),
  v.literal("PM"),
  v.literal("EDITOR")
);

const userStatus = v.union(
  v.literal("INVITED"),
  v.literal("ACTIVE"),
  v.literal("REJECTED"),
  v.literal("SUSPENDED")
);

const projectStatus = v.union(
  v.literal("ACTIVE"),
  v.literal("AT_RISK"),
  v.literal("DELAYED"),
  v.literal("COMPLETED")
);

const milestoneStatus = v.union(
  v.literal("LOCKED"),
  v.literal("IN_PROGRESS"),
  v.literal("SUBMITTED"),
  v.literal("APPROVED"),
  v.literal("REJECTED")
);

const submissionStatus = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("REJECTED")
);

const orderStatus = v.union(
  v.literal("PAID"),
  v.literal("IN_PROGRESS"),
  v.literal("COMPLETED")
);

const serviceType = v.union(
  v.literal("EditMax"),
  v.literal("ContentMax"),
  v.literal("AdMax")
);

const messageType = v.union(
  v.literal("TEXT"),
  v.literal("IMAGE"),
  v.literal("SYSTEM")
);

const applicationStatus = v.union(
  v.literal("SUBMITTED"),
  v.literal("APPROVED"),
  v.literal("REJECTED")
);

const missionType = v.union(
  v.literal("SPEED"),
  v.literal("VOLUME"),
  v.literal("STREAK")
);

const missionWindow = v.union(
  v.literal("DAILY"),
  v.literal("WEEKLY"),
  v.literal("MONTHLY")
);

const payoutStatus = v.union(
  v.literal("REQUESTED"),
  v.literal("APPROVED"),
  v.literal("PAID"),
  v.literal("REJECTED")
);

export default defineSchema({
  ...authTables,

  // Users table - extends auth users with app-specific fields
  users: defineTable({
    // Auth fields (linked to authTables)
    tokenIdentifier: v.optional(v.string()),
    
    // App-specific fields
    role: v.optional(userRole),
    status: v.optional(userStatus),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    profilePic: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    tools: v.optional(v.array(v.string())),
    experience: v.optional(v.string()),
    canStartImmediately: v.optional(v.boolean()),
    payoutDetails: v.optional(v.object({
      method: v.union(v.literal("UPI"), v.literal("BANK")),
      upiId: v.optional(v.string()),
      bankName: v.optional(v.string()),
      accountNumber: v.optional(v.string()),
      ifscCode: v.optional(v.string()),
    })),
    
    // Financial tracking
    unlockedBalance: v.optional(v.number()),
    lifetimeEarnings: v.optional(v.number()),
    
    createdAt: v.optional(v.number()),
    lastActive: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_token", ["tokenIdentifier"]),

  // Orders - what clients purchase
  orders: defineTable({
    serviceType: serviceType,
    planDetails: v.string(),
    brief: v.string(),
    clientName: v.optional(v.string()),
    clientEmail: v.optional(v.string()),
    totalPrice: v.number(),
    status: orderStatus,
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Projects - the operational entity
  projects: defineTable({
    orderId: v.id("orders"),
    name: v.string(),
    slug: v.string(),
    emoji: v.optional(v.string()),
    background: v.optional(v.string()),
    status: projectStatus,
    
    // Denormalized for fast reads
    pmId: v.id("users"),
    pmName: v.string(),
    editorIds: v.array(v.id("users")),
    editorNames: v.array(v.string()),
    
    // Progress tracking
    milestoneCount: v.number(),
    completedMilestoneCount: v.number(),
    
    // Dates
    dueDate: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_pm", ["pmId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"])
    .index("by_created", ["createdAt"]),

  // Milestones - units of work within projects
  milestones: defineTable({
    projectId: v.id("projects"),
    projectName: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(), // for sequencing
    dueDate: v.optional(v.number()),
    payoutAmount: v.number(),
    bonusEligible: v.optional(v.boolean()),
    
    // Assignment
    assignedEditorId: v.optional(v.id("users")),
    assignedEditorName: v.optional(v.string()),
    
    // Status tracking
    status: milestoneStatus,
    submittedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_editor", ["assignedEditorId"])
    .index("by_status", ["status"])
    .index("by_project_order", ["projectId", "order"]),

  // Submissions - deliverables for milestones
  submissions: defineTable({
    milestoneId: v.id("milestones"),
    projectId: v.id("projects"),
    editorId: v.id("users"),
    editorName: v.string(),
    driveLink: v.string(),
    notes: v.optional(v.string()),
    status: submissionStatus,
    
    // Review
    reviewedBy: v.optional(v.id("users")),
    feedback: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    
    createdAt: v.number(),
  })
    .index("by_milestone", ["milestoneId"])
    .index("by_project", ["projectId"])
    .index("by_editor", ["editorId"])
    .index("by_status", ["status"]),

  // Chat messages - project-scoped communication
  chatMessages: defineTable({
    projectId: v.id("projects"),
    senderId: v.id("users"),
    senderName: v.string(),
    senderRole: userRole,
    type: messageType,
    content: v.string(),
    imageId: v.optional(v.id("_storage")), // For image uploads
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_time", ["projectId", "createdAt"]),

  // Editor applications - hiring pipeline
  editorApplications: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    occupation: v.optional(v.string()),
    experience: v.optional(v.string()),
    tools: v.array(v.string()),
    portfolioLinks: v.array(v.string()),
    canStartImmediately: v.boolean(),
    status: applicationStatus,
    
    // Review tracking
    reviewedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    rejectionCooldownUntil: v.optional(v.number()),
    
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Missions - gamification system
  missions: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    type: missionType,
    target: v.number(), // e.g., 10 videos, 5 days streak
    rewardAmount: v.number(),
    window: missionWindow,
    active: v.boolean(),
    
    // Scope
    eligibleServiceTypes: v.optional(v.array(serviceType)),
    eligibleEditorIds: v.optional(v.array(v.id("users"))),
    
    createdAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_type", ["type"]),

  // Mission progress - per editor
  missionProgress: defineTable({
    missionId: v.id("missions"),
    editorId: v.id("users"),
    progress: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    lastUpdated: v.number(),
  })
    .index("by_mission", ["missionId"])
    .index("by_editor", ["editorId"])
    .index("by_mission_editor", ["missionId", "editorId"]),

  // Payout requests - editor payment workflow
  payoutRequests: defineTable({
    editorId: v.id("users"),
    editorName: v.string(),
    amount: v.number(),
    payoutMethod: v.object({
      method: v.union(v.literal("UPI"), v.literal("BANK")),
      upiId: v.optional(v.string()),
      bankName: v.optional(v.string()),
      accountNumber: v.optional(v.string()),
      ifscCode: v.optional(v.string()),
    }),
    status: payoutStatus,
    
    // Processing
    processedBy: v.optional(v.id("users")),
    processedAt: v.optional(v.number()),
    transactionRef: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    
    createdAt: v.number(),
  })
    .index("by_editor", ["editorId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Audit events - track all important actions
  auditEvents: defineTable({
    actorId: v.id("users"),
    actorRole: userRole,
    action: v.string(), // e.g., "milestone.approved", "payout.processed"
    entityType: v.string(), // e.g., "milestone", "project", "user"
    entityId: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_action", ["action"])
    .index("by_created", ["createdAt"]),
});

