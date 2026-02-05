"use client";

import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, Clock } from "lucide-react";

interface Project {
  name: string;
  editorCapAmount?: number;
  status: string;
  payoutsUnlockedAt?: number;
}

interface PayoutSummaryProps {
  project: Project;
}

export function PayoutSummary({ project }: PayoutSummaryProps) {
  const totalValue = project.editorCapAmount || 0;
  const isCompleted = project.status === "COMPLETED";
  const isUnlocked = !!project.payoutsUnlockedAt;
  
  const approvedValue = isUnlocked ? totalValue : 0;
  const pendingValue = isCompleted && !isUnlocked ? totalValue : (isCompleted ? 0 : totalValue);
  
  return (
    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4">Payout Summary</h2>
      
      {/* Total stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Editor Budget</span>
          </div>
          <p className="text-xl font-bold text-zinc-200">₹{totalValue.toLocaleString()}</p>
        </div>
        
        <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400/80">Unlocked</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">₹{approvedValue.toLocaleString()}</p>
        </div>
        
        <div className="p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Pending</span>
          </div>
          <p className="text-xl font-bold text-zinc-200">₹{pendingValue.toLocaleString()}</p>
        </div>
      </div>
      
      {totalValue === 0 && (
        <p className="text-sm text-zinc-500 text-center py-4">
          Editor budget not set for this project
        </p>
      )}
    </Card>
  );
}

