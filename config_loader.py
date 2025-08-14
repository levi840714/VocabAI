from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Optional, Union
import logging
import os

class Settings(BaseSettings):
    """應用程式設定，支援環境變數和 .env 檔案"""
    
    # === Telegram 設定 ===
    telegram_bot_token: str = Field(default="", description="Telegram Bot Token")
    
    # === 資料庫設定 ===
    database_db_path: str = Field(default="memwhiz.db", description="SQLite 資料庫路徑")
    database_gcs_bucket: Optional[str] = Field(default=None, description="GCS 儲存桶名稱 (Cloud Run 環境)")
    
    # === 存取控制設定 ===
    access_control_enable_whitelist: bool = Field(default=True, description="啟用白名單")
    access_control_local_test_mode: bool = Field(default=True, description="本地測試模式")
    access_control_whitelist_users: Union[str, List[int]] = Field(default="", description="白名單用戶 (逗號分隔的字串或 list)")
    
    # === Mini App 設定 ===
    mini_app_url: str = Field(default="https://your-domain.com", description="Mini App URL")
    mini_app_enable_telegram_auth: bool = Field(default=True, description="啟用 Telegram 認證")
    mini_app_session_timeout: int = Field(default=3600, description="Session 超時時間")
    
    # === Webhook 設定 ===
    webhook_url: str = Field(default="https://your-domain.com/webhook", description="Webhook URL")
    webhook_path: str = Field(default="/webhook", description="Webhook 路徑")
    webhook_host: str = Field(default="0.0.0.0", description="Webhook 主機")
    webhook_port: int = Field(default=8080, description="Webhook 端口")
    
    # === AI 服務設定 ===
    ai_services_provider: str = Field(default="google", description="AI 服務提供商")
    ai_services_google_api_key: str = Field(default="", description="Google AI API Key")
    ai_services_openai_api_key: str = Field(default="", description="OpenAI API Key")
    ai_services_deepseek_api_key: str = Field(default="", description="DeepSeek API Key")
    
    # === 系統運行模式 ===
    bot_mode: str = Field(default="polling", description="Bot 運行模式: polling 或 webhook")
    start_api: bool = Field(default=True, description="是否啟動 API 服務")
    api_port: int = Field(default=8000, description="API 服務端口")
    
    # === Prompt 設定 ===
    prompts_simple_explanation: str = Field(
        default="""請使用繁體中文回覆，並且務必回覆有效的 JSON 格式...""",
        description="簡單解釋 Prompt"
    )
    prompts_deep_learning: str = Field(
        default="""請使用繁體中文回覆，並且務必回覆有效的 JSON 格式...""",
        description="深度學習 Prompt"
    )
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = False
        extra = "ignore"  # 忽略額外的環境變數
    
    @field_validator('access_control_whitelist_users', mode='before')
    @classmethod
    def parse_whitelist_users(cls, v):
        """解析白名單用戶，支援逗號分隔字串或 list"""
        if isinstance(v, str):
            if not v.strip():
                return []
            try:
                # 嘗試解析逗號分隔的數字字串
                return [int(user_id.strip()) for user_id in v.split(',') if user_id.strip()]
            except ValueError:
                logging.error(f"Failed to parse whitelist users from string: {v}")
                return []
        elif isinstance(v, list):
            # 如果已經是 list，確保都是整數
            try:
                return [int(user_id) for user_id in v]
            except ValueError:
                logging.error(f"Failed to parse whitelist users from list: {v}")
                return []
        else:
            return []
    
    def get_whitelist_users(self) -> List[int]:
        """獲取白名單用戶列表"""
        if isinstance(self.access_control_whitelist_users, list):
            return self.access_control_whitelist_users
        return []
    
    def to_legacy_config(self) -> dict:
        """轉換為舊的配置格式，確保向後兼容"""
        return {
            'telegram': {
                'bot_token': self.telegram_bot_token,
            },
            'database': {
                'db_path': resolve_project_path(self.database_db_path),
                'gcs_bucket': self.database_gcs_bucket,
            },
            'access_control': {
                'enable_whitelist': self.access_control_enable_whitelist,
                'local_test_mode': self.access_control_local_test_mode,
                'whitelist_users': self.get_whitelist_users(),
            },
            'mini_app': {
                'url': self.mini_app_url,
                'enable_telegram_auth': self.mini_app_enable_telegram_auth,
                'session_timeout': self.mini_app_session_timeout,
            },
            'webhook': {
                'url': self.webhook_url,
                'path': self.webhook_path,
                'host': self.webhook_host,
                'port': self.webhook_port,
            },
            'ai_services': {
                'provider': self.ai_services_provider,
                'google': {
                    'api_key': self.ai_services_google_api_key,
                },
                'openai': {
                    'api_key': self.ai_services_openai_api_key,
                },
                'deepseek': {
                    'api_key': self.ai_services_deepseek_api_key,
                },
            },
            'prompts': {
                'simple_explanation': self.prompts_simple_explanation,
                'deep_learning': self.prompts_deep_learning,
            }
        }

# 全域設定實例
_settings = None

def _get_settings() -> Settings:
    """獲取設定實例（內部函數，單例模式）"""
    global _settings
    if _settings is None:
        _settings = Settings()
        logging.info("Settings loaded successfully from environment variables")
    return _settings

def get_settings() -> Settings:
    """
    獲取設定實例 (向後兼容)
    
    注意：建議使用 load_config() 來取得完整配置（環境變數 + YAML）
    此函數僅返回環境變數配置，主要用於內部實現
    """
    return _get_settings()

def resolve_project_path(relative_path: str) -> str:
    """
    將相對路徑解析為相對於專案根目錄的絕對路徑
    
    Args:
        relative_path: 相對路徑（如 'memwhiz.db'）
        
    Returns:
        str: 解析後的絕對路徑
    """
    if os.path.isabs(relative_path):
        return relative_path
    
    # 找到專案根目錄（包含 main.py 的目錄）
    project_root = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(project_root, relative_path)

def load_config() -> dict:
    """
    載入完整配置 (推薦使用)
    
    這是主要的配置載入函數，會合併以下來源的配置：
    1. 環境變數 (優先級最高)
    2. config.yaml 文件 (作為 fallback)
    
    Returns:
        dict: 完整的配置字典，適用於整個應用程式
    """
    import yaml
    import os
    
    # 先從環境變數創建設定
    settings = _get_settings()
    config = settings.to_legacy_config()
    
    # 嘗試從 YAML 文件讀取更多配置（本地開發用）
    import os
    # 尋找 config.yaml 文件，支援從不同目錄運行
    config_paths = [
        'configs/config.yaml',  # 從專案根目錄運行
        '../configs/config.yaml',  # 從 api/ 目錄運行
        os.path.join(os.path.dirname(__file__), 'configs/config.yaml'),  # 絕對路徑
    ]
    
    config_file_found = False
    for config_path in config_paths:
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                yaml_config = yaml.safe_load(f)
                if yaml_config:
                    config_file_found = True
                    logging.info(f"Loaded configuration from {config_path}")
                    
                    # 如果環境變數中沒有 token，從 YAML 讀取
                    if not settings.telegram_bot_token and 'telegram' in yaml_config and 'bot_token' in yaml_config['telegram']:
                        config['telegram']['bot_token'] = yaml_config['telegram']['bot_token']
                        logging.info("Loaded bot token from YAML")
                    
                    # 如果環境變數中沒有白名單用戶，從 YAML 讀取
                    if not settings.access_control_whitelist_users and 'access_control' in yaml_config:
                        access_control = yaml_config['access_control']
                        if 'whitelist_users' in access_control:
                            whitelist_users = access_control['whitelist_users']
                            if isinstance(whitelist_users, list):
                                config['access_control']['whitelist_users'] = whitelist_users
                                logging.info(f"Loaded whitelist users from YAML: {whitelist_users}")
                        
                        # 其他 access_control 設定
                        if 'enable_whitelist' in access_control:
                            config['access_control']['enable_whitelist'] = access_control['enable_whitelist']
                        if 'local_test_mode' in access_control:
                            config['access_control']['local_test_mode'] = access_control['local_test_mode']
                    
                    # 讀取 database 配置
                    if 'database' in yaml_config and 'db_path' in yaml_config['database']:
                        db_path = yaml_config['database']['db_path']
                        # 自動解析為專案根目錄的絕對路徑
                        config['database']['db_path'] = resolve_project_path(db_path)
                        logging.info(f"Loaded and resolved database path from YAML: {config['database']['db_path']}")
                    
                    # 讀取其他配置
                    if 'ai_services' in yaml_config:
                        ai_config = yaml_config['ai_services']
                        if not settings.ai_services_provider and 'provider' in ai_config:
                            config['ai_services']['provider'] = ai_config['provider']
                        
                        for provider in ['google', 'openai', 'deepseek']:
                            if provider in ai_config and 'api_key' in ai_config[provider]:
                                api_key = ai_config[provider]['api_key']
                                # 只有當環境變數中沒有設定時才使用 YAML 中的值
                                env_var_name = f'ai_services_{provider}_api_key'
                                if not getattr(settings, env_var_name, ''):
                                    config['ai_services'][provider]['api_key'] = api_key
                    
                    # 重要：載入 YAML 中的 prompts 設定
                    if 'prompts' in yaml_config:
                        prompts_config = yaml_config['prompts']
                        if 'simple_explanation' in prompts_config:
                            config['prompts']['simple_explanation'] = prompts_config['simple_explanation']
                            logging.info("Loaded simple_explanation prompt from YAML")
                        if 'deep_learning' in prompts_config:
                            config['prompts']['deep_learning'] = prompts_config['deep_learning']
                            logging.info("Loaded deep_learning prompt from YAML")
                    
                    break  # 找到配置文件就停止搜尋
        except FileNotFoundError:
            continue  # 嘗試下一個路徑
        except Exception as e:
            logging.error(f"Error reading {config_path}: {e}")
            continue
    
    if not config_file_found:
        logging.warning("No config.yaml file found in any expected location, using environment variables only")
    
    return config