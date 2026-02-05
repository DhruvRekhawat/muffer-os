"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  LayoutGrid,
  List,
  Plus,
  X,
  Sparkles,
  Search,
} from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

interface StartProjectPageProps {
  params: Promise<{ orderId: string }>;
}

type Milestone = {
  title: string;
  description?: string;
  payoutAmount: number;
  order: number;
};

type MilestoneMode = "none" | "create";

export default function StartProjectPage({ params }: StartProjectPageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Budget & Milestones
  const [budget, setBudget] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [milestoneMode, setMilestoneMode] = useState<MilestoneMode>("none");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Step 2: People
  const [pmId, setPmId] = useState<Id<"users"> | null>(null);
  const [editorIds, setEditorIds] = useState<Id<"users">[]>([]);
  const [pmViewMode, setPmViewMode] = useState<"grid" | "table">("grid");
  const [editorViewMode, setEditorViewMode] = useState<"grid" | "table">("grid");
  const [pmSearchQuery, setPmSearchQuery] = useState("");
  const [editorSearchQuery, setEditorSearchQuery] = useState("");

  // General
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const order = useQuery(api.orders.getOrder, { orderId: orderId as Id<"orders"> });
  const templates = useQuery(api.milestoneTemplates.listTemplates);
  const pmsWithCount = useQuery(api.users.getPMsWithProjectCount);
  const editorsWithCount = useQuery(api.users.getEditorsWithProjectCount);
  const createProject = useMutation(api.projects.createProjectFromOrderAdmin);

  const defaultBudgetStr = order ? String(Math.floor(order.totalPrice * 0.7)) : "";
  const effectiveBudget = budget || defaultBudgetStr;

  function computeDistributedMilestones(ms: Milestone[], budgetStr: string): Milestone[] {
    if (ms.length === 0 || !budgetStr) return ms;
    const totalBudget = parseFloat(budgetStr);
    if (Number.isNaN(totalBudget)) return ms;
    const perMilestone = Math.floor(totalBudget / ms.length);
    const remainder = totalBudget - perMilestone * ms.length;
    return ms.map((m, idx) => ({
      ...m,
      payoutAmount: idx === 0 ? perMilestone + remainder : perMilestone,
    }));
  }

  const handleBudgetChange = (value: string) => {
    setBudget(value);
    setMilestones((prev) => computeDistributedMilestones(prev, value || defaultBudgetStr));
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find((t) => t._id === templateId);
    if (template) {
      const next = template.milestones.map((m, idx) => ({ ...m, order: idx + 1 }));
      setMilestones(computeDistributedMilestones(next, effectiveBudget));
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to start projects.</p>
      </div>
    );
  }

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-zinc-300">Order not found</h2>
        <Link href="/orders" className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 mt-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!effectiveBudget || parseFloat(effectiveBudget) <= 0) {
        setError("Budget must be greater than 0");
        return;
      }
      setError("");
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!pmId) {
        setError("Please select a Project Manager");
        return;
      }
      setError("");
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError("");
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await createProject({
        orderId: order._id,
        budget: parseFloat(effectiveBudget),
        dueDate: deadline ? new Date(deadline).getTime() : undefined,
        pmId: pmId!,
        editorIds,
        milestones: milestones.map(m => ({
          title: m.title,
          description: m.description,
          payoutAmount: m.payoutAmount,
          order: m.order,
        })),
      });

      router.push(`/projects/${result.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setIsLoading(false);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, {
      title: "",
      description: "",
      payoutAmount: 0,
      order: milestones.length + 1,
    }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index).map((m, idx) => ({
      ...m,
      order: idx + 1,
    })));
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: string | number) => {
    setMilestones(milestones.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
  };

  const selectedPM = pmsWithCount?.find(p => p._id === pmId);
  const selectedEditors = editorsWithCount?.filter(e => editorIds.includes(e._id));

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link href="/orders" className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">Start Project from Order</h1>
        <p className="text-zinc-400 mt-1">Set up project details and assign team members</p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                currentStep === step
                  ? "bg-rose-500 border-rose-500 text-white"
                  : currentStep > step
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500"
              }`}>
                {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : <span>{step}</span>}
              </div>
              <span className={`text-xs mt-2 ${currentStep >= step ? "text-zinc-300" : "text-zinc-600"}`}>
                {step === 1 ? "Budget & Milestones" : step === 2 ? "Choose People" : "Overview"}
              </span>
            </div>
            {step < 3 && (
              <div className={`h-0.5 flex-1 mx-2 ${currentStep > step ? "bg-emerald-500" : "bg-zinc-800"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Step 1: Budget & Milestones */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Step 1: Budget & Milestones</h2>

            {/* Budget Section */}
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label className="text-zinc-300">Project Budget (₹)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    value={effectiveBudget}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                    required
                    min="0"
                  />
                  <span className="text-sm text-zinc-500">70% of ₹{order.totalPrice.toLocaleString()}</span>
                </div>
                <p className="text-xs text-zinc-500">Default is 70% of order value. You can edit this.</p>
              </div>

              {/* Deadline Section */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Project Deadline</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            {/* Milestones Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Project Milestones (Optional)</Label>
              </div>

              <div className="flex gap-3 mb-4">
                <Button
                  type="button"
                  variant={milestoneMode === "none" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMilestoneMode("none");
                    setMilestones([]);
                    setSelectedTemplateId("");
                  }}
                  className={milestoneMode === "none" ? "bg-zinc-700" : ""}
                >
                  No Milestones
                </Button>
                <Button
                  type="button"
                  variant={milestoneMode === "create" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMilestoneMode("create");
                    if (milestones.length === 0) addMilestone();
                  }}
                  className={milestoneMode === "create" ? "bg-zinc-700" : ""}
                >
                  Create
                </Button>
              </div>

              {milestoneMode === "create" && (
                <div className="space-y-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-zinc-400">Load from Template (Optional)</Label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100">
                        <SelectValue placeholder="Select a template to autofill" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template._id} value={template._id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-zinc-500">Template will autofill the form. You can edit any fields.</p>
                  </div>
                </div>
              )}

              {milestoneMode === "create" && milestones.length > 0 && (
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <Card key={index} className="p-4 bg-zinc-800/50 border-zinc-700">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm text-zinc-400">Milestone {milestone.order}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                          className="h-6 w-6 p-0 text-zinc-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <Input
                          placeholder="Milestone title"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(index, "title", e.target.value)}
                          className="bg-zinc-700/50 border-zinc-600 text-zinc-100"
                          required
                        />
                        <Textarea
                          placeholder="Description (optional)"
                          value={milestone.description || ""}
                          onChange={(e) => updateMilestone(index, "description", e.target.value)}
                          className="bg-zinc-700/50 border-zinc-600 text-zinc-100"
                          rows={2}
                        />
                        <Input
                          type="number"
                          placeholder="Payout amount (₹)"
                          value={milestone.payoutAmount || ""}
                          onChange={(e) => updateMilestone(index, "payoutAmount", parseFloat(e.target.value) || 0)}
                          className="bg-zinc-700/50 border-zinc-600 text-zinc-100"
                          min="0"
                        />
                      </div>
                    </Card>
                  ))}
                  {milestoneMode === "create" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addMilestone}
                      className="w-full border-zinc-700 text-zinc-400"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Milestone
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-3">
            <Link href="/orders" className="flex-1">
              <Button type="button" variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Cancel
              </Button>
            </Link>
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Choose People */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Step 2: Choose People</h2>

            {/* PM Selection */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Project Manager (Required)</Label>
                <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPmViewMode("grid")}
                    className={pmViewMode === "grid" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPmViewMode("table")}
                    className={pmViewMode === "table" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* PM Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by name..."
                  value={pmSearchQuery}
                  onChange={(e) => setPmSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-zinc-100"
                />
              </div>

              {(() => {
                const filteredPMs = pmsWithCount?.filter(pm => 
                  pm.name.toLowerCase().includes(pmSearchQuery.toLowerCase())
                ) || [];

                return pmViewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredPMs.map((pm) => (
                    <button
                      key={pm._id}
                      type="button"
                      onClick={() => setPmId(pm._id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        pmId === pm._id
                          ? "bg-zinc-800 border-rose-500"
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 text-sm font-medium">
                          {pm.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-zinc-200">{pm.name}</h3>
                          <p className="text-xs text-zinc-500">{pm.projectCount} projects</p>
                        </div>
                        {pmId === pm._id && <CheckCircle2 className="w-5 h-5 text-rose-400" />}
                      </div>
                    </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPMs.map((pm) => (
                    <button
                      key={pm._id}
                      type="button"
                      onClick={() => setPmId(pm._id)}
                      className={`w-full p-4 rounded-lg border flex items-center gap-4 transition-all ${
                        pmId === pm._id
                          ? "bg-zinc-800 border-rose-500"
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 text-sm font-medium">
                        {pm.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-zinc-200">{pm.name}</h3>
                        <p className="text-xs text-zinc-500">{pm.projectCount} projects</p>
                      </div>
                      {pmId === pm._id && <CheckCircle2 className="w-5 h-5 text-rose-400" />}
                    </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Editor Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Editors (Optional)</Label>
                <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditorViewMode("grid")}
                    className={editorViewMode === "grid" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditorViewMode("table")}
                    className={editorViewMode === "table" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Editor Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by name..."
                  value={editorSearchQuery}
                  onChange={(e) => setEditorSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-zinc-100"
                />
              </div>

              {(() => {
                const filteredEditors = editorsWithCount?.filter(editor => 
                  editor.name.toLowerCase().includes(editorSearchQuery.toLowerCase())
                ) || [];

                return editorViewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredEditors.map((editor) => {
                    const isSelected = editorIds.includes(editor._id);
                    return (
                      <button
                        key={editor._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditorIds(editorIds.filter(id => id !== editor._id));
                          } else {
                            setEditorIds([...editorIds, editor._id]);
                          }
                        }}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-zinc-800 border-rose-500"
                            : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 text-sm font-medium">
                            {editor.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-zinc-200">{editor.name}</h3>
                            <p className="text-xs text-zinc-500">{editor.projectCount} projects</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-rose-400" />}
                        </div>
                      </button>
                    );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEditors.map((editor) => {
                    const isSelected = editorIds.includes(editor._id);
                    return (
                      <button
                        key={editor._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditorIds(editorIds.filter(id => id !== editor._id));
                          } else {
                            setEditorIds([...editorIds, editor._id]);
                          }
                        }}
                        className={`w-full p-4 rounded-lg border flex items-center gap-4 transition-all ${
                          isSelected
                            ? "bg-zinc-800 border-rose-500"
                            : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 text-sm font-medium">
                          {editor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-zinc-200">{editor.name}</h3>
                          <p className="text-xs text-zinc-500">{editor.projectCount} projects</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-rose-400" />}
                      </button>
                    );
                    })}
                  </div>
                );
              })()}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!pmId}
              className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white disabled:opacity-50"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Overview & Kickstart */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card className="p-6 bg-zinc-900/50 border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Step 3: Overview & Kickstart</h2>

            <div className="space-y-6">
              {/* Order Details */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Order Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Client:</span>
                    <span className="text-zinc-200">{order.clientName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Service:</span>
                    <span className="text-zinc-200">{order.serviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Order Value:</span>
                    <span className="text-zinc-200">₹{order.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Project Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Budget:</span>
                    <span className="text-zinc-200">₹{parseFloat(budget || "0").toLocaleString()}</span>
                  </div>
                  {deadline && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Deadline:</span>
                      <span className="text-zinc-200">{new Date(deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Milestones:</span>
                    <span className="text-zinc-200">{milestones.length}</span>
                  </div>
                </div>
              </div>

              {/* Team */}
              <div>
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Team</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-2">Project Manager</p>
                    {selectedPM && (
                      <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 text-sm font-medium">
                          {selectedPM.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-zinc-200 font-medium">{selectedPM.name}</p>
                          <p className="text-xs text-zinc-500">{selectedPM.projectCount} projects</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedEditors && selectedEditors.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Editors ({selectedEditors.length})</p>
                      <div className="space-y-2">
                        {selectedEditors.map((editor) => (
                          <div key={editor._id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 text-sm font-medium">
                              {editor.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-zinc-200 font-medium">{editor.name}</p>
                              <p className="text-xs text-zinc-500">{editor.projectCount} projects</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Milestones */}
              {milestones.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Milestones</h3>
                  <div className="space-y-2">
                    {milestones.map((milestone, idx) => (
                      <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-zinc-200 font-medium">{milestone.order}. {milestone.title}</p>
                            {milestone.description && (
                              <p className="text-xs text-zinc-500 mt-1">{milestone.description}</p>
                            )}
                          </div>
                          <span className="text-zinc-400 text-sm">₹{milestone.payoutAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Kickstart Project
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
