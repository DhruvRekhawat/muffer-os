"use client";

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
  createdAt: number;
}

interface ProjectTableProps {
  projects: Project[];
}

export function ProjectTable({ projects }: ProjectTableProps) {
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
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Project</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Status</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">PM</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Editors</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Progress</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Due Date</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const progress = project.milestoneCount > 0 
              ? Math.round((project.completedMilestoneCount / project.milestoneCount) * 100) 
              : 0;
            
            return (
              <tr 
                key={project._id} 
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link 
                    href={`/projects/${project.slug}`}
                    className="flex items-center gap-3 group"
                  >
                    <span className="text-xl">{project.emoji || "🎬"}</span>
                    <span className="font-medium text-zinc-200 group-hover:text-rose-400 transition-colors">
                      {project.name}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(project.status)}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-sm">
                  {project.pmName}
                </td>
                <td className="px-4 py-3">
                  {project.editorNames.length > 0 ? (
                    <div className="flex items-center gap-1 text-zinc-400 text-sm">
                      <Users className="w-4 h-4" />
                      <span>{project.editorNames.length}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500 text-sm">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          project.status === "COMPLETED" ? "bg-emerald-500" :
                          project.status === "DELAYED" ? "bg-red-500" :
                          project.status === "AT_RISK" ? "bg-yellow-500" :
                          "bg-blue-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-zinc-400 text-sm">{progress}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-sm">
                  {project.dueDate ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(project.dueDate).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

