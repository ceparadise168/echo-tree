# Echo Tree - AI Coding Agent Instructions

## Project Overview

Echo Tree 是一個 3D 互動式記憶卡片應用，使用者可以在虛擬星空中創建和瀏覽記憶卡片。專案展示了完整的現代化雲端架構：serverless 後端、IaC（Infrastructure as Code）和 CI/CD 自動化部署。

**核心技術棧**：React + Three.js (R3F) 前端 → AWS Lambda + API Gateway 後端 → DynamoDB 資料庫 → Terraform IaC → GitHub Actions CI/CD

## Architecture & Data Flow

### 三層架構設計

```
Frontend (app/)          API (api/)              Infrastructure (terraform/)
React + R3F + Vite  →    Express + Lambda   →    AWS Resources (IaC)
├─ 3D 星空渲染           ├─ GET/POST /cards       ├─ DynamoDB (cards 資料)
├─ InstancedMesh 優化    ├─ DynamoDB 整合         ├─ API Gateway + Lambda
└─ 環境變數驅動 API      └─ Serverless 包裝       └─ S3 + CloudFront (前端)
```

### 關鍵資料流程

1. **卡片創建流程**：用戶填寫表單 → `handleCardSubmit()` → POST `/cards` → DynamoDB → 更新本地狀態 → 觸發流星動畫
2. **卡片載入流程**：App mount → `useEffect` 呼叫 GET `/cards` → 合併遠端與本地卡片 → `createDisplayCard()` 標準化 → InstancedMesh 渲染
3. **部署流程**：`git push main` → GitHub Actions → 建構前端/後端 → Terraform apply → S3 同步 → CloudFront 失效快取

## Development Workflows

### 本地開發環境設定

```bash
# 前端開發（需先設定 VITE_API_BASE_URL）
cd app
cp .env.example .env  # 編輯 .env 設定 API 端點
npm install
npm run dev           # 開發伺服器：http://localhost:5173

# 後端本地測試（需 AWS 憑證）
cd api
npm install
# 注意：Lambda 函式需要 TABLE_NAME 環境變數，本地測試建議使用 SAM 或 serverless-offline
```

### 部署檢查清單

在推送到 `main` 分支前：
1. 確認 GitHub Secrets 已設定：`AWS_IAM_ROLE_ARN`、`S3_BUCKET_NAME`、`CLOUDFRONT_DISTRIBUTION_ID`
2. 驗證 Terraform 狀態：`cd terraform && terraform plan`
3. 前端建構測試：`cd app && npm run build`
4. 推送後監控 GitHub Actions 工作流程（約 5-8 分鐘）

## Project-Specific Conventions

### 卡片資料模型標準化

**關鍵函式**：`createDisplayCard()` 在 `app/src/App.jsx` (第 50-85 行)

所有卡片必須通過此函式標準化，確保：
- `color` 屬性的有效性（預設 `#FFD700`）
- `position` 為 3 元素陣列 `[x, y, z]`
- `colorObj` 為 THREE.Color 實例
- `authorName` 正規化（'Anonymous' → 空字串）
- `date` 格式化為 'zh-TW' 地區格式

### 效能優化模式

**InstancedMesh 架構**：`app/src/App.jsx` (第 220-350 行)

- 種子卡片（50張）與使用者卡片分別使用獨立的 `<instancedMesh>`
- 使用 `dummy` 物件模式更新矩陣，單一繪製呼叫渲染所有卡片
- 懸停檢測使用 `raycaster` + `instanceId`
- **關鍵**：絕不在 `useFrame` 中建立新物件，所有卡片屬性在 `useMemo` 中預計算

### 自訂 Hooks 模式

所有裝置互動邏輯封裝為可重用的 hooks：
- `useDeviceDetect`：檢測行動裝置、陀螺儀支援、動畫偏好
- `useGyroscope`：處理陀螺儀權限與方向資料
- `useMouseParallax`：桌面滑鼠視差效果
- `useKonamiCode`：彩蛋秘密指令檢測

這些 hooks 回傳標準化的資料結構，在 `CameraController` 組件中統一處理。

### 環境變數使用規範

**前端**（`app/.env`）：
```bash
VITE_API_BASE_URL=https://xxx.execute-api.us-east-1.amazonaws.com/v1
```
- 使用 `normalizeApiBaseUrl()` 移除尾隨斜線
- API 呼叫時拼接 `/cards` 端點
- 未設定時顯示警告但不中斷應用

**後端**（Lambda 環境變數）：
- `TABLE_NAME`：由 Terraform 注入，指向 DynamoDB 資料表

## Critical Integration Points

### API Gateway + Lambda 整合

- **端點設計**：`/cards` (GET/POST)，不使用 `/api` 前綴（API Gateway 路徑已處理）
- **CORS 配置**：在 `api/index.js` (第 17-26 行) 明確設定，允許所有來源（`*`）
- **錯誤處理**：Lambda 必須回傳 JSON 錯誤，前端檢查 `response.ok` 並顯示使用者友善訊息

### DynamoDB 資料結構

資料表 schema（由 Terraform 建立）：
```javascript
{
  cardId: String (Partition Key),  // UUID v4
  memory: String,                  // 必填
  recipient: String | null,        // 可選
  authorName: String,              // 預設 'Anonymous'
  color: String,                   // Hex 顏色碼
  date: String,                    // YYYY-MM-DD 格式
  createdAt: String                // ISO 8601 時間戳
}
```

### Terraform 狀態管理

- **遠端後端**：註解在 `terraform/main.tf` (第 12-19 行)，建議團隊協作時啟用 S3 後端
- **變數注入**：所有資源名稱使用 `var.project_name` 前綴確保唯一性
- **輸出值**：`terraform output` 提供 API URL、CloudFront 域名等，需手動複製到 `.env` 和 GitHub Secrets

## Testing & Debugging Strategies

### 前端除錯檢查點

1. **API 連線失敗**：檢查 Console 中的 CORS 錯誤或網路錯誤
2. **卡片不顯示**：驗證 `createDisplayCard()` 輸出，確認 `colorObj` 和 `position` 正確
3. **效能問題**：使用 React DevTools Profiler，確認 `useFrame` 中無記憶體洩漏

### 後端除錯

1. **Lambda 日誌**：AWS CloudWatch Logs，搜尋錯誤訊息
2. **DynamoDB 存取**：檢查 Lambda IAM 角色權限（由 Terraform 管理）
3. **本地測試**：使用 AWS SAM CLI：`sam local start-api` 模擬 API Gateway

### CI/CD 故障排除

GitHub Actions 失敗常見原因：
- Terraform 狀態鎖定：檢查 DynamoDB lock 資料表
- S3 同步權限：驗證 IAM 角色的 `s3:PutObject` 權限
- CloudFront 失效逾時：正常情況下需 5-10 分鐘

## Code Style & Patterns

### React 組件結構

標準組件順序（參考 `app/src/App.jsx`）：
1. Imports
2. Constants（如 `SPREAD_X`、`API_BASE_URL`）
3. Helper functions（如 `normalizeApiBaseUrl`）
4. Sub-components（如 `CameraController`）
5. Main component
6. Export

### Three.js 最佳實務

- 使用 `useThree` hook 存取 `camera`、`gl`、`scene`
- 所有 geometry/material 應透過 JSX 宣告，避免手動 `new THREE.Mesh()`
- 動畫邏輯統一在 `useFrame` 中處理
- 事件監聽器必須在 `useEffect` 中清理（`removeEventListener`）

## Known Gotchas & Edge Cases

1. **InstancedMesh 顏色更新**：必須重新建立 `InstancedBufferAttribute`，無法直接修改陣列
2. **陀螺儀權限**：iOS 需要使用者手動觸發 `DeviceOrientationEvent.requestPermission()`
3. **localStorage 同步**：用戶卡片同時儲存在 localStorage 和 DynamoDB，API 失敗時仍可顯示本地資料
4. **Terraform 首次部署**：API Gateway 部署可能需要數分鐘才能全域可用
5. **聖誕模式彩蛋**：輸入 Konami Code（↑↑↓↓←→←→BA）啟動，使用絕對定位覆蓋整個畫布

## References & Documentation

- **12-Factor App 方法論**：https://12factor.net/
- **React Three Fiber 文件**：https://docs.pmnd.rs/react-three-fiber
- **AWS Lambda 最佳實務**：https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- **專案設計決策**：參閱 `ADR.md` 了解架構選擇理由
- **產品需求**：參閱 `PRD.md` 了解功能規劃與使用者故事

---

**快速開始提示**：對於新加入的 AI agent，建議先閱讀 `app/src/App.jsx` 的 `handleCardSubmit` 和 `createDisplayCard` 函式，這兩者定義了整個應用的核心資料流。
