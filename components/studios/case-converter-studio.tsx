"use client";

import React, { useState } from "react";
import { Copy, Check, Trash2, Download, ArrowRightLeft } from "lucide-react";

export function CaseConverterStudio() {
  const [text, setText] = useState<string>(
    "The quick brown fox jumps over the lazy dog. Turn ideas into production code effortlessly!"
  );
  const [copied, setCopied] = useState(false);

  const stats = {
    chars: text.length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    lines: text ? text.split("\n").length : 0,
  };

  const transform = (fn: (s: string) => string) => {
    setText(fn(text));
  };

  const toTitleCase = (s: string) =>
    s.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );

  const toSentenceCase = (s: string) =>
    s
      .toLowerCase()
      .replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());

  const toCamelCase = (s: string) =>
    s
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");

  const toSnakeCase = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "_");

  const toKebabCase = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-");

  const toConstantCase = (s: string) => toSnakeCase(s).toUpperCase();

  const toAlternatingCase = (s: string) =>
    s
      .split("")
      .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
      .join("");

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => transform((s) => s.toUpperCase())}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          UPPERCASE
        </button>
        <button
          onClick={() => transform((s) => s.toLowerCase())}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          lowercase
        </button>
        <button
          onClick={() => transform(toTitleCase)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          Title Case
        </button>
        <button
          onClick={() => transform(toSentenceCase)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          Sentence case
        </button>
        <button
          onClick={() => transform(toCamelCase)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          camelCase
        </button>
        <button
          onClick={() => transform(toSnakeCase)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          snake_case
        </button>
        <button
          onClick={() => transform(toKebabCase)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          kebab-case
        </button>
        <button
          onClick={() => transform(toConstantCase)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          CONSTANT_CASE
        </button>
        <button
          onClick={() => transform(toAlternatingCase)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
        >
          aLtErNaTiNg
        </button>
      </div>

      {/* Editor Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Paste or type text to convert case..."
          className="w-full p-4 text-sm font-mono bg-muted/30 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/60 transition-all resize-y text-foreground"
        />

        {/* Stats banner inside */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
          <div className="flex gap-4">
            <span><strong>{stats.words}</strong> words</span>
            <span><strong>{stats.chars}</strong> characters</span>
            <span><strong>{stats.lines}</strong> lines</span>
          </div>
          <button
            onClick={() => setText("")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border border-border/60 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied!" : "Copy to Clipboard"}</span>
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
