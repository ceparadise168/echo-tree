import { useState, useEffect, useCallback } from 'react';

/**
 * 陀螺儀控制 Hook - 用於手機傾斜控制視角
 */
export function useGyroscope(enabled = true) {
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [isActive, setIsActive] = useState(false);

  const handleOrientation = useCallback((event) => {
    // alpha: 0-360 (羅盤方向)
    // beta: -180 to 180 (前後傾斜)
    // gamma: -90 to 90 (左右傾斜)
    setOrientation({
      alpha: event.alpha || 0,
      beta: event.beta || 0,
      gamma: event.gamma || 0,
    });
  }, []);

  const startListening = useCallback(() => {
    if (!enabled) return;
    
    window.addEventListener('deviceorientation', handleOrientation, true);
    setIsActive(true);
  }, [enabled, handleOrientation]);

  const stopListening = useCallback(() => {
    window.removeEventListener('deviceorientation', handleOrientation, true);
    setIsActive(false);
  }, [handleOrientation]);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, startListening, stopListening]);

  // 將傾斜角度轉換為攝影機偏移量（-1 到 1 範圍）
  const normalizedOrientation = {
    x: Math.max(-1, Math.min(1, (orientation.gamma || 0) / 45)), // 左右傾斜
    y: Math.max(-1, Math.min(1, (orientation.beta - 45) / 45)),  // 前後傾斜（45度為中心）
  };

  return {
    orientation,
    normalizedOrientation,
    isActive,
    startListening,
    stopListening,
  };
}
