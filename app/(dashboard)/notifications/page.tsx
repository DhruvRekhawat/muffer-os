"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NotificationList } from "@/components/notifications/notification-list";
import { Bell, Settings as SettingsIcon, Loader2, TestTube, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NotificationsPage() {
  const preferences = useQuery(api.notifications.getMyPreferences);
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  const sendTestNotification = useMutation(api.notifications.sendTestNotification);
  const seedTemplates = useMutation(api.whatsapp.seedTemplatesPublic);
  const whatsappLogs = useQuery(api.notifications.getMyWhatsAppLogs, { limit: 10 });
  const [isSaving, setIsSaving] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [testType, setTestType] = useState<string>("editor.invitation.received");
  const [isTesting, setIsTesting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);
  const templateStatus = useQuery(api.notifications.checkTemplateStatus, { type: testType as any });

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

  const handleSeedTemplates = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedTemplates({});
      setSeedResult({
        success: true,
        message: `Templates seeded! Inserted ${result.inserted} of ${result.total} templates.`,
      });
    } catch (error) {
      setSeedResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to seed templates",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestNotification({
        type: testType as any,
        title: "Test Notification",
        message: `This is a test notification of type: ${testType}`,
      });
      setTestResult({
        success: true,
        message: `Notification sent! User ID: ${result.userId}, Phone: ${result.phone || "No phone number"}`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Failed to send test notification",
      });
    } finally {
      setIsTesting(false);
    }
  };

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

      {/* Seed Templates Section */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-200">WhatsApp Templates</h2>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Seed WhatsApp template configurations to the database. This needs to be done once before WhatsApp notifications can be sent.
          </p>
          
          <Button
            onClick={handleSeedTemplates}
            disabled={isSeeding}
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Seeding...
              </>
            ) : (
              <>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Seed WhatsApp Templates
              </>
            )}
          </Button>

          {seedResult && (
            <div className={`p-3 rounded-lg flex items-start gap-2 ${
              seedResult.success 
                ? "bg-emerald-500/10 border border-emerald-500/20" 
                : "bg-red-500/10 border border-red-500/20"
            }`}>
              {seedResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              )}
              <p className={`text-sm ${seedResult.success ? "text-emerald-300" : "text-red-300"}`}>
                {seedResult.message}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Test Notifications Section */}
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <TestTube className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Test Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-zinc-300">Notification Type</Label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="editor.invitation.received">Editor: Invitation Received</SelectItem>
                <SelectItem value="editor.submission.approved">Editor: Submission Approved</SelectItem>
                <SelectItem value="editor.submission.rejected">Editor: Submission Rejected</SelectItem>
                <SelectItem value="editor.payout.processed">Editor: Payout Processed</SelectItem>
                <SelectItem value="pm.submission.ready">PM: Submission Ready</SelectItem>
                <SelectItem value="pm.project.at_risk">PM: Project At Risk</SelectItem>
                <SelectItem value="sa.order.placed">SA: Order Placed</SelectItem>
              </SelectContent>
            </Select>
            {templateStatus && (
              <div className="text-xs text-zinc-500 mt-1">
                {templateStatus.exists ? (
                  templateStatus.isActive ? (
                    <span className="text-emerald-400">
                      ✓ Template configured: {templateStatus.templateName} ({templateStatus.templateLanguage})
                    </span>
                  ) : (
                    <span className="text-yellow-400">
                      ⚠ Template exists but is inactive: {templateStatus.templateName}
                    </span>
                  )
                ) : (
                  <span className="text-red-400">
                    ✗ No WhatsApp template configured for this type
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={handleTestNotification}
            disabled={isTesting}
            variant="outline"
            className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Send Test Notification
              </>
            )}
          </Button>

          {testResult && (
            <div className={`p-3 rounded-lg flex items-start gap-2 ${
              testResult.success 
                ? "bg-emerald-500/10 border border-emerald-500/20" 
                : "bg-red-500/10 border border-red-500/20"
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              )}
              <p className={`text-sm ${testResult.success ? "text-emerald-300" : "text-red-300"}`}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* WhatsApp Logs Section */}
      {whatsappLogs && whatsappLogs.length > 0 && (
        <Card className="p-6 bg-zinc-900/50 border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-200">WhatsApp Notification Logs</h2>
          </div>
          
          <div className="space-y-2">
            {whatsappLogs.map((log) => (
              <div
                key={log._id}
                className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={log.status === "SENT" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {log.status}
                    </Badge>
                    <span className="text-xs text-zinc-500">{log.type}</span>
                  </div>
                  <p className="text-xs text-zinc-400">Template: {log.templateName}</p>
                  <p className="text-xs text-zinc-500">Phone: {log.phone}</p>
                  {log.errorMessage && (
                    <p className="text-xs text-red-400 mt-1">Error: {log.errorMessage}</p>
                  )}
                </div>
                <span className="text-xs text-zinc-600 ml-4">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notifications List */}
      <NotificationList />
    </div>
  );
}
