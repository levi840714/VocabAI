import yaml
from functools import lru_cache
from typing import Dict, Any, List, Optional
import os
import sys
from fastapi import HTTPException

# Add the project root to the Python path to allow importing from 'bot'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bot.services.ai_service import AIService

from config_loader import load_config

def get_database_path() -> str:
    """Get the database path from settings (already resolved to absolute path)."""
    config = load_config()
    return config.get('database', {}).get('db_path', 'memwhiz.db')

def get_ai_service() -> AIService:
    """Get AI service instance."""
    config = load_config()
    return AIService(config)

def get_whitelist_users() -> List[int]:
    """Get whitelist users from settings."""
    config = load_config()  # 使用 load_config 來取得包含 YAML 的完整配置
    return config.get('access_control', {}).get('whitelist_users', [])

def is_whitelist_enabled() -> bool:
    """Check if whitelist is enabled."""
    config = load_config()  # 使用 load_config 來取得包含 YAML 的完整配置
    return config.get('access_control', {}).get('enable_whitelist', True)

def is_local_test_mode() -> bool:
    """Check if local test mode is enabled."""
    config = load_config()  # 使用 load_config 來取得包含 YAML 的完整配置
    return config.get('access_control', {}).get('local_test_mode', True)

def get_mini_app_settings() -> Dict[str, Any]:
    """Get Mini App settings."""
    config = load_config()
    mini_app_config = config.get('mini_app', {})
    return {
        'url': mini_app_config.get('url', 'https://your-domain.com'),
        'enable_telegram_auth': mini_app_config.get('enable_telegram_auth', True),
        'session_timeout': mini_app_config.get('session_timeout', 3600),
    }

def validate_user_access(user_id: Optional[int]) -> int:
    """
    驗證用戶是否有訪問權限，並返回有效的用戶ID。
    
    Args:
        user_id: 用戶提供的ID，可能為 None
        
    Returns:
        int: 有效的用戶ID
        
    Raises:
        HTTPException: 如果用戶沒有訪問權限
    """
    # 如果沒有啟用白名單，直接通過（開發模式）
    if not is_whitelist_enabled():
        # 如果沒有提供用戶ID且是本地測試模式，使用白名單第一個用戶
        if user_id is None and is_local_test_mode():
            whitelist = get_whitelist_users()
            if whitelist:
                return whitelist[0]
            else:
                raise HTTPException(status_code=500, detail="No default user configured")
        elif user_id is not None:
            return user_id
        else:
            raise HTTPException(status_code=400, detail="User ID is required")
    
    # 白名單已啟用的情況
    whitelist = get_whitelist_users()
    
    # 如果是本地測試模式且沒有提供用戶ID，使用白名單第一個用戶
    if user_id is None and is_local_test_mode():
        if whitelist:
            return whitelist[0]
        else:
            raise HTTPException(status_code=500, detail="No default user configured")
    
    # 檢查用戶是否在白名單中
    if user_id is None:
        raise HTTPException(status_code=401, detail="User authentication required")
    
    if user_id not in whitelist:
        raise HTTPException(status_code=403, detail="Access denied - User not in whitelist")
    
    return user_id