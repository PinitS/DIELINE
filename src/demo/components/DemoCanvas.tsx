import type { RefObject } from "react";
import {
  Becf_10803_dieline,
  StrickerCircleDieline,
  StrickerRectangleDieline,
} from "../../index";
import type {
  DielineBounds,
  DielineCanvasHandle,
  DielineModelId,
  DisplayUnit,
  TexturePlacement,
} from "../../types";
import type { DemoViewMode } from "../demoTypes";

type DemoCanvasProps = {
  modelRef: RefObject<DielineCanvasHandle | null>;
  viewMode: DemoViewMode;
  shapeType: DielineModelId;
  supports3DView: boolean;
  displayUnit: DisplayUnit;
  showDimensions: boolean;
  texturePreviewUrl: string | null;
  texturePlacement: TexturePlacement;
  circleSize: number;
  rectWidth: number;
  rectHeight: number;
  tuckLength: number;
  tuckWidth: number;
  tuckHeight: number;
  tuckClosurePanel: number;
  tuckDustFlap: number;
  tuckGlueWidth: number;
  tuckFlap: number;
  tuckFrame: number;
  onTexturePlacementChange: (placement: TexturePlacement) => void;
  onMeasure: (bounds: DielineBounds) => void;
};

export const DemoCanvas = ({
  modelRef,
  viewMode,
  shapeType,
  supports3DView,
  displayUnit,
  showDimensions,
  texturePreviewUrl,
  texturePlacement,
  circleSize,
  rectWidth,
  rectHeight,
  tuckLength,
  tuckWidth,
  tuckHeight,
  tuckClosurePanel,
  tuckDustFlap,
  tuckGlueWidth,
  tuckFlap,
  tuckFrame,
  onTexturePlacementChange,
  onMeasure,
}: DemoCanvasProps) => {
  const isTextureMode = viewMode === "texture";
  const isFolded3DMode = viewMode === "3d" && supports3DView && shapeType === "tuckEndBox";

  switch (shapeType) {
    case "circle":
      return (
        <StrickerCircleDieline
          ref={modelRef}
          attribute={{ size: circleSize }}
          displayUnit={displayUnit}
          textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
          texturePlacement={isTextureMode ? texturePlacement : undefined}
          onTexturePlacementChange={isTextureMode ? onTexturePlacementChange : undefined}
          showDimensions={isTextureMode ? false : showDimensions}
          showShapeLines
          onMeasure={onMeasure}
        />
      );

    case "rectangle":
      return (
        <StrickerRectangleDieline
          ref={modelRef}
          attribute={{ width: rectWidth, height: rectHeight }}
          displayUnit={displayUnit}
          textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
          texturePlacement={isTextureMode ? texturePlacement : undefined}
          onTexturePlacementChange={isTextureMode ? onTexturePlacementChange : undefined}
          showDimensions={isTextureMode ? false : showDimensions}
          showShapeLines
          onMeasure={onMeasure}
        />
      );

    case "tuckEndBox":
    default:
      return (
        <Becf_10803_dieline
          ref={modelRef}
          attribute={{
            length: tuckLength,
            width: tuckWidth,
            height: tuckHeight,
            closurePanel: tuckClosurePanel,
            dustFlap: tuckDustFlap,
            glueWidth: tuckGlueWidth,
            tuckFlap,
          }}
          displayUnit={displayUnit}
          renderMode={isFolded3DMode ? "folded3d" : "dieline"}
          frame={isFolded3DMode ? tuckFrame : 0}
          textureImageUrl={isTextureMode ? texturePreviewUrl ?? undefined : undefined}
          texturePlacement={isTextureMode ? texturePlacement : undefined}
          onTexturePlacementChange={isTextureMode ? onTexturePlacementChange : undefined}
          showDimensions={isTextureMode ? false : showDimensions}
          showShapeLines
          onMeasure={onMeasure}
        />
      );
  }
};
