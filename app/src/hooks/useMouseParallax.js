import { useState, useEffect, useCallback } from 'react';

/**
 * 滑鼠視差效果 Hook - 用於電腦追蹤滑鼠位置
 */
export function useMouseParallax(enabled = true) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((event) => {
    if (!enabled) return;
    
    // 將滑鼠位置正規化為 -1 到 1 的範圍
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    setMousePosition({ x, y });
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [enabled, handleMouseMove]);

  return mousePosition;
}
