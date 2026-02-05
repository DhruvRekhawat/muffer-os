"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export function NotificationDropdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const notifications = useQuery(api.notifications.getMyNotifications, { limit: 5 });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const router = useRouter();

  const handleNotificationClick = async (notificationId: Id<"notifications">, link?: string) => {
    await markAsRead({ notificationId });
    if (link) {
      router.push(link);
    }
  };

  const formatTimestamp = (timestamp: number, currentTime: number) => {
    const diff = currentTime - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount !== undefined && unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-rose-500 text-white text-xs border-2 border-zinc-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-zinc-900 border-zinc-800 max-h-[500px] overflow-y-auto">
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-200">Notifications</p>
            {unreadCount !== undefined && unreadCount > 0 && (
              <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        {notifications && notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className={`px-3 py-3 cursor-pointer focus:bg-zinc-800 ${
                  !notification.isRead ? "bg-zinc-800/30" : ""
                }`}
                onClick={() => handleNotificationClick(notification._id, notification.data?.link)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {formatTimestamp(notification.createdAt, now)}
                      </p>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-zinc-800" />
            <Link href="/notifications">
              <DropdownMenuItem className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer justify-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                View all notifications
              </DropdownMenuItem>
            </Link>
          </>
        ) : (
          <div className="px-3 py-8 text-center">
            <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No notifications yet</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
