import React, { useState, useEffect, useCallback } from 'react';
import './CardForm.css';
import { analyzeMood, preloadModel } from '../utils/moodAnalyzer';

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
  const [recipient, setRecipient] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].color);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI 心情分析狀態
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [hasManuallySelected, setHasManuallySelected] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [isModelPreloading, setIsModelPreloading] = useState(false);

  // ESC 鍵關閉
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // 背景預載入 AI 模型（當用戶輸入 10 字元以上時）
  useEffect(() => {
    if (memory.trim().length >= 10 && !isModelPreloading) {
      const timer = setTimeout(() => {
        setIsModelPreloading(true);
        preloadModel()
          .then(() => {
            console.log('✅ AI 模型預載入完成');
            setIsModelPreloading(false);
          })
          .catch((error) => {
            console.warn('⚠️ AI 模型預載入失敗:', error);
            setIsModelPreloading(false);
          });
      }, 2000); // 2 秒 debounce

      return () => clearTimeout(timer);
    }
  }, [memory, isModelPreloading]);

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
      recipient: recipient.trim(),
      date: new Date().toLocaleDateString('zh-TW'),
      color: selectedColor,
      isUserCreated: true,
    };
    
    try {
      await onSubmit(newCard);
      onClose();
    } catch (submitError) {
      console.error('Failed to submit card from form:', submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI 心情分析
  const handleAiAnalysis = async () => {
    const trimmedMemory = memory.trim();
    
    // 驗證輸入
    if (trimmedMemory.length < 5) {
      setAiError('請先寫下至少 5 個字的記憶內容');
      setTimeout(() => setAiError(null), 3000);
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);

    try {
      const result = await analyzeMood(trimmedMemory);

      if (result.error) {
        // 雖然有錯誤但有降級方案，仍然應用顏色
        setAiError(result.message);
        setTimeout(() => setAiError(null), 3000);
        
        if (result.color) {
          setSelectedColor(result.color);
          setAiSuggestion({
            color: result.color,
            mood: result.mood,
            emoji: result.emoji
          });
        }
      } else {
        // 成功分析
        setSelectedColor(result.color);
        setAiSuggestion({
          color: result.color,
          mood: result.mood,
          emoji: result.emoji
        });
        setHasManuallySelected(false);

        // 震動回饋
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
      }
    } catch (error) {
      console.error('AI 分析未預期錯誤:', error);
      setAiError('AI 暫時無法使用，已為你選擇預設顏色');
      setTimeout(() => setAiError(null), 3000);
      setSelectedColor(PRESET_COLORS[0].color);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const remainingChars = 150 - memory.length;

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
          {/* 收件人欄位 */}
          <div className="form-field recipient-field">
            <div className="recipient-input-wrapper">
              <span className="recipient-icon">💝</span>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.slice(0, 20))}
                placeholder="給誰？（選填）"
                maxLength={20}
                disabled={isSubmitting}
                style={{ borderColor: selectedColor + '40' }}
              />
            </div>
            {recipient.trim() && (
              <p className="recipient-hint">💌 這張卡片將獲贈給「{recipient.trim()}」</p>
            )}
          </div>

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
              onChange={(e) => setMemory(e.target.value.slice(0, 150))}
              placeholder="分享一段美好的記憶..."
              rows={4}
              maxLength={150}
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
                  onClick={() => {
                    setSelectedColor(preset.color);
                    setHasManuallySelected(true);
                  }}
                  title={preset.name}
                  aria-label={`選擇${preset.name}`}
                />
              ))}
              
              {/* AI 心情分析按鈕 */}
              <button
                type="button"
                className={`ai-button ${isAnalyzing ? 'analyzing' : ''}`}
                onClick={handleAiAnalysis}
                disabled={isAnalyzing || isSubmitting}
                title="AI 會根據文字情緒推薦顏色"
                aria-label="AI 心情分析"
              >
                ✨
              </button>
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

            {/* AI 狀態顯示區域 */}
            {isModelPreloading && (
              <div className="ai-status preloading">
                🔮 AI 正在準備中...
              </div>
            )}

            {isAnalyzing && (
              <div className="ai-status loading">
                ⏳ AI 正在分析你的心情...
              </div>
            )}

            {aiError && (
              <div className="ai-status error">
                ❌ {aiError}
              </div>
            )}

            {aiSuggestion && !hasManuallySelected && (
              <div className="mood-badge">
                {aiSuggestion.emoji} {aiSuggestion.mood}
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
