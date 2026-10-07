"use client";

import React, { useState } from "react";
import { Wrench, Download, Check, AlertCircle, FileText, ShieldAlert } from "lucide-react";
import { repairPDF } from "@/lib/engines/client-pdf";

export function RepairPdfStudio() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [repairedBlob, setRepairedBlob] = useState<Blob | null>(null);

  const handleRepair = async () => {
    if (!pdfFile) {
      setErrorMessage("Please select a PDF file to inspect and repair.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const cleanBlob = await repairPDF(pdfFile);
      setRepairedBlob(cleanBlob);

      const downloadUrl = URL.createObjectURL(cleanBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${pdfFile.name.replace(/\.pdf$/i, "")}-repaired.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to repair document structure.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Banner */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {pdfFile ? pdfFile.name : "Select Corrupt or Damaged PDF"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pdfFile ? `${(pdfFile.size / 1024).toFixed(1)} KB` : "Upload PDF with broken cross-references or invalid stream tables"}
            </p>
          </div>
        </div>

        <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-muted text-foreground transition-colors shrink-0">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setPdfFile(e.target.files[0]);
                setErrorMessage(null);
                setRepairedBlob(null);
              }
            }}
          />
          {pdfFile ? "Change File" : "Select File"}
        </label>
      </div>

      {/* Diagnostic Overview Card */}
      <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Automated Repair Engine Scope</span>
        </div>
        <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-5 leading-relaxed">
          <li>Reconstructs broken cross-reference (xref) offset index tables.</li>
          <li>Recovers readable page objects and flushes corrupted trailer tags.</li>
          <li>Reserializes the PDF stream with compliant ISO 32000 standard layout.</li>
          <li>Processes 100% locally in browser memory without sending files to any server.</li>
        </ul>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Repair Button */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleRepair}
          disabled={!pdfFile || isProcessing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Rebuilding structure...</span>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Repaired & Downloaded!</span>
            </>
          ) : (
            <>
              <Wrench className="w-4 h-4" />
              <span>Repair & Rebuild PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
