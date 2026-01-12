"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  FolderKanban, 
  Target, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

import { Doc } from "@/convex/_generated/dataModel";

interface EditorDashboardProps {
  user: Doc<"users">;
}

export function EditorDashboard({ user }: EditorDashboardProps) {
  const stats = useQuery(api.users.getEditorStats, {});
  const nextMilestone = useQuery(api.milestones.getNextMilestone, {});
  const missionsWithProgress = useQuery(api.missions.getMissionsWithProgress, {});
  const projects = useQuery(api.projects.listProjects, {});
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Welcome back, {user.name.split(" ")[0]}! 👋
        </h1>
        <p className="text-zinc-400 mt-1">Here&apos;s your progress overview</p>
      </div>
      
      {/* Earnings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-emerald-400/80">Unlocked Balance</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">
                ₹{stats?.unlockedBalance?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <Link href="/payouts/request">
            <Button size="sm" className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Request Payout
            </Button>
          </Link>
        </Card>
        
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">Lifetime Earnings</p>
              <p className="text-3xl font-bold text-zinc-200 mt-1">
                ₹{stats?.lifetimeEarnings?.toLocaleString() || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-zinc-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            <CheckCircle2 className="w-4 h-4" />
            <span>{stats?.pendingMilestonesCount || 0} milestones pending</span>
          </div>
        </Card>
        
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-zinc-500">Active Projects</p>
              <p className="text-3xl font-bold text-zinc-200 mt-1">
                {stats?.activeProjectsCount || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-zinc-400" />
            </div>
          </div>
          <Link href="/projects">
            <Button size="sm" variant="outline" className="mt-4 w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              View Projects
            </Button>
          </Link>
        </Card>
      </div>
      
      {/* Next Action */}
      {nextMilestone && (
        <Card className="p-6 bg-gradient-to-r from-rose-500/10 to-orange-500/10 border-rose-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-rose-400/80">Next Action</p>
                <p className="text-lg font-semibold text-zinc-100">{nextMilestone.title}</p>
                <p className="text-sm text-zinc-400">{nextMilestone.projectName}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={
                nextMilestone.status === "REJECTED" 
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
              }>
                {nextMilestone.status === "REJECTED" ? "Needs Revision" : "In Progress"}
              </Badge>
              <p className="text-lg font-semibold text-emerald-400 mt-2">
                ₹{nextMilestone.payoutAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Active Projects */}
      {projects && projects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-200">Your Projects</h2>
            <Link href="/projects" className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => (
              <Link key={project._id} href={`/projects/${project.slug}`}>
                <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{project.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-200 truncate">{project.name}</p>
                      <p className="text-xs text-zinc-500">PM: {project.pmName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={
                      project.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      project.status === "AT_RISK" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                      project.status === "DELAYED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }>
                      {project.status}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {project.completedMilestoneCount}/{project.milestoneCount} done
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Missions */}
      {missionsWithProgress && missionsWithProgress.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-200">Active Missions</h2>
            <Link href="/missions" className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missionsWithProgress.slice(0, 2).map((item) => (
              <Card key={item.mission._id} className="p-4 bg-zinc-900/50 border-zinc-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-200">{item.mission.title}</p>
                    <p className="text-xs text-zinc-500">
                      {item.progress}/{item.mission.target} completed
                    </p>
                  </div>
                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                    ₹{item.mission.rewardAmount.toLocaleString()}
                  </Badge>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${item.percentComplete}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

