import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

// API endpoint for creating projects from external orders
// POST /api/orders
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
      
      // Map service type from Prisma enum to Convex union
      let serviceType: "EditMax" | "ContentMax" | "AdMax";
      if (body.service === "EditMax" || body.service === "ContentMax" || body.service === "AdMax") {
        serviceType = body.service;
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid service type. Must be EditMax, ContentMax, or AdMax" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
      
      // Call internal mutation to create project
      const result = await ctx.runMutation(internal.projects.createProjectFromOrder, {
        name: body.name,
        phone: body.phone || "",
        email: body.email,
        company: body.company || undefined,
        service: serviceType,
        editMaxPlan: body.editMaxPlan || undefined,
        adMaxStyle: body.adMaxStyle || undefined,
        adMaxCreatorGender: body.adMaxCreatorGender || undefined,
        adMaxCreatorAge: body.adMaxCreatorAge || undefined,
        contentMaxLength: body.contentMaxLength || undefined,
        addOns: body.addOns || [],
        wantsSubscription: body.wantsSubscription || false,
        subscriptionBundle: body.subscriptionBundle || undefined,
        brief: body.brief || undefined,
        fileLinks: body.fileLinks || undefined,
        adCount: body.adCount || undefined,
        totalPrice: parseFloat(body.totalPrice),
        discountPercentage: body.discountPercentage || undefined,
        couponCode: body.couponCode || undefined,
        originalPrice: body.originalPrice || undefined,
        externalOrderId: body.orderId || body.id || undefined,
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          projectId: result.projectId,
          orderId: result.orderId,
          slug: result.slug
        }),
        { 
          status: 201,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error creating project from order:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create project",
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

