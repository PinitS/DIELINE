import type { DielineModelId, DielineModelMetadata } from "../types";

const MODEL_DEFINITIONS: readonly DielineModelMetadata[] = [
  {
    id: "circle",
    name: "Circle",
    exportName: "StrickerCircleDieline",
    componentPath: "src/components/2D/StrickerCircleDieline.tsx",
    modelDimensionType:'2D',
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
        modelDimensionType:'2D',
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
    id: "becf10803",
    name: "Model (10803)",
    exportName: "Becf_10803_dieline",
    componentPath: "src/components/3D/TuckEndBoxes/Becf_10803/Becf_10803_dieline.tsx",
        modelDimensionType:'3D',

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
  {
    id: "becf11d01",
    name: "Model (11d01)",
    exportName: "Becf_11d01_dieline",
    componentPath: "src/components/3D/TuckEndBoxes/Becf_11d01/Becf_11d01_dieline.tsx",
            modelDimensionType:'3D',

    attributes: [
      {
        name: "length",
        type: "number",
        description: "Front and back panel length in millimeters",
        defaultValue: 175,
      },
      {
        name: "height",
        type: "number",
        description: "Body panel height in millimeters",
        defaultValue: 230,
      },
      {
        name: "width",
        type: "number",
        description: "Side panel width in millimeters",
        defaultValue: 74,
      },
      {
        name: "closurePanel",
        type: "number",
        description: "Closure panel depth in millimeters",
        defaultValue: 74,
      },
      {
        name: "dustFlap",
        type: "number",
        description: "Dust flap depth in millimeters",
        defaultValue: 74,
      },
      {
        name: "glueWidth",
        type: "number",
        description: "Glue tab width in millimeters",
        defaultValue: 15,
      },
      {
        name: "flapInset",
        type: "number",
        description: "Inset from panel edge to major flap cut in millimeters",
        defaultValue: 2,
      },
    ],
  },
];

export const DIELINE_MODELS: readonly DielineModelMetadata[] = MODEL_DEFINITIONS;

export const getDielineModels = (): readonly DielineModelMetadata[] => DIELINE_MODELS;

export const getDielineModelById = (modelId: DielineModelId): DielineModelMetadata | undefined => (
  DIELINE_MODELS.find((model) => model.id === modelId)
);