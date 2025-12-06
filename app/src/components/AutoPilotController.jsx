import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * 電影感導航狀態機 - 進階版
 * 
 * 運鏡技巧：
 * - Dolly Zoom: 對焦時 FOV 收縮，產生眩暈感
 * - Crane Shot: 接近時垂直弧線運動
 * - Orbit: 停留時微微環繞目標
 * - Speed Ramping: 動態變速
 * - Pull Back Reveal: 離開時側向拉遠
 * 
 * 流程：
 * 1. CRUISING    - 巡航漂浮
 * 2. APPROACHING - 弧形接近（Crane + Speed Ramp）
 * 3. FOCUSING    - 對焦收縮（Dolly Zoom）
 * 4. LOCKED      - 鎖定靜止
 * 5. DWELLING    - 環繞停留（Orbit）
 * 6. UNLOCKING   - 側向拉遠（Pull Back Reveal）
 */

const STATE = {
  CRUISING: 'cruising',
  APPROACHING: 'approaching',
  FOCUSING: 'focusing',
  LOCKED: 'locked',
  DWELLING: 'dwelling',
  UNLOCKING: 'unlocking',
};

// 時間配置（秒）
const TIMING = {
  CRUISE_SCAN: 0.6,
  APPROACH_DURATION: 2.2,     // 稍長，讓變速更明顯
  FOCUS_DURATION: 0.8,        // 稍長，Dolly Zoom 更明顯
  LOCK_DURATION: 0.25,
  DWELL_DURATION: 3.5,
  UNLOCK_DURATION: 0.8,       // 稍長，reveal 更戲劇化
};

// 距離配置
const DISTANCE = {
  APPROACH_END: 3.5,
  FOCUS_END: 2.2,
  UNLOCK_END: 5.0,            // 拉更遠
};

// FOV 配置（Dolly Zoom）
const FOV = {
  DEFAULT: 75,
  FOCUSED: 65,                // 對焦時收窄
  WIDE: 80,                   // 離開時稍廣
};

export function AutoPilotController({ enabled, allCards, onHover, onFocus }) {
  const { camera } = useThree();
  
  const state = useRef({
    mode: STATE.CRUISING,
    // 位置
    startPos: new THREE.Vector3(),
    ctrlPos1: new THREE.Vector3(),     // 第一控制點
    ctrlPos2: new THREE.Vector3(),     // 第二控制點（三次貝茲）
    targetPos: new THREE.Vector3(),
    lookAtTarget: new THREE.Vector3(),
    focusStartPos: new THREE.Vector3(),
    unlockStartPos: new THREE.Vector3(),
    // 環繞相關
    orbitCenter: new THREE.Vector3(),
    orbitRadius: 0,
    orbitStartAngle: 0,
    // 時間
    progress: 0,
    duration: 1.0,
    // 卡片
    currentCard: null,
    visited: new Set(),
    lastCardId: null,
    // FOV
    baseFov: FOV.DEFAULT,
    targetFov: FOV.DEFAULT,
    // 離開方向
    unlockDirection: 1,        // 1 或 -1，左右交替
  });

  // === 緩動函數 ===
  // Speed Ramp: 慢-快-慢，中間加速
  const easeSpeedRamp = (t) => {
    // 前 30% 慢，中間 40% 快，後 30% 慢
    if (t < 0.3) {
      return 0.15 * Math.pow(t / 0.3, 2); // 0 -> 0.15
    } else if (t < 0.7) {
      const mid = (t - 0.3) / 0.4;
      return 0.15 + 0.7 * mid; // 0.15 -> 0.85
    } else {
      const end = (t - 0.7) / 0.3;
      return 0.85 + 0.15 * (1 - Math.pow(1 - end, 2)); // 0.85 -> 1
    }
  };
  
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // === 三次貝茲曲線（更平滑的 S 形路徑）===
  const makeCubicBezierPoint = (t, p0, p1, p2, p3) => {
    const a = 1 - t;
    return p0.clone().multiplyScalar(a * a * a)
      .add(p1.clone().multiplyScalar(3 * a * a * t))
      .add(p2.clone().multiplyScalar(3 * a * t * t))
      .add(p3.clone().multiplyScalar(t * t * t));
  };

  // === 卡片選擇 ===
  const pickCardWeighted = () => {
    if (!allCards || allCards.length === 0) return null;
    const camPos = camera.position;
    let best = null;
    let bestScore = -Infinity;
    const visited = state.current.visited;
    
    allCards.forEach((card) => {
      const id = card.isSeed ? card.index : `user-${card.index}`;
      const pos = new THREE.Vector3(...card.position);
      const dist = camPos.distanceTo(pos);
      
      const nearScore = -dist * 0.4;
      const freshBonus = visited.has(id) ? -12 : 15;
      const repeatPenalty = state.current.lastCardId === id ? -25 : 0;
      const farJumpBonus = Math.random() > 0.88 ? dist * 0.25 : 0;
      const randomSpice = (Math.random() - 0.5) * 5;
      
      const score = nearScore + freshBonus + repeatPenalty + farJumpBonus + randomSpice;
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    });
    return best;
  };

  // === 計算觀察位置 ===
  const computeViewingPosition = (card, distance, angleOffset = 0) => {
    const cardPos = new THREE.Vector3(...card.position);
    const baseAngle = (Math.random() - 0.5) * Math.PI * 0.3 + angleOffset;
    const offset = new THREE.Vector3(
      Math.sin(baseAngle) * distance * 0.4,
      (Math.random() - 0.5) * 0.6,
      Math.cos(baseAngle) * distance
    );
    return { pos: cardPos.clone().add(offset), lookAt: cardPos };
  };

  // === 開始接近（Crane Shot 路徑）===
  const startApproaching = (fromPos) => {
    const picked = pickCardWeighted();
    if (!picked) return false;

    const { pos: approachEnd, lookAt } = computeViewingPosition(picked, DISTANCE.APPROACH_END);
    const s = state.current;
    
    // 三次貝茲曲線：Crane Shot 效果
    // 控制點1：先向上抬升 + 側移
    const ctrl1 = fromPos.clone();
    ctrl1.y += 3 + Math.random() * 2;           // Crane 上升
    ctrl1.x += (Math.random() - 0.5) * 4;
    ctrl1.z += (approachEnd.z - fromPos.z) * 0.3;
    
    // 控制點2：下降趨近目標 + 另一側偏移
    const ctrl2 = approachEnd.clone();
    ctrl2.y += 1.5 + Math.random();             // 還在上方
    ctrl2.x += (Math.random() - 0.5) * 2;
    ctrl2.z += (fromPos.z - approachEnd.z) * 0.2;

    s.startPos.copy(fromPos);
    s.ctrlPos1.copy(ctrl1);
    s.ctrlPos2.copy(ctrl2);
    s.targetPos.copy(approachEnd);
    s.lookAtTarget.copy(lookAt);
    s.currentCard = picked;
    s.duration = TIMING.APPROACH_DURATION + (Math.random() - 0.5) * 0.3;
    s.progress = 0;
    s.mode = STATE.APPROACHING;
    s.targetFov = FOV.DEFAULT;

    const id = picked.isSeed ? picked.index : `user-${picked.index}`;
    if (onHover) onHover(id);

    return true;
  };

  // === 初始化 ===
  useEffect(() => {
    if (enabled) {
      const s = state.current;
      s.mode = STATE.CRUISING;
      s.progress = 0;
      s.baseFov = FOV.DEFAULT;
      s.targetFov = FOV.DEFAULT;
      camera.fov = FOV.DEFAULT;
      camera.updateProjectionMatrix();
      
      setTimeout(() => {
        if (enabled) {
          startApproaching(camera.position.clone());
        }
      }, 400);
    } else {
      if (onFocus) onFocus(null);
      if (onHover) onHover(null);
      // 重置 FOV
      camera.fov = FOV.DEFAULT;
      camera.updateProjectionMatrix();
    }
  }, [enabled]);

  // === 主動畫循環 ===
  useFrame((threeState, delta) => {
    if (!enabled) return;

    const s = state.current;
    const time = threeState.clock.getElapsedTime();
    
    // 平滑更新 FOV（Dolly Zoom 效果）
    if (Math.abs(camera.fov - s.targetFov) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, s.targetFov, delta * 3);
      camera.updateProjectionMatrix();
    }
    
    switch (s.mode) {
      // === 巡航 ===
      case STATE.CRUISING: {
        s.progress += delta / TIMING.CRUISE_SCAN;
        
        const drift = new THREE.Vector3(
          Math.sin(time * 0.25) * 0.025,
          Math.cos(time * 0.18) * 0.02,
          Math.sin(time * 0.22) * 0.015
        );
        camera.position.add(drift);
        
        // 輕微的視角漂移
        camera.rotation.y += Math.sin(time * 0.1) * 0.0003;
        
        if (s.progress >= 1) {
          if (!startApproaching(camera.position.clone())) {
            s.progress = 0;
          }
        }
        break;
      }

      // === 接近（Crane + Speed Ramp）===
      case STATE.APPROACHING: {
        s.progress += delta / s.duration;
        
        // Speed Ramp 緩動
        const t = Math.min(1, easeSpeedRamp(s.progress));
        
        // 三次貝茲曲線路徑
        const curvePos = makeCubicBezierPoint(t, s.startPos, s.ctrlPos1, s.ctrlPos2, s.targetPos);
        camera.position.lerp(curvePos, 0.9);
        
        // 平滑轉向，前期慢、後期快
        const lookSpeed = 2 + t * 4;
        const currentLookAt = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);
        currentLookAt.lerp(s.lookAtTarget, delta * lookSpeed);
        camera.lookAt(currentLookAt);
        
        // 飛行傾斜（Banking）- 根據移動方向
        const velocity = s.progress > 0.05 ? 
          curvePos.clone().sub(camera.position).normalize() : 
          new THREE.Vector3(0, 0, -1);
        const bankAngle = velocity.x * 0.08 * Math.sin(s.progress * Math.PI);
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, bankAngle, delta * 3);

        if (s.progress >= 1) {
          s.mode = STATE.FOCUSING;
          s.progress = 0;
          s.focusStartPos.copy(camera.position);
          s.duration = TIMING.FOCUS_DURATION;
          // 開始 Dolly Zoom
          s.targetFov = FOV.FOCUSED;
        }
        break;
      }

      // === 對焦（Dolly Zoom）===
      case STATE.FOCUSING: {
        s.progress += delta / s.duration;
        const t = Math.min(1, easeInOutCubic(s.progress));
        
        const focusEndPos = computeViewingPosition(s.currentCard, DISTANCE.FOCUS_END).pos;
        const focusPos = s.focusStartPos.clone().lerp(focusEndPos, t);
        camera.position.lerp(focusPos, 0.12);
        
        // 精確對準
        const currentLookAt = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);
        currentLookAt.lerp(s.lookAtTarget, delta * 10);
        camera.lookAt(currentLookAt);
        
        // 穩定
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, delta * 8);

        if (s.progress >= 1) {
          s.mode = STATE.LOCKED;
          s.progress = 0;
          s.duration = TIMING.LOCK_DURATION;
        }
        break;
      }

      // === 鎖定 ===
      case STATE.LOCKED: {
        s.progress += delta / s.duration;
        
        // 極微呼吸
        const microBreath = Math.sin(time * 2.5) * 0.001;
        camera.position.y += microBreath;
        
        camera.lookAt(s.lookAtTarget);
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, delta * 12);
        
        if (s.progress >= 1) {
          if (s.currentCard) {
            const id = s.currentCard.isSeed ? s.currentCard.index : `user-${s.currentCard.index}`;
            state.current.visited.add(id);
            state.current.lastCardId = id;
            if (onFocus) onFocus(id);
          }
          
          // 設置環繞參數
          const cardPos = new THREE.Vector3(...s.currentCard.position);
          s.orbitCenter.copy(cardPos);
          s.orbitRadius = camera.position.distanceTo(cardPos);
          s.orbitStartAngle = Math.atan2(
            camera.position.x - cardPos.x,
            camera.position.z - cardPos.z
          );
          
          s.mode = STATE.DWELLING;
          s.progress = 0;
          s.duration = TIMING.DWELL_DURATION + (Math.random() - 0.5) * 0.8;
        }
        break;
      }

      // === 停留（Orbit 微環繞）===
      case STATE.DWELLING: {
        s.progress += delta / s.duration;
        
        // 環繞角度（緩慢旋轉 15-25 度）
        const orbitAngle = s.orbitStartAngle + s.progress * (0.25 + Math.random() * 0.15);
        
        // 計算環繞位置
        const orbitX = s.orbitCenter.x + Math.sin(orbitAngle) * s.orbitRadius;
        const orbitZ = s.orbitCenter.z + Math.cos(orbitAngle) * s.orbitRadius;
        
        // 加入呼吸感
        const breathY = Math.sin(time * 0.6) * 0.012;
        const breathRadius = Math.sin(time * 0.4) * 0.03;
        
        const orbitPos = new THREE.Vector3(
          orbitX + breathRadius,
          camera.position.y + breathY * delta * 2,
          orbitZ
        );
        camera.position.lerp(orbitPos, 0.03);
        
        // 持續注視中心
        camera.lookAt(s.orbitCenter);
        
        // 輕微傾斜
        camera.rotation.z = THREE.MathUtils.lerp(
          camera.rotation.z, 
          Math.sin(time * 0.25) * 0.008, 
          delta * 0.5
        );

        if (s.progress >= 1) {
          s.mode = STATE.UNLOCKING;
          s.progress = 0;
          s.unlockStartPos.copy(camera.position);
          s.duration = TIMING.UNLOCK_DURATION;
          // 交替左右離開方向
          s.unlockDirection *= -1;
          // 開始拉寬 FOV
          s.targetFov = FOV.WIDE;
        }
        break;
      }

      // === 解鎖（Pull Back Reveal - 側向拉遠）===
      case STATE.UNLOCKING: {
        s.progress += delta / s.duration;
        const t = Math.min(1, easeInOutQuad(s.progress));
        
        // 側向 + 後退 + 上升
        const cardPos = new THREE.Vector3(...s.currentCard.position);
        const backDir = s.unlockStartPos.clone().sub(cardPos).normalize();
        
        // 加入側向偏移（Pull Back Reveal）
        const sideOffset = new THREE.Vector3(-backDir.z, 0, backDir.x)
          .multiplyScalar(s.unlockDirection * 2.5 * t);
        
        const unlockEndPos = s.unlockStartPos.clone()
          .add(backDir.multiplyScalar(DISTANCE.UNLOCK_END - DISTANCE.FOCUS_END))
          .add(sideOffset)
          .add(new THREE.Vector3(0, t * 1.2, 0)); // 略微上升
        
        camera.position.lerp(unlockEndPos, 0.08);
        
        // 視線慢慢放鬆
        const relaxedLookAt = s.lookAtTarget.clone();
        relaxedLookAt.y += t * 0.8;
        relaxedLookAt.x += s.unlockDirection * t * 0.5;
        
        const currentLookAt = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);
        currentLookAt.lerp(relaxedLookAt, delta * 2.5);
        camera.lookAt(currentLookAt);
        
        // 離開時輕微傾斜
        camera.rotation.z = THREE.MathUtils.lerp(
          camera.rotation.z, 
          s.unlockDirection * 0.02 * t, 
          delta * 2
        );

        if (s.progress >= 1) {
          if (onFocus) onFocus(null);
          if (onHover) onHover(null);
          
          s.mode = STATE.CRUISING;
          s.progress = 0;
          s.targetFov = FOV.DEFAULT;
        }
        break;
      }
    }
  });

  return null;
}
