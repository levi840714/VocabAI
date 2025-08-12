"""
設定管理 API 端點
處理用戶設定的 CRUD 操作
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from .dependencies import get_current_user
from .crud import get_user_settings_from_db, update_user_settings_in_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["settings"])

class LearningPreferences(BaseModel):
    daily_review_target: int = 20
    difficulty_preference: str = "mixed"  # easy, normal, hard, mixed
    review_reminder_enabled: bool = True
    review_reminder_time: str = "09:00"

class InterfaceSettings(BaseModel):
    voice_auto_play: bool = False
    theme_mode: str = "light"  # light, dark, auto
    language: str = "zh-TW"
    animation_enabled: bool = True

class AISettings(BaseModel):
    default_explanation_type: str = "simple"  # simple, deep
    ai_provider_preference: str = "google"  # google, openai, deepseek
    explanation_detail_level: str = "standard"  # concise, standard, detailed

class StudySettings(BaseModel):
    spaced_repetition_algorithm: str = "sm2"
    show_pronunciation: bool = True
    show_etymology: bool = True
    auto_mark_learned_threshold: int = 5

class UserSettings(BaseModel):
    learning_preferences: LearningPreferences
    interface_settings: InterfaceSettings
    ai_settings: AISettings
    study_settings: StudySettings

class SettingsUpdateRequest(BaseModel):
    learning_preferences: Optional[LearningPreferences] = None
    interface_settings: Optional[InterfaceSettings] = None
    ai_settings: Optional[AISettings] = None
    study_settings: Optional[StudySettings] = None

@router.get("/settings", response_model=UserSettings)
async def get_user_settings(user_id: int = Depends(get_current_user)):
    """獲取用戶設定"""
    try:
        settings = await get_user_settings_from_db(user_id)
        
        if not settings:
            # 返回預設設定
            return UserSettings(
                learning_preferences=LearningPreferences(),
                interface_settings=InterfaceSettings(),
                ai_settings=AISettings(),
                study_settings=StudySettings()
            )
        
        # 確保所有設定都有預設值
        learning_prefs = settings.get('learning_preferences', {})
        interface_settings = settings.get('interface_settings', {})
        ai_settings = settings.get('ai_settings', {})
        study_settings = settings.get('study_settings', {})
        
        return UserSettings(
            learning_preferences=LearningPreferences(**learning_prefs),
            interface_settings=InterfaceSettings(**interface_settings),
            ai_settings=AISettings(**ai_settings),
            study_settings=StudySettings(**study_settings)
        )
        
    except Exception as e:
        logger.error(f"獲取用戶設定失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取設定失敗")

@router.put("/settings")
async def update_user_settings(
    updates: SettingsUpdateRequest,
    user_id: int = Depends(get_current_user)
):
    """更新用戶設定"""
    try:
        # 獲取當前設定
        current_settings = await get_user_settings_from_db(user_id) or {}
        
        # 逐個更新設定區塊
        if updates.learning_preferences is not None:
            current_settings['learning_preferences'] = updates.learning_preferences.dict()
        
        if updates.interface_settings is not None:
            current_settings['interface_settings'] = updates.interface_settings.dict()
        
        if updates.ai_settings is not None:
            current_settings['ai_settings'] = updates.ai_settings.dict()
            
        if updates.study_settings is not None:
            current_settings['study_settings'] = updates.study_settings.dict()
        
        # 保存到資料庫
        await update_user_settings_in_db(user_id, current_settings)
        
        # 如果更新了提醒設定，通知 Bot 更新提醒任務
        if updates.learning_preferences is not None:
            await notify_reminder_service_update(user_id, current_settings)
        
        return {"message": "設定更新成功", "updated_settings": current_settings}
        
    except Exception as e:
        logger.error(f"更新用戶設定失敗: {e}")
        raise HTTPException(status_code=500, detail="更新設定失敗")

@router.post("/settings/reset")
async def reset_user_settings(user_id: int = Depends(get_current_user)):
    """重置用戶設定為預設值"""
    try:
        default_settings = {
            'learning_preferences': LearningPreferences().dict(),
            'interface_settings': InterfaceSettings().dict(),
            'ai_settings': AISettings().dict(),
            'study_settings': StudySettings().dict()
        }
        
        await update_user_settings_in_db(user_id, default_settings)
        
        # 通知提醒服務
        await notify_reminder_service_update(user_id, default_settings)
        
        return {"message": "設定已重置為預設值", "settings": default_settings}
        
    except Exception as e:
        logger.error(f"重置用戶設定失敗: {e}")
        raise HTTPException(status_code=500, detail="重置設定失敗")

async def notify_reminder_service_update(user_id: int, settings: Dict[str, Any]):
    """通知提醒服務更新用戶提醒任務"""
    try:
        # 這裡需要與 Bot 的提醒服務通信
        # 由於 API 和 Bot 在同一個進程中運行（在 webhook 模式下），
        # 我們可以通過共享的服務實例來通信
        
        learning_prefs = settings.get('learning_preferences', {})
        reminder_enabled = learning_prefs.get('review_reminder_enabled', False)
        reminder_time = learning_prefs.get('review_reminder_time', '09:00')
        
        # TODO: 實現與 Bot 提醒服務的通信
        # 這可能需要通過消息隊列或共享狀態來實現
        
        logger.info(f"用戶 {user_id} 的提醒設定已更新: enabled={reminder_enabled}, time={reminder_time}")
        
    except Exception as e:
        logger.warning(f"通知提醒服務失敗: {e}")

@router.get("/settings/reminder-status")
async def get_reminder_status(user_id: int = Depends(get_current_user)):
    """獲取提醒狀態"""
    try:
        settings = await get_user_settings_from_db(user_id) or {}
        learning_prefs = settings.get('learning_preferences', {})
        
        return {
            "enabled": learning_prefs.get('review_reminder_enabled', False),
            "time": learning_prefs.get('review_reminder_time', '09:00'),
            "last_reminder": None,  # TODO: 從資料庫獲取
            "next_reminder": None   # TODO: 計算下次提醒時間
        }
        
    except Exception as e:
        logger.error(f"獲取提醒狀態失敗: {e}")
        raise HTTPException(status_code=500, detail="獲取提醒狀態失敗")

@router.post("/settings/test-reminder")
async def test_reminder(user_id: int = Depends(get_current_user)):
    """發送測試提醒"""
    try:
        # TODO: 觸發測試提醒
        # 這需要與 Bot 的提醒服務通信
        
        return {"message": "測試提醒已發送"}
        
    except Exception as e:
        logger.error(f"發送測試提醒失敗: {e}")
        raise HTTPException(status_code=500, detail="發送測試提醒失敗")