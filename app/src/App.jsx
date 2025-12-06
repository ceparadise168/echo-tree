import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Text } from '@react-three/drei';

// 匯入自訂 Hooks 和元件
import { useDeviceDetect, triggerHapticFeedback, requestGyroscopePermission } from './hooks/useDeviceDetect';
import { useGyroscope } from './hooks/useGyroscope';
import { useMouseParallax } from './hooks/useMouseParallax';
import { useKonamiCode } from './hooks/useKonamiCode';
import CardModal from './components/CardModal';
import CardForm from './components/CardForm';
import ControlHints from './components/ControlHints';
import PresentationMode from './components/PresentationMode';
import { ChristmasScene } from './components/ChristmasMode';
import { ShootingStars } from './components/ShootingStars';
import { AutoPilotController } from './components/AutoPilotController';
import './App.css';
import './components/AutoPilotCardDisplay.css';

// 1. 天空配置
const SEED_CARD_COUNT = 50; // 種子卡片，讓畫面不會空蕩蕩
const SPREAD_X = 30;
const SPREAD_Y = 15;
const SPREAD_Z = 20;

// 視差效果強度
const PARALLAX_INTENSITY = 0.5;
const GYRO_INTENSITY = 2;

// 2. 攝影機控制器 - 處理視差和陀螺儀效果
const CameraController = ({ mousePosition, gyroOrientation, isMobile, gyroscopeEnabled, prefersReducedMotion, onBoundaryDetected }) => {
  const { camera, raycaster, scene, controls } = useThree();
  const targetRef = useRef({ x: 0, y: 0 });
  const boundaryTimerRef = useRef(null);
  const lastCheckTimeRef = useRef(0);
  const resetProgressRef = useRef(0);
  const isResettingRef = useRef(false);
  
  useFrame((state, delta) => {
    if (prefersReducedMotion) return;
    
    // 處理平滑重置動畫
    if (isResettingRef.current) {
      resetProgressRef.current += delta * 0.8; // 控制重置速度
      
      if (resetProgressRef.current >= 1) {
        resetProgressRef.current = 0;
        isResettingRef.current = false;
        // 重置完成後確保 OrbitControls 同步
        if (controls) {
          controls.target.set(0, 0, 0);
          controls.update();
        }
      } else {
        // 使用 easeInOutCubic 曲線：慢-快-慢
        const t = resetProgressRef.current;
        const eased = t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        // 平滑插值回到初始位置
        camera.position.lerp(new THREE.Vector3(0, 0, 15), eased * 0.15);
        camera.rotation.x *= (1 - eased * 0.15);
        camera.rotation.y *= (1 - eased * 0.15);
        camera.rotation.z *= (1 - eased * 0.15);
        
        if (controls) {
          controls.target.lerp(new THREE.Vector3(0, 0, 0), eased * 0.15);
          controls.update();
        }
        return; // 重置期間不處理其他邏輯
      }
    }
    
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

    // 每 0.5 秒檢查一次視野內是否幾乎沒有卡片
    const now = state.clock.elapsedTime;
    if (now - lastCheckTimeRef.current > 0.5) {
      lastCheckTimeRef.current = now;
      
      // 使用 raycaster 檢查視野中心附近是否有物體
      const directions = [
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0.3, 0, -1).normalize(),
        new THREE.Vector3(-0.3, 0, -1).normalize(),
        new THREE.Vector3(0, 0.3, -1).normalize(),
        new THREE.Vector3(0, -0.3, -1).normalize(),
      ];
      
      let hasNearbyCards = false;
      for (const dir of directions) {
        const worldDir = dir.clone().applyQuaternion(camera.quaternion);
        raycaster.set(camera.position, worldDir);
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0 && intersects[0].distance < 20) {
          hasNearbyCards = true;
          break;
        }
      }
      
      if (!hasNearbyCards) {
        // 沒有附近卡片，啟動計時器
        if (!boundaryTimerRef.current) {
          boundaryTimerRef.current = setTimeout(() => {
            isResettingRef.current = true;
            resetProgressRef.current = 0;
            boundaryTimerRef.current = null;
          }, 2500); // 2.5 秒後開始重置動畫
        }
      } else {
        // 有卡片，清除計時器
        if (boundaryTimerRef.current) {
          clearTimeout(boundaryTimerRef.current);
          boundaryTimerRef.current = null;
        }
      }
    }
  });
  
  // 組件卸載時清理計時器
  useEffect(() => {
    return () => {
      if (boundaryTimerRef.current) {
        clearTimeout(boundaryTimerRef.current);
      }
    };
  }, []);
  
  return null;
};

// 記憶內容列表
const MEMORIES = [
  "第一次團隊聚餐，大家笑得很開心 🎉",
  "深夜趕專案，但一起奮鬥的感覺真好 💪",
  "新成員加入，團隊又壯大了！🌟",
  "產品上線那天，我們都哭了 😭",
  "年末尾牙，贏了大獎！🏆",
  "一起經歷的困難，讓我們更團結 ❤️",
  "那個 bug 修了三天，終於解決了！🐛",
  "客戶的感謝信，是最好的鼓勵 📧",
];

// 3. 記憶星空 (使用 InstancedMesh 優化 + 互動支援)
const EchoSky = ({ onCardClick, onCardHover, hoveredCard, prefersReducedMotion, isModalOpen, userCards, seedCards }) => {
  const meshRef = useRef();
  const userMeshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const { camera, gl } = useThree();

  // 組件掛載後，一次性應用實例顏色。
  useEffect(() => {
    if (seedCards && seedCards.length > 0) {
      const colorArray = new Float32Array(seedCards.length * 3);
      seedCards.forEach((card, i) => card.colorObj.toArray(colorArray, i * 3));
      meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
    }
  }, [seedCards]);

  // 為使用者卡片應用顏色
  useEffect(() => {
    if (userMeshRef.current && userCards.length > 0) {
      const colorArray = new Float32Array(userCards.length * 3);
      userCards.forEach((card, i) => {
        const color = new THREE.Color(card.color);
        color.toArray(colorArray, i * 3);
      });
      userMeshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
    }
  }, [userCards]);

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
    
    // 檢查預設卡片
    const intersects = raycaster.intersectObject(meshRef.current);
    
    // 檢查使用者卡片
    const userIntersects = userMeshRef.current ? raycaster.intersectObject(userMeshRef.current) : [];
    
    // 合併結果，優先選擇最近的
    let closestHit = null;
    let isUserCard = false;
    
    if (intersects.length > 0 && userIntersects.length > 0) {
      if (intersects[0].distance < userIntersects[0].distance) {
        closestHit = intersects[0];
        isUserCard = false;
      } else {
        closestHit = userIntersects[0];
        isUserCard = true;
      }
    } else if (intersects.length > 0) {
      closestHit = intersects[0];
      isUserCard = false;
    } else if (userIntersects.length > 0) {
      closestHit = userIntersects[0];
      isUserCard = true;
    }
    
    if (closestHit) {
      const instanceId = closestHit.instanceId;
      if (instanceId !== undefined) {
        const card = isUserCard ? userCards[instanceId] : seedCards[instanceId];
        if (eventType === 'click') {
          // 模態框開啟時不處理點擊
          if (isModalOpen) return;
          onCardClick?.(card);
          triggerHapticFeedback([30]); // 輕微震動
        } else if (eventType === 'hover') {
          // 使用獨特的 ID 來區分預設和使用者卡片
          const hoverIndex = isUserCard ? `user-${instanceId}` : instanceId;
          onCardHover?.(hoverIndex);
        }
      }
    } else if (eventType === 'hover') {
      onCardHover?.(null);
    }
  }, [camera, gl, raycaster, seedCards, userCards, onCardClick, onCardHover, isModalOpen]);

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
    if (seedCards) {
      seedCards.forEach((card, i) => {
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
    }
    
    // 更新使用者卡片
    if (userMeshRef.current && userCards.length > 0) {
      userCards.forEach((card, i) => {
        const isHovered = hoveredCard === `user-${i}`;
        const scale = isHovered ? 1.25 : 1.1; // 使用者卡片稍大一點
        
        dummy.position.set(
          card.position[0],
          card.position[1] + (prefersReducedMotion ? 0 : Math.sin(t * 0.8 + i) * 0.6),
          card.position[2]
        );
        dummy.rotation.z = prefersReducedMotion ? 0 : Math.sin(t * 0.3 + i) * 0.08;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        
        userMeshRef.current.setMatrixAt(i, dummy.matrix);
      });
      userMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      {/* 種子卡片（較淡、較小） */}
      <instancedMesh ref={meshRef} args={[null, null, SEED_CARD_COUNT]}>
        <planeGeometry args={[1.0, 0.7]} />
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.4}
          emissiveIntensity={0.3}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      
      {/* 使用者新增的卡片（更亮、更大） */}
      {userCards.length > 0 && (
        <instancedMesh ref={userMeshRef} args={[null, null, userCards.length]} key={userCards.length}>
          <planeGeometry args={[1.8, 1.2]} />
          <meshStandardMaterial
            vertexColors
            emissiveIntensity={1.2}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}
    </>
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
  const [autoPilotFocusedCard, setAutoPilotFocusedCard] = useState(null);
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false);
  const [gyroscopePermission, setGyroscopePermission] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showPresentationMode, setShowPresentationMode] = useState(false);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [meteorTrigger, setMeteorTrigger] = useState(0);
  const [userCards, setUserCards] = useState(() => {
    // 從 localStorage 讀取已儲存的卡片
    try {
      const saved = localStorage.getItem('echoTree_userCards');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 重建 THREE.Color 物件
        return parsed.map(card => ({
          ...card,
          colorObj: new THREE.Color(card.color),
        }));
      }
    } catch (e) {
      console.error('Failed to load cards from localStorage:', e);
    }
    return [];
  });
  
  // 儲存卡片到 localStorage
  useEffect(() => {
    if (userCards.length > 0) {
      try {
        // 移除 colorObj（THREE.Color 無法 JSON 序列化）
        const toSave = userCards.map(({ colorObj, ...rest }) => rest);
        localStorage.setItem('echoTree_userCards', JSON.stringify(toSave));
      } catch (e) {
        console.error('Failed to save cards to localStorage:', e);
      }
    }
  }, [userCards]);
  
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

  // 聖誕彩蛋模式
  const handleChristmasActivate = useCallback(() => {
    triggerHapticFeedback([100, 50, 100, 50, 100]); // 特殊震動
  }, []);
  
  const { isActivated: isChristmasMode, reset: resetChristmasMode, secretAreaProps } = useKonamiCode(handleChristmasActivate);
  
  // 產生種子卡片資料（供聖誕模式使用 + EchoSky）
  const seedCardsData = useMemo(() => {
    return new Array(SEED_CARD_COUNT).fill().map((_, index) => {
      const randomDaysAgo = Math.floor(Math.random() * 365);
      const cardDate = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000);
      const seedColors = ['#6B7280', '#9CA3AF', '#7C9CBF', '#8B9DC3', '#A0AEC0'];
      const colorHex = seedColors[index % seedColors.length];
      
      return {
        index,
        position: [
          (Math.random() - 0.5) * SPREAD_X,
          (Math.random() - 0.5) * SPREAD_Y,
          (Math.random() - 0.5) * SPREAD_Z,
        ],
        color: colorHex,
        colorObj: new THREE.Color(colorHex),
        delay: Math.random() * 10,
        speed: 0.3 + Math.random() * 0.3, // 種子卡片慢一點
        rotationSpeed: 0.1 + Math.random() * 0.1,
        memory: MEMORIES[index % MEMORIES.length],
        date: cardDate.toLocaleDateString('zh-TW'),
        isSeed: true,
      };
    });
  }, []);

  // 自動導航模式的卡片對焦
  const handleAutoPilotFocus = useCallback((cardId) => {
    if (!cardId) {
      setAutoPilotFocusedCard(null);
      return;
    }
    // 找到對應的卡片資料
    let card = null;
    if (typeof cardId === 'string' && cardId.startsWith('user-')) {
      const idx = parseInt(cardId.replace('user-', ''));
      card = userCards[idx];
    } else {
      card = seedCardsData[cardId];
    }
    setAutoPilotFocusedCard(card);
  }, [userCards, seedCardsData]);
  
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
  
  // 切換展示模式
  const handleTogglePresentationMode = useCallback(() => {
    setShowPresentationMode(prev => !prev);
  }, []);

  // 切換自動導航模式
  const handleToggleAutoPilot = useCallback(() => {
    setIsAutoPilot(prev => !prev);
    // 如果開啟自動導航，重置視角以確保乾淨的開始
    if (!isAutoPilot) {
      setCameraKey(prev => prev + 1);
    }
  }, [isAutoPilot]);
  
  // 處理新卡片提交
  const handleCardSubmit = useCallback((newCard) => {
    // 為新卡片產生位置和索引
    const cardWithPosition = {
      ...newCard,
      index: userCards.length + SEED_CARD_COUNT,
      position: [
        (Math.random() - 0.5) * SPREAD_X * 0.8,
        (Math.random() - 0.5) * SPREAD_Y * 0.8,
        (Math.random() - 0.5) * SPREAD_Z * 0.5 - 2, // 放在前面一點
      ],
      colorObj: new THREE.Color(newCard.color),
    };
    setUserCards(prev => [...prev, cardWithPosition]);
    setMeteorTrigger(prev => prev + 1); // 觸發流星效果
    triggerHapticFeedback([50, 30, 50]); // 成功震動
  }, [userCards.length]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050510' }}>
      <Canvas key={cameraKey} camera={{ position: [0, 0, 15], fov: 75 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <fog attach="fog" args={['#050510', 10, 35]} />
        
        {/* 攝影機控制器 (自動導航模式下停用) */}
        {!isAutoPilot && (
          <CameraController 
            mousePosition={mousePosition}
            gyroOrientation={normalizedOrientation}
            isMobile={isMobile}
            gyroscopeEnabled={gyroscopeEnabled && gyroscopePermission}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}

        {/* 自動導航控制器 */}
        <AutoPilotController 
          enabled={isAutoPilot}
          allCards={[...seedCardsData, ...userCards]}
          onHover={handleCardHover}
          onFocus={handleAutoPilotFocus}
        />
        
        {/* 鍵盤控制 */}
        <KeyboardController prefersReducedMotion={prefersReducedMotion} />
        
        {/* 流星效果 */}
        <ShootingStars trigger={meteorTrigger} />

        {/* 星空 */}
        <EchoSky 
          onCardClick={handleCardClick}
          onCardHover={handleCardHover}
          hoveredCard={hoveredCard}
          prefersReducedMotion={prefersReducedMotion}
          isModalOpen={!!selectedCard || showCardForm}
          userCards={userCards}
          seedCards={seedCardsData}
        />
        
        <Text color="white" anchorX="center" anchorY="bottom" position={[0, -5, 0]} fontSize={0.5}>
          {isMobile ? '點擊卡片查看記憶' : '懸停或點擊卡片探索記憶'}
        </Text>

        <OrbitControls 
          enabled={!isAutoPilot}
          enablePan={false}
          autoRotate={!prefersReducedMotion && !isAutoPilot}
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
      
      {/* 新增卡片按鈕 */}
      <button 
        className="add-card-btn"
        onClick={() => setShowCardForm(true)}
        aria-label="新增記憶"
        title="新增記憶"
      >
        ✨
      </button>
      
      {/* 控制提示 UI */}
      <ControlHints 
        isMobile={isMobile}
        gyroscopeEnabled={gyroscopeEnabled}
        onToggleGyroscope={handleToggleGyroscope}
        onRequestGyroscope={handleRequestGyroscope}
        onResetCamera={handleResetCamera}
        onTogglePresentationMode={handleTogglePresentationMode}
        isAutoPilot={isAutoPilot}
        onToggleAutoPilot={handleToggleAutoPilot}
      />
      
      {/* 卡片填寫表單 */}
      {showCardForm && (
        <CardForm 
          onSubmit={handleCardSubmit}
          onClose={() => setShowCardForm(false)}
        />
      )}
      
      {/* 卡片詳情模態框 */}
      {selectedCard && (
        <CardModal 
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
      
      {/* 大螢幕展示模式 */}
      {showPresentationMode && (
        <PresentationMode 
          userCards={userCards}
          seedCardCount={SEED_CARD_COUNT}
          onClose={() => setShowPresentationMode(false)}
        />
      )}
      
      {/* 隱藏彩蛋觸發區域（左下角） */}
      <div 
        className="secret-area"
        {...secretAreaProps}
        aria-hidden="true"
      />
      
      {/* 自動導航卡片顯示 */}
      {isAutoPilot && autoPilotFocusedCard && (
        <div className="autopilot-card-display">
          <div className="autopilot-card-content">
            {autoPilotFocusedCard.recipient && (
              <div className="autopilot-recipient">💝 給 {autoPilotFocusedCard.recipient}</div>
            )}
            <div className="autopilot-memory">{autoPilotFocusedCard.memory}</div>
            <div className="autopilot-meta">
              <span>📅 {autoPilotFocusedCard.date}</span>
              {autoPilotFocusedCard.isSeed ? (
                <span className="seed-badge">✨ 範例記憶</span>
              ) : autoPilotFocusedCard.authorName ? (
                <span>💫 {autoPilotFocusedCard.authorName}</span>
              ) : (
                <span>🌙 匿名記憶</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 聖誕彩蛋模式 */}
      {isChristmasMode && (
        <ChristmasScene 
          userCards={userCards}
          seedCards={seedCardsData}
          prefersReducedMotion={prefersReducedMotion}
          onClose={resetChristmasMode}
        />
      )}
    </div>
  );
}