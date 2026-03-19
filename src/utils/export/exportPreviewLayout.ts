import type {
  Becf10a0aAttributes,
  Becf11d01Attributes,
  CircleAttributes,
  DielineExportData,
  DielineExportOptions,
  DielineExportPdfOptions,
  DielineExportPreviewLayoutController,
  DielineExportSvgOptions,
  FlatLayoutAttributes,
  RectangleAttributes,
  TuckEndBoxAttributes,
} from "../../types";
import { convertDielineToSvg } from "./convertDielineToSvg";
import { openDielineExportPreview } from "./openExportPreview";
import { exportDielineToPdf } from "./exportToPdf";

export type { DielineExportData } from "../../types";

export const createDielineExportPreviewLayoutController = (
  data: DielineExportData,
  defaults: Partial<DielineExportOptions> = {},
): DielineExportPreviewLayoutController => ({
  convertToSvg: (options: DielineExportSvgOptions = {}) => convertDielineToSvg(data, {
    displayUnit: options.displayUnit ?? defaults.displayUnit,
    isShowDimension: options.isShowDimension,
  }),
  openPreview: (options: DielineExportOptions = {}) => openDielineExportPreview(data, {
    ...defaults,
    ...options,
    displayUnit: options.displayUnit ?? defaults.displayUnit,
  }),
  exportToPdf: (options: DielineExportPdfOptions = {}) => exportDielineToPdf(data, {
    ...defaults,
    ...options,
    displayUnit: options.displayUnit ?? defaults.displayUnit,
  }),
});

export const exportCircleDielineToPdf = (
  attributes: CircleAttributes,
  options?: Omit<DielineExportOptions, "autoExport">,
) => {
  exportDielineToPdf({ modelId: "circle", attributes }, options);
};

export const exportRectangleDielineToPdf = (
  attributes: RectangleAttributes,
  options?: Omit<DielineExportOptions, "autoExport">,
) => {
  exportDielineToPdf({ modelId: "rectangle", attributes }, options);
};

export const exportTuckEndBoxDielineToPdf = (
  attributes: TuckEndBoxAttributes,
  options?: Omit<DielineExportOptions, "autoExport">,
) => {
  exportDielineToPdf({ modelId: "becf10803", attributes }, options);
};

export const exportBecf11d01DielineToPdf = (
  attributes: Becf11d01Attributes,
  options?: Omit<DielineExportOptions, "autoExport">,
) => {
  exportDielineToPdf({ modelId: "becf11d01", attributes }, options);
};

export const exportBecf10a0aDielineToPdf = (
  attributes: Becf10a0aAttributes,
  options?: Omit<DielineExportOptions, "autoExport">,
) => {
  exportDielineToPdf({ modelId: "becf10a0a", attributes }, options);
};

export const exportFlatLayoutDielineToPdf = (
  attributes: FlatLayoutAttributes,
  options?: Omit<DielineExportOptions, "autoExport">,
) => {
  exportDielineToPdf({ modelId: "flatlayout", attributes }, options);
};
