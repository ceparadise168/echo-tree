import React, { useState, useEffect, useCallback } from 'react';
import './CardForm.css';

/**
 * 卡片填寫表單元件
 */

// 預設顏色選項（四個象限：紅、綠、黃、藍）
const PRESET_COLORS = [
  { name: '金黃', color: '#FFD700' },
  { name: '珊瑩紅', color: '#FF6B6B' },
  { name: '翠綠', color: '#4ECDC4' },
  { name: '天空藍', color: '#45B7D1' },
  { name: '深紫', color: '#9B59B6' },
  { name: '橙色', color: '#FF9F43' },
  { name: '薄荷綠', color: '#26DE81' },
  { name: '粉紅', color: '#FF69B4' },
];

export default function CardForm({ onSubmit, onClose }) {
  const [memory, setMemory] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].color);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESC 鍵關閉
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!memory.trim()) return;
    
    setIsSubmitting(true);
    
    // 建立新卡片資料
    const newCard = {
      memory: memory.trim(),
      authorName: isAnonymous ? '' : authorName.trim(),
      date: new Date().toLocaleDateString('zh-TW'),
      color: selectedColor,
      isUserCreated: true,
    };
    
    // 模擬提交延遲（實際應用中會是 API 呼叫）
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSubmit(newCard);
    setIsSubmitting(false);
    onClose();
  };

  const remainingChars = 100 - memory.length;

  // 從 HEX 顏色獲取色相值
  const getHueFromColor = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return Math.round(h * 360);
  };

  // HSL 轉 HEX
  const hslToHex = (h, s, l) => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  return (
    <div className="form-overlay" onClick={onClose}>
      <div 
        className="form-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="form-close" onClick={onClose} aria-label="關閉">
          ✕
        </button>
        
        <div className="form-header">
          <div className="form-icon">✨</div>
          <h2>留下你的記憶</h2>
          <p className="form-subtitle">寫下一段珍貴的回憶，讓它化為星空中的光點</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* 姓名欄位 */}
          <div className="form-field name-field">
            <div className="name-input-wrapper">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value.slice(0, 20))}
                placeholder="你的名字（選填）"
                maxLength={20}
                disabled={isSubmitting || isAnonymous}
                className={isAnonymous ? 'disabled' : ''}
                style={{ borderColor: selectedColor + '40' }}
              />
              <label className="anonymous-toggle">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => {
                    setIsAnonymous(e.target.checked);
                    if (e.target.checked) setAuthorName('');
                  }}
                  disabled={isSubmitting}
                />
                <span className="toggle-label">匿名</span>
              </label>
            </div>
            <p className="name-hint">
              {isAnonymous 
                ? '🌙 將以「一位旅人的記憶」顯示' 
                : authorName.trim() 
                  ? `💫 將以「${authorName.trim()} 的記憶」顯示`
                  : '✨ 留空也會以匿名顯示'}
            </p>
          </div>

          <div className="form-field">
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value.slice(0, 100))}
              placeholder="分享一段美好的記憶..."
              rows={4}
              maxLength={100}
              autoFocus
              disabled={isSubmitting}
              style={{ borderColor: selectedColor + '40' }}
            />
            <span className={`char-count ${remainingChars < 20 ? 'warning' : ''}`}>
              {remainingChars}
            </span>
          </div>
          
          {/* 顏色選擇器 */}
          <div className="color-picker-section">
            <label className="color-picker-label">
              <span>選擇卡片顏色</span>
              <div 
                className="current-color-preview"
                style={{ backgroundColor: selectedColor }}
                onClick={() => setShowColorPicker(!showColorPicker)}
              />
            </label>
            
            <div className="color-presets">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.color}
                  type="button"
                  className={`color-preset-btn ${selectedColor === preset.color ? 'selected' : ''}`}
                  style={{ backgroundColor: preset.color }}
                  onClick={() => setSelectedColor(preset.color)}
                  title={preset.name}
                  aria-label={`選擇${preset.name}`}
                />
              ))}
            </div>
            
            {/* 進階顏色選擇器 */}
            {showColorPicker && (
              <div className="advanced-color-picker">
                <div className="color-gradient-picker">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={getHueFromColor(selectedColor)}
                    onChange={(e) => setSelectedColor(hslToHex(e.target.value, 70, 60))}
                    className="hue-slider"
                    style={{ '--hue': getHueFromColor(selectedColor) }}
                  />
                  <div className="hue-preview" style={{ backgroundColor: selectedColor }} />
                </div>
                <p className="color-picker-hint">拖曳滑桿選擇更多色階</p>
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={!memory.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading-spinner">⏳</span>
              ) : (
                <>🌟 送出記憶</>
              )}
            </button>
          </div>
        </form>

        <div className="form-footer">
          <p>你的記憶將化為星空中閃耀的光點 ✨</p>
        </div>
      </div>
    </div>
  );
}
