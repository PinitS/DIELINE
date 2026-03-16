import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import type { OrthographicCamera as ThreeOrthographicCamera } from "three";
import type { DielineBounds, DielineCanvasHandle, DielineMeasureCallback, SharedCanvasProps } from "../types";
import { createCanvasLayout, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "../utils/layout";
import { formatDielineDisplayValue } from "../utils/units";

type DragState = { pointerId: number; clientX: number; clientY: number };
type CanvasPoint = [number, number, number];
type BaseDielineCanvasProps = SharedCanvasProps & {
  bounds: DielineBounds;
  onMeasure?: DielineMeasureCallback;
  renderShape: (
    layout: ReturnType<typeof createCanvasLayout>,
    shapeStrokeColor: string,
    createScenePoint: (x: number, y: number, z?: number) => CanvasPoint,
  ) => ReactNode;
};

const LINE_WIDTH = 2;
const VIEWBOX_ASPECT = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;
const ARROW_HEAD_ANGLE = Math.PI / 6;
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 64;

const createScenePoint = (x: number, y: number, z = 0): CanvasPoint => [x, -y, z];
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createArrowHeadSegments = (
  tipX: number,
  tipY: number,
  dirX: number,
  dirY: number,
  length: number,
  z = 1,
): [CanvasPoint, CanvasPoint][] => {
  const cos = Math.cos(ARROW_HEAD_ANGLE);
  const sin = Math.sin(ARROW_HEAD_ANGLE);

  const leftX = dirX * cos - dirY * sin;
  const leftY = dirX * sin + dirY * cos;
  const rightX = dirX * cos + dirY * sin;
  const rightY = -dirX * sin + dirY * cos;

  return [
    [
      createScenePoint(tipX, tipY, z),
      createScenePoint(tipX + leftX * length, tipY + leftY * length, z),
    ],
    [
      createScenePoint(tipX, tipY, z),
      createScenePoint(tipX + rightX * length, tipY + rightY * length, z),
    ],
  ];
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
      height = 720,
      displayUnit = "mm",
      backgroundColor = "#d9d9d9",
      shapeStrokeColor = "#ff2d2d",
      dimensionColor = "#111111",
      labelColor = "#111111",
      widthLabel = "Overall Width",
      heightLabel = "Overall Height",
      showDimensions = true,
      showLabels = true,
      className,
      style,
      bounds,
      onMeasure,
      renderShape,
    } = props;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [dragging, setDragging] = useState(false);
    const layout = createCanvasLayout(bounds);

    useEffect(() => {
      onMeasure?.(bounds);
    }, [bounds.overallHeightMm, bounds.overallWidthMm, onMeasure]);

    useImperativeHandle(ref, () => ({
      getOverallWidth: () => bounds.overallWidthMm,
      getOverallHeight: () => bounds.overallHeightMm,
      resetView: () => {
        setPan({ x: 0, y: 0 });
        setZoom(DEFAULT_ZOOM);
      },
    }), [bounds.overallHeightMm, bounds.overallWidthMm]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();

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
    }, []);

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
    const arrowHeadLength = Math.max(8, layout.arrowSize * 0.58);
    const arrowHeadSegments = [
      ...createArrowHeadSegments(layout.leftX, layout.topDimensionY, 1, 0, arrowHeadLength),
      ...createArrowHeadSegments(layout.rightX, layout.topDimensionY, -1, 0, arrowHeadLength),
      ...createArrowHeadSegments(layout.leftDimensionX, layout.topY, 0, 1, arrowHeadLength),
      ...createArrowHeadSegments(layout.leftDimensionX, layout.bottomY, 0, -1, arrowHeadLength),
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
            {showDimensions && <>
              <Line points={[createScenePoint(layout.leftX, layout.topDimensionY, 1), createScenePoint(layout.rightX, layout.topDimensionY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftX, layout.topDimensionY, 1), createScenePoint(layout.leftX, layout.topY - layout.tickSize, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.rightX, layout.topDimensionY, 1), createScenePoint(layout.rightX, layout.topY - layout.tickSize, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftDimensionX, layout.topY, 1), createScenePoint(layout.leftDimensionX, layout.bottomY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftDimensionX, layout.topY, 1), createScenePoint(layout.leftX - layout.tickSize, layout.topY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              <Line points={[createScenePoint(layout.leftDimensionX, layout.bottomY, 1), createScenePoint(layout.leftX - layout.tickSize, layout.bottomY, 1)]} color={dimensionColor} lineWidth={LINE_WIDTH} />
              {arrowHeadSegments.map((points, index) => (
                <Line key={`arrow-head-${index}`} points={points} color={dimensionColor} lineWidth={LINE_WIDTH} />
              ))}
            </>}
            {renderShape(layout, shapeStrokeColor, createScenePoint)}
            {showLabels && <>
              <Text position={[layout.centerX, -layout.topLabelY, 3]} color={labelColor} fontSize={layout.widthFontSize} anchorX="center" anchorY="middle" textAlign="center">{widthText}</Text>
              <Text position={[layout.sideLabelX, -layout.centerY, 3]} color={labelColor} fontSize={layout.heightFontSize} anchorX="center" anchorY="middle" textAlign="center" rotation={[0, 0, Math.PI / 2]}>{heightText}</Text>
            </>}
          </group>
        </Canvas>
      </div>
    );
  },
);

