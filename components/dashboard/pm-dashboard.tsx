"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderKanban, 
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  Plus
} from "lucide-react";
import Link from "next/link";

import { Doc } from "@/convex/_generated/dataModel";

interface PMDashboardProps {
  user: Doc<"users">;
}

export function PMDashboard({ user }: PMDashboardProps) {
  if (user.status === "INVITED") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Welcome, {user.name.split(" ")[0]}!
          </h1>
          <p className="text-zinc-400 mt-1">
            Your PM account is pending admin approval.
          </p>
        </div>

        <Card className="p-6 bg-linear-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20">
          <p className="text-sm text-purple-400/80">Next step</p>
          <p className="text-lg font-semibold text-zinc-100 mt-1">
            Complete onboarding & sign the NDA
          </p>
          <p className="text-sm text-zinc-400 mt-1">
            After admin approval you’ll be able to access People/Projects and start managing work. Please stay
            active on email/WhatsApp — the admin may reach out for additional info.
          </p>
          <div className="mt-4">
            <Link href="/onboarding">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Go to onboarding
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const projectStats = useQuery(api.projects.getProjectStats, {});
  const projectsAtRisk = useQuery(api.projects.getProjectsAtRisk, {});
  const overdueMilestones = useQuery(api.milestones.getOverdueMilestones, {});
  const pendingSubmissions = useQuery(api.milestones.getPendingSubmissions, {});
  const editors = useQuery(api.users.getAvailableEditors, {});
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Welcome back, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-zinc-400 mt-1">Here&apos;s your project overview</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </Link>
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
        </Card>
        
        <Card className="p-4 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{projectStats?.active || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-yellow-400/80">At Risk</p>
              <p className="text-2xl font-bold text-yellow-400">{projectStats?.atRisk || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-red-500/10 border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-red-400/80">Delayed</p>
              <p className="text-2xl font-bold text-red-400">{projectStats?.delayed || 0}</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Pending Submissions */}
      {pendingSubmissions && pendingSubmissions.length > 0 && (
        <Card className="p-6 bg-linear-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-200">Pending Reviews</h2>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {pendingSubmissions.length} waiting
            </Badge>
          </div>
          <div className="space-y-3">
            {pendingSubmissions.slice(0, 3).map((submission) => (
              <div key={submission._id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-zinc-200">{submission.editorName}</p>
                  <p className="text-sm text-zinc-500">
                    Submitted {new Date(submission.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link href={submission.driveLink} target="_blank">
                  <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300">
                    Review
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* Projects at Risk */}
      {projectsAtRisk && projectsAtRisk.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-200">Projects Needing Attention</h2>
            <Link href="/projects?status=AT_RISK" className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectsAtRisk.slice(0, 4).map((project) => (
              <Link key={project._id} href={`/projects/${project.slug}`}>
                <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{project.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-200 truncate">{project.name}</p>
                      <p className="text-xs text-zinc-500">
                        {project.completedMilestoneCount}/{project.milestoneCount} milestones
                      </p>
                    </div>
                    <Badge className={
                      project.status === "DELAYED" 
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {project.dueDate && (
                    <p className="text-xs text-zinc-500">
                      Due: {new Date(project.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Available Editors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-200">Available Editors</h2>
          <Link href="/people?role=EDITOR" className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {editors?.slice(0, 4).map((editor) => (
            <Card key={editor._id} className="p-4 bg-zinc-900/50 border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 font-medium">
                  {editor.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-200 truncate">{editor.name}</p>
                  <p className="text-xs text-emerald-400">Available</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Overdue Milestones */}
      {overdueMilestones && overdueMilestones.length > 0 && (
        <Card className="p-6 bg-red-500/10 border-red-500/20">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Overdue Milestones</h2>
          <div className="space-y-3">
            {overdueMilestones.slice(0, 5).map((milestone) => (
              <div key={milestone._id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-zinc-200">{milestone.title}</p>
                  <p className="text-sm text-zinc-500">
                    {milestone.projectName} • {milestone.assignedEditorName || "Unassigned"}
                  </p>
                </div>
                <p className="text-sm text-red-400">
                  {milestone.dueDate && `Due ${new Date(milestone.dueDate).toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

