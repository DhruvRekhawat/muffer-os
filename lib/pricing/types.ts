export type ServiceType = "EditMax" | "ContentMax" | "AdMax";

export type PricingUnit = "video" | "ad";

export type AddonCategory =
  | "voice"
  | "graphics"
  | "delivery"
  | "format"
  | "script"
  | "other";

export interface Addon {
  id: string;
  name: string;
  price: number;
  description?: string;
  category: AddonCategory;
}

export interface Plan {
  id: string;
  name: string;
  service: ServiceType;
  /**
   * Display/base price. In practice you’ll likely use `pricePerUnit` and multiply by quantity.
   * Kept for compatibility with the existing pricing model.
   */
  price: number;
  pricePerUnit: number;
  unit: PricingUnit;
  includes: string[];
  addons: Addon[];
  features: string[];
  popular?: boolean;
  custom?: boolean;
}

export type CouponType = "percentage" | "fixed" | "fixed_price";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  /**
   * - percentage: 0-100
   * - fixed: fixed discount amount
   * - fixed_price: final price after discount
   */
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  /** Timestamp (ms) */
  validFrom?: number;
  /** Timestamp (ms) */
  validUntil?: number;
  usageLimit?: number;
  usedCount?: number;
  applicableServices?: ServiceType[];
  applicablePlanIds?: string[];
  applicableAddonIds?: string[];
  active: boolean;
}

export type BulkDiscountType = "percentage" | "fixed";

export interface BulkDiscountRule {
  minQuantity: number;
  type: BulkDiscountType;
  value: number;
  maxDiscount?: number;
}

export interface AddonCategories {
  voice: string;
  graphics: string;
  delivery: string;
  format: string;
  script: string;
  other: string;
}

export interface PricingConfig {
  plans: Plan[];
  couponCodes: Coupon[];
  bulkDiscountRules: BulkDiscountRule[];
  addonCategories: AddonCategories;
  version: number;
  updatedAt: number;
}

