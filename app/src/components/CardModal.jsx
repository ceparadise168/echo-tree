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

  // 生成隨機記憶內容（實際應用中會從資料庫獲取）
  const memories = [
    "第一次團隊聚餐，大家笑得很開心 🎉",
    "深夜趕專案，但一起奮鬥的感覺真好 💪",
    "新成員加入，團隊又壯大了！🌟",
    "產品上線那天，我們都哭了 😭",
    "年末尾牙，贏了大獎！🏆",
    "一起經歷的困難，讓我們更團結 ❤️",
    "那個 bug 修了三天，終於解決了！🐛",
    "客戶的感謝信，是最好的鼓勵 📧",
  ];
  
  const randomMemory = memories[card.index % memories.length];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          '--card-color': card.color,
          '--card-glow': card.color,
        }}
      >
        <button className="modal-close" onClick={onClose} aria-label="關閉">
          ✕
        </button>
        
        <div className="modal-header">
          <div className="modal-star" style={{ backgroundColor: card.color }}>
            ✦
          </div>
          <h2>記憶 #{card.index + 1}</h2>
        </div>
        
        <div className="modal-body">
          <p className="memory-text">{randomMemory}</p>
          <div className="memory-meta">
            <span className="memory-date">
              📅 {new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-TW')}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <p className="modal-hint">點擊外部或按 ESC 關閉</p>
        </div>
      </div>
    </div>
  );
}
