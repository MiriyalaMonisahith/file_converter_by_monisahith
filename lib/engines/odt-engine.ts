import JSZip from "jszip";

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

/**
 * Parses an ODT (OpenDocument Text) binary buffer or File.
 * Extracts content paragraphs, metadata, embedded images, and styles.
 */
export async function parseOdtFile(fileOrBuffer: File | Blob | ArrayBuffer): Promise<ParsedOdtDocument> {
  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  }

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
