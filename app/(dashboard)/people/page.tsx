"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Users, 
  Loader2, 
  Mail, 
  Phone,
} from "lucide-react";
import Link from "next/link";

type RoleFilter = "ALL" | "SUPER_ADMIN" | "PM" | "EDITOR";

export default function PeoplePage() {
  const { isSuperAdmin, isPM } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  
  const users = useQuery(api.users.listUsers, {
    role: roleFilter === "ALL" ? undefined : roleFilter,
  });
  
  const filteredUsers = users?.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  if (!isSuperAdmin && !isPM) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Admin</Badge>;
      case "PM":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">PM</Badge>;
      case "EDITOR":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Editor</Badge>;
      default:
        return null;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Active</Badge>;
      case "INVITED":
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Invited</Badge>;
      case "SUSPENDED":
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Suspended</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">People</h1>
        <p className="text-zinc-400 mt-1">Manage team members and editors</p>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-zinc-100"
          />
        </div>
        
        {isSuperAdmin && (
          <div className="flex gap-2">
            {(["ALL", "SUPER_ADMIN", "PM", "EDITOR"] as RoleFilter[]).map((role) => (
              <Button
                key={role}
                variant={roleFilter === role ? "default" : "outline"}
                size="sm"
                onClick={() => setRoleFilter(role)}
                className={roleFilter === role 
                  ? "bg-zinc-700 text-zinc-100" 
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"}
              >
                {role === "ALL" ? "All" : role === "SUPER_ADMIN" ? "Admins" : role === "PM" ? "PMs" : "Editors"}
              </Button>
            ))}
          </div>
        )}
      </div>
      
      {/* Content */}
      {users === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : filteredUsers?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300">No people found</h3>
          <p className="text-zinc-500 mt-1">
            {searchQuery ? "Try a different search term" : "No team members yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers?.map((user) => (
            <Link key={user._id} href={`/people/${user._id}`}>
              <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-zinc-200 text-lg font-medium flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-zinc-200 truncate">{user.name}</h3>
                      {user.role && getRoleBadge(user.role)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                        <Phone className="w-3 h-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {user.status && getStatusBadge(user.status)}
                      {user.role === "EDITOR" && (
                        <span className="text-xs text-zinc-500">
                          ₹{(user.lifetimeEarnings ?? 0).toLocaleString()} earned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

