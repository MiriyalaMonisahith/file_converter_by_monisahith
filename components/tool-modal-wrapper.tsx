"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Cpu, Server } from "lucide-react";
import { ToolDefinition } from "@/types/tools";
import { TOOLS_REGISTRY } from "@/config/tools";
import { FileUploader } from "@/components/file-uploader";
import { ToolSymbolIcon, ConverterFormatBadge } from "./format-icon";
import { cn } from "@/lib/utils";

// Studio components
import { CaseConverterStudio } from "./studios/case-converter-studio";
import { WordCounterStudio } from "./studios/word-counter-studio";
import { TextDiffStudio } from "./studios/text-diff-studio";
import { CleanTextStudio } from "./studios/clean-text-studio";
import { EncoderDecoderStudio } from "./studios/encoder-decoder-studio";
import { SignPdfStudio } from "./studios/sign-pdf-studio";
import { WatermarkPdfStudio } from "./studios/watermark-pdf-studio";
import { OrganizePdfStudio } from "./studios/organize-pdf-studio";
import { RepairPdfStudio } from "./studios/repair-pdf-studio";
import { HtmlToPdfStudio } from "./studios/html-to-pdf-studio";
import { TxtToDocStudio } from "./studios/txt-to-doc-studio";
import { MarkdownStudio } from "./studios/markdown-studio";
import { ImageCompressorStudio } from "./studios/image-compressor-studio";
import { ImageResizerStudio } from "./studios/image-resizer-studio";
import { BlurSensitiveStudio } from "./studios/blur-sensitive-studio";
import { WatermarkImageStudio } from "./studios/watermark-image-studio";
import { PaletteExtractorStudio } from "./studios/palette-extractor-studio";
import { OdtModifierStudio } from "./studios/odt-modifier-studio";
import { PhotoEnhancerStudio } from "./studios/photo-enhancer-studio";

interface ToolModalWrapperProps {
  tool: ToolDefinition | null;
  initialFile?: File | null;
  onClose: () => void;
}

export function ToolModalWrapper({ tool, initialFile, onClose }: ToolModalWrapperProps) {
  const [activeTool, setActiveTool] = useState<ToolDefinition | null>(tool);
  const [currentFile, setCurrentFile] = useState<File | null>(initialFile || null);

  useEffect(() => {
    setActiveTool(tool);
  }, [tool]);

  useEffect(() => {
    setCurrentFile(initialFile || null);
  }, [initialFile]);

  if (!activeTool) return null;

  const handleChainWorkflow = (targetToolId: string, outputBlob?: Blob, fileName?: string) => {
    const nextTool = TOOLS_REGISTRY.find((t) => t.id === targetToolId);
    if (nextTool) {
      if (outputBlob) {
        const nextFile = new File([outputBlob], fileName || "document.pdf", {
          type: outputBlob.type || "application/pdf",
        });
        setCurrentFile(nextFile);
      }
      setActiveTool(nextTool);
    }
  };

  const renderToolBody = () => {
    switch (activeTool.id) {
      // PDF Interactive Studios
      case "sign-pdf":
        return <SignPdfStudio />;
      case "watermark-pdf":
        return <WatermarkPdfStudio />;
      case "organize-pdf":
        return <OrganizePdfStudio />;
      case "repair-pdf":
        return <RepairPdfStudio />;
      case "html-to-pdf":
        return <HtmlToPdfStudio />;

      // Document Interactive Studios
      case "odt-modifier":
        return <OdtModifierStudio />;
      case "txt-to-doc":
        return <TxtToDocStudio />;
      case "markdown-converter":
        return <MarkdownStudio />;

      // Text Interactive Studios
      case "case-converter":
        return <CaseConverterStudio />;
      case "word-counter":
        return <WordCounterStudio />;
      case "text-diff":
        return <TextDiffStudio />;
      case "clean-text":
        return <CleanTextStudio />;
      case "encoder-decoder":
        return <EncoderDecoderStudio />;

      // Image Interactive Studios
      case "image-compressor":
        return <ImageCompressorStudio />;
      case "image-resizer":
        return <ImageResizerStudio />;
      case "blur-sensitive":
        return <BlurSensitiveStudio />;
      case "watermark-image":
        return <WatermarkImageStudio />;
      case "palette-extractor":
        return <PaletteExtractorStudio />;
      case "photo-enhancer":
        return <PhotoEnhancerStudio />;

      // Standard batch & file conversion tools
      default:
        return (
          <FileUploader
            key={`${activeTool.id}-${currentFile?.name || "new"}`}
            tool={activeTool}
            multiple={true}
            initialFile={currentFile}
            onChainWorkflow={handleChainWorkflow}
            actionButtonText={`Process with ${activeTool.name}`}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-4xl bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with Dedicated Tool Symbol */}
        <div className="mb-6 flex items-start gap-4 pr-8">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br flex-shrink-0",
              activeTool.accentColor
            )}
          >
            <ToolSymbolIcon toolId={activeTool.id} iconName={activeTool.iconName} className="w-7 h-7 stroke-[2]" />
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                {activeTool.section ? `${activeTool.section.toUpperCase()} UTILITY` : activeTool.category.replace("-", " ")}
              </span>
              <ConverterFormatBadge toolId={activeTool.id} size="sm" />
              {activeTool.environment === "client" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Cpu className="w-3 h-3" />
                  Browser Only
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Server className="w-3 h-3" />
                  Serverless
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {activeTool.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {activeTool.description}
            </p>
          </div>
        </div>

        {/* Body */}
        {renderToolBody()}
      </motion.div>
    </div>
  );
}
