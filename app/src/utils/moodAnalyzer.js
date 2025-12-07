/**
 * Lumina Spark 四色情緒分析器
 * 使用 Web Worker + transformers.js 多語言情緒模型分析文字，推薦對應的 Lumina 顏色
 */

// Lumina Spark 四色定義（用於降級方案）
const LUMINA_COLORS = {
  BLUE: { color: '#45B7D1', mood: '思考邏輯', emoji: '🔵' },
  GREEN: { color: '#4ECDC4', mood: '關懷協作', emoji: '🟢' },
  YELLOW: { color: '#FFD700', mood: '行動實驗', emoji: '🟡' },
  RED: { color: '#FF6B6B', mood: '目標成就', emoji: '🔴' }
};

// Web Worker 單例
let worker = null;
let isWorkerReady = false;
let pendingResolvers = [];

/**
 * 初始化 Web Worker
 */
function getWorker() {
  if (worker === null) {
    worker = new Worker(new URL('./moodWorker.js', import.meta.url), {
      type: 'module'
    });

    worker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      if (type === 'preloaded') {
        isWorkerReady = true;
        console.log('✅ AI 模型預載入完成');
      }

      if (type === 'progress') {
        const progress = data;
        if (progress.status === 'downloading') {
          console.log(`📥 下載模型: ${progress.file} (${Math.round(progress.progress || 0)}%)`);
        }
      }

      // 處理待解析的 Promise
      if (type === 'result' || type === 'error') {
        const resolver = pendingResolvers.shift();
        if (resolver) {
          if (type === 'result') {
            resolver.resolve(data);
          } else {
            resolver.reject(new Error(data.message));
          }
        }
      }
    });
  }
  return worker;
}

/**
 * 背景預載入模型（優化首次使用體驗）
 */
export async function preloadModel() {
  if (isWorkerReady) {
    return;
  }

  const w = getWorker();
  w.postMessage({ type: 'preload' });
}

/**
 * 分析文字情緒並推薦 Lumina 顏色
 * @param {string} text - 要分析的文字
 * @returns {Promise<Object>} - { color, mood, emoji, confidence } 或 { error, message }
 */
export async function analyzeMood(text) {
  // 驗證輸入
  if (!text || typeof text !== 'string') {
    return {
      error: true,
      message: '請輸入有效的文字內容'
    };
  }

  const trimmedText = text.trim();
  if (trimmedText.length < 5) {
    return {
      error: true,
      message: '請輸入至少 5 個字元'
    };
  }

  try {
    const w = getWorker();

    // 設定 60 秒 timeout（首次下載模型需要較長時間）
    const result = await Promise.race([
      new Promise((resolve, reject) => {
        pendingResolvers.push({ resolve, reject });
        w.postMessage({ type: 'analyze', data: { text: trimmedText } });
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('分析逾時')), 60000)
      )
    ]);

    return result;

  } catch (error) {
    console.error('AI 分析錯誤:', error);

    // 根據錯誤類型回傳不同訊息
    let message = 'AI 暫時無法使用，已為你選擇預設顏色';

    if (error.message === '分析逾時') {
      message = 'AI 回應逾時，已為你選擇預設顏色';
    } else if (!navigator.onLine) {
      message = '網路連線不穩定，已為你選擇預設顏色';
    }

    // 降級方案：回傳預設黃色
    return {
      error: true,
      message,
      color: LUMINA_COLORS.YELLOW.color,
      mood: LUMINA_COLORS.YELLOW.mood,
      emoji: LUMINA_COLORS.YELLOW.emoji,
      confidence: 0
    };
  }
}
