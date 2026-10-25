import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ParsedOdtMetadata {
  title: string;
  creator: string;
  subject: string;
  description: string;
  keywords: string[];
  initialCreator: string;
  creationDate: string;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  imageCount: number;
}

export interface ParsedOdtDocument {
  metadata: ParsedOdtMetadata;
  paragraphs: string[];
  rawText: string;
  contentXml: string;
  metaXml: string;
  stylesXml: string;
  imageNames: string[];
  zip: JSZip;
}

export interface OdtModificationOptions {
  originalZip?: JSZip;
  title?: string;
  creator?: string;
  subject?: string;
  description?: string;
  keywords?: string[];
  paragraphs?: string[];
  searchReplaceList?: { search: string; replace: string; caseSensitive?: boolean }[];
  appendNote?: string;
}

export interface OdtToPdfOptions {
  title?: string;
  author?: string;
  defaultTitle?: string;
}

export interface StructuredOdtElement {
  type: "h1" | "h2" | "h3" | "p" | "image" | "table" | "hr";
  text?: string;
  imageBytes?: Uint8Array;
  imagePath?: string;
  tableRows?: string[][];
  hasBorder?: boolean;
}

async function toArrayBuffer(fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  if (fileOrBuffer instanceof ArrayBuffer) {
    return fileOrBuffer;
  }
  if (fileOrBuffer instanceof Uint8Array) {
    const copy = new Uint8Array(fileOrBuffer.byteLength);
    copy.set(fileOrBuffer);
    return copy.buffer;
  }
  return await fileOrBuffer.arrayBuffer();
}

/**
 * Parses an ODT (OpenDocument Text) binary buffer or File.
 * Extracts content paragraphs, metadata, embedded images, and styles.
 */
export async function parseOdtFile(fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array): Promise<ParsedOdtDocument> {
  const arrayBuffer = await toArrayBuffer(fileOrBuffer);
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Read content.xml
  const contentFile = zip.file("content.xml");
  const contentXml = contentFile ? await contentFile.async("string") : "";

  // 2. Read meta.xml
  const metaFile = zip.file("meta.xml");
  const metaXml = metaFile ? await metaFile.async("string") : "";

  // 3. Read styles.xml
  const stylesFile = zip.file("styles.xml");
  const stylesXml = stylesFile ? await stylesFile.async("string") : "";

  // Extract embedded images list
  const imageNames: string[] = [];
  zip.forEach((relativePath) => {
    if (relativePath.startsWith("Pictures/") && !relativePath.endsWith("/")) {
      imageNames.push(relativePath);
    }
  });

  // 4. Parse content paragraphs using regex or DOMParser
  const paragraphs: string[] = [];
  if (contentXml) {
    // Extract text from <text:p ...>...</text:p> and <text:h ...>...</text:h>
    const pRegex = /<text:(?:p|h)[^>]*>([\s\S]*?)<\/text:(?:p|h)>/gi;
    let match;
    while ((match = pRegex.exec(contentXml)) !== null) {
      // Strip inner XML tags like <text:span>, <text:tab/>, etc.
      const rawInner = match[1]
        .replace(/<text:tab\s*\/>/gi, "\t")
        .replace(/<text:line-break\s*\/>/gi, "\n")
        .replace(/<text:s\s+text:c="(\d+)"\s*\/>/gi, (_, count) => " ".repeat(parseInt(count, 10)))
        .replace(/<text:s\s*\/>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (rawInner.length > 0) {
        paragraphs.push(decodeXmlEntities(rawInner));
      }
    }
  }

  const rawText = paragraphs.join("\n\n");

  // 5. Extract metadata from meta.xml
  const metadata: ParsedOdtMetadata = {
    title: extractXmlTagContent(metaXml, "dc:title"),
    creator: extractXmlTagContent(metaXml, "dc:creator"),
    subject: extractXmlTagContent(metaXml, "dc:subject"),
    description: extractXmlTagContent(metaXml, "dc:description"),
    initialCreator: extractXmlTagContent(metaXml, "meta:initial-creator"),
    creationDate: extractXmlTagContent(metaXml, "meta:creation-date") || new Date().toISOString(),
    keywords: extractAllXmlTagContents(metaXml, "meta:keyword"),
    wordCount: countWords(rawText),
    characterCount: rawText.length,
    paragraphCount: paragraphs.length,
    imageCount: imageNames.length,
  };

  return {
    metadata,
    paragraphs,
    rawText,
    contentXml,
    metaXml,
    stylesXml,
    imageNames,
    zip,
  };
}

/**
 * Modifies an existing ODT document or constructs a new one from scratch,
 * strictly complying with OASIS OpenDocument (ODF) specifications:
 * - Uncompressed 'mimetype' stored first
 * - Updated 'content.xml' and 'meta.xml'
 * - Clean packaging
 */
export async function modifyAndExportOdt(options: OdtModificationOptions): Promise<Blob> {
  let zip: JSZip;

  if (options.originalZip) {
    // Clone original zip
    zip = new JSZip();
    const originalFiles = options.originalZip.files;
    for (const [path, file] of Object.entries(originalFiles)) {
      if (!file.dir) {
        const content = await file.async("uint8array");
        zip.file(path, content);
      }
    }
  } else {
    // Generate new base ODT structure
    zip = await createBaseOdtStructure();
  }

  // 1. Process content.xml
  let currentContentXml = "";
  const existingContent = zip.file("content.xml");
  if (existingContent) {
    currentContentXml = await existingContent.async("string");
  } else {
    currentContentXml = getDefaultContentXml();
  }

  // Apply search & replace if requested
  if (options.searchReplaceList && options.searchReplaceList.length > 0) {
    for (const item of options.searchReplaceList) {
      if (!item.search) continue;
      const flags = item.caseSensitive ? "g" : "gi";
      // Escape search for regex
      const escaped = item.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, flags);
      currentContentXml = currentContentXml.replace(regex, escapeXmlEntities(item.replace));
    }
  }

  // Replace all paragraphs if provided
  if (options.paragraphs && options.paragraphs.length > 0) {
    const newBodyTextXml = options.paragraphs
      .map((p) => `<text:p text:style-name="Standard">${escapeXmlEntities(p)}</text:p>`)
      .join("\n      ");

    // Replace the inner content inside <office:text> ... </office:text>
    if (/<office:text[^>]*>([\s\S]*?)<\/office:text>/i.test(currentContentXml)) {
      currentContentXml = currentContentXml.replace(
        /(<office:text[^>]*>)([\s\S]*?)(<\/office:text>)/i,
        `$1\n      <office:forms form:automatic-focus="false"/>\n      ${newBodyTextXml}\n    $3`
      );
    }
  }

  // Append note if provided
  if (options.appendNote) {
    const noteXml = `<text:p text:style-name="Standard"><text:span text:style-name="Bold">Note:</text:span> ${escapeXmlEntities(
      options.appendNote
    )}</text:p>`;
    if (/<\/office:text>/i.test(currentContentXml)) {
      currentContentXml = currentContentXml.replace(/<\/office:text>/i, `  ${noteXml}\n    </office:text>`);
    }
  }

  zip.file("content.xml", currentContentXml);

  // 2. Process meta.xml (Metadata & Properties)
  let currentMetaXml = "";
  const existingMeta = zip.file("meta.xml");
  if (existingMeta) {
    currentMetaXml = await existingMeta.async("string");
  } else {
    currentMetaXml = getDefaultMetaXml();
  }

  const title = options.title !== undefined ? options.title : extractXmlTagContent(currentMetaXml, "dc:title");
  const creator = options.creator !== undefined ? options.creator : extractXmlTagContent(currentMetaXml, "dc:creator");
  const subject = options.subject !== undefined ? options.subject : extractXmlTagContent(currentMetaXml, "dc:subject");
  const description =
    options.description !== undefined ? options.description : extractXmlTagContent(currentMetaXml, "dc:description");

  // Rebuild metadata block
  currentMetaXml = updateOrInsertTag(currentMetaXml, "dc:title", title);
  currentMetaXml = updateOrInsertTag(currentMetaXml, "dc:creator", creator);
  currentMetaXml = updateOrInsertTag(currentMetaXml, "dc:subject", subject);
  currentMetaXml = updateOrInsertTag(currentMetaXml, "dc:description", description);
  currentMetaXml = updateOrInsertTag(currentMetaXml, "meta:creation-date", new Date().toISOString());

  if (options.keywords && options.keywords.length > 0) {
    const keywordsXml = options.keywords
      .map((k) => `<meta:keyword>${escapeXmlEntities(k.trim())}</meta:keyword>`)
      .join("\n    ");
    // Replace existing keywords
    currentMetaXml = currentMetaXml.replace(/<meta:keyword>[\s\S]*?<\/meta:keyword>/gi, "");
    currentMetaXml = currentMetaXml.replace(/<\/office:meta>/i, `  ${keywordsXml}\n  </office:meta>`);
  }

  zip.file("meta.xml", currentMetaXml);

  // 3. Ensure 'mimetype' is uncompressed and set first (ODF spec requirement)
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", {
    compression: "STORE",
  });

  // Generate output blob
  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.oasis.opendocument.text",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Creates a standard sample ODT document for immediate testing or demo usage.
 */
export async function createSampleOdtBlob(title = "OpenPDF Sample Document", author = "OpenPDF Studio"): Promise<Blob> {
  const paragraphs = [
    `${title}`,
    "This OpenDocument Text (.odt) file was created and modified natively using OpenPDF Studio.",
    "OpenDocument is an open, vendor-neutral XML-based document standard (ISO/IEC 26300) maintained by OASIS and supported by LibreOffice Writer, Apache OpenOffice, Google Docs, and Microsoft Word.",
    "You can edit these paragraphs in real time, modify document metadata (author, title, keywords), execute find & replace across document nodes, or convert this file to vector PDF, Word (DOCX), and high-resolution images.",
    "Document Status: Verified OpenDocument v1.2 / v1.3 format compliant.",
  ];

  return await modifyAndExportOdt({
    title,
    creator: author,
    subject: "OpenDocument Text Sample Demonstration",
    description: "Sample file generated by OpenPDF Studio for ODT manipulation and testing.",
    keywords: ["OpenPDF", "ODT", "OpenDocument", "LibreOffice", "Document Tools"],
    paragraphs,
  });
}

// -------------------------------------------------------------
// Internal XML Helpers & Base Templates
// -------------------------------------------------------------

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function escapeXmlEntities(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractXmlTagContent(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = regex.exec(xml);
  return match ? decodeXmlEntities(match[1].trim()) : "";
}

function extractAllXmlTagContents(xml: string, tagName: string): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(decodeXmlEntities(match[1].trim()));
  }
  return results;
}

function updateOrInsertTag(xml: string, tagName: string, value: string): string {
  const safeValue = escapeXmlEntities(value);
  const regex = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, "i");
  if (regex.test(xml)) {
    return xml.replace(regex, `<${tagName}>${safeValue}</${tagName}>`);
  }
  return xml.replace(/<\/office:meta>/i, `  <${tagName}>${safeValue}</${tagName}>\n  </office:meta>`);
}

function countWords(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

async function createBaseOdtStructure(): Promise<JSZip> {
  const zip = new JSZip();

  // 1. mimetype (STORE, uncompressed)
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", {
    compression: "STORE",
  });

  // 2. META-INF/manifest.xml
  zip.file(
    "META-INF/manifest.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`
  );

  // 3. meta.xml
  zip.file("meta.xml", getDefaultMetaXml());

  // 4. styles.xml
  zip.file(
    "styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:default-style style:family="paragraph">
      <style:paragraph-properties fo:line-height="120%" fo:margin-bottom="0.2in"/>
      <style:text-properties fo:font-size="11pt" fo:color="#1e293b" style:font-name="Segoe UI, Calibri, sans-serif"/>
    </style:default-style>
  </office:styles>
</office:document-styles>`
  );

  // 5. content.xml
  zip.file("content.xml", getDefaultContentXml());

  return zip;
}

function getDefaultMetaXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  office:version="1.2">
  <office:meta>
    <dc:title>Document Title</dc:title>
    <dc:creator>OpenPDF Studio User</dc:creator>
    <dc:description>Created with OpenPDF Studio</dc:description>
    <dc:subject>Office Document</dc:subject>
    <meta:initial-creator>OpenPDF Studio</meta:initial-creator>
    <meta:creation-date>${new Date().toISOString()}</meta:creation-date>
  </office:meta>
</office:document-meta>`;
}

function getDefaultContentXml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0"
  office:version="1.2">
  <office:automatic-styles>
    <style:style style:name="Standard" style:family="paragraph" style:class="text">
      <style:text-properties fo:color="#1e293b" fo:font-size="11pt"/>
    </style:style>
    <style:style style:name="Bold" style:family="text">
      <style:text-properties fo:font-weight="bold"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:text>
      <office:forms form:automatic-focus="false"/>
      <text:p text:style-name="Standard">Welcome to OpenPDF Studio.</text:p>
    </office:text>
  </office:body>
</office:document-content>`;
}

// -------------------------------------------------------------
// High-Precision Native ODT to PDF Engine (Vector Fidelity)
// -------------------------------------------------------------

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function isJpg(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

/**
 * Extracts structured document blocks (headings, paragraphs, bullet lists, tables, photos/images, and divider borders)
 * and metadata from an OpenDocument Text file.
 */
export async function parseOdtStructuredContent(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array
): Promise<{
  title: string;
  author: string;
  elements: StructuredOdtElement[];
  rawText: string;
}> {
  const arrayBuffer = await toArrayBuffer(fileOrBuffer);
  const zip = await JSZip.loadAsync(arrayBuffer);
  const contentFile = zip.file("content.xml");
  const contentXml = contentFile ? await contentFile.async("string") : "";

  const metaFile = zip.file("meta.xml");
  const metaXml = metaFile ? await metaFile.async("string") : "";

  let title = extractXmlTagContent(metaXml, "dc:title");
  let author = extractXmlTagContent(metaXml, "dc:creator");

  const elements: StructuredOdtElement[] = [];
  const processedImages = new Set<string>();

  // Collect all embedded image filenames from the zip archive
  const allZipImages = Object.keys(zip.files).filter(
    (p) => p.startsWith("Pictures/") && !p.endsWith("/")
  );

  if (contentXml) {
    // Regex matching major block-level elements: tables, draw frames/images, headings, and paragraphs
    const blockRegex =
      /<(table:table|draw:frame|text:h|text:p)[^>]*>([\s\S]*?)<\/\1>|<draw:image[^>]*\/?>/gi;
    let match;
    while ((match = blockRegex.exec(contentXml)) !== null) {
      const fullMatch = match[0];
      const tag = (match[1] || "").toLowerCase();
      const rawInner = match[2] || "";

      // 1. Table with rows, cells, and borders
      if (tag === "table:table") {
        const rows: string[][] = [];
        const rowRegex = /<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/gi;
        let rMatch;
        while ((rMatch = rowRegex.exec(rawInner)) !== null) {
          const rowInner = rMatch[1];
          const cells: string[] = [];
          const cellRegex = /<table:table-cell[^>]*>([\s\S]*?)<\/table:table-cell>/gi;
          let cMatch;
          while ((cMatch = cellRegex.exec(rowInner)) !== null) {
            const cellInner = cMatch[1];
            const cleanCell = cellInner
              .replace(/<text:tab\s*\/>/gi, "\t")
              .replace(/<text:line-break\s*\/>/gi, "\n")
              .replace(/<text:s\s+text:c="(\d+)"\s*\/>/gi, (_, count) => " ".repeat(parseInt(count, 10)))
              .replace(/<text:s\s*\/>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .trim();
            cells.push(decodeXmlEntities(cleanCell));
          }
          if (cells.length > 0) {
            rows.push(cells);
          }
        }

        if (rows.length > 0) {
          elements.push({
            type: "table",
            tableRows: rows,
            hasBorder: true,
          });
        }
        continue;
      }

      // 2. Standalone or framed Draw image / photo
      if (tag === "draw:frame" || fullMatch.toLowerCase().startsWith("<draw:image")) {
        const hrefMatch = /href=["']([^"']+)["']/i.exec(fullMatch);
        if (hrefMatch) {
          const rawPath = hrefMatch[1].replace(/^\.\//, "");
          const imgFile = zip.file(rawPath) || zip.file(decodeURIComponent(rawPath));
          if (imgFile) {
            const imageBytes = await imgFile.async("uint8array");
            elements.push({
              type: "image",
              imageBytes,
              imagePath: rawPath,
              hasBorder: true,
            });
            processedImages.add(rawPath);
            continue;
          }
        }
      }

      // 3. Headings & Paragraphs
      // Check if this paragraph contains an inline draw image
      if (rawInner.includes("<draw:image") || rawInner.includes("<draw:frame")) {
        const hrefMatch = /href=["']([^"']+)["']/i.exec(rawInner);
        if (hrefMatch) {
          const rawPath = hrefMatch[1].replace(/^\.\//, "");
          const imgFile = zip.file(rawPath) || zip.file(decodeURIComponent(rawPath));
          if (imgFile) {
            const imageBytes = await imgFile.async("uint8array");
            elements.push({
              type: "image",
              imageBytes,
              imagePath: rawPath,
              hasBorder: true,
            });
            processedImages.add(rawPath);
          }
        }
      }

      const cleanText = rawInner
        .replace(/<text:tab\s*\/>/gi, "\t")
        .replace(/<text:line-break\s*\/>/gi, "\n")
        .replace(/<text:s\s+text:c="(\d+)"\s*\/>/gi, (_, count) => " ".repeat(parseInt(count, 10)))
        .replace(/<text:s\s*\/>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();

      // Check for horizontal border divider lines
      const isHr =
        /Horizontal_20_Line|horizontal-rule|border-bottom/i.test(fullMatch) ||
        /^[_\-—]{3,}$/.test(cleanText);
      if (isHr) {
        elements.push({ type: "hr", hasBorder: true });
        continue;
      }

      if (!cleanText) {
        // Preserve vertical paragraph break spacing
        elements.push({ type: "p", text: "" });
        continue;
      }

      if (tag.startsWith("text:h")) {
        const isH1 = /outline-level=["']1["']/i.test(fullMatch);
        const isH2 = /outline-level=["']2["']/i.test(fullMatch);
        elements.push({
          type: isH1 ? "h1" : isH2 ? "h2" : "h3",
          text: cleanText,
        });
      } else {
        // Preserve paragraph text as originally written
        elements.push({
          type: "p",
          text: cleanText,
        });
      }
    }
  }

  // Ensure ALL photos in Pictures/ are included so none are omitted
  for (const imgPath of allZipImages) {
    if (!processedImages.has(imgPath)) {
      const imgFile = zip.file(imgPath);
      if (imgFile) {
        const imageBytes = await imgFile.async("uint8array");
        elements.push({
          type: "image",
          imageBytes,
          imagePath: imgPath,
          hasBorder: true,
        });
        processedImages.add(imgPath);
      }
    }
  }

  // If title was not in meta.xml, look for first H1
  if (!title) {
    const firstH1 = elements.find((e) => e.type === "h1");
    if (firstH1 && firstH1.text) {
      title = firstH1.text;
    }
  }

  const rawText = elements
    .filter((e) => e.text)
    .map((e) => e.text)
    .join("\n\n");

  return { title, author, elements, rawText };
}

/**
 * Converts an ODT buffer or file directly into a high-standard, vector-clean PDF binary buffer (Uint8Array).
 * Preserves the exact text, tables with borders, embedded photos, and formatting without synthetic headers or branding.
 */
export async function renderOdtToPdfBuffer(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  options?: OdtToPdfOptions
): Promise<Uint8Array> {
  const { title: parsedTitle, author: parsedAuthor, elements } =
    await parseOdtStructuredContent(fileOrBuffer);

  const pdfDoc = await PDFDocument.create();

  // Set metadata ONLY if present in the original document
  if (options?.title || parsedTitle) {
    pdfDoc.setTitle(options?.title || parsedTitle);
  }
  if (options?.author || parsedAuthor) {
    pdfDoc.setAuthor(options?.author || parsedAuthor);
  }

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Standard A4 dimensions (in points: 72 points per inch)
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 48;
  const MARGIN_RIGHT = 48;
  const MARGIN_TOP = 48;
  const MARGIN_BOTTOM = 48;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  // Word wrapping utility preserving original words
  function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    const paragraphs = text.split("\n");

    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) {
        lines.push("");
        continue;
      }
      const words = trimmed.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(candidate, size);
        if (width <= maxWidth) {
          currentLine = candidate;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  }

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let yPos = PAGE_HEIGHT - MARGIN_TOP;

  function ensurePageSpace(neededHeight: number) {
    if (yPos - neededHeight < MARGIN_BOTTOM) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      yPos = PAGE_HEIGHT - MARGIN_TOP;
    }
  }

  for (const el of elements) {
    // 1. Photos & Images
    if (el.type === "image" && el.imageBytes && el.imageBytes.length > 0) {
      let embeddedImg: any = null;
      try {
        if (isPng(el.imageBytes)) {
          embeddedImg = await pdfDoc.embedPng(el.imageBytes);
        } else if (isJpg(el.imageBytes)) {
          embeddedImg = await pdfDoc.embedJpg(el.imageBytes);
        } else {
          try {
            embeddedImg = await pdfDoc.embedPng(el.imageBytes);
          } catch {
            embeddedImg = await pdfDoc.embedJpg(el.imageBytes);
          }
        }
      } catch (imgErr) {
        console.warn("Could not embed image directly:", imgErr);
      }

      if (embeddedImg) {
        const maxW = CONTENT_WIDTH;
        const maxH = 320;
        let w = embeddedImg.width;
        let h = embeddedImg.height;
        const scale = Math.min(maxW / w, maxH / h, 1);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));

        ensurePageSpace(h + 16);
        const imgX = MARGIN_LEFT + (CONTENT_WIDTH - w) / 2;
        const imgY = yPos - h;

        // Draw photo
        page.drawImage(embeddedImg, {
          x: imgX,
          y: imgY,
          width: w,
          height: h,
        });

        // Draw clean border around photo
        page.drawRectangle({
          x: imgX,
          y: imgY,
          width: w,
          height: h,
          borderColor: rgb(0.65, 0.7, 0.78),
          borderWidth: 1,
        });

        yPos -= h + 14;
      }
      continue;
    }

    // 2. Tables with Borders
    if (el.type === "table" && el.tableRows && el.tableRows.length > 0) {
      const numCols = Math.max(...el.tableRows.map((r) => r.length), 1);
      const colWidth = CONTENT_WIDTH / numCols;

      for (let rowIdx = 0; rowIdx < el.tableRows.length; rowIdx++) {
        const row = el.tableRows[rowIdx];
        const cellLinesList: string[][] = [];
        let maxLinesInRow = 1;

        for (let colIdx = 0; colIdx < numCols; colIdx++) {
          const cellText = row[colIdx] || "";
          const lines = wrapText(
            cellText,
            rowIdx === 0 ? fontBold : fontRegular,
            9.5,
            Math.max(colWidth - 10, 20)
          );
          cellLinesList.push(lines.length > 0 ? lines : [""]);
          if (lines.length > maxLinesInRow) {
            maxLinesInRow = lines.length;
          }
        }

        const rowHeight = Math.max(22, maxLinesInRow * 13 + 10);
        ensurePageSpace(rowHeight);

        // Draw each cell with visible border lines and text
        for (let colIdx = 0; colIdx < numCols; colIdx++) {
          const cellX = MARGIN_LEFT + colIdx * colWidth;
          const cellY = yPos - rowHeight;

          // Visible cell border rectangle
          page.drawRectangle({
            x: cellX,
            y: cellY,
            width: colWidth,
            height: rowHeight,
            borderColor: rgb(0.5, 0.55, 0.65), // Crisp visible table border
            borderWidth: 1,
            color: rowIdx === 0 ? rgb(0.93, 0.95, 0.98) : undefined,
          });

          // Text inside cell
          const lines = cellLinesList[colIdx];
          let textY = cellY + rowHeight - 13;
          for (const line of lines) {
            if (line) {
              page.drawText(line, {
                x: cellX + 5,
                y: textY,
                size: 9.5,
                font: rowIdx === 0 ? fontBold : fontRegular,
                color: rgb(0.1, 0.15, 0.22),
              });
            }
            textY -= 13;
          }
        }

        yPos -= rowHeight;
      }

      yPos -= 10;
      continue;
    }

    // 3. Horizontal Border Divider Rules
    if (el.type === "hr") {
      ensurePageSpace(14);
      yPos -= 5;
      page.drawLine({
        start: { x: MARGIN_LEFT, y: yPos },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: yPos },
        thickness: 1,
        color: rgb(0.65, 0.7, 0.78),
      });
      yPos -= 9;
      continue;
    }

    // 4. Headings
    if (el.type === "h1" || el.type === "h2" || el.type === "h3") {
      const isH1 = el.type === "h1";
      const isH2 = el.type === "h2";
      const fontSize = isH1 ? 16 : isH2 ? 13 : 11.5;
      const lineHeight = isH1 ? 22 : isH2 ? 18 : 16;
      const font = fontBold;
      const color = isH1
        ? rgb(0.08, 0.12, 0.2)
        : isH2
        ? rgb(0.12, 0.18, 0.28)
        : rgb(0.18, 0.24, 0.35);

      const wrapped = wrapText(el.text || "", font, fontSize, CONTENT_WIDTH);
      for (const line of wrapped) {
        ensurePageSpace(lineHeight + 4);
        page.drawText(line, {
          x: MARGIN_LEFT,
          y: yPos - lineHeight + 4,
          size: fontSize,
          font,
          color,
        });
        yPos -= lineHeight;
      }
      yPos -= isH1 ? 6 : 4;
      continue;
    }

    // 5. Normal Paragraphs
    if (el.type === "p") {
      if (!el.text) {
        yPos -= 8;
      } else {
        const wrapped = wrapText(el.text, fontRegular, 10.5, CONTENT_WIDTH);
        for (const line of wrapped) {
          ensurePageSpace(16);
          page.drawText(line, {
            x: MARGIN_LEFT,
            y: yPos - 12,
            size: 10.5,
            font: fontRegular,
            color: rgb(0.12, 0.16, 0.22),
          });
          yPos -= 15.5;
        }
        yPos -= 5;
      }
    }
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return pdfBytes;
}

/**
 * High-Level Client/Web API: Converts an ODT File or Blob directly into a standard PDF Blob.
 */
export async function convertOdtToPdf(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  options?: OdtToPdfOptions
): Promise<Blob> {
  const pdfBytes = await renderOdtToPdfBuffer(fileOrBuffer, options);
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}

