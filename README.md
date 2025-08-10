# VocabAI & Vocabot 專案

**VocabAI** 是一個智能英語單字學習平台，結合 **Vocabot** Telegram Bot 和 **VocabAI** Web Mini App，提供完整的單字學習體驗。

## 🎯 專案概述

- 🤖 **Vocabot**：Telegram 聊天機器人，提供即時單字查詢和學習
- 📱 **VocabAI**：React Mini App，提供豐富的視覺化學習介面
- 🧠 **AI 智能解釋**：使用 Google Gemini API 提供結構化單字解釋
- 📊 **間隔重複學習**：科學的記憶曲線算法
- 💾 **完整數據追蹤**：學習進度和成效分析

## 🏗️ 技術架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vocabot       │    │   FastAPI       │    │   VocabAI       │
│   (Telegram)    │    │   Backend       │    │   (Mini App)    │
│   aiogram 3.x   │    │   (Cloud Run)   │    │   (Vercel)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────┐
                    │     SQLite 資料庫      │
                    └─────────────────────────┘
```

### 核心技術棧

- **後端**: Python + FastAPI + aiogram 3.x
- **前端**: React + TypeScript + Vite
- **AI 服務**: Google Gemini API / OpenAI / DeepSeek
- **資料庫**: SQLite + aiosqlite
- **部署**: Google Cloud Run + Vercel

## 📁 專案結構

```
VocabAI-Vocabot/
├── 📁 bot/                    # Vocabot Telegram Bot
│   ├── handlers/              # 消息處理器
│   ├── services/              # AI 服務整合
│   ├── database/              # 資料庫操作
│   ├── core/                  # 間隔重複算法
│   └── utils/                 # 工具函數
├── 📁 api/                    # FastAPI 後端服務
│   ├── main.py               # API 入口點
│   ├── crud.py               # 資料庫操作
│   └── schemas.py            # 資料模型
├── 📁 frontend/              # VocabAI Mini App
│   ├── src/components/       # React 組件
│   ├── src/pages/           # 頁面組件
│   └── src/lib/             # API 客戶端
├── 📄 main.py               # 統一啟動入口
├── 📄 Makefile             # 開發自動化腳本
└── 📄 config.yaml          # 配置文件
```

## 🚀 快速開始

### 環境設置

```bash
# 1. 克隆專案
git clone <repo-url>
cd VocabAI-Vocabot

# 2. 初始化環境
make setup

# 3. 配置設定
cp config.yaml.template config.yaml
# 編輯 config.yaml 添加必要的 API 金鑰
```

### 本地開發

推薦使用 3 個終端進行開發：

```bash
# 終端 1: 啟動後端服務 (Vocabot + API)
make run-full         # http://localhost:8000

# 終端 2: 啟動前端開發服務器
make dev-frontend     # http://localhost:5173

# 終端 3: 監控和管理
make status          # 檢查服務狀態
make logs           # 查看服務日誌
```

## 📋 可用命令

### 基礎命令
- `make setup` - 初始化專案環境
- `make help` - 顯示所有可用命令

### 開發命令
- `make run-full` - 啟動完整服務（Bot + API）
- `make run-bot` - 只啟動 Vocabot
- `make run-api` - 只啟動 API 服務
- `make dev-frontend` - 啟動 VocabAI 前端開發

### 管理命令
- `make status` - 檢查所有服務狀態
- `make stop-all` - 停止所有背景服務
- `make clean` - 清理臨時文件

## 🌐 部署指南

### 前端部署 (Vercel)

1. **連接 GitHub 倉庫到 Vercel**
2. **設定環境變數**：
   ```
   VITE_API_BASE_URL=https://your-cloud-run-url.run.app
   ```
3. **自動部署**：推送到 main 分支即可

### 後端部署 (Google Cloud Run)

#### 1. GCP 專案設置

```bash
# 設置 GCP 專案
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

#### 2. 創建 Secrets

```bash
# Telegram Bot Token
gcloud secrets create telegram_bot_token --data-file=<(echo -n "YOUR_BOT_TOKEN")

# Google AI API Key
gcloud secrets create google_api_key --data-file=<(echo -n "YOUR_GOOGLE_API_KEY")

# Telegram User ID (白名單)
gcloud secrets create telegram_user_id --data-file=<(echo -n "YOUR_TELEGRAM_USER_ID")

# 前端 URL
gcloud secrets create frontend_url --data-file=<(echo -n "https://your-vercel-app.vercel.app")
```

#### 3. 部署選項

**選項 A: 自動化部署 (推薦)**

1. 連接 GitHub 倉庫到 Cloud Build
2. 創建觸發器指向 `cloudbuild.yaml`
3. 推送代碼即可自動部署

**選項 B: 手動部署**

```bash
# 建構並推送 Docker 映像
docker build -t gcr.io/YOUR_PROJECT_ID/vocabot-backend .
docker push gcr.io/YOUR_PROJECT_ID/vocabot-backend

# 部署到 Cloud Run
gcloud run deploy vocabot-backend \
  --image gcr.io/YOUR_PROJECT_ID/vocabot-backend \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars BOT_MODE=webhook,START_API=true,API_PORT=8080 \
  --set-secrets TELEGRAM_BOT_TOKEN=telegram_bot_token:latest,GOOGLE_API_KEY=google_api_key:latest
```

#### 4. 設定 Telegram Webhook

```bash
# 取得 Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe vocabot-backend --region=asia-east1 --format='value(status.url)')

# 設定 Webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${CLOUD_RUN_URL}/webhook\"}"
```

## 📝 配置說明

### config.yaml 結構

```yaml
telegram:
  bot_token: "YOUR_BOT_TOKEN"

database:
  db_path: "vocabot.db"  # 本地開發路徑

access_control:
  whitelist_users: [YOUR_USER_ID]
  enable_whitelist: true
  local_test_mode: true  # 生產環境設為 false

mini_app:
  url: "https://your-vercel-app.vercel.app"
  enable_telegram_auth: true
  session_timeout: 3600

webhook:
  url: "https://your-cloud-run-url.run.app/webhook"
  path: "/webhook"
  host: "0.0.0.0"
  port: 8000

ai_services:
  provider: "google"  # google/openai/deepseek
  google:
    api_key: "YOUR_GOOGLE_API_KEY"
```

### 環境變數控制

- `BOT_MODE`: `polling` (開發) 或 `webhook` (生產)
- `START_API`: `true` (啟動API) 或 `false` (僅Bot)
- `API_PORT`: API 服務端口

## 📊 主要功能

### Vocabot (Telegram Bot)
- ✅ 智能單字解釋：AI 生成結構化回應
- ✅ 詞彙管理：查看、搜尋個人單字庫
- ✅ 複習提醒：智能推薦複習單字
- ✅ 進度追蹤：學習數據統計

### VocabAI (Mini App)
- ✅ 單字瀏覽：響應式單字列表
- ✅ 學習報告：視覺化進度統計
- 🚧 複習系統：卡片式複習介面 (開發中)
- 🚧 學習分析：詳細學習數據分析 (規劃中)

### API 服務
- ✅ RESTful API：完整 CRUD 操作
- ✅ 用戶認證：基於 Telegram ID
- ✅ 資料驗證：Pydantic 模型
- ✅ 跨域支援：CORS 配置

## 🔧 故障排除

### 常見問題

**Q: 服務無法啟動？**
```bash
make status  # 檢查服務狀態
make logs   # 查看錯誤日誌
```

**Q: 前端無法連接後端？**
檢查 `frontend/.env.local` 中的 `VITE_API_BASE_URL` 設定

**Q: Bot 無法接收消息？**
1. 確認 webhook URL 設定正確
2. 檢查 Cloud Run 服務是否正常運行
3. 驗證 Telegram Bot Token

**Q: AI 服務回應異常？**
檢查 `config.yaml` 中的 API 金鑰設定

### 重新啟動服務

```bash
# 停止所有服務並重新啟動
make stop-all && make run-full

# 只重啟前端
make dev-frontend
```

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支：`git checkout -b feature/amazing-feature`
3. 提交變更：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 開啟 Pull Request

## 📄 授權條款

本專案採用 MIT 授權條款。

## 🆘 支援

如有問題或建議，請：
1. 查看本 README 的故障排除章節
2. 檢查 [Issues](https://github.com/your-username/vocabai-vocabot/issues)
3. 創建新的 Issue 描述問題

---

*由 VocabAI 團隊開發，使用 Claude AI 協助優化* 🤖✨
