"""
Telegram Mini App 身份驗證模組
處理 Telegram Web App 的數據驗證和用戶身份確認
"""

import hashlib
import hmac
import json
import time
from typing import Dict, Any, Optional
from urllib.parse import unquote, parse_qsl
from fastapi import HTTPException
from dependencies import get_settings, get_mini_app_settings, is_local_test_mode

def validate_telegram_web_app_data(init_data: str, bot_token: str) -> Dict[str, Any]:
    """
    驗證 Telegram Web App 的初始化數據
    
    Args:
        init_data: Telegram Web App 的初始化數據字符串
        bot_token: Telegram Bot Token
        
    Returns:
        Dict[str, Any]: 解析後的用戶數據
        
    Raises:
        HTTPException: 驗證失敗時拋出異常
    """
    try:
        # 解析查詢字符串
        parsed_data = dict(parse_qsl(init_data))
        
        # 提取 hash 值
        received_hash = parsed_data.pop('hash', '')
        if not received_hash:
            raise HTTPException(status_code=400, detail="Missing hash in Telegram data")
        
        # 創建數據字符串進行驗證
        data_check_arr = []
        for key, value in sorted(parsed_data.items()):
            data_check_arr.append(f"{key}={value}")
        data_check_string = '\n'.join(data_check_arr)
        
        # 使用 bot token 創建密鑰
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        
        # 計算期望的 hash 值
        expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        # 驗證 hash 值
        if not hmac.compare_digest(received_hash, expected_hash):
            raise HTTPException(status_code=400, detail="Invalid Telegram data hash")
        
        # 檢查數據是否過期（可選，Telegram 建議檢查 auth_date）
        if 'auth_date' in parsed_data:
            auth_date = int(parsed_data['auth_date'])
            current_time = int(time.time())
            mini_app_settings = get_mini_app_settings()
            session_timeout = mini_app_settings.get('session_timeout', 3600)  # 默認 1 小時
            
            if current_time - auth_date > session_timeout:
                raise HTTPException(status_code=400, detail="Telegram data has expired")
        
        # 解析用戶數據
        user_data = {}
        if 'user' in parsed_data:
            user_data = json.loads(unquote(parsed_data['user']))
        
        return {
            'user': user_data,
            'auth_date': parsed_data.get('auth_date'),
            'start_param': parsed_data.get('start_param'),
            'chat_instance': parsed_data.get('chat_instance'),
            'chat_type': parsed_data.get('chat_type')
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in Telegram user data")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error validating Telegram data: {str(e)}")

def extract_user_id_from_telegram_data(validated_data: Dict[str, Any]) -> int:
    """
    從已驗證的 Telegram 數據中提取用戶 ID
    
    Args:
        validated_data: 已驗證的 Telegram 數據
        
    Returns:
        int: Telegram 用戶 ID
        
    Raises:
        HTTPException: 如果無法提取用戶 ID
    """
    user_data = validated_data.get('user', {})
    user_id = user_data.get('id')
    
    if not user_id:
        raise HTTPException(status_code=400, detail="No user ID found in Telegram data")
    
    return int(user_id)

def get_user_from_telegram_header(authorization: Optional[str]) -> Optional[int]:
    """
    從 HTTP 授權標頭中提取並驗證 Telegram 用戶 ID
    
    Args:
        authorization: HTTP Authorization 標頭值
        
    Returns:
        Optional[int]: Telegram 用戶 ID，如果驗證失敗則返回 None
        
    Note:
        期望的標頭格式：'Bearer tma <telegram_web_app_data>'
        其中 <telegram_web_app_data> 是 Telegram Web App 的初始化數據
    """
    if not authorization:
        return None
    
    # 本地測試模式下跳過驗證
    if is_local_test_mode():
        return None  # 讓上層邏輯處理默認用戶
    
    try:
        # 解析授權標頭
        parts = authorization.split(' ', 2)
        if len(parts) != 3 or parts[0].lower() != 'bearer' or parts[1].lower() != 'tma':
            return None
        
        init_data = parts[2]
        
        # 獲取 bot token
        config = get_settings()
        bot_token = config.get('telegram', {}).get('bot_token', '')
        if not bot_token:
            raise HTTPException(status_code=500, detail="Bot token not configured")
        
        # 驗證 Telegram 數據
        validated_data = validate_telegram_web_app_data(init_data, bot_token)
        
        # 提取用戶 ID
        user_id = extract_user_id_from_telegram_data(validated_data)
        
        return user_id
        
    except HTTPException:
        raise
    except Exception:
        return None

def create_telegram_auth_header(init_data: str) -> str:
    """
    創建 Telegram 驗證標頭
    
    Args:
        init_data: Telegram Web App 初始化數據
        
    Returns:
        str: 授權標頭值
    """
    return f"Bearer tma {init_data}"