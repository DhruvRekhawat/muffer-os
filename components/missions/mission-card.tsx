"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Zap, TrendingUp, Flame, CheckCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface Mission {
  _id: Id<"missions">;
  title: string;
  description?: string;
  type: string;
  target: number;
  rewardAmount: number;
  window: string;
  active: boolean;
}

interface MissionCardProps {
  mission: Mission;
  progress?: number;
  completed?: boolean;
  percentComplete?: number;
  isAdmin?: boolean;
}

export function MissionCard({ 
  mission, 
  progress = 0, 
  completed = false, 
  percentComplete = 0,
  isAdmin = false 
}: MissionCardProps) {
  const updateMission = useMutation(api.missions.updateMission);
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "VOLUME":
        return <TrendingUp className="w-5 h-5" />;
      case "SPEED":
        return <Zap className="w-5 h-5" />;
      case "STREAK":
        return <Flame className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case "VOLUME":
        return "from-blue-500 to-cyan-500";
      case "SPEED":
        return "from-yellow-500 to-orange-500";
      case "STREAK":
        return "from-red-500 to-pink-500";
      default:
        return "from-purple-500 to-pink-500";
    }
  };
  
  const handleToggleActive = async () => {
    await updateMission({
      missionId: mission._id,
      active: !mission.active,
    });
  };
  
  return (
    <Card className={`p-5 border transition-all ${
      completed 
        ? "bg-emerald-500/10 border-emerald-500/20" 
        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getTypeColor(mission.type)} flex items-center justify-center text-white`}>
          {getTypeIcon(mission.type)}
        </div>
        <div className="flex items-center gap-2">
          {completed && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
          <Badge className="bg-zinc-700/50 text-zinc-300 border-zinc-600">
            {mission.window}
          </Badge>
        </div>
      </div>
      
      <h3 className="font-semibold text-zinc-200 mb-1">{mission.title}</h3>
      {mission.description && (
        <p className="text-sm text-zinc-500 mb-3">{mission.description}</p>
      )}
      
      {/* Progress */}
      {!isAdmin && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-zinc-500">
              {progress}/{mission.target} {mission.type === "VOLUME" ? "milestones" : mission.type === "STREAK" ? "days" : "completed"}
            </span>
            <span className="text-zinc-400">{percentComplete}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getTypeColor(mission.type)} rounded-full transition-all`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Reward */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Reward</p>
          <p className="text-lg font-bold text-emerald-400">₹{mission.rewardAmount.toLocaleString()}</p>
        </div>
        
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            className={mission.active 
              ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            }
          >
            {mission.active ? "Active" : "Inactive"}
          </Button>
        )}
      </div>
    </Card>
  );
}

