# PRD: EchoTree - A Sky of Shared Memories (優化版)

這是一份卓越且情感豐富的 PRD，它完美平衡了 **「軟性」 (文化、情感、心理安全)** 與 **「硬性」 (技術棧、KPI、可擴展架構)** 的元素。為了將此概念轉化為可執行的計畫，以下是優化後的版本。

## 執行摘要 (Executive Summary)

`EchoTree` 是一個數位空間，旨在捕捉和視覺化團隊或社群的集體記憶與成就。使用者可以提交匿名的「記憶卡片」，這些卡片會化為光點，漂浮在一個共享的、互動的夜空中。本文件概述了該專案的視覺設計、技術架構、數據模型和一個為期兩週的 MVP 開發計畫，旨在於年底前推出一個功能核心原型。

---

### 🎨 1. 視覺設計與氛圍 (Visual Design & Mood)

本節將「共享記憶的星空」轉化為具體的視覺語言。

**A. 美學風格 (Moodboard Keywords)**

  * **生物光 (Bioluminescence):** 卡片不應像紙片，而應像是 *光的容器*。參考《阿凡達》中的靈魂之樹或《魔髮奇緣》中的天燈場景。
  * **觸感與空靈 (Tactile yet Ethereal):** 背景是深邃的（虛空/午夜藍），但卡片帶有輕微的紋理（顆粒/和紙），使其感覺像是「被書寫過」。
  * **微交互 (Micro-interactions):**
      * *懸停 (Hover):* 卡片會「呼吸」（放大 1.05 倍）並發出更亮的光芒。
      * *點擊 (Click):* 柔和的「噗」或「咻」聲（在移動設備上有觸覺反饋）。

**B. 關鍵畫面描述**

| 畫面 | 視覺優先級 | 交互邏輯 |
| :--- | :--- | :--- |
| **登陸頁 (The Ground)** | **極簡。** 底部僅有一個風格化的樹剪影。天空黑暗但空無一物。 | 一個脈動的按鈕：「傳送一個記憶」。當你輸入時，樹葉會沙沙作響。 |
| **輸入模式 (The Ritual)** | **專注。** 背景模糊。輸入框看起來像一張高品質的活版印刷卡片。 | 當用戶點擊「傳送」時，卡片不僅是消失，而是轉化為一個光粒子，向上射入「星空」。 |
| **星空視圖 (The Discovery)** | **沉浸式。** 成千上萬的光點。有些近（可讀的卡片），有些遠（小點）。 | **視差效果 (Parallax Effect):** 移動滑鼠/手機可改變視角，賦予深度感。「自動巡航」模式會緩慢地瀏覽最佳記憶。 |

**C. 無障礙設計考量 (Accessibility Considerations)**

*   **色彩對比:** 卡片上的文字與背景需符合 WCAG AA 標準。
*   **動態減免:** 為前庭功能障礙的使用者提供一個選項，以減少或禁用漂浮動畫。
*   **鍵盤導航:** 確保所有互動元素（傳送記憶、查看卡片）都可通過鍵盤訪問。

---

### ⚙️ 2. 後端與數據架構 (Backend & Data Architecture)

**A. 技術棧 (Tech Stack)**

*   **數據庫:** Supabase (提供 PostgreSQL 和即時 API)
*   **部署:** Vercel / Netlify

**B. 數據模式 (Data Schema)**

`memories` 表格:
| 欄位名 | 類型 | 描述 |
| :--- | :--- | :--- |
| `id` | `uuid` | 主鍵 |
| `created_at` | `timestamptz` | 創建時間 |
| `content` | `text` | 記憶的內容 (例如: "本季達成了銷售目標！") |
| `author_name` | `text` | 可選填，或為 "Anonymous" |
| `category` | `text` | 分類 (例如: '成就', '感謝', '團隊合作') |

**C. 安全模型 (Security Model)**

*   啟用行級安全性 (Row-Level Security, RLS)。
*   所有使用者都可以公開讀取記憶。
*   所有使用者都可以寫入新的記憶。
*   只有管理員角色可以刪除/審核記憶。

---

### 🚀 3. 技術概念驗證 (Technical Proof of Concept) - 優化版

*目標技術棧: React + React Three Fiber (R3F) + Drei*

原始的 PoC 程式碼在概念上是正確的，但為了達到極致性能，我們必須使用 **InstancedMesh**。以下是優化後的程式碼，它通過單一繪製調用 (draw call) 來渲染數百甚至數千個記憶卡片，確保了流暢的互動體驗。

```javascript
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls, Text } from '@react-three/drei';

// 1. 天空配置
const CARD_COUNT = 500; // 增加數量以展示性能
const SPREAD_X = 30;
const SPREAD_Y = 15;
const SPREAD_Z = 20;

// 2. 記憶星空 (使用 InstancedMesh 優化)
// 此組件在單一繪製調用中渲染所有卡片，以獲得最佳性能。
const EchoSky = () => {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 為每個實例生成穩定的屬性，只運行一次。
  const cards = useMemo(() => {
    return new Array(CARD_COUNT).fill().map(() => ({
      position: [
        (Math.random() - 0.5) * SPREAD_X,
        (Math.random() - 0.5) * SPREAD_Y,
        (Math.random() - 0.5) * SPREAD_Z,
      ],
      color: Math.random() > 0.5 ? new THREE.Color('#FFD700') : new THREE.Color('#FF69B4'),
      delay: Math.random() * 10,
      speed: 0.5 + Math.random() * 0.5,
      rotationSpeed: 0.2 + Math.random() * 0.2,
    }));
  }, []);

  // 組件掛載後，一次性應用實例顏色。
  useEffect(() => {
    const colorArray = new Float32Array(CARD_COUNT * 3);
    cards.forEach((card, i) => card.color.toArray(colorArray, i * 3));
    meshRef.current.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colorArray, 3));
  }, [cards]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    // 核心優化：單一循環更新所有卡片的矩陣。
    cards.forEach((card, i) => {
      const { position, delay, speed, rotationSpeed } = card;
      
      // 更新虛擬物件的變換
      dummy.position.set(
        position[0],
        position[1] + Math.sin(t * speed + delay) * 0.5,
        position[2]
      );
      dummy.rotation.z = Math.sin(t * rotationSpeed + delay) * 0.05;
      dummy.updateMatrix();
      
      // 將此變換應用於特定實例
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    // 告知 Three.js 實例矩陣已更新。
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, CARD_COUNT]}>
      <planeGeometry args={[1.5, 1]} />
      <meshStandardMaterial
        vertexColors // 使用實例顏色
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

// 3. 用於渲染場景的主應用
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050510' }}>
      <Canvas camera={{ position: [0, 0, 15], fov: 75 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <fog attach="fog" args={['#050510', 10, 35]} />
        
        <EchoSky />
        
        <Text color="white" anchorX="center" anchorY="bottom" position={[0, -5, 0]} fontSize={0.5}>
          拖曳以探索星空
        </Text>

        <OrbitControls enablePan={true} autoRotate autoRotateSpeed={0.1} />
      </Canvas>
    </div>
  );
}
```

---

### 📝 4. 專案管理：兩週衝刺計畫 (Project Management: 2-Week MVP Sprint)

**階段一: 基礎建設 (第 1-5 天)**

  * **後端:**
      *   任務: 建立 Supabase 專案。
      *   任務: 定義 `memories` 表格模式與 RLS 安全策略。
      *   任務: 創建用於提交新記憶的 API 端點。
  * **前端:**
      *   任務: 初始化 React + R3F 專案。
      *   任務: 實作「登陸頁」和「輸入模式」的 UI 組件。
      *   任務: 整合 Three.js PoC 到 `SkyView`。
  * **設計:**
      *   任務: 最終化「卡片」的視覺資產。建議使用 HTML/CSS 渲染到紋理以保持靈活性。

**階段二: 整合與潤飾 (第 6-10 天)**

  * **前後端整合:**
      *   任務: 連接前端到 Supabase 以即時獲取記憶。
      *   任務: 將「傳送記憶」的表單與後端連接。
  * **互動與使用者體驗:**
      *   任務: 實作「點擊放大」邏輯 (點擊實例時顯示卡片內容的模態框)。
      *   任務: 實作無障礙功能 (例如，「減少動態」的切換開關)。
  * **視覺潤飾:**
      *   任務: 添加如 `Bloom` (輝光) 的後處理效果。
      *   任務: 整合環境背景音樂。

---

### 🌟 後續步驟 (Next Steps)

我已準備好 **產品願景** 和 **技術概念驗證**。

**接下來，您希望我處理哪一項來幫助您的團隊？**

1.  **完善使用者體驗流程:** 創建一個詳細的 **使用者故事地圖** (例如，「如果用戶舉報一張卡片會發生什麼？」) 來處理邊界情況。
2.  **開發「故事混合」算法:** 編寫邏輯來決定系統如何選擇顯示哪些卡片（優先考慮新的 vs. 受歡迎的 vs. 被忽略的）。
3.  **草擬內部發布郵件:** 一封引人注目的訊息，發送給全員，讓每個人對發布感到興奮。

請告訴我您的選擇，我將立即為您生成。
