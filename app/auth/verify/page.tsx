"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useVerifyCode } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const verifyCode = useVerifyCode();
  
  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const result = await verifyCode(email, code);
    
    if (!result.success) {
      setError(result.error || "Verification failed");
    }
    setIsLoading(false);
  }, [email, code, verifyCode]);
  
  // Auto-submit when 6 characters entered
  useEffect(() => {
    if (code.length === 6) {
      // Use setTimeout to avoid calling setState synchronously in effect
      setTimeout(() => {
        handleVerify({ preventDefault: () => {} } as React.FormEvent);
      }, 0);
    }
  }, [code, handleVerify]);
  
  return (
    <Card className="p-8 bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 shadow-2xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-zinc-100 tracking-tight">Muffer</span>
        </div>
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Enter verification code</h2>
        <p className="text-zinc-400 mt-2 text-sm">
          We sent a 6-character code to <span className="text-zinc-200">{email}</span>
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleVerify}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-zinc-300">Verification code</Label>
            <Input
              id="code"
              type="text"
              placeholder="XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              required
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em] font-mono bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:ring-zinc-600"
              autoFocus
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={isLoading || code.length !== 6}
            className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-medium shadow-lg shadow-rose-500/25"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>
        </div>
      </form>
      
      <p className="mt-6 text-center text-sm text-zinc-500">
        Didn&apos;t receive a code?{" "}
        <Link href="/auth/login" className="text-rose-400 hover:text-rose-300 font-medium">
          Try again
        </Link>
      </p>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <Card className="p-8 bg-zinc-900/80 backdrop-blur-xl border-zinc-800/50 shadow-2xl">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        </div>
      </Card>
    }>
      <VerifyContent />
    </Suspense>
  );
}

