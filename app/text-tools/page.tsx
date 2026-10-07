"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { ToolCard } from "@/components/tool-card";
import { ToolModalWrapper } from "@/components/tool-modal-wrapper";
import { TOOLS_REGISTRY, SECTIONS_CONFIG } from "@/config/tools";
import { ToolDefinition } from "@/types/tools";
import {
  Type,
  ShieldCheck,
  Zap,
  Cpu,
  GitCompare,
  Binary,
  Hash,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

export default function TextToolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubfilter, setSelectedSubfilter] = useState<string>("all");
  const [activeModalTool, setActiveModalTool] = useState<ToolDefinition | null>(null);

  const textTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((tool) => {
      if (tool.section !== "text") return false;

      const matchesSubfilter =
        selectedSubfilter === "all" ||
        (selectedSubfilter === "format" && (tool.id === "case-converter" || tool.id === "clean-text")) ||
        (selectedSubfilter === "analytics" && (tool.id === "word-counter" || tool.id === "text-diff")) ||
        (selectedSubfilter === "encoder" && tool.id === "encoder-decoder") ||
        (selectedSubfilter === "pdf-text" && tool.id === "pdf-to-text");

      const matchesSearch =
        searchQuery.trim() === "" ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSubfilter && matchesSearch;
    });
  }, [selectedSubfilter, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(168,85,247,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(168,85,247,0.18),rgba(0,0,0,0))]" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold tracking-wide">
            <Type className="w-3.5 h-3.5" />
            <span>Developer & Copywriter Utilities &bull; 100% In-Browser &bull; Live Analytics</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Instant Client-Side{" "}
            <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Text Toolkit
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Convert case styling, calculate real-time reading times and character stats, compare revisions 
            with side-by-side diffs, clean whitespace and duplicate lines, or encode Base64 and URLs.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Filters */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {[
            { id: "all", label: "All Text Tools (6)" },
            { id: "format", label: "Case & Cleaner" },
            { id: "analytics", label: "Stats & Diff Checker" },
            { id: "encoder", label: "Base64 & URL Encoder" },
            { id: "pdf-text", label: "PDF to Text" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedSubfilter(pill.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedSubfilter === pill.id
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/25 scale-[1.02]"
                  : "bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
            <span>
              Showing results for &ldquo;<strong>{searchQuery}</strong>&rdquo; ({textTools.length} tools)
            </span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-primary hover:underline text-xs"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {textTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onSelect={(t) => setActiveModalTool(t)}
            />
          ))}
        </div>

        {textTools.length === 0 && (
          <div className="text-center py-16 bg-card border border-border/60 rounded-3xl p-8 max-w-md mx-auto">
            <p className="text-foreground font-semibold mb-1">No text tools matched your search</p>
            <p className="text-xs text-muted-foreground mb-4">
              Try searching for &quot;case&quot;, &quot;diff&quot;, &quot;base64&quot;, or &quot;counter&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSubfilter("all");
              }}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Features Banner */}
      <section className="bg-card/40 border-t border-border/60 py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <Cpu className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-foreground text-sm">Real-Time Reactive Updates</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every keystroke calculates instant word analytics, case transformations, and diff highlighting without page reloads.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm">Sensitive Strings Stay Local</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              API keys, JWT payloads, and confidential text snippets are processed entirely inside browser JavaScript memory.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-foreground text-sm">One-Click Clipboard Workflows</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instant copy buttons, formatting presets, and clean export mechanisms engineered for developer speed.
            </p>
          </div>
        </div>
      </section>

      {/* Modal */}
      <AnimatePresence>
        {activeModalTool && (
          <ToolModalWrapper
            tool={activeModalTool}
            onClose={() => setActiveModalTool(null)}
          />
        )}
      </AnimatePresence>

      <footer className="border-t border-border/50 py-8 px-4 text-center text-xs text-muted-foreground">
        <p>OpenPDF Suite &bull; Dedicated Text Tools Page &bull; 100% Free & Open-Source</p>
      </footer>
    </div>
  );
}
