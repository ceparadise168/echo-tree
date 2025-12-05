import React, { useEffect, useCallback } from 'react';
import './CardModal.css';

/**
 * 卡片詳情模態框元件
 */
export default function CardModal({ card, onClose }) {
  // ESC 鍵關閉
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // 防止背景滾動
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!card) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${card.isSeed ? 'seed-card' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          '--card-color': card.color,
          '--card-glow': card.color,
        }}
      >
        <button className="modal-close" onClick={onClose} aria-label="關閉">
          ✕
        </button>
        
        {card.isSeed && (
          <div className="seed-badge">✨ 範例記憶</div>
        )}
        
        <div className="modal-header">
          <div className="modal-star" style={{ backgroundColor: card.color }}>
            {card.isSeed ? '○' : '✦'}
          </div>
          <h2>{card.isSeed ? '星空種子' : `記憶 #${card.index + 1}`}</h2>
        </div>
        
        <div className="modal-body">
          <p className="memory-text">{card.memory}</p>
          <div className="memory-meta">
            <span className="memory-date">
              📅 {card.date}
            </span>
            {card.isUserCreated && (
              <span className="user-created-badge">🌟 我的記憶</span>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <p className="modal-hint">
            {card.isSeed 
              ? '這是星空中的種子記憶，點擊 ✨ 按鈕留下你的記憶吧！' 
              : '點擊外部或按 ESC 關閉'}
          </p>
        </div>
      </div>
    </div>
  );
}
