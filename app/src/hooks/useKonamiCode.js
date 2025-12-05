import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Konami Code Hook
 * 偵測經典密碼 ↑↑↓↓←→←→BA 以及隱藏觸發區域
 * 
 * 觸發方式：
 * - 桌面：鍵盤輸入 ↑↑↓↓←→←→BA
 * - 桌面：點擊左下角隱藏區域 5 次
 * - 手機：長按左下角隱藏區域 3 秒
 */

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA'
];

export function useKonamiCode(onActivate) {
  const [isActivated, setIsActivated] = useState(false);
  const [inputSequence, setInputSequence] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const longPressTimer = useRef(null);
  const clickTimer = useRef(null);

  // 重置狀態
  const reset = useCallback(() => {
    setIsActivated(false);
  }, []);

  // 觸發彩蛋
  const activate = useCallback(() => {
    if (!isActivated) {
      setIsActivated(true);
      onActivate?.();
    }
  }, [isActivated, onActivate]);

  // 鍵盤序列偵測
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isActivated) return;

      const key = e.code;
      const newSequence = [...inputSequence, key].slice(-KONAMI_CODE.length);
      setInputSequence(newSequence);

      // 檢查是否匹配
      if (newSequence.length === KONAMI_CODE.length) {
        const isMatch = newSequence.every((k, i) => k === KONAMI_CODE[i]);
        if (isMatch) {
          activate();
          setInputSequence([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputSequence, isActivated, activate]);

  // 清除輸入序列（超時重置）
  useEffect(() => {
    if (inputSequence.length === 0) return;

    const timer = setTimeout(() => {
      setInputSequence([]);
    }, 2000);

    return () => clearTimeout(timer);
  }, [inputSequence]);

  // 清除點擊計數（超時重置）
  useEffect(() => {
    if (clickCount === 0) return;

    clickTimer.current = setTimeout(() => {
      setClickCount(0);
    }, 1500);

    return () => {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
      }
    };
  }, [clickCount]);

  // 處理隱藏區域點擊（桌面：5次點擊）
  const handleSecretClick = useCallback(() => {
    if (isActivated) return;

    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (newCount >= 5) {
      activate();
      setClickCount(0);
    }
  }, [clickCount, isActivated, activate]);

  // 處理長按開始（手機：3秒長按）
  const handleTouchStart = useCallback(() => {
    if (isActivated) return;

    longPressTimer.current = setTimeout(() => {
      activate();
    }, 3000);
  }, [isActivated, activate]);

  // 處理長按結束
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
      }
    };
  }, []);

  return {
    isActivated,
    reset,
    secretAreaProps: {
      onClick: handleSecretClick,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    // 用於顯示進度提示（可選）
    progress: {
      keySequence: inputSequence.length,
      clickCount,
      total: KONAMI_CODE.length,
    },
  };
}

export default useKonamiCode;
