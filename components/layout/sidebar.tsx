"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Target, 
  Users, 
  UserPlus, 
  Wallet, 
  Settings,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SidebarContextType = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved === "true";
    }
    return false;
  });
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    }
  }, [isCollapsed]);
  
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

type UserRole = "SUPER_ADMIN" | "PM" | "EDITOR";

interface SidebarProps {
  user: {
    role?: UserRole;
    name: string;
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "PM", "EDITOR"]
  },
  { 
    label: "Projects", 
    href: "/projects", 
    icon: FolderKanban,
    roles: ["SUPER_ADMIN", "PM", "EDITOR"]
  },
  { 
    label: "Missions", 
    href: "/missions", 
    icon: Target,
    roles: ["SUPER_ADMIN", "EDITOR"]
  },
  { 
    label: "People", 
    href: "/people", 
    icon: Users,
    roles: ["SUPER_ADMIN", "PM"]
  },
  { 
    label: "Hiring", 
    href: "/hiring", 
    icon: UserPlus,
    roles: ["SUPER_ADMIN"]
  },
  { 
    label: "Payouts", 
    href: "/payouts", 
    icon: Wallet,
    roles: ["SUPER_ADMIN", "EDITOR"]
  },
  { 
    label: "Settings", 
    href: "/settings/profile", 
    icon: Settings,
    roles: ["SUPER_ADMIN", "PM", "EDITOR"]
  },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  
  // Default to EDITOR if role is undefined (should be bootstrapped, but handle gracefully)
  const userRole: UserRole = user.role || "EDITOR";
  
  const filteredNav = navItems.filter(item => 
    item.roles.includes(userRole)
  );
  
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return { label: "Admin", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
      case "PM":
        return { label: "PM", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
      case "EDITOR":
        return { label: "Editor", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    }
  };
  
  const roleBadge = getRoleBadge(userRole);
  
  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-zinc-900/50 border-r border-zinc-800/50 flex flex-col transition-all duration-300 z-50",
      isCollapsed ? "w-20" : "w-64"
    )}>
        {/* Logo */}
        <div className={cn(
          "border-b border-zinc-800/50 transition-all duration-300",
          isCollapsed ? "p-4" : "p-6"
        )}>
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className={cn(
              "flex items-center gap-3 transition-all",
              isCollapsed && "justify-center"
            )}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold" style={{ color: '#F70606' }}>m</span>
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="text-xl font-bold text-zinc-100 tracking-tight">Muffer</span>
                  <span className={cn(
                    "ml-2 text-xs px-2 py-0.5 rounded-full border",
                    roleBadge.color
                  )}>
                    {roleBadge.label}
                  </span>
                </div>
              )}
            </Link>
            {isCollapsed ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(false)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border border-zinc-800/50 rounded-full"
                title="Expand sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(true)}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-sm font-medium transition-all group relative",
                  isCollapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
                  isActive 
                    ? "bg-zinc-800/80 text-zinc-100 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors flex-shrink-0",
                  isActive ? "text-rose-400" : "text-zinc-500 group-hover:text-zinc-400"
                )} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    )}
                  </>
                )}
                {isCollapsed && isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-rose-400 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>
        
        {/* User info */}
        <div className={cn(
          "border-t border-zinc-800/50 transition-all duration-300",
          isCollapsed ? "p-2" : "p-4"
        )}>
          <div className={cn(
            "flex items-center rounded-xl bg-zinc-800/30 transition-all",
            isCollapsed ? "px-2 py-2 justify-center" : "px-4 py-3 gap-3"
          )}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-300 text-sm font-medium flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{userRole.toLowerCase().replace("_", " ")}</p>
              </div>
            )}
          </div>
        </div>
        
      </aside>
  );
}

