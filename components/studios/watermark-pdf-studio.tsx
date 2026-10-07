"use client";

import React, { useState } from "react";
import { Stamp, Download, Check, AlertCircle, FileText } from "lucide-react";
import { watermarkPDF } from "@/lib/engines/client-pdf";

export function WatermarkPdfStudio() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [text, setText] = useState<string>("CONFIDENTIAL");
  const [opacity, setOpacity] = useState<number>(0.25);
  const [fontSize, setFontSize] = useState<number>(44);
  const [rotationAngle, setRotationAngle] = useState<number>(45);
  const [colorHex, setColorHex] = useState<string>("#e11d48"); // rose-600

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleWatermark = async () => {
    if (!pdfFile) {
      setErrorMessage("Please choose a PDF file to watermark.");
      return;
    }
    if (!text.trim()) {
      setErrorMessage("Please enter the watermark text.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const watermarkedBlob = await watermarkPDF(pdfFile, {
        text: text.trim(),
        opacity,
        fontSize,
        rotationAngle,
        colorHex,
      });

      const downloadUrl = URL.createObjectURL(watermarkedBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${pdfFile.name.replace(/\.pdf$/i, "")}-watermarked.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to stamp watermark.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Banner */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              {pdfFile ? pdfFile.name : "Select Target PDF"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB` : "Watermark will be stamped across every page"}
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

      {/* Watermark Configuration Controls */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Watermark Text
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. DRAFT, CONFIDENTIAL, DO NOT COPY"
            className="w-full p-3 text-sm bg-muted/30 border border-border/70 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5 text-muted-foreground">
              <span>Opacity</span>
              <span>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5 text-muted-foreground">
              <span>Font Size</span>
              <span>{fontSize} pt</span>
            </div>
            <input
              type="range"
              min={16}
              max={80}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5 text-muted-foreground">
              <span>Rotation Angle</span>
              <span>{rotationAngle}&deg;</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              step={5}
              value={rotationAngle}
              onChange={(e) => setRotationAngle(parseInt(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Stamp Color
            </span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-10 h-9 p-0.5 rounded-lg bg-transparent border border-border cursor-pointer"
              />
              <span className="text-xs font-mono uppercase text-foreground">{colorHex}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Live Preview Box */}
      <div className="p-6 rounded-2xl border border-dashed border-border flex items-center justify-center bg-card/40 relative overflow-hidden h-36">
        <span
          style={{
            transform: `rotate(${rotationAngle}deg)`,
            opacity,
            fontSize: `${fontSize * 0.7}px`,
            color: colorHex,
          }}
          className="font-bold uppercase tracking-widest select-none pointer-events-none transition-all"
        >
          {text || "PREVIEW"}
        </span>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Button */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleWatermark}
          disabled={isProcessing}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md disabled:opacity-50"
        >
          {isProcessing ? (
            <span>Applying watermark...</span>
          ) : success ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Watermarked & Downloaded!</span>
            </>
          ) : (
            <>
              <Stamp className="w-4 h-4" />
              <span>Stamp & Download Watermarked PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
