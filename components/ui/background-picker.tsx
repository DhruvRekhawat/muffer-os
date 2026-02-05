"use client";

import { useState } from "react";
import { Check } from "lucide-react";

// Curated presets: gradient CSS or image URL
const GRADIENTS = [
  { id: "rose-orange", label: "Rose", value: "linear-gradient(135deg, #f43f5e 0%, #f97316 100%)" },
  { id: "blue-purple", label: "Blue", value: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" },
  { id: "emerald-cyan", label: "Emerald", value: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)" },
  { id: "amber-rose", label: "Amber", value: "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)" },
  { id: "slate-zinc", label: "Slate", value: "linear-gradient(135deg, #475569 0%, #52525b 100%)" },
  { id: "violet-fuchsia", label: "Violet", value: "linear-gradient(135deg, #7c3aed 0%, #d946ef 100%)" },
  { id: "sky-indigo", label: "Sky", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" },
  { id: "teal-emerald", label: "Teal", value: "linear-gradient(135deg, #14b8a6 0%, #22c55e 100%)" },
];

const SOLID_COLORS = [
  { id: "zinc-800", value: "#27272a" },
  { id: "zinc-700", value: "#3f3f46" },
  { id: "rose-900", value: "#881337" },
  { id: "blue-900", value: "#1e3a8a" },
  { id: "emerald-900", value: "#064e3b" },
  { id: "violet-900", value: "#4c1d95" },
];

// Curated free-to-use images (Unsplash-style URLs - use source that allows hotlinking or host locally)
const IMAGES = [
  { id: "img-1", url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80", label: "Gradient" },
  { id: "img-2", url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80", label: "Abstract" },
  { id: "img-3", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80", label: "Blur" },
  { id: "img-4", url: "https://images.unsplash.com/photo-1557682224-5b8590e9ba58?w=800&q=80", label: "Pastel" },
  { id: "img-5", url: "https://images.unsplash.com/photo-1557683304-673a23048d34?w=800&q=80", label: "Dark" },
  { id: "img-6", url: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=800&q=80", label: "Aurora" },
];

interface BackgroundPickerProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  className?: string;
}

export function BackgroundPicker({ value, onChange, className = "" }: BackgroundPickerProps) {
  const [activeTab, setActiveTab] = useState<"gradients" | "colors" | "images">("gradients");

  const handleSelect = (val: string, isImage: boolean) => {
    onChange(isImage ? val : val);
  };

  return (
    <div className={className}>
      <div className="flex gap-1 p-1 bg-zinc-800/50 rounded-lg mb-3">
        <button
          type="button"
          onClick={() => setActiveTab("gradients")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "gradients" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Gradients
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("colors")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "colors" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Colors
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("images")}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === "images" ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Images
        </button>
      </div>

      {activeTab === "gradients" && (
        <div className="grid grid-cols-4 gap-2">
          {GRADIENTS.map((g) => {
            const isSelected = value === g.value;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleSelect(g.value, false)}
                className="relative h-10 rounded-lg border-2 overflow-hidden transition-transform hover:scale-105"
                style={{ background: g.value, borderColor: isSelected ? "var(--rose-500)" : "transparent" }}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "colors" && (
        <div className="grid grid-cols-6 gap-2">
          {SOLID_COLORS.map((c) => {
            const isSelected = value === c.value;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c.value, false)}
                className="relative h-10 rounded-lg border-2 transition-transform hover:scale-105"
                style={{ backgroundColor: c.value, borderColor: isSelected ? "var(--rose-500)" : "transparent" }}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === "images" && (
        <div className="grid grid-cols-3 gap-2">
          {IMAGES.map((img) => {
            const isSelected = value === img.url;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => handleSelect(img.url, true)}
                className="relative aspect-video rounded-lg border-2 overflow-hidden bg-zinc-800 transition-transform hover:scale-[1.02]"
                style={{ borderColor: isSelected ? "var(--rose-500)" : "transparent" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="w-5 h-5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Clear cover
        </button>
      )}
    </div>
  );
}
