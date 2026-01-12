"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import Link from "next/link";

interface Project {
  _id: string;
  slug: string;
  name: string;
  emoji?: string;
  status: string;
  pmName: string;
  editorNames: string[];
  milestoneCount: number;
  completedMilestoneCount: number;
  dueDate?: number;
}

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const progress = project.milestoneCount > 0 
    ? Math.round((project.completedMilestoneCount / project.milestoneCount) * 100) 
    : 0;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Active</Badge>;
      case "AT_RISK":
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">At Risk</Badge>;
      case "DELAYED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Delayed</Badge>;
      case "COMPLETED":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Completed</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Link href={`/projects/${project.slug}`}>
      <Card className="p-5 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-lg cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl group-hover:scale-110 transition-transform">
              {project.emoji || "🎬"}
            </span>
            <div>
              <h3 className="font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-zinc-500">PM: {project.pmName}</p>
            </div>
          </div>
          {getStatusBadge(project.status)}
        </div>
        
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-500">Progress</span>
            <span className="text-zinc-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                project.status === "COMPLETED" ? "bg-emerald-500" :
                project.status === "DELAYED" ? "bg-red-500" :
                project.status === "AT_RISK" ? "bg-yellow-500" :
                "bg-blue-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-zinc-500">
            {project.editorNames.length > 0 && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{project.editorNames.length}</span>
              </div>
            )}
            {project.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          <span className="text-zinc-400">
            {project.completedMilestoneCount}/{project.milestoneCount}
          </span>
        </div>
      </Card>
    </Link>
  );
}

