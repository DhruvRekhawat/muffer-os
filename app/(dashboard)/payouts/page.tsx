"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  Loader2, 
  Plus,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

export default function PayoutsPage() {
  const { canProcessPayouts } = usePermissions();
  
  // Editor sees their payouts, SA sees all
  const payouts = useQuery(api.payouts.getEditorPayouts, {});
  const editorStats = useQuery(api.users.getEditorStats, {});
  
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
  
  if (canProcessPayouts) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Payouts</h1>
            <p className="text-zinc-400 mt-1">Manage your earnings and requests</p>
          </div>
          <Link href="/payouts/review">
            <Button className="bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
              Review Requests
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
        
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <p className="text-zinc-400">Go to the review page to process pending payout requests.</p>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Payouts</h1>
          <p className="text-zinc-400 mt-1">Request payouts from your completed projects</p>
        </div>
        <Link href="/payouts/request">
          <Button className="bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white shadow-lg shadow-rose-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Request Payout
          </Button>
        </Link>
      </div>
      
      {/* Balance Cards */}
      {editorStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 bg-linear-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-emerald-400/80">Available Balance (completed projects)</p>
                <p className="text-3xl font-bold text-emerald-400">
                  ₹{(editorStats.unlockedBalance ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Lifetime Earnings</p>
                <p className="text-3xl font-bold text-zinc-300">
                  ₹{(editorStats.lifetimeEarnings ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Payout History */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Payout History</h2>
        
        {payouts === undefined ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : payouts.length === 0 ? (
          <Card className="p-8 bg-zinc-900/50 border-zinc-800 text-center">
            <Wallet className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300">No payouts yet</h3>
            <p className="text-zinc-500 mt-1">Once your project is marked completed, your earnings appear here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => (
              <Card key={payout._id} className="p-4 bg-zinc-900/50 border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-zinc-200">
                        ₹{payout.amount.toLocaleString()}
                      </p>
                      {getStatusBadge(payout.status)}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                      {payout.payoutMethod.method === "UPI" 
                        ? `UPI: ${payout.payoutMethod.upiId}`
                        : `Bank: ${payout.payoutMethod.bankName}`
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </p>
                    {payout.transactionRef && (
                      <p className="text-xs text-zinc-600 mt-1">
                        Ref: {payout.transactionRef}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

