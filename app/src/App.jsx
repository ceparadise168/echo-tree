import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Text } from '@react-three/drei';

// 1. 天空配置
const CARD_COUNT = 500; // 增加數量以展示性能
const SPREAD_X = 30;
const SPREAD_Y = 15;
const SPREAD_Z = 20;

// 2. 記憶星空 (使用 InstancedMesh 優化)
// 此組件在單一繪製調用中渲染所有卡片，以獲得最佳性能。
const EchoSky = () => {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 為每個實例生成穩定的屬性，只運行一次。
  const cards = useMemo(() => {
    return new Array(CARD_COUNT).fill().map(() => ({
      position: [
        (Math.random() - 0.5) * SPREAD_X,
        (Math.random() - 0.5) * SPREAD_Y,
        (Math.random() - 0.5) * SPREAD_Z,
      ],
      color: Math.random() > 0.5 ? new THREE.Color('#FFD700') : new THREE.Color('#FF69B4'),
      delay: Math.random() * 10,
      speed: 0.5 + Math.random() * 0.5,
      rotationSpeed: 0.2 + Math.random() * 0.2,
    }));
  }, []);

  // 組件掛載後，一次性應用實例顏色。
  useEffect(() => {
    const colorArray = new Float32Array(CARD_COUNT * 3);
    cards.forEach((card, i) => card.color.toArray(colorArray, i * 3));
    meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
  }, [cards]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // 核心優化：單一循環更新所有卡片的矩陣。
    cards.forEach((card, i) => {
      const { position, delay, speed, rotationSpeed } = card;
      
      // 更新虛擬物件的變換
      dummy.position.set(
        position[0],
        position[1] + Math.sin(t * speed + delay) * 0.5,
        position[2]
      );
      dummy.rotation.z = Math.sin(t * rotationSpeed + delay) * 0.05;
      dummy.updateMatrix();
      
      // 將此變換應用於特定實例
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    // 告知 Three.js 實例矩陣已更新。
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, CARD_COUNT]}>
      <planeGeometry args={[1.5, 1]} />
      <meshStandardMaterial
        vertexColors // 使用實例顏色
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

// 3. 用於渲染場景的主應用
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050510' }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <fog attach="fog" args={['#050510', 10, 35]} />
        
        <EchoSky />
        
        <Text color="white" anchorX="center" anchorY="bottom" position={[0, -5, 0]} fontSize={0.5}>
          拖曳以探索星空
        </Text>

        <OrbitControls enablePan={true} autoRotate autoRotateSpeed={0.1} />
      </Canvas>
    </div>
  );
}