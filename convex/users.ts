import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { auth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";

// Get current authenticated user with full profile
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) {
      console.log("getCurrentUser - No identity found");
      return null;
    }
    
    console.log("getCurrentUser - Identity from auth.getUserId:", identity);
    
    // Try to get email from identity
    // For password auth, identity might be "password:email" or just an account ID
    let email: string | null = null;
    if (identity.includes("@")) {
      // Identity is already an email (or contains email)
      email = identity.includes(":") ? identity.split(":")[1] : identity;
    } else {
      // Identity is an account ID - we can't get email from it directly
      // We'll rely on tokenIdentifier matching or email lookup from syncTokenIdentifier
      console.log("getCurrentUser - Identity is account ID, cannot extract email directly");
    }
    
    // First try to find by tokenIdentifier (exact match)
    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (user) {
      console.log("getCurrentUser - Found user by tokenIdentifier:", user._id, "email:", user.email, "role:", user.role);
      // CRITICAL: Validate email is actually an email, not corrupted data
      if (user.email && user.email.includes("@") && user.email !== user._id) {
        return user;
      } else {
        console.log("getCurrentUser - WARNING: User found by tokenIdentifier has invalid email:", user.email, "Skipping and trying email lookup");
        user = null; // Reset to try email lookup
      }
    }
    
    // If we have an email, try to find user by email (this is the most reliable)
    if (email && email.includes("@")) {
      console.log("getCurrentUser - Looking up user by email:", email);
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      
      if (user) {
        console.log("getCurrentUser - Found user by email:", user._id, "email:", user.email, "role:", user.role, "tokenIdentifier in DB:", user.tokenIdentifier);
        console.log("getCurrentUser - TokenIdentifier mismatch! DB has:", user.tokenIdentifier, "but auth returned:", identity);
        // Note: We can't update in a query, but syncTokenIdentifier mutation will fix this
        return user;
      }
    }
    
    // Fallback: try identity as email if it contains @
    if (!user && identity.includes("@")) {
      const emailFromIdentity = identity.includes(":") ? identity.split(":")[1] : identity;
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", emailFromIdentity))
        .first();
      
      if (user) {
        console.log("getCurrentUser - Found user by identity as email:", user._id, "email:", user.email, "role:", user.role);
        return user;
      }
    }
    
    console.log("getCurrentUser - No user found");
    return null;
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get all users (for SA/PM)
export const listUsers = query({
  args: {
    role: v.optional(v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("PM"),
      v.literal("EDITOR")
    )),
    status: v.optional(v.union(
      v.literal("INVITED"),
      v.literal("ACTIVE"),
      v.literal("REJECTED"),
      v.literal("SUSPENDED")
    )),
  },
  handler: async (ctx, args) => {
    if (args.role) {
      return await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.role!))
        .collect();
    }
    
    if (args.status) {
      return await ctx.db
        .query("users")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }
    
    return await ctx.db.query("users").collect();
  },
});

// Get available editors (ACTIVE editors)
export const getAvailableEditors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "EDITOR"))
      .filter((q) => q.eq(q.field("status"), "ACTIVE"))
      .collect();
  },
});

// CLEANUP: Delete all users (use with caution!)
export const deleteAllUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    console.log(`Deleting ${allUsers.length} users...`);
    
    for (const user of allUsers) {
      await ctx.db.delete(user._id);
    }
    
    console.log("All users deleted");
    return { deleted: allUsers.length };
  },
});

// CLEANUP: Remove duplicate users, keeping the oldest one per email
export const cleanupDuplicateUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const emailMap = new Map<string, Id<"users">[]>();
    
    // Group users by email
    for (const user of allUsers) {
      if (user.email && user.email.includes("@")) {
        const email = user.email.toLowerCase();
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email)!.push(user._id);
      }
    }
    
    let deleted = 0;
    const duplicates: Array<{ email: string; kept: Id<"users">; deleted: Id<"users">[] }> = [];
    
    // For each email with duplicates, keep the oldest and delete the rest
    for (const [email, userIds] of emailMap.entries()) {
      if (userIds.length > 1) {
        // Get all users and sort by creation time
        const users = await Promise.all(userIds.map(id => ctx.db.get(id)));
        const validUsers = users.filter(u => u !== null) as Doc<"users">[];
        validUsers.sort((a, b) => (a.createdAt || a._creationTime) - (b.createdAt || b._creationTime));
        
        // Keep the oldest one
        const kept = validUsers[0];
        const toDelete = validUsers.slice(1);
        
        // Delete duplicates
        for (const user of toDelete) {
          await ctx.db.delete(user._id);
          deleted++;
        }
        
        duplicates.push({
          email,
          kept: kept._id,
          deleted: toDelete.map(u => u._id),
        });
        
        console.log(`Email ${email}: Kept ${kept._id}, deleted ${toDelete.length} duplicates`);
      }
    }
    
    // Also clean up users with corrupted email fields (email = user ID)
    const corruptedUsers = allUsers.filter(u => 
      !u.email || 
      !u.email.includes("@") || 
      u.email === u._id ||
      u.email.length > 100 // Suspiciously long
    );
    
    for (const user of corruptedUsers) {
      await ctx.db.delete(user._id);
      deleted++;
      console.log(`Deleted corrupted user: ${user._id} with email: ${user.email}`);
    }
    
    return { deleted, duplicates };
  },
});

// Sync tokenIdentifier for current user (called after login if needed)
// Also creates user if it doesn't exist (fallback if callback failed)
// Can optionally accept email to help fix corrupted user data
export const syncTokenIdentifier = mutation({
  args: {
    email: v.optional(v.string()), // Optional email to help fix corrupted data
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    console.log("syncTokenIdentifier - Identity from auth.getUserId:", identity);
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    // If user found by tokenIdentifier, validate it's not corrupted
    if (user) {
      console.log("syncTokenIdentifier - User found by tokenIdentifier:", user._id, "email:", user.email, "role:", user.role);
      // Validate email is actually an email (not corrupted data)
      if (user.email && user.email.includes("@") && user.email !== user._id) {
        return user._id;
      } else {
        console.log("syncTokenIdentifier - WARNING: User found by tokenIdentifier has invalid email:", user.email, "Trying email lookup instead");
        // Don't reset user here - we'll fix it below
      }
    }
    
    // Get email - prefer the one passed as argument (most reliable)
    let actualEmail: string | null = args.email || null;
    
    if (!actualEmail) {
      // Try to extract email from identity
      if (identity.includes("@")) {
        actualEmail = identity.includes(":") ? identity.split(":")[1] : identity;
      } else {
        // Identity is an account ID - we can't get email from it
        // This is why we need the email parameter from the client
        console.log("syncTokenIdentifier - Identity is account ID, email parameter is required");
      }
    } else {
      console.log("syncTokenIdentifier - Using email from args:", actualEmail);
    }
    
    // Try to find by email if we have one
    if (actualEmail && actualEmail.includes("@")) {
      console.log("syncTokenIdentifier - Looking up user by email:", actualEmail);
      const userByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", actualEmail))
        .first();
      
      if (userByEmail) {
        console.log("syncTokenIdentifier - Found user by email:", userByEmail._id, "email in DB:", userByEmail.email, "role:", userByEmail.role);
        console.log("syncTokenIdentifier - Current tokenIdentifier:", userByEmail.tokenIdentifier, "Updating to:", identity);
        
        // CRITICAL: Fix corrupted email/name fields
        const updates: Partial<Doc<"users">> = {
          tokenIdentifier: identity,
        };
        
        // If email field is corrupted (doesn't contain @ or equals user ID), fix it
        if (!userByEmail.email || !userByEmail.email.includes("@") || userByEmail.email === userByEmail._id || userByEmail.email !== actualEmail) {
          console.log("syncTokenIdentifier - WARNING: Email field is corrupted:", userByEmail.email, "Fixing to:", actualEmail);
          updates.email = actualEmail;
        }
        
        // If name field is corrupted (equals corrupted email or user ID), fix it
        if (!userByEmail.name || userByEmail.name === userByEmail._id || (!userByEmail.name.includes("@") && userByEmail.name.length > 50)) {
          const fixedName = actualEmail.split("@")[0]; // Use email username as name
          console.log("syncTokenIdentifier - WARNING: Name field is corrupted:", userByEmail.name, "Fixing to:", fixedName);
          updates.name = fixedName;
        }
        
        // Update tokenIdentifier and fix corrupted fields
        await ctx.db.patch(userByEmail._id, updates);
        console.log("syncTokenIdentifier - Updated user successfully:", JSON.stringify(updates));
        
        // Verify the update worked
        const updatedUser = await ctx.db.get(userByEmail._id);
        console.log("syncTokenIdentifier - Verified update:");
        console.log("  - tokenIdentifier:", updatedUser?.tokenIdentifier);
        console.log("  - email:", updatedUser?.email);
        console.log("  - name:", updatedUser?.name);
        console.log("  - role:", updatedUser?.role);
        return userByEmail._id;
      }
    }
    
    // Fallback: If we have an email but didn't find user, try searching all users
    // This handles cases where email field is corrupted but we know the correct email
    if (actualEmail && actualEmail.includes("@")) {
      console.log("syncTokenIdentifier - Email lookup failed, searching all users for matching tokenIdentifier or corrupted email");
      const allUsers = await ctx.db.query("users").collect();
      const matchingUser = allUsers.find((u) => 
        u.tokenIdentifier === identity || 
        (u.email && u.email.includes("@") && u.email.toLowerCase() === actualEmail.toLowerCase())
      );
      
      if (matchingUser) {
        console.log("syncTokenIdentifier - Found user by searching all users:", matchingUser._id, "current email:", matchingUser.email);
        const updates: Partial<Doc<"users">> = {
          tokenIdentifier: identity,
        };
        
        // Always fix email if it's corrupted or doesn't match
        if (!matchingUser.email || !matchingUser.email.includes("@") || matchingUser.email !== actualEmail) {
          updates.email = actualEmail;
        }
        
        // Fix name if corrupted
        if (!matchingUser.name || matchingUser.name === matchingUser._id) {
          updates.name = actualEmail.split("@")[0];
        }
        
        await ctx.db.patch(matchingUser._id, updates);
        console.log("syncTokenIdentifier - Fixed corrupted user data:", JSON.stringify(updates));
        return matchingUser._id;
      }
    }
    
    // Last fallback: try identity as email
    const emailFromIdentity = identity.includes(":") ? identity.split(":")[1] : identity;
    if (emailFromIdentity.includes("@")) {
      console.log("syncTokenIdentifier - Trying identity as email:", emailFromIdentity);
      const userByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", emailFromIdentity))
        .first();
      
      if (userByEmail) {
        console.log("syncTokenIdentifier - Found user by identity as email:", userByEmail._id);
        await ctx.db.patch(userByEmail._id, {
          tokenIdentifier: identity,
        });
        return userByEmail._id;
      }
    }
    
    console.log("syncTokenIdentifier - No user found by email either");
    
    // If user doesn't exist at all, this is a problem
    // The callback should have created the user, or the user should exist
    // Don't create a new user here as it might have the wrong role
    // Instead, throw an error so we know something is wrong
    console.error("syncTokenIdentifier - ERROR: No user found for identity:", identity, "email:", actualEmail);
    console.error("syncTokenIdentifier - This should not happen if auth callback is working correctly");
    throw new Error(`User not found for email: ${actualEmail || emailFromIdentity || identity}. Please contact support.`);
  },
});

// Create user after auth signup
export const createUser = mutation({
  args: {
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("PM"),
      v.literal("EDITOR")
    ),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      // Update token identifier if needed
      await ctx.db.patch(existing._id, {
        tokenIdentifier: args.tokenIdentifier,
        lastActive: Date.now(),
      });
      return existing._id;
    }
    
    // Create new user
    return await ctx.db.insert("users", {
      tokenIdentifier: args.tokenIdentifier,
      name: args.name,
      email: args.email,
      role: args.role,
      status: "ACTIVE",
      unlockedBalance: 0,
      lifetimeEarnings: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    tools: v.optional(v.array(v.string())),
    payoutDetails: v.optional(v.object({
      method: v.union(v.literal("UPI"), v.literal("BANK")),
      upiId: v.optional(v.string()),
      bankName: v.optional(v.string()),
      accountNumber: v.optional(v.string()),
      ifscCode: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) throw new Error("User not found");
    
    const updates: Partial<Doc<"users">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.skills !== undefined) updates.skills = args.skills;
    if (args.tools !== undefined) updates.tools = args.tools;
    if (args.payoutDetails !== undefined) updates.payoutDetails = args.payoutDetails;
    
    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

// Bootstrap SUPER_ADMIN - creates or upgrades a user to superadmin
// Can be used to create the first superadmin or add additional superadmins
// If user already exists, upgrades them to SUPER_ADMIN
export const bootstrapSuperAdmin = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user with this email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingUser) {
      // Update existing user to SUPER_ADMIN (upgrade their role)
      await ctx.db.patch(existingUser._id, {
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        name: args.name, // Update name in case it changed
      });
      return existingUser._id;
    }
    
    // Get tokenIdentifier from auth - try to find by email first
    // For password auth, tokenIdentifier is typically "password:email"
    const tokenIdentifier = `password:${args.email}`;
    
    // Create new SUPER_ADMIN user
    const superAdminId = await ctx.db.insert("users", {
      tokenIdentifier: tokenIdentifier,
      name: args.name,
      email: args.email,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      unlockedBalance: 0,
      lifetimeEarnings: 0,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
    
    return superAdminId;
  },
});

// Update current user's role (for signup flow)
// This allows users to set their own role during signup
export const updateMyRole = mutation({
  args: {
    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("PM"),
      v.literal("EDITOR")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!user) throw new Error("User not found");
    
    // Only allow updating role if user doesn't have one yet, or if they're upgrading
    // This prevents downgrading existing roles
    if (!user.role || user.role === "EDITOR") {
      await ctx.db.patch(user._id, { role: args.role });
      return user._id;
    }
    
    // If user already has a role (PM or SUPER_ADMIN), don't allow downgrade
    // But allow upgrade from PM to SUPER_ADMIN if needed
    if (user.role === "PM" && args.role === "SUPER_ADMIN") {
      await ctx.db.patch(user._id, { role: args.role });
      return user._id;
    }
    
    return user._id;
  },
});

// Update user role (SA only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("PM"),
      v.literal("EDITOR")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized - Only super admins can update user roles");
    }
    
    await ctx.db.patch(args.userId, { role: args.role });
    return args.userId;
  },
});

// Update user status (SA only)
export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("INVITED"),
      v.literal("ACTIVE"),
      v.literal("REJECTED"),
      v.literal("SUSPENDED")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) throw new Error("Not authenticated");
    
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
      .first();
    
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.patch(args.userId, { status: args.status });
    return args.userId;
  },
});

// Update editor balance (internal use)
export const updateEditorBalance = internalMutation({
  args: {
    editorId: v.id("users"),
    amount: v.number(),
    isAddition: v.boolean(),
  },
  handler: async (ctx, args) => {
    const editor = await ctx.db.get(args.editorId);
    if (!editor) throw new Error("Editor not found");
    
    const currentBalance = editor.unlockedBalance ?? 0;
    const newBalance = args.isAddition 
      ? currentBalance + args.amount
      : currentBalance - args.amount;
    
    const updates: Partial<Doc<"users">> = {
      unlockedBalance: Math.max(0, newBalance),
    };
    
    if (args.isAddition) {
      updates.lifetimeEarnings = (editor.lifetimeEarnings ?? 0) + args.amount;
    }
    
    await ctx.db.patch(args.editorId, updates);
  },
});

// Get editor stats
export const getEditorStats = query({
  args: { editorId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const identity = await auth.getUserId(ctx);
    if (!identity) return null;
    
    let editorId = args.editorId;
    
    if (!editorId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity))
        .first();
      if (!user) return null;
      editorId = user._id;
    }
    
    const editor = await ctx.db.get(editorId);
    if (!editor) return null;
    
    // Get active projects count
    const projects = await ctx.db
      .query("projects")
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "COMPLETED"),
          // Check if editor is in editorIds array
        )
      )
      .collect();
    
    const activeProjects = projects.filter(p => 
      p.editorIds.includes(editorId!)
    );
    
    // Get pending milestones
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_editor", (q) => q.eq("assignedEditorId", editorId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "IN_PROGRESS"),
          q.eq(q.field("status"), "SUBMITTED")
        )
      )
      .collect();
    
    return {
      unlockedBalance: editor.unlockedBalance,
      lifetimeEarnings: editor.lifetimeEarnings,
      activeProjectsCount: activeProjects.length,
      pendingMilestonesCount: milestones.length,
    };
  },
});
