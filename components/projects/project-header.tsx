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
import { Calendar, Users, Settings, Loader2, Edit2, Check, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [selectedEditorId, setSelectedEditorId] = useState<Id<"users"> | null>(null);
  const [editorAssignError, setEditorAssignError] = useState<string>("");
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isCompletingProject, setIsCompletingProject] = useState(false);
  const [completeProjectError, setCompleteProjectError] = useState<string>("");
  const [dueDate, setDueDate] = useState(
    project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigningEditor, setIsAssigningEditor] = useState(false);
  
  const updateProject = useMutation(api.projects.updateProject);
  const assignEditorToProject = useMutation(api.projects.assignEditorToProject);
  
  const canManageThisProject =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "PM" && user._id === project.pmId);
  const editorsWithCount = useQuery(
    api.users.getEditorsWithProjectCount,
    canManageThisProject ? {} : "skip"
  );
  
  const progress = project.milestoneCount > 0 
    ? Math.round((project.completedMilestoneCount / project.milestoneCount) * 100) 
    : 0;

  const availableEditors =
    (editorsWithCount ?? []).filter((e) => !project.editorIds.includes(e._id));
  
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
    <Card className="p-6 bg-zinc-900/50 border-zinc-800 overflow-hidden relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-orange-500/5" />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Emoji picker */}
            <div className="relative">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-16 h-16 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-4xl hover:bg-zinc-700/80 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                ) : (
                  selectedEmoji
                )}
              </button>
              
              {isEditing && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-zinc-800 rounded-xl border border-zinc-700 shadow-xl z-10 grid grid-cols-4 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiChange(emoji)}
                      className="w-10 h-10 rounded-lg hover:bg-zinc-700 flex items-center justify-center text-xl transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-zinc-100">{project.name}</h1>
                {getStatusBadge(project.status)}
              </div>
              <p className="text-zinc-400">PM: {project.pmName}</p>
            </div>
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

                    {completeProjectError && (
                      <p className="text-sm text-red-400">{completeProjectError}</p>
                    )}

                    <AlertDialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCompleteDialogOpen(false)}
                        disabled={isCompletingProject}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          setIsCompletingProject(true);
                          setCompleteProjectError("");
                          try {
                            await updateProject({
                              projectId: project._id,
                              status: "COMPLETED",
                            });
                            setIsCompleteDialogOpen(false);
                          } catch (e) {
                            setCompleteProjectError(
                              e instanceof Error ? e.message : "Failed to complete project"
                            );
                          } finally {
                            setIsCompletingProject(false);
                          }
                        }}
                        disabled={isCompletingProject}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {isCompletingProject ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 mb-1">Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-zinc-200">{progress}%</span>
            </div>
          </div>
          
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 mb-1">Milestones</p>
            <p className="text-lg font-semibold text-zinc-200">
              {project.completedMilestoneCount}/{project.milestoneCount}
            </p>
          </div>
          
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <p className="text-xs text-zinc-500 mb-1">Editors</p>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-lg font-semibold text-zinc-200">
                {project.editorNames.length || 0}
              </span>
            </div>
          </div>
          
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500">Due Date</p>
              {canManageThisProject && !isEditingDueDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingDueDate(true)}
                  className="h-4 w-4 p-0 text-zinc-500 hover:text-zinc-300"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingDueDate && canManageThisProject ? (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs bg-zinc-700 border-zinc-600 text-zinc-100"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await updateProject({
                        projectId: project._id,
                        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
                      });
                      setIsEditingDueDate(false);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDueDate(project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : "");
                    setIsEditingDueDate(false);
                  }}
                  className="h-8 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-semibold text-zinc-200">
                  {project.dueDate 
                    ? new Date(project.dueDate).toLocaleDateString() 
                    : "Not set"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Editors list + add editor (SA/PM only) */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {project.editorNames.length > 0 ? (
              project.editorNames.map((name) => (
                <Badge
                  key={name}
                  className="bg-zinc-800/70 text-zinc-200 border-zinc-700"
                >
                  {name}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No editors assigned yet.</p>
            )}
          </div>

          {canManageThisProject && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Select
                  value={selectedEditorId ?? undefined}
                  onValueChange={(v) => {
                    setEditorAssignError("");
                    setSelectedEditorId(v as Id<"users">);
                  }}
                  disabled={isAssigningEditor}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100">
                    <SelectValue
                      placeholder={
                        availableEditors.length > 0
                          ? "Select an editor to add…"
                          : "No available editors"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEditors.map((editor) => (
                      <SelectItem key={editor._id} value={editor._id}>
                        {editor.name} • {editor.projectCount} projects
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={async () => {
                    if (!selectedEditorId) return;
                    setIsAssigningEditor(true);
                    setEditorAssignError("");
                    try {
                      await assignEditorToProject({
                        projectId: project._id,
                        editorId: selectedEditorId,
                      });
                      setSelectedEditorId(null);
                    } catch (e) {
                      setEditorAssignError(
                        e instanceof Error ? e.message : "Failed to add editor"
                      );
                    } finally {
                      setIsAssigningEditor(false);
                    }
                  }}
                  disabled={
                    isAssigningEditor ||
                    !selectedEditorId ||
                    availableEditors.length === 0
                  }
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  {isAssigningEditor ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>

              {editorAssignError && (
                <p className="text-xs text-red-400">{editorAssignError}</p>
              )}
              <p className="text-xs text-zinc-500">
                Shows each editor’s current active project count.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

