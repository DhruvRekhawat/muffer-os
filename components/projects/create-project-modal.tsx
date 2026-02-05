"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth, usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronLeft, ChevronRight, Sparkles, Loader2, Scissors, Video, Megaphone } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { BackgroundPicker } from "@/components/ui/background-picker";

const SERVICE_OPTIONS: { id: "EditMax" | "ContentMax" | "AdMax" | "Other"; label: string; desc: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "EditMax", label: "EditMax", desc: "Video editing", Icon: Scissors },
  { id: "ContentMax", label: "ContentMax", desc: "Full content", Icon: Video },
  { id: "AdMax", label: "AdMax", desc: "Ad creatives", Icon: Megaphone },
  { id: "Other", label: "Other", desc: "Custom project", Icon: Sparkles },
];

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (slug: string) => void;
}

export function CreateProjectModal({ open, onClose, onSuccess }: CreateProjectModalProps) {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [formStep, setFormStep] = useState(1);
  const [manualError, setManualError] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [selectedPmId, setSelectedPmId] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    if (user?.role === "PM" && user._id) {
      setSelectedPmId(user._id);
    } else if (user?.role === "SUPER_ADMIN") {
      setSelectedPmId(null);
    }
  }, [user?.role, user?._id]);

  const [orderForm, setOrderForm] = useState({
    clientName: "",
    clientEmail: "",
    serviceType: "EditMax" as "EditMax" | "ContentMax" | "AdMax" | "Other",
    planDetails: "",
    brief: "",
    totalPrice: "",
  });

  const [projectForm, setProjectForm] = useState({
    projectName: "",
    emoji: "🎬",
    background: "",
    skuCode: "",
    billableMinutes: "",
    difficultyFactor: "1.0",
    editorCapAmount: "",
    deadlineAt: "",
  });

  const [selectedEditors, setSelectedEditors] = useState<Set<Id<"users">>>(new Set());

  const editors = useQuery(api.users.getEditorsWithProjectCount, open ? {} : "skip");
  const pmsWithCount = useQuery(api.users.getPMsWithProjectCount, open ? {} : "skip");
  const skus = useQuery(api.config.listSkus, open ? {} : "skip");
  const createOrderAndProject = useMutation(api.projects.createOrderAndProject);

  const handleNext = () => {
    setManualError("");
    if (formStep === 1) {
      const price = parseFloat(orderForm.totalPrice);
      if (!orderForm.planDetails.trim()) {
        setManualError("Plan details are required");
        return;
      }
      if (!orderForm.brief.trim()) {
        setManualError("Brief is required");
        return;
      }
      if (isNaN(price) || price <= 0) {
        setManualError("Enter a valid total price");
        return;
      }
      setFormStep(2);
    } else if (formStep === 2) {
      if (!projectForm.projectName.trim()) {
        setManualError("Project name is required");
        return;
      }
      if (isSuperAdmin && !selectedPmId) {
        setManualError("Please select a project manager");
        return;
      }
      setFormStep(3);
    }
  };

  const handleBack = () => {
    setManualError("");
    setFormStep(formStep - 1);
  };

  const handleSubmit = async () => {
    setManualError("");
    const pmId = isSuperAdmin ? selectedPmId : user?._id;
    if (!pmId) {
      setManualError(isSuperAdmin ? "Please select a project manager" : "Unable to determine project manager");
      return;
    }
    if (selectedEditors.size === 0) {
      setManualError("Please select at least one editor to invite");
      return;
    }
    setManualSubmitting(true);
    try {
      const price = parseFloat(orderForm.totalPrice);
      const { slug } = await createOrderAndProject({
        clientName: orderForm.clientName.trim() || undefined,
        clientEmail: orderForm.clientEmail.trim() || undefined,
        serviceType: orderForm.serviceType,
        planDetails: orderForm.planDetails.trim(),
        brief: orderForm.brief.trim(),
        totalPrice: price,
        projectName: projectForm.projectName.trim(),
        emoji: projectForm.emoji || "🎬",
        skuCode: projectForm.skuCode || undefined,
        billableMinutes: projectForm.billableMinutes ? parseFloat(projectForm.billableMinutes) : undefined,
        difficultyFactor: projectForm.difficultyFactor ? parseFloat(projectForm.difficultyFactor) : undefined,
        editorCapAmount: projectForm.editorCapAmount ? parseFloat(projectForm.editorCapAmount) : undefined,
        deadlineAt: projectForm.deadlineAt ? new Date(projectForm.deadlineAt).getTime() : undefined,
        background: projectForm.background || undefined,
        editorIds: Array.from(selectedEditors),
        pmId,
      });
      setOrderForm({ clientName: "", clientEmail: "", serviceType: "EditMax", planDetails: "", brief: "", totalPrice: "" });
      setProjectForm({ projectName: "", emoji: "🎬", background: "", skuCode: "", billableMinutes: "", difficultyFactor: "1.0", editorCapAmount: "", deadlineAt: "" });
      setSelectedEditors(new Set());
      setSelectedPmId(user?.role === "PM" ? user._id : null);
      setFormStep(1);
      onClose();
      onSuccess(slug);
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleSkuChange = (skuCode: string) => {
    setProjectForm((f) => ({ ...f, skuCode }));
    if (skuCode === "__manual__") {
      setProjectForm((f) => ({ ...f, skuCode: "", billableMinutes: "", editorCapAmount: "" }));
      return;
    }
    if (skuCode && skus) {
      const selectedSku = skus.find((s) => s.skuCode === skuCode);
      const price = parseFloat(orderForm.totalPrice) || 0;
      if (selectedSku && price > 0) {
        setProjectForm((f) => ({
          ...f,
          billableMinutes: selectedSku.billableMinutesBase.toString(),
          difficultyFactor: selectedSku.difficultyFactorDefault.toString(),
          editorCapAmount: Math.round(price * selectedSku.editorBudgetPct).toString(),
        }));
      }
    }
  };

  const toggleEditor = (editorId: Id<"users">) => {
    const newSet = new Set(selectedEditors);
    if (newSet.has(editorId)) newSet.delete(editorId);
    else newSet.add(editorId);
    setSelectedEditors(newSet);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !manualSubmitting && onClose()} />
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 shadow-xl">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {formStep === 1 && "Order Details"}
                {formStep === 2 && "Project Configuration"}
                {formStep === 3 && "Invite Editors"}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">Step {formStep} of 3</p>
            </div>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200" onClick={() => !manualSubmitting && onClose()} disabled={manualSubmitting}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`h-1 flex-1 rounded-full transition-colors ${step <= formStep ? "bg-rose-500" : "bg-zinc-700"}`} />
            ))}
          </div>
          {manualError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{manualError}</div>
          )}

          {formStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Client name (optional)</Label>
                  <Input value={orderForm.clientName} onChange={(e) => setOrderForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="John Doe" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Client email (optional)</Label>
                  <Input type="email" value={orderForm.clientEmail} onChange={(e) => setOrderForm((f) => ({ ...f, clientEmail: e.target.value }))} placeholder="john@example.com" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Service type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {SERVICE_OPTIONS.map(({ id, label, desc, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOrderForm((f) => ({ ...f, serviceType: id }))}
                      className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        orderForm.serviceType === id
                          ? "bg-rose-500/10 border-rose-500/50"
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-zinc-300" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-200">{label}</p>
                        <p className="text-xs text-zinc-500">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Plan details *</Label>
                <Input value={orderForm.planDetails} onChange={(e) => setOrderForm((f) => ({ ...f, planDetails: e.target.value }))} placeholder="e.g. Standard Plan, 5 videos" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Brief *</Label>
                <Textarea value={orderForm.brief} onChange={(e) => setOrderForm((f) => ({ ...f, brief: e.target.value }))} placeholder="Project description..." className="bg-zinc-800/50 border-zinc-700 text-zinc-100 min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Total price (₹) *</Label>
                <Input type="number" min="0" step="1" value={orderForm.totalPrice} onChange={(e) => setOrderForm((f) => ({ ...f, totalPrice: e.target.value }))} placeholder="0" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl hover:bg-zinc-700 transition-colors"
                  onClick={() => {
                    const emojis = ["🎬", "🎥", "📹", "🎞️", "📽️", "🎦", "🎭", "🎪", "✨", "🚀"];
                    setProjectForm((f) => ({ ...f, emoji: emojis[Math.floor(Math.random() * emojis.length)] }));
                  }}
                >
                  {projectForm.emoji}
                </button>
                <div className="flex-1 space-y-2">
                  <Label className="text-zinc-300">Project name *</Label>
                  <Input value={projectForm.projectName} onChange={(e) => setProjectForm((f) => ({ ...f, projectName: e.target.value }))} placeholder="e.g., Brand Campaign Q4" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Cover / background</Label>
                <BackgroundPicker value={projectForm.background || null} onChange={(v) => setProjectForm((f) => ({ ...f, background: v }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Project Manager *</Label>
                {isSuperAdmin ? (
                  <Select value={selectedPmId ?? ""} onValueChange={(v) => setSelectedPmId(v as Id<"users">)}>
                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100">
                      <SelectValue placeholder="Select project manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {pmsWithCount?.map((pm) => (
                        <SelectItem key={pm._id} value={pm._id}>
                          {pm.name} • {pm.projectCount} projects
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-zinc-300 py-2">You (Project Manager)</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">SKU (optional)</Label>
                <Select value={projectForm.skuCode || "__manual__"} onValueChange={handleSkuChange}>
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100">
                    <SelectValue placeholder="Select SKU or manual entry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">None (Manual Entry)</SelectItem>
                    {skus?.map((sku) => (
                      <SelectItem key={sku.skuCode} value={sku.skuCode}>
                        {sku.name} ({sku.skuCode}) - {sku.billableMinutesBase} BM
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Billable minutes</Label>
                  <Input type="number" step="0.1" value={projectForm.billableMinutes} onChange={(e) => setProjectForm((f) => ({ ...f, billableMinutes: e.target.value }))} placeholder="1.5" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Difficulty factor</Label>
                  <Input type="number" step="0.1" value={projectForm.difficultyFactor} onChange={(e) => setProjectForm((f) => ({ ...f, difficultyFactor: e.target.value }))} placeholder="1.0" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Editor budget cap (₹)</Label>
                <Input type="number" value={projectForm.editorCapAmount} onChange={(e) => setProjectForm((f) => ({ ...f, editorCapAmount: e.target.value }))} placeholder="Auto from SKU or manual" className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Deadline (optional)</Label>
                <Input type="date" value={projectForm.deadlineAt} onChange={(e) => setProjectForm((f) => ({ ...f, deadlineAt: e.target.value }))} className="bg-zinc-800/50 border-zinc-700 text-zinc-100" />
              </div>
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-4">
              <Label className="text-zinc-300">Select editors to invite ({selectedEditors.size} selected)</Label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {editors?.map((editor) => (
                  <Card key={editor._id} className={`p-4 cursor-pointer transition-colors ${selectedEditors.has(editor._id) ? "bg-rose-500/10 border-rose-500/30" : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"}`} onClick={() => toggleEditor(editor._id)}>
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedEditors.has(editor._id)} onCheckedChange={() => toggleEditor(editor._id)} className="border-zinc-600" />
                      <div className="flex-1">
                        <p className="font-medium text-zinc-200">{editor.name}</p>
                        <p className="text-sm text-zinc-500">{editor.tier || "STANDARD"} • {editor.projectCount || 0}/3 active</p>
                      </div>
                      {projectForm.billableMinutes && (
                        <div className="text-right">
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            {(() => {
                              const rate = editor.tierRatePerMin ?? 500;
                              const base = parseFloat(projectForm.billableMinutes) * rate;
                              const minGross = base * 0.85 * 0.95;
                              const maxGross = base * 1.00 * 1.05;
                              const cap = projectForm.editorCapAmount ? parseFloat(projectForm.editorCapAmount) : base * 2;
                              const min = Math.min(minGross, cap);
                              const max = Math.min(maxGross, cap);
                              return `₹${Math.round(min)} - ₹${Math.round(max)}`;
                            })()}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                {(!editors || editors.length === 0) && <p className="text-center text-zinc-500 py-8">No active editors available</p>}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-zinc-800">
            {formStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={manualSubmitting} className="border-zinc-700 text-zinc-300">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={manualSubmitting} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <div className="flex-1" />
            {formStep < 3 ? (
              <Button onClick={handleNext} disabled={manualSubmitting} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={manualSubmitting || selectedEditors.size === 0} className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
                {manualSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" />Create Project</>}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
