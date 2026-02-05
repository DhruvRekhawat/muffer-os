"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Calendar,
  Download,
  Loader2,
  Percent,
  PiggyBank,
  Wallet,
} from "lucide-react";
import Link from "next/link";

type DatePreset = "7d" | "30d" | "90d" | "all";
type Bucket = "day" | "month";
type StatusFilter = "ALL" | "ACTIVE" | "AT_RISK" | "DELAYED" | "COMPLETED";

function formatINR(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `₹${Math.round(n).toLocaleString()}`;
}

function dateInputToMs(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function addDaysToDateInput(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function FinancePage() {
  const { isSuperAdmin } = usePermissions();

  const [preset, setPreset] = useState<DatePreset>("30d");
  const [bucket, setBucket] = useState<Bucket>("day");
  const [fromInput, setFromInput] = useState<string>("");
  const [toInput, setToInput] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const customFrom = useMemo(() => dateInputToMs(fromInput), [fromInput]);
  const customTo = useMemo(() => dateInputToMs(toInput), [toInput]);

  const effectiveFrom = customFrom;
  const effectiveTo = customTo;

  const overview = useQuery(api.finance.getFinanceOverview, {
    from: effectiveFrom,
    to: effectiveTo,
    bucket,
  });

  const projectRows = useQuery(api.finance.listProjectFinance, {
    from: effectiveFrom,
    to: effectiveTo,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const csv = useQuery(api.finance.exportProjectFinanceCsv, {
    from: effectiveFrom,
    to: effectiveTo,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  const filteredRows = useMemo(() => {
    if (!projectRows) return projectRows;
    const q = search.trim().toLowerCase();
    if (!q) return projectRows;
    return projectRows.filter((r) => {
      return (
        r.projectName.toLowerCase().includes(q) ||
        r.pmName.toLowerCase().includes(q) ||
        r.serviceType.toLowerCase().includes(q)
      );
    });
  }, [projectRows, search]);

  const revenueSeries = useMemo(() => overview?.revenueSeries ?? [], [overview]);
  const maxRevenue = useMemo(() => {
    return revenueSeries.reduce((m, p) => Math.max(m, p.revenue), 0) || 1;
  }, [revenueSeries]);

  const revenueTotal = overview?.revenueTotal ?? 0;
  const revenueByService = useMemo(
    () => overview?.revenueByService ?? { EditMax: 0, ContentMax: 0, AdMax: 0, Other: 0 },
    [overview]
  );

  const serviceMix = useMemo(() => {
    const total =
      revenueByService.EditMax +
      revenueByService.ContentMax +
      revenueByService.AdMax +
      (revenueByService.Other ?? 0);
    const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
    return [
      { key: "EditMax", value: revenueByService.EditMax, pct: pct(revenueByService.EditMax) },
      { key: "ContentMax", value: revenueByService.ContentMax, pct: pct(revenueByService.ContentMax) },
      { key: "AdMax", value: revenueByService.AdMax, pct: pct(revenueByService.AdMax) },
      { key: "Other", value: revenueByService.Other ?? 0, pct: pct(revenueByService.Other ?? 0) },
    ] as const;
  }, [revenueByService]);

  const handleExport = () => {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const isLoading = overview === undefined || projectRows === undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Finance</h1>
          <p className="text-zinc-400 mt-1">Revenue, cost projections, payouts, and per-project margins.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            disabled={!csv}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Range + filters */}
      <Card className="p-4 bg-zinc-900/50 border-zinc-800">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              {(["7d", "30d", "90d", "all"] as DatePreset[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={preset === p ? "default" : "outline"}
                  onClick={() => {
                    setPreset(p);
                    if (p === "all") {
                      setFromInput("");
                      setToInput("");
                      return;
                    }
                    const now = new Date();
                    const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
                    setToInput(addDaysToDateInput(now, 0));
                    setFromInput(addDaysToDateInput(now, -days));
                  }}
                  className={
                    preset === p ? "bg-zinc-700 text-zinc-100" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  }
                >
                  {p === "7d" ? "Last 7d" : p === "30d" ? "Last 30d" : p === "90d" ? "Last 90d" : "All time"}
                </Button>
              ))}
            </div>

            <div className="h-6 w-px bg-zinc-800 mx-1" />

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <Input
                type="date"
                value={fromInput}
                onChange={(e) => {
                  setPreset("all");
                  setFromInput(e.target.value);
                }}
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 w-[150px]"
              />
              <span className="text-zinc-500 text-sm">to</span>
              <Input
                type="date"
                value={toInput}
                onChange={(e) => {
                  setPreset("all");
                  setToInput(e.target.value);
                }}
                className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 w-[150px]"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant={bucket === "day" ? "default" : "outline"}
                onClick={() => setBucket("day")}
                className={bucket === "day" ? "bg-zinc-700 text-zinc-100" : "border-zinc-700 text-zinc-400"}
              >
                Day
              </Button>
              <Button
                size="sm"
                variant={bucket === "month" ? "default" : "outline"}
                onClick={() => setBucket("month")}
                className={bucket === "month" ? "bg-zinc-700 text-zinc-100" : "border-zinc-700 text-zinc-400"}
              >
                Month
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="Search projects / PM / service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700/50 text-zinc-100 max-w-sm"
            />

            <div className="flex gap-2">
              {(["ALL", "ACTIVE", "AT_RISK", "DELAYED", "COMPLETED"] as StatusFilter[]).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? "default" : "outline"}
                  onClick={() => setStatusFilter(s)}
                  className={
                    statusFilter === s ? "bg-zinc-700 text-zinc-100" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  }
                >
                  {s === "ALL" ? "All" : s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      )}

      {/* KPI grid */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Revenue</p>
                <p className="text-2xl font-bold text-zinc-100">{formatINR(overview.revenueTotal)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">18% of total revenue</p>
                <p className="text-2xl font-bold text-zinc-100">{formatINR(overview.revenueTotal * 0.18)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Expected Cost (all milestones)</p>
                <p className="text-2xl font-bold text-zinc-100">{formatINR(overview.expectedCostTotal)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Remaining Liability (unapproved)</p>
                <p className="text-2xl font-bold text-zinc-100">{formatINR(overview.remainingLiabilityTotal)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Expected Gross Margin</p>
                <p className="text-2xl font-bold text-zinc-100">{formatINR(overview.grossMarginTotal)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Payouts Pending (requested)</p>
                <p className="text-2xl font-bold text-zinc-100">{formatINR(overview.pendingPayoutAmount)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Payouts Paid (in range)</p>
                <p className="text-2xl font-bold text-zinc-100">{formatINR(overview.payoutsPaidAmount)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      {overview && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-200">Revenue over time</h2>
              <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">{bucket}</Badge>
            </div>

            {revenueSeries.length === 0 ? (
              <p className="text-sm text-zinc-500">No orders in this range.</p>
            ) : (
              <div className="h-40 flex items-end gap-2">
                {revenueSeries.map((p) => {
                  const h = Math.max(2, Math.round((p.revenue / maxRevenue) * 100));
                  const label = new Date(p.bucketStart).toLocaleDateString();
                  return (
                    <div key={p.bucketStart} className="flex-1 min-w-[10px]">
                      <div
                        title={`${label} • ${formatINR(p.revenue)}`}
                        className="w-full rounded-md bg-linear-to-t from-rose-500/40 to-orange-500/20 border border-rose-500/20"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-200">Service mix</h2>
              <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700">{formatINR(revenueTotal)}</Badge>
            </div>

            <div className="space-y-4">
              {serviceMix.map((s) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">{s.key}</span>
                    <span className="text-zinc-500">
                      {formatINR(s.value)} • {Math.round(s.pct)}%
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-600" style={{ width: `${Math.max(1, s.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Project finance table */}
      <Card className="p-0 bg-zinc-900/50 border-zinc-800 overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200">Project P&amp;L</h2>
            <p className="text-sm text-zinc-500 mt-1">Revenue vs milestone payout projections per project.</p>
          </div>
          <Link href="/projects" className="text-sm text-rose-400 hover:text-rose-300">
            View projects
          </Link>
        </div>

        {filteredRows === undefined ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-zinc-500">No projects found for the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-zinc-950/40">
                <tr className="text-left text-zinc-400">
                  <th className="px-6 py-3 font-medium">Project</th>
                  <th className="px-6 py-3 font-medium">Service</th>
                  <th className="px-6 py-3 font-medium">Order date</th>
                  <th className="px-6 py-3 font-medium">Revenue</th>
                  <th className="px-6 py-3 font-medium">Approved cost</th>
                  <th className="px-6 py-3 font-medium">Expected cost</th>
                  <th className="px-6 py-3 font-medium">Remaining</th>
                  <th className="px-6 py-3 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredRows.map((r) => (
                  <tr key={r.projectId} className="hover:bg-zinc-950/30">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <Link href={`/projects/${r.slug}`} className="text-zinc-200 hover:text-white font-medium">
                          {r.projectName}
                        </Link>
                        <span className="text-xs text-zinc-500">{r.pmName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-zinc-300">{r.serviceType}</td>
                    <td className="px-6 py-3 text-zinc-400">{new Date(r.orderCreatedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-zinc-100 font-semibold">{formatINR(r.revenue)}</td>
                    <td className="px-6 py-3 text-zinc-300">{formatINR(r.approvedCost)}</td>
                    <td className="px-6 py-3 text-zinc-300">{formatINR(r.expectedCost)}</td>
                    <td className="px-6 py-3 text-zinc-300">{formatINR(r.remainingLiability)}</td>
                    <td className="px-6 py-3">
                      <span className={r.margin >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                        {formatINR(r.margin)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

