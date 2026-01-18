"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Search, 
  Loader2,
  ShoppingCart,
  Calendar,
  DollarSign,
  User,
  Mail,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function OrdersPage() {
  const { isSuperAdmin } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  
  const orders = useQuery(api.orders.listPendingOrders);
  
  const filteredOrders = orders?.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    return (
      order.clientName?.toLowerCase().includes(searchLower) ||
      order.clientEmail?.toLowerCase().includes(searchLower) ||
      order.serviceType.toLowerCase().includes(searchLower) ||
      order.planDetails.toLowerCase().includes(searchLower)
    );
  });
  
  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }
  
  const getServiceBadge = (serviceType: string) => {
    switch (serviceType) {
      case "EditMax":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">EditMax</Badge>;
      case "ContentMax":
        return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">ContentMax</Badge>;
      case "AdMax":
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">AdMax</Badge>;
      default:
        return null;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Paid</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">In Progress</Badge>;
      case "COMPLETED":
        return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">Completed</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Orders</h1>
        <p className="text-zinc-400 mt-1">Pending orders waiting to be converted to projects</p>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-zinc-100"
          />
        </div>
      </div>
      
      {/* Content */}
      {orders === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : filteredOrders?.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-zinc-300">No pending orders</h3>
          <p className="text-zinc-500 mt-1">
            {searchQuery ? "Try a different search term" : "All orders have been converted to projects"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders?.map((order) => (
            <Link key={order._id} href={`/orders/${order._id}/start-project`}>
              <Card className="p-4 bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer h-full flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getServiceBadge(order.serviceType)}
                    {getStatusBadge(order.status)}
                  </div>
                </div>
                
                <div className="space-y-2 mb-4 flex-1">
                  {order.clientName && (
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <User className="w-4 h-4 text-zinc-500" />
                      <span>{order.clientName}</span>
                    </div>
                  )}
                  {order.clientEmail && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <Mail className="w-4 h-4 text-zinc-500" />
                      <span className="truncate">{order.clientEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <DollarSign className="w-4 h-4 text-zinc-500" />
                    <span>₹{order.totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 truncate mr-2">{order.planDetails}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
