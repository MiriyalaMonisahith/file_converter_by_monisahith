"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  Cpu,
  Server,
  CornerDownLeft,
  Command,
  FileText,
  Layers,
  Scissors,
  RotateCw,
  ImagePlus,
  Table,
  Presentation,
  Images,
  FileEdit,
  FileCode,
  FileImage,
  Smartphone,
  Minimize2,
  Lock,
  Unlock,
  PenTool,
  Stamp,
  Grid,
  Wrench,
  Code,
  BookOpen,
  Type,
  Hash,
  GitCompare,
  Eraser,
  Binary,
  Sliders,
  Crop,
  EyeOff,
  Palette,
  FileType,
  Wand2,
} from "lucide-react";
import { TOOLS_REGISTRY, SECTIONS_CONFIG } from "@/config/tools";
import { ToolDefinition } from "@/types/tools";
import { cn } from "@/lib/utils";
import { ToolSymbolIcon, ConverterFormatBadge } from "./format-icon";

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  Scissors,
  RotateCw,
  ImagePlus,
  FileText,
  Table,
  Presentation,
  Images,
  FileEdit,
  FileCode,
  FileImage,
  Smartphone,
  Minimize2,
  Lock,
  Unlock,
  PenTool,
  Stamp,
  Grid,
  Wrench,
  Code,
  BookOpen,
  Type,
  Hash,
  GitCompare,
  Eraser,
  Binary,
  Sliders,
  Crop,
  EyeOff,
  Palette,
  Sparkles,
  FileType,
  Wand2,
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool?: (tool: ToolDefinition) => void;
}

const RECENT_TOOLS_KEY = "openpdf_recent_tools";

export function CommandPalette({ isOpen, onClose, onSelectTool }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentToolIds, setRecentToolIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent tools from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(RECENT_TOOLS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setRecentToolIds(parsed.slice(0, 5));
          }
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filtered tools based on fuzzy search
  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // If no query, return recent tools first, then popular tools
      const recents = recentToolIds
        .map((id) => TOOLS_REGISTRY.find((t) => t.id === id))
        .filter(Boolean) as ToolDefinition[];
      
      const recentsSet = new Set(recents.map((t) => t.id));
      const popular = TOOLS_REGISTRY.filter((t) => !recentsSet.has(t.id)).slice(0, 8);
      return [...recents, ...popular];
    }

    // Match by name, description, category, extensions, output format
    return TOOLS_REGISTRY.filter((tool) => {
      if (tool.name.toLowerCase().includes(q)) return true;
      if (tool.shortDesc.toLowerCase().includes(q)) return true;
      if (tool.description.toLowerCase().includes(q)) return true;
      if (tool.outputFormat.toLowerCase().includes(q)) return true;
      if (tool.section.toLowerCase().includes(q)) return true;

      // Match extension search e.g. ".heic", "docx", ".odt"
      if (tool.acceptedFormats) {
        const formatsStr = JSON.stringify(tool.acceptedFormats).toLowerCase();
        if (formatsStr.includes(q)) return true;
      }
      return false;
    });
  }, [query, recentToolIds]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredTools.length, query]);

  // Save tool to recent history and navigate
  const handleSelect = (tool: ToolDefinition) => {
    try {
      const updated = [tool.id, ...recentToolIds.filter((id) => id !== tool.id)].slice(0, 6);
      setRecentToolIds(updated);
      localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    onClose();
    if (onSelectTool) {
      onSelectTool(tool);
    } else {
      router.push(tool.route);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTools.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % Math.max(1, filteredTools.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredTools[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden z-10 flex flex-col max-h-[75vh]"
          onKeyDown={handleKeyDown}
        >
          {/* Search Header */}
          <div className="flex items-center px-4 py-3.5 border-b border-border/60 gap-3 bg-muted/20">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a tool name, category, or file format (e.g. .heic, docx, compress)..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-muted border border-border/70 rounded">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
            {!query && recentToolIds.length > 0 && (
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Recent & Suggested Tools</span>
              </div>
            )}

            {filteredTools.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <p className="text-sm font-semibold text-foreground">No matching tools found</p>
                <p className="text-xs">
                  Try searching for &quot;pdf&quot;, &quot;docx&quot;, &quot;heic&quot;, &quot;watermark&quot;, or &quot;4k&quot;.
                </p>
              </div>
            ) : (
              filteredTools.map((tool, idx) => {
                const IconComponent = ICON_MAP[tool.iconName] || FileText;
                const isSelected = idx === selectedIndex;
                const isRecent = !query && recentToolIds.includes(tool.id);

                return (
                  <div
                    key={tool.id}
                    data-index={idx}
                    onClick={() => handleSelect(tool)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 text-sm group",
                      isSelected
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm"
                        : "hover:bg-muted/50 text-foreground border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Tool Icon Badge with authentic symbol */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br shadow-sm",
                          tool.accentColor
                        )}
                      >
                        <ToolSymbolIcon toolId={tool.id} iconName={tool.iconName} className="w-4 h-4 stroke-[2]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                            {tool.name}
                          </span>
                          <ConverterFormatBadge toolId={tool.id} size="sm" />
                          {isRecent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                              Recent
                            </span>
                          )}
                          <span
                            className={cn(
                              "text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border",
                              tool.section === "pdf"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : tool.section === "document"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                : tool.section === "text"
                                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            )}
                          >
                            {tool.section}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          {tool.shortDesc}
                        </p>
                      </div>
                    </div>

                    {/* Environment Pill & Enter Indicator */}
                    <div className="flex items-center gap-2.5 shrink-0 pl-2">
                      {tool.environment === "client" ? (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <Cpu className="w-2.5 h-2.5" />
                          Browser
                        </span>
                      ) : (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Server className="w-2.5 h-2.5" />
                          Serverless
                        </span>
                      )}

                      <span
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground transition-opacity",
                          isSelected ? "opacity-100 text-rose-600 dark:text-rose-400 font-bold" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Palette Footer */}
          <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">↑</kbd>
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">↵</kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">esc</kbd>
                close
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground/80">
              {filteredTools.length} tools available
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
