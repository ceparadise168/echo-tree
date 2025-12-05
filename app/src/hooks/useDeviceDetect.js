import { useState, useEffect } from 'react';

/**
 * 偵測裝置類型和功能的自訂 Hook
 */
export function useDeviceDetect() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTouch: false,
    hasGyroscope: false,
    prefersReducedMotion: false,
  });

  useEffect(() => {
    // 偵測觸控能力
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 偵測行動裝置（結合螢幕尺寸和觸控）
    const isMobile = isTouch && window.innerWidth <= 768;
    
    // 偵測減少動態偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // 偵測陀螺儀支援
    const hasGyroscope = 'DeviceOrientationEvent' in window;

    setDeviceInfo({
      isMobile,
      isTouch,
      hasGyroscope,
      prefersReducedMotion,
    });

    // 監聽螢幕尺寸變化
    const handleResize = () => {
      setDeviceInfo(prev => ({
        ...prev,
        isMobile: prev.isTouch && window.innerWidth <= 768,
      }));
    };

    // 監聽減少動態偏好變化
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => {
      setDeviceInfo(prev => ({ ...prev, prefersReducedMotion: e.matches }));
    };

    window.addEventListener('resize', handleResize);
    motionQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return deviceInfo;
}

/**
 * 觸覺反饋工具函式
 */
export function triggerHapticFeedback(pattern = [50]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * 請求陀螺儀權限（iOS 13+ 需要）
 */
export async function requestGyroscopePermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('陀螺儀權限請求失敗:', error);
      return false;
    }
  }
  // 非 iOS 裝置，假設有權限
  return true;
}
