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
  Briefcase
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type StatusFilter = "ALL" | "SUBMITTED" | "APPROVED" | "REJECTED";
type ViewMode = "APPLICATIONS" | "READY_FOR_REVIEW";

export default function HiringPage() {
  const { canManageHiring } = usePermissions();
  const [viewMode, setViewMode] = useState<ViewMode>("READY_FOR_REVIEW");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("SUBMITTED");
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const applications = useQuery(api.hiring.listApplications, {
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const readyForReview = useQuery(api.editorHiring.listReadyForReview, {});
  
  const approveApplication = useMutation(api.hiring.approveApplication);
  const rejectApplication = useMutation(api.hiring.rejectApplication);
  const approveEditor = useMutation(api.editorHiring.approveEditor);
  
  const handleApprove = async (applicationId: Id<"editorApplications">) => {
    setProcessingId(applicationId);
    try {
      await approveApplication({ applicationId });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReject = async (applicationId: Id<"editorApplications">) => {
    const reason = prompt("Rejection reason (optional):");
    setProcessingId(applicationId);
    try {
      await rejectApplication({ applicationId, reason: reason || undefined });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveEditor = async (userId: Id<"users">) => {
    setProcessingId(userId);
    try {
      await approveEditor({ userId });
    } finally {
      setProcessingId(null);
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
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Hiring</h1>
        <p className="text-zinc-400 mt-1">Review applications and test submissions</p>
      </div>

      {/* Mode switch */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "READY_FOR_REVIEW" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("READY_FOR_REVIEW")}
          className={
            viewMode === "READY_FOR_REVIEW"
              ? "bg-zinc-700 text-zinc-100"
              : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          }
        >
          Ready for Review
        </Button>
        <Button
          variant={viewMode === "APPLICATIONS" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("APPLICATIONS")}
          className={
            viewMode === "APPLICATIONS"
              ? "bg-zinc-700 text-zinc-100"
              : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          }
        >
          Applications
        </Button>
      </div>
      
      {viewMode === "APPLICATIONS" ? (
        <>
          {/* Filters */}
          <div className="flex gap-2">
            {(["SUBMITTED", "APPROVED", "REJECTED", "ALL"] as StatusFilter[]).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className={
                  statusFilter === status
                    ? "bg-zinc-700 text-zinc-100"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                }
              >
                {status === "SUBMITTED" ? "Pending" : status === "ALL" ? "All" : status}
              </Button>
            ))}
          </div>

          {/* Content */}
          {applications === undefined ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300">No applications</h3>
              <p className="text-zinc-500 mt-1">
                {statusFilter === "SUBMITTED" ? "No pending applications" : "No applications found"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app._id} className="p-6 bg-zinc-900/50 border-zinc-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-zinc-200">{app.name}</h3>
                        {getStatusBadge(app.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-zinc-400">
                        <p>{app.email}</p>
                        {app.phone && <p>{app.phone}</p>}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
                        {app.occupation && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span>{app.occupation}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                        {app.canStartImmediately && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Can start immediately
                          </Badge>
                        )}
                      </div>
                      
                      {app.experience && (
                        <p className="mt-4 text-sm text-zinc-400">{app.experience}</p>
                      )}
                      
                      {app.tools.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {app.tools.map((tool) => (
                            <Badge key={tool} variant="outline" className="border-zinc-700 text-zinc-400">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {app.portfolioLinks.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {app.portfolioLinks.map((link, i) => (
                            <a
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-rose-400 hover:text-rose-300"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Portfolio {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {app.status === "SUBMITTED" && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(app._id)}
                          disabled={processingId === app._id}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          {processingId === app._id ? (
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
                          onClick={() => handleApprove(app._id)}
                          disabled={processingId === app._id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {processingId === app._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {readyForReview === undefined ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : readyForReview.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300">No candidates ready</h3>
              <p className="text-zinc-500 mt-1">No onboarding submissions to review yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {readyForReview.map((item) => (
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
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          Ready for review
                        </Badge>
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
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveEditor(item.user._id)}
                        disabled={processingId === item.user._id}
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
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

