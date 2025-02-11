"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Group } from "three";

export function FloatingHeart({
  position,
  scale = 1,
  rotationSpeed = 1,
  floatSpeed = 1,
}: {
  position: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
  floatSpeed?: number;
}) {
  const heartRef = useRef<Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!heartRef.current) return;

    // Floating motion
    heartRef.current.position.y =
      position[1] + Math.sin(time * floatSpeed) * 0.5;

    // Rotation
    heartRef.current.rotation.y += 0.005 * rotationSpeed;
    heartRef.current.rotation.z = Math.sin(time * 0.5) * 0.1;

    // Log base position
  //   console.log('Heart base position:', {
  //     x: position[0],
  //     y: position[1],
  //     z: position[2]
  //   });
  });
 
  // x:1.657772506051911
  // y: 0.35793396370240593
  // z: 0.09771778513089302
  // Heart shape geometry
  const heartShape = new THREE.Shape();
  heartShape.moveTo(-25, -25);
  heartShape.bezierCurveTo(-25, -25, -20, 0, 0, 0);
  heartShape.bezierCurveTo(30, 0, 30, -35, 30, -35);
  heartShape.bezierCurveTo(30, -55, 10, -77, -25, -95);
  heartShape.bezierCurveTo(-60, -77, -80, -55, -80, -35);
  heartShape.bezierCurveTo(-80, -35, -80, 0, -50, 0);
  heartShape.bezierCurveTo(-35, 0, -25, -25, -25, -25);

  const extrudeSettings = {
    depth: 8,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 2,
    bevelSize: 1,
    bevelThickness: 1,
  };

  return (
    <group ref={heartRef} position={position} scale={scale}>
      <mesh>
        <extrudeGeometry args={[heartShape, extrudeSettings]} />
        <meshPhysicalMaterial
          color="#ff69b4"
          roughness={0.2}
          metalness={0.8}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          transmission={0.5}
          thickness={0.5}
        />
      </mesh>
    </group>
  );
}
