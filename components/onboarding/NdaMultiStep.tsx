"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const NDA_CHECKBOXES = [
  "I understand Muffer is output-based pay, not hourly",
  "I understand Accept = TAT clock starts",
  "I understand 2 revision cycles are included per project",
  "I understand extra revision payout applies only for client scope change",
  "I understand revisions due to missed guidelines/typos are unpaid",
  "I understand uncommunicated delay of 60+ minutes triggers reliability deductions",
  "I understand extension requests must be made 2+ hours before deadline",
  "I understand \"done\" means approved final delivery, not first export",
  "I agree to confidentiality and licensed/original assets only",
];

interface NdaMultiStepProps {
  userName: string;
  onSign: (fullName: string) => Promise<void>;
}

export function NdaMultiStep({ userName, onSign }: NdaMultiStepProps) {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [fullName, setFullName] = useState(userName?.trim() ?? "");
  const [submitting, setSubmitting] = useState(false);

  const isLastCheckbox = step === NDA_CHECKBOXES.length - 1;
  const isFinalStep = step === NDA_CHECKBOXES.length; // name + sign
  const currentText = NDA_CHECKBOXES[step];

  const canProceed = checked;
  const canSign = isFinalStep && fullName.trim().length > 0;

  const handleNext = () => {
    if (isLastCheckbox) {
      setStep((s) => s + 1);
      setChecked(false);
    } else {
      setStep((s) => s + 1);
      setChecked(false);
    }
  };

  const handleSign = async () => {
    if (!canSign || submitting) return;
    setSubmitting(true);
    try {
      await onSign(fullName.trim());
    } finally {
      setSubmitting(false);
    }
  };

  if (isFinalStep) {
    return (
      <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-400">
          All terms acknowledged. Enter your full legal name to sign the agreement.
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Full name</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full legal name"
            className="bg-zinc-800 border-zinc-700 text-zinc-100"
          />
        </div>
        <Button
          onClick={handleSign}
          disabled={!canSign || submitting}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign agreement"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <p className="text-xs font-medium text-zinc-500">
        Step {step + 1} of {NDA_CHECKBOXES.length}
      </p>
      <p className="text-lg font-medium text-zinc-200">
        {currentText}
      </p>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="nda-check"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-rose-600 focus:ring-rose-500"
        />
        <label htmlFor="nda-check" className="flex-1 cursor-pointer text-sm text-zinc-400">
          I understand and agree
        </label>
      </div>
      <Button
        onClick={handleNext}
        disabled={!canProceed}
        className="w-full bg-rose-600 hover:bg-rose-700 text-white"
      >
        I understand
      </Button>
    </div>
  );
}
