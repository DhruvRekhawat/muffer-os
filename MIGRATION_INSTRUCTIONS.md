# Migration: Remove payoutAmount from Milestones

## Problem
Existing milestones in the database have a `payoutAmount` field that was removed from the schema. Convex validates all documents when pushing schema changes, causing the push to fail.

## Solution

### Step 1: Temporarily allow payoutAmount in schema
1. Open `convex/schema.ts`
2. Find the `milestones` table definition (around line 282)
3. Temporarily add back: `payoutAmount: v.optional(v.number()),` after line 288 (after `dueDate`)

### Step 2: Push the schema
```bash
npx convex dev
# or
npx convex deploy
```

### Step 3: Run the migration
Via CLI:
```bash
npx convex run migrations:removePayoutAmountFromMilestones
```

Or via Convex Dashboard:
1. Go to https://dashboard.convex.dev
2. Navigate to Functions tab
3. Find `migrations:removePayoutAmountFromMilestones`
4. Click "Run" button

### Step 4: Remove payoutAmount from schema again
1. Remove the `payoutAmount: v.optional(v.number()),` line you added in Step 1
2. Save the file

### Step 5: Push the schema again
```bash
npx convex dev
# or
npx convex deploy
```

The migration will remove `payoutAmount` from all existing milestones, allowing the schema push to succeed.
