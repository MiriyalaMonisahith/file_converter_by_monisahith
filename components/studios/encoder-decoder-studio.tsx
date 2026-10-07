"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, ArrowRightLeft, Binary, Globe, KeyRound } from "lucide-react";

type UtilityMode = "base64" | "url" | "hex" | "jwt";

export function EncoderDecoderStudio() {
  const [mode, setMode] = useState<UtilityMode>("base64");
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [inputVal, setInputVal] = useState<string>("Hello, OpenPDF Suite!");
  const [copied, setCopied] = useState(false);

  const outputVal = useMemo(() => {
    if (!inputVal) return "";

    try {
      if (mode === "base64") {
        if (direction === "encode") {
          return btoa(unescape(encodeURIComponent(inputVal)));
        } else {
          return decodeURIComponent(escape(atob(inputVal.trim())));
        }
      }

      if (mode === "url") {
        if (direction === "encode") {
          return encodeURIComponent(inputVal);
        } else {
          return decodeURIComponent(inputVal);
        }
      }

      if (mode === "hex") {
        if (direction === "encode") {
          let hex = "";
          for (let i = 0; i < inputVal.length; i++) {
            hex += inputVal.charCodeAt(i).toString(16).padStart(2, "0") + " ";
          }
          return hex.trim();
        } else {
          const cleanHex = inputVal.replace(/[^0-9A-Fa-f]/g, "");
          let str = "";
          for (let i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
          }
          return str;
        }
      }

      if (mode === "jwt") {
        // Parse JWT Token segments
        const parts = inputVal.trim().split(".");
        if (parts.length !== 3) {
          return "Invalid JWT token structure. A valid JWT consists of three dot-separated segments (header.payload.signature).";
        }
        const decodePart = (str: string) => {
          const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
          const pad = base64.length % 4;
          const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
          return JSON.stringify(JSON.parse(decodeURIComponent(escape(atob(padded)))), null, 2);
        };
        const header = decodePart(parts[0]);
        const payload = decodePart(parts[1]);
        return `// JWT HEADER:\n${header}\n\n// JWT PAYLOAD / CLAIMS:\n${payload}`;
      }

      return "";
    } catch (err: any) {
      return `Error: ${err.message || "Invalid input for decoding"}`;
    }
  }, [mode, direction, inputVal]);

  const handleCopy = () => {
    navigator.clipboard.writeText(outputVal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Mode Select Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
          <button
            onClick={() => {
              setMode("base64");
              if (!inputVal) setInputVal("Hello, OpenPDF Suite!");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "base64" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Base64
          </button>
          <button
            onClick={() => setMode("url")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            URL Encode
          </button>
          <button
            onClick={() => setMode("hex")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "hex" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Hex (Hexadecimal)
          </button>
          <button
            onClick={() => setMode("jwt")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === "jwt" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            JWT Inspector
          </button>
        </div>

        {mode !== "jwt" && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
            <button
              onClick={() => setDirection("encode")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                direction === "encode"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Encode
            </button>
            <button
              onClick={() => setDirection("decode")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                direction === "decode"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Decode
            </button>
          </div>
        )}
      </div>

      {/* Editor & Output Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {mode === "jwt" ? "Encoded JWT String" : direction === "encode" ? "Source Text" : "Encoded String"}
          </label>
          <textarea
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            rows={9}
            placeholder={
              mode === "jwt"
                ? "Paste encoded JSON Web Token (eyJhbGciOiJIUzI1Ni...)"
                : "Type or paste string here..."
            }
            className="w-full p-3.5 text-xs font-mono bg-muted/20 border border-border/70 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500/30 text-foreground resize-y"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Result Output
          </label>
          <textarea
            value={outputVal}
            readOnly
            rows={9}
            placeholder="Result will appear here automatically..."
            className="w-full p-3.5 text-xs font-mono bg-card/60 border border-border/70 rounded-2xl outline-none text-foreground resize-y"
          />
        </div>
      </div>

      {/* Footer Copy */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-md"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied!" : "Copy Result"}</span>
        </button>
      </div>
    </div>
  );
}
