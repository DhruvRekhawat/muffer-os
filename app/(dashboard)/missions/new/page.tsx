"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Zap, TrendingUp, Flame } from "lucide-react";
import Link from "next/link";

type MissionType = "SPEED" | "VOLUME" | "STREAK";
type MissionWindow = "DAILY" | "WEEKLY" | "MONTHLY";

const missionTypes = [
  { value: "VOLUME" as MissionType, label: "Volume", description: "Complete X milestones", icon: TrendingUp },
  { value: "SPEED" as MissionType, label: "Speed", description: "Fast turnaround bonus", icon: Zap },
  { value: "STREAK" as MissionType, label: "Streak", description: "Consecutive days active", icon: Flame },
];

const windowOptions = [
  { value: "DAILY" as MissionWindow, label: "Daily" },
  { value: "WEEKLY" as MissionWindow, label: "Weekly" },
  { value: "MONTHLY" as MissionWindow, label: "Monthly" },
];

export default function NewMissionPage() {
  const router = useRouter();
  const { canManageMissions } = usePermissions();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<MissionType>("VOLUME");
  const [target, setTarget] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [window, setWindow] = useState<MissionWindow>("WEEKLY");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const createMission = useMutation(api.missions.createMission);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      await createMission({
        title,
        description: description || undefined,
        type,
        target: parseInt(target),
        rewardAmount: parseFloat(rewardAmount),
        window,
      });
      
      router.push("/missions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mission");
      setIsLoading(false);
    }
  };
  
  if (!canManageMissions) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to create missions.</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/missions" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Missions
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">Create New Mission</h1>
        <p className="text-zinc-400 mt-1">Set up a gamified challenge for editors</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mission Type */}
        <div className="space-y-3">
          <Label className="text-zinc-300">Mission Type</Label>
          <div className="grid grid-cols-3 gap-3">
            {missionTypes.map((mt) => (
              <button
                key={mt.value}
                type="button"
                onClick={() => setType(mt.value)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  type === mt.value
                    ? "bg-zinc-800 border-zinc-600"
                    : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <mt.icon className={`w-6 h-6 mx-auto mb-2 ${
                  type === mt.value ? "text-rose-400" : "text-zinc-500"
                }`} />
                <p className="font-medium text-zinc-200">{mt.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{mt.description}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-zinc-300">Title</Label>
          <Input
            id="title"
            type="text"
            placeholder="e.g., Weekend Warrior"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
          />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-zinc-300">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe what editors need to do..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100 resize-none"
          />
        </div>
        
        {/* Target & Reward */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target" className="text-zinc-300">
              Target {type === "VOLUME" ? "(Milestones)" : type === "STREAK" ? "(Days)" : "(Hours)"}
            </Label>
            <Input
              id="target"
              type="number"
              placeholder="10"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
              min="1"
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reward" className="text-zinc-300">Reward (₹)</Label>
            <Input
              id="reward"
              type="number"
              placeholder="5000"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              required
              min="0"
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
            />
          </div>
        </div>
        
        {/* Window */}
        <div className="space-y-2">
          <Label className="text-zinc-300">Time Window</Label>
          <div className="flex gap-2">
            {windowOptions.map((w) => (
              <Button
                key={w.value}
                type="button"
                variant={window === w.value ? "default" : "outline"}
                onClick={() => setWindow(w.value)}
                className={window === w.value 
                  ? "bg-zinc-700 text-zinc-100" 
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-100"}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Link href="/missions" className="flex-1">
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
              "Create Mission"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

