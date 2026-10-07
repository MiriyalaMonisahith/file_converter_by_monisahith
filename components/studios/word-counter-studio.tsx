"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, Trash2, Clock, Volume2, Type, FileText } from "lucide-react";

export function WordCounterStudio() {
  const [text, setText] = useState<string>(
    "Antigravity engineering powers ultra-fast, client-side productivity applications that respect your data privacy."
  );
  const [copied, setCopied] = useState(false);

  const metrics = useMemo(() => {
    const raw = text;
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const charsWithSpaces = raw.length;
    const charsNoSpaces = raw.replace(/\s+/g, "").length;
    const sentences = trimmed ? (trimmed.match(/[.!?]+(\s+|$)/g) || []).length || 1 : 0;
    const paragraphs = trimmed ? trimmed.split(/\n+/).filter((p) => p.trim()).length : 0;

    // Reading time at ~200 words per minute
    const readingTimeMin = Math.ceil(words / 200);
    // Speaking time at ~130 words per minute
    const speakingTimeMin = Math.ceil(words / 130);

    // Longest word
    const allWords = trimmed ? trimmed.split(/\s+/).map((w) => w.replace(/[^a-zA-Z0-9]/g, "")) : [];
    const longest = allWords.reduce((max, w) => (w.length > max.length ? w : max), "");

    return {
      words,
      charsWithSpaces,
      charsNoSpaces,
      sentences,
      paragraphs,
      readingTimeMin,
      speakingTimeMin,
      longestWord: longest || "N/A",
    };
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/70 text-center">
          <p className="text-2xl font-extrabold text-foreground">{metrics.words}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Words</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 text-center">
          <p className="text-2xl font-extrabold text-foreground">{metrics.charsWithSpaces}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Characters</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 text-center">
          <p className="text-2xl font-extrabold text-foreground">{metrics.sentences}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Sentences</p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 text-center">
          <p className="text-2xl font-extrabold text-foreground">{metrics.paragraphs}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Paragraphs</p>
        </div>
      </div>

      {/* Extended Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
          <Clock className="w-4 h-4 text-rose-500" />
          <div>
            <span className="text-muted-foreground">Reading Time: </span>
            <strong className="text-foreground">{metrics.readingTimeMin} min</strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50">
          <Volume2 className="w-4 h-4 text-indigo-500" />
          <div>
            <span className="text-muted-foreground">Speaking Time: </span>
            <strong className="text-foreground">{metrics.speakingTimeMin} min</strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 truncate">
          <Type className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="truncate">
            <span className="text-muted-foreground">Longest Word: </span>
            <strong className="text-foreground">{metrics.longestWord}</strong>
          </div>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Start typing or paste content to get instant statistics..."
          className="w-full p-4 text-sm font-sans bg-muted/30 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/60 transition-all resize-y text-foreground"
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{metrics.charsNoSpaces} characters excluding spaces</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setText("")}
              className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-foreground font-semibold hover:underline"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
