import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * 完整的電影感導航狀態機
 * 
 * 流程：
 * 1. CRUISING    - 巡航尋找下一張卡片
 * 2. APPROACHING - 非線性接近目標卡片（貝茲曲線）
 * 3. FOCUSING    - 慢慢完成對焦（收縮接近 + 視角穩定）
 * 4. LOCKED      - 鎖定感（短暫靜止 + 觸發顯示內容）
 * 5. DWELLING    - 停留閱讀
 * 6. UNLOCKING   - 解鎖離開（視角放鬆、拉遠）
 * 7. 回到 CRUISING
 */

const STATE = {
  CRUISING: 'cruising',       // 巡航尋找目標
  APPROACHING: 'approaching', // 接近目標（快速、弧形）
  FOCUSING: 'focusing',       // 對焦鎖定（慢速收縮）
  LOCKED: 'locked',           // 完全鎖定（觸發內容顯示）
  DWELLING: 'dwelling',       // 停留閱讀
  UNLOCKING: 'unlocking',     // 解鎖拉遠
};

// 時間配置（秒）
const TIMING = {
  CRUISE_SCAN: 0.8,           // 巡航時的掃描時間
  APPROACH_DURATION: 1.8,     // 接近時間
  FOCUS_DURATION: 0.6,        // 對焦時間（慢慢靠近）
  LOCK_DURATION: 0.3,         // 鎖定靜止時間
  DWELL_DURATION: 3.0,        // 停留閱讀時間
  UNLOCK_DURATION: 0.5,       // 解鎖拉遠時間
};

// 距離配置
const DISTANCE = {
  APPROACH_END: 3.2,          // 接近階段結束距離
  FOCUS_END: 2.4,             // 對焦完成距離（更近）
  UNLOCK_END: 4.0,            // 解鎖拉遠距離
};

export function AutoPilotController({ enabled, allCards, onHover, onFocus }) {
  const { camera } = useThree();
  
  const state = useRef({
    mode: STATE.CRUISING,
    // 位置相關
    startPos: new THREE.Vector3(),
    ctrlPos: new THREE.Vector3(),      // 貝茲控制點
    targetPos: new THREE.Vector3(),    // 目標位置
    lookAtTarget: new THREE.Vector3(), // 注視點
    focusStartPos: new THREE.Vector3(),
    unlockStartPos: new THREE.Vector3(),
    // 時間相關
    progress: 0,
    duration: 1.0,
    // 卡片資訊
    currentCard: null,
    // 追蹤
    visited: new Set(),
    lastCardId: null,
    noiseOffset: Math.random() * 1000,
    // 視覺效果
    focusIntensity: 0,  // 0~1 對焦強度
  });

  // === 緩動函數 ===
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
  const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  const easeInQuad = (t) => t * t;

  // === 貝茲曲線 ===
  const makeBezierPoint = (t, p0, p1, p2) => {
    const a = 1 - t;
    return p0.clone().multiplyScalar(a * a)
      .add(p1.clone().multiplyScalar(2 * a * t))
      .add(p2.clone().multiplyScalar(t * t));
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
      
      // 評分系統
      const nearScore = -dist * 0.5;
      const freshBonus = visited.has(id) ? -10 : 12;
      const repeatPenalty = state.current.lastCardId === id ? -20 : 0;
      const farJumpBonus = Math.random() > 0.85 ? dist * 0.2 : 0;
      const randomSpice = (Math.random() - 0.5) * 4;
      
      const score = nearScore + freshBonus + repeatPenalty + farJumpBonus + randomSpice;
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    });
    return best;
  };

  // === 計算卡片前方的觀察位置 ===
  const computeViewingPosition = (card, distance) => {
    const cardPos = new THREE.Vector3(...card.position);
    const angle = (Math.random() - 0.5) * Math.PI * 0.4;
    const offset = new THREE.Vector3(
      Math.sin(angle) * distance * 0.3,
      (Math.random() - 0.5) * 0.8,
      distance
    );
    return { pos: cardPos.clone().add(offset), lookAt: cardPos };
  };

  // === 開始接近目標卡片 ===
  const startApproaching = (fromPos) => {
    const picked = pickCardWeighted();
    if (!picked) return false;

    const { pos: approachEnd, lookAt } = computeViewingPosition(picked, DISTANCE.APPROACH_END);
    
    // 計算貝茲曲線控制點（弧形路徑）
    const mid = fromPos.clone().add(approachEnd).multiplyScalar(0.5);
    mid.y += 2 + Math.random() * 2;
    mid.x += (Math.random() - 0.5) * 3;
    mid.z += (Math.random() - 0.5) * 2;

    const s = state.current;
    s.startPos.copy(fromPos);
    s.ctrlPos.copy(mid);
    s.targetPos.copy(approachEnd);
    s.lookAtTarget.copy(lookAt);
    s.currentCard = picked;
    s.duration = TIMING.APPROACH_DURATION + (Math.random() - 0.5) * 0.4;
    s.progress = 0;
    s.mode = STATE.APPROACHING;

    // 通知 hover 效果
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
      s.focusIntensity = 0;
      // 短暫巡航後開始接近第一張卡
      setTimeout(() => {
        if (enabled) {
          startApproaching(camera.position.clone());
        }
      }, 500);
    } else {
      // 停用時清除狀態
      if (onFocus) onFocus(null);
      if (onHover) onHover(null);
    }
  }, [enabled]);

  // === 主要動畫循環 ===
  useFrame((threeState, delta) => {
    if (!enabled) return;

    const s = state.current;
    const time = threeState.clock.getElapsedTime();
    
    switch (s.mode) {
      // === 巡航狀態（尋找下一張卡片）===
      case STATE.CRUISING: {
        s.progress += delta / TIMING.CRUISE_SCAN;
        
        // 緩慢的漂浮動作
        const drift = new THREE.Vector3(
          Math.sin(time * 0.3) * 0.02,
          Math.cos(time * 0.2) * 0.015,
          Math.sin(time * 0.25) * 0.01
        );
        camera.position.add(drift);
        
        if (s.progress >= 1) {
          if (!startApproaching(camera.position.clone())) {
            // 沒有卡片可選，繼續漂浮
            s.progress = 0;
          }
        }
        break;
      }

      // === 接近狀態（弧形飛向目標）===
      case STATE.APPROACHING: {
        s.progress += delta / s.duration;
        const t = Math.min(1, easeOutQuart(s.progress));
        
        // 沿貝茲曲線移動
        const curvePos = makeBezierPoint(t, s.startPos, s.ctrlPos, s.targetPos);
        camera.position.lerp(curvePos, 0.85);
        
        // 平滑轉向目標
        const currentLookAt = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);
        currentLookAt.lerp(s.lookAtTarget, delta * 4);
        camera.lookAt(currentLookAt);
        
        // 飛行時的輕微傾斜
        const bankAngle = Math.sin(s.progress * Math.PI) * 0.03;
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, bankAngle, delta * 2);

        if (s.progress >= 1) {
          // 進入對焦階段
          s.mode = STATE.FOCUSING;
          s.progress = 0;
          s.focusStartPos.copy(camera.position);
          s.duration = TIMING.FOCUS_DURATION;
        }
        break;
      }

      // === 對焦狀態（慢慢收縮靠近）===
      case STATE.FOCUSING: {
        s.progress += delta / s.duration;
        const t = Math.min(1, easeInOutCubic(s.progress));
        
        // 計算對焦終點位置（更近）
        const focusEndPos = computeViewingPosition(s.currentCard, DISTANCE.FOCUS_END).pos;
        
        // 平滑插值到對焦位置
        const focusPos = s.focusStartPos.clone().lerp(focusEndPos, t);
        camera.position.lerp(focusPos, 0.15);
        
        // 穩定注視目標
        const currentLookAt = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);
        currentLookAt.lerp(s.lookAtTarget, delta * 8); // 更快對準
        camera.lookAt(currentLookAt);
        
        // 逐漸穩定（減少晃動）
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, delta * 6);
        
        // 更新對焦強度
        s.focusIntensity = t;

        if (s.progress >= 1) {
          // 進入鎖定階段
          s.mode = STATE.LOCKED;
          s.progress = 0;
          s.duration = TIMING.LOCK_DURATION;
        }
        break;
      }

      // === 鎖定狀態（完全靜止，觸發內容顯示）===
      case STATE.LOCKED: {
        s.progress += delta / s.duration;
        
        // 幾乎完全靜止，只有極微的呼吸
        const microBreath = Math.sin(time * 2) * 0.002;
        camera.position.y += microBreath * delta;
        
        // 持續穩定注視
        camera.lookAt(s.lookAtTarget);
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0, delta * 10);
        
        // 鎖定完成時觸發內容顯示
        if (s.progress >= 1) {
          // 記錄已訪問
          if (s.currentCard) {
            const id = s.currentCard.isSeed ? s.currentCard.index : `user-${s.currentCard.index}`;
            state.current.visited.add(id);
            state.current.lastCardId = id;
            // 觸發卡片內容顯示
            if (onFocus) onFocus(id);
          }
          
          s.mode = STATE.DWELLING;
          s.progress = 0;
          s.duration = TIMING.DWELL_DURATION + (Math.random() - 0.5) * 1;
        }
        break;
      }

      // === 停留狀態（閱讀內容）===
      case STATE.DWELLING: {
        s.progress += delta / s.duration;
        
        // 極輕微的呼吸感
        const breathY = Math.sin(time * 0.8) * 0.008;
        const breathZ = Math.sin(time * 0.5) * 0.015;
        const dwellPos = s.targetPos.clone().add(new THREE.Vector3(0, breathY, breathZ));
        camera.position.lerp(dwellPos, 0.05);
        
        // 保持穩定注視
        camera.lookAt(s.lookAtTarget);
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, Math.sin(time * 0.3) * 0.005, delta);

        if (s.progress >= 1) {
          // 進入解鎖階段
          s.mode = STATE.UNLOCKING;
          s.progress = 0;
          s.unlockStartPos.copy(camera.position);
          s.duration = TIMING.UNLOCK_DURATION;
        }
        break;
      }

      // === 解鎖狀態（視角放鬆、拉遠）===
      case STATE.UNLOCKING: {
        s.progress += delta / s.duration;
        const t = Math.min(1, easeInQuad(s.progress));
        
        // 拉遠
        const unlockEndPos = computeViewingPosition(s.currentCard, DISTANCE.UNLOCK_END).pos;
        const unlockPos = s.unlockStartPos.clone().lerp(unlockEndPos, t);
        camera.position.lerp(unlockPos, 0.12);
        
        // 視角開始放鬆（不再緊盯）
        const relaxedLookAt = s.lookAtTarget.clone();
        relaxedLookAt.y += t * 0.5; // 視線略微上移
        const currentLookAt = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .add(camera.position);
        currentLookAt.lerp(relaxedLookAt, delta * 3);
        camera.lookAt(currentLookAt);
        
        // 降低對焦強度
        s.focusIntensity = 1 - t;

        if (s.progress >= 1) {
          // 清除卡片內容顯示
          if (onFocus) onFocus(null);
          if (onHover) onHover(null);
          
          // 回到巡航尋找下一張
          s.mode = STATE.CRUISING;
          s.progress = 0;
        }
        break;
      }
    }
  });

  return null;
}
