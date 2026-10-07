"use client";

import React, { useState } from "react";
import { Grid, ArrowLeft, ArrowRight, Trash2, Download, Check, AlertCircle, FileText } from "lucide-react";
import { reorderPDFPages, loadPdfFromBuffer } from "@/lib/engines/client-pdf";

export function OrganizePdfStudio() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageIndices, setPageIndices] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (file: File) => {
    setPdfFile(file);
    setErrorMessage(null);
    try {
      const buf = await file.arrayBuffer();
      const doc = await loadPdfFromBuffer(buf);
      const count = doc.getPageCount();
      setPageIndices(Array.from({ length: count }, (_, i) => i));
    } catch (err: any) {
      setErrorMessage("Could not parse PDF pages: " + err.message);
    }
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pageIndices.length) return;
    const next = [...pageIndices];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setPageIndices(next);
  };

  const removePage = (indexToRemove: number) => {
    if (pageIndices.length <= 1) {
      setErrorMessage("Cannot delete all pages. A PDF must have at least one page.");
      return;
    }
    setPageIndices(pageIndices.filter((_, i) => i !== indexToRemove));
  };

  const handleExport = async () => {
    if (!pdfFile || pageIndices.length === 0) {
      setErrorMessage("Please upload a PDF and keep at least one page.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const reorderedBlob = await reorderPDFPages(pdfFile, pageIndices);
      const downloadUrl = URL.createObjectURL(reorderedBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${pdfFile.name.replace(/\.pdf$/i, "")}-organized.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reorder PDF pages.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Banner */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {pdfFile ? pdfFile.name : "Select PDF Document"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pdfFile ? `${pageIndices.length} pages in document sequence` : "Upload a multi-page PDF to reorder or extract pages"}
            </p>
          </div>
        </div>

        <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-muted text-foreground transition-colors shrink-0">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
            }}
          />
          {pdfFile ? "Change PDF" : "Browse PDF"}
        </label>
      </div>

      {/* Pages Grid Layout */}
      {pdfFile && pageIndices.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Arrange page order (Sequence: {pageIndices.map((i) => i + 1).join(" &rarr; ")})</span>
            <span>{pageIndices.length} total pages</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
            {pageIndices.map((origPageIndex, currentPos) => (
              <div
                key={`${origPageIndex}-${currentPos}`}
                className="p-3 rounded-2xl bg-card border border-border/70 flex flex-col items-center justify-between gap-3 shadow-sm hover:border-purple-500/50 transition-colors"
              >
                {/* Visual Thumbnail Placeholder / Badge */}
                <div className="w-full aspect-[3/4] rounded-xl bg-muted/40 border border-border/50 flex flex-col items-center justify-center p-3 relative group">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Page
                  </span>
                  <span className="text-3xl font-black text-foreground">
                    {origPageIndex + 1}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 mt-1">
                    Slot #{currentPos + 1}
                  </span>
                </div>

                {/* Control Actions */}
                <div className="flex items-center justify-between w-full pt-1">
                  <button
                    onClick={() => movePage(currentPos, currentPos - 1)}
                    disabled={currentPos === 0}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30 transition-opacity"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => removePage(currentPos)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Delete this page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => movePage(currentPos, currentPos + 1)}
                    disabled={currentPos === pageIndices.length - 1}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30 transition-opacity"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Export Action */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleExport}
          disabled={!pdfFile || isProcessing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Reordering pages...</span>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Exported Reordered PDF!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export Reordered PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
