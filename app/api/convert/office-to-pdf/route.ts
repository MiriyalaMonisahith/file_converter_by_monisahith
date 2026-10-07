import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

// Search paths for LibreOffice soffice binary on Windows, Linux, and Mac
function findLibreOfficePath(): string {
  const possiblePaths = [
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
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

export async function POST(req: NextRequest) {
  let tempDir = "";
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);

    const allowedExtensions = [".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".odt", ".rtf", ".txt"];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `File format ${ext} is not supported by the document converter.` },
        { status: 400 }
      );
    }

    // Create an isolated ephemeral directory in OS temp
    const runId = randomUUID();
    tempDir = path.join(os.tmpdir(), `openpdf-${runId}`);
    await mkdir(tempDir, { recursive: true });

    const inputPath = path.join(tempDir, `input${ext}`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(inputPath, buffer);

    const sofficePath = findLibreOfficePath();
    const profileUrl = `file:///${tempDir.replace(/\\/g, "/")}/profile`;

    // Execute optimized LibreOffice headless conversion
    // Skipping GUI, first-start wizards, restore checking, and lock checks for maximum speed
    await execFileAsync(
      sofficePath,
      [
        "--headless",
        "--invisible",
        "--nodefault",
        "--nofirststartwizard",
        "--nolockcheck",
        "--nologo",
        "--norestore",
        `-env:UserInstallation=${profileUrl}`,
        "--convert-to",
        "pdf",
        "--outdir",
        tempDir,
        inputPath,
      ],
      { timeout: 60000 }
    );

    // Converted PDF will have the same basename as input, but with .pdf
    const outputPath = path.join(tempDir, "input.pdf");

    if (!existsSync(outputPath)) {
      throw new Error("LibreOffice conversion finished but output PDF was not found.");
    }

    let pdfBuffer = await readFile(outputPath);

    // Secondary size reduction: Compress PDF structure and streams with pdf-lib object streams
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const optimizedBytes = await pdfDoc.save({ useObjectStreams: true });
      if (optimizedBytes.length < pdfBuffer.length) {
        pdfBuffer = Buffer.from(optimizedBytes);
      }
    } catch {
      // Fallback to original LibreOffice output if structure re-save fails
    }

    // Ephemeral cleanup: remove temp directory and files immediately
    try {
      const { rm } = await import("fs/promises");
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Office to PDF conversion error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to convert document to PDF. Ensure LibreOffice is installed and functional.",
      },
      { status: 500 }
    );
  }
}
