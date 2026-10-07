"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stamp, Download, Upload, Image as ImageIcon } from "lucide-react";

export function WatermarkImageStudio() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [watermarkText, setWatermarkText] = useState("© COPYRIGHT");
  const [opacity, setOpacity] = useState(0.5);
  const [fontSize, setFontSize] = useState(36);
  const [colorHex, setColorHex] = useState("#ffffff");
  const [position, setPosition] = useState<"center" | "bottom-right" | "bottom-left" | "top-right" | "tile">("bottom-right");

  const handleFile = (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setOriginalImg(img);
    };
  };

  useEffect(() => {
    if (!originalImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = originalImg.width;
    canvas.height = originalImg.height;

    // Draw base image
    ctx.drawImage(originalImg, 0, 0);

    // Apply Watermark
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = colorHex;
    ctx.font = `bold ${fontSize}px sans-serif`;

    const textMetrics = ctx.measureText(watermarkText);
    const textWidth = textMetrics.width;

    if (position === "tile") {
      ctx.rotate(-Math.PI / 6);
      const stepX = textWidth + 150;
      const stepY = fontSize + 150;
      for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
        for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
          ctx.fillText(watermarkText, x, y);
        }
      }
    } else {
      let x = canvas.width - textWidth - 40;
      let y = canvas.height - 40;

      if (position === "center") {
        x = (canvas.width - textWidth) / 2;
        y = (canvas.height + fontSize) / 2;
      } else if (position === "bottom-left") {
        x = 40;
        y = canvas.height - 40;
      } else if (position === "top-right") {
        x = canvas.width - textWidth - 40;
        y = fontSize + 40;
      }

      ctx.fillText(watermarkText, x, y);
    }

    ctx.restore();
  }, [originalImg, watermarkText, opacity, fontSize, colorHex, position]);

  const handleDownload = () => {
    if (!canvasRef.current || !imageFile) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `watermarked-${imageFile.name}`;
      a.click();
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="space-y-6">
      {!imageFile ? (
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/80 rounded-3xl hover:border-blue-500/50 hover:bg-muted/30 cursor-pointer transition-all">
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Upload image to watermark</p>
          <p className="text-xs text-muted-foreground mt-1">Stamp copyright notices, logos, or author tags</p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      ) : (
        <div className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-card border border-border/70">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Watermark Text
              </label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className="w-full p-2.5 text-xs bg-muted/30 border border-border/70 rounded-xl outline-none text-foreground font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Position
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as any)}
                className="w-full p-2.5 text-xs bg-muted/30 border border-border/70 rounded-xl outline-none text-foreground font-medium"
              >
                <option value="bottom-right">Bottom-Right Corner</option>
                <option value="bottom-left">Bottom-Left Corner</option>
                <option value="center">Center</option>
                <option value="top-right">Top-Right Corner</option>
                <option value="tile">Tile Repeated Pattern</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-muted-foreground">
                <span>Opacity</span>
                <span>{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-semibold mb-1 text-muted-foreground">
                  <span>Font Size</span>
                  <span>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={96}
                  step={2}
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-muted-foreground mb-1">Color</span>
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-9 h-8 p-0.5 rounded-lg bg-transparent border border-border cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Canvas Preview */}
          <div className="relative border border-border/70 rounded-2xl overflow-hidden bg-black/10 flex items-center justify-center max-h-96 overflow-auto">
            <canvas ref={canvasRef} className="max-w-full max-h-96 object-contain" />
          </div>

          {/* Download Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download Watermarked Image</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
