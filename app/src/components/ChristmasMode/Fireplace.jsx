import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * 溫暖的壁爐
 * 背景裝飾，產生溫暖的橘紅光暈
 */
export default function Fireplace({ position = [-15, -5, -10] }) {
  const fireRef = useRef();
  const lightRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // 火焰閃爍效果
    if (lightRef.current) {
      const flicker = Math.sin(time * 10) * 0.3 + Math.sin(time * 7) * 0.2 + Math.sin(time * 13) * 0.1;
      lightRef.current.intensity = 8 + flicker * 3;
    }
    
    // 火焰縮放動畫
    if (fireRef.current) {
      fireRef.current.scale.y = 1 + Math.sin(time * 8) * 0.1;
    }
  });
  
  return (
    <group position={position}>
      {/* 壁爐框架 */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4, 3.5, 1]} />
        <meshStandardMaterial color="#2d1810" roughness={0.9} />
      </mesh>
      
      {/* 壁爐內部 */}
      <mesh position={[0, 1, 0.3]}>
        <boxGeometry args={[3, 2.5, 0.8]} />
        <meshStandardMaterial color="#0a0505" roughness={1} />
      </mesh>
      
      {/* 火焰基座（柴火） */}
      <mesh position={[0, 0.3, 0.3]} rotation={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 2, 8]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      <mesh position={[0.5, 0.3, 0.3]} rotation={[0, -0.4, 0.2]}>
        <cylinderGeometry args={[0.12, 0.12, 1.8, 8]} />
        <meshStandardMaterial color="#3d2817" roughness={0.9} />
      </mesh>
      
      {/* 火焰 */}
      <group ref={fireRef} position={[0, 1, 0.5]}>
        {/* 主火焰 */}
        <mesh position={[0, 0, 0]}>
          <coneGeometry args={[0.5, 1.5, 8]} />
          <meshStandardMaterial 
            color="#ff4500"
            emissive="#ff6600"
            emissiveIntensity={3}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
        {/* 內層火焰 */}
        <mesh position={[0, 0.1, 0]} scale={[0.6, 0.8, 0.6]}>
          <coneGeometry args={[0.4, 1.2, 8]} />
          <meshStandardMaterial 
            color="#ffcc00"
            emissive="#ffaa00"
            emissiveIntensity={4}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>
        {/* 小火焰 */}
        <mesh position={[-0.3, -0.2, 0]} scale={[0.4, 0.5, 0.4]}>
          <coneGeometry args={[0.3, 0.8, 6]} />
          <meshStandardMaterial 
            color="#ff6600"
            emissive="#ff4400"
            emissiveIntensity={2}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.35, -0.15, 0]} scale={[0.35, 0.45, 0.35]}>
          <coneGeometry args={[0.25, 0.7, 6]} />
          <meshStandardMaterial 
            color="#ff6600"
            emissive="#ff4400"
            emissiveIntensity={2}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </mesh>
      </group>
      
      {/* 壁爐光源 */}
      <pointLight 
        ref={lightRef}
        position={[0, 1.5, 2]}
        color="#ff6622"
        intensity={8}
        distance={25}
        decay={2}
      />
      
      {/* 環境暖光 */}
      <pointLight 
        position={[0, 2, 3]}
        color="#ff9944"
        intensity={3}
        distance={20}
        decay={2}
      />
    </group>
  );
}
