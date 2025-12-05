import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Text } from '@react-three/drei';

// 匯入自訂 Hooks 和元件
import { useDeviceDetect, triggerHapticFeedback, requestGyroscopePermission } from './hooks/useDeviceDetect';
import { useGyroscope } from './hooks/useGyroscope';
import { useMouseParallax } from './hooks/useMouseParallax';
import CardModal from './components/CardModal';
import ControlHints from './components/ControlHints';
import './App.css';

// 1. 天空配置
const CARD_COUNT = 500; // 增加數量以展示性能
const SPREAD_X = 30;
const SPREAD_Y = 15;
const SPREAD_Z = 20;

// 視差效果強度
const PARALLAX_INTENSITY = 0.5;
const GYRO_INTENSITY = 2;

// 2. 攝影機控制器 - 處理視差和陀螺儀效果
const CameraController = ({ mousePosition, gyroOrientation, isMobile, gyroscopeEnabled, prefersReducedMotion }) => {
  const { camera } = useThree();
  const targetRef = useRef({ x: 0, y: 0 });
  
  useFrame(() => {
    if (prefersReducedMotion) return;
    
    let targetX = 0;
    let targetY = 0;
    
    if (isMobile && gyroscopeEnabled) {
      // 手機：使用陀螺儀
      targetX = gyroOrientation.x * GYRO_INTENSITY;
      targetY = gyroOrientation.y * GYRO_INTENSITY;
    } else if (!isMobile) {
      // 電腦：使用滑鼠視差
      targetX = mousePosition.x * PARALLAX_INTENSITY;
      targetY = mousePosition.y * PARALLAX_INTENSITY;
    }
    
    // 平滑過渡
    targetRef.current.x += (targetX - targetRef.current.x) * 0.05;
    targetRef.current.y += (targetY - targetRef.current.y) * 0.05;
    
    // 只微調攝影機的 lookAt 方向，不改變位置
    camera.rotation.y = -targetRef.current.x * 0.1;
    camera.rotation.x = targetRef.current.y * 0.1;
  });
  
  return null;
};

// 3. 記憶星空 (使用 InstancedMesh 優化 + 互動支援)
const EchoSky = ({ onCardClick, onCardHover, hoveredCard, prefersReducedMotion, isModalOpen }) => {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const { camera, gl } = useThree();

  // 為每個實例生成穩定的屬性，只運行一次。
  const cards = useMemo(() => {
    return new Array(CARD_COUNT).fill().map((_, index) => ({
      index,
      position: [
        (Math.random() - 0.5) * SPREAD_X,
        (Math.random() - 0.5) * SPREAD_Y,
        (Math.random() - 0.5) * SPREAD_Z,
      ],
      color: Math.random() > 0.5 ? '#FFD700' : '#FF69B4',
      colorObj: Math.random() > 0.5 ? new THREE.Color('#FFD700') : new THREE.Color('#FF69B4'),
      delay: Math.random() * 10,
      speed: 0.5 + Math.random() * 0.5,
      rotationSpeed: 0.2 + Math.random() * 0.2,
    }));
  }, []);

  // 組件掛載後，一次性應用實例顏色。
  useEffect(() => {
    const colorArray = new Float32Array(CARD_COUNT * 3);
    cards.forEach((card, i) => card.colorObj.toArray(colorArray, i * 3));
    meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
  }, [cards]);

  // 處理點擊和懸停事件
  const handlePointerEvent = useCallback((event, eventType) => {
    // 模態框開啟時停止懸停偵測
    if (isModalOpen && eventType === 'hover') return;
    
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(meshRef.current);
    
    if (intersects.length > 0) {
      const instanceId = intersects[0].instanceId;
      if (instanceId !== undefined) {
        const card = cards[instanceId];
        if (eventType === 'click') {
          // 模態框開啟時不處理點擊
          if (isModalOpen) return;
          onCardClick?.(card);
          triggerHapticFeedback([30]); // 輕微震動
        } else if (eventType === 'hover') {
          onCardHover?.(instanceId);
        }
      }
    } else if (eventType === 'hover') {
      onCardHover?.(null);
    }
  }, [camera, gl, raycaster, cards, onCardClick, onCardHover, isModalOpen]);

  // 綁定事件
  useEffect(() => {
    const canvas = gl.domElement;
    
    const onClick = (e) => handlePointerEvent(e, 'click');
    const onMove = (e) => handlePointerEvent(e, 'hover');
    const onTouchEnd = (e) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        handlePointerEvent({ clientX: touch.clientX, clientY: touch.clientY }, 'click');
      }
    };
    
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchend', onTouchEnd);
    
    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl, handlePointerEvent]);

  useFrame((state) => {
    const t = prefersReducedMotion ? 0 : state.clock.getElapsedTime();
    
    // 核心優化：單一循環更新所有卡片的矩陣。
    cards.forEach((card, i) => {
      const { position, delay, speed, rotationSpeed } = card;
      const isHovered = hoveredCard === i;
      
      // 懸停時放大 1.05 倍
      const scale = isHovered ? 1.15 : 1;
      
      // 更新虛擬物件的變換
      dummy.position.set(
        position[0],
        position[1] + (prefersReducedMotion ? 0 : Math.sin(t * speed + delay) * 0.5),
        position[2]
      );
      dummy.rotation.z = prefersReducedMotion ? 0 : Math.sin(t * rotationSpeed + delay) * 0.05;
      dummy.scale.set(scale, scale, scale);
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

// 4. 鍵盤控制器
const KeyboardController = ({ prefersReducedMotion }) => {
  const { camera } = useThree();
  const keysPressed = useRef({});
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key] = true;
    };
    
    const handleKeyUp = (e) => {
      keysPressed.current[e.key] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useFrame(() => {
    if (prefersReducedMotion) return;
    
    const speed = 0.05;
    const keys = keysPressed.current;
    
    if (keys['ArrowLeft'] || keys['a']) camera.rotation.y += speed;
    if (keys['ArrowRight'] || keys['d']) camera.rotation.y -= speed;
    if (keys['ArrowUp'] || keys['w']) camera.rotation.x += speed * 0.5;
    if (keys['ArrowDown'] || keys['s']) camera.rotation.x -= speed * 0.5;
  });
  
  return null;
};

// 5. 用於渲染場景的主應用
export default function App() {
  const [selectedCard, setSelectedCard] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false);
  const [gyroscopePermission, setGyroscopePermission] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  
  // 裝置偵測
  const { isMobile, hasGyroscope, prefersReducedMotion } = useDeviceDetect();
  
  // 滑鼠視差（電腦）
  const mousePosition = useMouseParallax(!isMobile);
  
  // 陀螺儀控制（手機）
  const { normalizedOrientation } = useGyroscope(isMobile && gyroscopeEnabled && gyroscopePermission);
  
  // 處理卡片點擊
  const handleCardClick = useCallback((card) => {
    setSelectedCard(card);
  }, []);
  
  // 處理卡片懸停
  const handleCardHover = useCallback((index) => {
    setHoveredCard(index);
  }, []);
  
  // 請求陀螺儀權限
  const handleRequestGyroscope = useCallback(async () => {
    const granted = await requestGyroscopePermission();
    setGyroscopePermission(granted);
    if (granted) {
      setGyroscopeEnabled(true);
    }
  }, []);
  
  // 切換陀螺儀
  const handleToggleGyroscope = useCallback((enabled) => {
    setGyroscopeEnabled(enabled);
  }, []);
  
  // 重置攝影機視角
  const handleResetCamera = useCallback(() => {
    setCameraKey(prev => prev + 1);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050510' }}>
      <Canvas key={cameraKey} camera={{ position: [0, 0, 15], fov: 75 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <fog attach="fog" args={['#050510', 10, 35]} />
        
        {/* 攝影機控制器 */}
        <CameraController 
          mousePosition={mousePosition}
          gyroOrientation={normalizedOrientation}
          isMobile={isMobile}
          gyroscopeEnabled={gyroscopeEnabled && gyroscopePermission}
          prefersReducedMotion={prefersReducedMotion}
        />
        
        {/* 鍵盤控制 */}
        <KeyboardController prefersReducedMotion={prefersReducedMotion} />
        
        {/* 星空 */}
        <EchoSky 
          onCardClick={handleCardClick}
          onCardHover={handleCardHover}
          hoveredCard={hoveredCard}
          prefersReducedMotion={prefersReducedMotion}
          isModalOpen={!!selectedCard}
        />
        
        <Text color="white" anchorX="center" anchorY="bottom" position={[0, -5, 0]} fontSize={0.5}>
          {isMobile ? '點擊卡片查看記憶' : '懸停或點擊卡片探索記憶'}
        </Text>

        <OrbitControls 
          enablePan={false}
          autoRotate={!prefersReducedMotion}
          autoRotateSpeed={0.1}
          enableDamping={true}
          dampingFactor={0.05}
          // 限制縮放範圍，避免太近或太遠
          minDistance={5}
          maxDistance={25}
          // 限制垂直旋轉角度，避免翻轉到奇怪的角度
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.75}
          // 讓控制更平滑
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />
      </Canvas>
      
      {/* 控制提示 UI */}
      <ControlHints 
        isMobile={isMobile}
        gyroscopeEnabled={gyroscopeEnabled}
        onToggleGyroscope={handleToggleGyroscope}
        onRequestGyroscope={handleRequestGyroscope}
        onResetCamera={handleResetCamera}
      />
      
      {/* 卡片詳情模態框 */}
      {selectedCard && (
        <CardModal 
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}