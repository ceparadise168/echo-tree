import React, { useEffect, useCallback } from 'react';
import './WelcomeModal.css';

/**
 * 訪客模式歡迎引導組件
 */
export default function WelcomeModal({ onClose, onCreateGroup }) {
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

  const handleExplore = () => {
    // 標記使用者已看過歡迎訊息
    localStorage.setItem('echoTree_welcomed', 'true');
    onClose();
  };

  const handleCreateGroupClick = () => {
    // 標記使用者已看過歡迎訊息
    localStorage.setItem('echoTree_welcomed', 'true');
    onClose();
    onCreateGroup();
  };

  return (
    <div className="modal-overlay" onClick={handleExplore}>
      <div 
        className="welcome-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="welcome-header">
          <div className="welcome-icon">🌟</div>
          <h2>歡迎來到你的私人星空</h2>
        </div>
        
        <div className="welcome-body">
          <div className="welcome-info">
            <p className="welcome-description">
              這是你專屬的記憶空間，所有卡片都僅保存在此裝置中。
            </p>
            <p className="welcome-description">
              你可以自由創建和瀏覽個人記憶，不會與他人分享。
            </p>
          </div>

          <div className="welcome-warning">
            <div className="warning-icon">⚠️</div>
            <p>
              <strong>建立群組後將開始全新的共享星空</strong>
              <br />
              現有的私人卡片不會轉移到群組中
            </p>
          </div>
        </div>

        <div className="welcome-footer">
          <button 
            className="btn-welcome-explore"
            onClick={handleExplore}
          >
            開始探索
          </button>
          <button 
            className="btn-welcome-create-group"
            onClick={handleCreateGroupClick}
          >
            建立群組
          </button>
        </div>

        <p className="welcome-hint">
          按 ESC 或點擊外部關閉
        </p>
      </div>
    </div>
  );
}
