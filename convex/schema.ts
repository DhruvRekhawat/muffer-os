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
  v.literal("AdMax"),
  v.literal("Other")
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

const editorHiringStatus = v.union(
  v.literal("ONBOARDING"),
  v.literal("READY_FOR_REVIEW"),
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

const pricingUnit = v.union(v.literal("video"), v.literal("ad"));

const addonCategory = v.union(
  v.literal("voice"),
  v.literal("graphics"),
  v.literal("delivery"),
  v.literal("format"),
  v.literal("script"),
  v.literal("other")
);

const couponType = v.union(
  v.literal("percentage"),
  v.literal("fixed"),
  v.literal("fixed_price")
);

const bulkDiscountType = v.union(v.literal("percentage"), v.literal("fixed"));

const addon = v.object({
  id: v.string(),
  name: v.string(),
  price: v.number(),
  description: v.optional(v.string()),
  category: addonCategory,
});

const plan = v.object({
  id: v.string(),
  name: v.string(),
  service: serviceType,
  price: v.number(),
  pricePerUnit: v.number(),
  unit: pricingUnit,
  includes: v.array(v.string()),
  addons: v.array(addon),
  features: v.array(v.string()),
  popular: v.optional(v.boolean()),
  custom: v.optional(v.boolean()),
});

const coupon = v.object({
  id: v.string(),
  code: v.string(),
  type: couponType,
  value: v.number(),
  minOrderAmount: v.optional(v.number()),
  maxDiscount: v.optional(v.number()),
  validFrom: v.optional(v.number()),
  validUntil: v.optional(v.number()),
  usageLimit: v.optional(v.number()),
  usedCount: v.optional(v.number()),
  applicableServices: v.optional(v.array(serviceType)),
  applicablePlanIds: v.optional(v.array(v.string())),
  applicableAddonIds: v.optional(v.array(v.string())),
  active: v.boolean(),
});

const bulkDiscountRule = v.object({
  minQuantity: v.number(),
  type: bulkDiscountType,
  value: v.number(),
  maxDiscount: v.optional(v.number()),
});

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

    // Address (for onboarding)
    addressLine1: v.optional(v.string()),
    addressLine2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),

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
    
    // Editor tier and rate
    tier: v.optional(v.union(
      v.literal("JUNIOR"),
      v.literal("STANDARD"),
      v.literal("SENIOR"),
      v.literal("ELITE")
    )),
    tierRatePerMin: v.optional(v.number()), // Snapshot of rate at assignment
    
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

    // Hiring/Test project metadata
    isTestProject: v.optional(v.boolean()),
    testForEditorId: v.optional(v.id("users")),

    // Summary / instructions (shown as a card above chat)
    summary: v.optional(v.string()),
    summaryUpdatedAt: v.optional(v.number()),
    summaryUpdatedBy: v.optional(v.id("users")),
    
    // Denormalized for fast reads
    pmId: v.id("users"),
    pmName: v.string(),
    editorIds: v.array(v.id("users")),
    editorNames: v.array(v.string()),
    
    // Progress tracking
    milestoneCount: v.number(),
    completedMilestoneCount: v.number(),
    
    // Budget
    budget: v.optional(v.number()),

    // SKU and payout calculation fields
    skuCode: v.optional(v.string()),
    billableMinutes: v.optional(v.number()),
    difficultyFactor: v.optional(v.number()),
    editorCapAmount: v.optional(v.number()),
    incentivePoolAmount: v.optional(v.number()),
    incentivePoolRemaining: v.optional(v.number()),
    deadlineAt: v.optional(v.number()),

    // Payouts
    // When set, editor earnings for this project have been unlocked to wallet balances.
    payoutsUnlockedAt: v.optional(v.number()),
    
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
    payoutAmount: v.optional(v.number()), // TEMPORARY: Remove after running migration
    bonusEligible: v.optional(v.boolean()),
    
    // Assignment
    assignedEditorId: v.optional(v.id("users")),
    assignedEditorName: v.optional(v.string()),
    
    // Status tracking
    status: milestoneStatus,
    submittedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    
    // QC tracking
    qcGuidelinesScore: v.optional(v.number()), // 1-5
    qcAvQualityScore: v.optional(v.number()),  // 1-5
    qcSelfRelianceScore: v.optional(v.number()), // 1-5
    qcAverage: v.optional(v.number()),
    lateMinutes: v.optional(v.number()),
    
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

  // Editor hiring/onboarding - post-signup gating + test project tracking
  editorHiring: defineTable({
    userId: v.id("users"),
    status: editorHiringStatus,

    // Principles modals (stacked, once-only)
    principlesCompletedAt: v.optional(v.number()),

    // Test task selection (UGC vs Cinematic)
    testTaskType: v.optional(v.union(v.literal("UGC"), v.literal("CINEMATIC"))),
    testDeadlineHours: v.optional(v.union(v.literal(24), v.literal(48))),

    // NDA acceptance
    ndaDocumentName: v.string(), // e.g. "Partner NDA-1.pdf"
    ndaAcceptedName: v.optional(v.string()),
    ndaAcceptedAt: v.optional(v.number()),
    ndaCheckboxesCompletedAt: v.optional(v.number()),
    signedAgreementPdfUrl: v.optional(v.string()),

    // Test project linkage
    testProjectId: v.optional(v.id("projects")),
    testMilestoneId: v.optional(v.id("milestones")),
    testSubmissionId: v.optional(v.id("submissions")),
    testSubmittedAt: v.optional(v.number()),

    // Review tracking
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_updated", ["updatedAt"]),

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

  // Milestone templates - reusable milestone configurations
  milestoneTemplates: defineTable({
    name: v.string(),
    milestones: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      payoutAmount: v.number(),
      order: v.number(),
    })),
    createdAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_created", ["createdAt"]),

  // Pricing configuration - single source of truth for public pricing
  pricingConfig: defineTable({
    key: v.literal("default"), // singleton key
    plans: v.array(plan),
    couponCodes: v.array(coupon),
    bulkDiscountRules: v.array(bulkDiscountRule),
    addonCategories: v.object({
      voice: v.string(),
      graphics: v.string(),
      delivery: v.string(),
      format: v.string(),
      script: v.string(),
      other: v.string(),
    }),
    version: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"])
    .index("by_updated", ["updatedAt"]),

  // Config tables for payout engine
  tierRates: defineTable({
    tier: v.union(
      v.literal("JUNIOR"),
      v.literal("STANDARD"),
      v.literal("SENIOR"),
      v.literal("ELITE")
    ),
    ratePerMin: v.number(),
    rushEligible: v.optional(v.boolean()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tier", ["tier"])
    .index("by_active", ["isActive"]),

  skuCatalog: defineTable({
    skuCode: v.string(),
    name: v.string(),
    serviceType: serviceType,
    billableMinutesBase: v.number(),
    difficultyFactorDefault: v.number(),
    editorBudgetPct: v.number(),
    incentivePoolPct: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["skuCode"])
    .index("by_active", ["isActive"]),

  reliabilityBands: defineTable({
    minLateMinutes: v.number(),
    factor: v.number(),
    createdAt: v.number(),
  })
    .index("by_minutes", ["minLateMinutes"]),

  qualityBands: defineTable({
    minQcAvg: v.number(),
    factor: v.number(),
    createdAt: v.number(),
  })
    .index("by_qc", ["minQcAvg"]),

  // Project invitations
  projectInvitations: defineTable({
    projectId: v.id("projects"),
    projectName: v.string(),
    editorId: v.id("users"),
    editorName: v.string(),
    invitedBy: v.id("users"),
    
    // Payout preview (calculated at invite time)
    payoutPreview: v.object({
      billableMinutes: v.number(),
      tierRate: v.number(),
      base: v.number(),
      minPayout: v.number(),
      maxPayout: v.number(),
      editorCap: v.number(),
      eligibleBonuses: v.array(v.object({
        code: v.string(),
        amount: v.number(),
        condition: v.string(),
      })),
    }),
    
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("REJECTED"),
      v.literal("EXPIRED")
    ),
    expiresAt: v.optional(v.number()),
    respondedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_editor", ["editorId"])
    .index("by_status", ["status"])
    .index("by_editor_status", ["editorId", "status"]),

  // Editor payout records (final calculation breakdown)
  editorPayoutRecords: defineTable({
    projectId: v.id("projects"),
    editorId: v.id("users"),
    
    // Calculation inputs
    billableMinutes: v.number(),
    tierRate: v.number(),
    reliabilityFactor: v.number(),
    qualityFactor: v.number(),
    qcAverage: v.number(),
    lateMinutes: v.number(),
    
    // Breakdown
    basePayout: v.number(),
    afterFactors: v.number(),
    cappedPayout: v.number(),
    bonusAmount: v.number(),
    finalPayout: v.number(),
    
    // Bonuses applied
    bonusesApplied: v.array(v.object({
      code: v.string(),
      amount: v.number(),
    })),
    
    status: v.union(v.literal("PENDING"), v.literal("UNLOCKED")),
    unlockedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_editor", ["editorId"])
    .index("by_status", ["status"]),

  // Notification types enum
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      // Editor notifications
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
      // PM notifications
      v.literal("pm.project.assigned"),
      v.literal("pm.invitation.response"),
      v.literal("pm.submission.ready"),
      v.literal("pm.project.at_risk"),
      v.literal("pm.project.delayed"),
      v.literal("pm.deadline.warning"),
      v.literal("pm.application.new"),
      v.literal("pm.project.completed"),
      // SA notifications
      v.literal("sa.order.placed"),
      v.literal("sa.application.new"),
      v.literal("sa.payout.large"),
      v.literal("sa.project.completed"),
      v.literal("sa.project.danger"),
      v.literal("sa.hiring.decision"),
      v.literal("sa.daily.summary")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.object({
      projectId: v.optional(v.id("projects")),
      milestoneId: v.optional(v.id("milestones")),
      orderId: v.optional(v.id("orders")),
      invitationId: v.optional(v.id("projectInvitations")),
      amount: v.optional(v.number()),
      link: v.optional(v.string()),
    })),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_type", ["type"]),

  // WhatsApp notification log (for tracking)
  whatsappNotificationLog: defineTable({
    userId: v.id("users"),
    phone: v.string(),
    type: v.union(
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
    ),
    templateName: v.string(),
    status: v.union(v.literal("SENT"), v.literal("FAILED")),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Notification preferences (per user)
  notificationPreferences: defineTable({
    userId: v.id("users"),
    inAppEnabled: v.boolean(),
    disabledTypes: v.optional(v.array(v.union(
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
    ))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // WhatsApp template config (admin-managed)
  whatsappTemplates: defineTable({
    type: v.union(
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
    ),
    templateName: v.string(),
    templateLanguage: v.string(),
    parameterMapping: v.array(v.object({
      paramIndex: v.number(),
      dataField: v.string(),
    })),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"]),
});

