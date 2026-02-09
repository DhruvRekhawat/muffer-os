"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Plus } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Tier = "JUNIOR" | "STANDARD" | "SENIOR" | "ELITE";

interface TierRate {
  _id: Id<"tierRates">;
  tier: Tier;
  ratePerMin: number;
  rushEligible?: boolean;
  isActive: boolean;
}

export default function TierRatesPage() {
  const { isSuperAdmin } = usePermissions();
  const tierRates = useQuery(api.config.getAllTierRates);
  const upsertTierRate = useMutation(api.config.upsertTierRate);

  const [editing, setEditing] = useState<Record<string, Partial<TierRate>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const handleEdit = (tier: Tier, tierRate?: TierRate) => {
    if (tierRate) {
      setEditing({
        ...editing,
        [tierRate._id]: {
          ratePerMin: tierRate.ratePerMin,
          rushEligible: tierRate.rushEligible,
          isActive: tierRate.isActive,
        },
      });
    } else {
      // Create new tier rate - use a temporary key based on tier name
      setEditing({
        ...editing,
        [`new-${tier}`]: {
          ratePerMin: 0,
          rushEligible: false,
          isActive: true,
        },
      });
    }
  };

  const handleCancel = (id: Id<"tierRates"> | string) => {
    const newEditing = { ...editing };
    delete newEditing[id];
    setEditing(newEditing);
  };

  const handleSave = async (tier: Tier, tierRate?: TierRate) => {
    const editKey = tierRate?._id ?? `new-${tier}`;
    const edited = editing[editKey];
    if (!edited) return;

    setSaving(editKey);
    setError(null);
    setSuccess(null);

    try {
      await upsertTierRate({
        tier: tier,
        ratePerMin: edited.ratePerMin ?? tierRate?.ratePerMin ?? 0,
        rushEligible: edited.rushEligible ?? tierRate?.rushEligible ?? false,
        isActive: edited.isActive ?? tierRate?.isActive ?? true,
      });

      handleCancel(editKey);
      setSuccess(`Tier rate for ${tier} ${tierRate ? 'updated' : 'created'} successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tier rate");
    } finally {
      setSaving(null);
    }
  };

  const handleInputChange = (
    id: Id<"tierRates"> | string,
    field: keyof TierRate,
    value: number | boolean
  ) => {
    setEditing({
      ...editing,
      [id]: {
        ...editing[id],
        [field]: value,
      },
    });
  };

  const defaultTiers: Tier[] = ["JUNIOR", "STANDARD", "SENIOR", "ELITE"];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-zinc-200">Editor Tier Rates</h2>
        <p className="text-zinc-400 mt-1 text-sm">Configure rates per minute for each editor tier</p>
      </div>

      {/* Success/Error messages */}
      {success && (
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <p className="text-sm text-emerald-400">{success}</p>
        </Card>
      )}
      {error && (
        <Card className="p-4 bg-red-500/10 border-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {/* Tier Rates List */}
      {tierRates === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {defaultTiers.map((tier) => {
            const tierRate = tierRates.find((tr) => tr.tier === tier);
            const editKey = tierRate?._id ?? `new-${tier}`;
            const isEditing = editing[editKey] !== undefined;
            const edited = editing[editKey];

            return (
              <Card key={tier} className="p-6 bg-zinc-900/50 border-zinc-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-200">{tier}</h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        {tierRate?.isActive ? (
                          <span className="text-emerald-400">Active</span>
                        ) : tierRate ? (
                          <span className="text-zinc-600">Inactive</span>
                        ) : (
                          <span className="text-zinc-600">Not configured</span>
                        )}
                      </p>
                    </div>

                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-zinc-300">Rate per minute (₹)</Label>
                          <Input
                            type="number"
                            value={edited?.ratePerMin ?? tierRate?.ratePerMin ?? 0}
                            onChange={(e) =>
                              handleInputChange(
                                editKey,
                                "ratePerMin",
                                Number(e.target.value)
                              )
                            }
                            className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-200"
                            min="0"
                            step="1"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`rush-${tier}`}
                            checked={edited?.rushEligible ?? tierRate?.rushEligible ?? false}
                            onCheckedChange={(checked) =>
                              handleInputChange(
                                editKey,
                                "rushEligible",
                                checked === true
                              )
                            }
                            className="border-zinc-700"
                          />
                          <Label
                            htmlFor={`rush-${tier}`}
                            className="text-zinc-300 cursor-pointer"
                          >
                            Rush eligible
                          </Label>
                        </div>

                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`active-${tier}`}
                            checked={edited?.isActive ?? tierRate?.isActive ?? true}
                            onCheckedChange={(checked) =>
                              handleInputChange(
                                editKey,
                                "isActive",
                                checked === true
                              )
                            }
                            className="border-zinc-700"
                          />
                          <Label
                            htmlFor={`active-${tier}`}
                            className="text-zinc-300 cursor-pointer"
                          >
                            Active
                          </Label>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(tier, tierRate)}
                            disabled={saving === editKey}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {saving === editKey ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            {tierRate ? "Save" : "Create"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(editKey)}
                            disabled={saving === editKey}
                            className="border-zinc-700 text-zinc-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-zinc-500">Rate per minute</p>
                          <p className="text-lg font-semibold text-zinc-200">
                            ₹{tierRate?.ratePerMin ?? 0}/min
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <p className="text-zinc-500">
                            Rush eligible:{" "}
                            <span className={tierRate?.rushEligible ? "text-emerald-400" : "text-zinc-600"}>
                              {tierRate?.rushEligible ? "Yes" : "No"}
                            </span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(tier, tierRate)}
                          className="mt-2 border-zinc-700 text-zinc-300"
                        >
                          {tierRate ? (
                            <>
                              Edit
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Configure
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <Card className="p-4 bg-zinc-900/50 border-zinc-800">
        <p className="text-sm text-zinc-400">
          <strong className="text-zinc-300">Note:</strong> Tier rates determine how much editors are paid per billable minute. 
          Changes will affect future projects only. Rush eligible tiers can work on rush projects.
        </p>
      </Card>
    </div>
  );
}
