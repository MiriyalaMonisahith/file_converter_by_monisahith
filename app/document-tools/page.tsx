"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { ToolCard } from "@/components/tool-card";
import { ToolModalWrapper } from "@/components/tool-modal-wrapper";
import { useFavorites } from "@/hooks/use-favorites";
import { TOOLS_REGISTRY, SECTIONS_CONFIG, SECTION_TOOL_COUNTS } from "@/config/tools";
import { ToolDefinition } from "@/types/tools";
import { cn } from "@/lib/utils";
import {
  Presentation,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Server,
  Cpu,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

export default function DocumentToolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubfilter, setSelectedSubfilter] = useState<string>("all");
  const [activeModalTool, setActiveModalTool] = useState<ToolDefinition | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites();

  const documentTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((tool) => {
      if (tool.section !== "document") return false;

      const matchesSubfilter =
        selectedSubfilter === "all" ||
        (selectedSubfilter === "odt-suite" &&
          (tool.id === "odt-modifier" ||
            tool.id === "odt-to-pdf" ||
            tool.id === "pdf-to-odt" ||
            tool.id === "odt-to-word" ||
            tool.id === "word-to-odt" ||
            tool.id === "odt-to-image")) ||
        (selectedSubfilter === "office-pdf" &&
          (tool.id === "word-to-pdf" ||
            tool.id === "excel-to-pdf" ||
            tool.id === "ppt-to-pdf" ||
            tool.id === "odt-to-pdf")) ||
        (selectedSubfilter === "pdf-to-word" &&
          (tool.id === "pdf-to-word" || tool.id === "pdf-to-odt")) ||
        (selectedSubfilter === "office-img" &&
          (tool.id === "word-to-image" ||
            tool.id === "excel-to-image" ||
            tool.id === "ppt-to-image" ||
            tool.id === "odt-to-image")) ||
        (selectedSubfilter === "markdown" &&
          (tool.id === "txt-to-doc" || tool.id === "markdown-converter"));

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
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(59,130,246,0.18),rgba(0,0,0,0))]" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide">
            <FileText className="w-3.5 h-3.5" />
            <span>Document & Office Suite &bull; {SECTION_TOOL_COUNTS.document} Tools &bull; Word, Excel, PPT, ODT, TXT & Markdown</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Professional Document{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
              Conversion & Modification Suite
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Convert and modify OpenDocument Text (.odt), Microsoft Word, Excel spreadsheets, PowerPoint presentations, TXT files, and 
            Markdown documents to crisp PDFs, images, or editable DOCX/ODT files with vector fidelity.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Filters with signature colors for every subfilter */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {[
            {
              id: "all",
              label: `All Document Tools (${SECTION_TOOL_COUNTS.document})`,
              activeColor: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 border-transparent",
              idleColor: "bg-blue-500/5 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25 hover:border-blue-500/40",
            },
            {
              id: "odt-suite",
              label: "ODT Suite & Studio (6)",
              activeColor: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25 border-transparent",
              idleColor: "bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/25 hover:border-cyan-500/40",
            },
            {
              id: "office-pdf",
              label: "Office to PDF",
              activeColor: "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 border-transparent",
              idleColor: "bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25 hover:border-rose-500/40",
            },
            {
              id: "pdf-to-word",
              label: "PDF to Word / ODT",
              activeColor: "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/25 border-transparent",
              idleColor: "bg-sky-500/5 hover:bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25 hover:border-sky-500/40",
            },
            {
              id: "office-img",
              label: "Office to Images",
              activeColor: "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/25 border-transparent",
              idleColor: "bg-purple-500/5 hover:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/25 hover:border-purple-500/40",
            },
            {
              id: "markdown",
              label: "TXT & Markdown",
              activeColor: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 border-transparent",
              idleColor: "bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:border-emerald-500/40",
            },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedSubfilter(pill.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap border transition-all duration-200",
                selectedSubfilter === pill.id ? cn(pill.activeColor, "scale-[1.02]") : pill.idleColor
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
            <span>
              Showing results for &ldquo;<strong>{searchQuery}</strong>&rdquo; ({documentTools.length} tools)
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
          {documentTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isFavorite={isFavorite(tool.id)}
              onToggleFavorite={toggleFavorite}
              onSelect={(t) => setActiveModalTool(t)}
            />
          ))}
        </div>

        {documentTools.length === 0 && (
          <div className="text-center py-16 bg-card border border-border/60 rounded-3xl p-8 max-w-md mx-auto">
            <p className="text-foreground font-semibold mb-1">No document tools matched your search</p>
            <p className="text-xs text-muted-foreground mb-4">
              Try searching for &quot;word&quot;, &quot;excel&quot;, &quot;ppt&quot;, or &quot;markdown&quot;.
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

      {/* Trust & Architecture Banner */}
      <section className="bg-card/40 border-t border-border/60 py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <Server className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-foreground text-sm">Ephemeral Sandboxing</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Complex Word and Excel conversions run in transient isolated sandboxes that are wiped immediately after conversion.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm">Vector-Accurate Formatting</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Maintains table borders, custom spreadsheet formulas, PowerPoint master slide styles, and exact font metrics.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm">No Document Retention</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Files are never indexed, analyzed, or stored. Complete data confidentiality guaranteed.
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
        <p>OpenPDF Suite &bull; Dedicated Document Page &bull; 100% Free & Open-Source</p>
      </footer>
    </div>
  );
}
