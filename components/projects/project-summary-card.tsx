"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Edit2, FileText, Loader2, X } from "lucide-react";

interface ProjectSummaryCardProps {
  projectId: Id<"projects">;
}

export function ProjectSummaryCard({ projectId }: ProjectSummaryCardProps) {
  const { user } = useAuth();
  const project = useQuery(api.projects.getProjectForCurrentUser, { projectId });
  const updateProject = useMutation(api.projects.updateProject);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canManage =
    user?.role === "SUPER_ADMIN" ||
    (user?.role === "PM" && project && user._id === project.pmId);

  const urlRegex = useMemo(() => /(https?:\/\/[^\s]+|www\.[^\s]+)/g, []);

  const normalizeUrl = (raw: string) => {
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("www.")) return `https://${raw}`;
    return raw;
  };

  const renderTextWithLinks = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      const parts = line.split(urlRegex);
      return (
        <p
          key={lineIdx}
          className="text-sm text-zinc-300 whitespace-pre-wrap wrap-break-word"
        >
          {parts.map((part, idx) => {
            if (part.match(urlRegex)) {
              const href = normalizeUrl(part);
              const label = href.replace(/^https?:\/\//, "");
              const display = label.length > 48 ? `${label.slice(0, 48)}…` : label;
              return (
                <a
                  key={`${lineIdx}-${idx}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-400 hover:text-rose-300 underline underline-offset-2"
                  aria-label={`Open link: ${label}`}
                >
                  {display}
                </a>
              );
            }
            return <span key={`${lineIdx}-${idx}`}>{part}</span>;
          })}
        </p>
      );
    });
  };

  if (project === undefined) {
    return (
      <Card className="p-6 bg-zinc-900/50 border-zinc-800">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      </Card>
    );
  }

  if (!project) return null;

  const hasSummary = Boolean(project.summary && project.summary.trim().length > 0);
  if (!hasSummary && !canManage) return null;

  return (
    <Card className="p-6 bg-zinc-900/50 border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-zinc-400 mt-1" />
          <div>
            <p className="text-sm font-semibold text-zinc-200">
              Project summary / instructions
            </p>
            <p className="text-xs text-zinc-500">
              {project.summaryUpdatedAt
                ? `Updated ${new Date(project.summaryUpdatedAt).toLocaleString()}`
                : "Set by PM/Admin"}
            </p>
          </div>
        </div>

        {canManage && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(project.summary ?? "");
              setIsEditing(true);
            }}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a readable summary / instructions here. Paste links and they’ll become clickable."
            className="bg-zinc-900 border-zinc-700 text-zinc-100 min-h-[160px]"
          />
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setIsSaving(true);
                try {
                  const next = draft.trim();
                  await updateProject({
                    projectId,
                    summary: next ? next : undefined,
                  });
                  setIsEditing(false);
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setDraft("");
              }}
              disabled={isSaving}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      ) : project.summary ? (
        <div className="mt-3 space-y-2">{renderTextWithLinks(project.summary)}</div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">No summary set yet.</p>
      )}
    </Card>
  );
}

