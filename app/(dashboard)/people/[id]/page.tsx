"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Mail, Phone, Calendar, Wallet } from "lucide-react";
import Link from "next/link";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export default function PersonPage({ params }: PersonPageProps) {
  const { id } = use(params);
  const user = useQuery(api.users.getUser, { userId: id as Id<"users"> });
  
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }
  
  if (user === null) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-zinc-300">Person not found</h2>
        <Link 
          href="/people" 
          className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to People
        </Link>
      </div>
    );
  }
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Admin</Badge>;
      case "PM":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Project Manager</Badge>;
      case "EDITOR":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Editor</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Link 
        href="/people" 
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to People
      </Link>
      
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-zinc-100">{user.name}</h1>
              {user.role && getRoleBadge(user.role)}
            </div>
            
            <div className="space-y-2 text-zinc-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
        
        {user.role === "EDITOR" && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Earnings</h2>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-zinc-800/50 border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Available Balance</p>
                    <p className="text-xl font-bold text-emerald-400">₹{(user.unlockedBalance ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-zinc-800/50 border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Lifetime Earnings</p>
                    <p className="text-xl font-bold text-blue-400">₹{(user.lifetimeEarnings ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
        
        {user.skills && user.skills.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="border-zinc-700 text-zinc-300">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {user.tools && user.tools.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">Tools</h2>
            <div className="flex flex-wrap gap-2">
              {user.tools.map((tool) => (
                <Badge key={tool} variant="outline" className="border-zinc-700 text-zinc-300">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

