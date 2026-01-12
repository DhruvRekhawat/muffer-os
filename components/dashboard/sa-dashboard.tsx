"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  FolderKanban,
  Plus,
  Target,
  UserPlus,
  Wallet
} from "lucide-react";
import Link from "next/link";

import { Doc } from "@/convex/_generated/dataModel";

interface SADashboardProps {
  user: Doc<"users">;
}

export function SADashboard({ user }: SADashboardProps) {
  const projectStats = useQuery(api.projects.getProjectStats, {});
  const pendingPayouts = useQuery(api.payouts.getPendingPayoutStats, {});
  const pendingApplications = useQuery(api.hiring.getPendingCount, {});
  const activeMissions = useQuery(api.missions.listActiveMissions, {});
  const projectsAtRisk = useQuery(api.projects.getProjectsAtRisk, {});
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Welcome back, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-zinc-400 mt-1">Here&apos;s your company overview</p>
        </div>
        <div className="flex gap-3">
          <Link href="/missions/new">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              <Target className="w-4 h-4 mr-2" />
              New Mission
            </Button>
          </Link>
          <Link href="/projects/new">
            <Button className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Projects</p>
              <p className="text-2xl font-bold text-zinc-200">{projectStats?.total || 0}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
              {projectStats?.active || 0} active
            </Badge>
            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
              {projectStats?.atRisk || 0} at risk
            </Badge>
          </div>
        </Card>
        
        <Card className={`p-4 ${pendingPayouts?.count ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-zinc-900/50 border-zinc-800'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingPayouts?.count ? 'bg-yellow-500/20' : 'bg-zinc-800'}`}>
              <Wallet className={`w-5 h-5 ${pendingPayouts?.count ? 'text-yellow-400' : 'text-zinc-400'}`} />
            </div>
            <div>
              <p className={`text-sm ${pendingPayouts?.count ? 'text-yellow-400/80' : 'text-zinc-500'}`}>Payout Liability</p>
              <p className={`text-2xl font-bold ${pendingPayouts?.count ? 'text-yellow-400' : 'text-zinc-200'}`}>
                ₹{pendingPayouts?.totalAmount?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          {pendingPayouts?.count ? (
            <Link href="/payouts/review">
              <Button size="sm" className="mt-3 w-full bg-yellow-600 hover:bg-yellow-700 text-white">
                Review {pendingPayouts.count} requests
              </Button>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No pending requests</p>
          )}
        </Card>
        
        <Card className={`p-4 ${pendingApplications ? 'bg-purple-500/10 border-purple-500/20' : 'bg-zinc-900/50 border-zinc-800'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pendingApplications ? 'bg-purple-500/20' : 'bg-zinc-800'}`}>
              <UserPlus className={`w-5 h-5 ${pendingApplications ? 'text-purple-400' : 'text-zinc-400'}`} />
            </div>
            <div>
              <p className={`text-sm ${pendingApplications ? 'text-purple-400/80' : 'text-zinc-500'}`}>Hiring Queue</p>
              <p className={`text-2xl font-bold ${pendingApplications ? 'text-purple-400' : 'text-zinc-200'}`}>
                {pendingApplications || 0}
              </p>
            </div>
          </div>
          {pendingApplications ? (
            <Link href="/hiring">
              <Button size="sm" className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white">
                Review Applications
              </Button>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No pending applications</p>
          )}
        </Card>
        
        <Card className="p-4 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Active Missions</p>
              <p className="text-2xl font-bold text-zinc-200">{activeMissions?.length || 0}</p>
            </div>
          </div>
          <Link href="/missions">
            <Button size="sm" variant="outline" className="mt-3 w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Manage Missions
            </Button>
          </Link>
        </Card>
      </div>
      
      {/* Projects at Risk */}
      {projectsAtRisk && projectsAtRisk.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-zinc-200">Projects Needing Attention</h2>
            </div>
            <Link href="/projects?status=AT_RISK" className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsAtRisk.slice(0, 3).map((project) => (
              <Link key={project._id} href={`/projects/${project.slug}`}>
                <div className="p-4 bg-zinc-900/50 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{project.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-200 truncate">{project.name}</p>
                      <p className="text-xs text-zinc-500">PM: {project.pmName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={
                      project.status === "DELAYED" 
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }>
                      {project.status.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {project.completedMilestoneCount}/{project.milestoneCount} done
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Project Status Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Active</span>
              <span className="font-semibold text-emerald-400">{projectStats?.active || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">At Risk</span>
              <span className="font-semibold text-yellow-400">{projectStats?.atRisk || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Delayed</span>
              <span className="font-semibold text-red-400">{projectStats?.delayed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Completed</span>
              <span className="font-semibold text-blue-400">{projectStats?.completed || 0}</span>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Active Missions</h3>
          {activeMissions?.length ? (
            <div className="space-y-3">
              {activeMissions.slice(0, 3).map((mission) => (
                <div key={mission._id} className="flex items-center justify-between">
                  <span className="text-zinc-300 text-sm truncate">{mission.title}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    ₹{mission.rewardAmount}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">No active missions</p>
          )}
        </Card>
        
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link href="/projects/new">
              <Button size="sm" variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </Link>
            <Link href="/missions/new">
              <Button size="sm" variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Target className="w-4 h-4 mr-2" />
                Create Mission
              </Button>
            </Link>
            <Link href="/hiring">
              <Button size="sm" variant="outline" className="w-full justify-start border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <UserPlus className="w-4 h-4 mr-2" />
                Review Hiring
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

