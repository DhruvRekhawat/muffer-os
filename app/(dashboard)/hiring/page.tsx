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

export default function HiringPage() {
  const { canManageHiring } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("SUBMITTED");
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const applications = useQuery(api.hiring.listApplications, {
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  
  const approveApplication = useMutation(api.hiring.approveApplication);
  const rejectApplication = useMutation(api.hiring.rejectApplication);
  
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
        <p className="text-zinc-400 mt-1">Review editor applications</p>
      </div>
      
      {/* Filters */}
      <div className="flex gap-2">
        {(["SUBMITTED", "APPROVED", "REJECTED", "ALL"] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status 
              ? "bg-zinc-700 text-zinc-100" 
              : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}
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
    </div>
  );
}

