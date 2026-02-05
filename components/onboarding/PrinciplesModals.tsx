"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Zap,
  ShieldCheck,
  Target,
  Clock,
  CalendarCheck,
  MessageCircleQuestion,
  FileCheck,
  RefreshCw,
  MessageSquareOff,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const PRINCIPLES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Zap,
    title: "Speed. Clarity. Ownership.",
    description: "We ship outcomes, not hours. If you want hourly safety, this is not for you.",
  },
  {
    icon: ShieldCheck,
    title: "We sell trust",
    description: "Every cut is a promise kept.",
  },
  {
    icon: Target,
    title: "Outcomes over effort",
    description: "10 minutes or 10 hours, we pay for delivery quality and speed.",
  },
  {
    icon: Clock,
    title: "Assigned means the clock starts",
    description: "Once you accept, TAT starts. No \"I started later\" excuses.",
  },
  {
    icon: CalendarCheck,
    title: "Start early. Always.",
    description: "Deadlines kill people who begin at the deadline.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Assume nothing. Ask fast.",
    description: "If the brief is unclear, ask within the first 20% of the timeline, not the last 20%.",
  },
  {
    icon: FileCheck,
    title: "Follow the brief like a contract",
    description: "Typos, missed guidelines, wrong format, wrong refs = rework on you.",
  },
  {
    icon: RefreshCw,
    title: "Revisions are not free labor",
    description: "Two revision cycles included. Extra revisions paid only for real scope change.",
  },
  {
    icon: MessageSquareOff,
    title: "No ghosting. No drama.",
    description: "If you go silent, you fail the job even if the cut is decent.",
  },
  {
    icon: CheckCircle2,
    title: "Done means approved",
    description: "Deliverable = accepted export link + clean file hygiene + notes.",
  },
];

interface PrinciplesModalsProps {
  onComplete: () => Promise<void>;
}

export function PrinciplesModals({ onComplete }: PrinciplesModalsProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const current = PRINCIPLES[step];
  const Icon = current.icon;
  const isLast = step === PRINCIPLES.length - 1;

  const handleNext = async () => {
    if (isLast) {
      setSubmitting(true);
      try {
        await onComplete();
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 p-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/95 p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Principle ${step + 1} of ${PRINCIPLES.length}`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <Icon className="h-8 w-8" />
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {step + 1} of {PRINCIPLES.length}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-zinc-100">
            {current.title}
          </h2>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            {current.description}
          </p>
          <Button
            onClick={handleNext}
            disabled={submitting}
            className="mt-8 w-full bg-rose-600 hover:bg-rose-700 text-white"
          >
            {submitting ? "..." : isLast ? "I understand — Continue" : "I understand"}
          </Button>
        </div>
      </div>
    </div>
  );
}
