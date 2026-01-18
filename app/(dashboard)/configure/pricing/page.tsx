"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  Tag,
  Percent,
  Sparkles,
} from "lucide-react";

type PricingConfig = NonNullable<typeof api.pricing.getAdminPricingConfig._returnType>;

type Plan = PricingConfig["plans"][number];
type Addon = Plan["addons"][number];
type Coupon = PricingConfig["couponCodes"][number];
type BulkDiscountRule = PricingConfig["bulkDiscountRules"][number];

function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToLines(arr: string[]): string {
  return (arr || []).join("\n");
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dateMsToInput(value?: number): string {
  if (!value) return "";
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inputToDateMs(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : undefined;
}

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
}

export default function PricingPage() {
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();

  const config = useQuery(api.pricing.getAdminPricingConfig);
  const upsert = useMutation(api.pricing.upsertPricingConfig);

  const [draft, setDraft] = useState<PricingConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (config && !draft) {
      setDraft(config);
    }
  }, [config, draft]);

  const allAddonIds = useMemo(() => {
    if (!draft) return [];
    const ids = new Set<string>();
    for (const plan of draft.plans) {
      for (const addon of plan.addons) ids.add(addon.id);
    }
    return Array.from(ids).sort();
  }, [draft]);

  const planIds = useMemo(() => {
    if (!draft) return [];
    return draft.plans.map((p) => p.id);
  }, [draft]);

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  if (config === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">No pricing config loaded.</p>
      </div>
    );
  }

  const updatePlan = (planId: string, updater: (p: Plan) => Plan) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map((p) => (p.id === planId ? updater(p) : p)),
      };
    });
  };

  const updateCoupon = (couponId: string, updater: (c: Coupon) => Coupon) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        couponCodes: prev.couponCodes.map((c) => (c.id === couponId ? updater(c) : c)),
      };
    });
  };

  const updateBulkRule = (index: number, updater: (r: BulkDiscountRule) => BulkDiscountRule) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bulkDiscountRules: prev.bulkDiscountRules.map((r, i) => (i === index ? updater(r) : r)),
      };
    });
  };

  const handleSave = async () => {
    setError("");
    setSuccess(null);
    setSaving(true);
    try {
      const res = await upsert({
        plans: draft.plans,
        couponCodes: draft.couponCodes,
        bulkDiscountRules: draft.bulkDiscountRules,
        addonCategories: draft.addonCategories,
      });

      setDraft((prev) =>
        prev
          ? {
              ...prev,
              version: res.version,
              updatedAt: res.updatedAt,
            }
          : prev
      );
      setSuccess("Saved pricing config.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pricing config");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 2500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100">Pricing</h1>
          <p className="text-zinc-400 mt-1">Configure base prices, add-ons, coupons, and bulk discounts.</p>
          <p className="text-xs text-zinc-500 mt-2">
            Version: {draft.version} • Last updated:{" "}
            {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : "Never"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.refresh()}
            className="border-zinc-700 text-zinc-400"
          >
            Refresh
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          {success}
        </div>
      )}

      {/* Addon categories */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Addon Categories (labels)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(draft.addonCategories).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label className="text-zinc-300">{key}</Label>
              <Input
                value={value}
                onChange={(e) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          addonCategories: { ...prev.addonCategories, [key]: e.target.value } as any,
                        }
                      : prev
                  )
                }
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200">Plans</h2>
        <div className="grid grid-cols-1 gap-4">
          {draft.plans.map((plan) => (
            <Card key={plan.id} className="p-6 bg-zinc-900/50 border-zinc-800 space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-zinc-200">{plan.name}</h3>
                  <p className="text-xs text-zinc-500">{plan.id} • Service: {plan.service}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Unit</Label>
                    <Select
                      value={plan.unit}
                      onValueChange={(value) =>
                        updatePlan(plan.id, (p) => ({ ...p, unit: value as any }))
                      }
                    >
                      <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">video</SelectItem>
                        <SelectItem value="ad">ad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Base price</Label>
                    <Input
                      type="number"
                      value={plan.price}
                      onChange={(e) =>
                        updatePlan(plan.id, (p) => ({ ...p, price: toNumber(e.target.value) }))
                      }
                      className="bg-zinc-800/50 border-zinc-700 text-zinc-100 w-[160px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Price / unit</Label>
                    <Input
                      type="number"
                      value={plan.pricePerUnit}
                      onChange={(e) =>
                        updatePlan(plan.id, (p) => ({
                          ...p,
                          pricePerUnit: toNumber(e.target.value),
                        }))
                      }
                      className="bg-zinc-800/50 border-zinc-700 text-zinc-100 w-[160px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Includes (one per line)</Label>
                  <Textarea
                    value={arrayToLines(plan.includes)}
                    onChange={(e) =>
                      updatePlan(plan.id, (p) => ({ ...p, includes: linesToArray(e.target.value) }))
                    }
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300">Features (one per line)</Label>
                  <Textarea
                    value={arrayToLines(plan.features)}
                    onChange={(e) =>
                      updatePlan(plan.id, (p) => ({ ...p, features: linesToArray(e.target.value) }))
                    }
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                    rows={6}
                  />
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              {/* Addons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-zinc-200">Add-ons</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updatePlan(plan.id, (p) => ({
                        ...p,
                        addons: [
                          ...p.addons,
                          {
                            id: newId(`addon-${p.service.toLowerCase()}`),
                            name: "New Addon",
                            price: 0,
                            category: "other",
                            description: "",
                          } as Addon,
                        ],
                      }))
                    }
                    className="border-zinc-700 text-zinc-400"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add add-on
                  </Button>
                </div>

                {plan.addons.length === 0 ? (
                  <p className="text-sm text-zinc-500">No add-ons.</p>
                ) : (
                  <div className="space-y-3">
                    {plan.addons.map((addon) => (
                      <Card key={addon.id} className="p-4 bg-zinc-800/40 border-zinc-700 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs text-zinc-500">{addon.id}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updatePlan(plan.id, (p) => ({
                                ...p,
                                addons: p.addons.filter((a) => a.id !== addon.id),
                              }))
                            }
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="space-y-2 md:col-span-2">
                            <Label className="text-zinc-300">Name</Label>
                            <Input
                              value={addon.name}
                              onChange={(e) =>
                                updatePlan(plan.id, (p) => ({
                                  ...p,
                                  addons: p.addons.map((a) =>
                                    a.id === addon.id ? { ...a, name: e.target.value } : a
                                  ),
                                }))
                              }
                              className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Price</Label>
                            <Input
                              type="number"
                              value={addon.price}
                              onChange={(e) =>
                                updatePlan(plan.id, (p) => ({
                                  ...p,
                                  addons: p.addons.map((a) =>
                                    a.id === addon.id ? { ...a, price: toNumber(e.target.value) } : a
                                  ),
                                }))
                              }
                              className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Category</Label>
                            <Select
                              value={addon.category}
                              onValueChange={(value) =>
                                updatePlan(plan.id, (p) => ({
                                  ...p,
                                  addons: p.addons.map((a) =>
                                    a.id === addon.id ? { ...a, category: value as any } : a
                                  ),
                                }))
                              }
                            >
                              <SelectTrigger className="bg-zinc-900/40 border-zinc-700 text-zinc-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="voice">voice</SelectItem>
                                <SelectItem value="graphics">graphics</SelectItem>
                                <SelectItem value="delivery">delivery</SelectItem>
                                <SelectItem value="format">format</SelectItem>
                                <SelectItem value="script">script</SelectItem>
                                <SelectItem value="other">other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-zinc-300">Description</Label>
                          <Input
                            value={addon.description || ""}
                            onChange={(e) =>
                              updatePlan(plan.id, (p) => ({
                                ...p,
                                addons: p.addons.map((a) =>
                                  a.id === addon.id ? { ...a, description: e.target.value } : a
                                ),
                              }))
                            }
                            className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Coupons */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-200">Coupons</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      couponCodes: [
                        ...prev.couponCodes,
                        {
                          id: newId("coupon"),
                          code: "NEWCODE",
                          type: "percentage",
                          value: 10,
                          active: true,
                          applicableServices: ["EditMax"],
                          applicablePlanIds: [planIds[0] || "editmax-plan"],
                          applicableAddonIds: [],
                          usedCount: 0,
                        } as Coupon,
                      ],
                    }
                  : prev
              )
            }
            className="border-zinc-700 text-zinc-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add coupon
          </Button>
        </div>

        <p className="text-xs text-zinc-500">
          Applicability uses: service + optional planIds + optional addonIds. Plan IDs:{" "}
          <span className="text-zinc-400">{planIds.join(", ")}</span>
        </p>

        {draft.couponCodes.length === 0 ? (
          <p className="text-sm text-zinc-500">No coupons.</p>
        ) : (
          <div className="space-y-3">
            {draft.couponCodes.map((coupon) => (
              <Card key={coupon.id} className="p-4 bg-zinc-800/40 border-zinc-700 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-zinc-500">{coupon.id}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, couponCodes: prev.couponCodes.filter((c) => c.id !== coupon.id) }
                          : prev
                      )
                    }
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-zinc-300">Code</Label>
                    <Input
                      value={coupon.code}
                      onChange={(e) =>
                        updateCoupon(coupon.id, (c) => ({ ...c, code: e.target.value.toUpperCase() }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Type</Label>
                    <Select
                      value={coupon.type}
                      onValueChange={(value) => updateCoupon(coupon.id, (c) => ({ ...c, type: value as any }))}
                    >
                      <SelectTrigger className="bg-zinc-900/40 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">percentage</SelectItem>
                        <SelectItem value="fixed">fixed</SelectItem>
                        <SelectItem value="fixed_price">fixed_price</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Value</Label>
                    <Input
                      type="number"
                      value={coupon.value}
                      onChange={(e) => updateCoupon(coupon.id, (c) => ({ ...c, value: toNumber(e.target.value) }))}
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Active</Label>
                    <Select
                      value={coupon.active ? "true" : "false"}
                      onValueChange={(value) => updateCoupon(coupon.id, (c) => ({ ...c, active: value === "true" }))}
                    >
                      <SelectTrigger className="bg-zinc-900/40 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">true</SelectItem>
                        <SelectItem value="false">false</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Min order amount</Label>
                    <Input
                      type="number"
                      value={coupon.minOrderAmount ?? ""}
                      onChange={(e) =>
                        updateCoupon(coupon.id, (c) => ({
                          ...c,
                          minOrderAmount: e.target.value ? toNumber(e.target.value) : undefined,
                        }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Max discount</Label>
                    <Input
                      type="number"
                      value={coupon.maxDiscount ?? ""}
                      onChange={(e) =>
                        updateCoupon(coupon.id, (c) => ({
                          ...c,
                          maxDiscount: e.target.value ? toNumber(e.target.value) : undefined,
                        }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Valid from</Label>
                    <Input
                      type="date"
                      value={dateMsToInput(coupon.validFrom)}
                      onChange={(e) => updateCoupon(coupon.id, (c) => ({ ...c, validFrom: inputToDateMs(e.target.value) }))}
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Valid until</Label>
                    <Input
                      type="date"
                      value={dateMsToInput(coupon.validUntil)}
                      onChange={(e) => updateCoupon(coupon.id, (c) => ({ ...c, validUntil: inputToDateMs(e.target.value) }))}
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Usage limit</Label>
                    <Input
                      type="number"
                      value={coupon.usageLimit ?? ""}
                      onChange={(e) =>
                        updateCoupon(coupon.id, (c) => ({
                          ...c,
                          usageLimit: e.target.value ? toNumber(e.target.value) : undefined,
                        }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Used count</Label>
                    <Input
                      type="number"
                      value={coupon.usedCount ?? 0}
                      onChange={(e) =>
                        updateCoupon(coupon.id, (c) => ({
                          ...c,
                          usedCount: toNumber(e.target.value),
                        }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Applicable services</Label>
                    <Select
                      value={(coupon.applicableServices?.[0] || "EditMax") as any}
                      onValueChange={(value) =>
                        updateCoupon(coupon.id, (c) => ({ ...c, applicableServices: [value as any] }))
                      }
                    >
                      <SelectTrigger className="bg-zinc-900/40 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EditMax">EditMax</SelectItem>
                        <SelectItem value="ContentMax">ContentMax</SelectItem>
                        <SelectItem value="AdMax">AdMax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Applicable plan IDs (comma separated)</Label>
                    <Input
                      value={(coupon.applicablePlanIds || []).join(",")}
                      onChange={(e) =>
                        updateCoupon(coupon.id, (c) => ({
                          ...c,
                          applicablePlanIds: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                      placeholder={planIds.join(",")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Applicable addon IDs (comma separated)</Label>
                    <Input
                      value={(coupon.applicableAddonIds || []).join(",")}
                      onChange={(e) =>
                        updateCoupon(coupon.id, (c) => ({
                          ...c,
                          applicableAddonIds: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                      placeholder={allAddonIds.slice(0, 4).join(",")}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  {coupon.type === "percentage" ? (
                    <>
                      <Percent className="w-3.5 h-3.5" />
                      Percentage discount (0-100)
                    </>
                  ) : coupon.type === "fixed" ? (
                    <>Fixed amount discount</>
                  ) : (
                    <>Fixed final price</>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Bulk discounts */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-zinc-200">Bulk Discounts</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      bulkDiscountRules: [
                        ...prev.bulkDiscountRules,
                        { minQuantity: 10, type: "percentage", value: 5 } as BulkDiscountRule,
                      ],
                    }
                  : prev
              )
            }
            className="border-zinc-700 text-zinc-400"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add rule
          </Button>
        </div>

        {draft.bulkDiscountRules.length === 0 ? (
          <p className="text-sm text-zinc-500">No bulk discount rules.</p>
        ) : (
          <div className="space-y-3">
            {draft.bulkDiscountRules.map((rule, idx) => (
              <Card key={idx} className="p-4 bg-zinc-800/40 border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-zinc-500">Rule {idx + 1}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((prev) =>
                        prev
                          ? { ...prev, bulkDiscountRules: prev.bulkDiscountRules.filter((_, i) => i !== idx) }
                          : prev
                      )
                    }
                    className="text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Min quantity</Label>
                    <Input
                      type="number"
                      value={rule.minQuantity}
                      onChange={(e) =>
                        updateBulkRule(idx, (r) => ({ ...r, minQuantity: toNumber(e.target.value) }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Type</Label>
                    <Select
                      value={rule.type}
                      onValueChange={(value) => updateBulkRule(idx, (r) => ({ ...r, type: value as any }))}
                    >
                      <SelectTrigger className="bg-zinc-900/40 border-zinc-700 text-zinc-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">percentage</SelectItem>
                        <SelectItem value="fixed">fixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Value</Label>
                    <Input
                      type="number"
                      value={rule.value}
                      onChange={(e) => updateBulkRule(idx, (r) => ({ ...r, value: toNumber(e.target.value) }))}
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Max discount (optional)</Label>
                    <Input
                      type="number"
                      value={rule.maxDiscount ?? ""}
                      onChange={(e) =>
                        updateBulkRule(idx, (r) => ({
                          ...r,
                          maxDiscount: e.target.value ? toNumber(e.target.value) : undefined,
                        }))
                      }
                      className="bg-zinc-900/40 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

