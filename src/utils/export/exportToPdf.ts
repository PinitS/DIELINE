import type { DielineExportData, DielineExportOptions } from "../../types";
import { openDielineExportPreview } from "./openExportPreview";

export const exportDielineToPdf = (data: DielineExportData, options: Omit<DielineExportOptions, "autoExport"> = {}) => {
  openDielineExportPreview(data, { ...options, autoExport: true });
};

