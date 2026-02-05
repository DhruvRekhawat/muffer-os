"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export default function SkuCatalogPage() {
  const { canManageHiring } = usePermissions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<Id<"skuCatalog"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const skus = useQuery(api.config.getAllSkus, {});
  const upsertSku = useMutation(api.config.upsertSku);
  const toggleSkuActive = useMutation(api.config.toggleSkuActive);

  const [formData, setFormData] = useState({
    skuCode: "",
    name: "",
    serviceType: "EditMax" as "EditMax" | "ContentMax" | "AdMax" | "Other",
    billableMinutesBase: 1.0,
    difficultyFactorDefault: 1.0,
    editorBudgetPct: 0.35,
    incentivePoolPct: 0.05,
    isActive: true,
  });

  if (!canManageHiring) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  type SkuItem = NonNullable<typeof skus>[number];
  const handleOpenDialog = (sku?: SkuItem) => {
    if (sku) {
      setEditingSku(sku._id);
      setFormData({
        skuCode: sku.skuCode,
        name: sku.name,
        serviceType: sku.serviceType,
        billableMinutesBase: sku.billableMinutesBase,
        difficultyFactorDefault: sku.difficultyFactorDefault,
        editorBudgetPct: sku.editorBudgetPct,
        incentivePoolPct: sku.incentivePoolPct,
        isActive: sku.isActive,
      });
    } else {
      setEditingSku(null);
      setFormData({
        skuCode: "",
        name: "",
        serviceType: "EditMax",
        billableMinutesBase: 1.0,
        difficultyFactorDefault: 1.0,
        editorBudgetPct: 0.35,
        incentivePoolPct: 0.05,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.skuCode.trim() || !formData.name.trim()) {
      alert("SKU Code and Name are required");
      return;
    }

    setIsSaving(true);
    try {
      await upsertSku(formData);
      setIsDialogOpen(false);
      setEditingSku(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save SKU");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (skuCode: string) => {
    try {
      await toggleSkuActive({ skuCode });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to toggle SKU");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">SKU Catalog</h1>
          <p className="text-zinc-400 mt-1">Manage service types and billing configurations</p>
        </div>
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add SKU
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>{editingSku ? "Edit SKU" : "Add New SKU"}</AlertDialogTitle>
              <AlertDialogDescription>
                Configure billable minutes, budget percentages, and other settings for this service type.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="skuCode">SKU Code *</Label>
                  <Input
                    id="skuCode"
                    value={formData.skuCode}
                    onChange={(e) => setFormData({ ...formData, skuCode: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                    placeholder="UGC_STD_60"
                    disabled={!!editingSku}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="UGC Standard 60s"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="serviceType">Service Type</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value: "EditMax" | "ContentMax" | "AdMax" | "Other") =>
                    setFormData({ ...formData, serviceType: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EditMax">EditMax</SelectItem>
                    <SelectItem value="ContentMax">ContentMax</SelectItem>
                    <SelectItem value="AdMax">AdMax</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billableMinutesBase">Billable Minutes Base</Label>
                  <Input
                    id="billableMinutesBase"
                    type="number"
                    step="0.1"
                    value={formData.billableMinutesBase}
                    onChange={(e) => setFormData({ ...formData, billableMinutesBase: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="difficultyFactorDefault">Difficulty Factor Default</Label>
                  <Input
                    id="difficultyFactorDefault"
                    type="number"
                    step="0.1"
                    value={formData.difficultyFactorDefault}
                    onChange={(e) => setFormData({ ...formData, difficultyFactorDefault: parseFloat(e.target.value) || 1.0 })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editorBudgetPct">Editor Budget %</Label>
                  <Input
                    id="editorBudgetPct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.editorBudgetPct}
                    onChange={(e) => setFormData({ ...formData, editorBudgetPct: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    {(formData.editorBudgetPct * 100).toFixed(0)}% of project revenue
                  </p>
                </div>
                <div>
                  <Label htmlFor="incentivePoolPct">Incentive Pool %</Label>
                  <Input
                    id="incentivePoolPct"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={formData.incentivePoolPct}
                    onChange={(e) => setFormData({ ...formData, incentivePoolPct: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    {(formData.incentivePoolPct * 100).toFixed(0)}% of project revenue
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active (available for use)
                </Label>
              </div>
            </div>

            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  editingSku ? "Update" : "Create"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {skus === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : skus.length === 0 ? (
        <Card className="p-12 text-center bg-zinc-900/50 border-zinc-800">
          <p className="text-zinc-400">No SKUs configured yet.</p>
          <Button
            onClick={() => handleOpenDialog()}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add First SKU
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {skus.map((sku) => (
            <Card key={sku._id} className="p-4 bg-zinc-900/50 border-zinc-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-zinc-200">{sku.name}</h3>
                    <Badge
                      className={
                        sku.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                      }
                    >
                      {sku.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                      {sku.serviceType}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">Code: {sku.skuCode}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500">Billable Minutes</p>
                      <p className="font-semibold text-zinc-200">{sku.billableMinutesBase}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Difficulty Factor</p>
                      <p className="font-semibold text-zinc-200">{sku.difficultyFactorDefault}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Editor Budget</p>
                      <p className="font-semibold text-zinc-200">{(sku.editorBudgetPct * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Incentive Pool</p>
                      <p className="font-semibold text-zinc-200">{(sku.incentivePoolPct * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(sku.skuCode)}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    {sku.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(sku)}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
