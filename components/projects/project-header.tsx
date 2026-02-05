"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Loader2, Edit2, Check, X, AlertTriangle, Clock, TrendingUp, ImageIcon } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { ProjectInvitationPanel } from "./project-invitation-panel";
import { BackgroundPicker } from "@/components/ui/background-picker";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  _id: Id<"projects">;
  name: string;
  emoji?: string;
  background?: string;
  status: string;
  pmId: Id<"users">;
  pmName: string;
  editorIds: Id<"users">[];
  editorNames: string[];
  milestoneCount: number;
  completedMilestoneCount: number;
  dueDate?: number;
  createdAt: number;
  billableMinutes?: number;
  skuCode?: string;
  editorCapAmount?: number;
  deadlineAt?: number;
}

interface ProjectHeaderProps {
  project: Project;
}

const emojis = ["🎬", "🎥", "📹", "🎞️", "📽️", "🎦", "🎭", "🎪", "✨", "🚀", "💫", "🔥"];

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState(project.emoji || "🎬");
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isCompletingProject, setIsCompletingProject] = useState(false);
  const [completeProjectError, setCompleteProjectError] = useState<string>("");
  const [dueDate, setDueDate] = useState(
    project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  
  const updateProject = useMutation(api.projects.updateProject);

  const backgroundStyle = project.background
    ? (project.background.startsWith("http") ? { backgroundImage: `url(${project.background})` } : { background: project.background })
    : undefined;
  
  const canManageThisProject =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "PM" && user._id === project.pmId);
  // Get projected earnings for editors; editors can also change icon/background
  const isEditor = user?.role === "EDITOR" && project.editorIds.includes(user._id);
  const canChangeBackground = canManageThisProject || isEditor;
  const projectedEarnings = useQuery(
    api.payoutEngine.getCurrentProjectedEarnings,
    isEditor && user ? { projectId: project._id, editorId: user._id } : "skip"
  );
  
  const progress = project.milestoneCount > 0 
    ? Math.round((project.completedMilestoneCount / project.milestoneCount) * 100) 
    : 0;

  const handleEmojiChange = async (emoji: string) => {
    setSelectedEmoji(emoji);
    setIsLoading(true);
    try {
      await updateProject({
        projectId: project._id,
        emoji,
      });
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };
  
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
    <Card className="overflow-hidden pt-0">
      {/* Cover / background area */}
      <div
        className="relative h-28 bg-gradient-to-br from-rose-500/10 to-orange-500/10 bg-cover bg-center"
        style={backgroundStyle}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-4 left-6 flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-14 h-14 rounded-xl bg-zinc-900/80 flex items-center justify-center text-3xl hover:bg-zinc-800/80 transition-colors border border-zinc-700/50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              ) : (
                selectedEmoji
              )}
            </button>
            {isEditing && (
              <div className="absolute top-full left-0 mt-3 p-3 bg-zinc-800 rounded-xl border border-zinc-700 shadow-xl z-20 grid grid-cols-4 gap-2 min-w-[180px]">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiChange(emoji)}
                    className="w-10 h-10 rounded-lg hover:bg-zinc-700 flex items-center justify-center text-xl transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {canChangeBackground && (
            <button
              type="button"
              onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {project.background ? "Change cover" : "Add cover"}
            </button>
          )}
        </div>
        {showBackgroundPicker && canChangeBackground && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-zinc-800 rounded-xl border border-zinc-700 shadow-xl z-10">
            <BackgroundPicker
              value={project.background ?? null}
              onChange={async (v) => {
                try {
                  await updateProject({ projectId: project._id, background: v || undefined });
                  setShowBackgroundPicker(false);
                } catch {
    // ignore
  }
              }}
            />
          </div>
        )}
      </div>

      <div className="p-6 relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-zinc-100">{project.name}</h1>
              {getStatusBadge(project.status)}
            </div>
            <p className="text-zinc-400 text-sm">PM: {project.pmName}</p>
          </div>
          <div className="flex items-center gap-2">
            {canManageThisProject && project.status !== "COMPLETED" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCompleteProjectError("");
                    setIsCompleteDialogOpen(true);
                  }}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Mark complete
                </Button>
                <AlertDialog
                  open={isCompleteDialogOpen}
                  onOpenChange={(open) => {
                    setIsCompleteDialogOpen(open);
                    if (!open) setCompleteProjectError("");
                  }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark project as completed?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the project status as <b>Completed</b>. You can do this even if there are no milestones.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    {completeProjectError && <p className="text-sm text-red-400">{completeProjectError}</p>}
                    <AlertDialogFooter>
                      <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)} disabled={isCompletingProject}>Cancel</Button>
                      <Button
                        onClick={async () => {
                          setIsCompletingProject(true);
                          setCompleteProjectError("");
                          try {
                            await updateProject({ projectId: project._id, status: "COMPLETED" });
                            setIsCompleteDialogOpen(false);
                          } catch (e) {
                            setCompleteProjectError(e instanceof Error ? e.message : "Failed to complete project");
                          } finally {
                            setIsCompletingProject(false);
                          }
                        }}
                        disabled={isCompletingProject}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isCompletingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-zinc-500">Progress</span>
            <span className="text-zinc-300 font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Inline stats */}
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <span className="text-zinc-500">
            Milestones <span className="text-zinc-200 font-medium">{project.completedMilestoneCount}/{project.milestoneCount}</span>
          </span>
          <span className="text-zinc-500">
            Due <span className="text-zinc-200 font-medium">{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "Not set"}</span>
            {canManageThisProject && !isEditingDueDate && (
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1 text-zinc-500 hover:text-zinc-300" onClick={() => setIsEditingDueDate(true)}>
                <Edit2 className="w-3 h-3" />
              </Button>
            )}
          </span>
          {(project.billableMinutes ?? project.skuCode) && (
            <span className="text-zinc-500">
              Billable <span className="text-zinc-200 font-medium">{project.billableMinutes?.toFixed(1) ?? "—"} min</span>
              {project.skuCode && <span className="text-zinc-500 ml-0.5">({project.skuCode})</span>}
            </span>
          )}
        </div>
        {isEditingDueDate && canManageThisProject && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-8 text-xs bg-zinc-800 border-zinc-600 text-zinc-100 w-40"
            />
            <Button size="sm" onClick={async () => { setIsLoading(true); try { await updateProject({ projectId: project._id, dueDate: dueDate ? new Date(dueDate).getTime() : undefined }); setIsEditingDueDate(false); } finally { setIsLoading(false); } }} disabled={isLoading} className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700"><Check className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" onClick={() => { setDueDate(project.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : ""); setIsEditingDueDate(false); }} className="h-8 px-2"><X className="w-3 h-3" /></Button>
          </div>
        )}
        {/* Earnings Preview & Warnings (for editors) */}
        {isEditor && projectedEarnings && (
          <div className="mt-6 space-y-3">
            {/* Projected Earnings Card */}
            <Card className="p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400/80 mb-1">Projected Earnings</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    ₹{projectedEarnings.finalPayout.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Base: ₹{projectedEarnings.basePayout.toLocaleString()} • 
                    QC: {projectedEarnings.qcAverage.toFixed(1)} • 
                    Late: {Math.round(projectedEarnings.lateMinutes)}m
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-400/50" />
              </div>
            </Card>

            {/* Warning Banners */}
            {project.deadlineAt && (
              (() => {
                const deadline = project.deadlineAt;
                const now = Date.now();
                const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
                const isLate = now > deadline;
                const lateHours = isLate ? (now - deadline) / (1000 * 60 * 60) : 0;

                if (isLate && lateHours > 0) {
                  return (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-400">
                          You are {Math.round(lateHours)} hours late
                        </p>
                        <p className="text-xs text-red-400/70 mt-0.5">
                          Payout reduced by {Math.round((1 - projectedEarnings.reliabilityFactor) * 100)}% due to late delivery
                        </p>
                      </div>
                    </div>
                  );
                } else if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
                  return (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
                      <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-400">
                          Deadline in {Math.round(hoursUntilDeadline)} hours
                        </p>
                        <p className="text-xs text-yellow-400/70 mt-0.5">
                          Deliver on time to avoid penalties
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}

            {projectedEarnings.qcAverage < 4.0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400">
                    Quality score below threshold
                  </p>
                  <p className="text-xs text-yellow-400/70 mt-0.5">
                    Current QC: {projectedEarnings.qcAverage.toFixed(1)}/5.0 • 
                    Payout reduced by {Math.round((1 - projectedEarnings.qualityFactor) * 100)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Invitation panel: invite more editors */}
      <div>
        <ProjectInvitationPanel 
          projectId={project._id} 
          canManage={canManageThisProject} 
        />
      </div>
    </Card>
  );
}

