"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Cpu, Server } from "lucide-react";
import { ToolDefinition } from "@/types/tools";
import { FileUploader } from "@/components/file-uploader";

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

interface ToolModalWrapperProps {
  tool: ToolDefinition | null;
  onClose: () => void;
}

export function ToolModalWrapper({ tool, onClose }: ToolModalWrapperProps) {
  if (!tool) return null;

  const renderToolBody = () => {
    switch (tool.id) {
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

      // Standard batch & file conversion tools
      default:
        return (
          <FileUploader
            tool={tool}
            multiple={true}
            actionButtonText={`Process with ${tool.name}`}
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

        {/* Modal Header */}
        <div className="mb-6 space-y-1.5 pr-8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
              {tool.section ? `${tool.section.toUpperCase()} UTILITY` : tool.category.replace("-", " ")}
            </span>
            {tool.environment === "client" ? (
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
            {tool.name}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Body */}
        {renderToolBody()}
      </motion.div>
    </div>
  );
}
