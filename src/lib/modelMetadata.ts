import type { DielineModelDimension, DielineModelId, DielineModelMetadata } from "../types";

type ModelDefinition = Omit<DielineModelMetadata, "dimensionType">;

const resolveModelDimensionType = (componentPath: string): DielineModelDimension => (
  componentPath.includes("/3D/") ? "3D" : "2D"
);

const MODEL_DEFINITIONS: readonly ModelDefinition[] = [
  {
    id: "circle",
    name: "Circle",
    exportName: "StrickerCircleDieline",
    componentPath: "src/components/2D/StrickerCircleDieline.tsx",
    attributes: [
      {
        name: "size",
        type: "number",
        description: "Circle diameter in millimeters",
        defaultValue: 90,
      },
    ],
  },
  {
    id: "rectangle",
    name: "Rectangle",
    exportName: "StrickerRectangleDieline",
    componentPath: "src/components/2D/StrickerRectangleDieline.tsx",
    attributes: [
      {
        name: "width",
        type: "number",
        description: "Rectangle width in millimeters",
        defaultValue: 120,
      },
      {
        name: "height",
        type: "number",
        description: "Rectangle height in millimeters",
        defaultValue: 80,
      },
    ],
  },
  {
    id: "tuckEndBox",
    name: "Tuck End Box",
    exportName: "Becf_10803_dieline",
    componentPath: "src/components/3D/TuckEndBoxes/Becf_10803/Becf_10803_dieline.tsx",
    attributes: [
      {
        name: "length",
        type: "number",
        description: "Main body panel length in millimeters",
        defaultValue: 100,
      },
      {
        name: "width",
        type: "number",
        description: "Main body side width in millimeters",
        defaultValue: 50,
      },
      {
        name: "height",
        type: "number",
        description: "Body height in millimeters",
        defaultValue: 150,
      },
      {
        name: "closurePanel",
        type: "number",
        description: "Closure panel depth in millimeters",
        defaultValue: 45,
      },
      {
        name: "dustFlap",
        type: "number",
        description: "Dust flap depth in millimeters",
        defaultValue: 32,
      },
      {
        name: "glueWidth",
        type: "number",
        description: "Glue area width in millimeters",
        defaultValue: 12,
      },
      {
        name: "tuckFlap",
        type: "number",
        description: "Tuck flap depth in millimeters",
        defaultValue: 15,
      },
    ],
  },
];

export const DIELINE_MODELS: readonly DielineModelMetadata[] = MODEL_DEFINITIONS.map((model) => ({
  ...model,
  dimensionType: resolveModelDimensionType(model.componentPath),
}));

export const getDielineModels = (): readonly DielineModelMetadata[] => DIELINE_MODELS;

export const getDielineModelById = (modelId: DielineModelId): DielineModelMetadata | undefined => (
  DIELINE_MODELS.find((model) => model.id === modelId)
);