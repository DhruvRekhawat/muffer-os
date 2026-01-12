"use client";

import { usePermissions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CreditCard, Bell } from "lucide-react";

export default function CompanySettingsPage() {
  const { isSuperAdmin } = usePermissions();
  
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Company Settings</h1>
        <p className="text-zinc-400 mt-1">Configure company-wide settings</p>
      </div>
      
      <div className="space-y-6">
        {/* Company Info */}
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-zinc-200">Company Information</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-zinc-300">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                defaultValue="Muffer Studios"
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="companyEmail" className="text-zinc-300">Contact Email</Label>
              <Input
                id="companyEmail"
                type="email"
                defaultValue="admin@muffer.app"
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
        </Card>
        
        {/* Payment Settings */}
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-zinc-200">Payment Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minPayout" className="text-zinc-300">Minimum Payout (₹)</Label>
              <Input
                id="minPayout"
                type="number"
                defaultValue="500"
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
              <p className="text-xs text-zinc-500">Minimum amount editors can request for payout</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payoutSchedule" className="text-zinc-300">Payout Schedule</Label>
              <select
                id="payoutSchedule"
                defaultValue="weekly"
                className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-md text-zinc-100"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </Card>
        
        {/* Notification Settings */}
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-zinc-400" />
            <h3 className="text-lg font-semibold text-zinc-200">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-zinc-300">Email notifications</p>
                <p className="text-sm text-zinc-500">Receive email for important events</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-rose-500"
              />
            </label>
            
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-zinc-300">Large payout alerts</p>
                <p className="text-sm text-zinc-500">Alert when payout exceeds ₹50,000</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-rose-500"
              />
            </label>
            
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-zinc-300">New application alerts</p>
                <p className="text-sm text-zinc-500">Notify when new editor applies</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-rose-500 focus:ring-rose-500"
              />
            </label>
          </div>
        </Card>
        
        <Button className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

