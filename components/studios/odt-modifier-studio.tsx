"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  UploadCloud,
  Download,
  Search,
  Replace,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Tag,
  User,
  BookOpen,
  Eye,
  Sliders,
  Shield,
  FileCode,
  FileType,
} from "lucide-react";
import {
  parseOdtFile,
  modifyAndExportOdt,
  createSampleOdtBlob,
  convertOdtToPdf,
  ParsedOdtDocument,
} from "@/lib/engines/odt-engine";
import { convertDocument } from "@/lib/engines/client-pdf";
import { formatFileSize } from "@/lib/utils";

type ActiveTab = "content" | "find-replace" | "metadata" | "preview";

export function OdtModifierStudio() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("content");
  const [odtDoc, setOdtDoc] = useState<ParsedOdtDocument | null>(null);
  const [fileName, setFileName] = useState<string>("document.odt");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable Document State
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [title, setTitle] = useState<string>("");
  const [creator, setCreator] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [keywordsInput, setKeywordsInput] = useState<string>("");
  const [appendNote, setAppendNote] = useState<string>("");

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Find & Replace State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [replaceQuery, setReplaceQuery] = useState<string>("");
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with a demo sample document so user can test immediately
  useEffect(() => {
    loadSampleDocument();
  }, []);

  const loadSampleDocument = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const sampleBlob = await createSampleOdtBlob(
        "Quarterly Project Review & Strategy",
        "Antigravity Systems"
      );
      const parsed = await parseOdtFile(sampleBlob);
      applyParsedDocument(parsed, "quarterly-strategy.odt");
      setRawFile(null);
      setIsDirty(false);
      setStatusMessage("Demo OpenDocument (.odt) template loaded.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load sample ODT");
    } finally {
      setIsLoading(false);
    }
  };

  const applyParsedDocument = (parsed: ParsedOdtDocument, name: string) => {
    setOdtDoc(parsed);
    setFileName(name);
    setParagraphs(parsed.paragraphs.length > 0 ? parsed.paragraphs : ["Welcome to OpenPDF ODT Studio."]);
    setTitle(parsed.metadata.title || "");
    setCreator(parsed.metadata.creator || "");
    setSubject(parsed.metadata.subject || "");
    setDescription(parsed.metadata.description || "");
    setKeywordsInput(parsed.metadata.keywords.join(", "));
    setAppendNote("");
    setSearchQuery("");
    setReplaceQuery("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".odt")) {
      setErrorMessage("Please select a valid OpenDocument Text file (.odt)");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const parsed = await parseOdtFile(file);
      applyParsedDocument(parsed, file.name);
      setRawFile(file);
      setIsDirty(false);
      setStatusMessage(`Loaded "${file.name}" successfully!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Failed to read ODT: ${err.message || "Corrupted package"}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Find & Replace Match Count
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    let count = 0;
    const flags = caseSensitive ? "g" : "gi";
    try {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      paragraphs.forEach((p) => {
        const matches = p.match(regex);
        if (matches) count += matches.length;
      });
    } catch {
      return 0;
    }
    return count;
  }, [searchQuery, paragraphs, caseSensitive]);

  // Execute Replace All in State
  const handleExecuteReplace = () => {
    if (!searchQuery.trim() || matchCount === 0) return;
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

    const updatedParagraphs = paragraphs.map((p) => p.replace(regex, replaceQuery));
    setParagraphs(updatedParagraphs);
    setIsDirty(true);
    setStatusMessage(`Replaced ${matchCount} occurrence(s) across document.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Paragraph manipulations
  const handleUpdateParagraph = (index: number, value: string) => {
    setIsDirty(true);
    setParagraphs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddParagraph = () => {
    setIsDirty(true);
    setParagraphs((prev) => [...prev, "New document paragraph..."]);
  };

  const handleRemoveParagraph = (index: number) => {
    setIsDirty(true);
    setParagraphs((prev) => prev.filter((_, i) => i !== index));
  };

  // Metadata Sanitize
  const handleSanitizeMetadata = () => {
    setIsDirty(true);
    setCreator("");
    setDescription("");
    setSubject("");
    setKeywordsInput("");
    setStatusMessage("Personal metadata and tags removed.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Build the modified ODT Blob
  const buildModifiedBlob = async (): Promise<Blob> => {
    const keywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    return await modifyAndExportOdt({
      originalZip: odtDoc?.zip,
      title,
      creator,
      subject,
      description,
      keywords,
      paragraphs,
      appendNote: appendNote.trim() || undefined,
    });
  };

  // Download Handlers
  const handleDownloadOdt = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const blob = await buildModifiedBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = fileName.replace(/\.[^/.]+$/, "");
      a.download = `${base}-modified.odt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage("Exported modified .odt document successfully!");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Failed to export ODT: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAsPdf = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const base = fileName.replace(/\.[^/.]+$/, "");
      let odtFile: File;

      if (!isDirty && rawFile) {
        odtFile = rawFile;
      } else {
        const odtBlob = await buildModifiedBlob();
        odtFile = new File([odtBlob], `${base}.odt`, {
          type: "application/vnd.oasis.opendocument.text",
        });
      }

      let pdfBlob: Blob;
      try {
        pdfBlob = await convertDocument(odtFile, "pdf");
      } catch {
        pdfBlob = await convertOdtToPdf(odtFile);
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage("Document converted to PDF and downloaded!");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Conversion failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAsDocx = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const base = fileName.replace(/\.[^/.]+$/, "");
      let odtFile: File;

      if (!isDirty && rawFile) {
        odtFile = rawFile;
      } else {
        const odtBlob = await buildModifiedBlob();
        odtFile = new File([odtBlob], `${base}.odt`, {
          type: "application/vnd.oasis.opendocument.text",
        });
      }

      const docxBlob = await convertDocument(odtFile, "docx");
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}-converted.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage("Document converted to Word (.docx) and downloaded!");
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Conversion to DOCX failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAsTxt = () => {
    const fullText = paragraphs.join("\n\n");
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = fileName.replace(/\.[^/.]+$/, "");
    a.download = `${base}-text.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage("Exported as plain text file.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const totalWords = useMemo(() => {
    return paragraphs.reduce((acc, p) => acc + (p.trim() ? p.trim().split(/\s+/).length : 0), 0);
  }, [paragraphs]);

  const totalChars = useMemo(() => {
    return paragraphs.reduce((acc, p) => acc + p.length, 0);
  }, [paragraphs]);

  return (
    <div className="space-y-6">
      {/* Top File Controls Bar */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center">
            <FileType className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground truncate max-w-[200px] sm:max-w-xs">
                {fileName}
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                ODT v1.2/1.3
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {paragraphs.length} paragraphs &bull; {totalWords.toLocaleString()} words &bull; {totalChars.toLocaleString()} characters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".odt,application/vnd.oasis.opendocument.text"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessing}
            className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-muted text-xs font-semibold text-foreground border border-border/80 flex items-center gap-1.5 transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-blue-500" />
            Upload .ODT
          </button>
          <button
            onClick={loadSampleDocument}
            disabled={isLoading || isProcessing}
            className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Demo Sample
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Studio Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "content"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Paragraphs & Text ({paragraphs.length})
        </button>
        <button
          onClick={() => setActiveTab("find-replace")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "find-replace"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Replace className="w-4 h-4" />
          Find & Replace {matchCount > 0 && `(${matchCount})`}
        </button>
        <button
          onClick={() => setActiveTab("metadata")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "metadata"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Metadata & Properties
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
            activeTab === "preview"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <Eye className="w-4 h-4" />
          Document Preview
        </button>
      </div>

      {/* Tab 1: Paragraphs & Text Content */}
      {activeTab === "content" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Directly edit text blocks contained within OpenDocument XML nodes:
            </span>
            <button
              onClick={handleAddParagraph}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted border border-border/80 text-xs font-semibold text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-blue-500" />
              Add Paragraph
            </button>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {paragraphs.map((para, idx) => (
              <div
                key={idx}
                className="group relative p-3.5 rounded-2xl bg-card border border-border/70 hover:border-border transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                    Paragraph #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveParagraph(idx)}
                    className="p-1 rounded-lg text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Remove paragraph"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  rows={para.length > 120 ? 3 : 2}
                  value={para}
                  onChange={(e) => handleUpdateParagraph(idx, e.target.value)}
                  className="w-full bg-transparent text-foreground text-xs leading-relaxed focus:outline-none resize-y font-sans"
                />
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              Append Document Note or Disclaimer (Optional)
            </label>
            <input
              type="text"
              value={appendNote}
              onChange={(e) => {
                setAppendNote(e.target.value);
                setIsDirty(true);
              }}
              placeholder="e.g. Confidential — For Internal Distribution Only"
              className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Find & Replace */}
      {activeTab === "find-replace" && (
        <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-5">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-500" />
              Batch Find & Replace across Document Content
            </h3>
            <p className="text-xs text-muted-foreground">
              Search and update names, terms, values, or dates throughout the whole ODT document.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Search Target</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Text to find..."
                  className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery && (
                  <span className="absolute right-3 top-2 text-[11px] font-mono font-bold text-muted-foreground">
                    {matchCount} match{matchCount !== 1 ? "es" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Replacement String</label>
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace with..."
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>Case sensitive matching</span>
            </label>

            <button
              onClick={handleExecuteReplace}
              disabled={!searchQuery.trim() || matchCount === 0}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Replace className="w-3.5 h-3.5" />
              Replace All ({matchCount})
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Metadata & Document Properties */}
      {activeTab === "metadata" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Document Title (dc:title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                Author / Creator (dc:creator)
              </label>
              <input
                type="text"
                value={creator}
                onChange={(e) => {
                  setCreator(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Subject (dc:subject)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                Keywords / Tags (comma-separated)
              </label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => {
                  setKeywordsInput(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Description / Abstract (dc:description)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              className="w-full px-3.5 py-2 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Cleanse personal identifiers before public distribution:
            </span>
            <button
              onClick={handleSanitizeMetadata}
              className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-muted border border-border/80 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Sanitize / Clear Privacy Tags
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Live Document Preview */}
      {activeTab === "preview" && (
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-inner max-h-[420px] overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="border-b border-border/60 pb-4">
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {title || "Untitled Document"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {creator && <span>By <strong>{creator}</strong></span>}
                {subject && <span>&bull; {subject}</span>}
                <span>&bull; {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
                  {p}
                </p>
              ))}
            </div>

            {appendNote && (
              <div className="p-3.5 rounded-xl bg-muted/60 border border-border/50 text-xs text-muted-foreground italic">
                {appendNote}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export & Action Footer */}
      <div className="pt-4 border-t border-border/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Export Options:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportAsTxt}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted text-foreground border border-border/80 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500" />
            Plain Text (.txt)
          </button>

          <button
            onClick={handleExportAsDocx}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Word (.docx)
          </button>

          <button
            onClick={handleExportAsPdf}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Vector PDF
          </button>

          <button
            onClick={handleDownloadOdt}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:opacity-90 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            {isProcessing ? "Processing..." : "Download Modified .ODT"}
          </button>
        </div>
      </div>
    </div>
  );
}
