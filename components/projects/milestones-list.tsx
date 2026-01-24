"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Lock, 
  Play, 
  Send, 
  CheckCircle, 
  XCircle,
  User,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  Calendar,
  Plus
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/convex/_generated/dataModel";

interface Milestone {
  _id: Id<"milestones">;
  title: string;
  description?: string;
  order: number;
  status: string;
  payoutAmount: number;
  assignedEditorId?: Id<"users">;
  assignedEditorName?: string;
  dueDate?: number;
}

interface Project {
  _id: Id<"projects">;
  name: string;
  status: string;
  isTestProject?: boolean;
}

interface User {
  _id: string;
  role: string;
}

interface MilestonesListProps {
  project: Project;
  milestones: Milestone[];
  currentUser: User | null | undefined;
}

export function MilestonesList({ project, milestones, currentUser }: MilestonesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [driveLink, setDriveLink] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  
  // Editing state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPayoutAmount, setEditPayoutAmount] = useState("");
  
  // Creating state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPayoutAmount, setNewPayoutAmount] = useState("");
  const [newAssignedEditorId, setNewAssignedEditorId] = useState<string>("");
  
  const editors = useQuery(api.users.getAvailableEditors);
  const submissions = useQuery(
    api.submissions.getProjectSubmissions, 
    { projectId: project._id }
  );
  
  const submitDeliverable = useMutation(api.submissions.submitDeliverable);
  const approveSubmission = useMutation(api.submissions.approveSubmission);
  const rejectSubmission = useMutation(api.submissions.rejectSubmission);
  const assignEditor = useMutation(api.milestones.assignEditor);
  const updateMilestone = useMutation(api.milestones.updateMilestone);
  const markMilestoneAsDone = useMutation(api.milestones.markMilestoneAsDone);
  const createMilestone = useMutation(api.milestones.createMilestone);
  
  const canManage = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "PM";
  const isEditor = currentUser?.role === "EDITOR";
  const isProjectCompleted = project.status === "COMPLETED";
  // Payout amounts are locked until project is completed (can only edit after completion)
  const canEditPayoutAmount = isProjectCompleted;
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "LOCKED":
        return <Lock className="w-5 h-5 text-zinc-500" />;
      case "IN_PROGRESS":
        return <Play className="w-5 h-5 text-blue-400" />;
      case "SUBMITTED":
        return <Send className="w-5 h-5 text-yellow-400" />;
      case "APPROVED":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return null;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LOCKED":
        return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">Locked</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">In Progress</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pending Review</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Needs Revision</Badge>;
      default:
        return null;
    }
  };
  
  const handleSubmit = async (milestoneId: Id<"milestones">) => {
    if (!driveLink) return;
    setIsSubmitting(true);
    try {
      await submitDeliverable({
        milestoneId,
        driveLink,
        notes: notes || undefined,
      });
      setDriveLink("");
      setNotes("");
      setExpandedId(null);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleApprove = async (submissionId: Id<"submissions">) => {
    setIsSubmitting(true);
    try {
      await approveSubmission({
        submissionId,
        feedback: feedback || undefined,
      });
      setFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReject = async (submissionId: Id<"submissions">) => {
    if (!feedback) {
      alert("Please provide feedback for the rejection");
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectSubmission({
        submissionId,
        feedback,
      });
      setFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAssignEditor = async (milestoneId: Id<"milestones">, editorId: Id<"users">) => {
    await assignEditor({ milestoneId, editorId });
  };
  
  const startEditing = (milestone: Milestone) => {
    setEditingId(milestone._id);
    setEditTitle(milestone.title);
    setEditDescription(milestone.description || "");
    setEditDueDate(milestone.dueDate ? new Date(milestone.dueDate).toISOString().split('T')[0] : "");
    setEditPayoutAmount(milestone.payoutAmount.toString());
  };
  
  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditDueDate("");
    setEditPayoutAmount("");
  };
  
  const saveEditing = async (milestoneId: Id<"milestones">) => {
    setIsSubmitting(true);
    try {
      await updateMilestone({
        milestoneId,
        title: editTitle,
        description: editDescription || undefined,
        dueDate: editDueDate ? new Date(editDueDate).getTime() : undefined,
        payoutAmount: canEditPayoutAmount ? parseFloat(editPayoutAmount) : undefined,
      });
      setEditingId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update milestone");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleMarkAsDone = async (milestoneId: Id<"milestones">) => {
    if (!confirm("Mark this milestone as done?")) return;
    setIsSubmitting(true);
    try {
      await markMilestoneAsDone({ milestoneId });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to mark milestone as done");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const startCreating = () => {
    setIsCreating(true);
    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setNewPayoutAmount("");
    setNewAssignedEditorId("");
    setExpandedId(null);
  };
  
  const cancelCreating = () => {
    setIsCreating(false);
    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setNewPayoutAmount("");
    setNewAssignedEditorId("");
  };
  
  const saveNewMilestone = async () => {
    if (!newTitle.trim() || !newPayoutAmount) {
      alert("Please fill in title and payout amount");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createMilestone({
        projectId: project._id,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        dueDate: newDueDate ? new Date(newDueDate).getTime() : undefined,
        payoutAmount: parseFloat(newPayoutAmount),
        assignedEditorId: newAssignedEditorId ? (newAssignedEditorId as Id<"users">) : undefined,
      });
      cancelCreating();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create milestone");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-200">Milestones</h2>
        {canManage && (
          <Button
            size="sm"
            onClick={startCreating}
            disabled={isCreating}
            className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {/* Create new milestone form */}
        {isCreating && canManage && (
          <div className="space-y-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Title *</label>
              <Input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Milestone title"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Description</label>
              <Textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Milestone description (optional)"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due Date
                </label>
                <Input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Payout Amount (₹) *</label>
                <Input
                  type="number"
                  value={newPayoutAmount}
                  onChange={(e) => setNewPayoutAmount(e.target.value)}
                  placeholder="0"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>
            {editors && editors.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Assign Editor (optional)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={newAssignedEditorId === "" ? "default" : "outline"}
                    onClick={() => setNewAssignedEditorId("")}
                    className={newAssignedEditorId === "" ? "bg-zinc-700 text-zinc-200" : "border-zinc-700 text-zinc-300 hover:bg-zinc-700"}
                  >
                    None
                  </Button>
                  {editors.slice(0, 5).map((editor) => (
                    <Button
                      key={editor._id}
                      size="sm"
                      variant={newAssignedEditorId === editor._id ? "default" : "outline"}
                      onClick={() => setNewAssignedEditorId(editor._id)}
                      className={newAssignedEditorId === editor._id ? "bg-zinc-700 text-zinc-200" : "border-zinc-700 text-zinc-300 hover:bg-zinc-700"}
                    >
                      {editor.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={saveNewMilestone}
                disabled={isSubmitting || !newTitle.trim() || !newPayoutAmount}
                className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Milestone
                  </>
                )}
              </Button>
              <Button
                onClick={cancelCreating}
                disabled={isSubmitting}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {milestones.sort((a, b) => a.order - b.order).map((milestone) => {
          const isExpanded = expandedId === milestone._id;
          const milestoneSubmission = submissions?.find(s => 
            s.milestoneId === milestone._id && s.status === "PENDING"
          );
          const canSubmit = isEditor && 
            milestone.assignedEditorId === currentUser?._id &&
            (milestone.status === "IN_PROGRESS" || milestone.status === "REJECTED");
          
          return (
            <div 
              key={milestone._id}
              className={`rounded-xl border transition-all ${
                milestone.status === "LOCKED" 
                  ? "bg-zinc-800/30 border-zinc-800 opacity-60"
                  : "bg-zinc-800/50 border-zinc-700"
              }`}
            >
              {/* Milestone header */}
              <button
                onClick={() => milestone.status !== "LOCKED" && setExpandedId(isExpanded ? null : milestone._id)}
                className="w-full p-4 flex items-center gap-4 text-left"
                disabled={milestone.status === "LOCKED"}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                  {getStatusIcon(milestone.status)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-zinc-500">#{milestone.order}</span>
                    <h3 className="font-medium text-zinc-200">{milestone.title}</h3>
                    {getStatusBadge(milestone.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    {milestone.assignedEditorName ? (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{milestone.assignedEditorName}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-600">Unassigned</span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-emerald-400">
                    ₹{milestone.payoutAmount.toLocaleString()}
                  </p>
                  {milestone.status !== "LOCKED" && (
                    isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500 mt-1" /> : <ChevronDown className="w-4 h-4 text-zinc-500 mt-1" />
                  )}
                </div>
              </button>
              
              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Edit mode for PM/Admin */}
                  {editingId === milestone._id && canManage ? (
                    <div className="space-y-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Title</label>
                        <Input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Description</label>
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[80px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-sm text-zinc-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due Date
                          </label>
                          <Input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 text-zinc-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-zinc-400">Payout Amount (₹)</label>
                          <Input
                            type="number"
                            value={editPayoutAmount}
                            onChange={(e) => setEditPayoutAmount(e.target.value)}
                            disabled={!canEditPayoutAmount}
                            className="bg-zinc-800 border-zinc-700 text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canEditPayoutAmount ? "Payout amounts are locked until project is marked as done" : "Payout amounts can be edited after project completion"}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveEditing(milestone._id)}
                          disabled={isSubmitting || !editTitle.trim()}
                          className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          disabled={isSubmitting}
                          variant="outline"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* View mode */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {milestone.description && (
                            <p className="text-sm text-zinc-400 mb-2">{milestone.description}</p>
                          )}
                          {milestone.dueDate && (
                            <div className="flex items-center gap-1 text-sm text-zinc-500">
                              <Calendar className="w-3 h-3" />
                              <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        {canManage && (
                          <div className="flex gap-2">
                            {milestone.status !== "APPROVED" && (
                              <Button
                                size="sm"
                                onClick={() => handleMarkAsDone(milestone._id)}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Mark as done"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(milestone)}
                              className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Editor assignment (for PM/SA) */}
                      {canManage && !milestone.assignedEditorId && editors && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-zinc-500">Assign to:</span>
                      {editors.slice(0, 5).map((editor) => (
                        <Button
                          key={editor._id}
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignEditor(milestone._id, editor._id as Id<"users">)}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                        >
                          {editor.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Submission form (for assigned editor) */}
                  {canSubmit && (
                    <div className="space-y-3 p-4 bg-zinc-900/50 rounded-lg">
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">
                          {project.isTestProject ? "Link" : "Google Drive Link"}
                        </label>
                        <Input
                          type="url"
                          placeholder={project.isTestProject ? "https://... (Drive, Dropbox, portfolio, etc.)" : "https://drive.google.com/..."}
                          value={driveLink}
                          onChange={(e) => setDriveLink(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Notes (optional)</label>
                        <Input
                          type="text"
                          placeholder="Any additional notes..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                      </div>
                      <Button
                        onClick={() => handleSubmit(milestone._id)}
                        disabled={isSubmitting || !driveLink}
                        className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Submit for Review
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Pending submission review (for PM/SA) */}
                  {canManage && milestoneSubmission && (
                    <div className="space-y-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-zinc-200">Pending Review</p>
                        <a
                          href={milestoneSubmission.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Submission
                        </a>
                      </div>
                      {milestoneSubmission.notes && (
                        <p className="text-sm text-zinc-400">&quot;{milestoneSubmission.notes}&quot;</p>
                      )}
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Feedback (required for rejection)"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleReject(milestoneSubmission._id)}
                          disabled={isSubmitting}
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Changes"}
                        </Button>
                        <Button
                          onClick={() => handleApprove(milestoneSubmission._id)}
                          disabled={isSubmitting}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                        </Button>
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

