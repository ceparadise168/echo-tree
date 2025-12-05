import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 程序化 3D 聖誕樹
 * 使用多層圓錐組合成聖誕樹形狀
 */
export default function ChristmasTree({ position = [0, -3, 0] }) {
  const groupRef = useRef();
  const starRef = useRef();
  const lightsRef = useRef([]);
  
  // 樹的層級配置
  const treeLayers = useMemo(() => [
    { y: 4, radius: 0.8, height: 2 },
    { y: 2.5, radius: 1.2, height: 2.5 },
    { y: 0.8, radius: 1.8, height: 3 },
    { y: -1.2, radius: 2.4, height: 3.5 },
  ], []);
  
  // 彩燈位置
  const lightPositions = useMemo(() => {
    const lights = [];
    const colors = ['#ff0000', '#ffff00', '#00ff00', '#0066ff', '#ff69b4', '#ffa500'];
    
    treeLayers.forEach((layer, layerIndex) => {
      const count = 6 + layerIndex * 3;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = layer.radius * 0.7;
        lights.push({
          position: [
            Math.cos(angle) * r,
            layer.y + layer.height * 0.3,
            Math.sin(angle) * r
          ],
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * Math.PI * 2,
        });
      }
    });
    
    return lights;
  }, [treeLayers]);

  // 動畫
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // 樹輕微搖擺
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.2) * 0.02;
    }
    
    // 星星閃爍
    if (starRef.current) {
      starRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.15);
      starRef.current.rotation.y = time * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* 樹幹 */}
      <mesh position={[0, -2.5, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 2, 8]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      
      {/* 樹的各層 */}
      {treeLayers.map((layer, index) => (
        <mesh key={index} position={[0, layer.y, 0]}>
          <coneGeometry args={[layer.radius, layer.height, 16]} />
          <meshStandardMaterial 
            color="#0d5c0d" 
            roughness={0.8}
            emissive="#052505"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
      
      {/* 頂端星星 */}
      <group ref={starRef} position={[0, 6, 0]}>
        <mesh>
          <octahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial 
            color="#FFD700" 
            emissive="#FFD700"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
        {/* 星星光芒 */}
        <pointLight color="#FFD700" intensity={3} distance={8} />
      </group>
      
      {/* 彩燈 */}
      {lightPositions.map((light, index) => (
        <ChristmasLight 
          key={index}
          position={light.position}
          color={light.color}
          delay={light.delay}
        />
      ))}
    </group>
  );
}

/**
 * 單個彩燈
 */
function ChristmasLight({ position, color, delay }) {
  const meshRef = useRef();
  const lightRef = useRef();
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const intensity = (Math.sin(time * 2 + delay) + 1) * 0.5;
    
    if (meshRef.current) {
      meshRef.current.material.emissiveIntensity = 0.5 + intensity * 1.5;
    }
    if (lightRef.current) {
      lightRef.current.intensity = intensity * 2;
    }
  });
  
  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
      <pointLight 
        ref={lightRef}
        color={color} 
        intensity={1} 
        distance={2}
      />
    </group>
  );
}
