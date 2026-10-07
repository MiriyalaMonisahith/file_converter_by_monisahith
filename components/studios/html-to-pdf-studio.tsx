"use client";

import React, { useState } from "react";
import { Code, Download, Check, AlertCircle, Eye, RefreshCw } from "lucide-react";
import { htmlToPDF } from "@/lib/engines/client-pdf";

export function HtmlToPdfStudio() {
  const [htmlContent, setHtmlContent] = useState<string>(
    `<h1>Invoice #INV-2026-09</h1>
<p>Issued by: <strong>OpenPDF Global Tech</strong></p>
<hr/>
<h3>Summary of Services:</h3>
<ul>
  <li>Document Conversion Pipeline: Complete</li>
  <li>WebAssembly PDF Optimizations: Included</li>
  <li>Client-Side Privacy Guarantee: Zero Server Storage</li>
</ul>
<p>Thank you for using our open-source tools!</p>`
  );

  const [docTitle, setDocTitle] = useState("Exported Document");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    if (!htmlContent.trim()) {
      setErrorMessage("Please enter HTML content to convert.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const pdfBlob = await htmlToPDF(htmlContent, docTitle);
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${docTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate PDF from HTML.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Document Title Config */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          Document Title
        </label>
        <input
          type="text"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          placeholder="e.g. Terms of Service, Report, Invoice"
          className="w-full p-2.5 text-xs bg-muted/30 border border-border/70 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground font-medium"
        />
      </div>

      {/* Code Editor & Visual HTML Preview Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            HTML Source Code
          </label>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            rows={10}
            className="w-full p-3.5 text-xs font-mono bg-muted/20 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-primary" />
            Live Rendered Preview
          </label>
          <div
            className="w-full h-56 p-4 rounded-2xl bg-card border border-border/70 overflow-y-auto text-xs prose dark:prose-invert max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>

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
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Generating PDF...</span>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>PDF Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Convert & Download PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
