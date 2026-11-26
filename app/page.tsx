"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ToolCard } from "@/components/tool-card";
import { ToolModalWrapper } from "@/components/tool-modal-wrapper";
import { HeroSmartDropzone } from "@/components/hero-smart-dropzone";
import { PinnedTools } from "@/components/pinned-tools";
import { useFavorites } from "@/hooks/use-favorites";
import { TOOLS_REGISTRY, CATEGORIES, SECTIONS_CONFIG, TOTAL_TOOLS_COUNT, SECTION_TOOL_COUNTS } from "@/config/tools";
import { ToolDefinition, MainSection } from "@/types/tools";
import {
  ShieldCheck,
  Zap,
  Lock,
  Heart,
  Sparkles,
  ArrowRight,
  FileText,
  Presentation,
  Type,
  ImagePlus,
  FolderSync,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

const SECTION_ICONS: Record<string, React.ElementType> = {
  FileText,
  Presentation,
  Type,
  ImagePlus,
};

export default function HomePage() {
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeModalTool, setActiveModalTool] = useState<ToolDefinition | null>(null);
  const [modalInitialFile, setModalInitialFile] = useState<File | null>(null);

  const { favorites, toggleFavorite, isFavorite, isLoaded } = useFavorites();

  const favoriteTools = useMemo(() => {
    if (!isLoaded) return [];
    return favorites
      .map((id) => TOOLS_REGISTRY.find((t) => t.id === id))
      .filter((t): t is ToolDefinition => Boolean(t));
  }, [favorites, isLoaded]);

  const handleLaunchToolWithFile = (tool: ToolDefinition, file: File) => {
    setModalInitialFile(file);
    setActiveModalTool(tool);
  };

  // Filter tools based on section and search query (strictly no intermixing)
  const filteredTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((tool) => {
      const matchesSection =
        selectedSection === "all" || tool.section === selectedSection;

      const matchesSearch =
        searchQuery.trim() === "" ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.outputFormat.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSection && matchesSearch;
    });
  }, [selectedSection, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Top Navbar with Cmd+K Command Palette */}
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-border/40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(244,63,94,0.18),rgba(0,0,0,0))]" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Source Suite &bull; {TOTAL_TOOLS_COUNT} Tools Across {SECTIONS_CONFIG.length} Categories &bull; Zero Paywalls</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Every PDF, Document, Text & Image tool,{" "}
            <span className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              100% Free Forever
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            All the utilities you need from commercial conversion platforms, re-engineered to run{" "}
            <strong className="text-foreground font-semibold">directly in your browser</strong>. 
            No daily quotas, no hidden subscriptions, and your private files never leave your device.
          </p>

          {/* Interactive Instant-Drop Hero Drop Zone */}
          <div className="pt-2 max-w-2xl mx-auto w-full text-left">
            <HeroSmartDropzone onLaunchToolWithFile={handleLaunchToolWithFile} />
          </div>
        </div>
      </section>

      {/* 4 Category Showcase Cards */}
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTIONS_CONFIG.map((sec) => {
            const Icon = SECTION_ICONS[sec.iconName] || FileText;
            const toolCount = TOOLS_REGISTRY.filter((t) => t.section === sec.id).length;
            return (
              <Link
                key={sec.id}
                href={sec.route}
                className="group p-5 rounded-2xl bg-card/90 backdrop-blur border border-border/70 hover:border-foreground/30 hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${sec.accentGradient} flex items-center justify-center text-white shadow-lg ${
                        sec.id === "pdf"
                          ? "shadow-rose-500/30 ring-1 ring-rose-500/30"
                          : sec.id === "document"
                          ? "shadow-blue-500/30 ring-1 ring-blue-500/30"
                          : sec.id === "text"
                          ? "shadow-purple-500/30 ring-1 ring-purple-500/30"
                          : "shadow-emerald-500/30 ring-1 ring-emerald-500/30"
                      } border border-white/20 dark:border-white/10 group-hover:scale-105 transition-transform duration-300`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.25] text-white drop-shadow-sm" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
                      {toolCount} Tools
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                    <span>{sec.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {sec.shortDesc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 text-[11px] font-semibold text-primary flex items-center justify-between">
                  <span>Explore dedicated page &rarr;</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Main Tools Catalog */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Pinned & Favorite Tools Row */}
        {favoriteTools.length > 0 && (
          <PinnedTools
            favoriteTools={favoriteTools}
            onSelectTool={(tool) => {
              setModalInitialFile(null);
              setActiveModalTool(tool);
            }}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* Category Filter Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {[
            { id: "all", label: `All Tools (${TOTAL_TOOLS_COUNT})` },
            { id: "pdf", label: `PDF Tools (${SECTION_TOOL_COUNTS.pdf})` },
            { id: "document", label: `Document & ODT (${SECTION_TOOL_COUNTS.document})` },
            { id: "text", label: `Text Tools (${SECTION_TOOL_COUNTS.text})` },
            { id: "image", label: `Image Tools (${SECTION_TOOL_COUNTS.image})` },
          ].map((cat) => {
            const isActive = selectedSection === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedSection(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-[1.02]"
                    : "bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/60"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Results Summary (if query active) */}
        {searchQuery && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
            <span>
              Showing results for &ldquo;<strong>{searchQuery}</strong>&rdquo; ({filteredTools.length} tools found)
            </span>
            <button
              onClick={() => setSearchQuery("")}
              className="text-primary hover:underline text-xs"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Tool Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isFavorite={isFavorite(tool.id)}
              onToggleFavorite={toggleFavorite}
              onSelect={(t) => {
                setModalInitialFile(null);
                setActiveModalTool(t);
              }}
            />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-16 bg-card border border-border/60 rounded-3xl p-8 max-w-md mx-auto">
            <p className="text-foreground font-semibold mb-1">No tools matched your search</p>
            <p className="text-xs text-muted-foreground mb-4">
              Try searching for &quot;merge&quot;, &quot;watermark&quot;, &quot;case&quot;, &quot;compress&quot;, or &quot;word&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedSection("all");
              }}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Feature / Privacy Trust Section */}
      <section className="bg-card/40 border-t border-border/60 py-16 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Why OpenPDF Suite is different from commercial converters
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Engineered with privacy-first client-side technology and modern WebAssembly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-card border border-border/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">Client-Side Privacy</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                PDF merging, signing, watermarking, text operations, and image processing execute via WebAssembly inside your browser. No files are transmitted to servers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">No Paywalls & No Daily Limits</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Convert and process as many documents as you need without encountering countdown timers, monthly quotas, or paywalls requiring a credit card.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/60 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <FolderSync className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-foreground text-base">1-Hour Server Auto-Purge</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For complex documents requiring headless LibreOffice engines, files are processed in ephemeral sandboxes and automatically purged immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Tool Modal / Drop Zone Popup */}
      <AnimatePresence>
        {activeModalTool && (
          <ToolModalWrapper
            tool={activeModalTool}
            initialFile={modalInitialFile}
            onClose={() => {
              setActiveModalTool(null);
              setModalInitialFile(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4 text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1">
          OpenPDF Suite &bull; Free, Open-Source &bull; Built with Next.js, Tailwind CSS & WebAssembly
        </p>
      </footer>
    </div>
  );
}
