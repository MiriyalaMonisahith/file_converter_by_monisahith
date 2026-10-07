"use client";

import React, { useState, useMemo } from "react";
import { GitCompare, ArrowRightLeft, RotateCcw } from "lucide-react";

export function TextDiffStudio() {
  const [originalText, setOriginalText] = useState<string>(
    `function calculateDiscount(price, user) {
  if (user.isVip) {
    return price * 0.8;
  }
  return price;
}`
  );

  const [modifiedText, setModifiedText] = useState<string>(
    `function calculateDiscount(price, user) {
  if (user.isVip) {
    return price * 0.75; // Upgraded VIP discount to 25%
  }
  if (user.hasCoupon) {
    return price * 0.9;
  }
  return price;
}`
  );

  const diffResult = useMemo(() => {
    const origLines = originalText.split("\n");
    const modLines = modifiedText.split("\n");

    const maxLen = Math.max(origLines.length, modLines.length);
    const rows = [];
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;

    for (let i = 0; i < maxLen; i++) {
      const orig = origLines[i];
      const mod = modLines[i];

      if (orig === mod) {
        rows.push({ type: "same", orig, mod, lineNum: i + 1 });
      } else if (orig !== undefined && mod !== undefined) {
        rows.push({ type: "modified", orig, mod, lineNum: i + 1 });
        modifiedCount++;
      } else if (orig !== undefined) {
        rows.push({ type: "removed", orig, mod: "", lineNum: i + 1 });
        removedCount++;
      } else {
        rows.push({ type: "added", orig: "", mod, lineNum: i + 1 });
        addedCount++;
      }
    }

    return { rows, addedCount, removedCount, modifiedCount };
  }, [originalText, modifiedText]);

  return (
    <div className="space-y-6">
      {/* Diff Stat Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/30 border border-border/60">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <GitCompare className="w-4 h-4 text-primary" />
          <span>Difference Summary:</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            +{diffResult.addedCount} Added
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            ~{diffResult.modifiedCount} Changed
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            -{diffResult.removedCount} Removed
          </span>
        </div>
      </div>

      {/* Inputs Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Original Text
          </label>
          <textarea
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            rows={8}
            className="w-full p-3.5 text-xs font-mono bg-muted/20 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 transition-all text-foreground resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Modified Text
          </label>
          <textarea
            value={modifiedText}
            onChange={(e) => setModifiedText(e.target.value)}
            rows={8}
            className="w-full p-3.5 text-xs font-mono bg-muted/20 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 transition-all text-foreground resize-y"
          />
        </div>
      </div>

      {/* Visual Diff Output */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Visual Comparison View
        </h4>
        <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/60 font-mono text-xs">
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {diffResult.rows.map((row, idx) => {
              if (row.type === "same") {
                return (
                  <div key={idx} className="flex hover:bg-muted/30 py-1 px-3">
                    <span className="w-8 shrink-0 text-muted-foreground/60 select-none text-right pr-3">
                      {row.lineNum}
                    </span>
                    <span className="text-foreground/80 whitespace-pre-wrap flex-1">{row.orig}</span>
                  </div>
                );
              }
              if (row.type === "modified") {
                return (
                  <div key={idx} className="py-1 px-3 bg-amber-500/5">
                    <div className="flex text-rose-600 dark:text-rose-400">
                      <span className="w-8 shrink-0 select-none text-right pr-3">-</span>
                      <span className="whitespace-pre-wrap flex-1">{row.orig}</span>
                    </div>
                    <div className="flex text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <span className="w-8 shrink-0 select-none text-right pr-3">+</span>
                      <span className="whitespace-pre-wrap flex-1">{row.mod}</span>
                    </div>
                  </div>
                );
              }
              if (row.type === "removed") {
                return (
                  <div key={idx} className="flex py-1 px-3 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <span className="w-8 shrink-0 select-none text-right pr-3">-</span>
                    <span className="whitespace-pre-wrap flex-1">{row.orig}</span>
                  </div>
                );
              }
              return (
                <div key={idx} className="flex py-1 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <span className="w-8 shrink-0 select-none text-right pr-3">+</span>
                  <span className="whitespace-pre-wrap flex-1">{row.mod}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
