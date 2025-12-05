import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './PresentationMode.css';

/**
 * 大螢幕展示模式元件
 * - 自動輪播卡片（9 秒，帶進度動畫）
 * - 多卡流動模式（多張卡片同場隨機浮現/淡出）
 * - 左右箭頭/滑動手動切換
 * - 可勾選是否排除種子卡片
 * - 顯示 QR Code 供現場掃描
 */

// 預設記憶內容（與 App.jsx 同步）
const SEED_MEMORIES = [
  "第一次團隊聚餐，大家笑得很開心 🎉",
  "深夜趕專案，但一起奮鬥的感覺真好 💪",
  "新成員加入，團隊又壯大了！🌟",
  "產品上線那天，我們都哭了 😭",
  "年末尾牙，贏了大獎！🏆",
  "一起經歷的困難，讓我們更團結 ❤️",
  "那個 bug 修了三天，終於解決了！🐛",
  "客戶的感謝信，是最好的鼓勵 📧",
];

export default function PresentationMode({ 
  userCards = [], 
  seedCardCount = 50,
  onClose 
}) {
  const AUTOPLAY_MS = 9000;
  const AUTOPLAY_SEC = Math.round(AUTOPLAY_MS / 1000);
  const FLOW_MAX_ITEMS = 6;
  const FLOW_LIFETIME_MS = 13000;
  const FLOW_SPAWN_MS = 2600;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [excludeSeedCards, setExcludeSeedCards] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [playCycle, setPlayCycle] = useState(0); // 用於重啟進度條動畫
  const [multiMode, setMultiMode] = useState(false);
  const [flowItems, setFlowItems] = useState([]);
  const flowCursor = useRef(0);
  const flowTimers = useRef([]);

  // 產生種子卡片資料
  const seedCards = useMemo(() => {
    return new Array(seedCardCount).fill().map((_, index) => {
      const randomDaysAgo = Math.floor(Math.random() * 365);
      const cardDate = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000);
      const seedColors = ['#6B7280', '#9CA3AF', '#7C9CBF', '#8B9DC3', '#A0AEC0'];
      
      return {
        index,
        memory: SEED_MEMORIES[index % SEED_MEMORIES.length],
        date: cardDate.toLocaleDateString('zh-TW'),
        color: seedColors[index % seedColors.length],
        isSeed: true,
      };
    });
  }, [seedCardCount]);

  // 根據設定過濾卡片
  const displayCards = useMemo(() => {
    if (excludeSeedCards) {
      return userCards;
    }
    return [...seedCards, ...userCards];
  }, [seedCards, userCards, excludeSeedCards]);

  // 切換到下一張
  const goToNext = useCallback(() => {
    if (displayCards.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % displayCards.length);
    setPlayCycle((c) => c + 1);
  }, [displayCards.length]);

  // 切換到上一張
  const goToPrev = useCallback(() => {
    if (displayCards.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + displayCards.length) % displayCards.length);
    setPlayCycle((c) => c + 1);
  }, [displayCards.length]);

  // 自動輪播
  useEffect(() => {
    if (multiMode) return undefined; // 多卡模式關閉單卡自動播放
    if (isPaused || displayCards.length === 0) return undefined;
    const timer = setTimeout(goToNext, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [goToNext, isPaused, displayCards.length, playCycle, multiMode]);

  // 多卡模式：定期加入新卡，舊卡淡出後移除
  const spawnFlowCard = useCallback(() => {
    if (displayCards.length === 0) return;
    const idx = flowCursor.current % displayCards.length;
    flowCursor.current += 1;
    const card = displayCards[idx];
    const id = `flow-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
    const delay = Math.random() * 900;
    const lifetime = FLOW_LIFETIME_MS + Math.random() * 3000;
    const top = 18 + Math.random() * 64; // 18% ~ 82%
    const left = 15 + Math.random() * 70; // 15% ~ 85%
    const scale = 0.85 + Math.random() * 0.55;
    const rotate = -6 + Math.random() * 12;
    const zIndex = 40 + Math.round(scale * 20);
    
    // 隨機初始位移與最終位移（營造不同飄動軌跡）
    const startY = -20 - Math.random() * 15; // -20% ~ -35%
    const endY = -70 - Math.random() * 20; // -70% ~ -90%
    const startRotate = rotate - 8 + Math.random() * 16; // 初始旋轉有變化
    const endRotate = rotate + (-4 + Math.random() * 8); // 結束旋轉也略有不同

    setFlowItems(prev => {
      const next = [...prev, { 
        id, card, delay, top, left, scale, rotate, zIndex, duration: lifetime,
        startY, endY, startRotate, endRotate
      }];
      return next.slice(-FLOW_MAX_ITEMS);
    });

    const removalTimer = setTimeout(() => {
      setFlowItems(prev => prev.filter(item => item.id !== id));
    }, lifetime + delay);

    flowTimers.current.push(removalTimer);
  }, [displayCards]);

  useEffect(() => {
    flowTimers.current.forEach(clearTimeout);
    flowTimers.current = [];
    setFlowItems([]);

    if (!multiMode || displayCards.length === 0) {
      return undefined;
    }

    flowCursor.current = 0;

    const initialCount = Math.min(FLOW_MAX_ITEMS, displayCards.length);
    for (let i = 0; i < initialCount; i += 1) {
      spawnFlowCard();
    }

    const interval = setInterval(() => {
      spawnFlowCard();
    }, FLOW_SPAWN_MS);

    return () => {
      clearInterval(interval);
      flowTimers.current.forEach(clearTimeout);
      flowTimers.current = [];
    };
  }, [multiMode, displayCards, spawnFlowCard]);

  // 鍵盤控制
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
        case ' ':
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
        case 'p':
          setIsPaused(prev => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  // 觸控滑動支援
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    
    setTouchStart(null);
  };

  // 確保索引在範圍內
  useEffect(() => {
    if (currentIndex >= displayCards.length) {
      setCurrentIndex(Math.max(0, displayCards.length - 1));
    }
  }, [displayCards.length, currentIndex]);

  const currentCard = displayCards[currentIndex];
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div 
      className="presentation-overlay"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 頂部控制列 */}
      <div className="presentation-header">
        <div className="presentation-title">
          <span className="title-icon">✨</span>
          <h1>記憶星空</h1>
          <span className="card-counter">
            {displayCards.length > 0 
              ? (multiMode
                  ? `流動畫面 · ${displayCards.length} 張`
                  : `${currentIndex + 1} / ${displayCards.length}`)
              : '尚無卡片'
            }
          </span>
        </div>
        
        <div className="presentation-controls">
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={excludeSeedCards}
              onChange={(e) => {
                setExcludeSeedCards(e.target.checked);
                setCurrentIndex(0);
              }}
            />
            <span>只顯示真實心聲</span>
          </label>

          <button 
            className={`pause-btn ${isPaused ? 'paused' : ''}`}
            onClick={() => setIsPaused(prev => !prev)}
            title={isPaused ? '繼續播放' : '暫停'}
            disabled={multiMode}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>

          <button 
            className={`multi-mode-btn ${multiMode ? 'active' : ''}`}
            onClick={() => {
              setMultiMode(prev => !prev);
              setIsPaused(false);
            }}
            title="多卡流動模式"
          >
            {multiMode ? '🌌 多卡' : '🌀 單卡'}
          </button>
          
          <button 
            className="close-btn"
            onClick={onClose}
            title="離開展示模式"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 主要卡片展示區 */}
      <div className={`presentation-main ${multiMode ? 'multi' : ''}`}>
        {displayCards.length === 0 ? (
          <div className="no-cards-message">
            <div className="empty-icon">📝</div>
            <h2>目前還沒有心聲</h2>
            <p>掃描右下角 QR Code 留下你的第一則記憶吧！</p>
          </div>
        ) : multiMode ? (
          <div className="multi-flow">
            {flowItems.map((item) => (
              <div
                key={item.id}
                className="flow-card"
                style={{
                  '--card-color': item.card.color,
                  '--start-y': `${item.startY}%`,
                  '--end-y': `${item.endY}%`,
                  '--start-rotate': `${item.startRotate}deg`,
                  '--end-rotate': `${item.endRotate}deg`,
                  '--base-scale': item.scale,
                  borderColor: item.card.color + '50',
                  top: `${item.top}%`,
                  left: `${item.left}%`,
                  animationDuration: `${item.duration}ms`,
                  animationDelay: `${item.delay}ms`,
                  zIndex: item.zIndex,
                }}
              >
                {item.card.recipient && (
                  <div className="presentation-recipient">
                    <span className="recipient-icon">💝</span>
                    <span className="recipient-text">給 {item.card.recipient}</span>
                  </div>
                )}
                <div className="presentation-memory">
                  <p>{item.card.memory}</p>
                </div>
                <div className="presentation-meta">
                  <span className="meta-date">📅 {item.card.date}</span>
                  {item.card.isSeed ? (
                    <span className="meta-author seed">✨ 範例記憶</span>
                  ) : item.card.authorName ? (
                    <span className="meta-author">💫 {item.card.authorName} 的記憶</span>
                  ) : (
                    <span className="meta-author anonymous">🌙 一位旅人的記憶</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : currentCard ? (
          <div 
            key={`${currentCard.isSeed ? 'seed' : 'user'}-${currentCard.index}-${playCycle}`}
            className="presentation-card"
            style={{ 
              '--card-color': currentCard.color,
              borderColor: currentCard.color + '60',
            }}
          >
            {/* 收件人 */}
            {currentCard.recipient && (
              <div className="presentation-recipient">
                <span className="recipient-icon">💝</span>
                <span className="recipient-text">給 {currentCard.recipient}</span>
              </div>
            )}
            
            {/* 記憶內容 */}
            <div className="presentation-memory">
              <p>{currentCard.memory}</p>
            </div>
            
            {/* 底部資訊 */}
            <div className="presentation-meta">
              <span className="meta-date">📅 {currentCard.date}</span>
              {currentCard.isSeed ? (
                <span className="meta-author seed">✨ 範例記憶</span>
              ) : currentCard.authorName ? (
                <span className="meta-author">💫 {currentCard.authorName} 的記憶</span>
              ) : (
                <span className="meta-author anonymous">🌙 一位旅人的記憶</span>
              )}
            </div>
          </div>
        ) : null}

        {/* 左右切換箭頭（單卡模式才顯示） */}
        {!multiMode && displayCards.length > 1 && (
          <>
            <button 
              className="nav-btn nav-prev"
              onClick={goToPrev}
              aria-label="上一張"
            >
              ‹
            </button>
            <button 
              className="nav-btn nav-next"
              onClick={goToNext}
              aria-label="下一張"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* 進度指示器 */}
      {!multiMode && displayCards.length > 1 && (
        <div className="progress-wrap">
          <div className="progress-label">{isPaused ? '暫停' : `自動播放 ~${AUTOPLAY_SEC}s`}</div>
          <div className="progress-bar">
            <div 
              key={playCycle}
              className="progress-fill"
              style={{ 
                animationDuration: `${AUTOPLAY_MS}ms`,
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            />
          </div>
        </div>
      )}

      {/* QR Code 區域 */}
      <div className="qr-section">
        <div className="qr-container">
          <QRCodeSVG 
            value={currentUrl}
            size={100}
            bgColor="transparent"
            fgColor="#ffffff"
            level="M"
          />
        </div>
        <p className="qr-hint">掃描留下你的記憶</p>
      </div>

      {/* 操作提示 */}
      <div className="presentation-hints">
        <span>← → 切換</span>
        <span>空白鍵 下一張</span>
        <span>P 暫停</span>
        <span>ESC 離開</span>
      </div>
    </div>
  );
}
