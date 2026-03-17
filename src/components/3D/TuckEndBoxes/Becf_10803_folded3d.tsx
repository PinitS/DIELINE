import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { DoubleSide, Shape, ShapeGeometry, Vector2 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { DielineCanvasHandle, DielinePrintController, TuckEndBoxDielineProps } from "../../../types";
import { measureTuckEndBoxBounds } from "../../../utils/measure";
import { createDielinePrintController } from "../../../utils/pdfExport";
import {
  getTuckEndBoxFoldAngles,
  getTuckEndBoxGeometry,
  type Point,
} from "../../../utils/tuckEndBoxGeometry";

type PanelMeshProps = {
  points: Point[];
  color: string;
};

const localizePoints = (points: Point[], originX: number, originY: number) =>
  points.map((point) => ({ x: point.x - originX, y: point.y - originY }));

const PanelMesh = ({ points, color }: PanelMeshProps) => {
  const pointSignature = useMemo(
    () => points.map(({ x, y }) => `${x.toFixed(4)}:${y.toFixed(4)}`).join("|"),
    [points],
  );

  const geometry = useMemo(() => {
    const shape = new Shape(points.map(({ x, y }) => new Vector2(x, -y)));
    return new ShapeGeometry(shape);
  }, [pointSignature, points]);

  useEffect(() => () => {
    geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} side={DoubleSide} roughness={0.6} metalness={0.1} />
    </mesh>
  );
};

const FoldedTuckEndBoxModel = ({ attribute, frame = 0 }: Pick<TuckEndBoxDielineProps, "attribute" | "frame">) => {
  const geometry = useMemo(() => getTuckEndBoxGeometry(attribute), [attribute]);
  const { resolved, guides, panels } = geometry;
  const angles = useMemo(() => getTuckEndBoxFoldAngles(frame), [frame]);

  const front = useMemo(() => localizePoints(panels.front, guides.x0, guides.y1), [guides.x0, guides.y1, panels.front]);
  const sideRight = useMemo(() => localizePoints(panels.sideRight, guides.x1, guides.y1), [guides.x1, guides.y1, panels.sideRight]);
  const back = useMemo(() => localizePoints(panels.back, guides.x2, guides.y1), [guides.x2, guides.y1, panels.back]);
  const sideLeft = useMemo(() => localizePoints(panels.sideLeft, guides.x3, guides.y1), [guides.x3, guides.y1, panels.sideLeft]);
  const glueTab = useMemo(() => localizePoints(panels.glueTab, guides.x0, guides.y1), [guides.x0, guides.y1, panels.glueTab]);
  const topClosure = useMemo(() => localizePoints(panels.topClosure, guides.x2, guides.y1), [guides.x2, guides.y1, panels.topClosure]);
  const topTuck = useMemo(() => localizePoints(panels.topTuck, guides.x2, guides.y0), [guides.x2, guides.y0, panels.topTuck]);
  const bottomClosure = useMemo(() => localizePoints(panels.bottomClosure, guides.x0, guides.y2), [guides.x0, guides.y2, panels.bottomClosure]);
  const bottomTuck = useMemo(() => localizePoints(panels.bottomTuck, guides.x0, guides.y3), [guides.x0, guides.y3, panels.bottomTuck]);
  const topDustLeft = useMemo(() => localizePoints(panels.topDustLeft, guides.x1, guides.y1), [guides.x1, guides.y1, panels.topDustLeft]);
  const topDustRight = useMemo(() => localizePoints(panels.topDustRight, guides.x3, guides.y1), [guides.x3, guides.y1, panels.topDustRight]);
  const bottomDustLeft = useMemo(() => localizePoints(panels.bottomDustLeft, guides.x1, guides.y2), [guides.x1, guides.y2, panels.bottomDustLeft]);
  const bottomDustRight = useMemo(() => localizePoints(panels.bottomDustRight, guides.x3, guides.y2), [guides.x3, guides.y2, panels.bottomDustRight]);

  const panelColor = "#cbd5e1";

  return (
    <group position={[-resolved.length / 2, resolved.height / 2, resolved.width / 2]}>
      <PanelMesh points={front} color={panelColor} />

      <group rotation={[0, angles.glueTab, 0]}>
        <PanelMesh points={glueTab} color={panelColor} />
      </group>

      <group position={[resolved.length, 0, 0]} rotation={[0, angles.sideRight, 0]}>
        <PanelMesh points={sideRight} color={panelColor} />

        <group rotation={[angles.topDustLeft, 0, 0]}>
          <PanelMesh points={topDustLeft} color={panelColor} />
        </group>

        <group position={[0, -resolved.height, 0]} rotation={[angles.bottomDustLeft, 0, 0]}>
          <PanelMesh points={bottomDustLeft} color={panelColor} />
        </group>

        <group position={[resolved.width, 0, 0]} rotation={[0, angles.back, 0]}>
          <PanelMesh points={back} color={panelColor} />

          <group rotation={[angles.topClosure, 0, 0]}>
            <PanelMesh points={topClosure} color={panelColor} />
            <group position={[0, resolved.closurePanel, 0]} rotation={[angles.topTuck, 0, 0]}>
              <PanelMesh points={topTuck} color={panelColor} />
            </group>
          </group>

          <group position={[resolved.length, 0, 0]} rotation={[0, angles.sideLeft, 0]}>
            <PanelMesh points={sideLeft} color={panelColor} />

            <group rotation={[angles.topDustRight, 0, 0]}>
              <PanelMesh points={topDustRight} color={panelColor} />
            </group>

            <group position={[0, -resolved.height, 0]} rotation={[angles.bottomDustRight, 0, 0]}>
              <PanelMesh points={bottomDustRight} color={panelColor} />
            </group>
          </group>
        </group>
      </group>

      <group position={[0, -resolved.height, 0]} rotation={[angles.bottomClosure, 0, 0]}>
        <PanelMesh points={bottomClosure} color={panelColor} />
        <group position={[0, -resolved.closurePanel, 0]} rotation={[angles.bottomTuck, 0, 0]}>
          <PanelMesh points={bottomTuck} color={panelColor} />
        </group>
      </group>
    </group>
  );
};

export const Becf_10803_folded3d = forwardRef<DielineCanvasHandle, TuckEndBoxDielineProps>(
  function Becf10803Folded3d({ attribute, onMeasure, displayUnit = "mm", width = "100%", height = "100%", backgroundColor = "#d9d9d9", className, style, frame = 0 }, ref) {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);
    const geometry = useMemo(() => getTuckEndBoxGeometry(attribute), [attribute]);
    const bounds = useMemo(() => measureTuckEndBoxBounds(geometry.resolved), [geometry.resolved]);
    const printController = useMemo(() => createDielinePrintController(
      { modelId: "tuckEndBox", attributes: attribute },
      { displayUnit, title: "Becf_10803_folded3d.pdf" },
    ), [attribute, displayUnit]);

    const cameraDistance = useMemo(() => {
      const span = Math.max(
        geometry.resolved.length,
        geometry.resolved.width,
        geometry.resolved.height,
        geometry.resolved.closurePanel + geometry.resolved.tuckFlap,
      );
      return span * 2.8;
    }, [geometry.resolved]);

    const initialCameraPosition = useMemo<[number, number, number]>(
      () => [cameraDistance * 0.95, cameraDistance * 0.65, cameraDistance * 1.15],
      [cameraDistance],
    );

    useEffect(() => {
      onMeasure?.(bounds);
    }, [bounds, onMeasure]);

    useImperativeHandle(ref, () => ({
      getOverallWidth: () => bounds.overallWidthMm,
      getOverallHeight: () => bounds.overallHeightMm,
      getOverall: () => bounds,
      resetView: () => {
        const controls = controlsRef.current;
        if (!controls) return;
        controls.object.position.set(...initialCameraPosition);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      printController,
    }), [bounds, initialCameraPosition, printController]);

    return (
      <div
        className={className}
        role="img"
        aria-label="Folded 3D tuck-end-box canvas"
        style={{
          width,
          height,
          overflow: "hidden",
          borderRadius: 24,
          background: backgroundColor,
          boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
          ...style,
        }}
      >
        <Canvas camera={{ position: initialCameraPosition, fov: 34, near: 0.1, far: 4000 }} shadows style={{ width: "100%", height: "100%", display: "block" }}>
          <color attach="background" args={[backgroundColor]} />
          <ambientLight intensity={0.35} />
          {/* Key Light - front right */}
          <directionalLight
            position={[200, 180, 150]}
            intensity={1.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.001}
          />
          {/* Fill Light - front left */}
          <directionalLight position={[-180, 100, 120]} intensity={0.6} />
          {/* Rim Light - back */}
          <directionalLight position={[0, 80, -200]} intensity={0.5} />
          {/* Top Soft Light */}
          <directionalLight position={[0, 250, 0]} intensity={0.3} />
          <FoldedTuckEndBoxModel attribute={attribute} frame={frame} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.08}
            minDistance={cameraDistance * 0.45}
            maxDistance={cameraDistance * 4}
          />
        </Canvas>
      </div>
    );
  },
);