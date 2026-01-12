"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  Video,
  Megaphone,
  Film
} from "lucide-react";
import Link from "next/link";

type ServiceType = "EditMax" | "ContentMax" | "AdMax";

const serviceOptions = [
  { 
    value: "EditMax" as ServiceType, 
    label: "EditMax", 
    description: "Full video editing service",
    icon: Video,
    color: "from-blue-500 to-cyan-500"
  },
  { 
    value: "ContentMax" as ServiceType, 
    label: "ContentMax", 
    description: "Content creation & editing",
    icon: Film,
    color: "from-purple-500 to-pink-500"
  },
  { 
    value: "AdMax" as ServiceType, 
    label: "AdMax", 
    description: "Advertisement production",
    icon: Megaphone,
    color: "from-orange-500 to-red-500"
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { canManageProjects } = usePermissions();
  
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("EditMax");
  const [planDetails, setPlanDetails] = useState("");
  const [brief, setBrief] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [emoji, setEmoji] = useState("🎬");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const createProject = useMutation(api.projects.createProject);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      const result = await createProject({
        name,
        serviceType,
        planDetails,
        brief,
        clientName: clientName || undefined,
        clientEmail: clientEmail || undefined,
        totalPrice: parseFloat(totalPrice) || 0,
        emoji,
      });
      
      router.push(`/projects/${result.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setIsLoading(false);
    }
  };
  
  if (!canManageProjects) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to create projects.</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">Create New Project</h1>
        <p className="text-zinc-400 mt-1">Set up a new video project from an order</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Service Type */}
        <div className="space-y-3">
          <Label className="text-zinc-300">Service Type</Label>
          <div className="grid grid-cols-3 gap-3">
            {serviceOptions.map((service) => (
              <button
                key={service.value}
                type="button"
                onClick={() => setServiceType(service.value)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  serviceType === service.value
                    ? "bg-zinc-800 border-zinc-600"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-3`}>
                  <service.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-medium text-zinc-200">{service.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{service.description}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300">Project Name</Label>
          <div className="flex gap-3">
            <button
              type="button"
              className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl hover:bg-zinc-700 transition-colors"
              onClick={() => {
                const emojis = ["🎬", "🎥", "📹", "🎞️", "📽️", "🎦", "🎭", "🎪", "✨", "🚀"];
                setEmoji(emojis[Math.floor(Math.random() * emojis.length)]);
              }}
            >
              {emoji}
            </button>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Brand Campaign Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-100"
            />
          </div>
        </div>
        
        {/* Plan Details */}
        <div className="space-y-2">
          <Label htmlFor="planDetails" className="text-zinc-300">Plan Details</Label>
          <Input
            id="planDetails"
            type="text"
            placeholder="e.g., Pro Plan - 5 videos"
            value={planDetails}
            onChange={(e) => setPlanDetails(e.target.value)}
            required
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
          />
        </div>
        
        {/* Brief */}
        <div className="space-y-2">
          <Label htmlFor="brief" className="text-zinc-300">Project Brief</Label>
          <Textarea
            id="brief"
            placeholder="Describe the project requirements, style preferences, and deliverables..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            required
            rows={4}
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100 resize-none"
          />
        </div>
        
        {/* Client Info */}
        <Card className="p-4 bg-zinc-900/50 border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Client Information (Optional)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-zinc-400 text-sm">Client Name</Label>
              <Input
                id="clientName"
                type="text"
                placeholder="John Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail" className="text-zinc-400 text-sm">Client Email</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
        </Card>
        
        {/* Total Price */}
        <div className="space-y-2">
          <Label htmlFor="totalPrice" className="text-zinc-300">Total Price (₹)</Label>
          <Input
            id="totalPrice"
            type="number"
            placeholder="50000"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            required
            min="0"
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
          />
          <p className="text-xs text-zinc-500">This will be split across milestones automatically</p>
        </div>
        
        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Link href="/projects" className="flex-1">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

