"use client";

import React, { useState } from "react";
import { FileCode, Download, Check, AlertCircle, FileText, Upload } from "lucide-react";
import { txtToPDF } from "@/lib/engines/client-pdf";

export function TxtToDocStudio() {
  const [textContent, setTextContent] = useState<string>(
    `PROJECT OVERVIEW & SPECIFICATIONS

1. Objective:
Build a state-of-the-art multi-category file conversion and manipulation suite running natively in modern web browsers.

2. Architecture:
- Client-side execution powered by WebAssembly and HTML5 Canvas
- Ephemeral serverless sandbox for complex Office conversions
- Zero storage guarantee: files never persist on disk

3. Privacy & Compliance:
All operations respect complete end-to-end user privacy.`
  );

  const [docTitle, setDocTitle] = useState("Document Report");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setTextContent(ev.target.result);
      }
    };
    reader.readAsText(file);
  };

  const handleExportPDF = async () => {
    if (!textContent.trim()) {
      setErrorMessage("Please input or upload text to convert.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const pdfBlob = await txtToPDF(textContent, docTitle);
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${docTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to convert TXT to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportDocx = () => {
    // Generate standard HTML-based Word document (.doc format widely compatible)
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${docTitle}</title></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; padding: 40px;">
        <h2>${docTitle}</h2>
        <pre style="font-family: inherit; white-space: pre-wrap;">${textContent}</pre>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.toLowerCase().replace(/\s+/g, "-")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Upload .txt or Title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            Document Title
          </label>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="w-full p-2.5 text-xs bg-muted/30 border border-border/70 rounded-xl outline-none text-foreground font-semibold"
          />
        </div>

        <div className="flex flex-col justify-end">
          <label className="cursor-pointer flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors">
            <Upload className="w-4 h-4 text-primary" />
            <span>Upload .TXT File</span>
            <input type="file" accept=".txt,text/plain" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Text Editor */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Plain Text Content
        </label>
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          rows={11}
          placeholder="Paste or write raw text here..."
          className="w-full p-3.5 text-xs font-mono bg-muted/20 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground resize-y leading-relaxed"
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          onClick={handleExportDocx}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border/60 transition-colors"
        >
          <FileText className="w-4 h-4 text-blue-500" />
          <span>Export as Word (.DOC)</span>
        </button>

        <button
          onClick={handleExportPDF}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Formatting PDF...</span>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Downloaded PDF!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export as Paginated PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
