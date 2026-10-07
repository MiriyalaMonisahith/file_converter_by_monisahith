export type MainSection = "pdf" | "document" | "text" | "image";

export type ToolCategory =
  | "organize"
  | "convert-to-pdf"
  | "convert-from-pdf"
  | "security-optimize"
  | "document-tools"
  | "text-tools"
  | "image-tools"
  | "markdown";

export type ExecutionEnvironment = "client" | "server" | "hybrid";

export interface ToolDefinition {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  section: MainSection;
  category: ToolCategory;
  environment: ExecutionEnvironment;
  accentColor: string; // e.g. Tailwind gradient classes
  badgeText?: string;
  iconName: string;
  acceptedFormats: Record<string, string[]>;
  maxFiles?: number;
  outputFormat: string;
  route: string;
  interactiveStudio?: boolean;
}

export type CompressionPreset = "balanced" | "maximum" | "lossless";

export interface OptimizationOptions {
  preset?: CompressionPreset;
  maxDimension?: number;
  quality?: number;
}

export interface UploadedFileItem {
  id: string;
  file: File;
  previewUrl?: string;
  status: "idle" | "queued" | "processing" | "completed" | "error";
  progress: number;
  errorMessage?: string;
  downloadUrl?: string;
  outputBlob?: Blob;
  convertedFileName?: string;
  outputSize?: number;
  savingsPercent?: number;
  durationMs?: number;
}
