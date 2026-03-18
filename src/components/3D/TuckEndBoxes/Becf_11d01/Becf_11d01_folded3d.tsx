import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type RefObject } from "react";
import { DoubleSide, Shape, ShapeGeometry, Vector2 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { OrbitControls as ThreeOrbitControls } from "three-stdlib";
import type { Becf11d01DielineProps, DielineCanvasHandle } from "../../../../types";
import {
  getBecf11d01FoldAngles,
  getBecf11d01Geometry,
  type Point,
} from "../../../../utils/becf11d01Geometry";
import { measureBecf11d01Bounds } from "../../../../utils/measure";
import { createDielinePrintController } from "../../../../utils/pdfExport";

type PanelMeshProps = {
  points: Point[];
  color: string;
};

type LocalOrbitControlsProps = {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  enableDamping?: boolean;
  dampingFactor?: number;
  minDistance?: number;
  maxDistance?: number;
};

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
      <meshStandardMaterial color={color} side={DoubleSide} roughness={0.58} metalness={0.08} />
    </mesh>
  );
};

const LocalOrbitControls = ({
  controlsRef,
  enableDamping = false,
  dampingFactor = 0.05,
  minDistance,
  maxDistance,
}: LocalOrbitControlsProps) => {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const controls = useMemo(() => new ThreeOrbitControls(camera, gl.domElement), [camera, gl.domElement]);

  useEffect(() => {
    controlsRef.current = controls;
    return () => {
      if (controlsRef.current === controls) {
        controlsRef.current = null;
      }
      controls.dispose();
    };
  }, [controls, controlsRef]);

  useEffect(() => {
    controls.enableDamping = enableDamping;
    controls.dampingFactor = dampingFactor;
    controls.minDistance = minDistance ?? 0;
    controls.maxDistance = maxDistance ?? Infinity;
    controls.update();
  }, [controls, dampingFactor, enableDamping, maxDistance, minDistance]);

  useFrame(() => {
    controls.update();
  });

  return null;
};

const FoldedBecf11d01Model = ({ attribute, frame = 0 }: Pick<Becf11d01DielineProps, "attribute" | "frame">) => {
  const geometry = useMemo(() => getBecf11d01Geometry(attribute), [attribute]);
  const { resolved, panels3d } = geometry;
  const angles = useMemo(() => getBecf11d01FoldAngles(frame), [frame]);
  const panelColor = "#cbd5e1";

  return (
    <group position={[-resolved.length / 2, resolved.height / 2, resolved.width / 2]}>
      <PanelMesh points={panels3d.front} color={panelColor} />

      <group rotation={[0, angles.glueTab, 0]}>
        <PanelMesh points={panels3d.glueTab} color={panelColor} />
      </group>

      <group rotation={[angles.topMajorFront, 0, 0]}>
        <PanelMesh points={panels3d.topFront} color={panelColor} />
      </group>

      <group position={[0, -resolved.height, 0]} rotation={[angles.bottomMajorFront, 0, 0]}>
        <PanelMesh points={panels3d.bottomFront} color={panelColor} />
      </group>

      <group position={[resolved.length, 0, 0]} rotation={[0, angles.sideRight, 0]}>
        <PanelMesh points={panels3d.sideRight} color={panelColor} />

        <group rotation={[angles.topDustRight, 0, 0]}>
          <PanelMesh points={panels3d.topSideRight} color={panelColor} />
        </group>

        <group position={[0, -resolved.height, 0]} rotation={[angles.bottomDustRight, 0, 0]}>
          <PanelMesh points={panels3d.bottomSideRight} color={panelColor} />
        </group>

        <group position={[resolved.width, 0, 0]} rotation={[0, angles.back, 0]}>
          <PanelMesh points={panels3d.back} color={panelColor} />

          <group rotation={[angles.topMajorBack, 0, 0]}>
            <PanelMesh points={panels3d.topBack} color={panelColor} />
          </group>

          <group position={[0, -resolved.height, 0]} rotation={[angles.bottomMajorBack, 0, 0]}>
            <PanelMesh points={panels3d.bottomBack} color={panelColor} />
          </group>

          <group position={[resolved.length, 0, 0]} rotation={[0, angles.sideLeft, 0]}>
            <PanelMesh points={panels3d.sideLeft} color={panelColor} />

            <group rotation={[angles.topDustLeft, 0, 0]}>
              <PanelMesh points={panels3d.topSideLeft} color={panelColor} />
            </group>

            <group position={[0, -resolved.height, 0]} rotation={[angles.bottomDustLeft, 0, 0]}>
              <PanelMesh points={panels3d.bottomSideLeft} color={panelColor} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export const Becf_11d01_folded3d = forwardRef<DielineCanvasHandle, Becf11d01DielineProps>(
  function Becf11d01Folded3d({
    attribute,
    onMeasure,
    displayUnit = "mm",
    width = "100%",
    height = "100%",
    backgroundColor = "#d9d9d9",
    className,
    style,
    frame = 0,
  }, ref) {
    const controlsRef = useRef<OrbitControlsImpl | null>(null);
    const geometry = useMemo(() => getBecf11d01Geometry(attribute), [attribute]);
    const bounds = useMemo(() => measureBecf11d01Bounds(geometry.resolved), [geometry.resolved]);
    const exportPreviewLayout = useMemo(() => createDielinePrintController(
      { modelId: "becf11d01", attributes: attribute },
      { displayUnit, title: "Becf_11d01_folded3d.pdf" },
    ), [attribute, displayUnit]);

    const cameraDistance = useMemo(() => {
      const span = Math.max(
        geometry.resolved.length,
        geometry.resolved.height,
        geometry.resolved.width * 2,
        geometry.resolved.dustFlap + geometry.resolved.width,
      );
      return span * 2.75;
    }, [geometry.resolved]);

    const initialCameraPosition = useMemo<[number, number, number]>(
      () => [cameraDistance * 0.96, cameraDistance * 0.66, cameraDistance * 1.12],
      [cameraDistance],
    );

    useEffect(() => {
      onMeasure?.(bounds);
    }, [bounds, onMeasure]);

    useImperativeHandle(ref, () => ({
      getOverall: () => bounds,
      resetView: () => {
        const controls = controlsRef.current;
        if (!controls) return;
        controls.object.position.set(...initialCameraPosition);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      exportPreviewLayout,
    }), [bounds, exportPreviewLayout, initialCameraPosition]);

    return (
      <div
        className={className}
        role="img"
        aria-label="Folded 3D becf-11d01 canvas"
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
          <ambientLight intensity={0.34} />
          <directionalLight
            position={[220, 190, 170]}
            intensity={1.35}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.001}
          />
          <directionalLight position={[-200, 110, 130]} intensity={0.62} />
          <directionalLight position={[0, 90, -220]} intensity={0.45} />
          <directionalLight position={[0, 260, 0]} intensity={0.28} />
          <FoldedBecf11d01Model attribute={attribute} frame={frame} />
          <LocalOrbitControls
            controlsRef={controlsRef}
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