"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

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
        <div className="rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-500/30">
          <Image
            src="/logo.svg"
            alt="Muffer"
            width={188}
            height={41}
            className="h-10 w-auto"
            priority
          />
        </div>
        <div className="text-center">
          <p className="text-zinc-500 mt-2">Production OS for Video Services</p>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    </div>
  );
}
