"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Check,
  Clock,
  X as XIcon,
  Loader2,
  Mail,
  Calendar,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface ProjectInvitationPanelProps {
  projectId: Id<"projects">;
  canManage: boolean;
}

export function ProjectInvitationPanel({ projectId, canManage }: ProjectInvitationPanelProps) {
  const invitations = useQuery(api.projects.getProjectInvitations, { projectId });
  const editors = useQuery(api.users.getEditorsWithProjectCount);
  const inviteEditor = useMutation(api.projects.inviteEditorToProject);
  
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEditorId, setSelectedEditorId] = useState<Id<"users"> | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  if (!invitations) {
    return (
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      </Card>
    );
  }

  const { pending, accepted, rejected, counts } = invitations;
  
  // Filter out editors who already have invitations
  const availableEditors = editors?.filter(editor => 
    !invitations.all.some(inv => inv.editorId === editor._id && (inv.status === "PENDING" || inv.status === "ACCEPTED"))
  ) || [];

  const handleInvite = async () => {
    if (!selectedEditorId) return;
    setIsInviting(true);
    setInviteError("");
    try {
      await inviteEditor({ projectId, editorId: selectedEditorId });
      setSelectedEditorId(null);
      setInviteModalOpen(false);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Failed to invite editor");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-200">Team</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>{counts.accepted} active</span>
              {counts.pending > 0 && (
                <>
                  <span>•</span>
                  <span>{counts.pending} pending</span>
                </>
              )}
            </div>
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  setInviteModalOpen(true);
                  setInviteError("");
                  setSelectedEditorId(null);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Accepted Editors */}
        {accepted.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-400">Active Members</h4>
            <div className="space-y-2">
              {accepted.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg "
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-200 truncate">{inv.editorName}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {inv.editorTier && (
                        <>
                          <span>{inv.editorTier}</span>
                          <span>•</span>
                        </>
                      )}
                      <Calendar className="w-3 h-3" />
                      <span>
                        Joined {inv.respondedAt ? new Date(inv.respondedAt).toLocaleDateString() : "recently"}
                      </span>
                    </div>
                  </div>
                  {(inv.payoutPreview.minPayout > 0 || inv.payoutPreview.maxPayout > 0) && (
                    <div className="text-right">
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                        ₹{Math.round(inv.payoutPreview.minPayout)} - ₹{Math.round(inv.payoutPreview.maxPayout)}
                      </Badge>
                      <p className="text-xs text-zinc-600 mt-1">Potential</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-400">Pending Invitations</h4>
            <div className="space-y-2">
              {pending.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-yellow-500/20"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-200 truncate">{inv.editorName}</p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      {inv.editorTier && (
                        <>
                          <span>{inv.editorTier}</span>
                          <span>•</span>
                        </>
                      )}
                      <Mail className="w-3 h-3" />
                      <span>Invited {new Date(inv.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                      ₹{Math.round(inv.payoutPreview.minPayout)} - ₹{Math.round(inv.payoutPreview.maxPayout)}
                    </Badge>
                    <p className="text-xs text-zinc-600 mt-1">Potential</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Invitations (collapsed) */}
        {rejected.length > 0 && (
          <details className="space-y-3">
            <summary className="text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-300">
              Declined ({rejected.length})
            </summary>
            <div className="space-y-2 mt-3">
              {rejected.map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800"
                >
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                    <XIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-zinc-400 line-through">{inv.editorName}</p>
                    <p className="text-xs text-zinc-600">
                      Declined {inv.respondedAt ? new Date(inv.respondedAt).toLocaleDateString() : "recently"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Empty state */}
        {accepted.length === 0 && pending.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">No editors invited yet</p>
            {canManage && (
              <p className="text-xs text-zinc-600 mt-1">Use the + button to invite editors</p>
            )}
          </div>
        )}
      </div>

      {/* Invite editor modal — only when canManage (PM/SA) */}
      {canManage && inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isInviting && setInviteModalOpen(false)}
          />
          <Card className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-zinc-900 border-zinc-700 shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100">Invite editor</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                onClick={() => !isInviting && setInviteModalOpen(false)}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {inviteError && (
                <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {inviteError}
                </div>
              )}
              {availableEditors.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">No available editors to invite</p>
              ) : (
                <ul className="space-y-1">
                  {availableEditors.map((editor) => (
                    <li key={editor._id}>
                      <button
                        type="button"
                        onClick={() => {
                          setInviteError("");
                          setSelectedEditorId(editor._id);
                        }}
                        disabled={isInviting}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedEditorId === editor._id
                            ? "bg-rose-500/10 border border-rose-500/30"
                            : "bg-zinc-800/50 border border-transparent hover:bg-zinc-800"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-zinc-200">{editor.name}</p>
                          <p className="text-xs text-zinc-500">{editor.projectCount ?? 0}/3 projects</p>
                        </div>
                        {selectedEditorId === editor._id && (
                          <Check className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t border-zinc-800">
              <Button
                className="w-full bg-rose-600 hover:bg-rose-700"
                onClick={handleInvite}
                disabled={isInviting || !selectedEditorId || availableEditors.length === 0}
              >
                {isInviting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </>
                )}
              </Button>
              <p className="text-xs text-zinc-500 mt-2 text-center">
                Editor will see payout range and can accept or decline
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
