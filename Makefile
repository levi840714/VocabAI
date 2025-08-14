# MemWhiz Makefile
# 提供便捷的開發和部署命令

# 設定變數
PYTHON := python3
VENV := venv
VENV_BIN := $(VENV)/bin
PIP := $(VENV_BIN)/pip
PYTHON_VENV := $(VENV_BIN)/python

# 預設目標
.DEFAULT_GOAL := help

# 顏色定義
BLUE := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m # No Color

.PHONY: help setup install clean test lint run-bot run-api run-full run-webhook dev-frontend build status stop-all

## 📚 顯示幫助信息
help:
	@echo "$(BLUE)MemWhiz 專案管理工具$(NC)"
	@echo ""
	@echo "$(GREEN)可用命令:$(NC)"
	@echo "  $(YELLOW)setup$(NC)        - 初始化專案環境（創建虛擬環境並安裝依賴）"
	@echo "  $(YELLOW)install$(NC)      - 安裝/更新依賴"
	@echo "  $(YELLOW)clean$(NC)        - 清理臨時文件和虛擬環境"
	@echo ""
	@echo "$(GREEN)開發命令:$(NC)"
	@echo "  $(YELLOW)run-bot$(NC)      - 只啟動 Telegram Bot (polling模式)"
	@echo "  $(YELLOW)run-api$(NC)      - 只啟動 FastAPI 服務"
	@echo "  $(YELLOW)run-full$(NC)     - 啟動完整服務 (Bot + API)"
	@echo "  $(YELLOW)run-webhook$(NC)  - 以 webhook 模式啟動 Bot + API"
	@echo "  $(YELLOW)dev-frontend$(NC) - 啟動前端開發服務器"
	@echo ""
	@echo "$(GREEN)工具命令:$(NC)"
	@echo "  $(YELLOW)test$(NC)         - 執行測試"
	@echo "  $(YELLOW)lint$(NC)         - 代碼檢查"
	@echo "  $(YELLOW)status$(NC)       - 檢查服務狀態"
	@echo "  $(YELLOW)stop-all$(NC)     - 停止所有背景服務"
	@echo "  $(YELLOW)build$(NC)        - 構建前端專案"
	@echo ""

## 🚀 初始化專案環境
setup:
	@echo "$(BLUE)🚀 初始化 MemWhiz 專案環境...$(NC)"
	@if [ ! -d "$(VENV)" ]; then \
		echo "$(YELLOW)📦 創建虛擬環境...$(NC)"; \
		$(PYTHON) -m venv $(VENV); \
	fi
	@echo "$(YELLOW)📋 安裝依賴...$(NC)"
	@$(PIP) install --upgrade pip
	@$(PIP) install -r requirements.txt
	@echo "$(GREEN)✅ 環境初始化完成！$(NC)"
	@echo "$(BLUE)📋 接下來你可以使用:$(NC)"
	@echo "  $(YELLOW)make run-full$(NC)  - 啟動完整服務"
	@echo "  $(YELLOW)make dev-frontend$(NC) - 啟動前端開發"

## 📦 安裝/更新依賴
install:
	@echo "$(BLUE)📦 更新依賴包...$(NC)"
	@$(PIP) install --upgrade pip
	@$(PIP) install -r requirements.txt
	@echo "$(GREEN)✅ 依賴更新完成！$(NC)"

## 🧹 清理臨時文件
clean:
	@echo "$(BLUE)🧹 清理專案...$(NC)"
	@rm -rf __pycache__ bot/__pycache__ api/__pycache__ frontend/node_modules/.cache
	@rm -rf .pytest_cache
	@rm -rf *.pyc bot/*.pyc api/*.pyc
	@echo "$(YELLOW)是否要刪除虛擬環境? [y/N]$(NC)" && read ans && [ $${ans:-N} = y ] && rm -rf $(VENV) || echo "$(GREEN)保留虛擬環境$(NC)"
	@echo "$(GREEN)✅ 清理完成！$(NC)"

## 🤖 只啟動 Telegram Bot
run-bot:
	@echo "$(BLUE)🤖 啟動 Telegram Bot (polling模式)...$(NC)"
	@echo "$(YELLOW)使用 Ctrl+C 停止$(NC)"
	@BOT_MODE=polling START_API=false $(PYTHON_VENV) main.py

## 🌐 只啟動 API 服務
run-api:
	@echo "$(BLUE)🌐 啟動 FastAPI 服務...$(NC)"
	@echo "$(YELLOW)API 將在 http://localhost:8000 運行$(NC)"
	@echo "$(YELLOW)使用 Ctrl+C 停止$(NC)"
	@cd api && ../$(PYTHON_VENV) -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

## 🚀 啟動完整服務 (Bot + API)
run-full:
	@echo "$(BLUE)🚀 啟動完整服務 (Bot + API)...$(NC)"
	@echo "$(YELLOW)Bot: Telegram polling 模式$(NC)"
	@echo "$(YELLOW)API: http://localhost:8000$(NC)"
	@echo "$(YELLOW)使用 Ctrl+C 停止$(NC)"
	@BOT_MODE=polling START_API=true API_PORT=8000 $(PYTHON_VENV) main.py

## 🔗 Webhook 模式啟動
run-webhook:
	@echo "$(BLUE)🔗 啟動 Webhook 模式 (Bot + API)...$(NC)"
	@echo "$(RED)⚠️  確保已在 config.yaml 中配置正確的 webhook URL$(NC)"
	@echo "$(YELLOW)使用 Ctrl+C 停止$(NC)"
	@BOT_MODE=webhook START_API=true API_PORT=8000 $(PYTHON_VENV) main.py

## 💻 啟動前端開發服務器
dev-frontend:
	@echo "$(BLUE)💻 啟動前端開發服務器...$(NC)"
	@if [ ! -d "frontend/node_modules" ]; then \
		echo "$(YELLOW)📦 安裝前端依賴...$(NC)"; \
		cd frontend && npm install; \
	fi
	@echo "$(YELLOW)前端將在 http://localhost:5173 運行$(NC)"
	@echo "$(YELLOW)使用 Ctrl+C 停止$(NC)"
	@cd frontend && npm run dev

## 🔨 構建前端專案
build:
	@echo "$(BLUE)🔨 構建前端專案...$(NC)"
	@cd frontend && npm run build
	@echo "$(GREEN)✅ 前端構建完成！$(NC)"

## 🧪 執行測試
test:
	@echo "$(BLUE)🧪 執行測試...$(NC)"
	@if [ -f "test_*.py" ] || [ -d "tests/" ]; then \
		$(PYTHON_VENV) -m pytest -v; \
	else \
		echo "$(YELLOW)⚠️  未找到測試文件$(NC)"; \
	fi

## 🔍 代碼檢查
lint:
	@echo "$(BLUE)🔍 執行代碼檢查...$(NC)"
	@$(PIP) install flake8 black isort 2>/dev/null || true
	@echo "$(YELLOW)📋 Black 格式化...$(NC)"
	@$(VENV_BIN)/black --check bot/ api/ main.py || true
	@echo "$(YELLOW)📋 Import 排序檢查...$(NC)"
	@$(VENV_BIN)/isort --check-only bot/ api/ main.py || true
	@echo "$(YELLOW)📋 Flake8 檢查...$(NC)"
	@$(VENV_BIN)/flake8 bot/ api/ main.py --max-line-length=88 --ignore=E203,W503 || true

## 📊 檢查服務狀態
status:
	@echo "$(BLUE)📊 檢查服務狀態...$(NC)"
	@echo "$(YELLOW)檢查 Python 進程:$(NC)"
	@ps aux | grep -E "(python|uvicorn)" | grep -v grep || echo "$(RED)沒有找到 Python 服務進程$(NC)"
	@echo ""
	@echo "$(YELLOW)檢查端口占用:$(NC)"
	@echo "API Port (8000):"
	@lsof -i :8000 || echo "$(GREEN)端口 8000 空閒$(NC)"
	@echo "Frontend Port (5173):"
	@lsof -i :5173 || echo "$(GREEN)端口 5173 空閒$(NC)"
	@echo ""
	@echo "$(YELLOW)檢查資料庫:$(NC)"
	@if [ -f "memwhiz.db" ]; then \
		echo "$(GREEN)✅ 資料庫文件存在$(NC)"; \
	else \
		echo "$(RED)❌ 資料庫文件不存在$(NC)"; \
	fi

## 🛑 停止所有背景服務
stop-all:
	@echo "$(BLUE)🛑 停止所有 MemWhiz 相關服務...$(NC)"
	@echo "$(YELLOW)停止 Python/Uvicorn 進程...$(NC)"
	@pkill -f "python.*main.py" 2>/dev/null || true
	@pkill -f "uvicorn.*main:app" 2>/dev/null || true
	@pkill -f "npm run dev" 2>/dev/null || true
	@echo "$(GREEN)✅ 所有服務已停止$(NC)"

## 🎯 快速開發環境啟動
dev: setup
	@echo "$(BLUE)🎯 啟動開發環境...$(NC)"
	@echo "$(YELLOW)將同時啟動:$(NC)"
	@echo "  - Telegram Bot (polling)"
	@echo "  - FastAPI (port 8000)" 
	@echo "  - Frontend Dev Server (port 5173)"
	@echo ""
	@echo "$(YELLOW)在新的終端窗口中運行前端:$(NC)"
	@echo "  make dev-frontend"
	@echo ""
	@$(MAKE) run-full

## 📝 創建配置文件模板
config:
	@echo "$(BLUE)📝 檢查配置文件...$(NC)"
	@if [ ! -f "config.yaml" ]; then \
		echo "$(YELLOW)創建 config.yaml...$(NC)"; \
		cp config.yaml.template config.yaml; \
		echo "$(RED)⚠️  請編輯 config.yaml 填入正確的配置！$(NC)"; \
	else \
		echo "$(GREEN)✅ config.yaml 已存在$(NC)"; \
	fi

# 檢查虛擬環境是否存在
check-venv:
	@if [ ! -d "$(VENV)" ]; then \
		echo "$(RED)❌ 虛擬環境不存在，請先運行: make setup$(NC)"; \
		exit 1; \
	fi

# 讓需要虛擬環境的命令依賴檢查
run-bot run-api run-full run-webhook test lint: check-venv