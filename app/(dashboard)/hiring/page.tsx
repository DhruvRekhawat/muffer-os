"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Calendar,
  Briefcase,
  RotateCcw,
  UserX
} from "lucide-react";
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
import { Input } from "@/components/ui/input";

type CandidateStatusFilter = "ALL" | "ONBOARDING" | "READY_FOR_REVIEW" | "APPROVED_NDA_PENDING" | "ACTIVE_EDITORS" | "REJECTED";

export default function HiringPage() {
  const { canManageHiring } = usePermissions();
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<CandidateStatusFilter>("READY_FOR_REVIEW");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [savingTierId, setSavingTierId] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, "JUNIOR" | "STANDARD" | "SENIOR" | "ELITE" | "">>({});
  const [undoRejectOpen, setUndoRejectOpen] = useState<Id<"users"> | null>(null);
  const [fireEditorOpen, setFireEditorOpen] = useState<{ userId: Id<"users">; name: string } | null>(null);
  const [fireStatus, setFireStatus] = useState<"SUSPENDED" | "REJECTED">("SUSPENDED");
  const [fireReason, setFireReason] = useState("");
  
  const queryStatus =
    candidateStatusFilter === "ALL"
      ? undefined
      : candidateStatusFilter === "APPROVED_NDA_PENDING" || candidateStatusFilter === "ACTIVE_EDITORS"
      ? "APPROVED"
      : candidateStatusFilter;

  const allCandidatesRaw = useQuery(api.editorHiring.listAllCandidates, {
    status: queryStatus,
  });

  const allCandidates =
    allCandidatesRaw === undefined
      ? undefined
      : candidateStatusFilter === "APPROVED_NDA_PENDING"
      ? allCandidatesRaw.filter((item) => item.hiring.status === "APPROVED" && !item.hiring.ndaAcceptedAt)
      : candidateStatusFilter === "ACTIVE_EDITORS"
      ? allCandidatesRaw.filter((item) => item.hiring.status === "APPROVED" && !!item.hiring.ndaAcceptedAt)
      : allCandidatesRaw;
  const tierRates = useQuery(api.config.listTierRates, {});
  
  const approveEditor = useMutation(api.editorHiring.approveEditor);
  const rejectEditor = useMutation(api.editorHiring.rejectEditor);
  const undoEditorRejection = useMutation(api.editorHiring.undoEditorRejection);
  const fireEditor = useMutation(api.editorHiring.fireEditor);
  const updateEditorTier = useMutation(api.editorHiring.updateEditorTier);

  const handleApproveEditor = async (userId: Id<"users">, userRole: string, userTier?: string) => {
    if (userRole === "EDITOR") {
      const selectedTier = selectedTiers[userId];
      const existingTier = userTier;
      const tierToUse = selectedTier || existingTier;
      
      if (!tierToUse) {
        alert("Please select and save a tier for this editor first");
        return;
      }
    }
    
    setProcessingId(userId);
    try {
      const tierToUse = selectedTiers[userId] || (userRole === "EDITOR" ? userTier : undefined);
      await approveEditor({ 
        userId,
        tier: userRole === "EDITOR" && tierToUse ? tierToUse as "JUNIOR" | "STANDARD" | "SENIOR" | "ELITE" : undefined,
      });
      // Clear selected tier after approval
      setSelectedTiers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectEditor = async (userId: Id<"users">) => {
    const reason = prompt("Rejection reason (optional):");
    setProcessingId(userId);
    try {
      await rejectEditor({ userId, reason: reason || undefined });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUndoRejection = async (userId: Id<"users">) => {
    setProcessingId(userId);
    try {
      await undoEditorRejection({ userId });
      setUndoRejectOpen(null);
    } finally {
      setProcessingId(null);
    }
  };

  const handleFireEditor = async () => {
    if (!fireEditorOpen) return;
    setProcessingId(fireEditorOpen.userId);
    try {
      await fireEditor({
        userId: fireEditorOpen.userId,
        newStatus: fireStatus,
        reason: fireReason.trim() || undefined,
      });
      setFireEditorOpen(null);
      setFireReason("");
      setFireStatus("SUSPENDED");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveTier = async (userId: Id<"users">) => {
    const tier = selectedTiers[userId];
    if (!tier) {
      alert("Please select a tier first");
      return;
    }
    
    setSavingTierId(userId);
    try {
      await updateEditorTier({ userId, tier: tier as "JUNIOR" | "STANDARD" | "SENIOR" | "ELITE" });
    } finally {
      setSavingTierId(null);
    }
  };
  
  if (!canManageHiring) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>;
      default:
        return null;
    }
  };

  const getCandidateStatusBadge = (status: string, ndaAcceptedAt?: number | null) => {
    switch (status) {
      case "ONBOARDING":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Onboarding</Badge>;
      case "READY_FOR_REVIEW":
        return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Ready for Review</Badge>;
      case "APPROVED":
        if (ndaAcceptedAt) {
          return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>;
        }
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">NDA Pending</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Hiring</h1>
        <p className="text-zinc-400 mt-1">Review applications and test submissions</p>
      </div>

      {/* Candidates section */}
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
            {(["READY_FOR_REVIEW", "ONBOARDING", "APPROVED_NDA_PENDING", "ACTIVE_EDITORS", "REJECTED", "ALL"] as CandidateStatusFilter[]).map((status) => (
              <Button
                key={status}
                variant={candidateStatusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setCandidateStatusFilter(status)}
                className={
                  candidateStatusFilter === status
                    ? "bg-zinc-700 text-zinc-100"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                }
              >
                {status === "READY_FOR_REVIEW" ? "Ready" : 
                 status === "ONBOARDING" ? "Onboarding" :
                 status === "APPROVED_NDA_PENDING" ? "NDA Pending" :
                 status === "ACTIVE_EDITORS" ? "Active Editors" :
                 status === "ALL" ? "All" : status}
              </Button>
            ))}
          </div>

          {allCandidates === undefined ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : allCandidates.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300">No candidates</h3>
              <p className="text-zinc-500 mt-1">
                {candidateStatusFilter === "READY_FOR_REVIEW" 
                  ? "No candidates ready for review" 
                  : candidateStatusFilter === "APPROVED_NDA_PENDING"
                  ? "No approved editors waiting for NDA"
                  : candidateStatusFilter === "ACTIVE_EDITORS"
                  ? "No active editors yet"
                  : candidateStatusFilter === "ALL"
                  ? "No candidates found"
                  : `No ${candidateStatusFilter.toLowerCase()} candidates`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allCandidates.map((item) => (
                <Card key={item.user._id} className="p-6 bg-zinc-900/50 border-zinc-800">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-zinc-200">{item.user.name}</h3>
                        {item.user.role && (
                          <Badge
                            className={
                              item.user.role === "PM"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }
                          >
                            {item.user.role === "PM" ? "PM" : "Editor"}
                          </Badge>
                        )}
                        {getCandidateStatusBadge(item.hiring.status, item.hiring.ndaAcceptedAt)}
                      </div>

                      <div className="space-y-1 text-sm text-zinc-400">
                        <p>{item.user.email}</p>
                        {item.user.phone && <p>{item.user.phone}</p>}
                      </div>

                      <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500 flex-wrap">
                        {item.hiring.ndaAcceptedAt && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span>
                              NDA accepted {new Date(item.hiring.ndaAcceptedAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {item.testSubmission?.driveLink && (
                          <a
                            href={item.testSubmission.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View test submission
                          </a>
                        )}
                      </div>

                      {item.user.skills && item.user.skills.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.user.skills.map((s: string) => (
                            <Badge key={s} variant="outline" className="border-zinc-700 text-zinc-400">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {item.user.tools && item.user.tools.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.user.tools.map((t: string) => (
                            <Badge key={t} variant="outline" className="border-zinc-700 text-zinc-400">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {item.user.experience && (
                        <p className="mt-4 text-sm text-zinc-400">
                          {item.user.experience}
                        </p>
                      )}

                      {(item.user.addressLine1 ||
                        item.user.addressLine2 ||
                        item.user.city ||
                        item.user.state ||
                        item.user.postalCode ||
                        item.user.country) && (
                        <div className="mt-4 text-sm text-zinc-400">
                          <p className="text-xs text-zinc-500 mb-1">Address</p>
                          <p className="text-sm text-zinc-400">
                            {[item.user.addressLine1, item.user.addressLine2, item.user.city, item.user.state, item.user.postalCode, item.user.country]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}

                      {item.testSubmission?.notes && (
                        <p className="mt-4 text-sm text-zinc-400">
                          &quot;{item.testSubmission.notes}&quot;
                        </p>
                      )}

                      {item.user.role === "EDITOR" && (
                        <div className="mt-4">
                          <label className="text-xs text-zinc-500 mb-2 block">
                            Editor Tier (Required)
                            {tierRates === undefined && (
                              <span className="ml-2 text-zinc-600">Loading tiers...</span>
                            )}
                            {tierRates && tierRates.length === 0 && (
                              <span className="ml-2 text-yellow-500">No tiers configured</span>
                            )}
                          </label>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <Select
                                value={selectedTiers[item.user._id] || item.user.tier || ""}
                                onValueChange={(value) => {
                                  setSelectedTiers(prev => ({
                                    ...prev,
                                    [item.user._id]: value as "JUNIOR" | "STANDARD" | "SENIOR" | "ELITE",
                                  }));
                                }}
                                disabled={!tierRates || tierRates.length === 0}
                              >
                                <SelectTrigger className="w-full bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed">
                                  <SelectValue placeholder={tierRates && tierRates.length > 0 ? "Select tier" : "No tiers available"} />
                                </SelectTrigger>
                                {tierRates && tierRates.length > 0 && (
                                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200 z-50">
                                    {tierRates.map((tr) => (
                                      <SelectItem 
                                        key={tr.tier} 
                                        value={tr.tier}
                                        className="hover:bg-zinc-800 focus:bg-zinc-800 cursor-pointer"
                                      >
                                        {tr.tier} - ₹{tr.ratePerMin}/min
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                )}
                              </Select>
                            </div>
                            {selectedTiers[item.user._id] && selectedTiers[item.user._id] !== item.user.tier && (
                              <Button
                                size="sm"
                                onClick={() => handleSaveTier(item.user._id)}
                                disabled={savingTierId === item.user._id}
                                className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 whitespace-nowrap"
                              >
                                {savingTierId === item.user._id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            )}
                          </div>
                          {(selectedTiers[item.user._id] || item.user.tier) && tierRates && (
                            <p className="text-xs text-zinc-500 mt-1">
                              Rate: ₹{tierRates.find(tr => tr.tier === (selectedTiers[item.user._id] || item.user.tier))?.ratePerMin}/minute
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {item.hiring.status === "READY_FOR_REVIEW" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectEditor(item.user._id)}
                          disabled={processingId === item.user._id}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          {processingId === item.user._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveEditor(item.user._id, item.user.role || "", item.user.tier)}
                          disabled={processingId === item.user._id || (item.user.role === "EDITOR" && !selectedTiers[item.user._id] && !item.user.tier)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {processingId === item.user._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {item.user.role === "PM" ? "Approve PM" : "Approve editor"}
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {item.hiring.status === "REJECTED" && (
                      <div className="flex flex-col gap-2 items-end">
                        {item.hiring.updatedAt && (
                          <p className="text-sm text-zinc-500">
                            Rejected on {new Date(item.hiring.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUndoRejectOpen(item.user._id)}
                          disabled={processingId === item.user._id}
                          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          {processingId === item.user._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Undo rejection
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {item.hiring.status === "APPROVED" &&
                      (item.user.status === "ACTIVE" ||
                        item.user.status === "INVITED" ||
                        !item.user.status) && (
                      <div className="flex flex-col gap-2 items-end">
                        {item.hiring.approvedAt && (
                          <div className="text-sm text-zinc-500">
                            <p>
                              Approved on {new Date(item.hiring.approvedAt).toLocaleDateString()}
                            </p>
                            {item.approver && (
                              <p className="text-xs text-zinc-600">
                                by {item.approver.name}
                              </p>
                            )}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setFireEditorOpen({ userId: item.user._id, name: item.user.name })
                          }
                          disabled={processingId === item.user._id}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Fire
                        </Button>
                      </div>
                    )}
                    {item.hiring.status === "APPROVED" &&
                      (item.user.status === "SUSPENDED" || item.user.status === "REJECTED") && (
                      <div className="text-sm text-zinc-500 space-y-1">
                        {item.hiring.approvedAt && (
                          <div>
                            <p>
                              Approved on {new Date(item.hiring.approvedAt).toLocaleDateString()}
                            </p>
                            {item.approver && (
                              <p className="text-xs text-zinc-600">
                                by {item.approver.name}
                              </p>
                            )}
                          </div>
                        )}
                        <Badge
                          className={
                            item.user.status === "SUSPENDED"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }
                        >
                          {item.user.status === "SUSPENDED" ? "Suspended" : "Fired"}
                        </Badge>
                      </div>
                    )}
                    {item.hiring.status === "ONBOARDING" && (
                      <div className="text-sm text-zinc-500">
                        <p className="text-blue-400">Currently onboarding</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Undo Rejection Dialog */}
      <AlertDialog
        open={!!undoRejectOpen}
        onOpenChange={(open) => !open && setUndoRejectOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo rejection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the candidate back to Onboarding status. They will need to complete the onboarding process again before review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setUndoRejectOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => undoRejectOpen && handleUndoRejection(undoRejectOpen)}
              disabled={!!undoRejectOpen && processingId === undoRejectOpen}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {undoRejectOpen && processingId === undoRejectOpen ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Undo rejection
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fire Editor Dialog */}
      <AlertDialog
        open={!!fireEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFireEditorOpen(null);
            setFireReason("");
            setFireStatus("SUSPENDED");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Fire {fireEditorOpen?.name ?? "editor"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access. Choose the new status and optionally add a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">New status</label>
              <Select value={fireStatus} onValueChange={(v) => setFireStatus(v as "SUSPENDED" | "REJECTED")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUSPENDED">Suspended (can be reinstated)</SelectItem>
                  <SelectItem value="REJECTED">Rejected (permanent)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-300 mb-2 block">Reason (optional)</label>
              <Input
                value={fireReason}
                onChange={(e) => setFireReason(e.target.value)}
                placeholder="Enter reason..."
                className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setFireEditorOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleFireEditor}
              disabled={!!fireEditorOpen && processingId === fireEditorOpen.userId}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              {fireEditorOpen && processingId === fireEditorOpen.userId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserX className="w-4 h-4 mr-1" />
                  Fire
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

