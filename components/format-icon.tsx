"use client";

import React from "react";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FileCode,
  File as FileGeneric,
  Layers,
  Scissors,
  RotateCw,
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
  Smartphone,
  Sliders,
  Crop,
  EyeOff,
  Palette,
  Wand2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Format metadata for transition badges
export const CONVERTER_FORMATS: Record<string, { from: string; to: string; fromColor: string; toColor: string }> = {
  "word-to-pdf": {
    from: "DOCX",
    to: "PDF",
    fromColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    toColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  "excel-to-pdf": {
    from: "XLSX",
    to: "PDF",
    fromColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    toColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  "ppt-to-pdf": {
    from: "PPTX",
    to: "PDF",
    fromColor: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    toColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  "pdf-to-word": {
    from: "PDF",
    to: "DOCX",
    fromColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    toColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  "odt-to-pdf": {
    from: "ODT",
    to: "PDF",
    fromColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    toColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  "pdf-to-odt": {
    from: "PDF",
    to: "ODT",
    fromColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    toColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  },
  "odt-to-word": {
    from: "ODT",
    to: "DOCX",
    fromColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    toColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  "word-to-odt": {
    from: "DOCX",
    to: "ODT",
    fromColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    toColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  },
  "word-to-image": {
    from: "DOCX",
    to: "IMG",
    fromColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    toColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  "excel-to-image": {
    from: "XLSX",
    to: "IMG",
    fromColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    toColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  "ppt-to-image": {
    from: "PPTX",
    to: "IMG",
    fromColor: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    toColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  "odt-to-image": {
    from: "ODT",
    to: "IMG",
    fromColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    toColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  "txt-to-doc": {
    from: "TXT",
    to: "DOCX",
    fromColor: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    toColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  "markdown-converter": {
    from: "MD",
    to: "PDF",
    fromColor: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    toColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  "html-to-pdf": {
    from: "HTML",
    to: "PDF",
    fromColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    toColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  "pdf-to-image": {
    from: "PDF",
    to: "JPG",
    fromColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    toColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  "pdf-to-text": {
    from: "PDF",
    to: "TXT",
    fromColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    toColor: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
  "image-to-pdf": {
    from: "IMG",
    to: "PDF",
    fromColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    toColor: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
  "heic-to-jpg": {
    from: "HEIC",
    to: "JPG",
    fromColor: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
    toColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  "image-converter": {
    from: "IMG",
    to: "CONV",
    fromColor: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    toColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
};

/**
 * Renders the prominent format transition symbol: e.g. [DOCX] ➔ [PDF]
 */
export function ConverterFormatBadge({ toolId, size = "md" }: { toolId: string; size?: "sm" | "md" | "lg" }) {
  const meta = CONVERTER_FORMATS[toolId];
  if (!meta) return null;

  const textClass =
    size === "sm"
      ? "text-[10px] px-1.5 py-0.5"
      : size === "lg"
      ? "text-xs px-2.5 py-1 font-bold"
      : "text-[11px] px-2 py-0.5";

  return (
    <div className="inline-flex items-center gap-1.5 font-mono font-bold select-none">
      <span className={cn("rounded-md border shadow-xs tracking-wider", textClass, meta.fromColor)}>
        {meta.from}
      </span>
      <span className="text-muted-foreground/80 font-bold">&rarr;</span>
      <span className={cn("rounded-md border shadow-xs tracking-wider", textClass, meta.toColor)}>
        {meta.to}
      </span>
    </div>
  );
}

/**
 * Returns authentic icon + badge styling for any file name or extension
 */
export function FormatIcon({
  nameOrExt,
  className = "w-4 h-4",
}: {
  nameOrExt: string;
  className?: string;
}) {
  const ext = (nameOrExt.split(".").pop() || nameOrExt).toLowerCase().replace(/^\./, "");

  // Word
  if (["docx", "doc", "dotx", "dot"].includes(ext)) {
    return <FileText className={cn("text-blue-600 dark:text-blue-400", className)} />;
  }
  // Excel
  if (["xlsx", "xls", "csv", "tsv", "ods"].includes(ext)) {
    return <FileSpreadsheet className={cn("text-emerald-600 dark:text-emerald-400", className)} />;
  }
  // PowerPoint
  if (["pptx", "ppt", "ppsx", "odp"].includes(ext)) {
    return <Presentation className={cn("text-orange-500 dark:text-orange-400", className)} />;
  }
  // PDF
  if (ext === "pdf") {
    return <FileText className={cn("text-rose-600 dark:text-rose-400", className)} />;
  }
  // ODT
  if (["odt", "ott"].includes(ext)) {
    return <FileText className={cn("text-cyan-600 dark:text-cyan-400", className)} />;
  }
  // Images
  if (["jpg", "jpeg", "png", "webp", "heic", "gif", "svg", "bmp"].includes(ext)) {
    return <ImageIcon className={cn("text-purple-600 dark:text-purple-400", className)} />;
  }
  // Plain Text & Markdown
  if (["txt", "md", "markdown", "log"].includes(ext)) {
    return <FileCode className={cn("text-slate-600 dark:text-slate-400", className)} />;
  }

  return <FileGeneric className={cn("text-muted-foreground", className)} />;
}

/**
 * Word Emblem Icon with clean 'W' identifier
 */
function WordSymbolIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      {/* Crisp W mark */}
      <path d="M7 13l2 5 2-4 2 4 2-5" strokeWidth="2.2" stroke="currentColor" fill="none" />
    </svg>
  );
}

/**
 * Excel Emblem Icon with clean spreadsheet grid
 */
function ExcelSymbolIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      {/* Crisp spreadsheet grid */}
      <line x1="8" y1="13" x2="16" y2="13" strokeWidth="2" />
      <line x1="8" y1="17" x2="16" y2="17" strokeWidth="2" />
      <line x1="12" y1="13" x2="12" y2="17" strokeWidth="2" />
    </svg>
  );
}

/**
 * ODT Emblem Icon with clean OpenDocument text badge
 */
function OdtSymbolIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      {/* ODT text lines */}
      <line x1="8" y1="13" x2="16" y2="13" strokeWidth="2" />
      <line x1="8" y1="17" x2="13" y2="17" strokeWidth="2" />
      <circle cx="15.5" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * PowerPoint Emblem Icon with clean presentation slide screen
 */
function PptSymbolIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      {/* Pie / Chart slide emblem */}
      <path d="M7 10h4v-3" strokeWidth="2" />
      <circle cx="12" cy="10" r="3" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * High-fidelity tool symbol icon selector
 */
export function ToolSymbolIcon({
  toolId,
  iconName,
  className = "w-6 h-6",
}: {
  toolId: string;
  iconName: string;
  className?: string;
}) {
  // Specific converter symbols
  if (["word-to-pdf", "pdf-to-word", "word-to-image", "word-to-odt"].includes(toolId)) {
    return <WordSymbolIcon className={className} />;
  }
  if (["excel-to-pdf", "excel-to-image"].includes(toolId)) {
    return <ExcelSymbolIcon className={className} />;
  }
  if (["ppt-to-pdf", "ppt-to-image"].includes(toolId)) {
    return <PptSymbolIcon className={className} />;
  }
  if (["odt-to-pdf", "pdf-to-odt", "odt-to-word", "odt-modifier", "odt-to-image"].includes(toolId)) {
    return <OdtSymbolIcon className={className} />;
  }

  // Fallback to standard Lucide icons
  const map: Record<string, React.ElementType> = {
    Layers,
    Scissors,
    RotateCw,
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
    Smartphone,
    Sliders,
    Crop,
    EyeOff,
    Palette,
    Wand2,
    Table: ExcelSymbolIcon,
    Presentation: PptSymbolIcon,
    FileSpreadsheet: ExcelSymbolIcon,
    FileText: WordSymbolIcon,
  };

  const Component = map[iconName] || FileText;
  return <Component className={className} />;
}
