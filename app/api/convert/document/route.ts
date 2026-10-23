import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { existsSync, readdirSync } from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

// Search paths for LibreOffice soffice binary
function findLibreOfficePath(): string {
  const possiblePaths = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.com",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/usr/bin/libreoffice",
    "/usr/bin/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "soffice",
  ];

  for (const p of possiblePaths) {
    if (p === "soffice" || existsSync(p)) {
      return p;
    }
  }

  return "soffice";
}

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  odt: "application/vnd.oasis.opendocument.text",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
  html: "text/html; charset=utf-8",
};

export async function POST(req: NextRequest) {
  let tempDir = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetFormat = ((formData.get("targetFormat") as string) || "pdf").toLowerCase().trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTargetFormats = ["pdf", "odt", "docx", "txt", "html"];
    if (!validTargetFormats.includes(targetFormat)) {
      return NextResponse.json(
        { error: `Target format "${targetFormat}" is not supported. Use one of: ${validTargetFormats.join(", ")}` },
        { status: 400 }
      );
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);

    const allowedExtensions = [
      ".odt",
      ".doc",
      ".docx",
      ".pdf",
      ".ppt",
      ".pptx",
      ".xls",
      ".xlsx",
      ".rtf",
      ".txt",
      ".html",
      ".htm",
    ];

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `File format ${ext} is not supported by the document converter.` },
        { status: 400 }
      );
    }

    // Ephemeral sandboxed workspace
    const runId = randomUUID();
    tempDir = path.join(os.tmpdir(), `openpdf-doc-${runId}`);
    await mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, `input${ext}`);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(inputPath, Buffer.from(arrayBuffer));

    const sofficePath = findLibreOfficePath();
    const profileUrl = `file:///${tempDir.replace(/\\/g, "/")}/profile`;

    // Build LibreOffice arguments
    const args = [
      "--headless",
      "--invisible",
      "--nodefault",
      "--nofirststartwizard",
      "--nolockcheck",
      "--nologo",
      "--norestore",
      `-env:UserInstallation=${profileUrl}`,
    ];

    // If converting from PDF to an editable text format like ODT or DOCX, specify writer filter
    if (ext === ".pdf" && (targetFormat === "odt" || targetFormat === "docx" || targetFormat === "txt")) {
      args.push('--infilter="writer_pdf_import"');
    }

    args.push("--convert-to", targetFormat, "--outdir", tempDir, inputPath);

    await execFileAsync(sofficePath, args, { timeout: 90000 });

    // Identify output file
    let expectedOutput = path.join(tempDir, `input.${targetFormat}`);
    if (!existsSync(expectedOutput)) {
      // Check directory for any file matching target extension
      const files = readdirSync(tempDir);
      const matched = files.find((f) => f.toLowerCase().endsWith(`.${targetFormat}`));
      if (matched) {
        expectedOutput = path.join(tempDir, matched);
      } else {
        throw new Error(`LibreOffice conversion finished, but output .${targetFormat} file was not generated.`);
      }
    }

    let outputBuffer = await readFile(expectedOutput);

    // If output is PDF, optimize object streams if possible
    if (targetFormat === "pdf") {
      try {
        const { PDFDocument } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.load(outputBuffer, { ignoreEncryption: true });
        const optimizedBytes = await pdfDoc.save({ useObjectStreams: true });
        if (optimizedBytes.length < outputBuffer.length) {
          outputBuffer = Buffer.from(optimizedBytes);
        }
      } catch {
        // keep standard output
      }
    }

    // Immediate cleanup
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    const contentType = MIME_TYPES[targetFormat] || "application/octet-stream";
    const downloadFileName = `${encodeURIComponent(baseName)}.${targetFormat}`;

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${downloadFileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Document conversion error:", error);
    if (tempDir && existsSync(tempDir)) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to convert document. Verify that LibreOffice is available on the host environment.",
      },
      { status: 500 }
    );
  }
}
