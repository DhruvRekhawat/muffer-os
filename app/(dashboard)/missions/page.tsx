"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MissionCard } from "@/components/missions/mission-card";
import { Plus, Target, Loader2 } from "lucide-react";
import Link from "next/link";
import { Doc } from "@/convex/_generated/dataModel";

export default function MissionsPage() {
  const { user } = useAuth();
  const { canManageMissions } = usePermissions();
  
  // Editors see missions with their progress
  const missionsWithProgress = useQuery(api.missions.getMissionsWithProgress);
  // SA sees all missions
  const allMissions = useQuery(api.missions.listAllMissions);
  
  const missions = user?.role === "EDITOR" ? missionsWithProgress : (canManageMissions ? allMissions : missionsWithProgress);
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Missions</h1>
          <p className="text-zinc-400 mt-1">
            {user?.role === "EDITOR" 
              ? "Complete missions to earn bonus rewards" 
              : "Create and manage editor missions"}
          </p>
        </div>
        {canManageMissions && (
          <Link href="/missions/new">
            <Button className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/20">
              <Plus className="w-4 h-4 mr-2" />
              New Mission
            </Button>
          </Link>
        )}
      </div>
      
      {/* Content */}
      {missions === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : missions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300">No active missions</h3>
          <p className="text-zinc-500 mt-1">
            {canManageMissions 
              ? "Create a mission to motivate editors" 
              : "Check back later for new missions"}
          </p>
          {canManageMissions && (
            <Link href="/missions/new">
              <Button className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100">
                <Plus className="w-4 h-4 mr-2" />
                Create Mission
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missions.map((item: Doc<"missions"> | { mission: Doc<"missions">; progress: number; completed: boolean; percentComplete: number }) => {
            const mission = "mission" in item ? item.mission : item;
            const progress = "progress" in item ? item.progress : undefined;
            const completed = "completed" in item ? item.completed : undefined;
            const percentComplete = "percentComplete" in item ? item.percentComplete : undefined;
            
            return (
              <MissionCard 
                key={mission._id} 
                mission={mission}
                progress={progress}
                completed={completed}
                percentComplete={percentComplete}
                isAdmin={canManageMissions}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

