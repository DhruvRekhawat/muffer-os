import { mutation } from "./_generated/server";

// Seed function to create test users
// Run this once via the Convex dashboard or by calling the mutation
export const seedTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if users already exist
    const existingUsers = await ctx.db.query("users").collect();
    if (existingUsers.length > 0) {
      return { 
        success: false, 
        message: "Users already exist. Delete them first if you want to reseed.",
        existingCount: existingUsers.length 
      };
    }
    
    // Create Super Admin
    const superAdminId = await ctx.db.insert("users", {
      tokenIdentifier: "admin@muffer.app",
      name: "Alex Admin",
      email: "admin@muffer.app",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      phone: "+91 9876543210",
      unlockedBalance: 0,
      lifetimeEarnings: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
    
    // Create Project Manager
    const pmId = await ctx.db.insert("users", {
      tokenIdentifier: "pm@muffer.app",
      name: "Priya Manager",
      email: "pm@muffer.app",
      role: "PM",
      status: "ACTIVE",
      phone: "+91 9876543211",
      unlockedBalance: 0,
      lifetimeEarnings: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
    
    // Create Editor
    const editorId = await ctx.db.insert("users", {
      tokenIdentifier: "editor@muffer.app",
      name: "Ethan Editor",
      email: "editor@muffer.app",
      role: "EDITOR",
      status: "ACTIVE",
      phone: "+91 9876543212",
      skills: ["Video Editing", "Color Grading", "Motion Graphics"],
      tools: ["Premiere Pro", "After Effects", "DaVinci Resolve"],
      experience: "3 years of professional video editing experience",
      canStartImmediately: true,
      payoutDetails: {
        method: "UPI",
        upiId: "ethan@upi",
      },
      unlockedBalance: 15000,
      lifetimeEarnings: 125000,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
    
    // Create a sample order
    const orderId = await ctx.db.insert("orders", {
      serviceType: "EditMax",
      planDetails: "Pro Plan - 5 Videos",
      brief: "Brand campaign videos for Q4 launch. Modern, fast-paced editing with dynamic transitions. Target audience: 18-35 professionals.",
      clientName: "TechCorp Inc.",
      clientEmail: "marketing@techcorp.com",
      totalPrice: 50000,
      status: "IN_PROGRESS",
      createdAt: Date.now(),
    });
    
    // Create a sample project
    const projectId = await ctx.db.insert("projects", {
      orderId,
      name: "TechCorp Q4 Campaign",
      slug: "techcorp-q4-campaign",
      emoji: "🚀",
      status: "ACTIVE",
      pmId,
      pmName: "Priya Manager",
      editorIds: [editorId],
      editorNames: ["Ethan Editor"],
      milestoneCount: 4,
      completedMilestoneCount: 1,
      dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 days from now
      createdAt: Date.now(),
    });
    
    // Create milestones for the project
    const milestones = [
      { title: "First Draft", description: "Initial edit with cuts and basic transitions", payout: 15000, status: "APPROVED" as const, order: 1 },
      { title: "Color Grading", description: "Color correction and grading", payout: 12500, status: "IN_PROGRESS" as const, order: 2 },
      { title: "Sound Design", description: "Audio mixing and sound effects", payout: 10000, status: "LOCKED" as const, order: 3 },
      { title: "Final Export", description: "Final review and export", payout: 12500, status: "LOCKED" as const, order: 4 },
    ];
    
    for (const m of milestones) {
      await ctx.db.insert("milestones", {
        projectId,
        projectName: "TechCorp Q4 Campaign",
        title: m.title,
        description: m.description,
        order: m.order,
        assignedEditorId: editorId,
        assignedEditorName: "Ethan Editor",
        status: m.status,
        approvedAt: m.status === "APPROVED" ? Date.now() - 2 * 24 * 60 * 60 * 1000 : undefined,
        createdAt: Date.now(),
      });
    }
    
    // Create a sample mission
    await ctx.db.insert("missions", {
      title: "Weekend Warrior",
      description: "Complete 5 milestones this week to earn a bonus!",
      type: "VOLUME",
      target: 5,
      rewardAmount: 5000,
      window: "WEEKLY",
      active: true,
      createdAt: Date.now(),
    });
    
    // Create mission progress for editor
    await ctx.db.insert("missionProgress", {
      missionId: (await ctx.db.query("missions").first())!._id,
      editorId,
      progress: 2,
      completed: false,
      lastUpdated: Date.now(),
    });
    
    // Add some chat messages
    await ctx.db.insert("chatMessages", {
      projectId,
      senderId: pmId,
      senderName: "Priya Manager",
      senderRole: "PM",
      type: "TEXT",
      content: "Hey Ethan! Great work on the first draft. The client loved it! 🎉",
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    });
    
    await ctx.db.insert("chatMessages", {
      projectId,
      senderId: editorId,
      senderName: "Ethan Editor",
      senderRole: "EDITOR",
      type: "TEXT",
      content: "Thanks Priya! Working on the color grading now. Should have it ready by tomorrow.",
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    });
    
    await ctx.db.insert("chatMessages", {
      projectId,
      senderId: editorId,
      senderName: "Ethan Editor",
      senderRole: "EDITOR",
      type: "SYSTEM",
      content: "📤 Ethan Editor submitted \"First Draft\" for review",
      createdAt: Date.now() - 2.5 * 24 * 60 * 60 * 1000,
    });
    
    await ctx.db.insert("chatMessages", {
      projectId,
      senderId: pmId,
      senderName: "Priya Manager",
      senderRole: "PM",
      type: "SYSTEM",
      content: "✅ Priya Manager approved \"First Draft\" — ₹15,000 unlocked for Ethan Editor",
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    });
    
    return {
      success: true,
      message: "Seed data created successfully!",
      users: {
        superAdmin: { id: superAdminId, email: "admin@muffer.app", password: "admin123" },
        pm: { id: pmId, email: "pm@muffer.app", password: "pm123" },
        editor: { id: editorId, email: "editor@muffer.app", password: "editor123" },
      },
      projectId,
    };
  },
});

// Helper to clear all data (use with caution!)
export const clearAllData = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "users", "orders", "projects", "milestones", "submissions",
      "chatMessages", "editorApplications", "missions", "missionProgress",
      "payoutRequests", "auditEvents"
    ] as const;
    
    let totalDeleted = 0;
    
    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        totalDeleted++;
      }
    }
    
    return { 
      success: true, 
      message: `Deleted ${totalDeleted} documents from ${tables.length} tables` 
    };
  },
});

