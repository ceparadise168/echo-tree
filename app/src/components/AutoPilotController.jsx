import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

// 狀態常數
const STATE = {
  HOPPING: 'hopping',   // 短距跳躍
  PAUSE: 'pause',       // 短暫停留
};

export function AutoPilotController({ enabled, allCards, onHover, onFocus }) {
  const { camera } = useThree();
  
  // 內部狀態
  const state = useRef({
    mode: STATE.HOPPING,
    startPos: new THREE.Vector3(),
    ctrlPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    lookAtTarget: new THREE.Vector3(),
    duration: 1.0,
    progress: 0,
    currentCard: null,
    timer: 0,
    hopStreak: 0,
    noiseOffset: Math.random() * 1000,
    visited: new Set(),
    lastCardId: null,
  });

  const easeInOut = (t) => t * t * (3 - 2 * t); // smoothstep

  const makeBezierPoint = (t, p0, p1, p2) => {
    const a = 1 - t;
    return p0.clone().multiplyScalar(a * a)
      .add(p1.clone().multiplyScalar(2 * a * t))
      .add(p2.clone().multiplyScalar(t * t));
  };

  const pickFrontOfCard = (card) => {
    const cardPos = new THREE.Vector3(...card.position);
    const angle = (Math.random() - 0.5) * Math.PI * 0.6; // 大一點偏移，形成跳躍視角
    const distance = 2.6 + Math.random() * 1.2;
    const offset = new THREE.Vector3(
      Math.sin(angle) * distance,
      (Math.random() - 0.5) * 1.6,
      Math.abs(Math.cos(angle)) * distance + 1.2
    );
    return { pos: cardPos.clone().add(offset), lookAt: cardPos };
  };

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
      const nearScore = -dist; // 越近越高
      const freshBonus = visited.has(id) ? -8 : 8;
      const repeatPenalty = state.current.lastCardId === id ? -15 : 0;
      const farJumpBonus = Math.random() > 0.8 ? dist * 0.15 : 0; // 偶爾鼓勵遠跳
      const score = nearScore + freshBonus + repeatPenalty + farJumpBonus;
      if (score > bestScore) {
        bestScore = score;
        best = card;
      }
    });
    return best;
  };

  const scheduleHop = (fromPos) => {
    const picked = pickCardWeighted();
    if (!picked) return false;
    const { pos: target, lookAt } = pickFrontOfCard(picked);
    const mid = fromPos.clone().add(target).multiplyScalar(0.5);
    // 讓中點有隨機抬升 / 側移，形成電弧感
    mid.y += 1.5 + Math.random() * 1.5;
    mid.x += (Math.random() - 0.5) * 1.2;
    mid.z += (Math.random() - 0.5) * 1.2;
    state.current.startPos.copy(fromPos);
    state.current.ctrlPos.copy(mid);
    state.current.targetPos.copy(target);
    state.current.lookAtTarget.copy(lookAt);
    state.current.duration = 1.2 + Math.random() * 0.8; // 1.2~2.0 秒/跳 (放慢節奏)
    state.current.progress = 0;
    state.current.currentCard = picked;
    return true;
  };

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
      const start = camera.position.clone();
      state.current.mode = STATE.HOPPING;
      state.current.timer = 0;
      state.current.hopStreak = 0;
      scheduleHop(start);
    }
  }, [enabled]);

  useFrame((threeState, delta) => {
    if (!enabled) return;

    const s = state.current;
    const time = threeState.clock.getElapsedTime();
    
    const lookAtSmoothTime = 6.0; // 更柔和的轉頭

    switch (s.mode) {
      case STATE.HOPPING: {
        s.progress += delta / s.duration;
        const t = Math.min(1, easeInOut(s.progress));
        const curvePos = makeBezierPoint(t, s.startPos, s.ctrlPos, s.targetPos);
        camera.position.lerp(curvePos, 0.8);
        const currentLookAt = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
        currentLookAt.lerp(s.lookAtTarget, delta * lookAtSmoothTime);
        camera.lookAt(currentLookAt);
        // 微 roll，營造電弧躍遷的側傾
        const bankAngle = Math.sin(time * 0.8) * 0.02; // 降低傾斜
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, bankAngle, delta * 1.0);
        // 噪聲再降低
        camera.position.y += Math.sin(time * 0.9 + s.noiseOffset) * 0.0006;

        if (s.progress >= 1) {
          // 記錄已訪問
          if (s.currentCard) {
            const id = s.currentCard.isSeed ? s.currentCard.index : `user-${s.currentCard.index}`;
            state.current.visited.add(id);
            state.current.lastCardId = id;
            if (onHover) onHover(id);
            // 通知聚焦於此卡片
            if (onFocus) onFocus(id);
          }
          s.hopStreak += 1;
          s.timer = 0;
          // 決定是否進入暫停
          const streakMax = 4 + Math.floor(Math.random() * 3); // 4-6 跳後休息（更常休息）
          if (s.hopStreak >= streakMax) {
            s.mode = STATE.PAUSE;
            s.timer = 2.5 + Math.random() * 1.5; // 2.5-4 秒停留（更久）
            s.hopStreak = 0;
          } else {
            // 立即排下一跳
            const from = camera.position.clone();
            if (!scheduleHop(from)) {
              s.mode = STATE.PAUSE;
              s.timer = 2;
            }
          }
        }
        break;
      }

      case STATE.PAUSE: {
        s.timer -= delta;
        // 停留時做微縮放與呼吸
        const bobY = Math.sin(time * 0.6) * 0.012;
        const bobX = Math.cos(time * 0.4) * 0.008;
        const dolly = Math.sin(time * 0.3) * 0.2;
        const pausePos = s.targetPos.clone().add(new THREE.Vector3(bobX, bobY, dolly));
        camera.position.lerp(pausePos, 0.08);
        const currentLookAt = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
        currentLookAt.lerp(s.lookAtTarget, delta * lookAtSmoothTime);
        camera.lookAt(currentLookAt);
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, Math.sin(time * 0.25) * 0.015, delta * 0.8);

        if (s.timer <= 0) {
          // 離開暫停，清除聚焦卡片
          if (onFocus) onFocus(null);
          const from = camera.position.clone();
          if (!scheduleHop(from)) {
            // 若沒有卡可跳，回到隨機漫遊點
            const fallback = pickWanderTarget();
            state.current.startPos.copy(from);
            state.current.ctrlPos.copy(from.clone().add(fallback).multiplyScalar(0.5));
            state.current.targetPos.copy(fallback);
            state.current.lookAtTarget.copy(fallback);
            state.current.duration = 1.2;
            state.current.progress = 0;
          }
          s.mode = STATE.HOPPING;
        }
        break;
      }
    }
  });

  return null;
}
