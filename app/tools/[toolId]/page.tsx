import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { TOOLS_REGISTRY, SECTIONS_CONFIG } from "@/config/tools";
import { ToolDefinition } from "@/types/tools";
import { FileUploader } from "@/components/file-uploader";
import { ToolCard } from "@/components/tool-card";

// Studio components
import { CaseConverterStudio } from "@/components/studios/case-converter-studio";
import { WordCounterStudio } from "@/components/studios/word-counter-studio";
import { TextDiffStudio } from "@/components/studios/text-diff-studio";
import { CleanTextStudio } from "@/components/studios/clean-text-studio";
import { EncoderDecoderStudio } from "@/components/studios/encoder-decoder-studio";
import { SignPdfStudio } from "@/components/studios/sign-pdf-studio";
import { WatermarkPdfStudio } from "@/components/studios/watermark-pdf-studio";
import { OrganizePdfStudio } from "@/components/studios/organize-pdf-studio";
import { RepairPdfStudio } from "@/components/studios/repair-pdf-studio";
import { HtmlToPdfStudio } from "@/components/studios/html-to-pdf-studio";
import { TxtToDocStudio } from "@/components/studios/txt-to-doc-studio";
import { MarkdownStudio } from "@/components/studios/markdown-studio";
import { ImageCompressorStudio } from "@/components/studios/image-compressor-studio";
import { ImageResizerStudio } from "@/components/studios/image-resizer-studio";
import { BlurSensitiveStudio } from "@/components/studios/blur-sensitive-studio";
import { WatermarkImageStudio } from "@/components/studios/watermark-image-studio";
import { PaletteExtractorStudio } from "@/components/studios/palette-extractor-studio";
import { OdtModifierStudio } from "@/components/studios/odt-modifier-studio";

import {
  ChevronRight,
  ShieldCheck,
  Cpu,
  Server,
  Zap,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface PageProps {
  params: {
    toolId: string;
  };
}

export function generateStaticParams() {
  return TOOLS_REGISTRY.map((t) => ({
    toolId: t.id,
  }));
}

export default function ToolDedicatedPage({ params }: PageProps) {
  const tool = TOOLS_REGISTRY.find((t) => t.id === params.toolId);

  if (!tool) {
    notFound();
  }

  const sectionMeta = SECTIONS_CONFIG.find((s) => s.id === tool.section);

  const relatedTools = TOOLS_REGISTRY.filter(
    (t) => t.section === tool.section && t.id !== tool.id
  ).slice(0, 4);

  const renderToolBody = () => {
    switch (tool.id) {
      // PDF Studios
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

      // Document Studios
      case "odt-modifier":
        return <OdtModifierStudio />;
      case "txt-to-doc":
        return <TxtToDocStudio />;
      case "markdown-converter":
        return <MarkdownStudio />;

      // Text Studios
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

      // Image Studios
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

      // Standard Uploader
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
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar />

      {/* Breadcrumb Navigation */}
      <div className="border-b border-border/40 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          {sectionMeta && (
            <>
              <Link
                href={sectionMeta.route}
                className="hover:text-foreground transition-colors"
              >
                {sectionMeta.title}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </>
          )}
          <span className="font-semibold text-foreground truncate">{tool.name}</span>
        </div>
      </div>

      {/* Main Tool Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Tool Header */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              {sectionMeta?.title || "Utility"}
            </span>
            {tool.environment === "client" ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Cpu className="w-3.5 h-3.5" />
                Browser Only Engine
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Server className="w-3.5 h-3.5" />
                Serverless Sandboxed
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
            {tool.name}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {tool.description}
          </p>
        </div>

        {/* Interactive Studio / Uploader Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border/80 shadow-xl overflow-hidden">
          {renderToolBody()}
        </div>

        {/* Feature Highlights & Guarantees */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
          <div className="p-5 rounded-2xl bg-card/60 border border-border/60 space-y-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h4 className="font-bold text-foreground text-sm">100% Private & Secure</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No files are stored or indexed. Conversions occur locally or in ephemeral sandboxes that auto-purge immediately.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card/60 border border-border/60 space-y-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h4 className="font-bold text-foreground text-sm">No Daily Limits</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Unlimited document size, free batch conversions, and zero subscriptions or credit card requirements.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card/60 border border-border/60 space-y-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h4 className="font-bold text-foreground text-sm">High-Fidelity Output</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Preserves styles, tables, vector fonts, and layout geometry according to strict document standards.
            </p>
          </div>
        </div>

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                More {sectionMeta?.title || "Related"} Tools
              </h3>
              {sectionMeta && (
                <Link
                  href={sectionMeta.route}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View all &rarr;
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {relatedTools.map((t) => (
                <ToolCard key={t.id} tool={t} />
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-8 px-4 text-center text-xs text-muted-foreground mt-12">
        <p>OpenPDF Suite &bull; {tool.name} &bull; 100% Free & Open-Source</p>
      </footer>
    </div>
  );
}
