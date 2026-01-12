import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        console.log("Password profile params:", JSON.stringify(params));
        
        // Handle missing name during signIn (name is only required for signUp)
        const emailStr = typeof params.email === "string" ? params.email : String(params.email || "");
        const nameStr = typeof params.name === "string" ? params.name : String(params.name || "");
        const name = nameStr || (emailStr.includes("@") ? emailStr.split("@")[0] : "User");
        
        const baseProfile: { email: string; name: string; role?: string } = {
          email: params.email as string,
          name: name as string,
        };
        
        // Only include role if it's provided (typically only during signUp)
        if (params.role) {
          baseProfile.role = params.role as string;
          console.log("Returning profile with role:", JSON.stringify(baseProfile));
          return baseProfile;
        }
        
        console.log("Returning profile without role:", JSON.stringify(baseProfile));
        return baseProfile;
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      // Log immediately to verify callback is being called
      console.log("=== createOrUpdateUser CALLBACK CALLED ===");
      console.log("createOrUpdateUser - Full args:", JSON.stringify(args, null, 2));
      try {
        // Extract profile fields - name and role come from the profile object
        const email = typeof args.profile.email === "string" ? args.profile.email : "";
        const name = typeof args.profile.name === "string" ? args.profile.name : (email.includes("@") ? email.split("@")[0] : "User");
        const role = typeof args.profile.role === "string" ? (args.profile.role as "SUPER_ADMIN" | "PM" | "EDITOR") : undefined;
        
        const profile = { email, name, role };
        const existingUserId = args.existingUserId;
        
        // Infer flow: if role is provided, it's signup; otherwise it's signin
        // Check args.type to determine flow (credentials type usually means signIn/signUp)
        const flow = args.type === "credentials" && role ? "signUp" : "signIn";
        
        // Debug: Log the profile to see if role is being passed
        console.log("createOrUpdateUser - profile:", JSON.stringify(profile));
        console.log("createOrUpdateUser - flow:", flow);
        console.log("createOrUpdateUser - existingUserId:", existingUserId);
        console.log("createOrUpdateUser - args.type:", args.type);
        
        // Note: We can't reliably get tokenIdentifier in the callback because auth.getUserId()
        // might not work in this context. Instead, we'll let Convex Auth handle it and
        // sync it afterwards using syncTokenIdentifier mutation.
        // For now, we'll try to construct it, but the syncTokenIdentifier mutation will fix any mismatches.
        let tokenIdentifier = email; // Default to email
        const providerType = typeof args.provider === "object" && args.provider !== null && "type" in args.provider ? String(args.provider.type) : undefined;
        if (providerType === "password" || args.type === "credentials" || !providerType) {
          // For password provider, it's typically "password:email" but could also be just "email"
          // We'll try both formats and let syncTokenIdentifier fix it
          tokenIdentifier = `password:${email}`;
        }
        
        // Try to get actual identity from auth context if possible (might not work in callback)
        try {
          const identity = await auth.getUserId(ctx);
          if (identity) {
            tokenIdentifier = identity;
            console.log("createOrUpdateUser - Got identity from auth.getUserId:", identity);
          }
        } catch (e) {
          // Identity might not be available in callback - this is expected
          // The syncTokenIdentifier mutation will fix the tokenIdentifier after login
          console.log("createOrUpdateUser - Could not get identity from auth.getUserId (expected in callback), will sync later");
        }
        
        console.log("createOrUpdateUser - Using tokenIdentifier:", tokenIdentifier);
      
      // CRITICAL: Always find user by email first to ensure we're updating the correct user
      // The existingUserId from auth system might not match our users table correctly
      // Check for ALL users with this email (there might be duplicates)
      const allUsersWithEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .collect();
      
      // If there are duplicates, keep the oldest one and delete the rest
      let existingByEmail = allUsersWithEmail.length > 0 ? allUsersWithEmail[0] : null;
      
      if (allUsersWithEmail.length > 1) {
        console.log(`createOrUpdateUser - WARNING: Found ${allUsersWithEmail.length} users with email ${email}`);
        // Sort by creation time, keep the oldest
        allUsersWithEmail.sort((a, b) => (a.createdAt || a._creationTime) - (b.createdAt || b._creationTime));
        existingByEmail = allUsersWithEmail[0];
        
        // Delete duplicates
        for (let i = 1; i < allUsersWithEmail.length; i++) {
          console.log(`createOrUpdateUser - Deleting duplicate user: ${allUsersWithEmail[i]._id}`);
          await ctx.db.delete(allUsersWithEmail[i]._id);
        }
      }
      
      // If user exists by email, use that user (this is the source of truth)
      if (existingByEmail) {
        console.log("createOrUpdateUser - Found existing user by email:", existingByEmail._id);
        console.log("createOrUpdateUser - Current user data:", {
          email: existingByEmail.email,
          name: existingByEmail.name,
          role: existingByEmail.role,
          tokenIdentifier: existingByEmail.tokenIdentifier
        });
        console.log("createOrUpdateUser - existingUserId from auth:", existingUserId, "matches:", existingByEmail._id === existingUserId);
        console.log("createOrUpdateUser - Flow:", flow);
        
        // Link existing user by email to this token identifier
        const updates: Partial<Doc<"users">> = {
          tokenIdentifier: tokenIdentifier,
          lastActive: Date.now(),
        };
        
        // Only update name if provided (during signup) or if user has no name
        // During signIn, preserve existing name
        if (name && name.trim() !== "") {
          updates.name = name;
        } else if (!existingByEmail.name || existingByEmail.name.trim() === "") {
          // Only set name if user doesn't have one
          updates.name = email.split("@")[0]; // Use email username as fallback
        }
        // Otherwise, preserve existing name (don't add to updates)
        
        // Bootstrap missing required fields
        if (!existingByEmail.createdAt) {
          updates.createdAt = Date.now();
        }
        
        // CRITICAL: Role handling - NEVER update role during signIn, always preserve existing
        if (flow === "signIn") {
          // During login, ABSOLUTELY NEVER change role - preserve existing role
          console.log("createOrUpdateUser - Login flow detected, preserving role:", existingByEmail.role);
          // Explicitly do NOT add role to updates - preserve what's in DB
          if (existingByEmail.role === undefined || existingByEmail.role === null) {
            // Only set EDITOR if user truly has no role (shouldn't happen for existing users)
            updates.role = "EDITOR";
            console.log("createOrUpdateUser - WARNING: User has no role, defaulting to EDITOR");
          } else {
            console.log("createOrUpdateUser - Preserving existing role:", existingByEmail.role);
          }
        } else if (flow === "signUp") {
          // During signup, allow setting/updating role
          if (role) {
            updates.role = role;
            console.log("createOrUpdateUser - Signup: Setting role to:", role);
          } else if (existingByEmail.role === undefined || existingByEmail.role === null) {
            // During signup without role, default to EDITOR only if no role exists
            updates.role = "EDITOR";
            console.log("createOrUpdateUser - Signup: Defaulting role to EDITOR");
          }
          // If user already has a role and no role provided in profile, preserve it
        }
        
        if (existingByEmail.status === undefined) {
          updates.status = "ACTIVE";
        }
        if (existingByEmail.unlockedBalance === undefined) {
          updates.unlockedBalance = 0;
        }
        if (existingByEmail.lifetimeEarnings === undefined) {
          updates.lifetimeEarnings = 0;
        }
        
        console.log("createOrUpdateUser - Updates to apply:", JSON.stringify(updates));
        await ctx.db.patch(existingByEmail._id, updates);
        
        // Verify the final state
        const updatedUser = await ctx.db.get(existingByEmail._id);
        console.log("createOrUpdateUser - User after update:", {
          _id: updatedUser?._id,
          email: updatedUser?.email,
          name: updatedUser?.name,
          role: updatedUser?.role,
          tokenIdentifier: updatedUser?.tokenIdentifier
        });
        
        return existingByEmail._id;
      }
      
      // If existingUserId is provided but no user found by email, check if it's a valid user
      // This handles edge cases where email might have changed
      if (existingUserId) {
        const existing = await ctx.db.get(existingUserId);
        if (existing) {
          console.log("createOrUpdateUser - Found existing user by ID (no email match), email mismatch:", existing.email, "vs", email);
          // If emails don't match, this is a problem - but we'll update it to match the login email
          // This handles cases where email was changed in auth but not in our DB
          const updates: Partial<Doc<"users">> = {
            lastActive: Date.now(),
            email: email, // Update email to match login
            name: name,
            tokenIdentifier: tokenIdentifier,
          };
          
          // Bootstrap missing required fields
          if (!existing.createdAt) {
            updates.createdAt = Date.now();
          }
          
          // Role handling: Only update role during signup, never during login
          if (flow === "signUp" && role) {
            updates.role = role;
            console.log("createOrUpdateUser - Signup (by ID, email mismatch): Setting role to:", role);
          } else if (flow === "signUp" && !role && existing.role === undefined) {
            updates.role = "EDITOR";
            console.log("createOrUpdateUser - Signup (by ID, email mismatch): Defaulting role to EDITOR");
          } else if (flow === "signIn") {
            if (existing.role === undefined) {
              updates.role = "EDITOR";
              console.log("createOrUpdateUser - Login (by ID, email mismatch): User has no role, defaulting to EDITOR");
            } else {
              console.log("createOrUpdateUser - Login (by ID, email mismatch): Preserving existing role:", existing.role);
            }
          }
          
          if (existing.status === undefined) {
            updates.status = "ACTIVE";
          }
          if (existing.unlockedBalance === undefined) {
            updates.unlockedBalance = 0;
          }
          if (existing.lifetimeEarnings === undefined) {
            updates.lifetimeEarnings = 0;
          }
          
          await ctx.db.patch(existingUserId, updates);
          console.log("createOrUpdateUser - Updated user (by ID, email mismatch), final role:", updates.role || existing.role);
        }
        return existingUserId;
      }
      
      
      // Create new user with all required fields
      // Use role from profile if provided, otherwise default to EDITOR
      const userRole = role || "EDITOR";
      console.log("createOrUpdateUser - Creating new user with role:", userRole);
      
      const newUserId = await ctx.db.insert("users", {
        tokenIdentifier: tokenIdentifier,
        name: name,
        email: email,
        role: userRole,
        status: "ACTIVE",
        unlockedBalance: 0,
        lifetimeEarnings: 0,
        createdAt: Date.now(),
        lastActive: Date.now(),
      });
      
      console.log("createOrUpdateUser - Created user with ID:", newUserId, "and role:", userRole);
      return newUserId;
      } catch (error) {
        console.error("Error in createOrUpdateUser:", error);
        throw error;
      }
    },
  },
});

