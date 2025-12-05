import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 雪花粒子系統
 * 使用 Points 建立飄落的雪花效果
 */
export default function Snowfall({ count = 400 }) {
  const pointsRef = useRef();
  
  // 生成雪花位置和屬性
  const { positions, sizes, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // 隨機分佈在場景中
      positions[i * 3] = (Math.random() - 0.5) * 60;      // x
      positions[i * 3 + 1] = Math.random() * 40 - 10;     // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;  // z
      
      // 隨機大小
      sizes[i] = Math.random() * 0.15 + 0.05;
      
      // 隨機下降速度
      speeds[i] = Math.random() * 0.02 + 0.01;
    }
    
    return { positions, sizes, speeds };
  }, [count]);

  // 動畫：雪花飄落
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array;
    const time = state.clock.getElapsedTime();
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 下降
      positions[i3 + 1] -= speeds[i];
      
      // 左右飄動
      positions[i3] += Math.sin(time * 0.5 + i) * 0.01;
      positions[i3 + 2] += Math.cos(time * 0.3 + i * 0.5) * 0.008;
      
      // 超出底部時重置到頂部
      if (positions[i3 + 1] < -15) {
        positions[i3 + 1] = 30;
        positions[i3] = (Math.random() - 0.5) * 60;
        positions[i3 + 2] = (Math.random() - 0.5) * 60;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
