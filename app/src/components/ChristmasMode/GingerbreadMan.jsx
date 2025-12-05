import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 可愛的薑餅人
 * 使用基本幾何體組合，隨機跳舞漂浮
 */
export default function GingerbreadMan({ position = [0, 0, 0], scale = 1 }) {
  const groupRef = useRef();
  
  // 隨機動畫參數
  const animParams = useMemo(() => ({
    floatSpeed: 0.5 + Math.random() * 0.5,
    floatRange: 0.5 + Math.random() * 0.5,
    rotateSpeed: 0.3 + Math.random() * 0.4,
    danceSpeed: 2 + Math.random() * 2,
    phaseOffset: Math.random() * Math.PI * 2,
  }), []);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const { floatSpeed, floatRange, rotateSpeed, danceSpeed, phaseOffset } = animParams;
    
    if (groupRef.current) {
      // 上下漂浮
      groupRef.current.position.y = position[1] + Math.sin(time * floatSpeed + phaseOffset) * floatRange;
      
      // 左右搖擺
      groupRef.current.rotation.z = Math.sin(time * danceSpeed + phaseOffset) * 0.2;
      
      // 緩慢旋轉
      groupRef.current.rotation.y += rotateSpeed * 0.01;
    }
  });
  
  const brownColor = "#c4803c";
  const whiteColor = "#ffffff";
  const redColor = "#ff4444";
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* 身體 */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.35, 0.5, 8, 16]} />
        <meshStandardMaterial color={brownColor} roughness={0.8} />
      </mesh>
      
      {/* 頭 */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color={brownColor} roughness={0.8} />
      </mesh>
      
      {/* 眼睛 */}
      <mesh position={[-0.12, 0.75, 0.28]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={whiteColor} />
      </mesh>
      <mesh position={[0.12, 0.75, 0.28]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={whiteColor} />
      </mesh>
      
      {/* 瞳孔 */}
      <mesh position={[-0.12, 0.75, 0.33]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[0.12, 0.75, 0.33]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      
      {/* 微笑 */}
      <mesh position={[0, 0.58, 0.3]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.1, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color={whiteColor} />
      </mesh>
      
      {/* 鈕扣 */}
      <mesh position={[0, 0.1, 0.35]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={redColor} emissive={redColor} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, -0.1, 0.35]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#44ff44" emissive="#44ff44" emissiveIntensity={0.3} />
      </mesh>
      
      {/* 左手 */}
      <mesh position={[-0.5, 0.1, 0]} rotation={[0, 0, 0.5]}>
        <capsuleGeometry args={[0.1, 0.3, 4, 8]} />
        <meshStandardMaterial color={brownColor} roughness={0.8} />
      </mesh>
      
      {/* 右手 */}
      <mesh position={[0.5, 0.1, 0]} rotation={[0, 0, -0.5]}>
        <capsuleGeometry args={[0.1, 0.3, 4, 8]} />
        <meshStandardMaterial color={brownColor} roughness={0.8} />
      </mesh>
      
      {/* 左腳 */}
      <mesh position={[-0.18, -0.55, 0]}>
        <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
        <meshStandardMaterial color={brownColor} roughness={0.8} />
      </mesh>
      
      {/* 右腳 */}
      <mesh position={[0.18, -0.55, 0]}>
        <capsuleGeometry args={[0.12, 0.25, 4, 8]} />
        <meshStandardMaterial color={brownColor} roughness={0.8} />
      </mesh>
      
      {/* 蝴蝶結 */}
      <mesh position={[0, 0.45, 0.3]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.15, 0.08, 0.05]} />
        <meshStandardMaterial color={redColor} />
      </mesh>
      <mesh position={[0, 0.45, 0.3]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.15, 0.08, 0.05]} />
        <meshStandardMaterial color={redColor} />
      </mesh>
    </group>
  );
}

/**
 * 多個薑餅人群組
 */
export function GingerbreadCrowd({ count = 5 }) {
  const gingerbreadPositions = useMemo(() => {
    return new Array(count).fill().map(() => ({
      position: [
        (Math.random() - 0.5) * 25,
        Math.random() * 8 - 2,
        (Math.random() - 0.5) * 25,
      ],
      scale: 0.6 + Math.random() * 0.4,
    }));
  }, [count]);
  
  return (
    <>
      {gingerbreadPositions.map((props, index) => (
        <GingerbreadMan key={index} {...props} />
      ))}
    </>
  );
}
