# Muffer Admin API Documentation

## Important: Base URL Configuration

**The API endpoints must be accessed via your Convex deployment URL, not a custom domain.**

Your Convex deployment URL typically looks like:
- `https://<your-deployment-name>.convex.site` (older format)
- `https://<your-deployment-name>.convex.cloud` (newer format)

**To find your Convex URL:**
1. Check your `.env.local` or environment variables for `NEXT_PUBLIC_CONVEX_URL`
2. Or run `npx convex env` in your project directory
3. Or check your Convex dashboard

**Example Base URLs:**
- `https://compassionate-albatross-460.convex.site`
- `https://your-deployment.convex.cloud`

**Note:** If you have a custom domain configured for Convex HTTP routes, use that instead. Otherwise, use the Convex deployment URL directly.

## Overview

This API allows external websites to create projects (orders) and submit editor applications in the Muffer Admin system.

---

## 1. Create Project from Order

Creates a new project in the admin system from an external order. This should be called after a successful payment.

### Endpoint
```
POST /api/orders
```

### Request Headers
```
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Customer full name |
| `phone` | string | Yes | Customer phone number |
| `email` | string | Yes | Customer email address |
| `company` | string | No | Company name (optional) |
| `service` | string | Yes | Service type: `"EditMax"`, `"ContentMax"`, or `"AdMax"` |
| `totalPrice` | number | Yes | Total order price |
| `brief` | string | No | Project brief/description |
| `editMaxPlan` | string | No | EditMax plan type (if service is EditMax) |
| `adMaxStyle` | stQAZXDFMring | No | AdMax style: `"Stock"`, `"UGC"`, or `"Mixed"` |
| `adMaxCreatorGender` | string | No | Creator gender preference: `"Male"`, `"Female"`, or `"NoPreference"` |
| `adMaxCreatorAge` | string | No | Creator age preference: `"Young"`, `"Adult"`, or `"Mature"` |
| `contentMaxLength` | string | No | Content length (if service is ContentMax) |
| `addOns` | array | No | Array of add-on IDs |
| `wantsSubscription` | boolean | No | Whether customer wants subscription |
| `subscriptionBundle` | string | No | Subscription bundle type |
| `fileLinks` | string | No | Links to uploaded files |
| `adCount` | number | No | Number of ads (if service is AdMax) |
| `discountPercentage` | number | No | Discount percentage applied |
| `couponCode` | string | No | Coupon code used |
| `originalPrice` | number | No | Original price before discount |
| `orderId` | string | No | External order ID (for reference) |

### Example Request

**Important:** Replace `YOUR_CONVEX_DEPLOYMENT_URL` with your actual Convex deployment URL (e.g., `https://your-deployment.convex.cloud`)

```bash
curl -X POST https://YOUR_CONVEX_DEPLOYMENT_URL/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john.doe@example.com",
    "company": "Acme Corp",
    "service": "EditMax",
    "totalPrice": 5000,
    "brief": "Need video editing for product launch",
    "editMaxPlan": "Premium",
    "addOns": ["addon-1", "addon-2"],
    "discountPercentage": 10,
    "couponCode": "SAVE10",
    "originalPrice": 5555.56,
    "orderId": "order_abc123"
  }'
```

### Success Response (201 Created)

```json
{
  "success": true,
  "projectId": "k17abc123xyz",
  "orderId": "k17def456uvw",
  "slug": "john-doe-editmax-acme-corp-xyz9"
}
```

### Error Responses

**400 Bad Request** - Missing required fields
```json
{
  "error": "Missing required fields: name, email, service, totalPrice"
}
```

**400 Bad Request** - Invalid service type
```json
{
  "error": "Invalid service type. Must be EditMax, ContentMax, or AdMax"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to create project",
  "message": "No PM or SUPER_ADMIN found. Please create one first."
}
```

---

## 2. Submit Editor Application (Hiring)

Submits an editor application for review. This creates a new application in the hiring pipeline.

### Endpoint
```
POST /api/hiring
```

### Request Headers
```
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Applicant full name |
| `email` | string | Yes | Applicant email address |
| `phone` | string | No | Applicant phone number |
| `occupation` | string | No | Current occupation |
| `experience` | string | No | Years of experience or experience description |
| `tools` | array | Yes | Array of editing tools/software (e.g., `["Premiere Pro", "After Effects", "DaVinci Resolve"]`) |
| `portfolioLinks` | array | No | Array of portfolio URLs |
| `canStartImmediately` | boolean | Yes | Whether applicant can start immediately |

### Example Request

**Important:** Replace `YOUR_CONVEX_DEPLOYMENT_URL` with your actual Convex deployment URL

```bash
curl -X POST https://YOUR_CONVEX_DEPLOYMENT_URL/api/hiring \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1987654321",
    "occupation": "Video Editor",
    "experience": "5 years",
    "tools": [
      "Adobe Premiere Pro",
      "Adobe After Effects",
      "DaVinci Resolve",
      "Final Cut Pro"
    ],
    "portfolioLinks": [
      "https://portfolio.example.com/jane",
      "https://vimeo.com/janesmith"
    ],
    "canStartImmediately": true
  }'
```

### Success Response (201 Created)

```json
{
  "success": true,
  "applicationId": "k17ghi789rst"
}
```

### Error Responses

**400 Bad Request** - Missing required fields
```json
{
  "error": "Missing required fields: name, email, tools, canStartImmediately"
}
```

**400 Bad Request** - Duplicate application
```json
{
  "error": "Failed to submit application",
  "message": "You already have a pending application"
}
```

**400 Bad Request** - Cooldown period
```json
{
  "error": "Failed to submit application",
  "message": "You can reapply after 12/25/2024"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to submit application",
  "message": "Unknown error"
}
```

---

## Integration Example (Next.js)

### After Successful Payment

```typescript
// In your order creation API (after Razorpay payment success)
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerDetails,
      selectedPlan,
      selectedAddons,
      appliedCoupon,
      total,
      subtotal,
      discount,
      selectedQuantity
    } = body

    // ... your existing order creation logic ...

    // After creating order in your database and processing payment
    // Call Muffer Admin API to create project
    // IMPORTANT: Use your Convex deployment URL, not a custom domain
    const MUFFER_ADMIN_API_URL = process.env.MUFFER_ADMIN_API_URL || 'https://YOUR_CONVEX_DEPLOYMENT_URL'
    const mufferResponse = await fetch(`${MUFFER_ADMIN_API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: customerDetails.fullName,
        phone: customerDetails.phone,
        email: customerDetails.email,
        company: customerDetails.companyName || null,
        service: selectedPlan.service, // "EditMax", "ContentMax", or "AdMax"
        totalPrice: total,
        brief: customerDetails.specialRequests || null,
        addOns: selectedAddons?.map((addon: any) => addon.id) || [],
        adCount: selectedPlan.service === 'AdMax' ? (selectedQuantity || 1) : undefined,
        discountPercentage: appliedCoupon ? 
          (appliedCoupon.type === 'percentage' ? appliedCoupon.value : 
           (discount / subtotal) * 100) : undefined,
        couponCode: appliedCoupon?.code || null,
        originalPrice: subtotal,
        orderId: order.id, // Your order ID for reference
      }),
    })

    if (!mufferResponse.ok) {
      const error = await mufferResponse.json()
      console.error('Failed to create project in Muffer Admin:', error)
      // You might want to handle this error (log, retry, etc.)
      // But don't fail the order creation since payment is already processed
    } else {
      const mufferData = await mufferResponse.json()
      console.log('Project created in Muffer Admin:', mufferData)
      // Optionally store mufferProjectId in your order record
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      order
    })

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
```

---

## Notes

1. **Authentication**: Currently, these endpoints are public. Consider adding API key authentication for production use.

2. **Error Handling**: Always handle errors gracefully. If the Muffer Admin API call fails, log the error but don't fail the entire order process (since payment is already processed).

3. **Idempotency**: The API will create a new project/application each time it's called. If you need to prevent duplicates, include a unique identifier in your requests and handle deduplication on your side.

4. **Service Types**: Valid service types are:
   - `"EditMax"` - Video editing service
   - `"ContentMax"` - Content creation service
   - `"AdMax"` - Advertisement production service

5. **Response Times**: These are server-side operations that may take a few seconds. Implement appropriate timeouts in your integration.

6. **Rate Limiting**: Be mindful of rate limits. If you're processing many orders, consider batching or implementing a queue system.

---

## Support

For issues or questions, contact the Muffer Admin team.
