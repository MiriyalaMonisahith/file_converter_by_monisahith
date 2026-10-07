"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useDropzone, DropzoneOptions } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  File as FileIcon,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Cpu,
  ArrowRight,
  RefreshCw,
  Download,
  Trash2,
  FileArchive,
  Layers,
  Split,
  Zap,
  Gauge,
  Sliders,
  TrendingDown,
  Sparkles,
  Lock,
} from "lucide-react";
import { UploadedFileItem, ToolDefinition, CompressionPreset } from "@/types/tools";
import { formatFileSize, cn } from "@/lib/utils";
import {
  mergePDFs,
  rotateSinglePDF,
  compressSinglePDF,
  splitSinglePDF,
  imageToSinglePDF,
  imagesToMergedPDF,
  convertSingleImage,
  convertOfficeDocumentToPDF,
  generateZipArchive,
  pdfToImages,
  pdfToText,
  pdfToWord,
  officeToImages,
  protectSinglePDF,
  unlockSinglePDF,
} from "@/lib/engines/client-pdf";

interface FileUploaderProps {
  tool?: ToolDefinition;
  multiple?: boolean;
  maxFiles?: number;
  acceptedFormats?: Record<string, string[]>;
  actionButtonText?: string;
}

// Concurrency limit for multi-file batch conversions
const CONCURRENT_WORKERS = 4;

export function FileUploader({
  tool,
  multiple = true,
  maxFiles,
  acceptedFormats = { "application/pdf": [".pdf"] },
  actionButtonText,
}: FileUploaderProps) {
  const [fileItems, setFileItems] = useState<UploadedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Speed & Size Optimization Presets (only for compress-pdf or image-to-pdf)
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>("balanced");
  const showCompressionPreset = tool?.id === "compress-pdf" || tool?.id === "image-to-pdf";

  // Dedicated Tool Controls: Image target format & PDF password
  const [targetImageFormat, setTargetImageFormat] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const isImageConverter = tool?.id === "image-converter";

  const [pdfPassword, setPdfPassword] = useState<string>("password123");
  const isProtectTool = tool?.id === "protect-pdf";

  // Mode: strictly 'merge' for merge-pdf, toggleable only for image-to-pdf
  const isMergeOnly = tool?.id === "merge-pdf";
  const allowsMergeToggle = tool?.id === "image-to-pdf";
  const [mergeMode, setMergeMode] = useState<"merge" | "separate">(
    isMergeOnly ? "merge" : "separate"
  );

  // Output for merged mode
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedDownloadUrl, setMergedDownloadUrl] = useState<string | null>(null);
  const [mergedSavingsPercent, setMergedSavingsPercent] = useState<number | null>(null);
  const [batchDurationSec, setBatchDurationSec] = useState<number | null>(null);

  // Output for batch zip
  const [isZipping, setIsZipping] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      setGlobalError(null);

      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        const errorMsg =
          rejection?.errors[0]?.code === "file-invalid-type"
            ? `Unsupported file format for "${rejection.file.name}".`
            : rejection?.errors[0]?.message || "Could not upload file.";
        setGlobalError(errorMsg);
      }

      if (acceptedFiles.length === 0) return;

      const newItems: UploadedFileItem[] = acceptedFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        status: "idle",
        progress: 0,
      }));

      setFileItems((prev) => (multiple ? [...prev, ...newItems] : newItems));
    },
    [multiple]
  );

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: tool?.acceptedFormats || acceptedFormats,
    multiple: true,
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone(dropzoneOptions);

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFileItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAllFiles = () => {
    setFileItems([]);
    setGlobalError(null);
    if (mergedDownloadUrl) URL.revokeObjectURL(mergedDownloadUrl);
    setMergedBlob(null);
    setMergedDownloadUrl(null);
    setMergedSavingsPercent(null);
    setBatchDurationSec(null);
  };

  // Process a single file based strictly on tool?.id (NO intermixing)
  const processSingleItem = async (
    item: UploadedFileItem
  ): Promise<{ blob: Blob; fileName: string }> => {
    const rawFile = item.file;
    const baseName = rawFile.name.replace(/\.[^/.]+$/, "");
    const toolId = tool?.id;

    // 1. Office to PDF converters: Word to PDF, Excel to PDF, PowerPoint to PDF
    if (toolId === "word-to-pdf" || toolId === "excel-to-pdf" || toolId === "ppt-to-pdf") {
      const blob = await convertOfficeDocumentToPDF(rawFile);
      return { blob, fileName: `${baseName}.pdf` };
    }

    // 2. Office to Images converters: Word to JPG, Excel to JPG, PPT to JPG
    if (toolId === "word-to-image" || toolId === "excel-to-image" || toolId === "ppt-to-image") {
      const parts = await officeToImages(rawFile);
      if (parts.length === 1) {
        return { blob: parts[0].blob, fileName: parts[0].name };
      }
      const zipBlob = await generateZipArchive(parts);
      return { blob: zipBlob, fileName: `${baseName}-images.zip` };
    }

    // 3. PDF to Word (DOC format)
    if (toolId === "pdf-to-word") {
      const blob = await pdfToWord(rawFile);
      return { blob, fileName: `${baseName}.doc` };
    }

    // 4. PDF to Image (extract pages to images in ZIP or single JPG)
    if (toolId === "pdf-to-image") {
      const parts = await pdfToImages(rawFile, { preset: compressionPreset });
      if (parts.length === 1) {
        return { blob: parts[0].blob, fileName: parts[0].name };
      }
      const zipBlob = await generateZipArchive(parts);
      return { blob: zipBlob, fileName: `${baseName}-images.zip` };
    }

    // 5. PDF to Text
    if (toolId === "pdf-to-text") {
      const blob = await pdfToText(rawFile);
      return { blob, fileName: `${baseName}.txt` };
    }

    // 6. Split PDF
    if (toolId === "split-pdf") {
      const parts = await splitSinglePDF(rawFile);
      if (parts.length === 1) {
        return { blob: parts[0].blob, fileName: parts[0].name };
      }
      const zipBlob = await generateZipArchive(parts);
      return { blob: zipBlob, fileName: `${baseName}-split-pages.zip` };
    }

    // 7. Rotate PDF
    if (toolId === "rotate-pdf") {
      const blob = await rotateSinglePDF(rawFile, 90);
      return { blob, fileName: `${baseName}-rotated.pdf` };
    }

    // 8. Protect PDF
    if (toolId === "protect-pdf") {
      const blob = await protectSinglePDF(rawFile, pdfPassword);
      return { blob, fileName: `${baseName}-protected.pdf` };
    }

    // 9. Unlock PDF
    if (toolId === "unlock-pdf") {
      const blob = await unlockSinglePDF(rawFile);
      return { blob, fileName: `${baseName}-unlocked.pdf` };
    }

    // 10. Image Format Converter
    if (toolId === "image-converter") {
      const ext = targetImageFormat === "image/png" ? "png" : targetImageFormat === "image/webp" ? "webp" : "jpg";
      const blob = await convertSingleImage(rawFile, targetImageFormat, 0.88);
      return { blob, fileName: `${baseName}.${ext}` };
    }

    // 11. HEIC to JPG
    if (toolId === "heic-to-jpg") {
      const blob = await convertSingleImage(rawFile, "image/jpeg", 0.88);
      return { blob, fileName: `${baseName}.jpg` };
    }

    // 12. Image to PDF
    if (toolId === "image-to-pdf") {
      const blob = await imageToSinglePDF(rawFile, { preset: compressionPreset });
      return { blob, fileName: `${baseName}.pdf` };
    }

    // 13. Compress PDF
    if (toolId === "compress-pdf") {
      const blob = await compressSinglePDF(rawFile, { preset: compressionPreset });
      return { blob, fileName: `${baseName}-compressed.pdf` };
    }

    // Fallback: If it's an office file, convert to PDF; if PDF, optimize; if image, convert
    if (/\.(pptx?|docx?|xlsx?)$/i.test(rawFile.name)) {
      const blob = await convertOfficeDocumentToPDF(rawFile);
      return { blob, fileName: `${baseName}.pdf` };
    }
    const blob = await compressSinglePDF(rawFile, { preset: compressionPreset });
    return { blob, fileName: `${baseName}-processed.pdf` };
  };

  // Main processing trigger
  const handleStartProcessing = async () => {
    if (fileItems.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setGlobalError(null);
    const overallStartTime = performance.now();

    try {
      // MERGE MODE (Strictly for merge-pdf or image-to-pdf when merge is selected)
      if ((isMergeOnly || tool?.id === "image-to-pdf") && mergeMode === "merge") {
        setFileItems((prev) =>
          prev.map((item) => ({ ...item, status: "processing", progress: 50 }))
        );

        let outputBlob: Blob;
        const rawFiles = fileItems.map((item) => item.file);

        if (tool?.id === "image-to-pdf") {
          outputBlob = await imagesToMergedPDF(rawFiles, { preset: compressionPreset });
        } else {
          outputBlob = await mergePDFs(rawFiles, { preset: compressionPreset });
        }

        const totalInputSize = fileItems.reduce((acc, it) => acc + it.file.size, 0);
        const savings =
          totalInputSize > outputBlob.size
            ? Math.round(((totalInputSize - outputBlob.size) / totalInputSize) * 100)
            : 0;

        const url = URL.createObjectURL(outputBlob);
        setMergedBlob(outputBlob);
        setMergedDownloadUrl(url);
        setMergedSavingsPercent(savings);

        const duration = Number(((performance.now() - overallStartTime) / 1000).toFixed(1));
        setBatchDurationSec(duration);

        setFileItems((prev) =>
          prev.map((item) => ({
            ...item,
            status: "completed",
            progress: 100,
            durationMs: duration * 1000,
          }))
        );
        return;
      }

      // DEAL SEPARATELY / PARALLEL CONCURRENT WORKERS
      const total = fileItems.length;
      let currentIndex = 0;

      const runWorker = async () => {
        while (currentIndex < total) {
          const idx = currentIndex++;
          const currentItem = fileItems[idx];
          if (!currentItem) break;

          const itemStartTime = performance.now();
          setFileItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, status: "processing", progress: 35 } : it))
          );

          try {
            const { blob, fileName } = await processSingleItem(currentItem);
            const downloadUrl = URL.createObjectURL(blob);
            const durationMs = Math.round(performance.now() - itemStartTime);
            const savingsPercent =
              currentItem.file.size > blob.size
                ? Math.round(((currentItem.file.size - blob.size) / currentItem.file.size) * 100)
                : 0;

            setFileItems((prev) =>
              prev.map((it, i) =>
                i === idx
                  ? {
                      ...it,
                      status: "completed",
                      progress: 100,
                      outputBlob: blob,
                      downloadUrl,
                      convertedFileName: fileName,
                      outputSize: blob.size,
                      savingsPercent,
                      durationMs,
                    }
                  : it
              )
            );
          } catch (err: any) {
            setFileItems((prev) =>
              prev.map((it, i) =>
                i === idx
                  ? {
                      ...it,
                      status: "error",
                      errorMessage: err.message || "Failed to process document.",
                    }
                  : it
              )
            );
          }
        }
      };

      const workerCount = Math.min(CONCURRENT_WORKERS, total);
      const workers = Array.from({ length: workerCount }, () => runWorker());
      await Promise.all(workers);

      const duration = Number(((performance.now() - overallStartTime) / 1000).toFixed(1));
      setBatchDurationSec(duration);
    } catch (err: any) {
      setGlobalError(err.message || "Batch process halted unexpectedly.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Download all completed outputs as a single ZIP archive
  const handleDownloadAllZip = async () => {
    const completedItems = fileItems.filter(
      (item) => item.status === "completed" && item.outputBlob
    );
    if (completedItems.length === 0) return;

    setIsZipping(true);
    try {
      const itemsToZip = completedItems.map((item) => ({
        name: item.convertedFileName || item.file.name,
        blob: item.outputBlob!,
      }));

      const zipBlob = await generateZipArchive(itemsToZip);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tool?.id || "batch"}-converted-files.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setGlobalError("Failed to build ZIP archive.");
    } finally {
      setIsZipping(false);
    }
  };

  const isClientSide = tool?.environment !== "server";
  const completedCount = fileItems.filter((i) => i.status === "completed").length;
  const allCompleted = fileItems.length > 0 && completedCount === fileItems.length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Top Banner: Privacy & Tool Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-card border border-border/80 text-xs shadow-sm">
        {/* Left: Security & Privacy Guarantee */}
        <div className="flex items-center gap-2">
          {isClientSide ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <Cpu className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <span className="font-semibold text-foreground">100% In-Browser Privacy:</span>{" "}
                <span className="text-muted-foreground">
                  Hardware-accelerated on your device. Zero bytes uploaded.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
              <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <span className="font-semibold text-foreground">Sandbox Security:</span>{" "}
                <span className="text-muted-foreground">Files purged immediately after conversion.</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Conditional Controls per Tool (NO INTERMIXING) */}
        {showCompressionPreset && (
          <div className="flex items-center gap-1.5 self-end md:self-auto bg-muted/60 p-1 rounded-xl border border-border/60">
            <span className="text-[11px] font-semibold text-muted-foreground px-1.5 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-rose-500" />
              Mode:
            </span>
            <button
              type="button"
              onClick={() => setCompressionPreset("balanced")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                compressionPreset === "balanced"
                  ? "bg-card text-foreground shadow-sm font-bold text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="w-3 h-3" />
              Fast & Compact
            </button>
            <button
              type="button"
              onClick={() => setCompressionPreset("maximum")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                compressionPreset === "maximum"
                  ? "bg-card text-foreground shadow-sm font-bold text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingDown className="w-3 h-3" />
              Max Compression
            </button>
            <button
              type="button"
              onClick={() => setCompressionPreset("lossless")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1",
                compressionPreset === "lossless"
                  ? "bg-card text-foreground shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Original Res
            </button>
          </div>
        )}

        {isImageConverter && (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-[11px] font-semibold text-muted-foreground">Convert to:</span>
            <select
              value={targetImageFormat}
              onChange={(e) => setTargetImageFormat(e.target.value as any)}
              className="p-1.5 rounded-xl bg-muted/70 border border-border/70 text-xs font-semibold text-foreground outline-none"
            >
              <option value="image/jpeg">JPG / JPEG</option>
              <option value="image/png">PNG (Lossless)</option>
              <option value="image/webp">WebP (Modern)</option>
            </select>
          </div>
        )}

        {isProtectTool && (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <input
              type="password"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              placeholder="Set PDF Password"
              className="px-2.5 py-1 text-xs bg-muted/70 border border-border/70 rounded-xl outline-none text-foreground font-semibold"
            />
          </div>
        )}
      </div>

      {/* Processing Mode Switcher (Merge vs Deal Separately - ONLY FOR image-to-pdf) */}
      {allowsMergeToggle && fileItems.length > 1 && !isProcessing && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-primary" />
            Select Output Layout:
          </span>
          <div className="flex items-center bg-muted/80 p-0.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setMergeMode("separate")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                mergeMode === "separate"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Split className="w-3.5 h-3.5 text-rose-500" />
              Deal Separately (Parallel)
            </button>
            <button
              type="button"
              onClick={() => setMergeMode("merge")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                mergeMode === "merge"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              Merge to 1 PDF
            </button>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] bg-card/50 backdrop-blur-sm group select-none",
          isDragActive
            ? "border-rose-500 bg-rose-500/5 ring-4 ring-rose-500/10 scale-[1.01]"
            : "border-border/80 hover:border-foreground/30 hover:bg-muted/30 shadow-sm",
          isDragReject && "border-red-500 bg-red-500/5"
        )}
      >
        <input {...getInputProps()} />

        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="w-16 h-16 mb-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h4 className="text-lg font-bold text-foreground mb-1">
          {isDragActive ? "Drop your files here!" : "Select Files or Drag & Drop"}
        </h4>
        <p className="text-sm text-muted-foreground max-w-md mb-4 leading-relaxed">
          {tool?.shortDesc || "Fast, privacy-first processing with zero server uploads."}
        </p>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 transition-all duration-200"
        >
          Select Files to Process
        </button>

        <p className="text-[11px] text-muted-foreground/80 mt-4">
          Supported: {Object.values(tool?.acceptedFormats || acceptedFormats).flat().join(", ")}
        </p>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Selected Files List */}
      <AnimatePresence>
        {fileItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4"
          >
            {/* Batch Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-base text-foreground">
                  Files Selected ({fileItems.length})
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {isMergeOnly || (tool?.id === "image-to-pdf" && mergeMode === "merge")
                    ? "Combined Output Mode"
                    : "Parallel Engine"}
                </span>
              </div>
              <button
                onClick={clearAllFiles}
                disabled={isProcessing}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors self-start sm:self-auto disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear all files
              </button>
            </div>

            {/* Merged Mode Result Banner */}
            {mergedDownloadUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-foreground text-sm">
                        Unified Document Ready
                      </h5>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>Output: {formatFileSize(mergedBlob?.size || 0)}</span>
                        {mergedSavingsPercent !== null && mergedSavingsPercent > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            &bull; Reduced by {mergedSavingsPercent}%
                          </span>
                        )}
                        {batchDurationSec && <span>&bull; Done in {batchDurationSec}s</span>}
                      </div>
                    </div>
                  </div>

                  <a
                    href={mergedDownloadUrl}
                    download={`${tool?.id || "merged"}-output.pdf`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download Merged PDF
                  </a>
                </div>
              </motion.div>
            )}

            {/* Individual File Items */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {fileItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/30 border border-border/60 hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-card border border-border/70 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                      <FileIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                        {item.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{formatFileSize(item.file.size)}</span>
                        {item.outputSize && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            &rarr; {formatFileSize(item.outputSize)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === "completed" && item.downloadUrl && (
                      <a
                        href={item.downloadUrl}
                        download={item.convertedFileName || item.file.name}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}

                    {item.status === "processing" && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="hidden sm:inline">Processing</span>
                      </div>
                    )}

                    {item.status === "error" && (
                      <span className="text-xs text-red-500" title={item.errorMessage}>
                        Failed
                      </span>
                    )}

                    {!isProcessing && item.status !== "completed" && (
                      <button
                        onClick={(e) => removeFile(item.id, e)}
                        className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
              {allCompleted && fileItems.length > 1 && !isMergeOnly && mergeMode !== "merge" ? (
                <button
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all disabled:opacity-50"
                >
                  <FileArchive className="w-4 h-4" />
                  <span>{isZipping ? "Creating ZIP..." : "Download All as ZIP"}</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleStartProcessing}
                disabled={isProcessing || fileItems.length === 0}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all ml-auto disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing files...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>{actionButtonText || `Process ${fileItems.length} File${fileItems.length > 1 ? "s" : ""}`}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
