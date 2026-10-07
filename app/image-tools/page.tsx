"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { ToolCard } from "@/components/tool-card";
import { ToolModalWrapper } from "@/components/tool-modal-wrapper";
import { TOOLS_REGISTRY, SECTIONS_CONFIG } from "@/config/tools";
import { ToolDefinition } from "@/types/tools";
import {
  ImagePlus,
  ShieldCheck,
  Zap,
  Cpu,
  Palette,
  EyeOff,
  Crop,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

export default function ImageToolsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubfilter, setSelectedSubfilter] = useState<string>("all");
  const [activeModalTool, setActiveModalTool] = useState<ToolDefinition | null>(null);

  const imageTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((tool) => {
      if (tool.section !== "image") return false;

      const matchesSubfilter =
        selectedSubfilter === "all" ||
        (selectedSubfilter === "optimize" && (tool.id === "image-compressor" || tool.id === "image-resizer")) ||
        (selectedSubfilter === "convert" && (tool.id === "image-converter" || tool.id === "heic-to-jpg" || tool.id === "image-to-pdf")) ||
        (selectedSubfilter === "creative" && (tool.id === "blur-sensitive" || tool.id === "watermark-image" || tool.id === "palette-extractor"));

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
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.18),rgba(0,0,0,0))]" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide">
            <ImagePlus className="w-3.5 h-3.5" />
            <span>Hardware-Accelerated Canvas &bull; 8 Image Utilities &bull; Zero Cloud Upload</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
            Hardware-Accelerated{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Image Graphics Lab
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Compress JPG/PNG/WebP photos, decode Apple HEIC containers, resize to social media dimensions, 
            redact sensitive areas with blur/pixelation, apply watermarks, and extract color palettes in-browser.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Filters */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {[
            { id: "all", label: "All Image Tools (8)" },
            { id: "optimize", label: "Compress & Resize" },
            { id: "convert", label: "Format Converters" },
            { id: "creative", label: "Redact, Watermark & Palette" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedSubfilter(pill.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedSubfilter === pill.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]"
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
              Showing results for &ldquo;<strong>{searchQuery}</strong>&rdquo; ({imageTools.length} tools)
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
          {imageTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onSelect={(t) => setActiveModalTool(t)}
            />
          ))}
        </div>

        {imageTools.length === 0 && (
          <div className="text-center py-16 bg-card border border-border/60 rounded-3xl p-8 max-w-md mx-auto">
            <p className="text-foreground font-semibold mb-1">No image tools matched your search</p>
            <p className="text-xs text-muted-foreground mb-4">
              Try searching for &quot;compress&quot;, &quot;resize&quot;, &quot;heic&quot;, or &quot;palette&quot;.
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
            <Cpu className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-foreground text-sm">GPU / Canvas Accelerated</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Decodes graphics through native browser pipelines and multi-threaded Web Workers for immediate real-time rendering.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <EyeOff className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-foreground text-sm">Offline Redaction Privacy</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When obscuring sensitive data or blur-brushing identities, the pixels are modified entirely locally before export.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-border/60 space-y-2">
            <ShieldCheck className="w-5 h-5 text-teal-500" />
            <h3 className="font-bold text-foreground text-sm">Lossless & High Quality</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fine-tune JPEG and WebP quantization rates with precision sliders to reach the sweet spot of crisp quality and lightweight bytes.
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
        <p>OpenPDF Suite &bull; Dedicated Image Tools Page &bull; 100% Free & Open-Source</p>
      </footer>
    </div>
  );
}
