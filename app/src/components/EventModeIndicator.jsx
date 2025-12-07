import React, { useState } from 'react';
import './EventModeIndicator.css';

/**
 * 群組模式指示器組件 - 顯示目前模式和操作
 */
export default function EventModeIndicator({ 
  isGuestMode, 
  eventCode, 
  onCreateGroup, 
  onReturnToGuestMode,
  onShowToast
}) {
  const [copying, setCopying] = useState(false);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?eventCode=${eventCode}`;
      await navigator.clipboard.writeText(url);
      setCopying(true);
      onShowToast('連結已複製', 'success');
      setTimeout(() => setCopying(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      onShowToast('複製失敗', 'error');
    }
  };

  return (
    <div className="event-mode-indicator">
      {isGuestMode ? (
        /* 訪客模式 */
        <>
          <div className="mode-info">
            <span className="mode-icon">🌟</span>
            <span className="mode-text">私人星空</span>
          </div>
          <button 
            className="btn-create-group"
            onClick={onCreateGroup}
            title="建立群組"
          >
            建立群組
          </button>
        </>
      ) : (
        /* 群組模式 */
        <>
          <div className="mode-info">
            <span className="mode-icon">🎪</span>
            <span className="mode-text">群組：{eventCode}</span>
          </div>
          <div className="mode-actions">
            <button 
              className={`btn-copy-link ${copying ? 'copied' : ''}`}
              onClick={handleCopyLink}
              title="複製邀請連結"
              disabled={copying}
            >
              {copying ? '✓' : '📋'}
            </button>
            <button 
              className="btn-return-guest"
              onClick={onReturnToGuestMode}
              title="返回私人星空"
            >
              🏠
            </button>
          </div>
        </>
      )}
    </div>
  );
}
