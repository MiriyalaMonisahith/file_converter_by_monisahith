"use client";

import React from "react";
import { Star, Sparkles, Pin } from "lucide-react";
import { ToolDefinition } from "@/types/tools";
import { ToolCard } from "./tool-card";

interface PinnedToolsProps {
  favoriteTools: ToolDefinition[];
  onSelectTool: (tool: ToolDefinition) => void;
  onToggleFavorite: (toolId: string) => void;
}

export function PinnedTools({
  favoriteTools,
  onSelectTool,
  onToggleFavorite,
}: PinnedToolsProps) {
  if (favoriteTools.length === 0) return null;

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Star className="w-3.5 h-3.5 fill-amber-500" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Pinned & Favorite Tools</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
              {favoriteTools.length}
            </span>
          </h2>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Click the star on any card to pin or unpin
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {favoriteTools.map((tool) => (
          <ToolCard
            key={`pinned-${tool.id}`}
            tool={tool}
            onSelect={onSelectTool}
            isFavorite={true}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}
