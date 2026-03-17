import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import {
  Float32BufferAttribute,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type OrthographicCamera as ThreeOrthographicCamera,
} from "three";
import type {
  DielineBounds,
  DielineCanvasHandle,
  DielineMeasureCallback,
  DielinePrintController,
  SharedCanvasProps,
  TexturePlacement,
} from "../types";
import { createCanvasLayout, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "../utils/layout";
import { formatDielineDisplayValue } from "../utils/units";

type DragState = { pointerId: number; clientX: number; clientY: number };
type CanvasPoint = [number, number, number];
export type DielineLayout = ReturnType<typeof createCanvasLayout>;
export type TexturePolygonPoint = { x: number; y: number };
export type TextureBounds = { left: number; top: number; width: number; height: number };
type BaseDielineCanvasProps = SharedCanvasProps & {
  bounds: DielineBounds;
  onMeasure?: DielineMeasureCallback;
  printController: DielinePrintController;
  renderShape: (
    layout: DielineLayout,
    shapeStrokeColor: string,
    createScenePoint: (x: number, y: number, z?: number) => CanvasPoint,
    showShapeLines: boolean,
  ) => ReactNode;
  renderTextureOverlay?: (layout: DielineLayout, textureImageUrl: string, textureBounds: TextureBounds) => ReactNode;
};

const LINE_WIDTH = 1.4;
const VIEWBOX_ASPECT = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 64;
const MIN_TEXTURE_SCALE = 0.1;
const MAX_TEXTURE_SCALE = 8;
const FIT_VIEW_PADDING = 24;

type CanvasViewState = {
  pan: { x: number; y: number };
  zoom: number;
};

const createScenePoint = (x: number, y: number, z = 0): CanvasPoint => [x, -y, z];
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const POINT_PRECISION = 4;
const DEFAULT_TEXTURE_PLACEMENT: TexturePlacement = {
  hasTexture: false,
  imageWidth: 0,
  imageHeight: 0,
  offsetXRatio: 0,
  offsetYRatio: 0,
  scale: 1,
};

const getSceneDimensions = (aspect: number) => {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT };
  }

  if (aspect >= VIEWBOX_ASPECT) {
    return { width: VIEWBOX_HEIGHT * aspect, height: VIEWBOX_HEIGHT };
  }

  return { width: VIEWBOX_WIDTH, height: VIEWBOX_WIDTH / aspect };
};

const getContentBounds = (
  layout: DielineLayout,
  showDimensions: boolean,
) => {
  let left = layout.leftX;
  let right = layout.rightX;
  let top = layout.topY;
  let bottom = layout.bottomY;

  if (showDimensions) {
    left = Math.min(left, layout.leftDimensionX);
    top = Math.min(top, layout.topDimensionY);
    left = Math.min(left, layout.sideLabelX - layout.heightFontSize);
    top = Math.min(top, layout.topLabelY - layout.widthFontSize);
  }

  return {
    left: left - FIT_VIEW_PADDING,
    right: right + FIT_VIEW_PADDING,
    top: top - FIT_VIEW_PADDING,
    bottom: bottom + FIT_VIEW_PADDING,
  };
};

const getFittedViewState = (
  containerWidth: number,
  containerHeight: number,
  layout: DielineLayout,
  showDimensions: boolean,
): CanvasViewState => {
  if (!containerWidth || !containerHeight) {
    return { pan: { x: 0, y: 0 }, zoom: DEFAULT_ZOOM };
  }

  const scene = getSceneDimensions(containerWidth / containerHeight);
  const contentBounds = getContentBounds(layout, showDimensions);
  const contentWidth = Math.max(contentBounds.right - contentBounds.left, 1);
  const contentHeight = Math.max(contentBounds.bottom - contentBounds.top, 1);
  const zoom = clamp(
    Math.min(scene.width / contentWidth, scene.height / contentHeight),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  const centerX = (contentBounds.left + contentBounds.right) / 2;
  const centerY = (contentBounds.top + contentBounds.bottom) / 2;

  return {
    zoom,
    pan: {
      x: VIEWBOX_WIDTH / 2 - centerX,
      y: VIEWBOX_HEIGHT / 2 - centerY,
    },
  };
};

const getWorldPointFromClient = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
  scene: { width: number; height: number },
  zoom: number,
) => {
  const visibleWidth = scene.width / zoom;
  const visibleHeight = scene.height / zoom;
  const xRatio = (clientX - rect.left) / rect.width;
  const yRatio = (clientY - rect.top) / rect.height;

  return {
    x: -visibleWidth / 2 + xRatio * visibleWidth,
    y: visibleHeight / 2 - yRatio * visibleHeight,
  };
};

const sanitizePolygonPoints = (points: TexturePolygonPoint[]) => {
  if (points.length < 3) return points;

  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(first.x - last.x) < 0.0001 && Math.abs(first.y - last.y) < 0.0001) {
    return points.slice(0, -1);
  }

  return points;
};

const applyTextureUvs = (geometry: ShapeGeometry, bounds: TextureBounds) => {
  const width = bounds.width || 1;
  const height = bounds.height || 1;
  const positions = geometry.getAttribute("position");
  const uvs = new Float32Array(positions.count * 2);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = -positions.getY(index);
    uvs[index * 2] = (x - bounds.left) / width;
    uvs[index * 2 + 1] = 1 - (y - bounds.top) / height;
  }

  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
};

export const createTextureBounds = (layout: DielineLayout): TextureBounds => ({
  left: layout.leftX,
  top: layout.topY,
  width: layout.shapeWidthPx,
  height: layout.shapeHeightPx,
});

const normalizeTexturePlacement = (
  placement: TexturePlacement | undefined,
  hasTexture: boolean,
): TexturePlacement => ({
  hasTexture,
  imageWidth: Number.isFinite(placement?.imageWidth) ? Math.max(0, placement?.imageWidth ?? 0) : 0,
  imageHeight: Number.isFinite(placement?.imageHeight) ? Math.max(0, placement?.imageHeight ?? 0) : 0,
  offsetXRatio: Number.isFinite(placement?.offsetXRatio) ? placement?.offsetXRatio ?? 0 : 0,
  offsetYRatio: Number.isFinite(placement?.offsetYRatio) ? placement?.offsetYRatio ?? 0 : 0,
  scale: clamp(
    Number.isFinite(placement?.scale) ? placement?.scale ?? DEFAULT_TEXTURE_PLACEMENT.scale : DEFAULT_TEXTURE_PLACEMENT.scale,
    MIN_TEXTURE_SCALE,
    MAX_TEXTURE_SCALE,
  ),
});

const resolveTextureBounds = (
  bounds: TextureBounds,
  placement: TexturePlacement,
): TextureBounds => {
  const offsetX = placement.offsetXRatio * bounds.width;
  const offsetY = placement.offsetYRatio * bounds.height;

  if (placement.imageWidth > 0 && placement.imageHeight > 0) {
    const coverScale = Math.max(bounds.width / placement.imageWidth, bounds.height / placement.imageHeight);
    const width = placement.imageWidth * coverScale * placement.scale;
    const height = placement.imageHeight * coverScale * placement.scale;

    return {
      left: bounds.left + (bounds.width - width) / 2 + offsetX,
      top: bounds.top + (bounds.height - height) / 2 + offsetY,
      width,
      height,
    };
  }

  const width = bounds.width * placement.scale;
  const height = bounds.height * placement.scale;

  return {
    left: bounds.left + (bounds.width - width) / 2 + offsetX,
    top: bounds.top + (bounds.height - height) / 2 + offsetY,
    width,
    height,
  };
};

export const TexturedPolygonMesh = ({
  imageUrl,
  points,
  textureBounds,
  z = 0.5,
}: {
  imageUrl: string;
  points: TexturePolygonPoint[];
  textureBounds: TextureBounds;
  z?: number;
}) => {
  const texture = useLoader(TextureLoader, imageUrl);
  const pointSignature = points
    .map(({ x, y }) => `${x.toFixed(POINT_PRECISION)},${y.toFixed(POINT_PRECISION)}`)
    .join("|");

  const geometry = useMemo(() => {
    const polygonPoints = sanitizePolygonPoints(points);
    if (polygonPoints.length < 3) return null;

    const shape = new Shape(polygonPoints.map(({ x, y }) => new Vector2(x, -y)));
    const nextGeometry = new ShapeGeometry(shape);
    applyTextureUvs(nextGeometry, textureBounds);
    return nextGeometry;
  }, [
    pointSignature,
    points,
    textureBounds.height,
    textureBounds.left,
    textureBounds.top,
    textureBounds.width,
  ]);

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  useEffect(() => () => {
    geometry?.dispose();
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} position={[0, 0, z]}>
      <meshBasicMaterial map={texture} transparent opacity={1} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

const DefaultTextureOverlay = ({
  imageUrl,
  layout,
  textureBounds,
}: {
  imageUrl: string;
  layout: DielineLayout;
  textureBounds: TextureBounds;
}) => (
  <TexturedPolygonMesh
    imageUrl={imageUrl}
    points={[
      { x: layout.leftX, y: layout.topY },
      { x: layout.rightX, y: layout.topY },
      { x: layout.rightX, y: layout.bottomY },
      { x: layout.leftX, y: layout.bottomY },
    ]}
    textureBounds={textureBounds}
  />
);

const ResponsiveOrthographicCamera = ({ zoom }: { zoom: number }) => {
  const camera = useThree((state) => state.camera as ThreeOrthographicCamera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    const { width, height } = getSceneDimensions(size.width / size.height);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.near = 0.1;
    camera.far = 1000;
    camera.zoom = zoom;
    camera.position.set(0, 0, 100);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width, zoom]);

  return null;
};

export const BaseDielineCanvas = forwardRef<DielineCanvasHandle, BaseDielineCanvasProps>(
  function BaseDielineCanvas(props, ref) {
    const {
      width = "100%",
      height = "100%",
      displayUnit = "mm",
      backgroundColor = "#d9d9d9",
      textureImageUrl,
      texturePlacement,
      onTexturePlacementChange,
      allowTextureTransform = false,
      shapeStrokeColor = "#ff2d2d",
      dimensionColor = "#111111",
      labelColor = "#111111",
      widthLabel = "Overall Width",
      heightLabel = "Overall Height",
      showDimensions = true,
      showShapeLines = true,
      className,
      style,
      bounds,
      onMeasure,
      printController,
      renderShape,
      renderTextureOverlay,
    } = props;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const hasInitializedViewRef = useRef(false);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [dragging, setDragging] = useState(false);
    const layout = useMemo(
      () => createCanvasLayout(bounds),
      [bounds.overallHeightMm, bounds.overallWidthMm],
    );
    const baseTextureBounds = useMemo(
      () => createTextureBounds(layout),
      [layout.bottomY, layout.leftX, layout.rightX, layout.shapeHeightPx, layout.shapeWidthPx, layout.topY],
    );
    const resolvedTexturePlacement = useMemo(
      () => normalizeTexturePlacement(texturePlacement, Boolean(textureImageUrl)),
      [textureImageUrl, texturePlacement],
    );
    const textureBounds = useMemo(
      () => resolveTextureBounds(baseTextureBounds, resolvedTexturePlacement),
      [baseTextureBounds, resolvedTexturePlacement],
    );
    const textureTransformEnabled = Boolean(textureImageUrl) && allowTextureTransform && Boolean(onTexturePlacementChange);

    const emitTexturePlacement = useCallback((nextPlacement: TexturePlacement | ((current: TexturePlacement) => TexturePlacement)) => {
      if (!onTexturePlacementChange) return;

      const basePlacement = normalizeTexturePlacement(texturePlacement, Boolean(textureImageUrl));
      const computedPlacement = typeof nextPlacement === "function"
        ? nextPlacement(basePlacement)
        : nextPlacement;

      onTexturePlacementChange(normalizeTexturePlacement(computedPlacement, Boolean(textureImageUrl)));
    }, [onTexturePlacementChange, textureImageUrl, texturePlacement]);

    const fitView = useCallback(() => {
      const container = containerRef.current;
      if (!container) return false;

      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;

      const nextView = getFittedViewState(
        rect.width,
        rect.height,
        layout,
        showDimensions,
      );

      setPan(nextView.pan);
      setZoom(nextView.zoom);
      return true;
    }, [layout, showDimensions]);

    useEffect(() => {
      onMeasure?.(bounds);
    }, [bounds.overallHeightMm, bounds.overallWidthMm, onMeasure]);

    useEffect(() => {
      if (hasInitializedViewRef.current) return undefined;

      let frameId = 0;

      const fitWhenReady = () => {
        if (hasInitializedViewRef.current) return;
        if (fitView()) {
          hasInitializedViewRef.current = true;
          return;
        }

        frameId = window.requestAnimationFrame(fitWhenReady);
      };

      fitWhenReady();

      return () => {
        if (frameId) window.cancelAnimationFrame(frameId);
      };
    }, [fitView]);

    useEffect(() => {
      if (!hasInitializedViewRef.current) return;
      fitView();
    }, [fitView]);

    useEffect(() => {
      if (!textureImageUrl || !onTexturePlacementChange) return;
      if (resolvedTexturePlacement.imageWidth > 0 && resolvedTexturePlacement.imageHeight > 0) return;

      let cancelled = false;
      const image = new Image();

      image.onload = () => {
        if (cancelled) return;
        emitTexturePlacement({
          ...resolvedTexturePlacement,
          imageWidth: image.naturalWidth,
          imageHeight: image.naturalHeight,
        });
      };

      image.src = textureImageUrl;

      return () => {
        cancelled = true;
        image.onload = null;
      };
    }, [
      emitTexturePlacement,
      onTexturePlacementChange,
      resolvedTexturePlacement,
      textureImageUrl,
    ]);

    useImperativeHandle(ref, () => ({
      getOverallWidth: () => bounds.overallWidthMm,
      getOverallHeight: () => bounds.overallHeightMm,
      getOverall: () => bounds,
      resetView: () => {
        if (!fitView()) {
          setPan({ x: 0, y: 0 });
          setZoom(DEFAULT_ZOOM);
        }
      },
      printController,
    }), [bounds, fitView, printController]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (textureTransformEnabled) {
          const zoomFactor = Math.exp(-event.deltaY * 0.0015);
          emitTexturePlacement((current) => ({
            ...current,
            scale: clamp(current.scale * zoomFactor, MIN_TEXTURE_SCALE, MAX_TEXTURE_SCALE),
          }));
          return;
        }

        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const scene = getSceneDimensions(rect.width / rect.height);
        const { clientX, clientY, deltaY } = event;
        const zoomFactor = Math.exp(-deltaY * 0.0015);

        setZoom((currentZoom) => {
          const nextZoom = clamp(currentZoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
          if (nextZoom === currentZoom) return currentZoom;

          const worldBefore = getWorldPointFromClient(clientX, clientY, rect, scene, currentZoom);
          const worldAfter = getWorldPointFromClient(clientX, clientY, rect, scene, nextZoom);

          setPan((value) => ({
            x: value.x + (worldAfter.x - worldBefore.x),
            y: value.y - (worldAfter.y - worldBefore.y),
          }));

          return nextZoom;
        });
      };

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }, [emitTexturePlacement, textureTransformEnabled]);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY };
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scene = getSceneDimensions(rect.width / rect.height);
      const deltaX = (event.clientX - dragRef.current.clientX) * (scene.width / rect.width) / zoom;
      const deltaY = (event.clientY - dragRef.current.clientY) * (scene.height / rect.height) / zoom;
      dragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY };

      if (textureTransformEnabled) {
        emitTexturePlacement((current) => ({
          ...current,
          offsetXRatio: current.offsetXRatio + deltaX / Math.max(baseTextureBounds.width, 1),
          offsetYRatio: current.offsetYRatio + deltaY / Math.max(baseTextureBounds.height, 1),
        }));
        return;
      }

      setPan((value) => ({ x: value.x + deltaX, y: value.y + deltaY }));
    };

    const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const widthText = `${widthLabel} : ${formatDielineDisplayValue(bounds.overallWidthMm, displayUnit)}`;
    const heightText = `${heightLabel} : ${formatDielineDisplayValue(bounds.overallHeightMm, displayUnit)}`;
    const dimensionTick = Math.max(10, layout.tickSize * 0.7);
    const overallDimensionTicks = [
      [layout.leftX, layout.topDimensionY - dimensionTick / 2, layout.leftX, layout.topDimensionY + dimensionTick / 2],
      [layout.rightX, layout.topDimensionY - dimensionTick / 2, layout.rightX, layout.topDimensionY + dimensionTick / 2],
      [layout.leftDimensionX - dimensionTick / 2, layout.topY, layout.leftDimensionX + dimensionTick / 2, layout.topY],
      [layout.leftDimensionX - dimensionTick / 2, layout.bottomY, layout.leftDimensionX + dimensionTick / 2, layout.bottomY],
    ];

    return (
      <div
        ref={containerRef}
        className={className}
        role="img"
        aria-label="Dieline canvas"
        style={{ width, height, overflow: "hidden", borderRadius: 24, background: backgroundColor, boxShadow: "0 12px 24px rgba(0,0,0,0.08)", fontFamily: "inherit", cursor: dragging ? "grabbing" : "grab", touchAction: "none", overscrollBehavior: "contain", ...style }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <Canvas camera={{ position: [0, 0, 100], zoom: 1, left: -VIEWBOX_WIDTH / 2, right: VIEWBOX_WIDTH / 2, top: VIEWBOX_HEIGHT / 2, bottom: -VIEWBOX_HEIGHT / 2, near: 0.1, far: 1000 }} orthographic style={{ width: "100%", height: "100%", display: "block" }}>
          <ResponsiveOrthographicCamera zoom={zoom} />
          <color attach="background" args={[backgroundColor]} />
          <group position={[-VIEWBOX_WIDTH / 2 + pan.x, VIEWBOX_HEIGHT / 2 - pan.y, 0]}>
            {textureImageUrl
              ? (renderTextureOverlay
                  ? renderTextureOverlay(layout, textureImageUrl, textureBounds)
                  : <DefaultTextureOverlay imageUrl={textureImageUrl} layout={layout} textureBounds={textureBounds} />)
              : null}
            {showDimensions && <>
              <Line points={[createScenePoint(layout.leftX, layout.topDimensionY, 1), createScenePoint(layout.rightX, layout.topDimensionY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftX, layout.topDimensionY, 1), createScenePoint(layout.leftX, layout.topY - layout.tickSize, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.rightX, layout.topDimensionY, 1), createScenePoint(layout.rightX, layout.topY - layout.tickSize, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftDimensionX, layout.topY, 1), createScenePoint(layout.leftDimensionX, layout.bottomY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftDimensionX, layout.topY, 1), createScenePoint(layout.leftX - layout.tickSize, layout.topY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftDimensionX, layout.bottomY, 1), createScenePoint(layout.leftX - layout.tickSize, layout.bottomY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              {overallDimensionTicks.map((segment, index) => (
                <Line
                  key={`overall-dimension-tick-${index}`}
                  points={[
                    createScenePoint(segment[0], segment[1], 1),
                    createScenePoint(segment[2], segment[3], 1),
                  ]}
                  color={dimensionColor}
                  lineWidth={LINE_WIDTH}
                />
              ))}
              <Text position={[layout.centerX, -layout.topLabelY, 3]} color={labelColor} fontSize={layout.widthFontSize} anchorX="center" anchorY="middle" textAlign="center">{widthText}</Text>
              <Text position={[layout.sideLabelX, -layout.centerY, 3]} color={labelColor} fontSize={layout.heightFontSize} anchorX="center" anchorY="middle" textAlign="center" rotation={[0, 0, Math.PI / 2]}>{heightText}</Text>
            </>}
            {renderShape(layout, shapeStrokeColor, createScenePoint, showShapeLines)}
          </group>
        </Canvas>
      </div>
    );
  },
);

