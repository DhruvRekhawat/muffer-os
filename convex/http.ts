import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

const pricingCorsHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
};

// Public pricing API for external website
// GET /api/pricing
const getPricingHandler = httpAction(async (ctx) => {
  try {
    const pricing = await ctx.runQuery(api.pricing.getPublicPricingConfig, {});
    return new Response(JSON.stringify(pricing), { status: 200, headers: pricingCorsHeaders });
  } catch (error) {
    console.error("Error fetching pricing:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch pricing",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: pricingCorsHeaders }
    );
  }
});

// OPTIONS /api/pricing (CORS preflight)
const pricingOptionsHandler = httpAction(async () => {
  return new Response(null, { status: 204, headers: pricingCorsHeaders });
});

// API endpoint for creating orders from external website
// POST /api/orders
// This only creates an order, NOT a project. Admin must manually start the project using the multi-step form.
const createOrderHandler = httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      // Validate required fields
      if (!body.name || !body.email || !body.service || !body.totalPrice) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: name, email, service, totalPrice" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // Map service type from external API to Convex union
      let serviceType: "EditMax" | "ContentMax" | "AdMax" | "Other";
      if (body.service === "EditMax" || body.service === "ContentMax" || body.service === "AdMax" || body.service === "Other") {
        serviceType = body.service;
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid service type. Must be EditMax, ContentMax, AdMax, or Other" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // Call internal mutation to create order only (no project)
      const result = await ctx.runMutation(internal.orders.createOrderExternal, {
        name: body.name,
        email: body.email,
        service: serviceType,
        editMaxPlan: body.editMaxPlan || undefined,
        adMaxStyle: body.adMaxStyle || undefined,
        adMaxCreatorGender: body.adMaxCreatorGender || undefined,
        adMaxCreatorAge: body.adMaxCreatorAge || undefined,
        contentMaxLength: body.contentMaxLength || undefined,
        addOns: body.addOns || [],
        brief: body.brief || undefined,
        adCount: body.adCount || undefined,
        totalPrice: parseFloat(body.totalPrice),
        discountPercentage: body.discountPercentage || undefined,
        couponCode: body.couponCode || undefined,
        originalPrice: body.originalPrice || undefined,
        externalOrderId: body.orderId || body.id || undefined,
        clientName: body.company || body.name || undefined,
        clientEmail: body.email,
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          orderId: result.orderId
        }),
        { 
          status: 201,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error creating order:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create order",
          message: error instanceof Error ? error.message : "Unknown error"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
});

// API endpoint for hiring editors (submitting applications)
// POST /api/hiring
const hireEditorHandler = httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      
      // Validate required fields
      if (!body.name || !body.email || !body.tools || body.canStartImmediately === undefined) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: name, email, tools, canStartImmediately" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // Call mutation to submit application
      const applicationId = await ctx.runMutation(internal.hiring.submitApplicationExternal, {
        name: body.name,
        email: body.email,
        phone: body.phone || undefined,
        occupation: body.occupation || undefined,
        experience: body.experience || undefined,
        tools: Array.isArray(body.tools) ? body.tools : [],
        portfolioLinks: Array.isArray(body.portfolioLinks) ? body.portfolioLinks : [],
        canStartImmediately: Boolean(body.canStartImmediately),
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          applicationId 
        }),
        { 
          status: 201,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error submitting editor application:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to submit application",
          message: error instanceof Error ? error.message : "Unknown error"
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
});

// Route the handlers
http.route({
  path: "/api/pricing",
  method: "GET",
  handler: getPricingHandler,
});

http.route({
  path: "/api/pricing",
  method: "OPTIONS",
  handler: pricingOptionsHandler,
});

http.route({
  path: "/api/orders",
  method: "POST",
  handler: createOrderHandler,
});

http.route({
  path: "/api/hiring",
  method: "POST",
  handler: hireEditorHandler,
});

export default http;

