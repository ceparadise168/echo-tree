/**
 * AI 心情分析 Web Worker
 * 在背景執行緒中執行 transformers.js，避免阻塞主執行緒
 */

import { pipeline, env } from '@huggingface/transformers';

// 設定環境（瀏覽器模式）
env.allowLocalModels = false;

// Lumina Spark 四色定義
const LUMINA_COLORS = {
  BLUE: {
    color: '#45B7D1',
    mood: '思考邏輯',
    emoji: '🔵',
    keywords: [
      '思考', '分析', '數據', '邏輯', '計畫', '細節', '結構',
      '原則', '推理', '評估', '檢查', '研究', '理性', '精準', '計算'
    ]
  },
  GREEN: {
    color: '#4ECDC4',
    mood: '關懷協作',
    emoji: '🟢',
    keywords: [
      '團隊', '支持', '感謝', '關懷', '傾聽', '溫暖', '合作',
      '同理', '人際', '情感', '陪伴', '協助', '理解', '友善', '信任'
    ]
  },
  YELLOW: {
    color: '#FFD700',
    mood: '行動實驗',
    emoji: '🟡',
    keywords: [
      '創新', '嘗試', '探索', '實驗', '冒險', '靈感', '點子',
      '好奇', '發現', '體驗', '挑戰', '變化', '新鮮', '有趣'
    ]
  },
  RED: {
    color: '#FF6B6B',
    mood: '目標成就',
    emoji: '🔴',
    keywords: [
      '目標', '完成', '贏', '達成', '成果', '結果', '表現',
      '競爭', '勝利', '成功', '突破', '執行', '決策', '效率', '績效'
    ]
  }
};

// 單例 pipeline
class PipelineSingleton {
  static task = 'text-classification';
  static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
  static instance = null;

  static async getInstance(progressCallback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback: progressCallback
      });
    }
    return this.instance;
  }
}

/**
 * 計算關鍵詞匹配分數
 */
function calculateKeywordScore(text, keywords) {
  let score = 0;
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = text.match(regex);
    if (matches) {
      score += matches.length;
    }
  });
  return score;
}

/**
 * 根據情緒分數與關鍵詞判定 Lumina 顏色
 */
function determineLuminaColor(text, sentimentResult) {
  const { label, score } = sentimentResult;

  // 計算每個顏色的關鍵詞分數
  const scores = {
    BLUE: calculateKeywordScore(text, LUMINA_COLORS.BLUE.keywords),
    GREEN: calculateKeywordScore(text, LUMINA_COLORS.GREEN.keywords),
    YELLOW: calculateKeywordScore(text, LUMINA_COLORS.YELLOW.keywords),
    RED: calculateKeywordScore(text, LUMINA_COLORS.RED.keywords)
  };

  // 根據情緒標籤加權
  if (label.includes('positive') || label.includes('5') || label.includes('4')) {
    scores.YELLOW += score * 2;
    scores.GREEN += score * 1.5;
  } else if (label.includes('negative') || label.includes('1') || label.includes('2')) {
    scores.RED += score * 2;
    scores.BLUE += score * 1.5;
  } else {
    scores.BLUE += score * 1.5;
  }

  // 特殊符號加權
  if (text.includes('!') || text.includes('！')) {
    scores.YELLOW += 1.5;
  }
  if (text.includes('?') || text.includes('？')) {
    scores.BLUE += 1;
  }

  // 找出最高分顏色
  const maxColor = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  if (scores[maxColor] === 0) {
    if (label.includes('positive') || label.includes('5') || label.includes('4')) return 'YELLOW';
    if (label.includes('negative') || label.includes('1') || label.includes('2')) return 'RED';
    return 'BLUE';
  }

  return maxColor;
}

// 監聽主執行緒訊息
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  if (type === 'analyze') {
    try {
      // 取得 classifier
      const classifier = await PipelineSingleton.getInstance((progress) => {
        self.postMessage({ type: 'progress', data: progress });
      });

      // 執行分類
      const result = await classifier(data.text);
      const sentimentResult = result[0];

      // 判定 Lumina 顏色
      const colorKey = determineLuminaColor(data.text, sentimentResult);
      const luminaColor = LUMINA_COLORS[colorKey];

      self.postMessage({
        type: 'result',
        data: {
          color: luminaColor.color,
          mood: luminaColor.mood,
          emoji: luminaColor.emoji,
          confidence: sentimentResult.score
        }
      });

    } catch (error) {
      self.postMessage({
        type: 'error',
        data: { message: error.message }
      });
    }
  }

  if (type === 'preload') {
    try {
      await PipelineSingleton.getInstance((progress) => {
        self.postMessage({ type: 'progress', data: progress });
      });
      self.postMessage({ type: 'preloaded' });
    } catch (error) {
      self.postMessage({
        type: 'error',
        data: { message: '模型預載入失敗' }
      });
    }
  }
});
