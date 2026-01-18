"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

// Auth state hook
export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.getCurrentUser);
  
  // Debug logging with full user object
  useEffect(() => {
    console.log("=== useAuth Debug ===");
    console.log("useAuth - isLoading:", isLoading);
    console.log("useAuth - isAuthenticated:", isAuthenticated);
    console.log("useAuth - user object:", JSON.stringify(user, null, 2));
    if (user) {
      console.log("useAuth - user._id:", user._id);
      console.log("useAuth - user.email:", user.email);
      console.log("useAuth - user.name:", user.name);
      console.log("useAuth - user.role:", user.role);
      console.log("useAuth - user.tokenIdentifier:", user.tokenIdentifier);
    } else {
      console.log("useAuth - user is null/undefined");
    }
    console.log("====================");
  }, [user, isLoading, isAuthenticated]);
  
  return {
    isLoading: isLoading || (isAuthenticated && user === undefined),
    isAuthenticated,
    user,
    role: user?.role,
  };
}

// Sign in with email/password
export function useSignIn() {
  const { signIn } = useAuthActions();
  const syncTokenIdentifier = useMutation(api.users.syncTokenIdentifier);
  const updateMyRole = useMutation(api.users.updateMyRole);
  const router = useRouter();
  
  const signInWithPassword = useCallback(async (
    email: string,
    password: string,
    flow: "signIn" | "signUp" = "signIn",
    name?: string,
    role?: "SUPER_ADMIN" | "PM" | "EDITOR"
  ) => {
    try {
      const signInParams: Record<string, string> = {
        email,
        password,
        flow,
      };
      
      if (name) {
        signInParams.name = name;
      }
      
      // Pass role for signup flow (only for signUp, not signIn)
      if (flow === "signUp" && role) {
        signInParams.role = role;
        console.log("Signing up with role:", role);
      }
      
      console.log("Sign in params:", { ...signInParams, password: "***" });
      
      // Sign in/up - Convex Auth handles password storage automatically
      await signIn("password", signInParams);
      
      // Wait a bit for the user to be created/updated by callback
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Sync tokenIdentifier in case there's a mismatch
      // This is critical - it ensures the user's tokenIdentifier matches what auth.getUserId() returns
      // Pass email to help fix corrupted user data
      try {
        console.log("Calling syncTokenIdentifier after signIn with email:", email);
        const syncedUserId = await syncTokenIdentifier({ email });
        console.log("syncTokenIdentifier completed, user ID:", syncedUserId);
        
        // Force a refresh of the getCurrentUser query by invalidating it
        // We'll wait a bit for the query to refetch
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Log what we expect to see
        console.log("After sync, getCurrentUser should return user with ID:", syncedUserId);
      } catch (syncError) {
        // If sync fails, continue anyway - callback might have handled it
        console.warn("Token sync warning:", syncError);
      }
      
      // Wait a bit more for queries to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If this was a signup with a role, ensure the role is set correctly
      // This is a fallback in case the callback didn't set it properly
      if (flow === "signUp" && role) {
        // Wait a bit more for the user to be created
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          // Update the current user's role as a fallback
          await updateMyRole({ role });
          console.log("Updated user role to:", role);
        } catch (e) {
          console.warn("Could not update role after signup (this is okay if callback handled it):", e);
        }
      }
      
      router.push("/dashboard");
      return { success: true };
    } catch (error) {
      console.error("Sign in error:", error);
      const errorMessage = error instanceof Error ? error.message : "Sign in failed";
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }, [signIn, syncTokenIdentifier, updateMyRole, router]);
  
  return signInWithPassword;
}

// Sign out
export function useSignOut() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  
  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push("/auth/login");
  }, [signOut, router]);
  
  return handleSignOut;
}

// Magic link - currently not implemented (placeholder for future)
export function useMagicLink() {
  const requestMagicLink = useCallback(async (_email: string) => {
    return { 
      success: false, 
      error: "Magic link authentication not yet configured" 
    };
  }, []);
  
  return requestMagicLink;
}

// Verify magic link code - currently not implemented
export function useVerifyCode() {
  const router = useRouter();
  
  const verifyCode = useCallback(async (_email: string, _code: string) => {
    return { 
      success: false, 
      error: "Magic link verification not yet configured" 
    };
  }, []);
  
  return verifyCode;
}

// Permission helpers
export function usePermissions() {
  const { role, user } = useAuth();
  const isActive = user?.status === "ACTIVE";
  
  return {
    isSuperAdmin: role === "SUPER_ADMIN",
    isPM: role === "PM" && isActive,
    isEditor: role === "EDITOR",
    canManageProjects: role === "SUPER_ADMIN" || (role === "PM" && isActive),
    canManageMissions: role === "SUPER_ADMIN",
    canManageHiring: role === "SUPER_ADMIN",
    canProcessPayouts: role === "SUPER_ADMIN",
    canApproveSubmissions: role === "SUPER_ADMIN" || (role === "PM" && isActive),
  };
}

// Role-based redirect helper
export function getRoleDashboardPath(role: string | undefined): string {
  // All roles go to the same dashboard, which is role-aware
  return "/dashboard";
}

