"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Loader2, 
  Plus,
  X,
  Trash2,
  FileText,
} from "lucide-react";

type Milestone = {
  title: string;
  description?: string;
  payoutAmount: number;
  order: number;
};

export default function TemplatesPage() {
  const { isSuperAdmin } = usePermissions();
  
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [error, setError] = useState("");
  
  const templates = useQuery(api.milestoneTemplates.listTemplates);
  const createTemplate = useMutation(api.milestoneTemplates.createTemplate);
  const deleteTemplate = useMutation(api.milestoneTemplates.deleteTemplate);
  
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }
  
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!templateName.trim()) {
      setError("Template name is required");
      return;
    }
    
    if (milestones.length === 0) {
      setError("At least one milestone is required");
      return;
    }
    
    for (const milestone of milestones) {
      if (!milestone.title.trim()) {
        setError("All milestones must have a title");
        return;
      }
      if (milestone.payoutAmount <= 0) {
        setError("All milestones must have a payout amount greater than 0");
        return;
      }
    }
    
    setIsCreating(true);
    try {
      await createTemplate({
        name: templateName,
        milestones: milestones.map((m, idx) => ({
          title: m.title,
          description: m.description,
          payoutAmount: m.payoutAmount,
          order: idx + 1,
        })),
      });
      
      // Reset form
      setTemplateName("");
      setMilestones([]);
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
      setIsCreating(false);
    }
  };
  
  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      await deleteTemplate({ templateId: templateId as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-200">Milestone Templates</h2>
        <p className="text-zinc-400 mt-1 text-sm">Create and manage milestone templates for projects</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      
      {/* Create Template Form */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800 mb-8">
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Create New Template</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="templateName" className="text-zinc-300">Template Name</Label>
            <Input
              id="templateName"
              type="text"
              placeholder="e.g., Standard Video Editing"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              required
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Milestones</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMilestone}
                className="border-zinc-700 text-zinc-400"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            </div>
            
            {milestones.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-4">
                No milestones added yet. Click &quot;Add Milestone&quot; to start.
              </p>
            )}
            
            {milestones.map((milestone, index) => (
              <Card key={index} className="p-4 bg-zinc-800/50 border-zinc-700">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm text-zinc-400">Milestone {milestone.order}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMilestone(index)}
                    className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
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
                    required
                  />
                </div>
              </Card>
            ))}
          </div>
          
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isCreating || milestones.length === 0}
              className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
      
      {/* Existing Templates */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200">Existing Templates</h2>
        
        {templates === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-8 bg-zinc-900/50 border-zinc-800 text-center">
            <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No templates yet</h3>
            <p className="text-zinc-500">Create your first milestone template above</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <Card key={template._id} className="p-4 bg-zinc-900/50 border-zinc-800">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-zinc-200 mb-1">{template.name}</h3>
                    <p className="text-sm text-zinc-500">
                      {template.milestones.length} milestone{template.milestones.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(template._id)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {template.milestones.map((milestone, idx) => (
                    <div key={idx} className="p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-200">
                            {milestone.order}. {milestone.title}
                          </p>
                          {milestone.description && (
                            <p className="text-xs text-zinc-500 mt-1">{milestone.description}</p>
                          )}
                        </div>
                        <span className="text-sm text-zinc-400">₹{milestone.payoutAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
