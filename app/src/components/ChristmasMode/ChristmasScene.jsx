import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

import Snowfall from './Snowfall';
import ChristmasTree from './ChristmasTree';
import Fireplace from './Fireplace';
import { GingerbreadCrowd } from './GingerbreadMan';
import { Aurora } from './Aurora';
import { MagicParticles } from './MagicParticles';
import './ChristmasMode.css';

/**
 * 環繞聖誕樹的卡片
 */
function OrbitingCards({ cards, prefersReducedMotion }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // 計算卡片環繞位置
  const cardPositions = useMemo(() => {
    return cards.map((card, index) => {
      const total = cards.length;
      const layer = Math.floor(index / 8);
      const indexInLayer = index % 8;
      const angle = (indexInLayer / 8) * Math.PI * 2 + layer * 0.3;
      const radius = 6 + layer * 1.5;
      const height = 4 - layer * 2;
      
      return {
        ...card,
        orbitAngle: angle,
        orbitRadius: radius,
        orbitHeight: height,
        orbitSpeed: 0.1 + Math.random() * 0.1,
      };
    });
  }, [cards]);

  // 設置顏色
  useEffect(() => {
    if (!meshRef.current || cardPositions.length === 0) return;
    
    const colorArray = new Float32Array(cardPositions.length * 3);
    cardPositions.forEach((card, i) => {
      const color = new THREE.Color(card.color || '#FFD700');
      color.toArray(colorArray, i * 3);
    });
    meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
  }, [cardPositions]);

  useFrame((state) => {
    if (!meshRef.current || cardPositions.length === 0) return;
    
    const time = prefersReducedMotion ? 0 : state.clock.getElapsedTime();
    
    cardPositions.forEach((card, i) => {
      const angle = card.orbitAngle + time * card.orbitSpeed;
      
      dummy.position.set(
        Math.cos(angle) * card.orbitRadius,
        card.orbitHeight + Math.sin(time * 0.5 + i) * 0.3,
        Math.sin(angle) * card.orbitRadius
      );
      
      // 面向中心
      dummy.lookAt(0, card.orbitHeight, 0);
      dummy.rotation.y += Math.PI;
      
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (cardPositions.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, cardPositions.length]}>
      <planeGeometry args={[1.5, 1]} />
      <meshStandardMaterial
        vertexColors
        emissiveIntensity={0.8}
        toneMapped={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

/**
 * 聖誕場景攝影機控制
 */
function ChristmasCameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    // 設置初始位置，俯瞰聖誕樹
    camera.position.set(12, 8, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  return null;
}

/**
 * 聖誕彩蛋模式主元件
 */
export default function ChristmasScene({ 
  userCards = [], 
  seedCards = [],
  onClose,
  prefersReducedMotion = false 
}) {
  const [showWelcome, setShowWelcome] = useState(true);
  
  // 合併所有卡片
  const allCards = useMemo(() => {
    return [...seedCards, ...userCards];
  }, [seedCards, userCards]);

  // 3秒後隱藏歡迎訊息
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="christmas-mode-overlay">
      {/* 歡迎閃光效果 */}
      {showWelcome && (
        <div className="christmas-welcome">
          <div className="welcome-content">
            <span className="welcome-emoji">🎄</span>
            <h1>Merry Christmas!</h1>
            <p>歡迎來到聖誕秘境</p>
          </div>
        </div>
      )}
      
      {/* 3D 場景 */}
      <Canvas camera={{ position: [12, 8, 12], fov: 60 }}>
        <color attach="background" args={['#0a1628']} />
        <fog attach="fog" args={['#0a1628', 20, 60]} />
        
        {/* 光源 */}
        <ambientLight intensity={0.15} />
        <directionalLight position={[10, 20, 10]} intensity={0.4} />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffaa44" />
        
        {/* 攝影機控制 */}
        <ChristmasCameraController />
        
        {/* 極光效果 */}
        <Aurora />
        
        {/* 雪花 */}
        <Snowfall count={prefersReducedMotion ? 200 : 400} />
        
        {/* 魔法粒子 */}
        {!prefersReducedMotion && <MagicParticles />}
        
        {/* 聖誕樹 */}
        <ChristmasTree position={[0, -3, 0]} />
        
        {/* 壁爐 */}
        <Fireplace position={[-12, -5, -8]} />
        
        {/* 薑餅人 */}
        <GingerbreadCrowd count={6} />
        
        {/* 環繞的卡片 */}
        <OrbitingCards cards={allCards} prefersReducedMotion={prefersReducedMotion} />
        
        {/* 地面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial 
            color="#1a3a5c" 
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
        
        <OrbitControls 
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          minDistance={8}
          maxDistance={30}
          minPolarAngle={Math.PI * 0.2}
          maxPolarAngle={Math.PI * 0.6}
        />
      </Canvas>
      
      {/* 返回按鈕 */}
      <button className="christmas-exit-btn" onClick={onClose}>
        <span>❄️</span>
        <span>返回星空</span>
      </button>
      
      {/* 聖誕裝飾邊框 */}
      <div className="christmas-border top-left">🎄</div>
      <div className="christmas-border top-right">⭐</div>
      <div className="christmas-border bottom-left">🎁</div>
      <div className="christmas-border bottom-right">🔔</div>
    </div>
  );
}
