"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Presentation,
  Table,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Zap,
  Sliders,
  Scissors,
  Lock,
  PenTool,
  Wand2,
  FileType,
} from "lucide-react";
import { TOOLS_REGISTRY } from "@/config/tools";
import { ToolDefinition } from "@/types/tools";
import { cn } from "@/lib/utils";

interface HeroSmartDropzoneProps {
  onLaunchToolWithFile: (tool: ToolDefinition, file: File) => void;
}

interface ActionSuggestion {
  toolId: string;
  label: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  gradient: string;
}

export function HeroSmartDropzone({ onLaunchToolWithFile }: HeroSmartDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute smart suggested actions based on file type
  const getSuggestionsForFile = (file: File): ActionSuggestion[] => {
    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const name = file.name.toLowerCase();

    // 1. PDF File
    if (ext === ".pdf") {
      return [
        {
          toolId: "compress-pdf",
          label: "Compress PDF",
          description: "Reduce file size while preserving high visual quality",
          badge: "Browser Only",
          icon: Sliders,
          gradient: "from-green-500 to-emerald-600",
        },
        {
          toolId: "pdf-to-word",
          label: "Convert to Word",
          description: "Transform PDF into fully editable DOCX document",
          badge: "Serverless",
          icon: FileText,
          gradient: "from-blue-600 to-cyan-600",
        },
        {
          toolId: "sign-pdf",
          label: "Sign PDF",
          description: "Draw or stamp a digital ink signature onto pages",
          badge: "Studio",
          icon: PenTool,
          gradient: "from-blue-600 to-indigo-600",
        },
        {
          toolId: "protect-pdf",
          label: "Protect with Password",
          description: "Encrypt document with standard AES encryption",
          badge: "Browser Only",
          icon: Lock,
          gradient: "from-red-600 to-rose-700",
        },
        {
          toolId: "split-pdf",
          label: "Split Pages",
          description: "Extract specific page ranges into independent PDFs",
          badge: "Browser Only",
          icon: Scissors,
          gradient: "from-amber-500 to-orange-600",
        },
        {
          toolId: "merge-pdf",
          label: "Merge PDF",
          description: "Combine this PDF with other documents in seconds",
          badge: "Browser Only",
          icon: Zap,
          gradient: "from-red-500 to-rose-600",
        },
      ];
    }

    // 2. Microsoft Word / DOCX / DOC
    if (ext === ".docx" || ext === ".doc") {
      return [
        {
          toolId: "word-to-pdf",
          label: "Convert Word to PDF",
          description: "Preserve exact typography, margins, alignments & tables",
          badge: "High Fidelity",
          icon: FileText,
          gradient: "from-blue-600 to-cyan-600",
        },
        {
          toolId: "word-to-image",
          label: "Convert Word to JPG/PNG",
          description: "Rasterize document sheets into high-res preview graphics",
          badge: "Serverless",
          icon: ImageIcon,
          gradient: "from-blue-500 to-indigo-600",
        },
        {
          toolId: "word-to-odt",
          label: "Convert Word to ODT",
          description: "Export proprietary Word into ISO-standard OpenDocument format",
          badge: "Serverless",
          icon: FileType,
          gradient: "from-teal-600 to-emerald-700",
        },
      ];
    }

    // 3. Microsoft PowerPoint / Presentations
    if (/\.(pptx?|ppsx?|pptm)$/i.test(name)) {
      return [
        {
          toolId: "ppt-to-pdf",
          label: "Convert PowerPoint to PDF",
          description: "Native PowerPoint engine with 100% exact slide matching",
          badge: "Native Engine",
          icon: Presentation,
          gradient: "from-orange-500 to-red-600",
        },
        {
          toolId: "ppt-to-image",
          label: "Export Slides as Images",
          description: "Extract every slide as high-definition standalone PNG/JPG",
          badge: "Serverless",
          icon: ImageIcon,
          gradient: "from-orange-500 to-rose-600",
        },
      ];
    }

    // 4. Microsoft Excel / Spreadsheets
    if (/\.(xlsx?|csv)$/i.test(name)) {
      return [
        {
          toolId: "excel-to-pdf",
          label: "Convert Excel to PDF",
          description: "Turn tabular data and sheets into clean, printable PDF",
          badge: "Serverless",
          icon: Table,
          gradient: "from-green-600 to-emerald-700",
        },
        {
          toolId: "excel-to-image",
          label: "Convert Excel to Images",
          description: "Rasterize sheets into standalone presentation graphics",
          badge: "Serverless",
          icon: ImageIcon,
          gradient: "from-emerald-600 to-teal-600",
        },
      ];
    }

    // 5. OpenDocument Text (.odt)
    if (ext === ".odt") {
      return [
        {
          toolId: "odt-to-pdf",
          label: "Convert ODT to PDF",
          description: "Vector-crisp rendering with full image and table support",
          badge: "Vector Engine",
          icon: FileText,
          gradient: "from-blue-600 to-indigo-700",
        },
        {
          toolId: "odt-modifier",
          label: "ODT Modifier Studio",
          description: "Edit metadata, search & replace, and customize in browser",
          badge: "Interactive",
          icon: FileText,
          gradient: "from-blue-600 to-teal-600",
        },
        {
          toolId: "odt-to-word",
          label: "Convert ODT to Word (DOCX)",
          description: "Export OpenDocument Text into editable Microsoft Word",
          badge: "Serverless",
          icon: FileType,
          gradient: "from-cyan-600 to-blue-600",
        },
      ];
    }

    // 6. Image Formats (JPG, PNG, WebP, HEIC)
    if (/\.(jpe?g|png|webp|heic|heif)$/i.test(name)) {
      return [
        {
          toolId: "photo-enhancer",
          label: "AI Photo Enhancer (4K / 8K)",
          description: "Deep pixel super-resolution, sharpen details and upscale",
          badge: "4K & 8K Super-Res",
          icon: Wand2,
          gradient: "from-amber-500 via-orange-500 to-rose-600",
        },
        {
          toolId: "image-to-pdf",
          label: "Convert Image to PDF",
          description: "Compile images into paginated, standardized PDF documents",
          badge: "Browser Only",
          icon: FileText,
          gradient: "from-rose-500 to-red-600",
        },
        {
          toolId: "image-compressor",
          label: "Compress Image",
          description: "Reduce image file size with fine-tuned quality controls",
          badge: "Studio",
          icon: Sliders,
          gradient: "from-green-500 to-emerald-600",
        },
        {
          toolId: "image-converter",
          label: "Convert Format (JPG/PNG/WebP)",
          description: "Seamlessly convert between standard raster image formats",
          badge: "Browser Only",
          icon: ImageIcon,
          gradient: "from-purple-500 to-pink-600",
        },
        {
          toolId: "blur-sensitive",
          label: "Blur Sensitive Information",
          description: "Redact faces, names, license plates, and sensitive pixels",
          badge: "Studio",
          icon: Sliders,
          gradient: "from-indigo-500 to-purple-600",
        },
      ];
    }

    // 7. Text & Markdown
    if (/\.(txt|md|markdown|html)$/i.test(name)) {
      return [
        {
          toolId: "txt-to-doc",
          label: "Convert to Document (DOCX/PDF)",
          description: "Transform plain text into formatted Word or PDF files",
          badge: "Studio",
          icon: FileText,
          gradient: "from-sky-500 to-blue-600",
        },
        {
          toolId: "markdown-converter",
          label: "Markdown Studio",
          description: "Live GitHub-flavored Markdown editor with HTML & PDF export",
          badge: "Studio",
          icon: FileText,
          gradient: "from-indigo-500 to-violet-600",
        },
        {
          toolId: "word-counter",
          label: "Word Counter & Stats",
          description: "Calculate words, characters, reading time & readability",
          badge: "Studio",
          icon: Sliders,
          gradient: "from-blue-500 to-cyan-600",
        },
      ];
    }

    // Default Fallback
    return [
      {
        toolId: "merge-pdf",
        label: "Merge PDF Suite",
        description: "Combine documents into single PDF file",
        badge: "Fast",
        icon: Zap,
        gradient: "from-red-500 to-rose-600",
      },
    ];
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleActionClick = (toolId: string) => {
    if (!selectedFile) return;
    const tool = TOOLS_REGISTRY.find((t) => t.id === toolId);
    if (tool) {
      onLaunchToolWithFile(tool, selectedFile);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-4">
      {/* Smart Dropzone Card */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={cn(
          "relative group rounded-3xl border-2 transition-all duration-300 p-6 sm:p-8 cursor-pointer overflow-hidden",
          isDragOver
            ? "border-rose-500 bg-rose-500/5 shadow-2xl shadow-rose-500/20 scale-[1.01]"
            : selectedFile
            ? "border-border/80 bg-card shadow-xl cursor-default"
            : "border-dashed border-border/80 hover:border-foreground/30 bg-card/60 hover:bg-card/90 shadow-lg hover:shadow-xl"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 bg-gradient-to-b from-rose-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          {!selectedFile ? (
            /* Idle Drop Target */
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/25 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                  Drag & Drop <span className="text-rose-500">any file</span> to auto-detect tools
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Drop a PDF, Word DOCX, PowerPoint PPTX, Excel sheet, image, or text to get instant workflow suggestions.
                </p>
              </div>

              {/* Supported Format Tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {["PDF", "DOCX", "PPTX", "XLSX", "ODT", "PNG/JPG", "HEIC", "MD"].map((fmt) => (
                  <span
                    key={fmt}
                    className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-muted/80 border border-border/60 text-muted-foreground"
                  >
                    {fmt}
                  </span>
                ))}
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>100% In-Memory Privacy &bull; Zero Server Retention</span>
              </div>
            </motion.div>
          ) : (
            /* File Dropped: Smart Workflow Action Panel */
            <motion.div
              key="detected"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Header: File Details & Reset Button */}
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate max-w-xs sm:max-w-md">
                        {selectedFile.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        {formatFileSize(selectedFile.size)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Select a recommended action below to launch:
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs flex items-center gap-1 shrink-0"
                  title="Choose another file"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Change file</span>
                </button>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getSuggestionsForFile(selectedFile).map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.toolId}
                      onClick={() => handleActionClick(action.toolId)}
                      className="group/action text-left p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-rose-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm bg-gradient-to-br",
                              action.gradient
                            )}
                          >
                            <Icon className="w-4 h-4 stroke-[2]" />
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-background border border-border/60 text-muted-foreground">
                            {action.badge}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover/action:text-rose-500 transition-colors">
                          {action.label}
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {action.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/40 text-[11px] font-semibold text-rose-500 flex items-center justify-between">
                        <span>Launch & Process</span>
                        <ArrowRight className="w-3 h-3 group-hover/action:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
