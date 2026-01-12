"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BootstrapAdminPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const bootstrapSuperAdmin = useMutation(api.users.bootstrapSuperAdmin);
  const router = useRouter();
  
  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      // Create the super admin user record
      // When the user signs up with this email, the auth callback will
      // find the existing user and preserve the SUPER_ADMIN role
      const userId = await bootstrapSuperAdmin({
        email: email.trim(),
        name: name.trim(),
      });
      
      if (userId) {
        setSuccess(true);
      }
    } catch (err) {
      console.error("Bootstrap error:", err);
      setError(err instanceof Error ? err.message : "Failed to bootstrap super admin");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
        <Card className="p-8 bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 shadow-2xl max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-semibold text-zinc-100">Super Admin Created!</h2>
            <p className="text-zinc-400">
              The super admin account has been created successfully.
            </p>
            <p className="text-sm text-zinc-500 mt-2">
              Now sign up with the email <strong className="text-zinc-300">{email}</strong> and you&apos;ll automatically be assigned the super admin role.
            </p>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => router.push("/auth/signup")}
                className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
              >
                Go to Sign Up
              </Button>
              <Button 
                onClick={() => router.push("/auth/login")}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
      <Card className="p-8 bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-zinc-100 tracking-tight">Bootstrap Super Admin</span>
          </div>
          <p className="text-zinc-400 text-sm">
            Create the first super admin account
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleBootstrap}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Admin Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-zinc-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-zinc-600"
              />
            </div>
            
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
              <p className="font-medium mb-1">Important:</p>
              <p className="text-xs">
                After creating the super admin, you&apos;ll need to sign up with this email address.
                The account will automatically be upgraded to super admin.
              </p>
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-medium shadow-lg shadow-rose-500/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Super Admin"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

