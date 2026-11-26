import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ParsedSlideImage {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
}

export interface ParsedSlide {
  slideIndex: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  notes?: string;
  images: ParsedSlideImage[];
}

export interface ParsedPresentation {
  title: string;
  slideCount: number;
  slides: ParsedSlide[];
  width: number;
  height: number;
}

async function toArrayBuffer(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array
): Promise<ArrayBuffer> {
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

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return "";
      }
    });
}

const UNICODE_SYMBOL_REPLACEMENTS: Record<string, string> = {
  // Arrows
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "⇒": "=>",
  "⇐": "<=",
  "➜": "->",
  "➔": "->",
  "➤": ">",
  "►": ">",
  "◄": "<",
  "▲": "^",
  "▼": "v",

  // Bullets & shapes
  "●": "•",
  "■": "•",
  "◆": "•",
  "▪": "•",
  "▫": "•",
  "○": "o",
  "□": "[]",
  "◇": "<>",

  // Checkmarks & crosses
  "✔": "[✓]",
  "✓": "[✓]",
  "☑": "[✓]",
  "✕": "[x]",
  "✗": "[x]",
  "☒": "[x]",

  // Stars & badges
  "★": "*",
  "☆": "*",
  "✪": "*",

  // Currency
  "₹": "Rs.",
  "€": "EUR",

  // Math symbols
  "≤": "<=",
  "≥": ">=",
  "≠": "!=",
  "≈": "~=",
  "∑": "SUM",
  "√": "SQRT",
  "∞": "inf",
  "µ": "u",
  "×": "x",
  "÷": "/",
  "±": "+/-",
  "°": " deg",
  "π": "pi",
  "α": "alpha",
  "β": "beta",
};

export function sanitizePdfText(text: string, font?: any): string {
  if (!text) return "";

  let sanitized = text;
  for (const [sym, rep] of Object.entries(UNICODE_SYMBOL_REPLACEMENTS)) {
    if (sanitized.includes(sym)) {
      sanitized = sanitized.replaceAll(sym, rep);
    }
  }

  if (font) {
    let result = "";
    for (const char of sanitized) {
      try {
        font.widthOfTextAtSize(char, 12);
        result += char;
      } catch {
        result += " ";
      }
    }
    return result;
  }

  return sanitized;
}

function safeDrawText(page: any, text: string, options: any, font?: any) {
  try {
    const safe = sanitizePdfText(text, font || options.font);
    page.drawText(safe, options);
  } catch {
    try {
      const asciiOnly = text.replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
      page.drawText(asciiOnly, options);
    } catch {
      // Graceful fallback: avoid crashing entire presentation
    }
  }
}

function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const safe = sanitizePdfText(text, font);
  const clean = safe.replace(/[\r\n\t]+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    let testWidth = 0;
    try {
      testWidth = font.widthOfTextAtSize(testLine, fontSize);
    } catch {
      // In case of unsupported unicode characters, fallback to character count estimation
      testWidth = testLine.length * (fontSize * 0.55);
    }

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Extracts slides from an OpenXML PPTX or fallback legacy PPT.
 */
export async function parsePresentation(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  fallbackTitle = "Presentation"
): Promise<ParsedPresentation> {
  const arrayBuffer = await toArrayBuffer(fileOrBuffer);

  // Default standard 16:9 widescreen presentation dimensions
  let width = 960;
  let height = 540;
  let docTitle = fallbackTitle;

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Read slide dimensions from ppt/presentation.xml if available
    const presFile = zip.file("ppt/presentation.xml");
    if (presFile) {
      const presXml = await presFile.async("string");
      const szMatch = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i.exec(presXml);
      if (szMatch) {
        const cx = parseInt(szMatch[1], 10);
        const cy = parseInt(szMatch[2], 10);
        if (cx > 0 && cy > 0) {
          // EMUs to points (1 pt = 12700 EMUs)
          const ptW = Math.round(cx / 12700);
          const ptH = Math.round(cy / 12700);
          if (ptW >= 400 && ptW <= 1920 && ptH >= 300 && ptH <= 1200) {
            width = ptW;
            height = ptH;
          }
        }
      }
    }

    // 2. Discover and sort all slide files
    const slideKeys = Object.keys(zip.files).filter((k) =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(k)
    );

    slideKeys.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      return numA - numB;
    });

    const parsedSlides: ParsedSlide[] = [];

    for (let i = 0; i < slideKeys.length; i++) {
      const key = slideKeys[i];
      const xml = await zip.file(key)!.async("string");
      const slideIndex = i + 1;

      // Relationships for slide images
      const relsKey = key.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
      const relsFile = zip.file(relsKey);
      const imageRelMap: Record<string, string> = {};

      if (relsFile) {
        const relsXml = await relsFile.async("string");
        const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Type="[^"]*image[^"]*"[^>]*Target="([^"]+)"/gi;
        let rMatch;
        while ((rMatch = relRegex.exec(relsXml)) !== null) {
          const relId = rMatch[1];
          let target = rMatch[2].replace(/^\.\.\//, "ppt/");
          if (!target.startsWith("ppt/")) target = `ppt/${target}`;
          imageRelMap[relId] = target;
        }
      }

      // Extract slide images
      const images: ParsedSlideImage[] = [];
      for (const targetPath of Object.values(imageRelMap)) {
        const imgFile = zip.file(targetPath);
        if (imgFile) {
          const imgBytes = await imgFile.async("uint8array");
          const lower = targetPath.toLowerCase();
          let mime = "image/png";
          if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
          else if (lower.endsWith(".png")) mime = "image/png";
          else continue; // Only embed JPG/PNG natively in PDF

          images.push({
            name: targetPath.split("/").pop() || "image.png",
            bytes: imgBytes,
            mimeType: mime,
          });
        }
      }

      // Extract shapes: differentiate titles from body text
      let slideTitle = "";
      let slideSubtitle = "";
      const bullets: string[] = [];

      // Regex matching shape elements <p:sp>
      const spRegex = /<p:sp>([\s\S]*?)<\/p:sp>/gi;
      let spMatch;

      while ((spMatch = spRegex.exec(xml)) !== null) {
        const spXml = spMatch[1];
        const isTitleShape =
          /<p:ph[^>]*type="(?:title|ctrTitle)"/i.test(spXml) ||
          /<p:cNvPr[^>]*name="[^"]*Title[^"]*"/i.test(spXml);
        const isSubTitleShape =
          /<p:ph[^>]*type="subTitle"/i.test(spXml) ||
          /<p:cNvPr[^>]*name="[^"]*Subtitle[^"]*"/i.test(spXml);

        // Extract paragraphs in this shape
        const pRegex = /<a:p[^>]*>([\s\S]*?)<\/a:p>/gi;
        let pMatch;
        const shapeParagraphs: string[] = [];

        while ((pMatch = pRegex.exec(spXml)) !== null) {
          const pBody = pMatch[1];
          const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/gi;
          let pText = "";
          let tMatch;
          while ((tMatch = tRegex.exec(pBody)) !== null) {
            pText += tMatch[1];
          }
          const cleanP = decodeXmlEntities(pText).trim();
          if (cleanP) {
            shapeParagraphs.push(cleanP);
          }
        }

        if (shapeParagraphs.length > 0) {
          if (isTitleShape && !slideTitle) {
            slideTitle = shapeParagraphs[0];
            if (shapeParagraphs.length > 1) {
              bullets.push(...shapeParagraphs.slice(1));
            }
          } else if (isSubTitleShape && !slideSubtitle) {
            slideSubtitle = shapeParagraphs[0];
            if (shapeParagraphs.length > 1) {
              bullets.push(...shapeParagraphs.slice(1));
            }
          } else {
            bullets.push(...shapeParagraphs);
          }
        }
      }

      // Fallback: if no title found via shapes, check all <a:p> globally in slide
      if (!slideTitle && bullets.length === 0) {
        const globalPRegex = /<a:p[^>]*>([\s\S]*?)<\/a:p>/gi;
        let gpMatch;
        while ((gpMatch = globalPRegex.exec(xml)) !== null) {
          const pBody = gpMatch[1];
          const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/gi;
          let pText = "";
          let tMatch;
          while ((tMatch = tRegex.exec(pBody)) !== null) {
            pText += tMatch[1];
          }
          const cleanP = decodeXmlEntities(pText).trim();
          if (cleanP) {
            if (!slideTitle) {
              slideTitle = cleanP;
            } else {
              bullets.push(cleanP);
            }
          }
        }
      }

      if (!slideTitle) {
        slideTitle = bullets.length > 0 ? bullets.shift()! : `Slide ${slideIndex}`;
      }

      if (slideIndex === 1 && slideTitle && docTitle === fallbackTitle) {
        docTitle = slideTitle;
      }

      parsedSlides.push({
        slideIndex,
        title: slideTitle,
        subtitle: slideSubtitle || undefined,
        bullets,
        images,
      });
    }

    if (parsedSlides.length > 0) {
      return {
        title: docTitle,
        slideCount: parsedSlides.length,
        slides: parsedSlides,
        width,
        height,
      };
    }
  } catch (pptxErr) {
    console.warn("Could not parse as OpenXML PPTX zip, attempting raw presentation text recovery:", pptxErr);
  }

  // Fallback for legacy binary .ppt or corrupted files: extract readable text strings
  const uint8 = new Uint8Array(arrayBuffer);
  let asciiText = "";
  for (let i = 0; i < uint8.length; i++) {
    const code = uint8[i];
    if (code >= 32 && code <= 126) {
      asciiText += String.fromCharCode(code);
    } else if (code === 10 || code === 13) {
      asciiText += "\n";
    }
  }

  const rawLines = asciiText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && !/^[!@#$%^&*()_+=\-[\]{};:'",.<>/?\\|0-9\s]+$/.test(l));

  const slides: ParsedSlide[] = [];
  const linesPerSlide = 5;
  const totalSlides = Math.max(1, Math.ceil(rawLines.length / linesPerSlide));

  for (let s = 0; s < totalSlides; s++) {
    const chunk = rawLines.slice(s * linesPerSlide, (s + 1) * linesPerSlide);
    const title = chunk[0] || `Slide ${s + 1}`;
    const bullets = chunk.slice(1);
    slides.push({
      slideIndex: s + 1,
      title,
      bullets,
      images: [],
    });
  }

  return {
    title: docTitle,
    slideCount: slides.length,
    slides,
    width,
    height,
  };
}

/**
 * High-performance PPT / PPTX to PDF Renderer
 * Creates vector-crisp landscape PDF slides formatted with typography and layout.
 */
export async function renderPptToPdfBuffer(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  defaultTitle = "PowerPoint Presentation"
): Promise<Uint8Array> {
  const presentation = await parsePresentation(fileOrBuffer, defaultTitle);
  const pdfDoc = await PDFDocument.create();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const slideW = presentation.width || 960;
  const slideH = presentation.height || 540;
  const marginX = Math.round(slideW * 0.065); // ~60pt
  const contentWidth = slideW - marginX * 2;

  for (const slide of presentation.slides) {
    const page = pdfDoc.addPage([slideW, slideH]);

    // Top Modern Accent Bar (Orange/Red gradient style)
    page.drawRectangle({
      x: 0,
      y: slideH - 7,
      width: slideW,
      height: 7,
      color: rgb(0.92, 0.35, 0.14),
    });

    // Slide Header: Title
    let currentY = slideH - 60;
    const titleFontSize = slideH > 600 ? 28 : 24;
    const titleLines = wrapText(slide.title, helveticaBold, titleFontSize, contentWidth);

    for (const line of titleLines) {
      safeDrawText(page, line, {
        x: marginX,
        y: currentY,
        size: titleFontSize,
        font: helveticaBold,
        color: rgb(0.09, 0.12, 0.18),
      }, helveticaBold);
      currentY -= titleFontSize + 6;
    }

    // Subtitle if available
    if (slide.subtitle) {
      currentY -= 4;
      const subLines = wrapText(slide.subtitle, helveticaOblique, 15, contentWidth);
      for (const line of subLines) {
        safeDrawText(page, line, {
          x: marginX,
          y: currentY,
          size: 15,
          font: helveticaOblique,
          color: rgb(0.35, 0.4, 0.48),
        }, helveticaOblique);
        currentY -= 20;
      }
    }

    // Divider line below header
    currentY -= 8;
    page.drawLine({
      start: { x: marginX, y: currentY },
      end: { x: slideW - marginX, y: currentY },
      thickness: 1,
      color: rgb(0.88, 0.9, 0.93),
    });
    currentY -= 24;

    // Layout configuration: Column with image if slide contains an image
    let bulletAreaWidth = contentWidth;
    let embeddedImgObj: any = null;
    let imgDim = { width: 0, height: 0, x: 0, y: 0 };

    if (slide.images && slide.images.length > 0) {
      try {
        const firstImg = slide.images[0];
        if (firstImg.mimeType === "image/png") {
          embeddedImgObj = await pdfDoc.embedPng(firstImg.bytes);
        } else {
          embeddedImgObj = await pdfDoc.embedJpg(firstImg.bytes);
        }

        if (embeddedImgObj) {
          const maxImgW = Math.round(contentWidth * 0.4);
          const maxImgH = Math.round(slideH * 0.55);
          const origW = embeddedImgObj.width;
          const origH = embeddedImgObj.height;
          const scale = Math.min(maxImgW / origW, maxImgH / origH, 1);

          imgDim.width = Math.round(origW * scale);
          imgDim.height = Math.round(origH * scale);
          imgDim.x = slideW - marginX - imgDim.width;
          imgDim.y = Math.max(55, Math.round(currentY - imgDim.height));

          bulletAreaWidth = contentWidth - imgDim.width - 25;
        }
      } catch (imgErr) {
        // Image embedding skipped gracefully if format isn't standard
        embeddedImgObj = null;
      }
    }

    // Render bullets / body paragraphs
    const bodyFontSize = slideH > 600 ? 16 : 14;
    const bodyLineHeight = bodyFontSize + 6;

    for (const bullet of slide.bullets) {
      if (currentY < 60) break; // Avoid footer overlap

      const bulletLines = wrapText(bullet, helvetica, bodyFontSize, bulletAreaWidth - 24);
      if (bulletLines.length === 0) continue;

      // Draw bullet mark
      safeDrawText(page, "•", {
        x: marginX + 6,
        y: currentY,
        size: bodyFontSize + 2,
        font: helveticaBold,
        color: rgb(0.92, 0.35, 0.14),
      }, helveticaBold);

      // Draw wrapped bullet text
      for (let bi = 0; bi < bulletLines.length; bi++) {
        const bLine = bulletLines[bi];
        safeDrawText(page, bLine, {
          x: marginX + 22,
          y: currentY,
          size: bodyFontSize,
          font: helvetica,
          color: rgb(0.18, 0.22, 0.28),
        }, helvetica);
        currentY -= bodyLineHeight;
        if (currentY < 60) break;
      }

      currentY -= 6; // Spacing between distinct bullets
    }

    // Draw embedded image if available
    if (embeddedImgObj) {
      try {
        page.drawImage(embeddedImgObj, {
          x: imgDim.x,
          y: imgDim.y,
          width: imgDim.width,
          height: imgDim.height,
        });
      } catch {
        // Safe fallback
      }
    }

    // Modern Slide Footer
    const footerY = 26;
    // Left: Document title
    const footerTitle =
      presentation.title.length > 50
        ? `${presentation.title.slice(0, 48)}...`
        : presentation.title;

    safeDrawText(page, footerTitle, {
      x: marginX,
      y: footerY,
      size: 10,
      font: helvetica,
      color: rgb(0.55, 0.6, 0.68),
    }, helvetica);

    // Right: Slide pagination
    const pageStr = `Slide ${slide.slideIndex} of ${presentation.slideCount}`;
    let pageStrW = 70;
    try {
      pageStrW = helvetica.widthOfTextAtSize(pageStr, 10);
    } catch {
      // fallback
    }

    safeDrawText(page, pageStr, {
      x: slideW - marginX - pageStrW,
      y: footerY,
      size: 10,
      font: helvetica,
      color: rgb(0.55, 0.6, 0.68),
    }, helvetica);
  }

  return await pdfDoc.save({ useObjectStreams: true });
}

/**
 * Universal browser-friendly PPT/PPTX to PDF Converter
 */
export async function convertPptToPdf(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  defaultTitle = "PowerPoint Presentation"
): Promise<Blob> {
  const pdfBytes = await renderPptToPdfBuffer(fileOrBuffer, defaultTitle);
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
