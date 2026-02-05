"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const UGC_BRIEF = `UGC TEST TASK (15-30 seconds)

Read fully before you start. If you can't beat the reference, skip.

Your Goal
Create a 15-30s scroll-stopping, attention-holding UGC edit in the reference style: fast cuts, bold text emphasis, clean audio, pattern interrupts. The raw footage may be low quality on purpose. We're testing your taste + problem-solving.

What You Will Receive
Raw footage + brief, 1 reference edit link. Your submission must match the style and upgrade it.

The "Beat the Reference" Rule (Mandatory)
You must improve at least ONE of these clearly: Hook (first 1-2 seconds), Pacing (no dead air, tighter cuts), Captions (cleaner, more readable, better emphasis), Sound design (voice clarity, tasteful SFX, music ducking), Visual polish (better grade, cleaner cutout/background, better overlays). If your edit is "same level" as reference, you will not be shortlisted.

Must-Haves (Non-Negotiable)
Edit & pacing: Pattern interrupt every 2-3 seconds (text hit, b-roll, card, background swap, overlay). Jump cuts on phrases, not just pauses. Keep energy high, but clarity higher.
Text system: Large emphasis words (high readability), clean subtitle flow (no clutter), text within safe margins (no UI overlap).
Audio: Voice clear and loud enough (no music overpowering). Music ducked under voice. No clipping, no harsh distortion.

Submission: Final export link (Google Drive preferred), one-line note "What I did to beat the reference". File: UGC_TEST_<YourName>_<Date>.mp4. Export: 1080x1920 (9:16), H.264 MP4, 25/30 fps, 10-20 Mbps, 48kHz AAC.

How We Review: Guideline Accuracy, Visual + Audio Quality, Self-Reliance (each 0-5).
Instant reject: unreadable text / messy captions, music louder than voice, random effects that reduce clarity, feels slow or flat, late submission with no proactive message.`;

const CINEMATIC_BRIEF = `CINEMATIC OR COMEDIC TEST (30-45 seconds)

Read fully before you start. If you can't beat the reference, skip.

Your Goal
Create a 30-45s cinematic, storytelling-driven cut from our footage. This is not "pretty montage." It's emotion + pacing + sound in a micro-story.

What You Will Receive
Raw footage + brief (what the viewer must feel/understand), 1 reference edit link. Your submission must match the vibe and upgrade it.

The "Beat the Reference" Rule (Mandatory)
You must improve at least ONE of these clearly: Hook (first 1-2 seconds: curiosity, tension, emotion), Story clarity (beginning → turn → landing), Rhythm (cuts feel intentional, no filler), Sound design (world-building, texture, clean mix), Visual cinema polish (grade, contrast control, intentional framing/crop), Ending (strong final beat, not abrupt). If your cut is "same level" as reference, you will not be shortlisted.

Must-Haves (Non-Negotiable)
Story and pacing: Complete micro-moment (setup → shift → payoff). No wasted seconds, no filler beauty shots. Cuts follow emotion and intention.
Sound design: Clean dialogue/VO if present. Atmos + texture (subtle, not noisy). Music supports the moment, not overpowers it. Voice on top, music under, SFX tasteful.
Visual polish: Clean exposure/contrast, stabilize where needed, consistent crop/framing. Minimal text; if used, cinematic and intentional.

What NOT to do: Meme edits, trend spam, overused presets. Over-editing that kills emotion. Random SFX every cut. Heavy captions like UGC. "Cinematic" = slow shots with no story (rejected).

Submission: Final export link (Google Drive preferred), one-line note. Optional: 10-20 sec timeline screenshot showing sound design layers. File: CINE_TEST_<YourName>_<Date>.mp4. Export: 1080x1920 (9:16), H.264 MP4, 25/30 fps, 10-20 Mbps, 48kHz AAC.

How We Review: Guideline Accuracy, Visual + Audio Quality, Self-Reliance (each 0-5).
Instant reject: unclear story or weak hook, poor audio mix, over-stylized grade that looks fake, feels like a montage not a moment, late submission with no proactive message.`;

type TaskType = "UGC" | "CINEMATIC";
type DeadlineHours = 24 | 48;

interface TestTaskSelectionProps {
  onSelect: (type: TaskType, deadlineHours: DeadlineHours) => Promise<void>;
}

export function TestTaskSelection({ onSelect }: TestTaskSelectionProps) {
  const [selectedType, setSelectedType] = useState<TaskType | null>(null);
  const [deadlineHours, setDeadlineHours] = useState<DeadlineHours>(24);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) return;
    setSubmitting(true);
    try {
      await onSelect(selectedType, deadlineHours);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Choose your test task</h1>
        <p className="mt-1 text-zinc-400">
          Pick one category and your submission deadline. Only submit if you can commit.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card
          className={`cursor-pointer border-2 p-6 transition-all ${
            selectedType === "UGC"
              ? "border-rose-500/50 bg-rose-500/5"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
          onClick={() => setSelectedType("UGC")}
        >
          <h2 className="text-lg font-semibold text-zinc-200">UGC Test (15-30s)</h2>
          <p className="mt-2 text-sm text-zinc-400 line-clamp-4">
            Scroll-stopping UGC edit: fast cuts, bold text, clean audio, pattern interrupts. Beat the reference in at least one area.
          </p>
          <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
            {UGC_BRIEF}
          </pre>
        </Card>

        <Card
          className={`cursor-pointer border-2 p-6 transition-all ${
            selectedType === "CINEMATIC"
              ? "border-rose-500/50 bg-rose-500/5"
              : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
          }`}
          onClick={() => setSelectedType("CINEMATIC")}
        >
          <h2 className="text-lg font-semibold text-zinc-200">Cinematic Test (30-45s)</h2>
          <p className="mt-2 text-sm text-zinc-400 line-clamp-4">
            Storytelling-driven micro-story: emotion, pacing, sound. Not montage — a complete moment. Beat the reference.
          </p>
          <pre className="mt-4 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400">
            {CINEMATIC_BRIEF}
          </pre>
        </Card>
      </div>

      {selectedType && (
        <Card className="border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-sm font-medium text-zinc-300">Submission deadline</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Choose when you will submit. Reliability is everything here.
          </p>
          <div className="mt-4 flex gap-3">
            <Button
              variant={deadlineHours === 24 ? "default" : "outline"}
              size="sm"
              onClick={() => setDeadlineHours(24)}
              className={deadlineHours === 24 ? "bg-rose-600 hover:bg-rose-700" : "border-zinc-700"}
            >
              24 hours
            </Button>
            <Button
              variant={deadlineHours === 48 ? "default" : "outline"}
              size="sm"
              onClick={() => setDeadlineHours(48)}
              className={deadlineHours === 48 ? "bg-rose-600 hover:bg-rose-700" : "border-zinc-700"}
            >
              48 hours
            </Button>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 w-full bg-rose-600 hover:bg-rose-700 text-white"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Select ${selectedType === "UGC" ? "UGC" : "Cinematic"} task & create project`}
          </Button>
        </Card>
      )}
    </div>
  );
}
