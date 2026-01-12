"use client";

import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, Clock } from "lucide-react";

interface Milestone {
  _id: string;
  status: string;
  payoutAmount: number;
  assignedEditorName?: string;
}

interface Project {
  name: string;
}

interface PayoutSummaryProps {
  project: Project;
  milestones: Milestone[];
}

export function PayoutSummary({ project, milestones }: PayoutSummaryProps) {
  const totalValue = milestones.reduce((sum, m) => sum + m.payoutAmount, 0);
  const approvedValue = milestones
    .filter(m => m.status === "APPROVED")
    .reduce((sum, m) => sum + m.payoutAmount, 0);
  const pendingValue = totalValue - approvedValue;
  
  // Group by editor
  const editorPayouts = milestones.reduce((acc, m) => {
    if (!m.assignedEditorName) return acc;
    if (!acc[m.assignedEditorName]) {
      acc[m.assignedEditorName] = { approved: 0, pending: 0 };
    }
    if (m.status === "APPROVED") {
      acc[m.assignedEditorName].approved += m.payoutAmount;
    } else if (m.status !== "LOCKED") {
      acc[m.assignedEditorName].pending += m.payoutAmount;
    }
    return acc;
  }, {} as Record<string, { approved: number; pending: number }>);
  
  return (
    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-200 mb-4">Payout Summary</h2>
      
      {/* Total stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Total Value</span>
          </div>
          <p className="text-xl font-bold text-zinc-200">₹{totalValue.toLocaleString()}</p>
        </div>
        
        <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400/80">Released</span>
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
      
      {/* Editor breakdown */}
      {Object.keys(editorPayouts).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">By Editor</h3>
          <div className="space-y-2">
            {Object.entries(editorPayouts).map(([name, amounts]) => (
              <div 
                key={name} 
                className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-300 text-sm font-medium">
                    {name.charAt(0)}
                  </div>
                  <span className="text-zinc-300">{name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-400">
                    ₹{amounts.approved.toLocaleString()}
                    <span className="text-zinc-500 font-normal"> released</span>
                  </p>
                  {amounts.pending > 0 && (
                    <p className="text-sm text-zinc-500">
                      ₹{amounts.pending.toLocaleString()} pending
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

