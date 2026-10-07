"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
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
  ArrowRight,
  Cpu,
  Server,
  Sparkles,
} from "lucide-react";
import { ToolDefinition } from "@/types/tools";
import { cn } from "@/lib/utils";

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
};

interface ToolCardProps {
  tool: ToolDefinition;
  onSelect?: (tool: ToolDefinition) => void;
}

export function ToolCard({ tool, onSelect }: ToolCardProps) {
  const IconComponent = ICON_MAP[tool.iconName] || FileText;

  const content = (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      className="group relative h-full flex flex-col justify-between p-6 rounded-2xl bg-card border border-border/70 hover:border-foreground/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden cursor-pointer"
    >
      {/* Top subtle glow on hover */}
      <div
        className={cn(
          "absolute -right-12 -top-12 w-32 h-32 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-30 bg-gradient-to-br",
          tool.accentColor
        )}
      />

      <div>
        {/* Header: Icon & Environment Badge */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
              tool.accentColor
            )}
          >
            <IconComponent className="w-6 h-6 stroke-[2]" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.environment === "client" ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Cpu className="w-3 h-3" />
                Browser Only
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Server className="w-3 h-3" />
                Serverless
              </span>
            )}
          </div>
        </div>

        {/* Title & Short Description */}
        <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors flex items-center justify-between">
          <span>{tool.name}</span>
          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-muted-foreground" />
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {tool.shortDesc}
        </p>
      </div>

      {/* Footer tags */}
      <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground/80">
        <span className="font-mono text-[11px] uppercase tracking-wider font-medium text-foreground/70">
          Output: {tool.outputFormat}
        </span>
        <span className="text-[11px] font-medium text-primary group-hover:underline">
          Open tool &rarr;
        </span>
      </div>
    </motion.div>
  );

  if (onSelect) {
    return <div onClick={() => onSelect(tool)}>{content}</div>;
  }

  return (
    <Link href={tool.route} className="block h-full">
      {content}
    </Link>
  );
}
