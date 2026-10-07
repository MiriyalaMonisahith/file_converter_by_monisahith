"use client";

import React, { useState } from "react";
import { Palette, Copy, Check, Download, Upload, Image as ImageIcon } from "lucide-react";

interface ColorSwatch {
  hex: string;
  rgb: string;
  count: number;
}

export function PaletteExtractorStudio() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [palette, setPalette] = useState<ColorSwatch[]>([]);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      // Sample colors on canvas
      const canvas = document.createElement("canvas");
      // Scale down to 100x100 for fast k-means or color quantization
      const sampleSize = 100;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

      // Group colors by quantized bins
      const colorBins: Record<string, { r: number; g: number; b: number; count: number }> = {};
      const step = 4 * 4; // Sample every 4th pixel for speed

      for (let i = 0; i < imgData.length; i += step) {
        const r = Math.round(imgData[i] / 24) * 24;
        const g = Math.round(imgData[i + 1] / 24) * 24;
        const b = Math.round(imgData[i + 2] / 24) * 24;
        const a = imgData[i + 3];

        if (a < 128) continue; // Skip transparency

        const key = `${r},${g},${b}`;
        if (!colorBins[key]) {
          colorBins[key] = { r, g, b, count: 1 };
        } else {
          colorBins[key].count++;
        }
      }

      // Sort bins by frequency
      const sorted = Object.values(colorBins)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((bin) => {
          const hex = `#${((1 << 24) + (bin.r << 16) + (bin.g << 8) + bin.b)
            .toString(16)
            .slice(1)}`;
          return {
            hex,
            rgb: `rgb(${bin.r}, ${bin.g}, ${bin.b})`,
            count: bin.count,
          };
        });

      setPalette(sorted);
    };
  };

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const exportCSS = () => {
    const cssVars = `:root {\n${palette
      .map((c, i) => `  --color-${i + 1}: ${c.hex}; /* ${c.rgb} */`)
      .join("\n")}\n}`;
    const blob = new Blob([cssVars], { type: "text/css;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "palette.css";
    a.click();
  };

  return (
    <div className="space-y-6">
      {!imageFile ? (
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/80 rounded-3xl hover:border-pink-500/50 hover:bg-muted/30 cursor-pointer transition-all">
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Upload photo to extract color palette</p>
          <p className="text-xs text-muted-foreground mt-1">
            Detects dominant tones, accents, and hex color codes
          </p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{imageFile.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Extracted {palette.length} dominant color harmonies
                </p>
              </div>
            </div>

            <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
              Choose Another
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>

          {/* Color Swatches Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {palette.map((swatch, idx) => (
              <div
                key={idx}
                onClick={() => copyToClipboard(swatch.hex)}
                className="group relative p-3 rounded-2xl bg-card border border-border/70 hover:border-foreground/30 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              >
                <div
                  style={{ backgroundColor: swatch.hex }}
                  className="w-full h-20 rounded-xl shadow-inner mb-3 transition-transform group-hover:scale-95"
                />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono font-bold uppercase text-foreground">{swatch.hex}</p>
                    <p className="text-[10px] text-muted-foreground">{swatch.rgb}</p>
                  </div>
                  {copiedColor === swatch.hex ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={exportCSS}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Export as CSS Variables</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
