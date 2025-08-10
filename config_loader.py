import yaml
import os
import logging

def load_config():
    config = {}
    # 優先讀取 configs/config.yaml，主要用於本地開發
    try:
        with open('configs/config.yaml', 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
            logging.info("Loaded configuration from configs/config.yaml")
    except FileNotFoundError:
        # 如果 config.yaml 不存在（例如在雲端環境），則讀取樣板檔
        try:
            with open('configs/config.yaml.template', 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
                logging.info("Loaded configuration from configs/config.yaml.template")
        except FileNotFoundError:
            logging.error("CRITICAL: Neither configs/config.yaml nor configs/config.yaml.template found.")
            # 即使找不到任何檔案，也建立一個基本結構以防後續程式碼出錯
            config = {
                'telegram': {}, 'database': {}, 'access_control': {'whitelist_users': []},
                'mini_app': {}, 'webhook': {}, 'ai_services': {'google': {}}
            }

    # --- 從環境變數讀取並覆寫設定 (雲端部署的關鍵) ---
    # 這個通用邏輯會讀取所有環境變數，並試圖把它們還原成巢狀字典
    for key, value in os.environ.items():
        parts = key.lower().split('_')
        d = config
        for part in parts[:-1]:
            if part not in d or not isinstance(d[part], dict):
                d[part] = {}
            d = d[part]
        
        final_key = parts[-1]
        # 嘗試做類型轉換
        if value.lower() in ['true', 'false']:
            d[final_key] = (value.lower() == 'true')
        elif value.isdigit():
            d[final_key] = int(value)
        else:
            # 嘗試解析逗號分隔的列表（主要用於白名單）
            if ',' in value:
                try:
                    d[final_key] = [int(item.strip()) for item in value.split(',')]
                except ValueError:
                    d[final_key] = value # 如果轉換失敗，則保留原始字串
            else:
                d[final_key] = value

    return config
