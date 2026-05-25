const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 200;
const PADDING = 24;

const FONT_STACK =
  "'Caveat','Segoe Script','Brush Script MT','Lucida Handwriting',cursive";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Pick a font size that aims for a comfortable look on typical-length names.
 * The actual final width is clamped by `textLength` below, so this is a hint
 * rather than a hard sizer — short names render naturally, long names get a
 * mild horizontal compression instead of overflowing the viewBox.
 */
function fitFontSize(name: string): number {
  const available = VIEW_WIDTH - PADDING * 2;
  const perChar = available / Math.max(name.length, 1);
  return Math.min(96, Math.max(36, Math.floor(perChar * 1.2)));
}

export function buildTypedSignatureSvg(rawName: string): string {
  const name = rawName.trim();
  if (!name) {
    throw new Error("Cannot build a typed signature from an empty name");
  }
  const fontSize = fitFontSize(name);
  const innerWidth = VIEW_WIDTH - PADDING * 2;
  const safe = escapeXml(name);

  // Vertical centering: y="50%" places the baseline at the vertical middle,
  // then `dy=".35em"` nudges it down by ~35% of the font's em-square so the
  // visual x-height sits on the horizontal centerline. This is a sanitizer-
  // safe equivalent of `dominant-baseline="middle"` (which some DOMPurify
  // SVG profiles strip).
  //
  // Horizontal fit: `textLength` + `lengthAdjust="spacingAndGlyphs"` clamps
  // the rendered text to the inner padded width regardless of how the font
  // would naturally render. This is the only reliable way to guarantee no
  // edge clipping when fonts may or may not be available at measurement time
  // (server-side rendering, font not yet loaded, etc.).
  return [
    `<svg xmlns="${SVG_NS}" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" width="${VIEW_WIDTH}" height="${VIEW_HEIGHT}">`,
    `<text x="${VIEW_WIDTH / 2}" y="50%" dy=".35em" text-anchor="middle" ` +
      `textLength="${innerWidth}" lengthAdjust="spacingAndGlyphs" ` +
      `font-family="${FONT_STACK}" font-size="${fontSize}" fill="#111111">` +
      `${safe}</text>`,
    `</svg>`,
  ].join("");
}
