import React, { useState, useEffect, useCallback } from 'react';
import './CreateGroupModal.css';

/**
 * 建立/加入群組模態框組件
 */
export default function CreateGroupModal({ onClose, onCreate }) {
  const [eventCode, setEventCode] = useState('');
  const [error, setError] = useState('');

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

  // 即時驗證
  const validateEventCode = (value) => {
    if (!value) {
      return '';
    }
    if (value.length < 3) {
      return '至少需要 3 個字元';
    }
    if (value.length > 50) {
      return '最多 50 個字元';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return '僅限英文、數字、底線 (_)、連字號 (-)';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setEventCode(value);
    setError(validateEventCode(value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationError = validateEventCode(eventCode);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!eventCode || eventCode.length < 3) {
      setError('請輸入群組名稱');
      return;
    }

    // 呼叫建立群組回調
    onCreate(eventCode);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="create-group-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="關閉">
          ✕
        </button>

        <div className="create-group-header">
          <div className="create-group-icon">🎪</div>
          <h2>建立或加入群組</h2>
        </div>
        
        <form className="create-group-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="eventCode">群組名稱</label>
            <input
              type="text"
              id="eventCode"
              value={eventCode}
              onChange={handleInputChange}
              placeholder="例如：my-team-2024"
              autoFocus
              className={error ? 'error' : ''}
            />
            {error && (
              <div className="error-message">{error}</div>
            )}
            <div className="input-hint">
              輸入群組名稱以建立或加入現有群組
            </div>
          </div>

          <div className="form-info">
            <p>📝 技術限制：</p>
            <ul>
              <li>3-50 個字元</li>
              <li>僅限英文、數字、底線 (_)、連字號 (-)</li>
            </ul>
          </div>

          <div className="create-group-footer">
            <button 
              type="button"
              className="btn-cancel"
              onClick={onClose}
            >
              取消
            </button>
            <button 
              type="submit"
              className="btn-create"
              disabled={!!error || !eventCode}
            >
              確認
            </button>
          </div>
        </form>

        <p className="modal-hint">
          按 ESC 或點擊外部關閉
        </p>
      </div>
    </div>
  );
}
