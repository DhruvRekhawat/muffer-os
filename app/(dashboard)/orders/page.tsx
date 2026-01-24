"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePermissions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Loader2,
  ShoppingCart,
  Calendar,
  DollarSign,
  User,
  Mail,
  ArrowRight,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function OrdersPage() {
  const router = useRouter();
  const { isSuperAdmin } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualForm, setManualForm] = useState({
    clientName: "",
    clientEmail: "",
    serviceType: "EditMax" as "EditMax" | "ContentMax" | "AdMax" | "Other",
    planDetails: "",
    brief: "",
    totalPrice: "",
  });

  const orders = useQuery(api.orders.listPendingOrders);
  const createManualOrder = useMutation(api.orders.createManualOrder);
  
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
      case "Other":
        return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20">Other</Badge>;
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

  const handleManualSubmit = async () => {
    setManualError("");
    const price = parseFloat(manualForm.totalPrice);
    if (!manualForm.planDetails.trim()) {
      setManualError("Plan details are required");
      return;
    }
    if (!manualForm.brief.trim()) {
      setManualError("Brief is required");
      return;
    }
    if (isNaN(price) || price <= 0) {
      setManualError("Enter a valid total price");
      return;
    }
    setManualSubmitting(true);
    try {
      const { orderId } = await createManualOrder({
        clientName: manualForm.clientName.trim() || undefined,
        clientEmail: manualForm.clientEmail.trim() || undefined,
        serviceType: manualForm.serviceType,
        planDetails: manualForm.planDetails.trim(),
        brief: manualForm.brief.trim(),
        totalPrice: price,
      });
      setShowManualForm(false);
      setManualForm({ clientName: "", clientEmail: "", serviceType: "EditMax", planDetails: "", brief: "", totalPrice: "" });
      router.push(`/orders/${orderId}/start-project`);
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setManualSubmitting(false);
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
        <Button
          onClick={() => {
            setShowManualForm(true);
            setManualError("");
          }}
          className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add manual order
        </Button>
      </div>

      {/* Manual order modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !manualSubmitting && setShowManualForm(false)} 
          />
          <Card className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 shadow-xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Add manual order</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-zinc-200"
                  onClick={() => !manualSubmitting && setShowManualForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {manualError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {manualError}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-zinc-300">Client name (optional)</Label>
                <Input
                  value={manualForm.clientName}
                  onChange={(e) => setManualForm((f) => ({ ...f, clientName: e.target.value }))}
                  placeholder="John Doe"
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Client email (optional)</Label>
                <Input
                  type="email"
                  value={manualForm.clientEmail}
                  onChange={(e) => setManualForm((f) => ({ ...f, clientEmail: e.target.value }))}
                  placeholder="john@example.com"
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Service type</Label>
                <Select
                  value={manualForm.serviceType}
                  onValueChange={(v) => setManualForm((f) => ({ ...f, serviceType: v as "EditMax" | "ContentMax" | "AdMax" | "Other" }))}
                >
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-100 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EditMax">EditMax</SelectItem>
                    <SelectItem value="ContentMax">ContentMax</SelectItem>
                    <SelectItem value="AdMax">AdMax</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Plan details</Label>
                <Input
                  value={manualForm.planDetails}
                  onChange={(e) => setManualForm((f) => ({ ...f, planDetails: e.target.value }))}
                  placeholder="e.g. Standard Plan, 5 videos, Add-ons: Voiceover"
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Brief</Label>
                <Textarea
                  value={manualForm.brief}
                  onChange={(e) => setManualForm((f) => ({ ...f, brief: e.target.value }))}
                  placeholder="Project description and instructions..."
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100 min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Total price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={manualForm.totalPrice}
                  onChange={(e) => setManualForm((f) => ({ ...f, totalPrice: e.target.value }))}
                  placeholder="0"
                  className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300"
                  onClick={() => !manualSubmitting && setShowManualForm(false)}
                  disabled={manualSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
                  onClick={handleManualSubmit}
                  disabled={manualSubmitting}
                >
                  {manualSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create order"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      
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
