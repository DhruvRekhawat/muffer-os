"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, TrendingUp, CheckCircle } from "lucide-react";
import Link from "next/link";

interface EarningsPageProps {
  params: Promise<{ slug: string }>;
}

export default function EarningsPage({ params }: EarningsPageProps) {
  const { slug } = use(params);
  const { user } = useAuth();
  
  const project = useQuery(api.projects.getProjectBySlug, { slug });
  const payoutRecord = useQuery(
    api.payouts.getProjectPayoutRecord,
    project && user && user.role === "EDITOR"
      ? { projectId: project._id, editorId: user._id }
      : "skip"
  );

  if (project === undefined || payoutRecord === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-zinc-300">Project not found</h2>
        <p className="text-zinc-500 mt-2">This project doesn&apos;t exist or you don&apos;t have access.</p>
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  if (!user || user.role !== "EDITOR" || !project.editorIds.includes(user._id)) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-zinc-300">Access Denied</h2>
        <p className="text-zinc-500 mt-2">Only editors assigned to this project can view earnings.</p>
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  if (project.status !== "COMPLETED") {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-zinc-300">Project Not Completed</h2>
        <p className="text-zinc-500 mt-2">Earnings breakdown will be available after project completion.</p>
        <Link 
          href={`/projects/${slug}`}
          className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>
      </div>
    );
  }

  if (!payoutRecord) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-zinc-300">Earnings Not Calculated</h2>
        <p className="text-zinc-500 mt-2">Payout calculation is pending. Please check back later.</p>
        <Link 
          href={`/projects/${slug}`}
          className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back link */}
      <Link 
        href={`/projects/${slug}`}
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Project
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Earnings Breakdown</h1>
        <p className="text-zinc-400 mt-1">{project.name}</p>
        {payoutRecord.unlockedAt && (
          <p className="text-sm text-zinc-500 mt-1">
            Completed on {new Date(payoutRecord.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Final Payout Card */}
      <Card className="p-6 bg-linear-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-emerald-400/80">Final Payout</p>
            <p className="text-4xl font-bold text-emerald-400 mt-1">
              ₹{payoutRecord.finalPayout.toLocaleString()}
            </p>
          </div>
          <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        {payoutRecord.status === "UNLOCKED" && (
          <div className="flex items-center gap-2 text-sm text-emerald-400/80">
            <CheckCircle className="w-4 h-4" />
            <span>Unlocked to your wallet balance</span>
          </div>
        )}
      </Card>

      {/* Breakdown */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Calculation Breakdown</h2>
        
        <div className="space-y-4">
          {/* Base Calculation */}
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Base Payout</span>
              <span className="text-lg font-semibold text-zinc-200">
                ₹{payoutRecord.basePayout.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {payoutRecord.billableMinutes} BM × ₹{payoutRecord.tierRate}/min
            </p>
          </div>

          {/* Reliability Factor */}
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Reliability Adjustment</span>
              <span className={`text-lg font-semibold ${
                payoutRecord.reliabilityFactor < 1.0 ? "text-yellow-400" : "text-zinc-200"
              }`}>
                {payoutRecord.reliabilityFactor < 1.0 ? "-" : "+"}
                {Math.round((1 - payoutRecord.reliabilityFactor) * 100)}%
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Factor: {payoutRecord.reliabilityFactor.toFixed(2)} • 
              Late: {Math.round(payoutRecord.lateMinutes)} minutes
            </p>
          </div>

          {/* Quality Factor */}
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Quality Adjustment</span>
              <span className={`text-lg font-semibold ${
                payoutRecord.qualityFactor < 1.0 ? "text-yellow-400" : "text-emerald-400"
              }`}>
                {payoutRecord.qualityFactor < 1.0 ? "-" : "+"}
                {Math.round((payoutRecord.qualityFactor - 1) * 100)}%
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Factor: {payoutRecord.qualityFactor.toFixed(2)} • 
              QC Average: {payoutRecord.qcAverage.toFixed(2)}/5.0
            </p>
          </div>

          {/* After Factors */}
          <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">After Adjustments</span>
              <span className="text-lg font-semibold text-zinc-200">
                ₹{payoutRecord.afterFactors.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cap Applied */}
          {payoutRecord.cappedPayout < payoutRecord.afterFactors && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-yellow-400">Capped at Editor Budget</span>
                <span className="text-lg font-semibold text-yellow-400">
                  ₹{payoutRecord.cappedPayout.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-yellow-400/70">
                Original: ₹{payoutRecord.afterFactors.toLocaleString()}
              </p>
            </div>
          )}

          {/* Bonuses */}
          {payoutRecord.bonusAmount > 0 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-emerald-400">Bonuses Applied</span>
                <span className="text-lg font-semibold text-emerald-400">
                  +₹{payoutRecord.bonusAmount.toLocaleString()}
                </span>
              </div>
              {payoutRecord.bonusesApplied.length > 0 && (
                <div className="mt-2 space-y-1">
                  {payoutRecord.bonusesApplied.map((bonus, i) => (
                    <p key={i} className="text-xs text-emerald-400/70">
                      • {bonus.code}: +₹{bonus.amount.toLocaleString()}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Final Total */}
          <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-emerald-400">Final Payout</span>
              <span className="text-2xl font-bold text-emerald-400">
                ₹{payoutRecord.finalPayout.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Link to payouts page */}
      <Card className="p-4 bg-zinc-900/50 border-zinc-800">
        <Link 
          href="/payouts"
          className="flex items-center justify-between text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          <span>View all payouts</span>
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </Link>
      </Card>
    </div>
  );
}
