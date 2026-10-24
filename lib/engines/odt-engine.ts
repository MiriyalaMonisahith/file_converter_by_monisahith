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
  type: "h1" | "h2" | "h3" | "p" | "bullet" | "table-row";
  text: string;
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

/**
 * Extracts structured document blocks (headings, paragraphs, bullet lists, tables)
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

  if (contentXml) {
    // Match block-level elements in sequential order:
    // headings, paragraphs, list items, table rows
    const blockRegex = /<(text:(?:p|h)|table:table-row)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = blockRegex.exec(contentXml)) !== null) {
      const tag = match[1].toLowerCase();
      const rawInner = match[2];

      const cleanText = rawInner
        .replace(/<text:tab\s*\/>/gi, "    ")
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

      if (!cleanText) continue;

      if (tag.startsWith("text:h")) {
        const isH1 = /outline-level=["']1["']/i.test(match[0]);
        const isH2 = /outline-level=["']2["']/i.test(match[0]);
        elements.push({
          type: isH1 ? "h1" : isH2 ? "h2" : "h3",
          text: cleanText,
        });
      } else if (tag.startsWith("table:table-row")) {
        // Tabular row - collapse multiple spaces
        elements.push({
          type: "table-row",
          text: cleanText.replace(/\s{2,}/g, "  |  "),
        });
      } else {
        // Check if paragraph is inside a list item or starts with bullet markers
        const isBullet = /^[•\-*]\s+/i.test(cleanText);
        elements.push({
          type: isBullet ? "bullet" : "p",
          text: isBullet ? cleanText.replace(/^[•\-*]\s+/, "") : cleanText,
        });
      }
    }
  }

  // If title was not in meta.xml, look for first H1
  if (!title) {
    const firstH1 = elements.find((e) => e.type === "h1");
    if (firstH1) {
      title = firstH1.text;
    }
  }

  const rawText = elements.map((e) => e.text).join("\n\n");

  return { title, author, elements, rawText };
}

/**
 * Converts an ODT buffer or file directly into a high-standard, vector-clean PDF binary buffer (Uint8Array).
 * Runs natively in Node.js and the Browser with zero subprocess dependencies.
 */
export async function renderOdtToPdfBuffer(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  options?: OdtToPdfOptions
): Promise<Uint8Array> {
  const { title: parsedTitle, author: parsedAuthor, elements } =
    await parseOdtStructuredContent(fileOrBuffer);

  const docTitle =
    options?.title ||
    (parsedTitle && parsedTitle !== "Document Title" ? parsedTitle : options?.defaultTitle || "Document");
  const author = options?.author || parsedAuthor;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Standard A4 dimensions (in points: 72 points per inch)
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 54;
  const MARGIN_RIGHT = 54;
  const MARGIN_TOP = 54;
  const MARGIN_BOTTOM = 54;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  // Word wrapping utility
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

  interface RenderableItem {
    type: "text" | "spacing" | "bullet";
    text?: string;
    font?: any;
    size?: number;
    color?: any;
    lineHeight?: number;
    indent?: number;
    height?: number;
  }

  const itemsToRender: RenderableItem[] = [];

  for (const el of elements) {
    if (el.type === "h1") {
      itemsToRender.push({ type: "spacing", height: 16 });
      const wrapped = wrapText(el.text, fontBold, 16, CONTENT_WIDTH);
      for (const line of wrapped) {
        itemsToRender.push({
          type: "text",
          text: line,
          font: fontBold,
          size: 16,
          color: rgb(0.08, 0.12, 0.2),
          lineHeight: 22,
        });
      }
      itemsToRender.push({ type: "spacing", height: 6 });
    } else if (el.type === "h2") {
      itemsToRender.push({ type: "spacing", height: 12 });
      const wrapped = wrapText(el.text, fontBold, 13, CONTENT_WIDTH);
      for (const line of wrapped) {
        itemsToRender.push({
          type: "text",
          text: line,
          font: fontBold,
          size: 13,
          color: rgb(0.12, 0.18, 0.28),
          lineHeight: 18,
        });
      }
      itemsToRender.push({ type: "spacing", height: 4 });
    } else if (el.type === "h3") {
      itemsToRender.push({ type: "spacing", height: 9 });
      const wrapped = wrapText(el.text, fontBold, 11.5, CONTENT_WIDTH);
      for (const line of wrapped) {
        itemsToRender.push({
          type: "text",
          text: line,
          font: fontBold,
          size: 11.5,
          color: rgb(0.18, 0.24, 0.35),
          lineHeight: 16,
        });
      }
      itemsToRender.push({ type: "spacing", height: 3 });
    } else if (el.type === "bullet") {
      const bulletIndent = 14;
      const wrapped = wrapText(el.text, fontRegular, 10, CONTENT_WIDTH - bulletIndent);
      for (let i = 0; i < wrapped.length; i++) {
        itemsToRender.push({
          type: i === 0 ? "bullet" : "text",
          text: wrapped[i],
          font: fontRegular,
          size: 10,
          color: rgb(0.15, 0.2, 0.26),
          lineHeight: 14.5,
          indent: bulletIndent,
        });
      }
      itemsToRender.push({ type: "spacing", height: 3 });
    } else if (el.type === "table-row") {
      const wrapped = wrapText(el.text, fontRegular, 9.5, CONTENT_WIDTH - 8);
      for (const line of wrapped) {
        itemsToRender.push({
          type: "text",
          text: line,
          font: fontRegular,
          size: 9.5,
          color: rgb(0.2, 0.25, 0.32),
          lineHeight: 14,
          indent: 4,
        });
      }
      itemsToRender.push({ type: "spacing", height: 2 });
    } else {
      // Normal paragraph
      const wrapped = wrapText(el.text, fontRegular, 10.5, CONTENT_WIDTH);
      for (const line of wrapped) {
        itemsToRender.push({
          type: "text",
          text: line,
          font: fontRegular,
          size: 10.5,
          color: rgb(0.12, 0.16, 0.22),
          lineHeight: 15.5,
        });
      }
      itemsToRender.push({ type: "spacing", height: 5 });
    }
  }

  // Fallback for empty documents
  if (itemsToRender.length === 0) {
    itemsToRender.push({
      type: "text",
      text: "Document contains no readable text content.",
      font: fontItalic,
      size: 11,
      color: rgb(0.4, 0.45, 0.5),
      lineHeight: 16,
    });
  }

  // Paginate items based on usable vertical height
  const pages: RenderableItem[][] = [];
  let currentPageItems: RenderableItem[] = [];
  const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM - 48; // room for top running header & bottom footer
  let currentHeight = 0;

  for (const item of itemsToRender) {
    const itemHeight = item.type === "spacing" ? (item.height || 0) : (item.lineHeight || 15);
    if (currentHeight + itemHeight > USABLE_HEIGHT && currentPageItems.length > 0) {
      pages.push(currentPageItems);
      currentPageItems = [item];
      currentHeight = itemHeight;
    } else {
      currentPageItems.push(item);
      currentHeight += itemHeight;
    }
  }
  if (currentPageItems.length > 0) {
    pages.push(currentPageItems);
  }

  const totalPages = pages.length;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const items = pages[pageIdx];

    // Running Header: Document Title on left
    const headerTitle = docTitle.length > 45 ? `${docTitle.slice(0, 42)}...` : docTitle;
    page.drawText(headerTitle, {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 32,
      size: 8.5,
      font: fontBold,
      color: rgb(0.38, 0.42, 0.5),
    });

    if (author) {
      const authorText = `Author: ${author.length > 25 ? `${author.slice(0, 22)}...` : author}`;
      const authorWidth = fontRegular.widthOfTextAtSize(authorText, 8.5);
      page.drawText(authorText, {
        x: PAGE_WIDTH - MARGIN_RIGHT - authorWidth,
        y: PAGE_HEIGHT - 32,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.45, 0.5, 0.56),
      });
    }

    // Top Header Divider Rule
    page.drawLine({
      start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 39 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 39 },
      thickness: 0.75,
      color: rgb(0.85, 0.88, 0.92),
    });

    // Body content rendering
    let yPos = PAGE_HEIGHT - MARGIN_TOP - 16;
    for (const item of items) {
      if (item.type === "spacing") {
        yPos -= item.height || 0;
      } else if (item.type === "bullet") {
        if (item.text) {
          // Draw bullet circle/char
          page.drawText("•", {
            x: MARGIN_LEFT + 2,
            y: yPos,
            size: item.size || 10,
            font: fontBold,
            color: rgb(0.3, 0.35, 0.45),
          });
          page.drawText(item.text, {
            x: MARGIN_LEFT + (item.indent || 14),
            y: yPos,
            size: item.size || 10,
            font: item.font || fontRegular,
            color: item.color || rgb(0.15, 0.2, 0.26),
          });
        }
        yPos -= item.lineHeight || 14.5;
      } else if (item.type === "text") {
        if (item.text) {
          page.drawText(item.text, {
            x: MARGIN_LEFT + (item.indent || 0),
            y: yPos,
            size: item.size || 10.5,
            font: item.font || fontRegular,
            color: item.color || rgb(0.12, 0.16, 0.22),
          });
        }
        yPos -= item.lineHeight || 15.5;
      }
    }

    // Bottom Footer Divider Rule
    page.drawLine({
      start: { x: MARGIN_LEFT, y: 38 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 38 },
      thickness: 0.75,
      color: rgb(0.85, 0.88, 0.92),
    });

    // Running Footer Text
    const footerBrand = "Generated with OpenPDF Studio";
    page.drawText(footerBrand, {
      x: MARGIN_LEFT,
      y: 24,
      size: 8,
      font: fontRegular,
      color: rgb(0.52, 0.57, 0.64),
    });

    const pageNumText = `Page ${pageIdx + 1} of ${totalPages}`;
    const pageNumWidth = fontRegular.widthOfTextAtSize(pageNumText, 8);
    page.drawText(pageNumText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - pageNumWidth,
      y: 24,
      size: 8,
      font: fontRegular,
      color: rgb(0.48, 0.53, 0.6),
    });
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

