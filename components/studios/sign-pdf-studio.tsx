"use client";

import React, { useState, useRef, useEffect } from "react";
import { PenTool, Trash2, Download, Check, AlertCircle, FileText, Upload } from "lucide-react";
import { signPDF } from "@/lib/engines/client-pdf";

export function SignPdfStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [strokeColor, setStrokeColor] = useState<string>("#1e293b"); // dark slate / ink
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [targetPage, setTargetPage] = useState<number>(1);
  const [placementPos, setPlacementPos] = useState<"bottom-right" | "bottom-left" | "center">("bottom-right");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Setup canvas drawing context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
  }, [strokeColor, strokeWidth]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleApplySignature = async () => {
    if (!pdfFile) {
      setErrorMessage("Please select a PDF document to sign.");
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      setErrorMessage("Please draw your signature on the pad first.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // Export signature canvas as PNG blob
      const sigBlob: Blob = await new Promise((resolve, reject) => {
        canvasRef.current?.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to export signature image"));
        }, "image/png");
      });

      // Calculate placement coordinates
      let xOffset = 300;
      let yOffset = 50;
      if (placementPos === "bottom-left") {
        xOffset = 50;
        yOffset = 50;
      } else if (placementPos === "center") {
        xOffset = 200;
        yOffset = 350;
      }

      const signedPdfBlob = await signPDF(pdfFile, sigBlob, targetPage, {
        x: xOffset,
        y: yOffset,
        width: 180,
      });

      // Trigger instant download
      const downloadUrl = URL.createObjectURL(signedPdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${pdfFile.name.replace(/\.pdf$/i, "")}-signed.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sign PDF document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Banner */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {pdfFile ? pdfFile.name : "Select PDF Document"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : "Choose the PDF to place signature on"}
            </p>
          </div>
        </div>

        <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold bg-card border border-border hover:bg-muted text-foreground transition-colors shrink-0">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setPdfFile(e.target.files[0]);
                setErrorMessage(null);
              }
            }}
          />
          {pdfFile ? "Change PDF" : "Browse PDF"}
        </label>
      </div>

      {/* Signature Canvas Pad */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Draw Signature Pad</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Color buttons */}
            <button
              onClick={() => setStrokeColor("#1e293b")}
              className={`w-5 h-5 rounded-full bg-slate-900 border-2 transition-transform ${
                strokeColor === "#1e293b" ? "scale-110 border-blue-500" : "border-transparent"
              }`}
              title="Black/Slate Ink"
            />
            <button
              onClick={() => setStrokeColor("#1d4ed8")}
              className={`w-5 h-5 rounded-full bg-blue-700 border-2 transition-transform ${
                strokeColor === "#1d4ed8" ? "scale-110 border-blue-500" : "border-transparent"
              }`}
              title="Classic Blue Ink"
            />
            <button
              onClick={clearSignature}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 ml-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <div className="relative border-2 border-dashed border-border/80 rounded-2xl bg-white dark:bg-card/80 overflow-hidden cursor-crosshair">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-44 touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/40 text-xs font-medium">
              Sign here using mouse or finger
            </div>
          )}
        </div>
      </div>

      {/* Signature Placement Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-muted-foreground mb-1.5">Apply to Page</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={targetPage}
              onChange={(e) => setTargetPage(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 p-2 bg-muted/40 border border-border/70 rounded-xl text-foreground font-semibold text-center outline-none"
            />
            <span className="text-muted-foreground">(Defaults to Page 1)</span>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-muted-foreground mb-1.5">Placement Position</label>
          <select
            value={placementPos}
            onChange={(e) => setPlacementPos(e.target.value as any)}
            className="w-full p-2 bg-muted/40 border border-border/70 rounded-xl text-foreground font-medium outline-none"
          >
            <option value="bottom-right">Bottom-Right (Standard Signature Block)</option>
            <option value="bottom-left">Bottom-Left</option>
            <option value="center">Center of Page</option>
          </select>
        </div>
      </div>

      {/* Error / Success Feedback */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Footer Process Button */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleApplySignature}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Stamping signature...</span>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Signed & Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Apply & Download Signed PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
