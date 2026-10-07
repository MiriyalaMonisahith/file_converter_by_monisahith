"use client";

import React, { useState, useRef, useEffect } from "react";
import { EyeOff, Download, Upload, Image as ImageIcon, Undo2, Trash2, Check } from "lucide-react";

interface RedactBox {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "blur" | "pixelate" | "blackout";
}

export function BlurSensitiveStudio() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImg, setOriginalImg] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [boxes, setBoxes] = useState<RedactBox[]>([]);
  const [currentBox, setCurrentBox] = useState<RedactBox | null>(null);
  const [redactType, setRedactType] = useState<"pixelate" | "blur" | "blackout">("pixelate");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const handleFile = (file: File) => {
    setImageFile(file);
    setBoxes([]);
    setCurrentBox(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setOriginalImg(img);
    };
  };

  // Re-render canvas whenever original image or boxes change
  useEffect(() => {
    if (!originalImg || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions matching image
    canvas.width = originalImg.width;
    canvas.height = originalImg.height;

    // 1. Draw base image
    ctx.drawImage(originalImg, 0, 0);

    // 2. Apply all finalized redaction boxes
    const allToDraw = currentBox ? [...boxes, currentBox] : boxes;

    allToDraw.forEach((box) => {
      const bx = Math.max(0, Math.min(box.x, box.x + box.width));
      const by = Math.max(0, Math.min(box.y, box.y + box.height));
      const bw = Math.abs(box.width);
      const bh = Math.abs(box.height);

      if (bw === 0 || bh === 0) return;

      if (box.type === "blackout") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(bx, by, bw, bh);
      } else if (box.type === "pixelate") {
        // Pixelate effect: sample low res and scale up
        const pixelSize = Math.max(10, Math.round(Math.min(bw, bh) / 8));
        const tempCanvas = document.createElement("canvas");
        const tempW = Math.max(1, Math.floor(bw / pixelSize));
        const tempH = Math.max(1, Math.floor(bh / pixelSize));
        tempCanvas.width = tempW;
        tempCanvas.height = tempH;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(canvas, bx, by, bw, bh, 0, 0, tempW, tempH);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, 0, 0, tempW, tempH, bx, by, bw, bh);
          ctx.imageSmoothingEnabled = true;
        }
      } else {
        // Blur effect simulation
        ctx.save();
        ctx.filter = "blur(12px)";
        ctx.drawImage(canvas, bx, by, bw, bh, bx, by, bw, bh);
        ctx.restore();
      }

      // Draw subtle boundary
      ctx.strokeStyle = "rgba(225, 29, 72, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
    });
  }, [originalImg, boxes, currentBox]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    setCurrentBox({
      x: startPos.x,
      y: startPos.y,
      width: currentX - startPos.x,
      height: currentY - startPos.y,
      type: redactType,
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && Math.abs(currentBox.width) > 5 && Math.abs(currentBox.height) > 5) {
      setBoxes([...boxes, currentBox]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
    setStartPos(null);
  };

  const handleUndo = () => {
    setBoxes(boxes.slice(0, -1));
  };

  const handleClear = () => {
    setBoxes([]);
  };

  const handleDownload = () => {
    if (!canvasRef.current || !imageFile) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `redacted-${imageFile.name}`;
      a.click();
    }, "image/jpeg", 0.95);
  };

  return (
    <div className="space-y-6">
      {!imageFile ? (
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/80 rounded-3xl hover:border-amber-500/50 hover:bg-muted/30 cursor-pointer transition-all">
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">Upload image to redact sensitive data</p>
          <p className="text-xs text-muted-foreground mt-1">
            Draw boxes over faces, license plates, credit cards, or text
          </p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      ) : (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase mr-1">Tool:</span>
              <button
                onClick={() => setRedactType("pixelate")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  redactType === "pixelate"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Pixelate
              </button>
              <button
                onClick={() => setRedactType("blur")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  redactType === "blur"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Blur
              </button>
              <button
                onClick={() => setRedactType("blackout")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  redactType === "blackout"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Solid Blackout
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={boxes.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 text-foreground disabled:opacity-30 transition-opacity"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo ({boxes.length})</span>
              </button>
              <button
                onClick={handleClear}
                disabled={boxes.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            &bull; Click and drag your mouse over sensitive areas to place redaction boxes.
          </p>

          {/* Interactive Canvas */}
          <div className="relative border border-border/70 rounded-2xl overflow-hidden bg-black/10 flex items-center justify-center max-h-96 overflow-auto cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="max-w-full max-h-96 object-contain"
            />
          </div>

          {/* Download Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download Redacted Image</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
