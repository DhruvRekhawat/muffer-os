"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectTable } from "@/components/projects/project-table";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { Plus, Search, LayoutGrid, List, Filter, Loader2 } from "lucide-react";
import Link from "next/link";

type ViewMode = "grid" | "table";
type StatusFilter = "ALL" | "ACTIVE" | "AT_RISK" | "DELAYED" | "COMPLETED";

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { canManageProjects } = usePermissions();
  const hiring = useQuery(api.editorHiring.getMyEditorHiring, {});
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const projects = useQuery(api.projects.listProjects, {
    status:
      statusFilter === "ALL"
        ? undefined
        : (statusFilter as "ACTIVE" | "AT_RISK" | "DELAYED" | "COMPLETED"),
  });

  if (user?.status === "INVITED") {
    const approvedPendingNda = user.role === "EDITOR" && hiring?.hiring?.status === "APPROVED" && !hiring?.hiring?.ndaAcceptedAt;
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
          <p className="text-zinc-400 mt-1">
            {approvedPendingNda ? "You've been approved. Sign the NDA to access projects." : "Your account is pending admin approval."}
          </p>
        </div>
        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <p className="text-sm text-zinc-300">
            {approvedPendingNda
              ? "You've been approved. Sign the NDA in onboarding to access projects."
              : "You'll be able to access projects once you're approved."}
          </p>
          {!approvedPendingNda && (
            <p className="text-sm text-zinc-500 mt-1">
              Please complete onboarding and sign the NDA first.
            </p>
          )}
          <div className="mt-4">
            <Link href="/onboarding">
              <Button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100">
                Go to onboarding
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredProjects = projects?.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.pmName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
          <p className="text-zinc-400 mt-1">
            {user?.role === "EDITOR" 
              ? "Your assigned projects" 
              : "Manage all video projects"}
          </p>
        </div>
        {canManageProjects && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        )}
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-zinc-100"
          />
        </div>
        
        {/* Status filter */}
        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "AT_RISK", "DELAYED", "COMPLETED"] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status 
                ? "bg-zinc-700 text-zinc-100" 
                : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}
            >
              {status === "ALL" ? "All" : status.replace("_", " ")}
            </Button>
          ))}
        </div>
        
        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      {projects === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : filteredProjects?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300">No projects found</h3>
          <p className="text-zinc-500 mt-1">
            {searchQuery ? "Try a different search term" : "Create your first project to get started"}
          </p>
          {canManageProjects && !searchQuery && (
            <Button onClick={() => setShowCreateModal(true)} className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects?.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      ) : (
        <ProjectTable projects={filteredProjects || []} />
      )}

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(slug) => router.push(`/projects/${slug}`)}
      />
    </div>
  );
}

