"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";

export function NotificationList() {
  const notifications = useQuery(api.notifications.getMyNotifications, { limit: 50 });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const router = useRouter();
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleNotificationClick = async (notificationId: Id<"notifications">, link?: string) => {
    await markAsRead({ notificationId });
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const formatTimestamp = (timestamp: number, currentTime: number) => {
    const date = new Date(timestamp);
    const diff = currentTime - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!notifications) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-200">Notifications</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="border-zinc-700 text-zinc-300"
          >
            {isMarkingAll ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-2" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-12 text-center bg-zinc-900/50 border-zinc-800">
          <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">No notifications yet</p>
          <p className="text-sm text-zinc-600 mt-1">
            You&apos;ll be notified about important updates here
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification._id}
              className={`p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors ${
                !notification.isRead ? "bg-zinc-800/30 border-rose-500/20" : "bg-zinc-900/50 border-zinc-800"
              }`}
              onClick={() => handleNotificationClick(notification._id, notification.data?.link)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  !notification.isRead ? "bg-rose-500/20" : "bg-zinc-800"
                }`}>
                  <Bell className={`w-5 h-5 ${!notification.isRead ? "text-rose-400" : "text-zinc-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.isRead ? "text-zinc-100" : "text-zinc-300"}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-zinc-400 mt-0.5">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-zinc-600">
                      {formatTimestamp(notification.createdAt, now)}
                    </p>
                    {notification.data?.amount && (
                      <>
                        <span className="text-zinc-700">•</span>
                        <Badge variant="outline" className="text-xs border-emerald-500/20 text-emerald-400">
                          ₹{notification.data.amount}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
