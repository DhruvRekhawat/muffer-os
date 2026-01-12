"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Users, Settings, Loader2, Edit2, Check, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface Project {
  _id: Id<"projects">;
  name: string;
  emoji?: string;
  background?: string;
  status: string;
  pmName: string;
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
  const [dueDate, setDueDate] = useState(
    project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : ""
  );
  const [isLoading, setIsLoading] = useState(false);
  
  const updateProject = useMutation(api.projects.updateProject);
  
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "PM";
  
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
          
          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:bg-zinc-800">
            <Settings className="w-4 h-4" />
          </Button>
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
              {canManage && !isEditingDueDate && (
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
            {isEditingDueDate && canManage ? (
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
      </div>
    </Card>
  );
}

