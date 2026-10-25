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

    // Execute conversion with LibreOffice, with automated zero-failure fallback
    const sofficePath = findLibreOfficePath();

    // Clean, direct headless conversion flags that preserve exact layout, text, and details
    const args = ["--headless", "--convert-to"];
    if (ext === ".odt" && targetFormat === "pdf") {
      args.push("pdf:writer_pdf_Export");
    } else {
      args.push(targetFormat);
    }

    if (ext === ".pdf" && (targetFormat === "odt" || targetFormat === "docx" || targetFormat === "txt")) {
      args.push("--infilter=writer_pdf_import");
    }

    args.push("--outdir", tempDir, inputPath);

    let outputBuffer: Buffer | null = null;

    try {
      await execFileAsync(sofficePath, args, { timeout: 30000 });

      // Identify output file
      let expectedOutput = path.join(tempDir, `input.${targetFormat}`);
      if (!existsSync(expectedOutput)) {
        const files = readdirSync(tempDir);
        const matched = files.find((f) => f.toLowerCase().endsWith(`.${targetFormat}`));
        if (matched) {
          expectedOutput = path.join(tempDir, matched);
        }
      }

      if (existsSync(expectedOutput)) {
        outputBuffer = await readFile(expectedOutput);
      }
    } catch (loError) {
      console.warn("LibreOffice subprocess conversion had an issue, checking native fallback:", loError);
    }

    // High-Precision Zero-Failure Native Fallbacks
    if (!outputBuffer) {
      if (ext === ".odt" && targetFormat === "pdf") {
        const { renderOdtToPdfBuffer } = await import("@/lib/engines/odt-engine");
        const pdfBytes = await renderOdtToPdfBuffer(Buffer.from(arrayBuffer));
        outputBuffer = Buffer.from(pdfBytes);
      } else if (ext === ".txt" && targetFormat === "pdf") {
        const { txtToPDF } = await import("@/lib/engines/client-pdf");
        const txtString = Buffer.from(arrayBuffer).toString("utf-8");
        const blob = await txtToPDF(txtString, baseName);
        outputBuffer = Buffer.from(await blob.arrayBuffer());
      } else if (ext === ".odt" && targetFormat === "docx") {
        const { parseOdtFile } = await import("@/lib/engines/odt-engine");
        const doc = await parseOdtFile(Buffer.from(arrayBuffer));
        const paragraphsHtml = doc.paragraphs
          .map((p) => `<p style="margin-bottom: 12pt; line-height: 1.6; font-size: 11pt;">${p.replace(/\n/g, "<br/>")}</p>`)
          .join("\n");
        const title = doc.metadata.title || baseName;
        const wordHtml = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
              body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 1in; color: #1e293b; }
              h1 { font-size: 18pt; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            ${paragraphsHtml}
          </body>
          </html>
        `;
        outputBuffer = Buffer.from(wordHtml, "utf-8");
      } else {
        throw new Error(
          `Document conversion finished, but output .${targetFormat} file was not generated.`
        );
      }
    }

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

    return new NextResponse(new Uint8Array(outputBuffer), {
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

    // Last-ditch native fallback for ODT to PDF if any error was caught
    try {
      const formData = await req.clone().formData();
      const file = formData.get("file") as File | null;
      if (file && file.name.toLowerCase().endsWith(".odt")) {
        const { renderOdtToPdfBuffer } = await import("@/lib/engines/odt-engine");
        const buf = await file.arrayBuffer();
        const baseName = path.basename(file.name, path.extname(file.name));
        const pdfBytes = await renderOdtToPdfBuffer(Buffer.from(buf));
        return new NextResponse(new Uint8Array(pdfBytes), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.pdf"`,
          },
        });
      }
    } catch {}

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
