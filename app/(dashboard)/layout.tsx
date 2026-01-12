"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Sidebar, useSidebar, SidebarProvider } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Doc } from "@/convex/_generated/dataModel";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const syncTokenIdentifier = useMutation(api.users.syncTokenIdentifier);
  const hasTriedSync = useRef(false);
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);
  
  // Auto-sync tokenIdentifier if user is authenticated but not found
  useEffect(() => {
    if (isAuthenticated && !user && !isLoading && !hasTriedSync.current) {
      hasTriedSync.current = true;
      syncTokenIdentifier({}).catch((error) => {
        console.warn("Token sync failed:", error);
        hasTriedSync.current = false; // Retry on next render
      });
    }
  }, [isAuthenticated, user, isLoading, syncTokenIdentifier]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  // Show loading state if user data is still loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-zinc-400 text-sm">Loading user profile...</p>
        </div>
      </div>
    );
  }
  
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-zinc-950 flex">
        <Sidebar user={user} />
        <SidebarContent user={user}>
          {children}
        </SidebarContent>
      </div>
    </SidebarProvider>
  );
}

function SidebarContent({ user, children }: { user: Doc<"users">; children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div className={cn(
      "flex-1 flex flex-col transition-all duration-300",
      isCollapsed ? "ml-20" : "ml-64"
    )}>
      <Topbar user={user} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

