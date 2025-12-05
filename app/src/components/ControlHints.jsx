import React, { useState, useEffect } from 'react';
import './ControlHints.css';

/**
 * 控制提示 UI 元件
 */
export default function ControlHints({ 
  isMobile, 
  gyroscopeEnabled, 
  onToggleGyroscope, 
  onRequestGyroscope, 
  onResetCamera,
  onTogglePresentationMode 
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // 5秒後自動隱藏提示
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 控制提示 */}
      <div className={`control-hints ${isVisible ? 'visible' : 'hidden'}`}>
        {isMobile ? (
          <div className="hints-content">
            <p>👆 <strong>單指拖曳</strong> 旋轉視角</p>
            <p>🤏 <strong>雙指縮放</strong> 調整遠近</p>
            <p>📱 <strong>傾斜手機</strong> 探索星空</p>
            <p>✨ <strong>點擊卡片</strong> 查看記憶</p>
          </div>
        ) : (
          <div className="hints-content">
            <p>🖱️ <strong>拖曳</strong> 旋轉視角</p>
            <p>🔍 <strong>滾輪</strong> 縮放遠近</p>
            <p>✨ <strong>懸停/點擊</strong> 查看卡片</p>
            <p>⌨️ <strong>方向鍵</strong> 微調視角</p>
          </div>
        )}
      </div>

      {/* 顯示/隱藏提示按鈕 */}
      <button 
        className="hints-toggle"
        onClick={() => setIsVisible(!isVisible)}
        aria-label={isVisible ? '隱藏提示' : '顯示提示'}
      >
        {isVisible ? '?' : '?'}
      </button>

      {/* 設定按鈕 */}
      <button 
        className="settings-toggle"
        onClick={() => setShowSettings(!showSettings)}
        aria-label="設定"
      >
        ⚙️
      </button>

      {/* 重置視角按鈕 */}
      <button 
        className="reset-camera-btn"
        onClick={onResetCamera}
        aria-label="重置視角"
        title="重置視角"
      >
        🏠
      </button>

      {/* 展示模式按鈕 */}
      <button 
        className="presentation-mode-btn"
        onClick={onTogglePresentationMode}
        aria-label="展示模式"
        title="大螢幕展示模式"
      >
        📺
      </button>

      {/* 設定面板 */}
      {showSettings && (
        <div className="settings-panel">
          <h3>控制設定</h3>
          
          {isMobile && (
            <div className="setting-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={gyroscopeEnabled}
                  onChange={(e) => {
                    if (e.target.checked && onRequestGyroscope) {
                      onRequestGyroscope();
                    } else {
                      onToggleGyroscope?.(e.target.checked);
                    }
                  }}
                />
                <span>陀螺儀控制</span>
              </label>
              <p className="setting-hint">傾斜手機改變視角</p>
            </div>
          )}

          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                defaultChecked={true}
              />
              <span>自動旋轉</span>
            </label>
            <p className="setting-hint">星空緩慢自動旋轉</p>
          </div>

          <button 
            className="settings-close"
            onClick={() => setShowSettings(false)}
          >
            關閉
          </button>
        </div>
      )}
    </>
  );
}
