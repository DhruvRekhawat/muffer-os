"use client";

import { useAuth } from "@/lib/auth";
import { EditorDashboard } from "@/components/dashboard/editor-dashboard";
import { PMDashboard } from "@/components/dashboard/pm-dashboard";
import { SADashboard } from "@/components/dashboard/sa-dashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  
  // Debug logging
  console.log("DashboardPage - isLoading:", isLoading);
  console.log("DashboardPage - user:", user);
  console.log("DashboardPage - user role:", user?.role);
  console.log("DashboardPage - user email:", user?.email);
  console.log("DashboardPage - user _id:", user?._id);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-6">
        <div className="text-zinc-400">Loading user data...</div>
      </div>
    );
  }
  
  // Default to EDITOR if role is undefined (shouldn't happen after bootstrap)
  const role = user.role || "EDITOR";
  
  console.log("DashboardPage - Resolved role:", role);
  console.log("DashboardPage - Rendering dashboard for role:", role);
  
  switch (role) {
    case "EDITOR":
      return <EditorDashboard user={user} />;
    case "PM":
      return <PMDashboard user={user} />;
    case "SUPER_ADMIN":
      return <SADashboard user={user} />;
    default:
      return <EditorDashboard user={user} />;
  }
}

