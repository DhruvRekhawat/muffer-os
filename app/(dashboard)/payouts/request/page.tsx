"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, Wallet, CreditCard, Building2 } from "lucide-react";
import Link from "next/link";

type PayoutMethod = "UPI" | "BANK";

export default function RequestPayoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const editorStats = useQuery(api.users.getEditorStats, {});
  
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayoutMethod>("UPI");
  const [upiId, setUpiId] = useState(user?.payoutDetails?.upiId || "");
  const [bankName, setBankName] = useState(user?.payoutDetails?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user?.payoutDetails?.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(user?.payoutDetails?.ifscCode || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const requestPayout = useMutation(api.payouts.requestPayout);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    try {
      await requestPayout({
        amount: parseFloat(amount),
        payoutMethod: method === "UPI" 
          ? { method: "UPI", upiId }
          : { method: "BANK", bankName, accountNumber, ifscCode },
      });
      
      router.push("/payouts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request payout");
      setIsLoading(false);
    }
  };
  
  const maxAmount = editorStats?.unlockedBalance || 0;
  
  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/payouts" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payouts
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100">Request Payout</h1>
        <p className="text-zinc-400 mt-1">Withdraw your available balance</p>
      </div>
      
      {/* Available Balance */}
      <Card className="p-4 bg-emerald-500/10 border-emerald-500/20 mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-sm text-emerald-400/80">Available Balance</p>
            <p className="text-2xl font-bold text-emerald-400">₹{maxAmount.toLocaleString()}</p>
          </div>
        </div>
      </Card>
      
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-zinc-300">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="500"
            max={maxAmount}
            className="bg-zinc-800/50 border-zinc-700 text-zinc-100 text-lg"
          />
          <p className="text-xs text-zinc-500">Minimum: ₹500 | Maximum: ₹{maxAmount.toLocaleString()}</p>
        </div>
        
        {/* Payout Method */}
        <div className="space-y-3">
          <Label className="text-zinc-300">Payout Method</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod("UPI")}
              className={`p-4 rounded-xl border text-left transition-all ${
                method === "UPI"
                  ? "bg-zinc-800 border-zinc-600"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <CreditCard className={`w-6 h-6 mb-2 ${method === "UPI" ? "text-rose-400" : "text-zinc-500"}`} />
              <p className="font-medium text-zinc-200">UPI</p>
              <p className="text-xs text-zinc-500">Instant transfer</p>
            </button>
            <button
              type="button"
              onClick={() => setMethod("BANK")}
              className={`p-4 rounded-xl border text-left transition-all ${
                method === "BANK"
                  ? "bg-zinc-800 border-zinc-600"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <Building2 className={`w-6 h-6 mb-2 ${method === "BANK" ? "text-rose-400" : "text-zinc-500"}`} />
              <p className="font-medium text-zinc-200">Bank Transfer</p>
              <p className="text-xs text-zinc-500">1-3 business days</p>
            </button>
          </div>
        </div>
        
        {/* UPI Details */}
        {method === "UPI" && (
          <div className="space-y-2">
            <Label htmlFor="upiId" className="text-zinc-300">UPI ID</Label>
            <Input
              id="upiId"
              type="text"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              required
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
            />
          </div>
        )}
        
        {/* Bank Details */}
        {method === "BANK" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName" className="text-zinc-300">Bank Name</Label>
              <Input
                id="bankName"
                type="text"
                placeholder="HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountNumber" className="text-zinc-300">Account Number</Label>
              <Input
                id="accountNumber"
                type="text"
                placeholder="1234567890"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifscCode" className="text-zinc-300">IFSC Code</Label>
              <Input
                id="ifscCode"
                type="text"
                placeholder="HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                required
                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>
        )}
        
        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Link href="/payouts" className="flex-1">
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
            disabled={isLoading || !amount || parseFloat(amount) > maxAmount}
            className="flex-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Request Payout"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

