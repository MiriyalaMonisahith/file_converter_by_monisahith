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

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

interface ShapeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TextRun {
  text: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: ColorRGB;
}

interface TextParagraph {
  alignment: "left" | "center" | "right" | "justify";
  runs: TextRun[];
  bulletChar?: string;
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
  if (!str) return "";
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

function parseHexColor(hex?: string | null): ColorRGB | null {
  if (!hex) return null;
  const clean = hex.replace("#", "").trim();
  if (clean.length < 6) return null;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b)),
  };
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
      // Graceful fallback
    }
  }
}

/**
 * Extracts slides from an OpenXML PPTX or fallback legacy PPT.
 */
export async function parsePresentation(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  fallbackTitle = "PowerPoint Presentation"
): Promise<ParsedPresentation> {
  const arrayBuffer = await toArrayBuffer(fileOrBuffer);

  let width = 960;
  let height = 540;
  let docTitle = fallbackTitle;

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Read slide dimensions
    const presFile = zip.file("ppt/presentation.xml");
    if (presFile) {
      const presXml = await presFile.async("string");
      const szMatch = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i.exec(presXml);
      if (szMatch) {
        const cx = parseInt(szMatch[1], 10);
        const cy = parseInt(szMatch[2], 10);
        if (cx > 0 && cy > 0) {
          width = Math.round(cx / 12700);
          height = Math.round(cy / 12700);
        }
      }
    }

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

      // Extract images
      const relsKey = key.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
      const relsFile = zip.file(relsKey);
      const imageRelMap: Record<string, string> = {};

      if (relsFile) {
        const relsXml = await relsFile.async("string");
        const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Type="[^"]*image[^"]*"[^>]*Target="([^"]+)"/gi;
        let rMatch;
        while ((rMatch = relRegex.exec(relsXml)) !== null) {
          let target = rMatch[2].replace(/^\.\.\//, "ppt/");
          if (!target.startsWith("ppt/")) target = `ppt/${target}`;
          imageRelMap[rMatch[1]] = target;
        }
      }

      const images: ParsedSlideImage[] = [];
      for (const targetPath of Object.values(imageRelMap)) {
        const imgFile = zip.file(targetPath);
        if (imgFile) {
          const imgBytes = await imgFile.async("uint8array");
          const lower = targetPath.toLowerCase();
          let mime = "image/png";
          if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
          else if (lower.endsWith(".png")) mime = "image/png";
          else continue;

          images.push({
            name: targetPath.split("/").pop() || "image.png",
            bytes: imgBytes,
            mimeType: mime,
          });
        }
      }

      // Extract text content
      let slideTitle = "";
      let slideSubtitle = "";
      const bullets: string[] = [];

      const pRegex = /<a:p>([\s\S]*?)<\/a:p>/gi;
      let pMatch;
      const allParagraphs: string[] = [];

      while ((pMatch = pRegex.exec(xml)) !== null) {
        const pXml = pMatch[1];
        const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/gi;
        let pText = "";
        let tMatch;
        while ((tMatch = tRegex.exec(pXml)) !== null) {
          pText += tMatch[1];
        }
        const clean = decodeXmlEntities(pText).trim();
        if (clean) allParagraphs.push(clean);
      }

      if (allParagraphs.length > 0) {
        slideTitle = allParagraphs[0];
        if (allParagraphs.length > 1) {
          bullets.push(...allParagraphs.slice(1));
        }
      }

      if (!slideTitle) {
        slideTitle = `Slide ${slideIndex}`;
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
  } catch (err) {
    console.warn("Could not parse as standard OpenXML PPTX zip, using fallback text parser:", err);
  }

  // Fallback for binary .ppt
  return {
    title: docTitle,
    slideCount: 1,
    slides: [
      {
        slideIndex: 1,
        title: docTitle,
        bullets: [],
        images: [],
      },
    ],
    width,
    height,
  };
}

/**
 * High-Fidelity PPT / PPTX to PDF Renderer
 * Faithful to the PowerPoint design:
 * - Accurately renders slide dimensions, backgrounds, shape positions, text styling, and images.
 * - NEVER adds artificial decorations (no fake orange accent bars, no divider lines, no fake footers).
 */
export async function renderPptToPdfBuffer(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  defaultTitle = "PowerPoint Presentation"
): Promise<Uint8Array> {
  const arrayBuffer = await toArrayBuffer(fileOrBuffer);
  const pdfDoc = await PDFDocument.create();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let isPptx = false;

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    isPptx = true;

    // 1. Read slide dimensions from ppt/presentation.xml
    let slideW = 960;
    let slideH = 540;
    const presFile = zip.file("ppt/presentation.xml");
    if (presFile) {
      const presXml = await presFile.async("string");
      const szMatch = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i.exec(presXml);
      if (szMatch) {
        const cx = parseInt(szMatch[1], 10);
        const cy = parseInt(szMatch[2], 10);
        if (cx > 0 && cy > 0) {
          slideW = Math.round(cx / 12700);
          slideH = Math.round(cy / 12700);
        }
      }
    }

    // 2. Load theme colors from ppt/theme/theme1.xml
    const themeColors: Record<string, ColorRGB> = {
      dk1: { r: 0, g: 0, b: 0 },
      lt1: { r: 1, g: 1, b: 1 },
      dk2: { r: 0.27, g: 0.33, b: 0.42 },
      lt2: { r: 0.9, g: 0.9, b: 0.9 },
      accent1: { r: 0.27, g: 0.45, b: 0.77 },
      accent2: { r: 0.93, g: 0.49, b: 0.19 },
      accent3: { r: 0.65, g: 0.65, b: 0.65 },
      accent4: { r: 1.0, g: 0.75, b: 0 },
      accent5: { r: 0.36, g: 0.61, b: 0.84 },
      accent6: { r: 0.44, g: 0.68, b: 0.28 },
      tx1: { r: 0.1, g: 0.1, b: 0.1 },
      tx2: { r: 0.3, g: 0.3, b: 0.3 },
      bg1: { r: 1, g: 1, b: 1 },
      bg2: { r: 0.95, g: 0.95, b: 0.95 },
    };

    const themeFile = zip.file("ppt/theme/theme1.xml");
    if (themeFile) {
      const themeXml = await themeFile.async("string");
      const clrMatches = /<a:(dk1|lt1|dk2|lt2|accent[1-6]|hlink|folHlink)>([\s\S]*?)<\/a:\1>/gi;
      let cm;
      while ((cm = clrMatches.exec(themeXml)) !== null) {
        const name = cm[1];
        const body = cm[2];
        const srgb = /<a:srgbClr\s+val="([0-9a-fA-F]{6})"/i.exec(body);
        const sysClr = /<a:sysClr[^>]*lastClr="([0-9a-fA-F]{6})"/i.exec(body);
        const hex = srgb ? srgb[1] : (sysClr ? sysClr[1] : null);
        if (hex) {
          const col = parseHexColor(hex);
          if (col) themeColors[name] = col;
        }
      }
    }

    function resolveColor(elementXml: string, defaultColor: ColorRGB | null): ColorRGB | null {
      if (!elementXml) return defaultColor;
      const srgb = /<a:srgbClr\s+val="([0-9a-fA-F]{6})"/i.exec(elementXml);
      if (srgb) {
        const c = parseHexColor(srgb[1]);
        if (c) return c;
      }
      const scheme = /<a:schemeClr\s+val="([^"]+)"/i.exec(elementXml);
      if (scheme && themeColors[scheme[1]]) {
        return themeColors[scheme[1]];
      }
      return defaultColor;
    }

    // 3. Discover and sort slide files
    const slideKeys = Object.keys(zip.files).filter((k) =>
      /^ppt\/slides\/slide\d+\.xml$/i.test(k)
    );
    slideKeys.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      return numA - numB;
    });

    if (slideKeys.length > 0) {
      for (let sIdx = 0; sIdx < slideKeys.length; sIdx++) {
        const key = slideKeys[sIdx];
        const xml = await zip.file(key)!.async("string");
        const page = pdfDoc.addPage([slideW, slideH]);

        // Default clean slide background
        page.drawRectangle({
          x: 0,
          y: 0,
          width: slideW,
          height: slideH,
          color: rgb(1, 1, 1),
        });

        // Parse custom slide background if present
        const bgMatch = /<p:bg>([\s\S]*?)<\/p:bg>/i.exec(xml);
        if (bgMatch) {
          const bgColor = resolveColor(bgMatch[1], null);
          if (bgColor) {
            page.drawRectangle({
              x: 0,
              y: 0,
              width: slideW,
              height: slideH,
              color: rgb(bgColor.r, bgColor.g, bgColor.b),
            });
          }
        }

        // Slide relationships (layouts, images)
        const relsKey = key.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
        const relsFile = zip.file(relsKey);
        let layoutXml = "";
        const imageMap: Record<string, string> = {};

        if (relsFile) {
          const relsXml = await relsFile.async("string");
          const layoutMatch = /Target="\.\.\/slideLayouts\/(slideLayout\d+\.xml)"/i.exec(relsXml);
          if (layoutMatch) {
            const lFile = zip.file(`ppt/slideLayouts/${layoutMatch[1]}`);
            if (lFile) layoutXml = await lFile.async("string");
          }

          const imgRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Type="[^"]*image[^"]*"[^>]*Target="([^"]+)"/gi;
          let im;
          while ((im = imgRegex.exec(relsXml)) !== null) {
            let t = im[2].replace(/^\.\.\//, "ppt/");
            if (!t.startsWith("ppt/")) t = `ppt/${t}`;
            imageMap[im[1]] = t;
          }
        }

        function getPlaceholderRect(phType: string): ShapeRect | null {
          if (!layoutXml) return null;
          const phRegex = new RegExp(
            `<p:sp>([\\s\\S]*?<p:ph[^>]*type="${phType}"[\\s\\S]*?)<\\/p:sp>`,
            "i"
          );
          const m = phRegex.exec(layoutXml);
          if (!m) return null;
          const sp = m[1];
          const off = /<a:off\s+x="(\d+)"\s+y="(\d+)"/i.exec(sp);
          const ext = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/i.exec(sp);
          if (off && ext) {
            return {
              x: Math.round(parseInt(off[1], 10) / 12700),
              y: Math.round(parseInt(off[2], 10) / 12700),
              w: Math.round(parseInt(ext[1], 10) / 12700),
              h: Math.round(parseInt(ext[2], 10) / 12700),
            };
          }
          return null;
        }

        // Process shape elements <p:sp>
        const spRegex = /<p:sp>([\s\S]*?)<\/p:sp>/gi;
        let spMatch;
        while ((spMatch = spRegex.exec(xml)) !== null) {
          const spXml = spMatch[1];
          const offMatch = /<a:off\s+x="(\d+)"\s+y="(\d+)"/i.exec(spXml);
          const extMatch = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/i.exec(spXml);
          const phMatch = /<p:ph\s+type="([^"]+)"/i.exec(spXml);

          let rect: ShapeRect | null = null;
          if (offMatch && extMatch) {
            rect = {
              x: Math.round(parseInt(offMatch[1], 10) / 12700),
              y: Math.round(parseInt(offMatch[2], 10) / 12700),
              w: Math.round(parseInt(extMatch[1], 10) / 12700),
              h: Math.round(parseInt(extMatch[2], 10) / 12700),
            };
          } else if (phMatch) {
            rect = getPlaceholderRect(phMatch[1]);
          }

          if (!rect || rect.w <= 0 || rect.h <= 0) continue;

          const pdfX = rect.x;
          const pdfY = slideH - rect.y - rect.h;

          // Check shape fill
          const spPrMatch = /<p:spPr>([\s\S]*?)<\/p:spPr>/i.exec(spXml);
          if (spPrMatch) {
            const spPr = spPrMatch[1];
            if (/<a:solidFill>/i.test(spPr)) {
              const fillCol = resolveColor(spPr, null);
              if (fillCol) {
                page.drawRectangle({
                  x: pdfX,
                  y: pdfY,
                  width: rect.w,
                  height: rect.h,
                  color: rgb(fillCol.r, fillCol.g, fillCol.b),
                });
              }
            }

            // Check shape border line
            const lnMatch = /<a:ln[^>]*>([\s\S]*?)<\/a:ln>/i.exec(spPr);
            if (lnMatch) {
              const lineCol = resolveColor(lnMatch[1], null);
              if (lineCol) {
                page.drawRectangle({
                  x: pdfX,
                  y: pdfY,
                  width: rect.w,
                  height: rect.h,
                  borderColor: rgb(lineCol.r, lineCol.g, lineCol.b),
                  borderWidth: 1,
                });
              }
            }
          }

          // Check text body <p:txBody>
          const txBodyMatch = /<p:txBody>([\s\S]*?)<\/p:txBody>/i.exec(spXml);
          if (!txBodyMatch) continue;

          const txBody = txBodyMatch[1];
          const pRegex = /<a:p>([\s\S]*?)<\/a:p>/gi;
          let pMatch;
          let currTopY = rect.y + 4;

          while ((pMatch = pRegex.exec(txBody)) !== null) {
            const pXml = pMatch[1];
            const algnMatch = /<a:pPr[^>]*algn="([^"]+)"/i.exec(pXml);
            const algn = algnMatch ? algnMatch[1] : "l";

            // Extract text runs
            const rRegex = /<a:r>([\s\S]*?)<\/a:r>/gi;
            let rMatch;
            let fullPText = "";
            let maxFontSize = rect.h > 100 ? 22 : 14;
            let isBold = false;
            let isItalic = false;
            let textColor: ColorRGB = { r: 0.12, g: 0.15, b: 0.2 };

            while ((rMatch = rRegex.exec(pXml)) !== null) {
              const rXml = rMatch[1];
              const tMatch = /<a:t[^>]*>([^<]+)<\/a:t>/i.exec(rXml);
              if (!tMatch) continue;
              const text = decodeXmlEntities(tMatch[1]);
              fullPText += text;

              const szMatch = /<a:rPr[^>]*sz="(\d+)"/i.exec(rXml);
              if (szMatch) {
                maxFontSize = Math.max(maxFontSize, parseInt(szMatch[1], 10) / 100);
              }
              if (/<a:rPr[^>]*b="1"/i.test(rXml)) isBold = true;
              if (/<a:rPr[^>]*i="1"/i.test(rXml)) isItalic = true;

              const rPrMatch = /<a:rPr[^>]*>([\s\S]*?)<\/a:rPr>/i.exec(rXml);
              if (rPrMatch) {
                const resolved = resolveColor(rPrMatch[1], textColor);
                if (resolved) textColor = resolved;
              }
            }

            if (!fullPText) {
              const fbT = /<a:t[^>]*>([^<]+)<\/a:t>/i.exec(pXml);
              if (fbT) fullPText = decodeXmlEntities(fbT[1]);
            }

            if (!fullPText.trim()) {
              currTopY += maxFontSize * 0.5;
              continue;
            }

            // Cap extreme font size to fit bounding box
            if (maxFontSize > rect.h * 0.8 && rect.h > 20) {
              maxFontSize = Math.max(12, Math.round(rect.h * 0.7));
            }

            const font = isBold ? helveticaBold : (isItalic ? helveticaOblique : helvetica);
            const cleanText = sanitizePdfText(fullPText, font);
            const words = cleanText.trim().split(/\s+/);
            const maxTextW = Math.max(20, rect.w - 10);
            const lines: string[] = [];
            let curLine = "";

            for (const w of words) {
              const test = curLine ? `${curLine} ${w}` : w;
              let wW = 0;
              try {
                wW = font.widthOfTextAtSize(test, maxFontSize);
              } catch {
                wW = test.length * (maxFontSize * 0.55);
              }
              if (wW <= maxTextW) {
                curLine = test;
              } else {
                if (curLine) lines.push(curLine);
                curLine = w;
              }
            }
            if (curLine) lines.push(curLine);

            const lineHeight = maxFontSize * 1.25;

            for (const line of lines) {
              let lineW = 0;
              try {
                lineW = font.widthOfTextAtSize(line, maxFontSize);
              } catch {
                lineW = line.length * (maxFontSize * 0.55);
              }

              let drawX = pdfX + 5;
              if (algn === "ctr") {
                drawX = pdfX + Math.max(0, (rect.w - lineW) / 2);
              } else if (algn === "r") {
                drawX = pdfX + Math.max(0, rect.w - lineW - 5);
              }

              const linePdfY = slideH - currTopY - maxFontSize;

              safeDrawText(
                page,
                line,
                {
                  x: drawX,
                  y: linePdfY,
                  size: maxFontSize,
                  font,
                  color: rgb(textColor.r, textColor.g, textColor.b),
                },
                font
              );

              currTopY += lineHeight;
            }
            currTopY += 4;
          }
        }

        // Process picture elements <p:pic>
        const picRegex = /<p:pic>([\s\S]*?)<\/p:pic>/gi;
        let picMatch;
        while ((picMatch = picRegex.exec(xml)) !== null) {
          const picXml = picMatch[1];
          const offMatch = /<a:off\s+x="(\d+)"\s+y="(\d+)"/i.exec(picXml);
          const extMatch = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/i.exec(picXml);
          const blipMatch = /<a:blip[^>]*r:embed="([^"]+)"/i.exec(picXml);

          if (!offMatch || !extMatch || !blipMatch) continue;

          const pX = Math.round(parseInt(offMatch[1], 10) / 12700);
          const pY = Math.round(parseInt(offMatch[2], 10) / 12700);
          const pW = Math.round(parseInt(extMatch[1], 10) / 12700);
          const pH = Math.round(parseInt(extMatch[2], 10) / 12700);

          const targetPath = imageMap[blipMatch[1]];
          if (!targetPath) continue;

          const imgFile = zip.file(targetPath);
          if (!imgFile) continue;

          const imgBytes = await imgFile.async("uint8array");
          const isPng = targetPath.toLowerCase().endsWith(".png");
          const isJpg = targetPath.toLowerCase().endsWith(".jpg") || targetPath.toLowerCase().endsWith(".jpeg");

          if (!isPng && !isJpg) continue;

          try {
            const embImg = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
            const drawPdfY = slideH - pY - pH;
            page.drawImage(embImg, {
              x: pX,
              y: drawPdfY,
              width: pW,
              height: pH,
            });
          } catch {
            // Graceful image fallback
          }
        }
      }

      return await pdfDoc.save({ useObjectStreams: true });
    }
  } catch (parseErr) {
    console.warn("Could not process as OpenXML presentation:", parseErr);
  }

  // Graceful fallback for unparseable or legacy binary files
  const presentation = await parsePresentation(fileOrBuffer, defaultTitle);
  const slideW = presentation.width || 960;
  const slideH = presentation.height || 540;
  const marginX = Math.round(slideW * 0.08);
  const contentWidth = slideW - marginX * 2;

  for (const slide of presentation.slides) {
    const page = pdfDoc.addPage([slideW, slideH]);

    // Clean white canvas - NO artificial decorative bars
    page.drawRectangle({
      x: 0,
      y: 0,
      width: slideW,
      height: slideH,
      color: rgb(1, 1, 1),
    });

    let currentY = slideH - 60;
    const titleFontSize = 26;
    const titleLines = sanitizePdfText(slide.title, helveticaBold).split("\n");

    for (const line of titleLines) {
      safeDrawText(
        page,
        line,
        {
          x: marginX,
          y: currentY,
          size: titleFontSize,
          font: helveticaBold,
          color: rgb(0.1, 0.12, 0.16),
        },
        helveticaBold
      );
      currentY -= titleFontSize + 8;
    }

    currentY -= 16;
    const bodyFontSize = 14;
    const bodyLineHeight = 22;

    for (const bullet of slide.bullets) {
      if (currentY < 40) break;
      const cleanBullet = sanitizePdfText(bullet, helvetica);
      safeDrawText(
        page,
        cleanBullet,
        {
          x: marginX,
          y: currentY,
          size: bodyFontSize,
          font: helvetica,
          color: rgb(0.2, 0.24, 0.3),
        },
        helvetica
      );
      currentY -= bodyLineHeight;
    }
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
