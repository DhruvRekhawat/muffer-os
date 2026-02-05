"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NotificationList } from "@/components/notifications/notification-list";
import { Bell, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";

export default function NotificationsPage() {
  const preferences = useQuery(api.notifications.getMyPreferences);
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(true);

  // Sync with fetched preferences
  useState(() => {
    if (preferences) {
      setInAppEnabled(preferences.inAppEnabled);
    }
  });

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({
        inAppEnabled,
        disabledTypes: [], // For now, all types enabled if in-app is on
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = preferences && preferences.inAppEnabled !== inAppEnabled;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Notifications</h1>
          <p className="text-sm text-zinc-500">Manage your notification preferences</p>
        </div>
      </div>

      {/* Preferences Card */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Notification Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="in-app-notifications"
                checked={inAppEnabled}
                onCheckedChange={(checked) => setInAppEnabled(checked === true)}
              />
              <Label htmlFor="in-app-notifications" className="text-zinc-300 cursor-pointer">
                In-App Notifications
              </Label>
            </div>
            <span className="text-xs text-zinc-500">
              {inAppEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <Checkbox checked={true} disabled />
              <Label className="text-zinc-300">
                WhatsApp Notifications
              </Label>
            </div>
            <span className="text-xs text-zinc-500">Always enabled</span>
          </div>

          <p className="text-xs text-zinc-600 px-3">
            WhatsApp notifications cannot be disabled. You&apos;ll receive important updates via WhatsApp for critical events.
          </p>

          {hasChanges && (
            <Button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <SettingsIcon className="w-4 h-4 mr-2" />}
              Save Preferences
            </Button>
          )}
        </div>
      </Card>

      {/* Notifications List */}
      <NotificationList />
    </div>
  );
}
