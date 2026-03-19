import type { DielineExportData, DielineExportOptions, DielineSvgDocument } from "../../types";
import { convertDielineToSvg } from "./convertDielineToSvg";

const PDF_MARGIN_MM = 10;

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const createExportHtml = (
  documentTitle: string,
  svgDocument: DielineSvgDocument,
  options: Required<Pick<DielineExportOptions, "autoExport" | "closeAfterExport" | "marginMm">>,
) => {
  const pageWidthMm = svgDocument.widthMm + options.marginMm * 2;
  const pageHeightMm = svgDocument.heightMm + options.marginMm * 2;
  const exportScript = options.autoExport
    ? `<script>window.addEventListener("load",()=>window.setTimeout(()=>window.print(),150));${options.closeAfterExport ? "window.addEventListener(\"afterprint\",()=>window.close());" : ""}</script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(documentTitle)}</title>
    <style>
      @page { size: ${pageWidthMm}mm ${pageHeightMm}mm; margin: 0; }
      html, body { margin: 0; padding: 0; background: #f3f4f6; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet {
        box-sizing: border-box;
        width: ${pageWidthMm}mm;
        min-height: ${pageHeightMm}mm;
        padding: ${options.marginMm}mm;
        background: #ffffff;
        margin: 16px auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
      }
      .sheet svg { display: block; }
      @media print {
        html, body { background: #ffffff; }
        .sheet { margin: 0; box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">${svgDocument.svg}</div>
    ${exportScript}
  </body>
</html>`;
};

export const openDielineExportPreview = (data: DielineExportData, options: DielineExportOptions = {}) => {
  if (typeof window === "undefined") {
    throw new Error("Dieline export preview is only available in the browser.");
  }

  const svgDocument = convertDielineToSvg(data, { displayUnit: options.displayUnit });
  const previewWindow = window.open("", "_blank", "width=1100,height=800");

  if (!previewWindow) {
    throw new Error("Unable to open preview window. Please allow pop-ups and try again.");
  }

  const title = options.title ?? `${data.modelId}-dieline-export.pdf`;
  const html = createExportHtml(title, svgDocument, {
    autoExport: options.autoExport ?? false,
    closeAfterExport: options.closeAfterExport ?? true,
    marginMm: options.marginMm ?? PDF_MARGIN_MM,
  });
  const blob = new Blob([html], { type: "text/html" });
  const objectUrl = URL.createObjectURL(blob);

  previewWindow.location.replace(objectUrl);
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);

  return previewWindow;
};

