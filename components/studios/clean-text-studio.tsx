"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, Trash2, Download, Eraser, Sparkles } from "lucide-react";

export function CleanTextStudio() {
  const [inputText, setInputText] = useState<string>(
    `apple
banana
orange
apple
  banana  
grapes
watermelon
orange`
  );

  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [trimLines, setTrimLines] = useState(true);
  const [removeEmptyLines, setRemoveEmptyLines] = useState(true);
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [stripHtml, setStripHtml] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanedText = useMemo(() => {
    let lines = inputText.split("\n");

    if (stripHtml) {
      lines = lines.map((l) => l.replace(/<[^>]*>/g, ""));
    }

    if (trimLines) {
      lines = lines.map((l) => l.trim());
    }

    if (removeEmptyLines) {
      lines = lines.filter((l) => l.length > 0);
    }

    if (removeDuplicates) {
      const seen = new Set<string>();
      lines = lines.filter((l) => {
        if (seen.has(l)) return false;
        seen.add(l);
        return true;
      });
    }

    if (sortAlphabetically) {
      lines.sort((a, b) => a.localeCompare(b));
    }

    return lines.join("\n");
  }, [inputText, removeDuplicates, trimLines, removeEmptyLines, sortAlphabetically, stripHtml]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([cleanedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaned-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Options Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/30 border border-border/70 text-xs font-semibold">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={removeDuplicates}
            onChange={(e) => setRemoveDuplicates(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
          />
          <span>Deduplicate Lines</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={trimLines}
            onChange={(e) => setTrimLines(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
          />
          <span>Trim Whitespace</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={removeEmptyLines}
            onChange={(e) => setRemoveEmptyLines(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
          />
          <span>Remove Empty Lines</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sortAlphabetically}
            onChange={(e) => setSortAlphabetically(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
          />
          <span>Sort Lines (A-Z)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={stripHtml}
            onChange={(e) => setStripHtml(e.target.checked)}
            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
          />
          <span>Strip HTML Tags</span>
        </label>
      </div>

      {/* Editor & Preview Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Input Text</span>
            <span className="text-[11px] text-muted-foreground">
              {inputText.split("\n").length} lines
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            className="w-full p-3.5 text-xs font-mono bg-muted/20 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground resize-y"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Cleaned Output</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {cleanedText ? cleanedText.split("\n").length : 0} lines
            </span>
          </div>
          <textarea
            value={cleanedText}
            readOnly
            rows={10}
            className="w-full p-3.5 text-xs font-mono bg-card/60 border border-emerald-500/30 rounded-2xl outline-none text-foreground resize-y"
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border/60 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied!" : "Copy Cleaned Text"}</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md"
        >
          <Download className="w-4 h-4" />
          <span>Download .TXT</span>
        </button>
      </div>
    </div>
  );
}
