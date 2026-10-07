"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Download, Check, Upload, Image as ImageIcon, TrendingDown } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

export function ImageCompressorStudio() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  const [quality, setQuality] = useState<number>(0.75); // 75%
  const [scale, setScale] = useState<number>(1.0); // 100%
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFile = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
  };

  useEffect(() => {
    if (!imageFile || !originalUrl) return;

    let isMounted = true;
    setIsCompressing(true);

    const img = new Image();
    img.src = originalUrl;
    img.onload = () => {
      const targetW = Math.max(1, Math.round(img.width * scale));
      const targetH = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, targetW, targetH);
      canvas.toBlob(
        (blob) => {
          if (!isMounted || !blob) return;
          if (compressedUrl) URL.revokeObjectURL(compressedUrl);
          const newUrl = URL.createObjectURL(blob);
          setCompressedUrl(newUrl);
          setCompressedBlob(blob);
          setIsCompressing(false);
        },
        "image/jpeg",
        quality
      );
    };

    return () => {
      isMounted = false;
    };
  }, [imageFile, originalUrl, quality, scale]);

  const savingsPercent =
    imageFile && compressedBlob
      ? Math.max(0, Math.round(((imageFile.size - compressedBlob.size) / imageFile.size) * 100))
      : 0;

  const handleDownload = () => {
    if (!compressedBlob || !imageFile) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(compressedBlob);
    a.download = `compressed-${imageFile.name.replace(/\.[^/.]+$/, "")}.jpg`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {!imageFile ? (
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/80 rounded-3xl hover:border-rose-500/50 hover:bg-muted/30 cursor-pointer transition-all">
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Click or drag image to compress</p>
          <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, WebP up to 50MB</p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      ) : (
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{imageFile.name}</p>
              <p className="text-[11px] text-muted-foreground">Original: {formatFileSize(imageFile.size)}</p>
            </div>
          </div>
          <label className="cursor-pointer text-xs font-semibold text-primary hover:underline">
            Choose Another Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      )}

      {/* Compression Controls */}
      {imageFile && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-2xl bg-card border border-border/70">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5 text-muted-foreground">
                <span>Compression Quality</span>
                <span className="text-foreground">{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.95}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground">
                Lower quality creates significantly smaller files
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5 text-muted-foreground">
                <span>Dimension Scale</span>
                <span className="text-foreground">{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.25}
                max={1.0}
                step={0.25}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground">
                Downscale image resolution for maximum byte savings
              </span>
            </div>
          </div>

          {/* Size Comparison Badge */}
          {compressedBlob && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <span>Reduced by {savingsPercent}%</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="line-through text-muted-foreground">{formatFileSize(imageFile.size)}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatFileSize(compressedBlob.size)}
                </span>
              </div>
            </div>
          )}

          {/* Preview Image */}
          {compressedUrl && (
            <div className="rounded-2xl border border-border/60 overflow-hidden bg-black/10 flex items-center justify-center max-h-72 p-2">
              <img
                src={compressedUrl}
                alt="Compressed preview"
                className="max-h-64 object-contain rounded-xl"
              />
            </div>
          )}

          {/* Download Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={handleDownload}
              disabled={isCompressing || !compressedBlob}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download Compressed Image</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
