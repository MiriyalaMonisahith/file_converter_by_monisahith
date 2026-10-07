"use client";

import React, { useState, useEffect } from "react";
import { Crop, Download, Upload, Image as ImageIcon, Check, Lock, Unlock } from "lucide-react";

export function ImageResizerStudio() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [origDimensions, setOrigDimensions] = useState<{ w: number; h: number } | null>(null);

  const [targetWidth, setTargetWidth] = useState<number>(800);
  const [targetHeight, setTargetHeight] = useState<number>(600);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [format, setFormat] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");

  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFile = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);

    const img = new Image();
    img.src = url;
    img.onload = () => {
      setOrigDimensions({ w: img.width, h: img.height });
      setTargetWidth(img.width);
      setTargetHeight(img.height);
      setAspectRatio(img.width / img.height);
    };
  };

  const handleWidthChange = (val: number) => {
    setTargetWidth(val);
    if (lockAspectRatio && aspectRatio > 0) {
      setTargetHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setTargetHeight(val);
    if (lockAspectRatio && aspectRatio > 0) {
      setTargetWidth(Math.round(val * aspectRatio));
    }
  };

  const applyPreset = (w: number, h: number) => {
    setTargetWidth(w);
    setTargetHeight(h);
    setLockAspectRatio(false);
  };

  const handleDownload = () => {
    if (!originalUrl || !imageFile) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = originalUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
          a.href = URL.createObjectURL(blob);
          a.download = `resized-${targetWidth}x${targetHeight}-${imageFile.name.replace(/\.[^/.]+$/, "")}.${ext}`;
          a.click();
          setIsProcessing(false);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        },
        format,
        0.92
      );
    };
  };

  return (
    <div className="space-y-6">
      {!imageFile ? (
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/80 rounded-3xl hover:border-purple-500/50 hover:bg-muted/30 cursor-pointer transition-all">
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Select image to resize</p>
          <p className="text-xs text-muted-foreground mt-1">Scale to exact dimensions or social media presets</p>
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
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{imageFile.name}</p>
              {origDimensions && (
                <p className="text-[11px] text-muted-foreground">
                  Original: {origDimensions.w} &times; {origDimensions.h} px
                </p>
              )}
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

      {imageFile && (
        <>
          {/* Quick Preset Buttons */}
          <div>
            <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Popular Presets
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset(1080, 1080)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
              >
                Instagram Square (1080&times;1080)
              </button>
              <button
                onClick={() => applyPreset(1080, 1920)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
              >
                Story / Reel (1080&times;1920)
              </button>
              <button
                onClick={() => applyPreset(1280, 720)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
              >
                YouTube HD (1280&times;720)
              </button>
              <button
                onClick={() => applyPreset(1920, 1080)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
              >
                Full HD (1920&times;1080)
              </button>
              <button
                onClick={() => applyPreset(1500, 500)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
              >
                Twitter/X Header (1500&times;500)
              </button>
            </div>
          </div>

          {/* Dimension Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-card border border-border/70 items-end">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Width (pixels)
              </label>
              <input
                type="number"
                min={10}
                max={10000}
                value={targetWidth}
                onChange={(e) => handleWidthChange(parseInt(e.target.value) || 10)}
                className="w-full p-2.5 text-xs bg-muted/40 border border-border/70 rounded-xl outline-none text-foreground font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Height (pixels)
              </label>
              <input
                type="number"
                min={10}
                max={10000}
                value={targetHeight}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 10)}
                className="w-full p-2.5 text-xs bg-muted/40 border border-border/70 rounded-xl outline-none text-foreground font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Output Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full p-2.5 text-xs bg-muted/40 border border-border/70 rounded-xl outline-none text-foreground font-medium"
              >
                <option value="image/jpeg">JPG (Standard)</option>
                <option value="image/png">PNG (Lossless)</option>
                <option value="image/webp">WebP (Modern)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLockAspectRatio(!lockAspectRatio)}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {lockAspectRatio ? (
                <>
                  <Lock className="w-4 h-4 text-emerald-500" />
                  <span>Aspect Ratio Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-amber-500" />
                  <span>Aspect Ratio Unlocked</span>
                </>
              )}
            </button>
          </div>

          {/* Download Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={handleDownload}
              disabled={isProcessing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
            >
              {isProcessing ? (
                <span>Resizing...</span>
              ) : success ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Resized & Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Resize & Download</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
