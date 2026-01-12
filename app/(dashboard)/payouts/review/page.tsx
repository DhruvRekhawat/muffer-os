"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft,
  Loader2, 
  CheckCircle, 
  XCircle,
  Download,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

type StatusFilter = "REQUESTED" | "PAID" | "REJECTED" | "ALL";

export default function PayoutReviewPage() {
  const { canProcessPayouts } = usePermissions();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("REQUESTED");
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const payouts = useQuery(api.payouts.listPayoutRequests, {
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });
  const pendingStats = useQuery(api.payouts.getPendingPayoutStats);
  const exportCsv = useQuery(api.payouts.exportPayoutsForProcessing);
  
  const processPayout = useMutation(api.payouts.processPayout);
  const rejectPayout = useMutation(api.payouts.rejectPayout);
  
  const handleProcess = async (requestId: Id<"payoutRequests">) => {
    const txnRef = prompt("Transaction reference (optional):");
    setProcessingId(requestId);
    try {
      await processPayout({ requestId, transactionRef: txnRef || undefined });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReject = async (requestId: Id<"payoutRequests">) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    
    setProcessingId(requestId);
    try {
      await rejectPayout({ requestId, reason });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleExport = () => {
    if (!exportCsv) return;
    const blob = new Blob([exportCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };
  
  if (!canProcessPayouts) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Approved</Badge>;
      case "PAID":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Paid</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Rejected</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            href="/payouts" 
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100">Review Payouts</h1>
          <p className="text-zinc-400 mt-1">Process pending payout requests</p>
        </div>
        {exportCsv && (
          <Button 
            onClick={handleExport}
            variant="outline" 
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>
      
      {/* Stats */}
      {pendingStats && (
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm text-yellow-400/80">{pendingStats.count} pending requests</p>
                <p className="text-xl font-bold text-yellow-400">₹{pendingStats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Filters */}
      <div className="flex gap-2">
        {(["REQUESTED", "PAID", "REJECTED", "ALL"] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className={statusFilter === status 
              ? "bg-zinc-700 text-zinc-100" 
              : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}
          >
            {status === "REQUESTED" ? "Pending" : status === "ALL" ? "All" : status}
          </Button>
        ))}
      </div>
      
      {/* Content */}
      {payouts === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-20">
          <Wallet className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No payout requests</h3>
          <p className="text-zinc-500 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <Card key={payout._id} className="p-6 bg-zinc-900/50 border-zinc-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-zinc-200">{payout.editorName}</h3>
                    {getStatusBadge(payout.status)}
                  </div>
                  
                  <p className="text-2xl font-bold text-zinc-100 mb-2">
                    ₹{payout.amount.toLocaleString()}
                  </p>
                  
                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>
                      {payout.payoutMethod.method === "UPI" 
                        ? `UPI: ${payout.payoutMethod.upiId}`
                        : `Bank: ${payout.payoutMethod.bankName} - ${payout.payoutMethod.accountNumber} (${payout.payoutMethod.ifscCode})`
                      }
                    </p>
                    <p>Requested: {new Date(payout.createdAt).toLocaleDateString()}</p>
                    {payout.transactionRef && (
                      <p className="text-emerald-400">Txn Ref: {payout.transactionRef}</p>
                    )}
                    {payout.rejectionReason && (
                      <p className="text-red-400">Reason: {payout.rejectionReason}</p>
                    )}
                  </div>
                </div>
                
                {payout.status === "REQUESTED" && (
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(payout._id)}
                      disabled={processingId === payout._id}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      {processingId === payout._id ? (
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
                      onClick={() => handleProcess(payout._id)}
                      disabled={processingId === payout._id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {processingId === payout._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Paid
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

