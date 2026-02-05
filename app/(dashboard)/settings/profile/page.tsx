"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, User, Mail, Phone } from "lucide-react";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [tools, setTools] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const updateProfile = useMutation(api.users.updateProfile);
  
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setSkills(user.skills?.join(", ") || "");
      setTools(user.tools?.join(", ") || "");
      setUpiId(user.payoutDetails?.upiId || "");
    }
  }, [user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(false);
    
    try {
      await updateProfile({
        name: name || undefined,
        phone: phone || undefined,
        skills: skills ? skills.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        tools: tools ? tools.split(",").map(s => s.trim()).filter(Boolean) : undefined,
        payoutDetails: upiId ? { method: "UPI", upiId } : undefined,
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };
  
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">Super Admin</Badge>;
      case "PM":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Project Manager</Badge>;
      case "EDITOR":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Editor</Badge>;
      default:
        return null;
    }
  };
  
  if (!user) return null;
  
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Profile Settings</h1>
        <p className="text-zinc-400 mt-1">Manage your account information</p>
      </div>
      
      {/* Profile Header */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-zinc-100">{user.name}</h2>
              {user.role ? getRoleBadge(user.role) : null}
            </div>
            <p className="text-zinc-400">{user.email}</p>
          </div>
        </div>
      </Card>
      
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          Profile updated successfully!
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4">Basic Information</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="pl-10 bg-zinc-800/30 border-zinc-700 text-zinc-500 cursor-not-allowed"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-zinc-300">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>
          </div>
        </Card>
        
        {user.role === "EDITOR" && (
          <>
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-200 mb-4">Professional Info</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="skills" className="text-zinc-300">Skills (comma-separated)</Label>
                  <Input
                    id="skills"
                    type="text"
                    placeholder="Video Editing, Color Grading, Motion Graphics"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tools" className="text-zinc-300">Tools (comma-separated)</Label>
                  <Input
                    id="tools"
                    type="text"
                    placeholder="Premiere Pro, After Effects, DaVinci Resolve"
                    value={tools}
                    onChange={(e) => setTools(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-zinc-900/50 border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-200 mb-4">Payout Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="upiId" className="text-zinc-300">UPI ID</Label>
                <Input
                  id="upiId"
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
            </Card>
          </>
        )}
        
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

