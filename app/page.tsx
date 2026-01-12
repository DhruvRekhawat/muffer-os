"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Loader2, Sparkles } from "lucide-react";

export default function HomePage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/auth/login");
      }
    }
  }, [isLoading, isAuthenticated, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-rose-500/30">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Muffer</h1>
          <p className="text-zinc-500 mt-2">Production OS for Video Services</p>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    </div>
  );
}
