# 使用官方 Python 3.11 slim 映像
FROM python:3.11-slim

# 設置工作目錄
WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 複製 requirements.txt 並安裝 Python 依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用程式代碼
COPY main.py .
COPY config_loader.py .
COPY bot/ bot/
COPY api/ api/

# 複製配置模板（稍後會被環境變數覆蓋）
COPY configs/config.yaml.template configs/config.yaml

# 創建數據目錄
RUN mkdir -p /data

# 暴露端口（Cloud Run 預設使用 8080）
EXPOSE 8080

# 啟動應用程式
CMD ["python", "main.py"]
