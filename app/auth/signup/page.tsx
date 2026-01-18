"use client";

import { useState } from "react";
import { useSignIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Mail, Lock, User, Sparkles, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EDITOR" | "PM">("EDITOR");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const signIn = useSignIn();
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const result = await signIn(email, password, "signUp", name, role);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Signup failed");
    }
    setIsLoading(false);
  };
  
  if (success) {
    return (
      <Card className="p-8 bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 shadow-2xl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100">Welcome to Muffer!</h2>
          <p className="text-zinc-400">
            Your account has been created successfully.
          </p>
          <Link href="/dashboard">
            <Button className="w-full mt-4 bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-8 bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 shadow-2xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-rose-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-zinc-100 tracking-tight">Muffer</span>
        </div>
        <p className="text-zinc-400">Create your account</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSignup}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-zinc-600"
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
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-zinc-600"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pl-10 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-zinc-600"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-zinc-300">I am a...</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("EDITOR")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all border ${
                  role === "EDITOR" 
                    ? "bg-rose-500/10 border-rose-500/50 text-rose-400" 
                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                Video Editor
              </button>
              <button
                type="button"
                onClick={() => setRole("PM")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all border ${
                  role === "PM"
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                    : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                Project Manager
              </button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-medium shadow-lg shadow-rose-500/25"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Create account"
            )}
          </Button>
        </div>
      </form>
      
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-rose-400 hover:text-rose-300 font-medium">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

