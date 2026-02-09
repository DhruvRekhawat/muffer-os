"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DollarSign, TrendingUp, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/auth";

const tabs = [
  {
    id: "pricing",
    label: "Pricing",
    href: "/configure/pricing",
    icon: DollarSign,
    description: "Base prices, add-ons, coupons",
    group: "Pricing & Rates",
  },
  {
    id: "tier-rates",
    label: "Tier Rates",
    href: "/configure/tier-rates",
    icon: TrendingUp,
    description: "Editor rates per minute",
    group: "Pricing & Rates",
  },
  {
    id: "templates",
    label: "Templates",
    href: "/configure/templates",
    icon: FileText,
    description: "Milestone templates",
    group: "Workflow",
  },
];

export default function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isSuperAdmin } = usePermissions();

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  // Group tabs by category
  const groupedTabs = tabs.reduce((acc, tab) => {
    if (!acc[tab.group]) {
      acc[tab.group] = [];
    }
    acc[tab.group].push(tab);
    return acc;
  }, {} as Record<string, typeof tabs>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Configuration</h1>
            <p className="text-zinc-400 text-sm">Manage system settings and configurations</p>
          </div>
        </div>
      </div>

      {/* Tabs with grouping */}
      <div className="border-b border-zinc-800">
        <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 -mb-px" aria-label="Tabs">
          {Object.entries(groupedTabs).map(([group, groupTabs], groupIndex) => (
            <div key={group} className="flex items-center">
              {groupIndex > 0 && (
                <div className="h-6 w-px bg-zinc-800 mx-2" aria-hidden="true" />
              )}
              <div className="flex items-center gap-1">
                {groupTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
                  
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className={cn(
                        "group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors rounded-t-lg",
                        isActive
                          ? "text-rose-400 border-b-2 border-rose-500 bg-zinc-900/50"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.description && (
                        <span className={cn(
                          "hidden lg:inline text-xs ml-1 opacity-70",
                          isActive ? "text-zinc-400" : "text-zinc-600"
                        )}>
                          • {tab.description}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
