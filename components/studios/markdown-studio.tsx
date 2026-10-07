"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, Download, Code, Check, Eye, FileText, Upload } from "lucide-react";
import { txtToPDF } from "@/lib/engines/client-pdf";

export function MarkdownStudio() {
  const [markdown, setMarkdown] = useState<string>(
    `# OpenPDF Suite Documentation

Welcome to the **100% Client-Side** Markdown converter & live previewer!

## Key Highlights:
- **Zero Server Uploads**: Keeps your private thoughts and reports completely confidential.
- **Instant HTML Export**: Generates clean, standard HTML code ready for websites or blogs.
- **Vector PDF Output**: Crisp text with automatic pagination and headers.

### Sample Code Block:
\`\`\`ts
import { PDFDocument } from "pdf-lib";
const doc = await PDFDocument.create();
\`\`\`

> "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra`
  );

  const [docTitle, setDocTitle] = useState("Markdown Document");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Simple clean markdown-to-HTML parser for live preview
  const renderedHtml = useMemo(() => {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Blockquotes
      .replace(/^\> (.*$)/gim, "<blockquote>$1</blockquote>")
      // Bold & Italic
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, "<pre><code>$1</code></pre>")
      .replace(/`(.*?)`/gim, "<code>$1</code>")
      // Unordered lists
      .replace(/^\- (.*$)/gim, "<li>$1</li>")
      // Paragraphs
      .replace(/\n$/gim, "<br />");
    return html;
  }, [markdown]);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(renderedHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleDownloadHtml = () => {
    const fullPage = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
    blockquote { border-left: 4px solid #e2e8f0; margin-left: 0; padding-left: 1rem; color: #64748b; }
    code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 85%; }
    pre { background: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;
    const blob = new Blob([fullPage], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setIsProcessing(true);
    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = renderedHtml;
      const plainText = tempDiv.innerText || tempDiv.textContent || markdown;
      const pdfBlob = await txtToPDF(plainText, docTitle);

      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${docTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title Config */}
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

      {/* Dual Pane Markdown Editor & Live Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Markdown Editor
          </label>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={12}
            placeholder="Type or paste Markdown..."
            className="w-full p-3.5 text-xs font-mono bg-muted/20 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground resize-y leading-relaxed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-primary" />
            Live Formatted Preview
          </label>
          <div
            className="w-full h-64 p-4 rounded-2xl bg-card border border-border/70 overflow-y-auto text-xs prose dark:prose-invert max-w-none text-foreground space-y-2"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          onClick={handleCopyHtml}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border/60 transition-colors"
        >
          {copiedHtml ? <Check className="w-4 h-4 text-emerald-400" /> : <Code className="w-4 h-4" />}
          <span>{copiedHtml ? "Copied HTML!" : "Copy HTML"}</span>
        </button>

        <button
          onClick={handleDownloadHtml}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border/60 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download .HTML</span>
        </button>

        <button
          onClick={handleExportPDF}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          <span>{isProcessing ? "Generating PDF..." : "Export as PDF"}</span>
        </button>
      </div>
    </div>
  );
}
