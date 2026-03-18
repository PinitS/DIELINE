import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";

type ScenePoint = [number, number, number];

type SceneLineProps = {
  points: ScenePoint[];
  color: string;
  lineWidth?: number;
  dashed?: boolean;
  dashScale?: number;
  dashSize?: number;
  gapSize?: number;
};

export const SceneLine = ({ points, color, lineWidth = 1, dashed = false, dashScale = 1, dashSize = 1, gapSize = 1 }: SceneLineProps) => {
  if (points.length < 2) return null;

  const geometry = useMemo(() => {
    const nextGeometry = new BufferGeometry();
    nextGeometry.setAttribute("position", new Float32BufferAttribute(points.flat(), 3));

    if (dashed) {
      const distances = new Float32Array(points.length);
      let total = 0;

      for (let index = 1; index < points.length; index += 1) {
        const [ax, ay, az] = points[index - 1];
        const [bx, by, bz] = points[index];
        total += Math.hypot(bx - ax, by - ay, bz - az);
        distances[index] = total;
      }

      nextGeometry.setAttribute("lineDistance", new Float32BufferAttribute(distances, 1));
    }

    return nextGeometry;
  }, [dashed, points]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      {dashed ? (
        <lineDashedMaterial
          attach="material"
          color={color}
          linewidth={lineWidth}
          scale={dashScale}
          dashSize={dashSize}
          gapSize={gapSize}
          toneMapped={false}
        />
      ) : (
        <lineBasicMaterial attach="material" color={color} linewidth={lineWidth} toneMapped={false} />
      )}
    </line>
  );
};