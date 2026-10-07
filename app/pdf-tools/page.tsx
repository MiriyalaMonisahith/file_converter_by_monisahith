"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { ToolCard } from "@/components/tool-card";
import { ToolModalWrapper } from "@/components/tool-modal-wrapper";
import { TOOLS_REGISTRY, SECTIONS_CONFIG } from "@/config/tools";
import { ToolDefinition } from "@/types/tools";
import {
  FileText,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  Cpu,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PdfToolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubfilter, setSelectedSubfilter] = useState<string>("all");
  const [activeModalTool, setActiveModalTool] = useState<ToolDefinition | null>(null);

  const sectionMeta = SECTIONS_CONFIG.find((s) => s.id === "pdf")!;

  // PDF tools filtered by section and query
  const pdfTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((tool) => {
      if (tool.section !== "pdf") return false;

      const matchesSubfilter =
        selectedSubfilter === "all" ||
        (selectedSubfilter === "organize" &&
          (tool.id === "merge-pdf" || tool.id === "split-pdf" || tool.id === "rotate-pdf" || tool.id === "sign-pdf" || tool.id === "organize-pdf")) ||
        (selectedSubfilter === "security" &&
          (tool.id === "compress-pdf" || tool.id === "protect-pdf" || tool.id === "unlock-pdf" || tool.id === "watermark-pdf" || tool.id === "repair-pdf")) ||
        (selectedSubfilter === "convert" &&
          (tool.id === "html-to-pdf" || tool.id === "pdf-to-image")) ||
        (selectedSubfilter === "browser" && tool.environment === "client");

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

      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(244,63,94,0.18),rgba(0,0,0,0))]" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold tracking-wide">
            <FileText className="w-3.5 h-3.5" />
            <span>Dedicated PDF Engine &bull; 12 Tools &bull; 100% In-Browser</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Complete In-Browser{" "}
            <span className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              PDF Studio
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Merge, split, rotate, compress, protect, sign, watermark, and rearrange PDF documents. 
            Powered by WebAssembly and <strong className="text-foreground font-semibold">pdf-lib</strong> with zero server uploads.
          </p>
        </div>
      </section>

      {/* Main Tool Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Filter Pills */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {[
            { id: "all", label: "All PDF Tools (12)" },
            { id: "organize", label: "Organize & Sign" },
            { id: "security", label: "Security & Optimize" },
            { id: "convert", label: "Convert & Render" },
            { id: "browser", label: "100% In-Browser" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedSubfilter(pill.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedSubfilter === pill.id
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-[1.02]"
                  : "bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Results summary if searching */}
        {searchQuery && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
            <span>
              Showing results for &ldquo;<strong>{searchQuery}</strong>&rdquo; ({pdfTools.length} tools)
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
          {pdfTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onSelect={(t) => setActiveModalTool(t)}
            />
          ))}
        </div>

        {pdfTools.length === 0 && (
          <div className="text-center py-16 bg-card border border-border/60 rounded-3xl p-8 max-w-md mx-auto">
            <p className="text-foreground font-semibold mb-1">No PDF tools matched your search</p>
            <p className="text-xs text-muted-foreground mb-4">
              Try searching for &quot;sign&quot;, &quot;watermark&quot;, &quot;merge&quot;, or &quot;compress&quot;.
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

      {/* Privacy Guarantee Banner */}
      <section className="bg-card/40 border-t border-border/60 py-12 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm">Client-Side Isolation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every PDF operation executes directly within your local WebAssembly runtime. No documents leave your computer.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-foreground text-sm">Zero File Size Quotas</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Process multi-gigabyte or hundreds of pages without running into artificial file size thresholds or paywalls.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <Lock className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-foreground text-sm">Standard AES Encryption</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Support for robust standard PDF protection, digital signatures, and metadata preservation.
            </p>
          </div>
        </div>
      </section>

      {/* Tool Modal Wrapper */}
      <AnimatePresence>
        {activeModalTool && (
          <ToolModalWrapper
            tool={activeModalTool}
            onClose={() => setActiveModalTool(null)}
          />
        )}
      </AnimatePresence>

      <footer className="border-t border-border/50 py-8 px-4 text-center text-xs text-muted-foreground">
        <p>OpenPDF Suite &bull; Dedicated PDF Page &bull; 100% Free & Open-Source</p>
      </footer>
    </div>
  );
}
