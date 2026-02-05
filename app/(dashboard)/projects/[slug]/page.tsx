"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { ProjectHeader } from "@/components/projects/project-header";
import { MilestonesList } from "@/components/projects/milestones-list";
import { ProjectChat } from "@/components/projects/project-chat";
import { ProjectSummaryCard } from "@/components/projects/project-summary-card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = use(params);
  const { user } = useAuth();
  
  const project = useQuery(api.projects.getProjectBySlug, { slug });
  const milestones = useQuery(
    api.milestones.getProjectMilestones,
    project ? { projectId: project._id } : "skip"
  );
  
  if (project === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }
  
  if (project === null) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-zinc-300">Project not found</h2>
        <p className="text-zinc-500 mt-2">This project doesn&apos;t exist or you don&apos;t have access.</p>
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <Link 
        href="/projects" 
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>
      
      {/* Project header */}
      <ProjectHeader project={project} />
      
      {/* Main content: Test projects = brief center + milestones right; normal = chat center + brief + milestones right */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {project.isTestProject ? (
          <>
            {/* Center panel - Brief only (test projects: no chat) */}
            <div className="lg:col-span-3">
              <ProjectSummaryCard projectId={project._id} />
            </div>
            {/* Right panel - Milestones */}
            <div className="lg:col-span-2 space-y-6">
              <MilestonesList 
                project={project} 
                milestones={milestones || []} 
                currentUser={user ? { ...user, role: user.role ?? "" } : null}
              />
            </div>
          </>
        ) : (
          <>
            {/* Center panel - Chat */}
            <div className="lg:col-span-3">
              <ProjectChat projectId={project._id} />
            </div>
            {/* Right panel - Brief + Milestones */}
            <div className="lg:col-span-2 space-y-6">
              <ProjectSummaryCard projectId={project._id} />
              <MilestonesList 
                project={project} 
                milestones={milestones || []} 
                currentUser={user ? { ...user, role: user.role ?? "" } : null}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

