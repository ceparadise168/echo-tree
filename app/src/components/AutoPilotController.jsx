import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

// 狀態常數
const STATE = {
  WANDERING: 'wandering',   // 漫遊中
  APPROACHING: 'approaching', // 接近卡片中
  OBSERVING: 'observing',   // 觀察卡片中
};

export function AutoPilotController({ enabled, allCards, onHover, onSelect }) {
  const { camera } = useThree();
  
  // 內部狀態
  const state = useRef({
    mode: STATE.WANDERING,
    targetPos: new THREE.Vector3(),
    lookAtTarget: new THREE.Vector3(),
    currentCard: null,
    timer: 0,
    speed: 2,
    noiseOffset: Math.random() * 1000,
  });

  // 初始化隨機漫遊目標
  const pickWanderTarget = () => {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 30
    );
  };

  // 初始化
  useEffect(() => {
    if (enabled) {
      state.current.targetPos.copy(pickWanderTarget());
      state.current.mode = STATE.WANDERING;
      state.current.timer = 0;
    }
  }, [enabled]);

  useFrame((threeState, delta) => {
    if (!enabled) return;

    const s = state.current;
    const time = threeState.clock.getElapsedTime();
    
    // 平滑係數
    const smoothTime = 2.0;
    const lookAtSmoothTime = 3.0;

    // 狀態機邏輯
    switch (s.mode) {
      case STATE.WANDERING:
        // 漫遊邏輯
        s.timer += delta;
        
        // 隨機變速：時快時慢
        // 使用 sin 波加上一些隨機性來調整速度
        const speedVar = Math.sin(time * 0.5) * 0.5 + 0.5; // 0 to 1
        s.speed = THREE.MathUtils.lerp(s.speed, 1 + speedVar * 3, delta);

        // 檢查是否到達目標或超時，切換目標
        const distToTarget = camera.position.distanceTo(s.targetPos);
        if (distToTarget < 5 || s.timer > 10) {
          // 有機率切換到觀察模式
          if (allCards.length > 0 && Math.random() > 0.4) {
            // 隨機選一張卡片
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            s.currentCard = randomCard;
            s.mode = STATE.APPROACHING;
            
            // 設定觀察位置：卡片前方 3-5 單位
            const cardPos = new THREE.Vector3(...randomCard.position);
            
            // 確保從卡片正面觀察 (Z 軸正向)
            // 假設卡片面向 +Z，我們希望相機在卡片的 +Z 方向
            const angle = (Math.random() - 0.5) * Math.PI * 0.5; // -45 到 +45 度，避免看到側面
            const distance = 4 + Math.random() * 2;
            
            const offset = new THREE.Vector3(
              Math.sin(angle) * distance,
              (Math.random() - 0.5) * 2, // 稍微上下
              Math.abs(Math.cos(angle)) * distance + 2 // 確保在前方，並保持距離
            );
            
            s.targetPos.copy(cardPos).add(offset);
            s.lookAtTarget.copy(cardPos);
            
            s.timer = 0;
          } else {
            // 繼續漫遊
            s.targetPos.copy(pickWanderTarget());
            // 漫遊時看著移動方向的前方，但稍微平滑一點
            const direction = s.targetPos.clone().sub(camera.position).normalize();
            s.lookAtTarget.copy(s.targetPos).add(direction.multiplyScalar(5));
            s.timer = 0;
          }
        }
        break;

      case STATE.APPROACHING:
        // 接近邏輯
        const distToCard = camera.position.distanceTo(s.targetPos);
        // 使用更平滑的減速曲線
        s.speed = THREE.MathUtils.lerp(s.speed, 1.5, delta * 2); 

        if (distToCard < 0.5) {
          s.mode = STATE.OBSERVING;
          s.timer = 0;
          // 觸發懸停效果
          if (onHover && s.currentCard) {
            // 判斷是種子卡片還是使用者卡片來傳遞正確的 ID
            const id = s.currentCard.isSeed ? s.currentCard.index : `user-${s.currentCard.index}`;
            onHover(id);
          }
        }
        break;

      case STATE.OBSERVING:
        // 觀察邏輯
        s.timer += delta;
        s.speed = 0.1; // 極慢漂浮
        
        // 微微漂浮 (呼吸感)
        const floatOffset = Math.sin(time * 0.8) * 0.002;
        s.targetPos.y += floatOffset;
        s.targetPos.x += Math.cos(time * 0.5) * 0.002;
        
        // 觀察 4-7 秒後離開
        if (s.timer > 4 + Math.random() * 3) {
          s.mode = STATE.WANDERING;
          s.targetPos.copy(pickWanderTarget());
          // 離開時先看著下一個目標
          s.lookAtTarget.copy(s.targetPos);
          s.currentCard = null;
          s.timer = 0;
          if (onHover) onHover(null); // 取消懸停
        }
        break;
    }

    // 執行移動
    // 使用更平滑的阻尼移動 (Damping)
    const moveStep = s.speed * delta;
    camera.position.lerp(s.targetPos, moveStep * 0.8); // 增加 lerp 係數讓反應快一點但保持平滑

    // 執行旋轉 (LookAt)
    // 為了平滑旋轉，我們使用一個虛擬的目標點進行插值
    const currentLookAt = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
    currentLookAt.lerp(s.lookAtTarget, delta * lookAtSmoothTime);
    camera.lookAt(currentLookAt);

    // 添加一點無人機般的晃動 (Noise) 和傾斜 (Banking)
    camera.position.y += Math.sin(time * 1.5 + s.noiseOffset) * 0.003;
    
    // 計算水平轉向速度來決定傾斜角度 (Banking)
    // 簡單模擬：根據 lookAt 的水平變化
    const targetRotationY = Math.atan2(
      s.lookAtTarget.x - camera.position.x,
      s.lookAtTarget.z - camera.position.z
    );
    // 這裡簡化處理，直接給一點隨機傾斜更有漂浮感
    const bankAngle = Math.sin(time * 0.5) * 0.05;
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, bankAngle, delta);
  });

  return null;
}
