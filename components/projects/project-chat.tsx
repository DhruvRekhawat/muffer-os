"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Image as ImageIcon, 
  Download,
  ExternalLink,
  Loader2,
  MessageSquare
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

interface ProjectChatProps {
  projectId: Id<"projects">;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const messages = useQuery(api.chat.getProjectMessages, { projectId });
  const sendMessage = useMutation(api.chat.sendMessage);
  const exportChat = useQuery(api.chat.exportChat, { projectId, format: "TXT" });
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSending(true);
    try {
      await sendMessage({
        projectId,
        content: message.trim(),
      });
      setMessage("");
    } finally {
      setIsSending(false);
    }
  };
  
  const handleExport = () => {
    if (!exportChat) return;
    const blob = new Blob([exportChat], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
  };
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-rose-500/10 text-rose-400";
      case "PM":
        return "bg-blue-500/10 text-blue-400";
      case "EDITOR":
        return "bg-emerald-500/10 text-emerald-400";
      default:
        return "bg-zinc-500/10 text-zinc-400";
    }
  };
  
  const isDriveLink = (text: string) => {
    return text.includes("drive.google.com") || text.includes("docs.google.com");
  };
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" }) + 
      " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  
  return (
    <Card className="h-[calc(100vh-250px)] min-h-[600px] flex flex-col bg-zinc-900/50 border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-zinc-400" />
          <h2 className="font-semibold text-zinc-200">Chat</h2>
        </div>
        {exportChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="text-zinc-400 hover:text-zinc-200"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages === undefined ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderId === user?._id;
            const isSystem = msg.type === "SYSTEM";
            
            if (isSystem) {
              return (
                <div key={msg._id} className="flex justify-center">
                  <div className="px-3 py-1.5 bg-zinc-800/50 rounded-full text-sm text-zinc-400 max-w-[80%] text-center">
                    {msg.content}
                  </div>
                </div>
              );
            }
            
            return (
              <div 
                key={msg._id} 
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${isOwnMessage ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {!isOwnMessage && (
                      <>
                        <span className="text-sm font-medium text-zinc-300">{msg.senderName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(msg.senderRole)}`}>
                          {msg.senderRole === "SUPER_ADMIN" ? "Admin" : msg.senderRole}
                        </span>
                      </>
                    )}
                    <span className="text-xs text-zinc-600">{formatTime(msg.createdAt)}</span>
                  </div>
                  
                  <div className={`rounded-2xl px-4 py-2 ${
                    isOwnMessage 
                      ? "bg-linear-to-r from-rose-500/20 to-orange-500/20 border border-rose-500/20" 
                      : "bg-zinc-800"
                  }`}>
                    {isDriveLink(msg.content) ? (
                      <a
                        href={msg.content.match(/https?:\/\/[^\s]+/)?.[0] || msg.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-rose-400 hover:text-rose-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="underline">View on Drive</span>
                      </a>
                    ) : (
                      <p className="text-zinc-200 whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
          <Button 
            type="submit" 
            disabled={isSending || !message.trim()}
            className="bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

