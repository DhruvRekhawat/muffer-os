#!/usr/bin/env node

/**
 * Script to assign a project to a user
 * 
 * This script can be run in two ways:
 * 
 * 1. Using Convex CLI (recommended):
 *    npx convex run projects:createProjectAndAssignEditor '{ "editorId": "m5728c9wgwz8gmf0sc8kdgh3an7xyy3h", "projectName": "My Project", "serviceType": "EditMax", "totalPrice": 10000 }'
 * 
 * 2. Using this Node script (requires ConvexHttpClient):
 *    node scripts/assign-project.mjs <userId> --create "Project Name"
 *    node scripts/assign-project.mjs <userId> <projectId>
 */

import { ConvexHttpClient } from "convex/browser";

const args = process.argv.slice(2);
const userId = args[0];
const createFlagIndex = args.indexOf("--create");
const shouldCreate = createFlagIndex !== -1;
const projectName = shouldCreate ? args[createFlagIndex + 1] : null;
const projectId = !shouldCreate && args[1] ? args[1] : null;

if (!userId) {
  console.log("📋 Project Assignment Script");
  console.log("=" .repeat(50));
  console.log("\nUsage:");
  console.log("  node scripts/assign-project.mjs <userId> [projectId|--create \"Project Name\"]");
  console.log("\nExamples:");
  console.log("  # Assign user to existing project:");
  console.log("  node scripts/assign-project.mjs m5728c9wgwz8gmf0sc8kdgh3an7xyy3h j1234567890abcdefghijklmnop");
  console.log("\n  # Create new project and assign user:");
  console.log("  node scripts/assign-project.mjs m5728c9wgwz8gmf0sc8kdgh3an7xyy3h --create \"My New Project\"");
  console.log("\n" + "=".repeat(50));
  console.log("\n💡 Alternative: Use Convex CLI directly:");
  console.log("\n  # Create project and assign:");
  console.log(`  npx convex run projects:createProjectAndAssignEditor '{`);
  console.log(`    "editorId": "${userId || "<userId>"}",`);
  console.log(`    "projectName": "My Project",`);
  console.log(`    "serviceType": "EditMax",`);
  console.log(`    "totalPrice": 10000`);
  console.log(`  }'`);
  console.log("\n  # Assign to existing project:");
  console.log(`  npx convex run projects:assignEditorToProjectAdmin '{`);
  console.log(`    "projectId": "<projectId>",`);
  console.log(`    "editorId": "${userId || "<userId>"}"`);
  console.log(`  }'`);
  process.exit(0);
}

if (shouldCreate && !projectName) {
  console.error("❌ Error: --create requires a project name");
  console.error('Example: node scripts/assign-project.mjs <userId> --create "Project Name"');
  process.exit(1);
}

// Get Convex URL from environment
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required");
  console.error("\nSet it in your .env.local file:");
  console.error("  NEXT_PUBLIC_CONVEX_URL='https://your-deployment.convex.cloud'");
  console.error("\n💡 Or use Convex CLI instead (no env vars needed):");
  console.log(`\n  npx convex run projects:createProjectAndAssignEditor '{`);
  console.log(`    "editorId": "${userId}",`);
  console.log(`    "projectName": "${projectName || "My Project"}",`);
  console.log(`    "serviceType": "EditMax",`);
  console.log(`    "totalPrice": 10000`);
  console.log(`  }'`);
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  try {
    console.log(`🔗 Connecting to Convex...\n`);
    
    // Verify user exists
    console.log(`👤 Verifying user ${userId}...`);
    const user = await client.query("users:getUser", { userId });
    
    if (!user) {
      console.error(`❌ Error: User ${userId} not found`);
      process.exit(1);
    }
    
    console.log(`✓ User found: ${user.name} (${user.email})`);
    console.log(`  Role: ${user.role || "EDITOR"}\n`);
    
    if (shouldCreate) {
      // Create new project and assign user
      console.log(`📦 Creating project "${projectName}" and assigning to user...`);
      
      const result = await client.mutation("projects:createProjectAndAssignEditor", {
        editorId: userId,
        projectName: projectName,
        serviceType: "EditMax",
        totalPrice: 10000,
      });
      
      console.log(`\n✅ Success! Project created and assigned:`);
      console.log(`   Project ID: ${result.projectId}`);
      console.log(`   Project Slug: ${result.slug}`);
      console.log(`   Editor ID: ${result.editorId}`);
      console.log(`\n🌐 View project at: /projects/${result.slug}`);
      
    } else if (projectId) {
      // Assign to existing project
      console.log(`📋 Assigning user to project ${projectId}...`);
      
      // Verify project exists
      const project = await client.query("projects:getProject", { projectId });
      if (!project) {
        console.error(`❌ Error: Project ${projectId} not found`);
        process.exit(1);
      }
      
      console.log(`✓ Project found: ${project.name}\n`);
      
      // Assign editor to project
      const result = await client.mutation("projects:assignEditorToProjectAdmin", {
        projectId: projectId,
        editorId: userId,
      });
      
      if (result.success) {
        console.log(`✅ Success! User assigned to project.`);
        if (result.message) {
          console.log(`   ${result.message}`);
        }
      } else {
        console.error(`❌ Failed to assign user to project`);
        process.exit(1);
      }
      
    } else {
      console.error("❌ Error: Either provide a projectId or use --create flag");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("   Details:", JSON.stringify(error.data, null, 2));
    }
    console.error("\n💡 Tip: If you get authentication errors, use Convex CLI instead:");
    console.log(`\n  npx convex run projects:createProjectAndAssignEditor '{`);
    console.log(`    "editorId": "${userId}",`);
    if (projectName) {
      console.log(`    "projectName": "${projectName}",`);
    }
    console.log(`    "serviceType": "EditMax",`);
    console.log(`    "totalPrice": 10000`);
    console.log(`  }'`);
    if (error.stack && process.env.DEBUG) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  }
}

main();
