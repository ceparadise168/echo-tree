import React, { useState, useEffect, useCallback } from 'react';
import './CardForm.css';

/**
 * 卡片填寫表單元件
 */
export default function CardForm({ onSubmit, onClose }) {
  const [memory, setMemory] = useState('');
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
      date: new Date().toLocaleDateString('zh-TW'),
      color: Math.random() > 0.5 ? '#FFD700' : '#FF69B4',
      isUserCreated: true,
    };
    
    // 模擬提交延遲（實際應用中會是 API 呼叫）
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSubmit(newCard);
    setIsSubmitting(false);
    onClose();
  };

  const remainingChars = 100 - memory.length;

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
          <div className="form-field">
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value.slice(0, 100))}
              placeholder="分享一段美好的記憶..."
              rows={4}
              maxLength={100}
              autoFocus
              disabled={isSubmitting}
            />
            <span className={`char-count ${remainingChars < 20 ? 'warning' : ''}`}>
              {remainingChars}
            </span>
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
          <p>你的記憶將匿名顯示在星空中</p>
        </div>
      </div>
    </div>
  );
}
