/**
 * Lazy pdf.js loader shared by the file-preview kit and the certificate
 * template editor. pdf.js loads on first use only — it never rides in the
 * page bundle — and the worker is emitted by the bundler as a same-origin
 * static asset (no CSP additions, no CDN).
 */
export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString()
  return pdfjs
}
